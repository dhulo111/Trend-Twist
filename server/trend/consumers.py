# backend/api/consumers.py

import json
import asyncio
from channels.generic.websocket import AsyncWebsocketConsumer
from django.contrib.auth.models import User
from django.db.models import Q
from django.utils import timezone
from .models import ChatRoom, ChatMessage, Profile, ChatGroup
from channels.db import database_sync_to_async
from .middleware import get_user_from_scope

class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user_id_param = self.scope['url_route']['kwargs'].get('user_id')
        self.group_id_param = self.scope['url_route']['kwargs'].get('group_id')

        # 1. Auth & Identification
        self.current_user = await get_user_from_scope(self.scope)
        if not self.current_user.is_authenticated:
            await self.close()
            return

        # 2. Room Setup
        if self.group_id_param:
            self.room_group_name = f'chat_group_{self.group_id_param}'
            is_member = await self.check_group_membership(self.group_id_param, self.current_user)
            if not is_member:
                await self.close()
                return
        elif self.user_id_param:
            if str(self.current_user.id) == self.user_id_param:
                await self.close()
                return
            self.other_user_id = str(self.user_id_param)
            user_ids = sorted([str(self.current_user.id), self.other_user_id])
            self.room_name = f'chat_{user_ids[0]}_{user_ids[1]}'
            self.room_group_name = f'chat_{self.room_name}'
            
            # --- PERFORMANCE OPTIMIZATION ---
            # Pre-cache chat metadata to avoid DB lookups during message exchange
            await self.precache_chat_metadata()
        else:
            await self.close()
            return

        # 3. Join Group
        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.update_user_status(True)

        if self.user_id_param:
             await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'user_status',
                    'username': self.current_user.username,
                    'is_online': True,
                    'last_seen': timezone.now().isoformat()
                }
            )

        await self.accept()

        # Notify initial status
        if self.user_id_param:
            other_user_status = await self.get_user_profile_status(self.user_id_param)
            if other_user_status:
                await self.send(text_data=json.dumps({
                    'type': 'user_status',
                    'username': other_user_status['username'],
                    'is_online': other_user_status['is_online'],
                    'last_seen': other_user_status['last_seen']
                }))

    @database_sync_to_async
    def precache_chat_metadata(self):
        """Warm up connections and cache ID values for performance."""
        try:
            other_user = User.objects.get(id=self.user_id_param)
            # Store essential IDs on self for lightning-fast save_message
            self.cached_room_id = ChatRoom.objects.get_or_create(
                user1=min(self.current_user, other_user, key=lambda u: u.id),
                user2=max(self.current_user, other_user, key=lambda u: u.id),
            )[0].id
        except:
            self.cached_room_id = None

    @database_sync_to_async
    def save_message(self, content):
        """Optimized message saving using cached IDs."""
        timestamp = timezone.now()
        if self.group_id_param:
             try:
                group = ChatGroup.objects.get(id=self.group_id_param)
                group.last_message_at = timestamp
                group.save(update_fields=['last_message_at'])
                msg = ChatMessage.objects.create(
                    group=group, author=self.current_user, content=content
                )
                return msg.id, msg.timestamp
             except: return None, None
        else:
            if not getattr(self, 'cached_room_id', None):
                return None, None
            
            # Use direct ID for lookup to avoid full model instantiation
            ChatRoom.objects.filter(id=self.cached_room_id).update(last_message_at=timestamp)
            msg = ChatMessage.objects.create(
                room_id=self.cached_room_id,
                author=self.current_user,
                content=content
            )
            return msg.id, msg.timestamp

    async def disconnect(self, close_code):
        if hasattr(self, 'room_group_name'):
            await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

    async def receive(self, text_data):
        data = json.loads(text_data)
        if data.get('type') == 'mark_read':
            await self.mark_messages_read()
            await self.channel_layer.group_send(
                self.room_group_name,
                {'type': 'message_read_receipt', 'username': self.current_user.username}
            )
            return

        # Regular Message
        message = data.get('message') or data.get('content')
        if not message: return
        
        msg_id, timestamp = await self.save_message(message)
        if msg_id is None: return

        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'chat_message',
                'id': msg_id,
                'content': message,
                'author': self.current_user.id,
                'author_username': self.current_user.username,
                'timestamp': timestamp.isoformat(),
                'is_read': False,
                'group_id': int(self.group_id_param) if self.group_id_param else None
            }
        )

    async def chat_message(self, event):
        await self.send(text_data=json.dumps(event))

    async def user_status(self, event):
        await self.send(text_data=json.dumps(event))

    @database_sync_to_async
    def mark_messages_read(self):
        if hasattr(self, 'cached_room_id'):
            ChatMessage.objects.filter(room_id=self.cached_room_id, is_read=False).exclude(author=self.current_user).update(is_read=True)

    @database_sync_to_async
    def update_user_status(self, is_online):
        Profile.objects.filter(user=self.current_user).update(is_online=is_online, last_seen=timezone.now())

    @database_sync_to_async
    def get_user_profile_status(self, user_id):
        try:
            user = User.objects.get(id=user_id)
            profile = user.profile
            return {
                'username': user.username,
                'is_online': profile.is_online,
                'last_seen': profile.last_seen.isoformat() if profile.last_seen else None
            }
        except: return None

class NotificationConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user = await get_user_from_scope(self.scope)
        if not self.user.is_authenticated:
            await self.close()
            return

        self.group_name = f"user_{self.user.id}"
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()
        asyncio.ensure_future(self.update_user_status(True))

    async def disconnect(self, close_code):
        if hasattr(self, 'group_name'):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    @database_sync_to_async
    def update_user_status(self, is_online):
        Profile.objects.filter(user=self.user).update(is_online=is_online, last_seen=timezone.now())

    async def notification_message(self, event):
        await self.send(text_data=json.dumps(event))

    async def chat_alert(self, event):
        await self.send(text_data=json.dumps(event))