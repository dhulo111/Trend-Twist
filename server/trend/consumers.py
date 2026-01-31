# backend/api/consumers.py (NEW FILE)

import json
from channels.generic.websocket import AsyncWebsocketConsumer
from django.contrib.auth.models import User
from django.db.models import Q
from django.utils import timezone
from .models import ChatRoom, ChatMessage, Profile
from channels.db import database_sync_to_async

class ChatConsumer(AsyncWebsocketConsumer):
    # --- 1. Connection Handlers ---

    async def connect(self):
        # The 'user_id' is the ID of the person the current user is chatting with
        self.other_user_id = self.scope['url_route']['kwargs']['user_id']
        self.current_user = self.scope['user']

        # Reject connection if not authenticated or user is trying to chat with self
        if not self.current_user.is_authenticated or str(self.current_user.id) == self.other_user_id:
            await self.close()
            return
        
        # Determine the user IDs for the room group name
        user_ids = sorted([str(self.current_user.id), self.other_user_id])
        self.room_name = f'chat_{user_ids[0]}_{user_ids[1]}'
        self.room_group_name = 'chat_%s' % self.room_name

        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        # Notify room that user is online
        await self.update_user_status(True)
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

        # Fetch and send the OTHER user's status to the current user
        other_user_status = await self.get_user_profile_status(self.other_user_id)
        if other_user_status:
            await self.send(text_data=json.dumps({
                'type': 'user_status',
                'username': other_user_status['username'],
                'is_online': other_user_status['is_online'],
                'last_seen': other_user_status['last_seen']
            }))

    async def disconnect(self, close_code):
        # Leave room group
        if hasattr(self, 'room_group_name'):
             # Notify room that user is offline
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

    # --- 2. Receive Message from WebSocket ---
    
    async def receive(self, text_data):
        """Receive message from WebSocket and forward to room group."""
        data = json.loads(text_data)
        
        # --- Handle "Mark Read" event ---
        if data.get('type') == 'mark_read':
            await self.mark_messages_read()
            # Broadcast read receipt to room
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

        # --- Handle Call Signaling ---
        if data.get('type') in ['call_offer', 'call_answer', 'new_ice_candidate', 'call_ended']:
            # Forward the signaling data to the other user (room group)
            # We include the sender's username so the client knows who sent it
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'call_signal',
                    'data': data,
                    'sender_username': self.current_user.username
                }
            )
            return

        # --- Handle Normal Message ---
        message = data.get('message')
        # If 'message' key is missing, check 'content' as fallback
        if not message:
             message = data.get('content')
        
        if not message: return # Ignore empty messages
        
        # Save message to database (Must use sync_to_async for DB operations)
        msg_id, timestamp = await self.save_message(message)

        # Send message to room group (Standardizing keys to match ChatMessageSerializer)
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'chat_message',
                'id': msg_id,
                'content': message,
                'author': self.current_user.id,
                'author_username': self.current_user.username,
                'timestamp': timestamp.isoformat(),
                'is_read': False 
            }
        )

    # --- 3. Receive Message from Room Group (Send to WebSocket) ---

    async def chat_message(self, event):
        """Receive message from room group and send to the client."""
        await self.send(text_data=json.dumps({
            'type': 'chat_message',
            'id': event['id'],
            'content': event['content'], # Matches serializer
            'author': event['author'],
            'author_username': event['author_username'],
            'timestamp': event['timestamp'],
            'is_read': event['is_read']
        }))

    async def user_status(self, event):
        """Broadcast user online/offline status."""
        await self.send(text_data=json.dumps({
            'type': 'user_status',
            'username': event['username'],
            'is_online': event['is_online'],
             'last_seen': event['last_seen']
        }))
        
    async def global_user_status_change(self, event):
        """Receive global status update and forward to chat client if relevant."""
        # Only forward if the update is about the OTHER user in this chat
        if str(event['user_id']) == self.other_user_id:
             await self.send(text_data=json.dumps({
                'type': 'user_status',
                'username': event['username'],
                'is_online': event['is_online'],
                'last_seen': event['last_seen']
            }))

    async def message_read_receipt(self, event):
        """Broadcast that a user has read messages."""
        await self.send(text_data=json.dumps({
             'type': 'message_read',
             'username': event['username']
        }))

    async def message_updated(self, event):
        """Broadcast edited message."""
        await self.send(text_data=json.dumps({
            'type': 'message_updated',
            'id': event['id'],
            'content': event['content']
        }))

    async def message_deleted(self, event):
        """Broadcast deleted message."""
        await self.send(text_data=json.dumps({
            'type': 'message_deleted',
            'id': event['id']
        }))

    async def call_signal(self, event):
        """Forward WebRTC signaling message."""
        # Don't echo back to sender (optional, but good practice in some setups,
        # though frontend usually filters by checking 'sender_username')
        if event['sender_username'] == self.current_user.username:
            return

        await self.send(text_data=json.dumps({
            'type': 'call_signal', # Correctly identify this as a signal wrapper
            'data': event['data'],         # The full payload
            'sender_username': event['sender_username']
        }))

    # --- 4. Database Helper (Synchronous operations must be run asynchronously) ---

    from channels.db import database_sync_to_async
    
    @database_sync_to_async
    def save_message(self, content):
        # Find or create the chat room first
        user1 = self.current_user
        user2 = User.objects.get(id=self.other_user_id)
        
        # Enforce consistent user1/user2 order for ChatRoom lookup
        room, created = ChatRoom.objects.get_or_create(
            user1=min(user1, user2, key=lambda u: u.id),
            user2=max(user1, user2, key=lambda u: u.id),
        )
        
        # Update last_message_at for sorting the inbox
        room.last_message_at = timezone.now()
        room.save()

        # Create and save the message
        msg = ChatMessage.objects.create(
            room=room,
            author=self.current_user,
            content=content
        )
        return msg.id, msg.timestamp

    @database_sync_to_async
    def mark_messages_read(self):
        # Mark all messages FROM the OTHER user as read
        user1 = self.current_user
        try:
             user2 = User.objects.get(id=self.other_user_id)
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
            # Alternatively, if you want "soft delete" to show "Message deleted":
            # msg.content = "This message was unsend." 
            # msg.save()
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

        # Join user group
        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name
        )

        await self.accept()

        # Mark user as online globally
        # Mark user as online globally and broadcast
        await self.update_user_status(True)
        await self.broadcast_status(True)

    async def disconnect(self, close_code):
        # Mark user as offline globally and broadcast
        if self.user.is_authenticated:
            await self.update_user_status(False)
            await self.broadcast_status(False)

        # Leave user group
        if hasattr(self, 'group_name'):
            await self.channel_layer.group_discard(
                self.group_name,
                self.channel_name
            )

    # Receive message from group
    async def notification_message(self, event):
        # Send message to WebSocket
        await self.send(text_data=json.dumps({
            'type': event['type'], # 'notification'
            'data': event['data']  # The serializer data
        }))

    @database_sync_to_async
    def update_user_status(self, is_online):
        # Re-fetch user profile to ensure we have the latest or create if missing
        profile, _ = Profile.objects.get_or_create(user=self.user)
        profile.is_online = is_online
        profile.last_seen = timezone.now()
        profile.save()

    async def broadcast_status(self, is_online):
        """
        Broadcasts the user's new status to any active chat rooms where this user is a participant.
        This relies on a convention that ChatConsumers join a group named 'user_chats_<user_id>'
        OR we can iterate through active chats (expensive).
        
        BETTER APPROACH for this scale:
        Since ChatConsumer groups are 'chat_ID1_ID2', we don't know all of them easily without DB query.
        However, to keep it simple and effective as requested:
        We will send a message to a "global_updates" group or iterate known friends.
        
        OPTIMIZED:
        We will iterate over the user's active ChatRooms and send a message to those specific groups.
        """
        active_chat_groups = await self.get_user_active_chat_groups()
        
        for group in active_chat_groups:
             await self.channel_layer.group_send(
                group,
                {
                    'type': 'global_user_status_change',
                    'user_id': self.user.id,
                    'username': self.user.username,
                    'is_online': is_online,
                    'last_seen': timezone.now().isoformat()
                }
            )

    @database_sync_to_async
    def get_user_active_chat_groups(self):
        # Return list of channel group names for all chat rooms this user belongs to
        # Group name format is 'chat_minID_maxID'
        rooms = ChatRoom.objects.filter(Q(user1=self.user) | Q(user2=self.user))
        groups = []
        for room in rooms:
             user_ids = sorted([str(room.user1.id), str(room.user2.id)])
             groups.append(f'chat_{user_ids[0]}_{user_ids[1]}')
        return groups