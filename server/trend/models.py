# backend/api/models.py

from django.db import models
from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone
from datetime import timedelta
import uuid # Required for OTP ID field

# --- Utility Functions ---

def get_otp_expiry_time():
    """Returns the default expiry time for an OTP (5 minutes from now)."""
    return timezone.now() + timedelta(minutes=5)

def get_story_expiry_time():
    """Stories expire 24 hours after creation."""
    return timezone.now() + timedelta(hours=24)


# --- 1. User Account & Profile Models (UPDATED for Privacy) ---

class Profile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    bio = models.TextField(blank=True, null=True)
    profile_picture = models.ImageField(upload_to='profiles/', blank=True, null=True, default='profiles/default_avatar.png')
    website_url = models.URLField(blank=True, null=True)
    is_trendsetter = models.BooleanField(default=False)
    # NEW: Privacy Field for Private Accounts
    is_private = models.BooleanField(default=False) 
    
    # NEW: Online Status
    is_online = models.BooleanField(default=False)
    last_seen = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return self.user.username

@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        Profile.objects.create(user=instance)


# --- 2. Authentication & Security ---

class OTPRequest(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField()
    otp = models.CharField(max_length=6)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(default=get_otp_expiry_time)
    is_verified = models.BooleanField(default=False) 

    def __str__(self):
        return f"OTP for {self.email} - Expires at {self.expires_at}"

    def is_expired(self):
        return timezone.now() > self.expires_at


# --- 3. Social Graph Models (UPDATED for Follow Requests) ---

class FollowRequest(models.Model):
    """
    Stores pending follow requests for private accounts.
    """
    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_requests')
    receiver = models.ForeignKey(User, on_delete=models.CASCADE, related_name='received_requests')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('sender', 'receiver') 
        
    def __str__(self):
        return f"{self.sender.username} requested to follow {self.receiver.username}"

class Follow(models.Model):
    """
    Stores successful follow relationships.
    """
    follower = models.ForeignKey(User, related_name='following', on_delete=models.CASCADE)
    following = models.ForeignKey(User, related_name='followers', on_delete=models.CASCADE)

    class Meta:
        unique_together = ('follower', 'following')

    def __str__(self):
        return f"{self.follower.username} follows {self.following.username}"


# --- 4. Content & Post Models (No change) ---

class Post(models.Model):
    author = models.ForeignKey(User, on_delete=models.CASCADE, related_name='posts')
    content = models.TextField()
    media_file = models.FileField(upload_to='posts/', blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Post by {self.author.username} at {self.created_at.strftime('%Y-%m-%d')}"

class Hashtag(models.Model):
    name = models.CharField(max_length=100, unique=True)
    posts = models.ManyToManyField(Post, related_name='hashtags', blank=True)

    def __str__(self):
        return self.name

class Comment(models.Model):
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name='comments')
    author = models.ForeignKey(User, on_delete=models.CASCADE)
    text = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Comment by {self.author.username} on Post {self.post.id}"

class Like(models.Model):
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name='likes')
    user = models.ForeignKey(User, on_delete=models.CASCADE)

    class Meta:
        unique_together = ('post', 'user')

    def __str__(self):
        return f"{self.user.username} likes Post {self.post.id}"

