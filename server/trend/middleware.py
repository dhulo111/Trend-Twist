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


# ---------------------------------------------------------------------------
# JWT WebSocket Auth Middleware
# ---------------------------------------------------------------------------
# CRITICAL DESIGN: We do NOT make any database calls here.
# The token is verified cryptographically (SECRET_KEY check) and the user_id
# is extracted directly from the token payload. This avoids any asyncio.shield()
# hangs from database_sync_to_async, which is the root cause of the
# "took too long to shut down" Daphne warnings on Render.
#
# The full User object is fetched lazily inside consumers if needed.
# ---------------------------------------------------------------------------
from urllib.parse import parse_qs
from channels.middleware import BaseMiddleware
from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.tokens import AccessToken, TokenError


class _LazyTokenUser:
    """
    A lightweight user-like object that stores user_id from the token.
    It is authenticated but avoids a DB call during the handshake.
    Consumers that need the full User object should call
    `await get_user_from_scope(scope)` once inside connect().
    """
    def __init__(self, user_id):
        self.id = user_id
        self.pk = user_id
        self.is_authenticated = True
        self.is_active = True
        self.username = ''  # populated lazily if needed

    def __str__(self):
        return f'LazyUser(id={self.id})'


class JwtAuthMiddleware(BaseMiddleware):
    async def __call__(self, scope, receive, send):
        # No DB calls — just decode the JWT token cryptographically.
        # This is O(1) CPU-only work, never blocks on Supabase.
        try:
            query_string = parse_qs(scope.get('query_string', b'').decode())
            token_str = query_string.get('token', [None])[0]

            if token_str:
                try:
                    access_token = AccessToken(token_str)  # Validates sig + expiry
                    user_id = access_token['user_id']
                    scope['user'] = _LazyTokenUser(user_id)
                    scope['token_user_id'] = user_id
                except TokenError:
                    scope['user'] = AnonymousUser()
                    scope['token_user_id'] = None
            else:
                scope['user'] = AnonymousUser()
                scope['token_user_id'] = None

        except Exception:
            scope['user'] = AnonymousUser()
            scope['token_user_id'] = None

        return await super().__call__(scope, receive, send)


# ---------------------------------------------------------------------------
# Helper: fetch the real User object inside consumers (call once in connect)
# ---------------------------------------------------------------------------
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model


@database_sync_to_async
def get_user_from_scope(scope):
    """
    Fetch the full User from DB using the user_id stored in scope.
    Call this once inside consumer.connect() and cache the result.
    Returns AnonymousUser if not found.
    """
    from django.db import close_old_connections
    close_old_connections()
    User = get_user_model()
    user_id = scope.get('token_user_id')
    if not user_id:
        return AnonymousUser()
    try:
        return User.objects.get(id=user_id)
    except User.DoesNotExist:
        return AnonymousUser()
