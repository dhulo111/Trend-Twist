from django.contrib.auth.models import User
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from .models import Profile

# ─────────────────────────────────────────────────────────────
# 1. Profile Auto-Create
# ─────────────────────────────────────────────────────────────

@receiver(post_save, sender=User)
def create_or_update_user_profile(sender, instance, created, **kwargs):
    if created:
        Profile.objects.get_or_create(user=instance)
    else:
        if hasattr(instance, 'profile'):
            instance.profile.save()
        else:
            Profile.objects.create(user=instance)


# ─────────────────────────────────────────────────────────────
# 2. Notification WebSocket Helper
# ─────────────────────────────────────────────────────────────

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from .models import Notification


def send_notification_socket(notification_instance):
    """
    Sends a real-time WebSocket push to the notification recipient.
    Wraps all I/O in try/except so a channel-layer failure never
    propagates and crashes the calling Django view or signal.
    """
    try:
        channel_layer = get_channel_layer()
        if not channel_layer:
            return  # channels not configured (e.g. tests)

        group_name = f"user_{notification_instance.recipient.id}"

        # Build a minimal but complete payload
        sender_profile = getattr(notification_instance.sender, 'profile', None)
        profile_pic = None
        if sender_profile and sender_profile.profile_picture:
            try:
                profile_pic = sender_profile.profile_picture.url
            except Exception:
                pass

        data = {
            'id': notification_instance.id,
            'sender_username': notification_instance.sender.username,
            'sender_profile_picture': profile_pic,
            'notification_type': notification_instance.notification_type,
            'created_at': notification_instance.created_at.isoformat(),
            'is_read': False,
            'post_id': notification_instance.post_id,    # FK id fields are safe (no extra query)
            'reel_id': notification_instance.reel_id,
            'story_id': notification_instance.story_id,
            'twist_id': notification_instance.twist_id,
        }

        async_to_sync(channel_layer.group_send)(
            group_name,
            {
                'type': 'notification_message',
                'data': data,
            }
        )
    except Exception as e:
        # Log but never raise — a push failure must not break DB operations
        import logging
        logging.getLogger(__name__).warning(
            f"[signals] send_notification_socket failed for notification "
            f"{getattr(notification_instance, 'id', '?')}: {e}"
        )


# ─────────────────────────────────────────────────────────────
# 3. Notification Deleted → real-time removal
# ─────────────────────────────────────────────────────────────

@receiver(post_delete, sender=Notification)
def notify_notification_deleted(sender, instance, **kwargs):
    """Notify the client to remove the notification from its UI in real time."""
    try:
        channel_layer = get_channel_layer()
        if not channel_layer:
            return

        group_name = f"user_{instance.recipient_id}"  # Use _id to avoid extra query

        async_to_sync(channel_layer.group_send)(
            group_name,
            {
                'type': 'notification_message',
                'data': {
                    'id': instance.id,
                    'action': 'deleted',
                },
            }
        )
    except Exception as e:
        import logging
        logging.getLogger(__name__).warning(
            f"[signals] notify_notification_deleted failed for notification "
            f"{getattr(instance, 'id', '?')}: {e}"
        )

# ─────────────────────────────────────────────────────────────
# NOTE: Like / Comment notifications are fired directly inside
# the views (LikeToggleView, CommentListCreateView, etc.) and
# broadcast over the channel layer there. We intentionally do
# NOT duplicate them here with signal-based receivers to avoid
# creating two notifications for every like/comment.
# ─────────────────────────────────────────────────────────────