class Twist(models.Model):
    original_post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name='twists')
    twist_author = models.ForeignKey(User, on_delete=models.CASCADE)
    content = models.TextField()
    media_file = models.FileField(upload_to='twists/', blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Twist by {self.twist_author.username} on {self.original_post.id}"


# --- 5. Story Models ---

class Story(models.Model):
    author = models.ForeignKey(User, on_delete=models.CASCADE, related_name='stories')
    media_file = models.FileField(upload_to='stories/', blank=False, null=False)
    caption = models.CharField(max_length=255, blank=True, null=True)
    # NEW: Advanced Story Features
    music_title = models.CharField(max_length=200, blank=True, null=True)
    music_file = models.FileField(upload_to='stories/music/', blank=True, null=True)
    editor_json = models.JSONField(blank=True, null=True)
    duration = models.IntegerField(default=15)
    is_draft = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(default=get_story_expiry_time)

    def __str__(self):
        return f"Story by {self.author.username} at {self.created_at.strftime('%H:%M')}"

    def is_active(self):
        return timezone.now() < self.expires_at

class StoryView(models.Model):
    story = models.ForeignKey(Story, on_delete=models.CASCADE, related_name='views')
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    viewed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('story', 'user')

    def __str__(self):
        return f"{self.user.username} viewed Story {self.story.id}"

class StoryLike(models.Model):
    story = models.ForeignKey(Story, on_delete=models.CASCADE, related_name='likes')
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('story', 'user')

    def __str__(self):
        return f"{self.user.username} likes Story {self.story.id}"


# --- 6. Live Chat Models (For Django Channels) ---

class ChatRoom(models.Model):
    """
    A room representing a direct message conversation between two users.
    """
    user1 = models.ForeignKey(User, on_delete=models.CASCADE, related_name='chat_rooms_as_user1')
    user2 = models.ForeignKey(User, on_delete=models.CASCADE, related_name='chat_rooms_as_user2')
    last_message_at = models.DateTimeField(auto_now_add=True) 
    
    class Meta:
        # Ensures that a room is unique regardless of user order
        unique_together = ('user1', 'user2') 

    def __str__(self):
        return f"Chat between {self.user1.username} and {self.user2.username}"

class ChatMessage(models.Model):
    """
    A single message within a chat room.
    """
    room = models.ForeignKey(ChatRoom, on_delete=models.CASCADE, related_name='messages')
    author = models.ForeignKey(User, on_delete=models.CASCADE)
    content = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)
    is_read = models.BooleanField(default=False)
    
    # Optional: Attach a reel to the message
    shared_reel = models.ForeignKey('Reel', on_delete=models.SET_NULL, null=True, blank=True, related_name='shared_in_chats')
    
    # Optional: Reply to a story
    story_reply = models.ForeignKey(Story, on_delete=models.SET_NULL, null=True, blank=True, related_name='replies')

    def __str__(self):
        return f"Message in {self.room.id} by {self.author.username}"


# --- 7. Reel Models (Instagram Reels Clone) ---

class Reel(models.Model):
    author = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reels')
    video_file = models.FileField(upload_to='reels/', blank=False, null=False)
    caption = models.TextField(blank=True, null=True)
    music_name = models.CharField(max_length=200, blank=True, null=True)
    music_file = models.FileField(upload_to='reels/music/', blank=True, null=True)
    editor_json = models.JSONField(blank=True, null=True)
    duration = models.IntegerField(default=15)
    is_draft = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    views_count = models.IntegerField(default=0)

    def __str__(self):
        return f"Reel by {self.author.username} - {self.id}"

class ReelLike(models.Model):
    reel = models.ForeignKey(Reel, on_delete=models.CASCADE, related_name='likes')
    user = models.ForeignKey(User, on_delete=models.CASCADE)

    class Meta:
        unique_together = ('reel', 'user')

    def __str__(self):
        return f"{self.user.username} likes Reel {self.reel.id}"

class ReelComment(models.Model):
    reel = models.ForeignKey(Reel, on_delete=models.CASCADE, related_name='comments')
    author = models.ForeignKey(User, on_delete=models.CASCADE)
    text = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Comment by {self.author.username} on Reel {self.reel.id}"

# --- 8. Notification Model ---

class Notification(models.Model):
    TYPES = [
        ('like_post', 'Like Post'),
        ('like_reel', 'Like Reel'),
        ('follow_request', 'Follow Request'),
        ('follow_accept', 'Follow Accept'),
        ('comment_post', 'Comment Post'),
        ('comment_reel', 'Comment Reel'),
        ('story_like', 'Story Like'),
    ]

    recipient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_notifications')
    notification_type = models.CharField(max_length=20, choices=TYPES)
    
    # Optional links to content
    post = models.ForeignKey(Post, on_delete=models.CASCADE, null=True, blank=True)
    reel = models.ForeignKey(Reel, on_delete=models.CASCADE, null=True, blank=True)
    story = models.ForeignKey(Story, on_delete=models.CASCADE, null=True, blank=True)
    
    # For Follow Requests specifically (so we can accept/reject from notification)
    follow_request_ref = models.ForeignKey(FollowRequest, on_delete=models.SET_NULL, null=True, blank=True)

    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.sender} -> {self.recipient}: {self.notification_type}"