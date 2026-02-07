# backend/api/routing.py (NEW FILE)

from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    # The URL pattern for connecting to a specific chat room
    # The room_name will be the ID of the other user in the chat
    re_path(r'ws/chat/(?P<user_id>\w+)/$', consumers.ChatConsumer.as_asgi()),
    re_path(r'ws/chat/group/(?P<group_id>\w+)/$', consumers.ChatConsumer.as_asgi()),
    
    # Global Notification Socket for the logged-in user
    re_path(r'ws/notifications/$', consumers.NotificationConsumer.as_asgi()),
]