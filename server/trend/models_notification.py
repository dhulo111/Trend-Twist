from django.db import models
from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone
from datetime import timedelta
from .models import Post, Reel, FollowRequest

class Notification(models.Model):
    TYPES = [
        ('like_post', 'Like Post'),
        ('like_reel', 'Like Reel'),
        ('follow_request', 'Follow Request'),
        ('follow_accept', 'Follow Accept'),
        ('comment_post', 'Comment Post'),
        ('comment_reel', 'Comment Reel'),
    ]

    recipient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_notifications')
    notification_type = models.CharField(max_length=20, choices=TYPES)
    
    # Optional links to content
    post = models.ForeignKey(Post, on_delete=models.CASCADE, null=True, blank=True)
    reel = models.ForeignKey(Reel, on_delete=models.CASCADE, null=True, blank=True)
    
    # For Follow Requests specifically (so we can accept/reject from notification)
    follow_request = models.ForeignKey(FollowRequest, on_delete=models.SET_NULL, null=True, blank=True)

    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.sender} -> {self.recipient}: {self.notification_type}"
