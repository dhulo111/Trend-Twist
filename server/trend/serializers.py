# backend/api/serializers.py

from rest_framework import serializers
from django.contrib.auth.models import User
from .models import (
    Profile, Post, Comment, Like, Twist, Hashtag, Follow, OTPRequest, TwistLike, TwistComment, 
    # NEW MODELS
    FollowRequest, ChatRoom, ChatMessage, Story, StoryView,
    Reel, ReelLike, ReelComment, ChatGroup # NEW MODEL
)
from django.db.models import Q # Used for efficient chat room lookup
from django.utils import timezone
from .models import UserSubscription, SubscriptionPlan

def has_subscription_access(user, creator, required_tier=None):
    if user == creator or user.is_staff:
        return True
    
    sub = UserSubscription.objects.filter(subscriber=user, creator=creator, status='active').first()
    if not sub:
        return False
        
    if sub.expiry_date and sub.expiry_date < timezone.now():
        return False
        
    if required_tier:
        tiers = ['basic', 'pro', 'elite']
        try:
            user_tier_idx = tiers.index(sub.tier)
            req_tier_idx = tiers.index(required_tier)
            return user_tier_idx >= req_tier_idx
        except ValueError:
            return False
            
    return True

# --- Subscriptions Serializers ---
class SubscriptionPlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = SubscriptionPlan
        fields = '__all__'

class UserSubscriptionSerializer(serializers.ModelSerializer):
    plan_details = SubscriptionPlanSerializer(source='plan', read_only=True)
    creator_username = serializers.ReadOnlyField(source='creator.username')
    creator_profile_picture = serializers.ImageField(source='creator.profile.profile_picture', read_only=True)

    class Meta:
        model = UserSubscription
        fields = '__all__'
        read_only_fields = ['subscriber', 'start_date']

# --- 1. User & Profile Serializers (UPDATED for Privacy) ---

class ProfileSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username')
    email = serializers.EmailField(source='user.email')
    first_name = serializers.CharField(source='user.first_name', required=False, allow_blank=True)
    last_name = serializers.CharField(source='user.last_name', required=False, allow_blank=True)

    class Meta:
        model = Profile
        # Added is_private and is_creator fields, and User fields
        # Added is_private, is_creator, and withdrawal_info
        fields = ['username', 'email', 'first_name', 'last_name', 'bio', 'profile_picture', 'website_url', 'is_trendsetter', 'is_private', 'is_creator', 'gender', 'withdrawal_info']
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
    is_following = serializers.SerializerMethodField()
    has_pending_request = serializers.SerializerMethodField()
    is_subscribed = serializers.SerializerMethodField()
    has_active_plans = serializers.SerializerMethodField() # NEW
    posts_count = serializers.SerializerMethodField()
    followers_count = serializers.SerializerMethodField()
    following_count = serializers.SerializerMethodField()
    subscribers_count = serializers.SerializerMethodField()
    is_creator = serializers.SerializerMethodField()
    creator_balance = serializers.SerializerMethodField()
    creator_pending_withdrawals = serializers.SerializerMethodField()

    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'profile', 
                  'is_following', 'has_pending_request', 'is_subscribed', 'has_active_plans',
                  'posts_count', 'followers_count', 'following_count', 'subscribers_count', 'is_creator', 'creator_balance', 'creator_pending_withdrawals']

    def get_is_creator(self, obj):
        try:
            return obj.profile.is_creator
        except:
            return False

    def get_creator_balance(self, obj):
        try:
            if not obj.profile.is_creator: return 0
        except: return 0
        from django.db.models import Sum
        from .models import CreatorEarning, WithdrawalRequest
        total_earned = CreatorEarning.objects.filter(creator=obj).aggregate(total=Sum('creator_amount'))['total'] or 0
        total_processed = WithdrawalRequest.objects.filter(creator=obj, status__in=['pending', 'completed']).aggregate(total=Sum('amount'))['total'] or 0
        return float(total_earned - total_processed)

    def get_creator_pending_withdrawals(self, obj):
        try:
            if not obj.profile.is_creator: return 0
        except: return 0
        from django.db.models import Sum
        from .models import WithdrawalRequest
        return float(WithdrawalRequest.objects.filter(creator=obj, status='pending').aggregate(total=Sum('amount'))['total'] or 0)

    def get_has_active_plans(self, obj):
        # Only return True if the user is a creator AND global plans are active
        try:
            if not obj.profile.is_creator:
                return False
        except:
            return False
        return SubscriptionPlan.objects.filter(is_active=True).exists()

    def get_is_subscribed(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated and request.user.id != obj.id:
            return has_subscription_access(request.user, obj)
        return False

    def get_is_following(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated and request.user.id != obj.id:
            return Follow.objects.filter(follower=request.user, following=obj).exists()
        return False
    
    def get_has_pending_request(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated and request.user.id != obj.id:
            return FollowRequest.objects.filter(sender=request.user, receiver=obj).exists()
        return False

    def get_posts_count(self, obj):
        return obj.posts.count() 

    def get_followers_count(self, obj):
        return obj.followers.count()

    def get_following_count(self, obj):
        return obj.following.count()

    def get_subscribers_count(self, obj):
        # We only count active subscriptions
        return obj.subscribers.filter(status='active').count()

class LoginSerializer(serializers.Serializer):
    username_or_email = serializers.CharField()
    password = serializers.CharField(write_only=True)

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    phone_number = serializers.CharField(required=False, allow_blank=True)
    gender = serializers.ChoiceField(
        choices=[('male', 'Male'), ('female', 'Female'), ('other', 'Other'), ('prefer_not_to_say', 'Prefer not to say')],
        required=False, allow_blank=True
    )
    otp = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'first_name', 'last_name', 'phone_number', 'gender', 'otp']

    def validate(self, data):
        email = data.get('email')
        otp = data.get('otp')
        
        # Add OTP validation
        if not otp:
            raise serializers.ValidationError({"otp": "OTP is required."})
            
        try:
             otp_req = OTPRequest.objects.filter(email=email).latest('created_at')
        except OTPRequest.DoesNotExist:
             raise serializers.ValidationError({"otp": "No OTP requested for this email."})
             
        if otp_req.otp != otp:
             raise serializers.ValidationError({"otp": "Invalid OTP."})
             
        if otp_req.is_expired():
             raise serializers.ValidationError({"otp": "OTP has expired."})
             
        # Mark as verified or just let it be deleted/ignored
        otp_req.is_verified = True
        otp_req.save()
        
        return data

    def validate_username(self, value):
        if User.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError("This username is already taken.")
        return value

    def validate_password(self, value):
        import re
        if len(value) < 8:
            raise serializers.ValidationError("Password must be at least 8 characters long.")
        if not re.search(r'[A-Z]', value):
            raise serializers.ValidationError("Password must contain at least one uppercase letter.")
        if not re.search(r'[a-z]', value):
            raise serializers.ValidationError("Password must contain at least one lowercase letter.")
        if not re.search(r'[0-9]', value):
            raise serializers.ValidationError("Password must contain at least one number.")
        if not re.search(r'[^A-Za-z0-9]', value):
            raise serializers.ValidationError("Password must contain at least one special character.")
        return value

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("This email is already in use.")
        return value

    def create(self, validated_data):
        phone_number = validated_data.pop('phone_number', '')
        gender = validated_data.pop('gender', '')
        otp = validated_data.pop('otp', '') # Remove OTP before creating User
        # Use create_user to handle password hashing
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', '')
        )
        # Phone number and gender are stored in Profile
        profile = user.profile
        profile.phone_number = phone_number
        if gender:
            profile.gender = gender
        profile.save()
        return user

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
    comments_count = serializers.SerializerMethodField()
    is_saved = serializers.SerializerMethodField()
    has_access = serializers.SerializerMethodField()
    is_following = serializers.SerializerMethodField()

    class Meta:
        model = Post
        fields = [
            'id', 'author', 'author_username', 'author_profile_picture', 
            'content', 'media_file', 'created_at', 
            'likes_count', 'is_liked', 'is_saved', 'hashtags', 'comments_count', 'twists_count',
            'is_exclusive', 'required_tier', 'has_access', 'is_following'
        ]
        read_only_fields = ['author']

    def get_is_following(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            if request.user == obj.author:
                return False
            return Follow.objects.filter(follower=request.user, following=obj.author).exists()
        return False

    def get_has_access(self, obj):
        if not obj.is_exclusive:
            return True
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        return has_subscription_access(request.user, obj.author, obj.required_tier)

    def to_representation(self, instance):
        repr_data = super().to_representation(instance)
        # Obscure content if no access
        if not repr_data.get('has_access', True):
            repr_data['content'] = "*** Subscribe to unlock this premium content ***"
            repr_data['media_file'] = None
        return repr_data

    def get_is_saved(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.saved_records.filter(user=request.user).exists()
        return False

    def get_likes_count(self, obj):
        return obj.likes.count()

    def get_twists_count(self, obj):
        return obj.twists.count()

    def get_comments_count(self, obj):
        return obj.comments.count()

    is_liked = serializers.SerializerMethodField()

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
    likes_count = serializers.SerializerMethodField()
    is_liked = serializers.SerializerMethodField()

    class Meta:
        model = Story
        fields = ['id', 'author', 'author_username', 'media_file', 'media_type', 'caption', 'created_at', 'is_viewed', 'author_profile_picture', 'music_title', 'music_file', 'editor_json', 'duration', 'likes_count', 'is_liked', 'is_exclusive', 'required_tier']
        read_only_fields = ['author']
        
    def get_is_viewed(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.views.filter(user=request.user).exists()
        return False

    def get_likes_count(self, obj):
        return obj.likes.count()

    def get_is_liked(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.likes.filter(user=request.user).exists()
        return False

# --- 6. Live Chat Serializers (NEW) ---

class ChatMessageSerializer(serializers.ModelSerializer):
    author_username = serializers.ReadOnlyField(source='author.username')
    shared_reel_data = serializers.SerializerMethodField()
    shared_post_data = serializers.SerializerMethodField()
    shared_twist_data = serializers.SerializerMethodField()
    story_reply_data = serializers.SerializerMethodField()
    
    class Meta:
        model = ChatMessage
        fields = [
            'id', 'room', 'group', 'author', 'author_username', 'content', 'timestamp', 
            'is_read', 'shared_reel', 'shared_reel_data', 'shared_post', 'shared_post_data', 
            'shared_twist', 'shared_twist_data', 'story_reply', 'story_reply_data'
        ]
        read_only_fields = ['author', 'room', 'group']

    def get_story_reply_data(self, obj):
        if obj.story_reply:
            return {
                'id': obj.story_reply.id,
                'media_file': obj.story_reply.media_file.url if obj.story_reply.media_file else None,
                'media_type': getattr(obj.story_reply, 'media_type', 'image'),
                'author_username': obj.story_reply.author.username
            }
        return None

    def get_shared_reel_data(self, obj):
        if obj.shared_reel:
            return {
                'id': obj.shared_reel.id,
                'thumbnail': obj.shared_reel.media_file.url, # Or a specific thumbnail field if you had one, for now video URL can be used as src for video tag
                'author_username': obj.shared_reel.author.username,
                'caption': obj.shared_reel.caption[:30] + '...' if obj.shared_reel.caption else ''
            }
        return None

    def get_shared_post_data(self, obj):
        if obj.shared_post:
            return {
                'id': obj.shared_post.id,
                'thumbnail': obj.shared_post.media_file.url if obj.shared_post.media_file else None,
                'author_username': obj.shared_post.author.username,
                'content': obj.shared_post.content[:30] + '...' if obj.shared_post.content else ''
            }
        return None

    def get_shared_twist_data(self, obj):
        if obj.shared_twist:
            return {
                'id': obj.shared_twist.id,
                'thumbnail': obj.shared_twist.media_file.url if obj.shared_twist.media_file else None,
                'author_username': obj.shared_twist.author.username,
                'content': obj.shared_twist.content[:30] + '...' if obj.shared_twist.content else ''
            }
        return None

class ChatGroupSerializer(serializers.ModelSerializer):
    last_message = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()
    members_count = serializers.IntegerField(source='members.count', read_only=True)
    
    members_list = serializers.SerializerMethodField()
    admin_details = serializers.SerializerMethodField()
    
    class Meta:
        model = ChatGroup
        fields = ['id', 'name', 'icon', 'admin', 'admin_details', 'members', 'members_list', 'created_at', 'last_message', 'unread_count', 'members_count', 'last_message_at']
        read_only_fields = ['admin', 'created_at']

    def get_members_list(self, obj):
        return UserSerializer(obj.members.all(), many=True, context=self.context).data

    def get_admin_details(self, obj):
        return UserSerializer(obj.admin, context=self.context).data

    def get_last_message(self, obj):
        last_msg = obj.messages.order_by('-timestamp').first()
        if last_msg:
            return ChatMessageSerializer(last_msg, context=self.context).data
        return None

    def get_unread_count(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.messages.filter(~Q(author=request.user), is_read=False).count()
        return 0

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

class TwistCommentSerializer(serializers.ModelSerializer):
    author_username = serializers.ReadOnlyField(source='author.username')
    author_profile_picture = serializers.ImageField(source='author.profile.profile_picture', read_only=True)
    
    class Meta:
        model = TwistComment
        fields = ['id', 'author', 'author_username', 'author_profile_picture', 'twist', 'text', 'created_at']
        read_only_fields = ['author', 'twist']

class TwistSerializer(serializers.ModelSerializer):
    author_username = serializers.ReadOnlyField(source='author.username')
    author_profile_picture = serializers.ImageField(source='author.profile.profile_picture', read_only=True)
    likes_count = serializers.SerializerMethodField()
    comments_count = serializers.SerializerMethodField()
    retwists_count = serializers.SerializerMethodField()
    is_liked = serializers.SerializerMethodField()
    is_saved = serializers.SerializerMethodField()
    has_access = serializers.SerializerMethodField()

    original_post_data = serializers.SerializerMethodField()

    class Meta:
        model = Twist
        fields = [
            'id', 'author', 'author_username', 'author_profile_picture', 'content', 'media_file', 
            'created_at', 'likes_count', 'comments_count', 'retwists_count', 'is_liked', 'is_saved', 
            'original_twist', 'original_post', 'original_post_data',
            'is_exclusive', 'required_tier', 'has_access'
        ]
        read_only_fields = ['author']

    def get_has_access(self, obj):
        if not obj.is_exclusive:
            return True
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        return has_subscription_access(request.user, obj.author, obj.required_tier)

    def to_representation(self, instance):
        repr_data = super().to_representation(instance)
        if not repr_data.get('has_access', True):
            repr_data['content'] = "*** Subscribe to unlock this premium Twist ***"
            repr_data['media_file'] = None
        return repr_data

    def get_is_saved(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.saved_records.filter(user=request.user).exists()
        return False

    def get_original_post_data(self, obj):
        if obj.original_post:
            return PostSerializer(obj.original_post, context=self.context).data
        return None

    def get_likes_count(self, obj):
        return obj.likes.count()

    def get_comments_count(self, obj):
        return obj.comments.count()
        
    def get_retwists_count(self, obj):
        return obj.retwists.count()

    def get_is_liked(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.likes.filter(user=request.user).exists()
        return False
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
    is_saved = serializers.SerializerMethodField()
    is_following = serializers.SerializerMethodField()
    has_access = serializers.SerializerMethodField()

    class Meta:
        model = Reel
        fields = [
            'id', 'author', 'author_username', 'author_profile_picture', 'media_file', 'media_type', 'caption', 
            'music_name', 'music_file', 'editor_json', 'duration', 'is_draft', 'created_at', 
            'views_count', 'likes_count', 'comments_count', 'is_liked', 'is_saved', 'is_following',
            'is_exclusive', 'required_tier', 'has_access'
        ]
        read_only_fields = ['author', 'views_count']

    def get_has_access(self, obj):
        if not obj.is_exclusive:
            return True
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        return has_subscription_access(request.user, obj.author, obj.required_tier)

    def to_representation(self, instance):
        repr_data = super().to_representation(instance)
        if not repr_data.get('has_access', True):
            repr_data['caption'] = "*** Subscribe to unlock this premium Reel ***"
            repr_data['media_file'] = None
            repr_data['music_file'] = None
        return repr_data

    def get_is_saved(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.saved_records.filter(user=request.user).exists()
        return False

    def get_likes_count(self, obj):
        return obj.likes.count()

    def get_comments_count(self, obj):
        return obj.comments.count()

    def get_is_liked(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.likes.filter(user=request.user).exists()
        return False 

    def get_is_following(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            if request.user == obj.author:
                return False
            # Follow is imported at the top of serializers.py
            return Follow.objects.filter(follower=request.user, following=obj.author).exists()
        return False

# --- 9. Notification Serializer ---
from .models import Notification

class NotificationSerializer(serializers.ModelSerializer):
    sender_username = serializers.ReadOnlyField(source='sender.username')
    sender_profile_picture = serializers.ImageField(source='sender.profile.profile_picture', read_only=True)
    post_image = serializers.FileField(source='post.media_file', read_only=True)
    reel_thumbnail = serializers.FileField(source='reel.media_file', read_only=True) # Or generate thumbnail logic
    
    class Meta:
        model = Notification
        fields = ['id', 'recipient', 'sender', 'sender_username', 'sender_profile_picture', 
                  'notification_type', 'post', 'reel', 'follow_request_ref', 
                  'post_image', 'reel_thumbnail', 'is_read', 'created_at']
        read_only_fields = ['recipient', 'sender', 'created_at'] 

# --- 10. Report Serializer ---
from .models import Report, SavedItem

class ReportSerializer(serializers.ModelSerializer):
    reporter_username = serializers.ReadOnlyField(source='reporter.username')
    reporter_profile_picture = serializers.ImageField(source='reporter.profile.profile_picture', read_only=True)
    reported_username = serializers.ReadOnlyField(source='reported_user.username')
    reported_profile_picture = serializers.ImageField(source='reported_user.profile.profile_picture', read_only=True)

    class Meta:
        model = Report
        fields = ['id', 'reporter', 'reporter_username', 'reporter_profile_picture',
                  'reported_user', 'reported_username', 'reported_profile_picture',
                  'post', 'reel', 'twist', 'reason', 'status', 'created_at']
        read_only_fields = ['reporter', 'status']

# --- 11. Saved Item Serializer ---

class SavedItemSerializer(serializers.ModelSerializer):
    post_details = PostSerializer(source='post', read_only=True)
    reel_details = ReelSerializer(source='reel', read_only=True)
    twist_details = TwistSerializer(source='twist', read_only=True)

    class Meta:
        model = SavedItem
        fields = ['id', 'user', 'post', 'reel', 'twist', 'post_details', 'reel_details', 'twist_details', 'created_at']
        read_only_fields = ['user']

# --- 12. Withdrawal Serializers ---
from .models import WithdrawalRequest

class WithdrawalRequestSerializer(serializers.ModelSerializer):
    creator_username = serializers.ReadOnlyField(source='creator.username')

    class Meta:
        model = WithdrawalRequest
        fields = '__all__'
        read_only_fields = ['creator', 'status', 'processed_at', 'admin_note']

class AdminWithdrawalActionSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=['completed', 'rejected'])
    admin_note = serializers.CharField(required=False, allow_blank=True)

