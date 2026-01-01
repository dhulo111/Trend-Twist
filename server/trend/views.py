# backend/api/views.py (COMPLETE FINAL VERSION - CLEANED AND MERGED)

import os
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from django.contrib.auth.models import User
from django.db.models import Count, Q 
from django.utils import timezone
from django.core.mail import send_mail
from django.conf import settings
import random

from rest_framework import generics, permissions, status, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import AllowAny, IsAuthenticated

# Import JWT tokens
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenRefreshView 

# Import all models
from .models import (
    Profile, Post, Comment, Like, Twist, Hashtag, Follow, OTPRequest,
    Story, StoryView, FollowRequest, ChatRoom, ChatMessage,
    Story, StoryView, FollowRequest, ChatRoom, ChatMessage,
    Reel, ReelLike, ReelComment, StoryLike 
)
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
# Import all serializers
from .serializers import (
    UserSerializer, ProfileSerializer, PostSerializer, CommentSerializer, TwistSerializer,
    FollowerSerializer, FollowingSerializer, HashtagSerializer,
    OTPRequestSerializer, OTPVerifySerializer, CompleteRegistrationSerializer,
    StorySerializer, FollowRequestSerializer, ChatRoomSerializer, ChatMessageSerializer,
    ReelSerializer, ReelCommentSerializer
)
from channels.db import database_sync_to_async
# --- Permissions ---

class IsOwnerOrReadOnly(permissions.BasePermission):
    """Custom permission to only allow owners of an object to edit it."""
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        if hasattr(obj, 'author'):
            return obj.author == request.user
        if hasattr(obj, 'user'):
            return obj.user == request.user
        return False


# ----------------------------------------------------------------------
#                             AUTHENTICATION
# ----------------------------------------------------------------------


