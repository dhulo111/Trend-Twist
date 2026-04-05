import os
import django
from django.core.asgi import get_asgi_application

# Set settings module
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'trend_twist_api.settings')

# Initialize Django ASGI early (required for models/auth in middleware)
django_asgi_app = get_asgi_application()

# Import routing AFTER django_asgi_app to ensure AppRegistry is ready
from channels.routing import ProtocolTypeRouter, URLRouter
from trend.middleware import JwtAuthMiddleware
import trend.routing

application = ProtocolTypeRouter({
    "http": django_asgi_app,
    "websocket": JwtAuthMiddleware(
        URLRouter(
            trend.routing.websocket_urlpatterns
        )
    ),
})