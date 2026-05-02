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
        """Unified RT Hub for DMs and signaling."""
        try:
            self.user_id_param = self.scope['url_route']['kwargs'].get('user_id')
            self.group_id_param = self.scope['url_route']['kwargs'].get('group_id')

            self.current_user = await get_user_from_scope(self.scope)
            if not self.current_user or not self.current_user.is_authenticated:
                await self.close()
                return

            if self.group_id_param:
                self.room_group_name = f'chat_group_{self.group_id_param}'
            elif self.user_id_param:
                self.other_user_id = str(self.user_id_param)
                if str(self.current_user.id) == self.other_user_id:
                    await self.close()
                    return
                # Sorted IDs ensure both users hit the SAME room group
                uids = sorted([int(self.current_user.id), int(self.other_user_id)])
                self.room_group_name = f'chat_{uids[0]}_{uids[1]}'
            else:
                await self.close()
                return

            await self.channel_layer.group_add(self.room_group_name, self.channel_name)
            await self.accept()
            
            # Start Background Status/Presence Tasks
            asyncio.create_task(self._ensure_db(self.update_user_status, True))
            await self.channel_layer.group_send(
                self.room_group_name,
                {'type': 'status_relay', 'sender_id': self.current_user.id, 'username': self.current_user.username, 'is_online': True}
            )
        except Exception as e:
            logger.exception(f"Chat Connect Error: {e}")
            await self.close()

    async def disconnect(self, close_code):
        if hasattr(self, 'room_group_name'):
            await self.channel_layer.group_discard(self.room_group_name, self.channel_name)
            asyncio.create_task(self._ensure_db(self.update_user_status, False))
            await self.channel_layer.group_send(self.room_group_name, {'type': 'status_relay', 'sender_id': self.current_user.id, 'username': self.current_user.username, 'is_online': False})

    async def receive(self, text_data):
        try: data = json.loads(text_data)
        except: return
        mtype = data.get('type')

        # --- SIGNALING (Calls/RTC) ---
        if mtype in ('offer', 'answer', 'ice_candidate', 'call_offer', 'call_answer', 'new_ice_candidate', 'call_ended'):
            # 1. Broad relay to the room (for currently active chatters)
            await self.channel_layer.group_send(
                self.room_group_name,
                {'type': 'call_signal_relay', 'sender_id': self.current_user.id, 'data': data}
            )
            
            # 2. APP-WIDE SYSTEM ALERT
            # This triggers the ringing screen for users NOT in the chat
            if mtype == 'call_offer' or mtype == 'call_ended':
                if hasattr(self, 'other_user_id'):
                    await self._global_alert_push(self.other_user_id, data)
                elif self.group_id_param:
                    mids = await self._ensure_db(self.get_group_member_ids, self.group_id_param)
                    for mid in mids:
                        if mid != self.current_user.id: await self._global_alert_push(str(mid), data)
            return

        # --- CHAT & READ RECEIPTS ---
        if mtype == 'mark_read':
            await self._ensure_db(self.mark_messages_read)
            await self.channel_layer.group_send(self.room_group_name, {'type': 'message_read_receipt', 'username': self.current_user.username})
            return

        content = data.get('message') or data.get('content')
        if not content: return
        msg_id, ts = await self._ensure_db(self.save_message, content)
        if not msg_id: return
        await self.channel_layer.group_send(self.room_group_name, {'type': 'chat_message', 'id': msg_id, 'content': content, 'author': self.current_user.id, 'author_username': self.current_user.username, 'timestamp': ts.isoformat(), 'is_read': False, 'group_id': int(self.group_id_param) if self.group_id_param else None})

    async def _global_alert_push(self, target_user_id, source_data):
        """Sends an urgent signal to the receiver's persistent Notification tunnel."""
        target_group = f"user_{str(target_user_id)}"
        
        # We send as a 'call_signal' so the frontend context can handle it globally
        await self.channel_layer.group_send(
            target_group,
            {
                'type': 'notification_gateway',
                'payload': {
                    'type': 'call_signal', 
                    'data': source_data,
                    'caller_id': self.current_user.id,
                    'caller_username': self.current_user.username,
                    'is_global': True
                }
            }
        )
        
        # FCM push for killed / background state
        if source_data.get('type') == 'call_offer':
            try:
                from django.contrib.auth.models import User as DjangoUser
                from channels.db import database_sync_to_async
                
                @database_sync_to_async
                def _push():
                    from .services.fcm_service import send_call_notification
                    try:
                        recipient = DjangoUser.objects.get(id=int(target_user_id))
                        send_call_notification(
                            caller=self.current_user,
                            recipient=recipient,
                            call_type=source_data.get('callType', 'voice'),
                            signal_data=source_data,
                        )
                    except DjangoUser.DoesNotExist:
                        pass
                await _push()
            except Exception as e:
                logger.warning(f"FCM call push failed: {e}")
        
        logger.info(f"App-wide call bridge: {source_data.get('type')} -> {target_group}")

    async def call_signal_relay(self, event):
        """Relays signaling if the user is currently in the specific chat window."""
        if event['sender_id'] != self.current_user.id:
            # We wrap in 'type: call_signal' to match frontend ChatWindow logic
            await self.send(text_data=json.dumps({
                'type': 'call_signal',
                'data': event['data']
            }))

    async def status_relay(self, event):
        if event['sender_id'] != self.current_user.id:
            await self.send(text_data=json.dumps({'type': 'user_status', 'username': event['username'], 'is_online': event['is_online']}))

    # Protocol sinks
    async def chat_message(self, event): await self.send(text_data=json.dumps(event))
    async def message_read_receipt(self, event): await self.send(text_data=json.dumps({'type': 'message_read', 'username': event['username']}))
    
    async def _ensure_db(self, func, *args):
        @database_sync_to_async
        def wrapper():
            close_old_connections()
            return func(*args)
        return await wrapper()

    def get_group_member_ids(self, gid): return list(ChatGroup.objects.get(id=gid).members.values_list('id', flat=True))
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
    def update_user_status(self, online): Profile.objects.filter(user=self.current_user).update(is_online=online, last_seen=timezone.now())
    def mark_messages_read(self):
        if hasattr(self, 'cached_room_id'): ChatMessage.objects.filter(room_id=self.cached_room_id, is_read=False).exclude(author=self.current_user).update(is_read=True)

class NotificationConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        try:
            self.user = await get_user_from_scope(self.scope)
            if not self.user or not self.user.is_authenticated:
                await self.close()
                return
            self.group_name = f"user_{str(self.user.id)}"
            await self.channel_layer.group_add(self.group_name, self.channel_name)
            await self.accept()
            asyncio.create_task(self.keep_alive())
        except: await self.close()

    async def keep_alive(self):
        while True:
            await asyncio.sleep(25)
            try: await self.send(text_data=json.dumps({'type': 'ping'}))
            except: break

    async def disconnect(self, close_code):
        if hasattr(self, 'group_name'): await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def notification_gateway(self, event): 
        """Direct push to global UI context (call signals etc.)."""
        await self.send(text_data=json.dumps(event['payload']))

    async def chat_alert(self, event):
        """Relays a new message alert to the client."""
        await self.send(text_data=json.dumps({
            'type': 'chat_alert',
            'data': event['data']
        }))

    async def notification_message(self, event): await self.send(text_data=json.dumps(event))