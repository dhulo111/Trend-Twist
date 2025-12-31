# backend/trend_twist_api/asgi.py (UPDATED)

import os
from channels.auth import AuthMiddlewareStack
from channels.routing import ProtocolTypeRouter, URLRouter
from django.core.asgi import get_asgi_application
import trend.routing # <-- Import our new routing file

from trend.middleware import JwtAuthMiddleware # Import Custom Middleware

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'trend_twist_api.settings')

application = ProtocolTypeRouter({
    "http": get_asgi_application(), # Standard HTTP calls (for DRF)
    
    # WebSocket handling for live features using JWT
    "websocket": JwtAuthMiddleware(
        URLRouter(
            trend.routing.websocket_urlpatterns # <-- Use routing.py for WS URLs
        )
    ),
})