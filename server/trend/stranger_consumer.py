# backend/trend/stranger_consumer.py
# "Talk with Stranger" WebRTC Signaling & Matchmaking Consumer

import json
import asyncio
import logging
from channels.generic.websocket import AsyncWebsocketConsumer

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Global in-memory waiting queue (module-level singleton)
# Maps:  channel_name -> { 'username': str, 'display_name': str }
# ---------------------------------------------------------------------------
_waiting_queue: list[str] = []          # ordered list of channel_names
_peer_map: dict[str, str] = {}         # channel_name -> partner's channel_name
_user_info: dict[str, dict] = {}       # channel_name -> {username, display_name}
_queue_lock = asyncio.Lock()


class StrangerConsumer(AsyncWebsocketConsumer):
    """
    Handles random video-chat pairing (Omegle-style) over WebRTC.
    Protocol:
      - Client connects  →  consumer adds user to waiting queue or pairs immediately.
      - When paired      →  sends 'matched' to both; the lower channel_name becomes the
                            WebRTC *offerer*, the other the *answerer*.
      - Signaling        →  offer / answer / ice_candidate forwarded transparently.
      - 'switch'         →  un-pair, put back in queue.
      - 'stop'           →  close connection cleanly.
      - Disconnect       →  notify partner, remove from all structures.
    """

    async def connect(self):
        self.user = self.scope.get("user")
        if not self.user or not self.user.is_authenticated:
            await self.close()
            return

        self.partner_channel = None
        self.pair_group = None

        # Store display info
        first = getattr(self.user, "first_name", "") or ""
        last = getattr(self.user, "last_name", "") or ""
        display = f"{first} {last}".strip() or self.user.username

        _user_info[self.channel_name] = {
            "username": self.user.username,
            "display_name": display,
        }

        await self.accept()
        # Immediately try to match
        await self._enter_queue()

    async def disconnect(self, close_code):
        await self._cleanup(notify_partner=True)

    # ------------------------------------------------------------------
    # Receive from WebSocket client
    # ------------------------------------------------------------------
    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
        except json.JSONDecodeError:
            return

        msg_type = data.get("type")

        if msg_type == "switch":
            await self._switch()

        elif msg_type == "stop":
            await self._cleanup(notify_partner=True)
            await self.close()

        elif msg_type in ("offer", "answer", "ice_candidate"):
            # Forward WebRTC signaling to partner
            await self._forward_signal(data)

        elif msg_type == "ping":
            await self.send(text_data=json.dumps({"type": "pong"}))

        elif msg_type == "chat":
            # Forward text chat message to partner
            if self.partner_channel:
                content = data.get("content")
                if content:
                    await self.channel_layer.send(self.partner_channel, {
                        "type": "stranger_signal",
                        "payload": {
                            "type": "chat_message",
                            "content": content,
                            "sender": self.user.username
                        },
                    })


    # ------------------------------------------------------------------
    # Channel layer message handlers (called by group_send from partner)
    # ------------------------------------------------------------------
    async def stranger_signal(self, event):
        """Forward any signal payload received from channel layer to the client."""
        await self.send(text_data=json.dumps(event["payload"]))

    async def stranger_matched(self, event):
        """Notify this client that a match was found."""
        await self.send(text_data=json.dumps(event["payload"]))

    async def stranger_disconnected(self, event):
        """Notify this client that the partner disconnected/switched."""
        await self.send(text_data=json.dumps(event["payload"]))

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------
    async def _enter_queue(self):
        """Try to match with a waiting user, or add self to the queue."""
        async with _queue_lock:
            # Remove dead entries (safety)
            _waiting_queue[:] = [
                ch for ch in _waiting_queue if ch != self.channel_name
            ]

            if _waiting_queue:
                # Pop the first waiting user
                partner_channel = _waiting_queue.pop(0)
                await self._pair_with(partner_channel)
            else:
                _waiting_queue.append(self.channel_name)
                await self.send(text_data=json.dumps({"type": "waiting"}))

    async def _pair_with(self, partner_channel: str):
        """Establish a pairing between self and partner_channel."""
        self.partner_channel = partner_channel

        # Update peer map (bidirectional)
        _peer_map[self.channel_name] = partner_channel
        _peer_map[partner_channel] = self.channel_name

        # Create a unique group for this pair
        pair_names = sorted([self.channel_name, partner_channel])
        self.pair_group = f"stranger_pair_{hash(tuple(pair_names)) & 0xFFFFFFFF}"

        await self.channel_layer.group_add(self.pair_group, self.channel_name)
        await self.channel_layer.group_add(self.pair_group, partner_channel)

        my_info = _user_info.get(self.channel_name, {})
        partner_info = _user_info.get(partner_channel, {})

        # Decide who offers (lower channel_name → offerer)
        i_am_offerer = self.channel_name < partner_channel

        # Notify self
        await self.send(text_data=json.dumps({
            "type": "matched",
            "role": "offerer" if i_am_offerer else "answerer",
            "stranger": {
                "username": partner_info.get("username", "Stranger"),
                "display_name": partner_info.get("display_name", "Stranger"),
            },
        }))

        # Notify partner via channel layer
        await self.channel_layer.send(partner_channel, {
            "type": "stranger_matched",
            "payload": {
                "type": "matched",
                "role": "answerer" if i_am_offerer else "offerer",
                "stranger": {
                    "username": my_info.get("username", "Stranger"),
                    "display_name": my_info.get("display_name", "Stranger"),
                },
            },
        })

    async def _forward_signal(self, data: dict):
        """Forward a WebRTC signaling message to the partner."""
        if not self.partner_channel:
            return
        await self.channel_layer.send(self.partner_channel, {
            "type": "stranger_signal",
            "payload": data,
        })

    async def _switch(self):
        """
        Disconnect from current partner and re-enter the queue.
        The partner is notified and also re-enters the queue.
        """
        old_partner = self.partner_channel

        # Notify current partner first (before cleanup clears pair_group)
        if old_partner and self.pair_group:
            await self.channel_layer.send(old_partner, {
                "type": "stranger_disconnected",
                "payload": {"type": "partner_left", "reason": "switched"},
            })

        # Clean up pair structures (but NOT closing this connection)
        await self._cleanup_pair()

        # Re-enter queue
        await self._enter_queue()

        # Re-queue the old partner too
        if old_partner:
            async with _queue_lock:
                if old_partner not in _waiting_queue:
                    _waiting_queue.append(old_partner)
            await self.channel_layer.send(old_partner, {
                "type": "stranger_matched",   # Reuse handler to push waiting message
                "payload": {"type": "waiting"},
            })

    async def _cleanup_pair(self):
        """Remove pair structures without closing connection."""
        async with _queue_lock:
            if self.channel_name in _peer_map:
                partner = _peer_map.pop(self.channel_name, None)
                _peer_map.pop(partner, None)

            # Remove self from waiting queue if present
            if self.channel_name in _waiting_queue:
                _waiting_queue.remove(self.channel_name)

        if self.pair_group:
            try:
                await self.channel_layer.group_discard(self.pair_group, self.channel_name)
            except Exception:
                pass
            self.pair_group = None

        self.partner_channel = None

    async def _cleanup(self, notify_partner: bool = False):
        """Full cleanup on disconnect or stop."""
        old_partner = self.partner_channel
        old_pair_group = self.pair_group

        if notify_partner and old_partner:
            try:
                await self.channel_layer.send(old_partner, {
                    "type": "stranger_disconnected",
                    "payload": {"type": "partner_left", "reason": "disconnected"},
                })
                # Put partner back in queue
                async with _queue_lock:
                    if old_partner not in _waiting_queue:
                        _waiting_queue.append(old_partner)
                await self.channel_layer.send(old_partner, {
                    "type": "stranger_matched",
                    "payload": {"type": "waiting"},
                })
            except Exception as e:
                logger.warning(f"StrangerConsumer: error notifying partner: {e}")

        async with _queue_lock:
            _peer_map.pop(self.channel_name, None)
            if old_partner and old_partner in _peer_map and _peer_map.get(old_partner) == self.channel_name:
                _peer_map.pop(old_partner, None)
            if self.channel_name in _waiting_queue:
                _waiting_queue.remove(self.channel_name)

        _user_info.pop(self.channel_name, None)

        if old_pair_group:
            try:
                await self.channel_layer.group_discard(old_pair_group, self.channel_name)
            except Exception:
                pass

        self.partner_channel = None
        self.pair_group = None
