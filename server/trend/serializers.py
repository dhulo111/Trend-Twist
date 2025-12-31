# backend/api/serializers.py

from rest_framework import serializers
from django.contrib.auth.models import User
from .models import (
    Profile, Post, Comment, Like, Twist, Hashtag, Follow, OTPRequest, 
    # NEW MODELS
    FollowRequest, ChatRoom, ChatMessage, Story, StoryView,
    Reel, ReelLike, ReelComment 
)
from django.db.models import Q # Used for efficient chat room lookup

# --- 1. User & Profile Serializers (UPDATED for Privacy) ---

class ProfileSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username')
    email = serializers.EmailField(source='user.email')
    first_name = serializers.CharField(source='user.first_name', required=False, allow_blank=True)
    last_name = serializers.CharField(source='user.last_name', required=False, allow_blank=True)

    class Meta:
        model = Profile
        # Added is_private field, and User fields
        fields = ['username', 'email', 'first_name', 'last_name', 'bio', 'profile_picture', 'website_url', 'is_trendsetter', 'is_private']
        read_only_fields = ['is_trendsetter']

    def update(self, instance, validated_data):
        # Extract nested user data under 'user' key because of source='user.field'
        user_data = validated_data.pop('user', {})
        
        # Update User model fields
        user = instance.user
        if 'username' in user_data:
            user.username = user_data['username']
        if 'email' in user_data:
            user.email = user_data['email']
        if 'first_name' in user_data:
            user.first_name = user_data['first_name']
        if 'last_name' in user_data:
            user.last_name = user_data['last_name']
        user.save()

        # Update Profile model fields (remaining in validated_data)
        return super().update(instance, validated_data)

class UserSerializer(serializers.ModelSerializer):
    profile = ProfileSerializer(read_only=True)
    
    # NEW: Status fields for the ProfilePage context
    is_following = serializers.SerializerMethodField()
    has_pending_request = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'profile', 
                  'is_following', 'has_pending_request']

    def get_is_following(self, obj):
        # Checks if the requesting user is FOLLOWING the displayed user (obj)
        request = self.context.get('request')
        if request and request.user.is_authenticated and request.user.id != obj.id:
            return Follow.objects.filter(follower=request.user, following=obj).exists()
        return False
    
    def get_has_pending_request(self, obj):
        # Checks if the requesting user has a PENDING FollowRequest to the displayed user (obj)
        request = self.context.get('request')
        if request and request.user.is_authenticated and request.user.id != obj.id:
            # We check if request is sent from current user (sender) to displayed user (receiver)
            return FollowRequest.objects.filter(sender=request.user, receiver=obj).exists()
        return False
    
    posts_count = serializers.SerializerMethodField()
    followers_count = serializers.SerializerMethodField()
    following_count = serializers.SerializerMethodField()
    
    # ... (Meta class) ...
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'profile', 
                  'is_following', 'has_pending_request', 
                  'posts_count', 'followers_count', 'following_count']

    # ADDED: Methods to calculate counts
    def get_posts_count(self, obj):
        # Counts posts linked via related_name='posts'
        return obj.posts.count() 

    def get_followers_count(self, obj):
        # Counts followers linked via related_name='followers'
        return obj.followers.count()

    def get_following_count(self, obj):
        # Counts following linked via related_name='following'
        return obj.following.count()

# --- 2. Authentication & Security (No major change) ---

class OTPRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()

class OTPVerifySerializer(serializers.Serializer):
    id = serializers.UUIDField()
    otp = serializers.CharField(max_length=6, min_length=6)

class CompleteRegistrationSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    otp = serializers.CharField(max_length=6, min_length=6)
    username = serializers.CharField(max_length=150)
    first_name = serializers.CharField(max_length=150, allow_blank=True, required=False)
    last_name = serializers.CharField(max_length=150, allow_blank=True, required=False)

    def validate_username(self, value):
        if User.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError("This username is already taken.")
        return value

# --- 3. Social Graph Serializers (NEW: Follow Request) ---

