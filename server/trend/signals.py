from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Profile

@receiver(post_save, sender=User)
def create_or_update_user_profile(sender, instance, created, **kwargs):
    if created:
        Profile.objects.get_or_create(user=instance)
    else:
        # Check if profile exists before saving, or create if missing
        if hasattr(instance, 'profile'):
            instance.profile.save()
        else:
            Profile.objects.create(user=instance)

# --- Notification Signals ---
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from .models import Like, ReelLike, FollowRequest, Comment, ReelComment, Notification, Post, Reel

def send_notification_socket(notification_instance):
    """Helper to send notification over WebSocket"""
    channel_layer = get_channel_layer()
    group_name = f"user_{notification_instance.recipient.id}"
    
    # We construct a basic payload. For full details, the client might refetch 
    # or we can serialize it here. Serializing here helps immediate update.
    # To avoid circular imports, we'll do a simple serialization.
    
    data = {
        'id': notification_instance.id,
        'sender_username': notification_instance.sender.username,
        'sender_profile_picture': notification_instance.sender.profile.profile_picture.url if notification_instance.sender.profile.profile_picture else None,
        'notification_type': notification_instance.notification_type,
        'created_at': notification_instance.created_at.isoformat(),
        'is_read': False,
        'post_id': notification_instance.post.id if notification_instance.post else None,
        'reel_id': notification_instance.reel.id if notification_instance.reel else None,
    }

    async_to_sync(channel_layer.group_send)(
        group_name,
        {
            'type': 'notification_message',
            'data': data
        }
    )

@receiver(post_save, sender=Like)
def notify_post_like(sender, instance, created, **kwargs):
    if created and instance.user != instance.post.author:
        notif = Notification.objects.create(
            recipient=instance.post.author,
            sender=instance.user,
            notification_type='like_post',
            post=instance.post
        )
        send_notification_socket(notif)

@receiver(post_save, sender=ReelLike)
def notify_reel_like(sender, instance, created, **kwargs):
    if created and instance.user != instance.reel.author:
        notif = Notification.objects.create(
            recipient=instance.reel.author,
            sender=instance.user,
            notification_type='like_reel',
            reel=instance.reel
        )
        send_notification_socket(notif)

@receiver(post_save, sender=FollowRequest)
def notify_follow_request(sender, instance, created, **kwargs):
    if created:
        notif = Notification.objects.create(
            recipient=instance.receiver,
            sender=instance.sender,
            notification_type='follow_request',
            follow_request_ref=instance
        )
        send_notification_socket(notif)

@receiver(post_save, sender=Comment)
def notify_post_comment(sender, instance, created, **kwargs):
    if created and instance.author != instance.post.author:
        notif = Notification.objects.create(
            recipient=instance.post.author,
            sender=instance.author,
            notification_type='comment_post',
            post=instance.post
        )
        send_notification_socket(notif)

@receiver(post_save, sender=ReelComment)
def notify_reel_comment(sender, instance, created, **kwargs):
    if created and instance.author != instance.reel.author:
        notif = Notification.objects.create(
            recipient=instance.reel.author,
            sender=instance.author,
            notification_type='comment_reel',
            reel=instance.reel
        )
        send_notification_socket(notif)

from django.db.models.signals import post_delete

@receiver(post_delete, sender=Notification)
def notify_notification_deleted(sender, instance, **kwargs):
    """Notify client to remove notification from UI if deleted from DB"""
    channel_layer = get_channel_layer()
    group_name = f"user_{instance.recipient.id}"
    
    async_to_sync(channel_layer.group_send)(
        group_name,
        {
            'type': 'notification_message',
            'data': {
                'id': instance.id,
                'action': 'deleted' # Client should handle this
            }
        }
    )
