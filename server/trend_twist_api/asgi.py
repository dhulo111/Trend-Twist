import os
from django.core.asgi import get_asgi_application

# 1. Set the settings module BEFORE importing anything else
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'trend_twist_api.settings')

# 2. Initialize the Django ASGI application early to ensure the AppRegistry is populated
# This must happen before importing routing, consumers, or middleware that use models.
django_asgi_app = get_asgi_application()

# 3. Now it's safe to import our custom consumers and middleware
from channels.routing import ProtocolTypeRouter, URLRouter
from trend.middleware import JwtAuthMiddleware
import trend.routing

application = ProtocolTypeRouter({
    "http": django_asgi_app, # Standard HTTP calls
    
    # WebSocket handling for live features using JWT
    "websocket": JwtAuthMiddleware(
        URLRouter(
            trend.routing.websocket_urlpatterns
        )
    ),
})