# backend/api/consumers.py

import json
import asyncio
from channels.generic.websocket import AsyncWebsocketConsumer
from django.contrib.auth.models import User
from django.db.models import Q
from django.utils import timezone
from .models import ChatRoom, ChatMessage, Profile, ChatGroup, LiveStream, LiveStreamViewer
from channels.db import database_sync_to_async

class ChatConsumer(AsyncWebsocketConsumer):
    # --- 1. Connection Handlers ---

    async def connect(self):
        self.user_id_param = self.scope['url_route']['kwargs'].get('user_id')
        self.group_id_param = self.scope['url_route']['kwargs'].get('group_id')
        self.current_user = self.scope['user']

        if not self.current_user.is_authenticated:
            await self.close()
            return

        if self.group_id_param:
            # GROUP CHAT LOGIC
            self.room_group_name = f'chat_group_{self.group_id_param}'
            # Verify membership (optional but recommended)
            is_member = await self.check_group_membership(self.group_id_param, self.current_user)
            if not is_member:
                await self.close()
                return
        elif self.user_id_param:
            # 1-on-1 CHAT LOGIC
            if str(self.current_user.id) == self.user_id_param:
                await self.close()
                return
            self.other_user_id = str(self.user_id_param)
            user_ids = sorted([str(self.current_user.id), self.other_user_id])
            self.room_name = f'chat_{user_ids[0]}_{user_ids[1]}'
            self.room_group_name = f'chat_{self.room_name}'
        else:
            await self.close()
            return

        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        # Notify room that user is online
        await self.update_user_status(True)
        # Only broadcast status updates in 1-on-1 chats for now to reduce noise in large groups
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

        # Fetch status only for 1-on-1
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
    def check_group_membership(self, group_id, user):
        try:
            group = ChatGroup.objects.get(id=group_id)
            return group.members.filter(id=user.id).exists()
        except ChatGroup.DoesNotExist:
            return False

    @database_sync_to_async
    def save_message(self, content):
        if self.group_id_param:
             try:
                group = ChatGroup.objects.get(id=self.group_id_param)
                group.last_message_at = timezone.now()
                group.save()
                msg = ChatMessage.objects.create(
                    group=group, 
                    author=self.current_user, 
                    content=content
                )
                return msg.id, msg.timestamp
             except ChatGroup.DoesNotExist:
                return None, None
        else:
            # Existing 1-on-1 Logic
            user1 = self.current_user
            user2 = User.objects.get(id=self.user_id_param)
            
            # Enforce consistent user1/user2 order for ChatRoom lookup
            room, created = ChatRoom.objects.get_or_create(
                user1=min(user1, user2, key=lambda u: u.id),
                user2=max(user1, user2, key=lambda u: u.id),
            )
            
            room.last_message_at = timezone.now()
            room.save()

            msg = ChatMessage.objects.create(
                room=room,
                author=self.current_user,
                content=content
            )
            return msg.id, msg.timestamp

    async def disconnect(self, close_code):
        if hasattr(self, 'room_group_name'):
            await self.update_user_status(False)
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'user_status',
                    'username': self.current_user.username,
                    'is_online': False,
                    'last_seen': timezone.now().isoformat()
                }
            )

            await self.channel_layer.group_discard(
                self.room_group_name,
                self.channel_name
            )

    async def receive(self, text_data):
        data = json.loads(text_data)
        
        if data.get('type') == 'mark_read':
            await self.mark_messages_read()
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'message_read_receipt',
                    'username': self.current_user.username,
                }
            )
            return

        if data.get('type') == 'edit_message':
            msg_id = data.get('id')
            new_content = data.get('content')
            success = await self.edit_message_db(msg_id, new_content)
            if success:
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        'type': 'message_updated',
                        'id': msg_id,
                        'content': new_content
                    }
                )
            return

        if data.get('type') == 'delete_message':
            msg_id = data.get('id')
            success = await self.delete_message_db(msg_id)
            if success:
                 await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        'type': 'message_deleted',
                        'id': msg_id
                    }
                )
            return

        if data.get('type') in ['call_offer', 'call_answer', 'new_ice_candidate', 'call_ended']:
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'call_signal',
                    'data': data,
                    'sender_username': self.current_user.username
                }
            )
            return

        message = data.get('message')
        if not message:
             message = data.get('content')
        
        if not message: return 
        
        msg_id, timestamp = await self.save_message(message)

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
        await self.send(text_data=json.dumps({
            'type': 'chat_message',
            'id': event['id'],
            'content': event['content'],
            'author': event['author'],
            'author_username': event['author_username'],
            'timestamp': event['timestamp'],
            'is_read': event['is_read'],
            'group_id': event.get('group_id')
        }))

    async def user_status(self, event):
        await self.send(text_data=json.dumps({
            'type': 'user_status',
            'username': event['username'],
            'is_online': event['is_online'],
             'last_seen': event['last_seen']
        }))
        
    async def global_user_status_change(self, event):
        if str(event['user_id']) == self.other_user_id:
             await self.send(text_data=json.dumps({
                'type': 'user_status',
                'username': event['username'],
                'is_online': event['is_online'],
                'last_seen': event['last_seen']
            }))

    async def message_read_receipt(self, event):
        await self.send(text_data=json.dumps({
             'type': 'message_read',
             'username': event['username']
        }))

    async def message_updated(self, event):
        await self.send(text_data=json.dumps({
            'type': 'message_updated',
            'id': event['id'],
            'content': event['content']
        }))

    async def message_deleted(self, event):
        await self.send(text_data=json.dumps({
            'type': 'message_deleted',
            'id': event['id']
        }))

    async def call_signal(self, event):
        if event['sender_username'] == self.current_user.username:
            return

        await self.send(text_data=json.dumps({
            'type': 'call_signal', 
            'data': event['data'],         
            'sender_username': event['sender_username']
        }))

    @database_sync_to_async
    def mark_messages_read(self):
        if self.group_id_param: return 
        user1 = self.current_user
        try:
             user2 = User.objects.get(id=self.user_id_param)
             room = ChatRoom.objects.filter(
                Q(user1=user1, user2=user2) | Q(user1=user2, user2=user1)
             ).first()
             
             if room:
                  ChatMessage.objects.filter(room=room, is_read=False).exclude(author=user1).update(is_read=True)
        except User.DoesNotExist:
             pass

    @database_sync_to_async
    def update_user_status(self, is_online):
        profile, _ = Profile.objects.get_or_create(user=self.current_user)
        profile.is_online = is_online
        profile.last_seen = timezone.now()
        profile.save()

    @database_sync_to_async
    def edit_message_db(self, msg_id, content):
        try:
            msg = ChatMessage.objects.get(id=msg_id, author=self.current_user)
            msg.content = content
            msg.save()
            return True
        except ChatMessage.DoesNotExist:
            return False

    @database_sync_to_async
    def get_user_profile_status(self, user_id):
        try:
            user = User.objects.get(id=user_id)
            profile, _ = Profile.objects.get_or_create(user=user)
            return {
                'username': user.username,
                'is_online': profile.is_online,
                'last_seen': profile.last_seen.isoformat() if profile.last_seen else None
            }
        except User.DoesNotExist:
            return None

    @database_sync_to_async
    def delete_message_db(self, msg_id):
        try:
            msg = ChatMessage.objects.get(id=msg_id, author=self.current_user)
            msg.delete() 
            return True
        except ChatMessage.DoesNotExist:
            return False

class NotificationConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user = self.scope["user"]
        if not self.user.is_authenticated:
            await self.close()
            return
        self.group_name = f"user_{self.user.id}"
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()
        asyncio.create_task(self._handle_user_status_change(True))

    async def disconnect(self, close_code):
        if getattr(self, 'user', None) and self.user.is_authenticated:
            asyncio.create_task(self._handle_user_status_change(False))
        if hasattr(self, 'group_name'):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def _handle_user_status_change(self, is_online):
        try:
            await self.update_user_status(is_online)
            await self.broadcast_status(is_online)
        except Exception as e:
            print(f"Error handling user status change: {e}")

    async def notification_message(self, event):
        await self.send(text_data=json.dumps({
            'type': event['type'], 
            'data': event['data']  
        }))
        
    async def chat_alert(self, event):
        await self.send(text_data=json.dumps({
            'type': 'chat_alert',
            'data': event['data']
        }))

    @database_sync_to_async
    def update_user_status(self, is_online):
        profile, _ = Profile.objects.get_or_create(user=self.user)
        profile.is_online = is_online
        profile.last_seen = timezone.now()
        profile.save()

    async def broadcast_status(self, is_online):
        active_chat_groups = await self.get_user_active_chat_groups()
        tasks = []
        for group in active_chat_groups:
             tasks.append(
                 self.channel_layer.group_send(
                    group,
                    {
                        'type': 'global_user_status_change',
                        'user_id': self.user.id,
                        'username': self.user.username,
                        'is_online': is_online,
                        'last_seen': timezone.now().isoformat()
                    }
                )
            )
        if tasks:
            await asyncio.gather(*tasks)

    @database_sync_to_async
    def get_user_active_chat_groups(self):
        rooms_data = ChatRoom.objects.filter(Q(user1=self.user) | Q(user2=self.user)).values_list('user1_id', 'user2_id')
        groups = []
        for user1_id, user2_id in rooms_data:
             user_ids = sorted([str(user1_id), str(user2_id)])
             groups.append(f'chat_{user_ids[0]}_{user_ids[1]}')
        return groups

class LiveStreamConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.stream_id = self.scope['url_route']['kwargs'].get('stream_id')
        self.user = self.scope["user"]
        if not self.user or not self.user.is_authenticated:
            await self.close()
            return
        self.room_group_name = f'live_{self.stream_id}'
        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()
        is_host = await self.is_stream_host(self.stream_id, self.user)
        if is_host:
            await self.set_stream_active(self.stream_id, True)
        else:
            await self.add_viewer(self.stream_id, self.user)
            await self.broadcast_viewer_count()

    async def disconnect(self, close_code):
        is_host = await self.is_stream_host(self.stream_id, self.user)
        if is_host:
            await self.set_stream_active(self.stream_id, False)
        else:
            await self.remove_viewer(self.stream_id, self.user)
            await self.broadcast_viewer_count()
        if hasattr(self, 'room_group_name'):
            await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
        except: return
        msg_type = data.get('type')
        if msg_type in ['offer', 'answer', 'candidate']:
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'live_signal',
                    'sender': self.user.username,
                    'data': data
                }
            )
        elif msg_type == 'heart':
            await self.channel_layer.group_send(
                self.room_group_name,
                { 'type': 'live_heart' }
            )
        elif msg_type == 'chat':
            import uuid
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'live_chat',
                    'id': str(uuid.uuid4()),
                    'username': self.user.username,
                    'content': data.get('content')
                }
            )

    async def live_heart(self, event):
        await self.send(text_data=json.dumps({ 'type': 'heart' }))

    async def live_signal(self, event):
        if event['sender'] != self.user.username:
            await self.send(text_data=json.dumps({
                'type': 'signal',
                'sender': event['sender'],
                'data': event['data']
            }))

    async def live_chat(self, event):
        await self.send(text_data=json.dumps({
            'type': 'chat',
            'id': event.get('id'),
            'username': event['username'],
            'content': event['content']
        }))

    async def viewer_count_update(self, event):
        await self.send(text_data=json.dumps({
            'type': 'viewer_count',
            'count': event['count']
        }))

    @database_sync_to_async
    def is_stream_host(self, stream_id, user):
        return LiveStream.objects.filter(stream_id=stream_id, host=user).exists()

    @database_sync_to_async
    def set_stream_active(self, stream_id, active):
        from django.utils import timezone
        if active:
            LiveStream.objects.filter(stream_id=stream_id).update(is_live=True)
        else:
            LiveStream.objects.filter(stream_id=stream_id).update(is_live=False, ended_at=timezone.now())

    @database_sync_to_async
    def add_viewer(self, stream_id, user):
        try:
             stream = LiveStream.objects.get(stream_id=stream_id)
             LiveStreamViewer.objects.get_or_create(stream=stream, user=user)
             stream.viewer_count = stream.viewers.count()
             stream.save()
        except: pass

    @database_sync_to_async
    def remove_viewer(self, stream_id, user):
        try:
             stream = LiveStream.objects.get(stream_id=stream_id)
             LiveStreamViewer.objects.filter(stream=stream, user=user).delete()
             stream.viewer_count = stream.viewers.count()
             stream.save()
        except: pass

    async def broadcast_viewer_count(self):
        count = await self.get_viewer_count(self.stream_id)
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'viewer_count_update',
                'count': count
            }
        )

    @database_sync_to_async
    def get_viewer_count(self, stream_id):
        try:
            return LiveStream.objects.get(stream_id=stream_id).viewers.count()
        except: return 0