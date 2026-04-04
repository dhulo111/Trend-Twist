# backend/api/routing.py

from django.urls import re_path
from . import consumers
from .stranger_consumer import StrangerConsumer

websocket_urlpatterns = [
    # The URL pattern for connecting to a specific chat room
    # The room_name will be the ID of the other user in the chat
    re_path(r'ws/chat/(?P<user_id>\w+)/$', consumers.ChatConsumer.as_asgi()),
    re_path(r'ws/chat/group/(?P<group_id>\w+)/$', consumers.ChatConsumer.as_asgi()),
    
    # Global Notification Socket for the logged-in user
    re_path(r'ws/notifications/$', consumers.NotificationConsumer.as_asgi()),

    # Talk with Stranger — random video chat matchmaking
    re_path(r'ws/stranger/$', StrangerConsumer.as_asgi()),

    # Live Streaming Signaling
    re_path(r'ws/live/(?P<stream_id>[\w-]+)/$', consumers.LiveStreamConsumer.as_asgi()),
]