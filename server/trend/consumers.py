# backend/api/consumers.py

import json
import asyncio
import logging
from channels.generic.websocket import AsyncWebsocketConsumer
from django.contrib.auth.models import User
from django.utils import timezone
from .models import ChatRoom, ChatMessage, Profile, ChatGroup
from channels.db import database_sync_to_async
from .middleware import get_user_from_scope
from django.db import close_old_connections

logger = logging.getLogger(__name__)

class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        """Unified Real-time Hub for DMs, Groups, and WebRTC Signaling."""
        self.user_id_param = self.scope['url_route']['kwargs'].get('user_id')
        self.group_id_param = self.scope['url_route']['kwargs'].get('group_id')

        # 1. Auth & Identification
        self.current_user = await get_user_from_scope(self.scope)
        if not self.current_user or not self.current_user.is_authenticated:
            await self.close()
            return

        # 2. Room logic
        if self.group_id_param:
            self.room_group_name = f'chat_group_{self.group_id_param}'
            is_member = await self._ensure_db(self.check_group_membership, self.group_id_param, self.current_user)
            if not is_member:
                await self.close()
                return
        elif self.user_id_param:
            if str(self.current_user.id) == self.user_id_param:
                await self.close()
                return
            self.other_user_id = str(self.user_id_param)
            uids = sorted([int(self.current_user.id), int(self.other_user_id)])
            self.room_group_name = f'chat_{uids[0]}_{uids[1]}'
            await self._ensure_db(self.precache_chat_metadata)
        else:
            await self.close()
            return

        # 3. Lifecycle
        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()
        
        asyncio.create_task(self._ensure_db(self.update_user_status, True))

        # Online Status Broadcast
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'user_status',
                'username': self.current_user.username,
                'is_online': True,
                'last_seen': timezone.now().isoformat()
            }
        )
        logger.info(f"Chat Linked: {self.current_user.username} -> {self.room_group_name}")

    async def disconnect(self, close_code):
        if hasattr(self, 'room_group_name'):
            await self.channel_layer.group_discard(self.room_group_name, self.channel_name)
            asyncio.create_task(self._ensure_db(self.update_user_status, False))
            logger.info(f"Chat Unlinked: {getattr(self.current_user, 'username', 'Unknown')}")

    async def receive(self, text_data):
        """Processes Chat, Signals, and Inter-Consumer Alerts."""
        try:
            data = json.loads(text_data)
        except: return

        msg_type = data.get('type')

        # --- WEBRTC CALLING LOGIC ---
        if msg_type in ('offer', 'answer', 'ice_candidate', 'call_request', 'call_response', 'hangup'):
            # 1. Forward signal to everyone currently in the chat room
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'rtc_signal',
                    'sender_id': self.current_user.id,
                    'payload': data
                }
            )

            # 2. TRIGGER EXTERNAL ALERT (For the Receiver who might not have the chat open)
            # This is why the receiver wasn't "seeing" anything — they weren't in the room!
            if msg_type == 'call_request':
                # Target the partner's private group to trigger the ringtone/popup
                if hasattr(self, 'other_user_id'):
                    target_group = f"user_{self.other_user_id}"
                    logger.info(f"Sending Global Call Alert from {self.current_user.username} to {target_group}")
                    await self.channel_layer.group_send(
                        target_group,
                        {
                            'type': 'chat_alert',
                            'alert_type': 'incoming_call',
                            'caller_id': self.current_user.id,
                            'caller_username': self.current_user.username,
                            'call_type': data.get('call_type', 'video'), # 'voice' or 'video'
                            'room_id': self.room_group_name
                        }
                    )
            return

        # --- TEXT CHAT & STATUS ---
        if msg_type == 'mark_read':
            await self._ensure_db(self.mark_messages_read)
            await self.channel_layer.group_send(self.room_group_name, {'type': 'message_read_receipt', 'username': self.current_user.username})
            return

        content = data.get('message') or data.get('content')
        if not content: return
        
        msg_id, ts = await self._ensure_db(self.save_message, content)
        if not msg_id: return

        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'chat_message',
                'id': msg_id, 'content': content,
                'author': self.current_user.id, 'author_username': self.current_user.username,
                'timestamp': ts.isoformat(), 'is_read': False,
                'group_id': int(self.group_id_param) if self.group_id_param else None
            }
        )

    # --- Protocol Handlers ---
    async def chat_message(self, event): await self.send(text_data=json.dumps(event))
    async def user_status(self, event): await self.send(text_data=json.dumps(event))
    async def message_read_receipt(self, event): await self.send(text_data=json.dumps({'type': 'message_read', 'username': event['username']}))
    
    async def rtc_signal(self, event):
        # Don't echo signaling back to self
        if event['sender_id'] != self.current_user.id:
            logger.debug(f"Relaying RTC signal to {self.current_user.username}")
            await self.send(text_data=json.dumps(event['payload']))

    # --- Persistence & Utilities ---
    async def _ensure_db(self, func, *args):
        @database_sync_to_async
        def wrapper():
            close_old_connections()
            return func(*args)
        return await wrapper()

    def check_group_membership(self, gid, user):
        return ChatGroup.objects.filter(id=gid, members=user).exists()

    def precache_chat_metadata(self):
        try:
            uids = sorted([int(self.current_user.id), int(self.other_user_id)])
            room, _ = ChatRoom.objects.get_or_create(user1_id=uids[0], user2_id=uids[1])
            self.cached_room_id = room.id
        except: self.cached_room_id = None

    def save_message(self, content):
        ts = timezone.now()
        try:
            if self.group_id_param:
                msg = ChatMessage.objects.create(group_id=self.group_id_param, author=self.current_user, content=content)
                ChatGroup.objects.filter(id=self.group_id_param).update(last_message_at=ts)
                return msg.id, msg.timestamp
            else:
                if not hasattr(self, 'cached_room_id'): self.precache_chat_metadata()
                msg = ChatMessage.objects.create(room_id=self.cached_room_id, author=self.current_user, content=content)
                ChatRoom.objects.filter(id=self.cached_room_id).update(last_message_at=ts)
                return msg.id, msg.timestamp
        except: return None, None

    def update_user_status(self, online):
        Profile.objects.filter(user=self.current_user).update(is_online=online, last_seen=timezone.now())

    def mark_messages_read(self):
        if hasattr(self, 'cached_room_id'):
            ChatMessage.objects.filter(room_id=self.cached_room_id, is_read=False).exclude(author=self.current_user).update(is_read=True)

class NotificationConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        """Global Alert Center for Incoming Calls, Likes, and Mentions."""
        self.user = await get_user_from_scope(self.scope)
        if not self.user.is_authenticated:
            await self.close()
            return
        self.group_name = f"user_{self.user.id}"
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()
        asyncio.create_task(self._ensure_db(self.update_user_status, True))

    async def disconnect(self, close_code):
        if hasattr(self, 'group_name'):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)
    
    async def _ensure_db(self, func, *args):
        @database_sync_to_async
        def wrapper():
            close_old_connections()
            return func(*args)
        return await wrapper()

    def update_user_status(self, online):
        Profile.objects.filter(user=self.user).update(is_online=online, last_seen=timezone.now())

    async def notification_message(self, event): await self.send(text_data=json.dumps(event))
    
    async def chat_alert(self, event): 
        # Crucial for Voice/Video: Relays the incoming call popup globally
        logger.info(f"Relaying Global Alert to {self.user.username}: {event.get('alert_type')}")
        await self.send(text_data=json.dumps(event))