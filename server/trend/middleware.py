from django.http import JsonResponse
from django.utils import timezone

class BlockedUserMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.user.is_authenticated:
            try:
                profile = request.user.profile
                if profile.blocked_until and profile.blocked_until > timezone.now():
                    return JsonResponse({
                        'error': 'Your account has been blocked.',
                        'reason': profile.block_reason,
                        'blocked_until': profile.blocked_until.isoformat(),
                        'contact': 'admin@trendtwist.com'
                    }, status=403)
            except Exception:
                pass
                
        response = self.get_response(request)
        return response

# --- RESTORED JwtAuthMiddleware ---
from urllib.parse import parse_qs
from channels.middleware import BaseMiddleware
from django.db import close_old_connections
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser
from channels.db import database_sync_to_async
from asgiref.sync import sync_to_async
from rest_framework_simplejwt.tokens import AccessToken, TokenError
import jwt

User = get_user_model()

# Wrap close_old_connections so it can be safely called in async context
_close_old_connections = sync_to_async(close_old_connections, thread_sensitive=True)

@database_sync_to_async
def get_user(user_id):
    try:
        return User.objects.get(id=user_id)
    except User.DoesNotExist:
        return AnonymousUser()

class JwtAuthMiddleware(BaseMiddleware):
    async def __call__(self, scope, receive, send):
        # Safely close old DB connections from the thread pool
        await _close_old_connections()
        
        try:
            query_string = parse_qs(scope['query_string'].decode())
            token = query_string.get('token', [None])[0]
            
            if token:
                # Verify token using SimpleJWT
                access_token = AccessToken(token)
                scope['user'] = await get_user(access_token['user_id'])
            else:
                scope['user'] = AnonymousUser()
        except (TokenError, jwt.DecodeError, Exception) as e:
            scope['user'] = AnonymousUser()

        return await super().__call__(scope, receive, send)