class FollowRequestSerializer(serializers.ModelSerializer):
    sender_username = serializers.ReadOnlyField(source='sender.username')
    sender_profile_pic = serializers.ImageField(source='sender.profile.profile_picture', read_only=True)

    class Meta:
        model = FollowRequest
        fields = ['id', 'sender', 'sender_username', 'sender_profile_pic', 'receiver', 'created_at']
        read_only_fields = ['sender', 'receiver']

# --- 4. Content & Post Serializers (Minor update for context) ---

class CommentSerializer(serializers.ModelSerializer):
    author_username = serializers.ReadOnlyField(source='author.username')
    
    class Meta:
        model = Comment
        fields = ['id', 'author', 'author_username', 'post', 'text', 'created_at']
        read_only_fields = ['author', 'post']

class PostSerializer(serializers.ModelSerializer):
    author_username = serializers.ReadOnlyField(source='author.username')
    author_profile_picture = serializers.ImageField(source='author.profile.profile_picture', read_only=True)
    likes_count = serializers.SerializerMethodField()
    twists_count = serializers.SerializerMethodField()
    is_liked = serializers.SerializerMethodField()
    
    # NEW: To show comment count on the feed
    comments_count = serializers.ReadOnlyField(source='comments.count')

    class Meta:
        model = Post
        fields = [
            'id', 'author', 'author_username', 'author_profile_picture', 
            'content', 'media_file', 'created_at', 
            'likes_count', 'twists_count', 'is_liked', 'hashtags', 'comments_count'
        ]
        read_only_fields = ['author']

    def get_likes_count(self, obj):
        return obj.likes.count()

    def get_twists_count(self, obj):
        return obj.twists.count()

    def get_is_liked(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.likes.filter(user=request.user).exists()
        return False

# --- 5. Story Serializers (No change) ---

class StorySerializer(serializers.ModelSerializer):
    author_username = serializers.ReadOnlyField(source='author.username')
    author_profile_picture = serializers.ImageField(source='author.profile.profile_picture', read_only=True)
    is_viewed = serializers.SerializerMethodField()

    class Meta:
        model = Story
        fields = ['id', 'author', 'author_username', 'media_file', 'caption', 'created_at', 'is_viewed', 'author_profile_picture', 'music_title', 'music_file', 'editor_json', 'duration']
        read_only_fields = ['author']
        
    def get_is_viewed(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.views.filter(user=request.user).exists()
        return False

# --- 6. Live Chat Serializers (NEW) ---

class ChatMessageSerializer(serializers.ModelSerializer):
    author_username = serializers.ReadOnlyField(source='author.username')
    shared_reel_data = serializers.SerializerMethodField()
    
    class Meta:
        model = ChatMessage
        fields = ['id', 'room', 'author', 'author_username', 'content', 'timestamp', 'is_read', 'shared_reel', 'shared_reel_data']
        read_only_fields = ['author', 'room']

    def get_shared_reel_data(self, obj):
        if obj.shared_reel:
            return {
                'id': obj.shared_reel.id,
                'thumbnail': obj.shared_reel.video_file.url, # Or a specific thumbnail field if you had one, for now video URL can be used as src for video tag
                'author_username': obj.shared_reel.author.username,
                'caption': obj.shared_reel.caption[:30] + '...' if obj.shared_reel.caption else ''
            }
        return None

class ChatRoomSerializer(serializers.ModelSerializer):
    # Finds the 'other' user in the conversation
    other_user = serializers.SerializerMethodField()
    last_message = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()

    class Meta:
        model = ChatRoom
        fields = ['id', 'user1', 'user2', 'other_user', 'last_message', 'unread_count', 'last_message_at']
        read_only_fields = ['user1', 'user2']
        
    def get_other_user(self, obj):
        # Returns the user who is NOT the current requesting user
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            other_user = obj.user1 if obj.user2 == request.user else obj.user2
            # Use UserSerializer to return full user details (excluding sensitive data)
            return UserSerializer(other_user, context={'request': request}).data 
        return None

    def get_last_message(self, obj):
        # Gets the content and timestamp of the very last message
        last_msg = obj.messages.order_by('-timestamp').first()
        if last_msg:
            return ChatMessageSerializer(last_msg, context=self.context).data
        return None
        
    def get_unread_count(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            # Count messages in this room not authored by current user and not read
            return obj.messages.filter(~Q(author=request.user), is_read=False).count()
        return 0


# --- 7. Utility Serializers (No change) ---

class LikeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Like
        fields = ['id', 'user', 'post']

class TwistSerializer(serializers.ModelSerializer):
    twist_author_username = serializers.ReadOnlyField(source='twist_author.username')

    class Meta:
        model = Twist
        fields = ['id', 'original_post', 'twist_author', 'twist_author_username', 'content', 'media_file', 'created_at']
        read_only_fields = ['twist_author']
        
class HashtagSerializer(serializers.ModelSerializer):
    class Meta:
        model = Hashtag
        fields = ['id', 'name', 'posts']


class FollowerSerializer(serializers.ModelSerializer):
    # User who is following (the follower)
    follower_username = serializers.ReadOnlyField(source='follower.username')
    follower_profile_pic = serializers.ImageField(source='follower.profile.profile_picture', read_only=True) 

    class Meta:
        model = Follow
        # Removed 'created_at' as it does not exist in the Follow model
        fields = ['follower', 'follower_username', 'follower_profile_pic'] 


# --- Improved Following Serializer (FIXED) ---
class FollowingSerializer(serializers.ModelSerializer):
    # User who is being followed (the following)
    following_username = serializers.ReadOnlyField(source='following.username')
    following_profile_pic = serializers.ImageField(source='following.profile.profile_picture', read_only=True) 

    class Meta:
        model = Follow
        # Removed 'created_at' as it does not exist in the Follow model
        fields = ['following', 'following_username', 'following_profile_pic'] 

# --- 8. Reel Serializers ---

class ReelCommentSerializer(serializers.ModelSerializer):
    author_username = serializers.ReadOnlyField(source='author.username')
    author_profile_picture = serializers.ImageField(source='author.profile.profile_picture', read_only=True)
    
    class Meta:
        model = ReelComment
        fields = ['id', 'reel', 'author', 'author_username', 'author_profile_picture', 'text', 'created_at']
        read_only_fields = ['author', 'reel']

class ReelSerializer(serializers.ModelSerializer):
    author_username = serializers.ReadOnlyField(source='author.username')
    author_profile_picture = serializers.ImageField(source='author.profile.profile_picture', read_only=True)
    likes_count = serializers.SerializerMethodField()
    comments_count = serializers.SerializerMethodField()
    is_liked = serializers.SerializerMethodField()

    class Meta:
        model = Reel
        fields = ['id', 'author', 'author_username', 'author_profile_picture', 'video_file', 'caption', 'music_name', 'music_file', 'editor_json', 'duration', 'is_draft', 'created_at', 'views_count', 'likes_count', 'comments_count', 'is_liked']
        read_only_fields = ['author', 'views_count']

    def get_likes_count(self, obj):
        return obj.likes.count()

    def get_comments_count(self, obj):
        return obj.comments.count()

    def get_is_liked(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.likes.filter(user=request.user).exists()
        return False 

# --- 9. Notification Serializer ---
from .models import Notification

class NotificationSerializer(serializers.ModelSerializer):
    sender_username = serializers.ReadOnlyField(source='sender.username')
    sender_profile_picture = serializers.ImageField(source='sender.profile.profile_picture', read_only=True)
    post_image = serializers.FileField(source='post.media_file', read_only=True)
    reel_thumbnail = serializers.FileField(source='reel.video_file', read_only=True) # Or generate thumbnail logic
    
    class Meta:
        model = Notification
        fields = ['id', 'recipient', 'sender', 'sender_username', 'sender_profile_picture', 
                  'notification_type', 'post', 'reel', 'follow_request_ref', 
                  'post_image', 'reel_thumbnail', 'is_read', 'created_at']
        read_only_fields = ['recipient', 'sender', 'created_at'] 