class GoogleLoginView(APIView):
    """Handles Google ID token verification and user login/creation."""
    permission_classes = [AllowAny]

    def post(self, request):
        google_token = request.data.get('token')
        if not google_token:
            return Response({"error": "Google token is required."}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            client_id = os.environ.get('GOOGLE_CLIENT_ID')
            if not client_id or client_id == 'your-google-client-id':
                 return Response({"error": "Server configuration error: GOOGLE_CLIENT_ID is not set."}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

            # 1. Verification
            idinfo = id_token.verify_oauth2_token(
                google_token,
                google_requests.Request(),
                client_id
            )
            
            email = idinfo['email']
            first_name = idinfo.get('given_name', '')
            last_name = idinfo.get('family_name', '')

            # 2. Database Action (Standard Sync)
            user, created = User.objects.get_or_create(
                email=email,
                defaults={
                    'username': email, 
                    'first_name': first_name, 
                    'last_name': last_name
                }
            )
            
            # 3. Generate Tokens
            refresh = RefreshToken.for_user(user)
            user_serializer = UserSerializer(user, context={'request': request})
            
            return Response({
                'refresh': str(refresh),
                'access': str(refresh.access_token),
                'user': user_serializer.data
            }, status=status.HTTP_200_OK)

        except ValueError as e:
            # Invalid token
            return Response({"error": f"Invalid Google token: {str(e)}"}, status=status.HTTP_401_UNAUTHORIZED)
        except Exception as e:
            # Catch-all
            return Response({"error": f"Authentication failed: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class RequestLoginOTPView(APIView):
    """Sends an OTP *only* if the user already exists (Login Flow)."""
    permission_classes = [AllowAny]
    def post(self, request):
        serializer = OTPRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        email = serializer.validated_data['email']
        try:
            User.objects.get(email=email)
        except User.DoesNotExist:
            return Response({"error": "Account not found. Please register first."}, status=status.HTTP_404_NOT_FOUND)
        
        # Validate Email Settings before creating DB record
        if not settings.EMAIL_HOST_USER or not settings.EMAIL_HOST_PASSWORD:
            print("CRITICAL: EMAIL_HOST_USER or EMAIL_HOST_PASSWORD is NOT set.")
            return Response({"error": "Server Email Misconfiguration: EMAIL_HOST_USER/PASSWORD missing."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        try:
            old_otp = OTPRequest.objects.filter(email=email, is_verified=False)
            old_otp.delete() # Cleanup old requests
            
            otp_code = str(random.randint(100000, 999999))
            otp_request = OTPRequest.objects.create(email=email, otp=otp_code)
        except Exception as e:
            print(f"Error creating OTP record: {e}")
            return Response({"error": f"Database error: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        try:
            print(f"Attempting to send OTP to {email} using {settings.EMAIL_HOST_USER}...")
            send_mail(
                subject='Your TrendTwist Login OTP', 
                message=f'Your One-Time Password is: {otp_code}', 
                from_email=settings.DEFAULT_FROM_EMAIL, 
                recipient_list=[email],
                fail_silently=False
            )
            print("Email sent successfully.")
        except Exception as e:
            print(f"SMTP Error: {e}") 
            # Delete the OTP request since it wasn't sent
            otp_request.delete()
            return Response({"error": f"Failed to send email. Error: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        return Response({"id": otp_request.id}, status=status.HTTP_201_CREATED)

class VerifyLoginOTPView(APIView):
    """Verifies the OTP and returns JWT tokens for an *existing* user."""
    permission_classes = [AllowAny]
    def post(self, request):
        serializer = OTPVerifySerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        request_id = serializer.validated_data['id']
        otp_code = serializer.validated_data['otp']

        try:
            otp_request = OTPRequest.objects.get(id=request_id)
        except OTPRequest.DoesNotExist:
            return Response({"error": "Invalid request."}, status=status.HTTP_404_NOT_FOUND)

        if otp_request.is_verified or otp_request.is_expired() or otp_request.otp != otp_code:
            return Response({"error": "Invalid or expired OTP."}, status=status.HTTP_400_BAD_REQUEST)

        otp_request.is_verified = True
        otp_request.save()
        user = User.objects.get(email=otp_request.email)

        refresh = RefreshToken.for_user(user)
        user_serializer = UserSerializer(user, context={'request': request})
        return Response({
            'refresh': str(refresh), 'access': str(refresh.access_token), 'user': user_serializer.data
        }, status=status.HTTP_200_OK)

class RequestRegisterOTPView(APIView):
    """Sends an OTP *only* if the email is NOT already in use (Registration Flow)."""
    permission_classes = [AllowAny]
    def post(self, request):
        serializer = OTPRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        email = serializer.validated_data['email']
        if User.objects.filter(email=email).exists():
            return Response({"error": "This email is already in use. Please log in."}, status=status.HTTP_400_BAD_REQUEST)
        
        if not settings.EMAIL_HOST_USER or not settings.EMAIL_HOST_PASSWORD:
             print("CRITICAL: EMAIL_HOST_USER or EMAIL_HOST_PASSWORD is NOT set.")
             return Response({"error": "Server Email Misconfiguration: EMAIL_HOST_USER/PASSWORD missing."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        try:
            # Clean up old unverified requests
            OTPRequest.objects.filter(email=email, is_verified=False).delete()
            
            otp_code = str(random.randint(100000, 999999))
            otp_request = OTPRequest.objects.create(email=email, otp=otp_code)
        except Exception as e:
            print(f"Error creating OTP record: {e}")
            return Response({"error": f"Database error: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        try:
            print(f"Attempting to send OTP to {email}...")
            send_mail(
                subject='Verify Your Email for TrendTwist', 
                message=f'Your email verification code is: {otp_code}', 
                from_email=settings.DEFAULT_FROM_EMAIL, 
                recipient_list=[email],
                fail_silently=False
            )
        except Exception as e:
            print(f"SMTP Error: {e}") # Debug print
            otp_request.delete()
            return Response({"error": f"SMTP Error: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        return Response({"id": otp_request.id}, status=status.HTTP_201_CREATED)

class VerifyOnlyOTPView(APIView):
    """Verifies the OTP for registration without logging in (Step 2 check)."""
    permission_classes = [AllowAny]
    def post(self, request):
        serializer = OTPVerifySerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        request_id = serializer.validated_data['id']
        otp_code = serializer.validated_data['otp']

        try:
            otp_request = OTPRequest.objects.get(id=request_id)
        except OTPRequest.DoesNotExist:
            return Response({"error": "Invalid request ID."}, status=status.HTTP_404_NOT_FOUND)

        if otp_request.is_verified:
            return Response({"error": "This OTP has already been verified."}, status=status.HTTP_400_BAD_REQUEST)
        
        if otp_request.is_expired():
            return Response({"error": "This OTP has expired. Please resend the code."}, status=status.HTTP_400_BAD_REQUEST)
        
        if otp_request.otp != otp_code:
            return Response({"error": "Invalid OTP code."}, status=status.HTTP_400_BAD_REQUEST)

        # OTP is VALID: Mark it as verified so it cannot be used again
        otp_request.is_verified = True
        otp_request.save()

        return Response({"status": "OTP verified"}, status=status.HTTP_200_OK)

class CompleteRegistrationView(APIView):
    """Verifies OTP request status and creates the new user."""
    permission_classes = [AllowAny]
    def post(self, request):
        serializer = CompleteRegistrationSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        data = serializer.validated_data
        request_id = data['id']
        username = data['username']

        # 1. Check if a VERIFIED OTP request exists for this ID
        try:
            otp_request = OTPRequest.objects.get(id=request_id, is_verified=True)
        except OTPRequest.DoesNotExist:
            return Response({"error": "Email verification required or OTP expired."}, status=status.HTTP_400_BAD_REQUEST)
        
        # 2. Check if username is taken
        if User.objects.filter(username=username).exists():
            return Response({"error": "This username is already taken."}, status=status.HTTP_400_BAD_REQUEST)
        
        # 3. Create user and delete OTP request
        otp_request.delete() # Consume the request

        user = User.objects.create_user(
            username=username,
            email=otp_request.email,
            first_name=data.get('first_name', ''),
            last_name=data.get('last_name', '')
        )

        # 4. Log the new user in (Generate JWT tokens)
        refresh = RefreshToken.for_user(user)
        user_serializer = UserSerializer(user, context={'request': request})
        return Response({
            'refresh': str(refresh), 'access': str(refresh.access_token), 'user': user_serializer.data
        }, status=status.HTTP_201_CREATED)


# ----------------------------------------------------------------------
#                               USER & SEARCH
# ----------------------------------------------------------------------

class CurrentUserProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]
    def get_object(self): return self.request.user
    def get_serializer_context(self): return {'request': self.request} 

class ProfileUpdateView(generics.UpdateAPIView):
    """PATCH /api/profile/update/ - Updates Profile model (bio, picture, is_private)."""
    queryset = Profile.objects.all()
    serializer_class = ProfileSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]
    def get_object(self): return self.request.user.profile
    def get_serializer_context(self): return {'request': self.request}

class UserProfileDetailView(generics.RetrieveAPIView):
    """Retrieves a user profile, respecting privacy settings."""
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [AllowAny]
    lookup_field = 'username'
    def get_serializer_context(self): return {'request': self.request}

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        is_private = instance.profile.is_private
        is_following = Follow.objects.filter(follower=request.user, following=instance).exists()
        is_owner = request.user == instance

        # Check privacy condition
        if is_private and not is_following and not is_owner and request.user.is_authenticated:
            basic_data = {
                'id': instance.id,
                'username': instance.username,
                'profile': {'is_private': True, 'profile_picture': instance.profile.profile_picture.url if instance.profile.profile_picture else None},
                'has_pending_request': FollowRequest.objects.filter(sender=request.user, receiver=instance).exists()
            }
            return Response(basic_data, status=status.HTTP_200_OK)

        serializer = self.get_serializer(instance)
        return Response(serializer.data)


class UserSearchView(generics.ListAPIView):
    """GET /api/users/search/?q=<query> - Searches users by username or name."""
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        query = self.request.query_params.get('q', None)
        if query:
            return User.objects.filter(
                Q(username__icontains=query) |
                Q(first_name__icontains=query) |
                Q(last_name__icontains=query)
            ).exclude(id=self.request.user.id).order_by('username')
        return User.objects.none()
        
    def get_serializer_context(self): return {'request': self.request}

class UserPostListView(generics.ListAPIView):
    """
    GET /api/users/<user_id>/posts/
    Retrieves a list of all posts made by a specific user.
    Note: Privacy checks are handled by the calling function (ProfilePage.jsx).
    """
    serializer_class = PostSerializer
    permission_classes = [AllowAny] # Permissions are handled by the PostSerializer/ProfilePage logic
    
    def get_queryset(self):
        user_id = self.kwargs['user_id']
        
        # We fetch all posts made by the specified user
        return Post.objects.filter(author_id=user_id).order_by('-created_at')

    def get_serializer_context(self):
        return {'request': self.request}


# ----------------------------------------------------------------------
#                       FOLLOW & FOLLOW REQUESTS
# ----------------------------------------------------------------------

class FollowToggleView(APIView):
    """Handles follow, unfollow, and sends follow request for private accounts."""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            user_to_follow = User.objects.get(pk=pk)
        except User.DoesNotExist: return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)
        if user_to_follow == request.user: return Response({"error": "You cannot follow yourself"}, status=status.HTTP_400_BAD_REQUEST)

        # 1. Check if already following (if so, unfollow)
        follow_obj = Follow.objects.filter(follower=request.user, following=user_to_follow).first()
        if follow_obj:
            follow_obj.delete()
            return Response({"status": "unfollowed"}, status=status.HTTP_200_OK)

        is_private = user_to_follow.profile.is_private
        pending_request = FollowRequest.objects.filter(sender=request.user, receiver=user_to_follow).first()

        if pending_request:
            # Request already pending, delete it (cancel request)
            
            # NEW: Also remove the associated notification so it doesn't stay in the receiver's list
            Notification.objects.filter(follow_request_ref=pending_request).delete()
            
            pending_request.delete()
            return Response({"status": "request_cancelled"}, status=status.HTTP_200_OK)

        if is_private:
            # Private: Send request
            FollowRequest.objects.create(sender=request.user, receiver=user_to_follow)
            return Response({"status": "request_sent"}, status=status.HTTP_201_CREATED)
        else:
            # Public: Instant follow
            Follow.objects.create(follower=request.user, following=user_to_follow)
            return Response({"status": "followed"}, status=status.HTTP_201_CREATED)


class FollowRequestListView(generics.ListAPIView):
    """GET /api/requests/ - Lists all pending follow requests for the current user."""
    serializer_class = FollowRequestSerializer
    permission_classes = [IsAuthenticated]
    def get_queryset(self):
        return FollowRequest.objects.filter(receiver=self.request.user).order_by('-created_at')


class FollowRequestActionView(APIView):
    """POST /api/requests/<pk>/<action>/ - Accepts or rejects a pending follow request."""
    permission_classes = [IsAuthenticated]
    def post(self, request, pk, action):
        try:
            follow_request = FollowRequest.objects.get(pk=pk)
        except FollowRequest.DoesNotExist: return Response({"error": "Request not found."}, status=status.HTTP_404_NOT_FOUND)

        if follow_request.receiver != request.user: return Response({"error": "Permission denied."}, status=status.HTTP_403_FORBIDDEN)

        if action == 'accept':
            Follow.objects.create(follower=follow_request.sender, following=follow_request.receiver)
            follow_request.delete()
            return Response({"status": "request_accepted"}, status=status.HTTP_200_OK)

        elif action == 'reject':
            follow_request.delete()
            return Response({"status": "request_rejected"}, status=status.HTTP_200_OK)

        return Response({"error": "Invalid action."}, status=status.HTTP_400_BAD_REQUEST)

# ----------------------------------------------------------------------
#                               LIVE CHAT
# ----------------------------------------------------------------------

class ChatRoomListView(generics.ListAPIView):
    """GET /api/chats/ - Lists all chat rooms for the authenticated user (Inbox)."""
    serializer_class = ChatRoomSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return ChatRoom.objects.filter(Q(user1=self.request.user) | Q(user2=self.request.user)).order_by('-last_message_at')
        
    def get_serializer_context(self): return {'request': self.request}

class ChatRoomDetailView(APIView):
    """GET /api/chats/<user_id>/ - Retrieves the chat history with a specific user."""
    permission_classes = [IsAuthenticated]

    def get(self, request, user_id):
        try:
            other_user = User.objects.get(id=user_id)
        except User.DoesNotExist: return Response({"error": "User not found."}, status=status.HTTP_404_NOT_FOUND)
        
        # Find or create the chat room
        room, created = ChatRoom.objects.get_or_create(
            user1=min(request.user, other_user, key=lambda u: u.id), 
            user2=max(request.user, other_user, key=lambda u: u.id),
        )
        
        # Mark all unread messages from the other user as read
        ChatMessage.objects.filter(room=room, is_read=False).exclude(author=request.user).update(is_read=True)

        messages = ChatMessage.objects.filter(room=room).order_by('timestamp')
        serializer = ChatMessageSerializer(messages, many=True, context={'request': request})
        
        return Response(serializer.data, status=status.HTTP_200_OK)


class SendMessageView(APIView):
    permission_classes = [IsAuthenticated]
    def post(self, request):
        recipient_username = request.data.get('recipient_username')
        content = request.data.get('content')
        story_id = request.data.get('story_id')
        
        if not recipient_username or not content:
             return Response({"error": "Recipient and content are required."}, status=status.HTTP_400_BAD_REQUEST)
             
        try:
            recipient = User.objects.get(username=recipient_username)
        except User.DoesNotExist:
             return Response({"error": "User not found."}, status=status.HTTP_404_NOT_FOUND)
             
        # Create/Get Room
        room, created = ChatRoom.objects.get_or_create(
            user1=min(request.user, recipient, key=lambda u: u.id),
            user2=max(request.user, recipient, key=lambda u: u.id)
        )
        room.last_message_at = timezone.now()
        room.save()
        
        # Optional: Link story
        story_ref = None
        if story_id:
            try:
                story_ref = Story.objects.get(id=story_id)
            except Story.DoesNotExist: pass
            
        # Create Message
        msg = ChatMessage.objects.create(
            room=room,
            author=request.user,
            content=content,
            story_reply=story_ref
        )
        
        # Broadcast to WebSocket Group
        channel_layer = get_channel_layer()
        user_ids = sorted([str(request.user.id), str(recipient.id)])
        room_name = f'chat_{user_ids[0]}_{user_ids[1]}'
        room_group_name = f'chat_{room_name}'
        
        async_to_sync(channel_layer.group_send)(
            room_group_name,
            {
                'type': 'chat_message',
                'id': msg.id,
                'content': msg.content,
                'author': request.user.id,
                'author_username': request.user.username,
                'timestamp': msg.timestamp.isoformat(),
                'is_read': False 
            }
        )

        return Response(ChatMessageSerializer(msg, context={'request': request}).data, status=status.HTTP_201_CREATED)



# ----------------------------------------------------------------------
#                       CONTENT & ENGAGEMENT
# ----------------------------------------------------------------------

class PostListCreateView(generics.ListCreateAPIView):
    """List posts from followed users (respecting privacy) or create a new post."""
    serializer_class = PostSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]
    
    def get_queryset(self):
        user = self.request.user
        following_users = Follow.objects.filter(follower=user).values_list('following_id', flat=True)
        following_users = list(following_users) + [user.id] # Include own posts

        return Post.objects.filter(author_id__in=following_users).order_by('-created_at')

    def perform_create(self, serializer): serializer.save(author=self.request.user)
    def get_serializer_context(self): return {'request': self.request}

class PostDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Post.objects.all()
    serializer_class = PostSerializer
    permission_classes = [IsAuthenticated, IsOwnerOrReadOnly]
    def get_serializer_context(self): return {'request': self.request}

class LikeToggleView(APIView):
    permission_classes = [IsAuthenticated]
    def post(self, request, pk):
        try:
            post = Post.objects.get(pk=pk)
        except Post.DoesNotExist: return Response({"error": "Post not found"}, status=status.HTTP_404_NOT_FOUND)
        like_obj, created = Like.objects.get_or_create(user=request.user, post=post)
        if not created:
            like_obj.delete()
            return Response({"status": "unliked"}, status=status.HTTP_200_OK)
        return Response({"status": "liked"}, status=status.HTTP_201_CREATED)

class CommentListCreateView(generics.ListCreateAPIView):
    """GET/POST /api/posts/<pk>/comments/"""
    serializer_class = CommentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        post_id = self.kwargs['pk']
        return Comment.objects.filter(post_id=post_id).order_by('created_at')

    def perform_create(self, serializer):
        post = Post.objects.get(pk=self.kwargs['pk'])
        serializer.save(author=self.request.user, post=post)
        
    def get_serializer_context(self): return {'request': self.request}


class CommentDetailView(generics.DestroyAPIView):
    """DELETE /api/comments/<pk>/"""
    queryset = Comment.objects.all()
    serializer_class = CommentSerializer
    permission_classes = [IsAuthenticated, IsOwnerOrReadOnly]
    def get_serializer_context(self): return {'request': self.request}


class TwistListCreateView(generics.ListCreateAPIView):
    """GET/POST /api/posts/<pk>/twists/"""
    serializer_class = TwistSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser] 

    def get_queryset(self):
        post_id = self.kwargs['pk']
        return Twist.objects.filter(original_post_id=post_id).order_by('-created_at')

    def perform_create(self, serializer):
        original_post = Post.objects.get(pk=self.kwargs['pk'])
        serializer.save(twist_author=self.request.user, original_post=original_post)
        
    def get_serializer_context(self): return {'request': self.request}


# --- Story Views ---

class StoryListCreateView(generics.ListCreateAPIView):
    """GET: Get active stories from users the current user follows. POST: Create a new story."""
    serializer_class = StorySerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def get_queryset(self):
        user = self.request.user
        following_ids = list(Follow.objects.filter(follower=user).values_list('following_id', flat=True))
        following_ids.append(user.id)
        return Story.objects.filter(author_id__in=following_ids, expires_at__gt=timezone.now()).order_by('-created_at')

    def perform_create(self, serializer): serializer.save(author=self.request.user)
    def get_serializer_context(self): return {'request': self.request}


class RegisterStoryView(APIView):
    """POST /api/stories/<story_id>/view/ - Registers that the current user has viewed this story."""
    permission_classes = [IsAuthenticated]

    def post(self, request, story_id):
        try:
            story = Story.objects.get(id=story_id)
        except Story.DoesNotExist: return Response({"error": "Story not found."}, status=status.HTTP_404_NOT_FOUND)
        StoryView.objects.get_or_create(story=story, user=request.user)
        return Response({"status": "view registered"}, status=status.HTTP_201_CREATED)


class StoryDetailDeleteView(generics.DestroyAPIView):
    """
    DELETE /api/stories/<pk>/
    Deletes a specific story. Only the owner can delete it.
    """
    queryset = Story.objects.all()
    serializer_class = StorySerializer
    permission_classes = [IsAuthenticated, IsOwnerOrReadOnly] # Ensures only the author can delete

    # NOTE: The lookup field will be 'pk' (story ID) by default.

class StoryLikeToggleView(APIView):
    permission_classes = [IsAuthenticated]
    def post(self, request, pk):
        try:
            story = Story.objects.get(pk=pk)
        except Story.DoesNotExist: return Response({"error": "Story not found"}, status=status.HTTP_404_NOT_FOUND)
        
        like_obj, created = StoryLike.objects.get_or_create(story=story, user=request.user)
        if not created:
            # Unlike
            like_obj.delete()
            return Response({"status": "unliked"}, status=status.HTTP_200_OK)
        
        # Like
        if story.author != request.user:
             Notification.objects.create(
                recipient=story.author,
                sender=request.user,
                notification_type='story_like',
                story=story
            )
            
        return Response({"status": "liked"}, status=status.HTTP_201_CREATED)

    
class StoryAnalyticsView(generics.ListAPIView):
    """
    GET /api/stories/<story_id>/analytics/
    Retrieves the list of users who have viewed a specific story.
    ONLY the story's AUTHOR can access this endpoint.
    """
    serializer_class = FollowingSerializer # We can reuse FollowingSerializer to list User details
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        story_id = self.kwargs['story_id']
        current_user = self.request.user
        
        try:
            story = Story.objects.get(id=story_id)
        except Story.DoesNotExist:
            return StoryView.objects.none() # Return empty if story not found

        # 1. Permission Check: Only the author can see analytics
        if story.author != current_user:
            # Using the HTTP 403 Forbidden code
            raise PermissionDenied("You are not authorized to view the analytics for this story.")
            
        # 2. Get all StoryView objects related to this story
        # We want the User objects (the viewer) from the StoryView records.
        # We can use the 'user' field in StoryView to access the viewers.
        view_records = StoryView.objects.filter(story=story)
        
        # NOTE: Since FollowingSerializer expects a 'following'/'follower' model, 
        # it might not be the best fit. Let's return the VIEWER User objects directly 
        # and create a dedicated ViewerSerializer later if needed.
        # For now, let's return the VIEWERS (User objects) directly from the view records.
        
        # HACK: We will use a standard method to get the list of viewer User objects
        viewer_ids = view_records.values_list('user_id', flat=True)
        return User.objects.filter(id__in=viewer_ids).order_by('-storyview__viewed_at')
        
    # We override the serializer_class just to list the users, 
    # but we'll return the raw User data which is simple.
    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        
        # If PermissionDenied was raised, let generics handle it.
        if not queryset.exists() and self.kwargs.get('story_id'):
            try:
                Story.objects.get(id=self.kwargs['story_id'])
            except Story.DoesNotExist:
                return Response({"error": "Story not found."}, status=status.HTTP_404_NOT_FOUND)
        
        # Using UserSerializer to display the list of viewers (User objects)
        serializer = UserSerializer(queryset, many=True, context={'request': request})
        
        return Response({
            'total_views': queryset.count(),
            'viewers': serializer.data
        }, status=status.HTTP_200_OK)

class UserStoryListView(generics.ListAPIView):
    """
    GET /api/stories/user/<user_id>/
    Retrieves a list of active stories made by a specific user for their profile.
    Permissions: Only viewable if Public, Owner, or Following.
    """
    serializer_class = StorySerializer
    permission_classes = [AllowAny] 
    
    def get_queryset(self):
        user_id = self.kwargs['user_id']
        current_user = self.request.user
        
        try:
            target_user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Story.objects.none()

        # 1. Determine Access Rights
        is_owner = target_user == current_user
        is_private = target_user.profile.is_private
        is_following = current_user.is_authenticated and Follow.objects.filter(follower=current_user, following=target_user).exists()
        
        # 2. Check Privacy Condition
        if is_private and not is_owner and not is_following:
             # If private and user is not authorized, return empty queryset
             return Story.objects.none()

        # 3. If authorized, return all active stories from this user
        return Story.objects.filter(author_id=user_id, expires_at__gt=timezone.now()).order_by('-created_at')

    def get_serializer_context(self):
        return {'request': self.request}

class FollowerListView(generics.ListAPIView):
    serializer_class = FollowerSerializer
    permission_classes = [AllowAny]
    def get_queryset(self):
        username = self.kwargs['username']
        user = User.objects.get(username=username)
        return Follow.objects.filter(following=user)

class FollowingListView(generics.ListAPIView):
    serializer_class = FollowingSerializer
    permission_classes = [AllowAny]
    def get_queryset(self):
        username = self.kwargs['username']
        user = User.objects.get(username=username)
        return Follow.objects.filter(follower=user)

class TrendingHashtagsView(generics.ListAPIView):
    serializer_class = HashtagSerializer
    permission_classes = [AllowAny]
    def get_queryset(self):
        return Hashtag.objects.annotate(
            post_count=Count('posts')
        ).order_by('-post_count')[:10]


# --- Reels Views ---

class ReelListCreateView(generics.ListCreateAPIView):
    """
    GET: List reels (Feed logic: Recent reels from everyone or following? For now, public feed = everyone, sorted by recent).
    POST: Create a new reel.
    """
    serializer_class = ReelSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def get_queryset(self):
        # Filter out reels from private accounts unless following
        user = self.request.user
        public_reels = Reel.objects.filter(author__profile__is_private=False)
        following_ids = Follow.objects.filter(follower=user).values_list('following_id', flat=True)
        followed_reels = Reel.objects.filter(author_id__in=following_ids)
        my_reels = Reel.objects.filter(author=user)
        
        return (public_reels | followed_reels | my_reels).filter(is_draft=False).distinct().order_by('?')

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)
        
    def get_serializer_context(self): return {'request': self.request}

class ReelDetailView(generics.RetrieveDestroyAPIView):
    """Retrieve or Delete a Reel."""
    queryset = Reel.objects.all()
    serializer_class = ReelSerializer
    permission_classes = [IsAuthenticated, IsOwnerOrReadOnly]
    def get_serializer_context(self): return {'request': self.request}

class UserReelListView(generics.ListAPIView):
    """GET /api/reels/user/<user_id>/ - List reels by a specific user."""
    serializer_class = ReelSerializer
    permission_classes = [AllowAny]
    
    def get_queryset(self):
        user_id = self.kwargs['user_id']
        return Reel.objects.filter(author_id=user_id).order_by('-created_at')
        
    def get_serializer_context(self): return {'request': self.request}

class ReelLikeToggleView(APIView):
    permission_classes = [IsAuthenticated]
    def post(self, request, pk):
        try:
            reel = Reel.objects.get(pk=pk)
        except Reel.DoesNotExist: return Response({"error": "Reel not found"}, status=status.HTTP_404_NOT_FOUND)
        
        like_obj, created = ReelLike.objects.get_or_create(reel=reel, user=request.user)
        if not created:
            like_obj.delete()
            return Response({"status": "unliked"}, status=status.HTTP_200_OK)
        return Response({"status": "liked"}, status=status.HTTP_201_CREATED)

class ReelCommentListCreateView(generics.ListCreateAPIView):
    """GET/POST /api/reels/<pk>/comments/"""
    serializer_class = ReelCommentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        reel_id = self.kwargs['pk']
        return ReelComment.objects.filter(reel_id=reel_id).order_by('created_at')

    def perform_create(self, serializer):
        reel = Reel.objects.get(pk=self.kwargs['pk'])
        serializer.save(author=self.request.user, reel=reel)
        
    def get_serializer_context(self): return {'request': self.request}

# --- Notifications Views ---
from .models import Notification
from .serializers import NotificationSerializer

class NotificationListView(generics.ListAPIView):
    """GET /api/notifications/ - List all notifications."""
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(recipient=self.request.user).order_by('-created_at')

class NotificationActionView(APIView):
    """POST /api/notifications/<pk>/<action>/ - Perform an action (read, accept_follow, reject_follow)."""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk, action):
        try:
            notification = Notification.objects.get(pk=pk, recipient=request.user)
        except Notification.DoesNotExist:
            return Response({"error": "Notification not found"}, status=status.HTTP_404_NOT_FOUND)

        if action == 'read':
            notification.is_read = True
            notification.save()
            return Response({"status": "read"}, status=status.HTTP_200_OK)
        
        # Actions for Follow Requests
        elif action in ['accept_follow', 'reject_follow']:
            # Handle case where FollowRequest is already deleted/processed
            follow_req = notification.follow_request_ref
            
            if not follow_req:
                # If Request is missing, check if they are already following
                is_following = Follow.objects.filter(follower=notification.sender, following=notification.recipient).exists()
                
                if action == 'accept_follow':
                    if is_following:
                         # Already accepted
                         notification.is_read = True
                         notification.save()
                         return Response({"status": "already_followed"}, status=status.HTTP_200_OK)
                    else:
                         return Response({"error": "Follow request no longer exists."}, status=status.HTTP_404_NOT_FOUND)

                elif action == 'reject_follow':
                    # If rejecting and it's gone, consider it done
                    notification.is_read = True
                    notification.save()
                    return Response({"status": "request_rejected"}, status=status.HTTP_200_OK)
            
            # Normal flow (Request exists)
            if action == 'accept_follow':
                Follow.objects.get_or_create(follower=follow_req.sender, following=follow_req.receiver)
                follow_req.delete()
                
                notification.is_read = True
                notification.save()
                
                # OPTIONAL: Send "Follow Accept" notification back to sender
                try:
                    Notification.objects.create(
                        recipient=follow_req.sender,
                        sender=follow_req.receiver,
                        notification_type='follow_accept'
                    )
                except Exception:
                    pass # Ignore if notification fails
                
                # BROADCAST UPDATE
                try:
                     from channels.layers import get_channel_layer
                     from asgiref.sync import async_to_sync
                     from .serializers import NotificationSerializer
                     
                     channel_layer = get_channel_layer()
                     group_name = f"user_{request.user.id}"
                     data = NotificationSerializer(notification).data
                     
                     async_to_sync(channel_layer.group_send)(
                        group_name,
                        {
                            'type': 'notification_message',
                            'data': data
                        }
                     )
                except Exception as e:
                     print(f"Socket update failed: {e}")

                return Response({"status": "follow_accepted"}, status=status.HTTP_200_OK)
            
            elif action == 'reject_follow':
                follow_req.delete()
                notification.is_read = True
                notification.save()

                # BROADCAST UPDATE
                try:
                     from channels.layers import get_channel_layer
                     from asgiref.sync import async_to_sync
                     from .serializers import NotificationSerializer
                     
                     channel_layer = get_channel_layer()
                     group_name = f"user_{request.user.id}"
                     data = NotificationSerializer(notification).data
                     
                     async_to_sync(channel_layer.group_send)(
                        group_name,
                        {
                            'type': 'notification_message',
                            'data': data
                        }
                     )
                except Exception as e:
                     print(f"Socket update failed: {e}")

                return Response({"status": "follow_rejected"}, status=status.HTTP_200_OK)

        return Response({"error": "Invalid action"}, status=status.HTTP_400_BAD_REQUEST)

class ShareReelView(APIView):
    """
    POST /api/reels/<id>/share/
    Body: { "recipient_ids": [1, 2, 5] }
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            reel = Reel.objects.get(pk=pk)
        except Reel.DoesNotExist:
            return Response({"error": "Reel not found"}, status=status.HTTP_404_NOT_FOUND)

        recipient_ids = request.data.get('recipient_ids', [])
        if not recipient_ids:
             return Response({"error": "No recipients selected"}, status=status.HTTP_400_BAD_REQUEST)

        created_messages = []
        
        from channels.layers import get_channel_layer
        from asgiref.sync import async_to_sync
        from .serializers import ChatMessageSerializer
        channel_layer = get_channel_layer()

        for user_id in recipient_ids:
            try:
                recipient = User.objects.get(pk=user_id)
                # Ensure Chat Room Exists
                room, _ = ChatRoom.objects.get_or_create(
                    user1=min(request.user, recipient, key=lambda u: u.id),
                    user2=max(request.user, recipient, key=lambda u: u.id)
                )
                room.last_message_at = timezone.now()
                room.save()

                # Create Message
                msg = ChatMessage.objects.create(
                    room=room,
                    author=request.user,
                    content=f"Shared a reel: {reel.caption[:20] if reel.caption else 'Reel'}", # Fallback text
                    shared_reel=reel
                )
                
                # Broadcast via WebSocket
                # We need to construct the room group name: 'chat_X_Y'
                user_ids = sorted([str(request.user.id), str(recipient.id)])
                room_group_name = f'chat_{user_ids[0]}_{user_ids[1]}'
                
                serialized_msg = ChatMessageSerializer(msg).data
                
                # We reuse the structure from consumers.property
                async_to_sync(channel_layer.group_send)(
                    room_group_name,
                    {
                        'type': 'chat_message',
                        'id': msg.id,
                        'content': msg.content,
                        'author': request.user.id,
                        'author_username': request.user.username,
                        'timestamp': msg.timestamp.isoformat(),
                        'is_read': False,
                        'shared_reel': msg.shared_reel.id,
                        'shared_reel_data': serialized_msg['shared_reel_data']
                    }
                )
                created_messages.append(msg.id)

            except User.DoesNotExist:
                continue
        
        return Response({"status": "shared", "count": len(created_messages)}, status=status.HTTP_200_OK)