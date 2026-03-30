# backend/trend/stranger_consumer.py
# "Talk with Stranger" WebRTC Signaling & Matchmaking Consumer
# Supports optional gender-based filtering for connections.

import json
import asyncio
import logging
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Global in-memory waiting queue (module-level singleton)
# Maps:  channel_name -> { 'username': str, 'display_name': str, 'gender': str|None, 'preferred_gender': str|None }
# ---------------------------------------------------------------------------
_waiting_queue: list[str] = []          # ordered list of channel_names
_peer_map: dict[str, str] = {}         # channel_name -> partner's channel_name
_user_info: dict[str, dict] = {}       # channel_name -> {username, display_name, gender, preferred_gender}
_queue_lock = asyncio.Lock()


@database_sync_to_async
def get_user_gender(user):
    """Fetch the gender from the user's profile (database)."""
    try:
        return user.profile.gender or None
    except Exception:
        return None


class StrangerConsumer(AsyncWebsocketConsumer):
    """
    Handles random video-chat pairing (Omegle-style) over WebRTC.
    
    Gender filtering:
      - Client sends `preferred_gender` via query param or in a 'set_preference' message.
      - When matching, the system checks:
        1. If the searching user has a preferred_gender, only match with users whose
           profile gender matches that preference.
        2. The candidate must also accept the searcher (i.e., if the candidate has a
           preferred_gender, the searcher's gender must match it).
      - If no preference is set, the user is matched with anyone (random mode).
    """

    async def connect(self):
        self.user = self.scope.get("user")
        if not self.user or not self.user.is_authenticated:
            await self.close()
            return

        self.partner_channel = None
        self.last_partner = None

        # Store display info
        first = getattr(self.user, "first_name", "") or ""
        last = getattr(self.user, "last_name", "") or ""
        display = f"{first} {last}".strip() or self.user.username

        # Fetch gender from DB
        user_gender = await get_user_gender(self.user)

        # Check query string for preferred_gender
        query_string = self.scope.get("query_string", b"").decode("utf-8")
        preferred_gender = None
        for param in query_string.split("&"):
            if param.startswith("preferred_gender="):
                val = param.split("=", 1)[1].strip()
                if val and val != "any":
                    preferred_gender = val

        _user_info[self.channel_name] = {
            "username": self.user.username,
            "display_name": display,
            "gender": user_gender,
            "preferred_gender": preferred_gender,
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

        if msg_type == "set_preference":
            # Allow client to update gender preference on-the-fly
            preferred = data.get("preferred_gender")
            if self.channel_name in _user_info:
                _user_info[self.channel_name]["preferred_gender"] = (
                    preferred if preferred and preferred != "any" else None
                )

        elif msg_type == "switch":
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
        """Notify this client that a match was found (or put in queue)."""
        self.partner_channel = event.get("partner_channel") # Might be None for 'waiting'
        await self.send(text_data=json.dumps(event["payload"]))

    async def stranger_disconnected(self, event):
        """Notify this client that the partner disconnected/switched."""
        # Clear local partner refs if partner is gone
        self.partner_channel = None
        await self.send(text_data=json.dumps(event["payload"]))

    async def stranger_re_enter_queue(self, event):
        """Instruct this consumer to re-evaluate the queue actively."""
        await self._enter_queue()

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------
    def _is_compatible(self, my_channel: str, candidate_channel: str) -> bool:
        """
        Check if two users are gender-compatible for matching.
        Rules:
          - If user A has a preferred_gender, candidate B's actual gender must match it.
          - If user B has a preferred_gender, user A's actual gender must match it.
          - If neither has a preference, they're always compatible (random mode).
        """
        my_info = _user_info.get(my_channel, {})
        candidate_info = _user_info.get(candidate_channel, {})

        my_pref = my_info.get("preferred_gender")
        candidate_pref = candidate_info.get("preferred_gender")

        my_gender = my_info.get("gender")
        candidate_gender = candidate_info.get("gender")

        # Check if I accept the candidate
        if my_pref and candidate_gender != my_pref:
            return False

        # Check if the candidate accepts me
        if candidate_pref and my_gender != candidate_pref:
            return False

        return True

    async def _enter_queue(self):
        """Try to match with a compatible waiting user, or add self to the queue."""
        async with _queue_lock:
            # Remove dead entries (safety)
            _waiting_queue[:] = [
                ch for ch in _waiting_queue if ch != self.channel_name
            ]

            # Try to find a compatible partner
            matched_partner = None
            for ch in _waiting_queue:
                # Don't match with the person we JUST switched from
                if ch == getattr(self, "last_partner", None):
                    continue
                if self._is_compatible(self.channel_name, ch):
                    matched_partner = ch
                    break

            if matched_partner:
                _waiting_queue.remove(matched_partner)
                await self._pair_with(matched_partner)
            else:
                _waiting_queue.append(self.channel_name)
                # Ensure they know they are waiting
                await self.send(text_data=json.dumps({"type": "waiting"}))

    async def _pair_with(self, partner_channel: str):
        """Establish a pairing between self and partner_channel."""
        self.partner_channel = partner_channel

        # Update peer map (bidirectional)
        _peer_map[self.channel_name] = partner_channel
        _peer_map[partner_channel] = self.channel_name

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
            "partner_channel": self.channel_name,
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

        # Notify current partner first
        if old_partner:
            await self.channel_layer.send(old_partner, {
                "type": "stranger_disconnected",
                "payload": {"type": "partner_left", "reason": "switched"},
            })

        # Clean up pair structures (but NOT closing this connection)
        await self._cleanup_pair()

        # Set last partner to avoid immediate rematch
        self.last_partner = old_partner

        # Re-enter queue
        await self._enter_queue()

        # Re-queue the old partner too
        if old_partner:
            await self.channel_layer.send(old_partner, {
                "type": "stranger_re_enter_queue",
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

        self.partner_channel = None

    async def _cleanup(self, notify_partner: bool = False):
        """Full cleanup on disconnect or stop."""
        old_partner = self.partner_channel

        if notify_partner and old_partner:
            try:
                await self.channel_layer.send(old_partner, {
                    "type": "stranger_disconnected",
                    "payload": {"type": "partner_left", "reason": "disconnected"},
                })
                # Trigger partner to actively search the queue again
                await self.channel_layer.send(old_partner, {
                    "type": "stranger_re_enter_queue",
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

        self.partner_channel = None
