from rest_framework import permissions
from django.utils import timezone

class IsNotBlocked(permissions.BasePermission):
    """
    Global permission check for blocked users.
    Returns 403 Forbidden with custom message if user is blocked.
    """
    message = 'Your account has been blocked.'

    def has_permission(self, request, view):
        if request.user and request.user.is_authenticated:
            try:
                profile = request.user.profile
                if profile.blocked_until and profile.blocked_until > timezone.now():
                    self.message = {
                        'error': 'Your account has been blocked.',
                        'reason': profile.block_reason,
                        'blocked_until': profile.blocked_until.isoformat(),
                        'contact': 'admin@trendtwist.com'
                    }
                    return False
            except Exception:
                pass
        return True
