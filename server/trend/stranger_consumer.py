# backend/trend/stranger_consumer.py

import json
import asyncio
import logging
from channels.generic.websocket import AsyncWebsocketConsumer
from django.core.cache import cache
from .middleware import get_user_from_scope

logger = logging.getLogger(__name__)

# --- KEYS AND CONSTANTS ---
WAITING_QUEUE_KEY = "stranger_talk:waiting_queue" # Redis List
USER_INFO_KEY_PREFIX = "stranger_talk:user:"     # Hash (Expiry-based)
PEER_MAP_KEY_PREFIX = "stranger_talk:peer:"       # Simple Key (Expiry-based)

class StrangerConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        # 1. Auth
        self.user = await get_user_from_scope(self.scope)
        if not self.user or not self.user.is_authenticated:
            await self.close()
            return

        # 2. Extract Gender
        user_gender = await self.get_user_gender(self.user)
        
        # 3. Preference from Query
        query_string = self.scope.get("query_string", b"").decode("utf-8")
        preferred_gender = None
        for param in query_string.split("&"):
            if param.startswith("preferred_gender="):
                val = param.split("=", 1)[1].strip()
                if val and val != "any":
                    preferred_gender = val

        self.partner_channel = None
        self.last_partner = None
        display = f"{self.user.first_name} {self.user.last_name}".strip() or self.user.username
        
        # 4. Store Info in Distributed Cache
        await self.set_user_info({
            "username": self.user.username,
            "display_name": display,
            "gender": user_gender,
            "preferred_gender": preferred_gender,
        })

        await self.accept()
        logger.info(f"Stranger Talk Connected: {self.user.username} (Pref: {preferred_gender or 'Any'})")
        await self._enter_queue()

    async def get_user_gender(self, user):
        from channels.db import database_sync_to_async
        @database_sync_to_async
        def _get(): return user.profile.gender
        return await _get()

    async def disconnect(self, close_code):
        logger.info(f"Stranger Talk Disconnected (Code: {close_code}): {getattr(self, 'user', 'Unknown')}")
        await self._cleanup(notify_partner=True)

    async def receive(self, text_data):
        try: data = json.loads(text_data)
        except: return

        msg_type = data.get("type")
        if msg_type == "switch": 
            logger.info(f"Stranger Switch Request: {self.user.username}")
            await self._switch()
        elif msg_type == "stop": 
            await self._cleanup(notify_partner=True)
            await self.close()
        elif msg_type in ("offer", "answer", "ice_candidate"): await self._forward_signal(data)
        elif msg_type == "chat":
            if self.partner_channel:
                content = data.get("content")
                if content:
                    await self.channel_layer.send(self.partner_channel, {
                        "type": "stranger_signal",
                        "payload": {"type": "chat_message", "content": content, "sender": self.user.username},
                    })

    # --- Redis Persistence Handlers ---
    async def set_user_info(self, info):
        cache.set(f"{USER_INFO_KEY_PREFIX}{self.channel_name}", info, timeout=3600)

    async def get_user_info(self, channel_name):
        return cache.get(f"{USER_INFO_KEY_PREFIX}{channel_name}")

    async def _enter_queue(self):
        queue = cache.get(WAITING_QUEUE_KEY) or []
        matched = None
        for ch in queue:
            if ch == self.channel_name or ch == self.last_partner: continue
            if await self._is_compatible(self.channel_name, ch):
                matched = ch
                break
        
        if matched:
            queue.remove(matched)
            cache.set(WAITING_QUEUE_KEY, queue, timeout=None)
            await self._pair_with(matched)
        else:
            if self.channel_name not in queue:
                queue.append(self.channel_name)
                cache.set(WAITING_QUEUE_KEY, queue, timeout=None)
            await self.send(text_data=json.dumps({"type": "waiting"}))

    async def _is_compatible(self, my_ch, cand_ch):
        my_info = await self.get_user_info(my_ch)
        cand_info = await self.get_user_info(cand_ch)
        if not my_info or not cand_info: return False

        my_pref, cand_pref = my_info.get("preferred_gender"), cand_info.get("preferred_gender")
        my_gen, cand_gen = my_info.get("gender"), cand_info.get("gender")

        if my_pref and cand_gen != my_pref: return False
        if cand_pref and my_gen != cand_pref: return False
        return True

    async def _pair_with(self, partner_channel):
        self.partner_channel = partner_channel
        cache.set(f"{PEER_MAP_KEY_PREFIX}{self.channel_name}", partner_channel, timeout=3600)
        cache.set(f"{PEER_MAP_KEY_PREFIX}{partner_channel}", self.channel_name, timeout=3600)

        my_info = await self.get_user_info(self.channel_name)
        partner_info = await self.get_user_info(partner_channel)
        
        logger.info(f"Match Found: {my_info['username']} <-> {partner_info['username']}")

        i_am_offerer = self.channel_name < partner_channel
        await self.send(text_data=json.dumps({
            "type": "matched", "role": "offerer" if i_am_offerer else "answerer",
            "stranger": {"username": partner_info.get("username", "Stranger"), "display_name": partner_info.get("display_name", "Stranger")}
        }))

        await self.channel_layer.send(partner_channel, {
            "type": "stranger_matched", "partner_channel": self.channel_name,
            "payload": {
                "type": "matched", "role": "answerer" if i_am_offerer else "offerer",
                "stranger": {"username": my_info.get("username", "Stranger"), "display_name": my_info.get("display_name", "Stranger")}
            },
        })

    async def stranger_signal(self, event): await self.send(text_data=json.dumps(event["payload"]))
    
    async def stranger_matched(self, event):
        self.partner_channel = event.get("partner_channel")
        await self.send(text_data=json.dumps(event["payload"]))

    async def _forward_signal(self, data):
        if self.partner_channel:
            await self.channel_layer.send(self.partner_channel, {"type": "stranger_signal", "payload": data})

    async def _switch(self):
        old = self.partner_channel
        if old:
            await self.channel_layer.send(old, {"type": "stranger_disconnected", "payload": {"type": "partner_left", "reason": "switched"}})
        await self._cleanup_pair()
        self.last_partner = old
        await self._enter_queue()
        if old: await self.channel_layer.send(old, {"type": "stranger_re_enter_queue"})

    async def _cleanup_pair(self):
        cache.delete(f"{PEER_MAP_KEY_PREFIX}{self.channel_name}")
        self.partner_channel = None

    async def _cleanup(self, notify_partner=False):
        old = self.partner_channel
        if notify_partner and old:
            try:
                await self.channel_layer.send(old, {"type": "stranger_disconnected", "payload": {"type": "partner_left", "reason": "disconnected"}})
                await self.channel_layer.send(old, {"type": "stranger_re_enter_queue"})
            except: pass
        
        cache.delete(f"{PEER_MAP_KEY_PREFIX}{self.channel_name}")
        cache.delete(f"{USER_INFO_KEY_PREFIX}{self.channel_name}")
        
        queue = cache.get(WAITING_QUEUE_KEY) or []
        if self.channel_name in queue:
            queue.remove(self.channel_name)
            cache.set(WAITING_QUEUE_KEY, queue, timeout=None)
        self.partner_channel = None

    async def stranger_disconnected(self, event):
        self.partner_channel = None
        await self.send(text_data=json.dumps(event["payload"]))

    async def stranger_re_enter_queue(self, event): await self._enter_queue()
