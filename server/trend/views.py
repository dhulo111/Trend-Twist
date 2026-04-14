# backend/api/views.py (COMPLETE FINAL VERSION - CLEANED AND MERGED)

import os
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from django.contrib.auth.models import User
from django.db.models import Count, Q 
from django.utils import timezone
from django.core.mail import send_mail
from django.conf import settings
from django.shortcuts import get_object_or_404
import random
import urllib.request
import json
import os

def send_email_via_api(to_email, subject, text_content):
    """
    Sends email via Brevo REST API (HTTPS port 443) 
    to bypass Render's block on SMTP ports (25, 465, 587).
    """
    url = "https://api.brevo.com/v3/smtp/email"
    
    # Brevo API keys typically start with 'xkeysib-'
    api_key = os.environ.get('BREVO_API_KEY') or os.environ.get('SENDINBLUE_API_KEY')
    
    if not api_key:
        api_key = os.environ.get('EMAIL_HOST_PASSWORD')
        
    sender_email = os.environ.get('DEFAULT_FROM_EMAIL', 'noreply@trendtwist.com')
    
    if not api_key or api_key.startswith('xsmtpsib-'):
        raise Exception("API Key required! The key 'xsmtpsib-...' is an SMTP password, NOT a REST API key. Generate a real API Key (starts with 'xkeysib-') from your Brevo Dashboard -> 'SMTP & API' -> 'API Keys'. Add it as 'BREVO_API_KEY' in your backend environment.")
        
    data = {
        "sender": {"name": "Trend Twist", "email": sender_email},
        "to": [{"email": to_email}],
        "subject": subject,
        "textContent": text_content
    }
    
    encoded_data = json.dumps(data).encode('utf-8')
    req = urllib.request.Request(url, data=encoded_data)
    req.add_header('api-key', api_key)
    req.add_header('Content-Type', 'application/json')
    req.add_header('Accept', 'application/json')
    
    try:
        with urllib.request.urlopen(req) as response:
            return response.read()
    except urllib.error.HTTPError as e:
        error_msg = e.read().decode()
        raise Exception(f"Brevo API Error {e.code}: {error_msg}")

from rest_framework import generics, permissions, status, viewsets, serializers
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.permissions import AllowAny, IsAuthenticated, IsAdminUser
from rest_framework.exceptions import PermissionDenied

# Import JWT tokens
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenRefreshView 

# Import all models
from .models import (
    Profile, Post, Comment, Like, Twist, Hashtag, Follow, OTPRequest,
    Story, StoryView, FollowRequest, ChatRoom, ChatMessage,
    Reel, ReelLike, ReelComment, StoryLike, TwistComment, TwistLike, ChatGroup,
    SavedItem, WithdrawalRequest
)
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
# Import all serializers
from .serializers import (
    UserSerializer, ProfileSerializer, PostSerializer, CommentSerializer, TwistSerializer,
    FollowerSerializer, FollowingSerializer, HashtagSerializer,
    LoginSerializer, RegisterSerializer,
    StorySerializer, FollowRequestSerializer, ChatRoomSerializer, ChatMessageSerializer,
    ReelSerializer, ReelCommentSerializer, TwistCommentSerializer, ChatGroupSerializer,
    NotificationSerializer, SavedItemSerializer, has_subscription_access,
    WithdrawalRequestSerializer, AdminWithdrawalActionSerializer
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
            # Support multiple client IDs (original + Firebase)
            client_ids = []
            primary_id = os.environ.get('GOOGLE_CLIENT_ID')
            if primary_id and primary_id != 'your-google-client-id':
                client_ids.append(primary_id)
            
            # Also accept Firebase Web client ID
            firebase_id = os.environ.get('FIREBASE_WEB_CLIENT_ID')
            if firebase_id:
                client_ids.append(firebase_id)
            
            if not client_ids:
                return Response({"error": "Server configuration error: No Google Client IDs configured."}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

            # Try verification with each client ID
            idinfo = None
            last_error = None
            for cid in client_ids:
                try:
                    idinfo = id_token.verify_oauth2_token(
                        google_token,
                        google_requests.Request(),
                        cid
                    )
                    break  # Success — stop trying
                except ValueError as e:
                    last_error = e
                    continue
            
            if idinfo is None:
                return Response({"error": f"Invalid Google token: {str(last_error)}"}, status=status.HTTP_401_UNAUTHORIZED)
            
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
            
            if hasattr(user, 'profile') and user.profile.blocked_until and user.profile.blocked_until > timezone.now():
                duration_str = user.profile.blocked_until.strftime("%B %d, %Y at %I:%M %p")
                return Response({
                    "error": "Account Blocked", 
                    "block_reason": user.profile.block_reason,
                    "blocked_until": duration_str,
                    "contact_email": "support@trendtwist.com"
                }, status=status.HTTP_403_FORBIDDEN)
            
            
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

class CheckUserView(APIView):
    """Checks if a user exists with the given email or username."""
    permission_classes = [AllowAny]
    def post(self, request):
        query = request.data.get('username_or_email')
        if not query:
            return Response({"error": "username_or_email is required."}, status=status.HTTP_400_BAD_REQUEST)
        
        user = User.objects.filter(Q(username__iexact=query) | Q(email__iexact=query)).first()
        if user:
            return Response({"exists": True}, status=status.HTTP_200_OK)
        return Response({"exists": False}, status=status.HTTP_200_OK)

class PasswordLoginView(APIView):
    """Standard username/email and password login."""
    permission_classes = [AllowAny]
    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        query = serializer.validated_data['username_or_email']
        password = serializer.validated_data['password']

        user = User.objects.filter(Q(username__iexact=query) | Q(email__iexact=query)).first()
        
        if user and user.check_password(password):
            if hasattr(user, 'profile') and user.profile.blocked_until and user.profile.blocked_until > timezone.now():
                duration_str = user.profile.blocked_until.strftime("%B %d, %Y at %I:%M %p")
                return Response({
                    "error": "Account Blocked", 
                    "block_reason": user.profile.block_reason,
                    "blocked_until": duration_str,
                    "contact_email": "support@trendtwist.com"
                }, status=status.HTTP_403_FORBIDDEN)
            
            refresh = RefreshToken.for_user(user)
            return Response({
                'refresh': str(refresh),
                'access': str(refresh.access_token),
                'user': UserSerializer(user, context={'request': request}).data
            }, status=status.HTTP_200_OK)
        
        return Response({"error": "Invalid credentials."}, status=status.HTTP_401_UNAUTHORIZED)

class SendSecurityOTPView(APIView):
    """Sends OTP to the authenticated user's current email for security changes."""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        email = request.user.email
        if not email:
            return Response({"error": "No email associated with this account."}, status=status.HTTP_400_BAD_REQUEST)
            
        import random
        from .models import OTPRequest
        
        otp = str(random.randint(100000, 999999))
        
        try:
            send_email_via_api(
                to_email=email,
                subject='Trend Twist Security Update OTP',
                text_content=f'Your OTP to change your password is {otp}. It is valid for 5 minutes.'
            )
        except Exception as e:
            print("Mail Error:", str(e))
            return Response({"error": f"Failed to send email: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
        OTPRequest.objects.filter(email=email).delete()
        OTPRequest.objects.create(email=email, otp=otp)
        
        return Response({"message": f"OTP sent to {email}."}, status=status.HTTP_200_OK)

class UpdatePasswordView(APIView):
    """Updates password of the authenticated user utilizing an OTP sent to their current email."""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        from .models import OTPRequest
        
        user = request.user
        otp = request.data.get('otp')
        new_password = request.data.get('new_password')
        
        if not otp:
            return Response({"error": "OTP is required."}, status=status.HTTP_400_BAD_REQUEST)
            
        if not new_password:
             return Response({"error": "New password is required."}, status=status.HTTP_400_BAD_REQUEST)
             
        try:
             otp_req = OTPRequest.objects.filter(email=user.email).latest('created_at')
        except OTPRequest.DoesNotExist:
             return Response({"error": "No OTP requested for this account."}, status=status.HTTP_400_BAD_REQUEST)
             
        if otp_req.otp != otp:
             return Response({"error": "Invalid OTP."}, status=status.HTTP_400_BAD_REQUEST)
             
        if otp_req.is_expired():
             return Response({"error": "OTP has expired."}, status=status.HTTP_400_BAD_REQUEST)
             
        otp_req.is_verified = True
        otp_req.save()
        
        if len(new_password) < 8:
             return Response({"error": "Password must be at least 8 characters long."}, status=status.HTTP_400_BAD_REQUEST)
        
        user.set_password(new_password)
        user.save()
        
        return Response({"message": "Password updated successfully."}, status=status.HTTP_200_OK)


class ForgotPasswordSendOTPView(APIView):
    """Sends OTP to the user's email if the account exists for password reset."""
    permission_classes = [AllowAny]
    
    def post(self, request):
        from django.db.models import Q
        query = request.data.get('email') or request.data.get('username_or_email')
        if not query:
            return Response({"error": "Email or Username is required."}, status=status.HTTP_400_BAD_REQUEST)
            
        user = User.objects.filter(Q(username__iexact=query) | Q(email__iexact=query)).first()
        if not user or not user.email:
            return Response({"error": "No valid account or email found for this user."}, status=status.HTTP_400_BAD_REQUEST)
            
        email = user.email
            
        import random
        from .models import OTPRequest
        
        otp = str(random.randint(100000, 999999))
        
        try:
            send_email_via_api(
                to_email=email,
                subject='Trend Twist Password Reset OTP',
                text_content=f'Your OTP to reset your password is {otp}. It is valid for 5 minutes.'
            )
        except Exception as e:
            print("Mail Error:", str(e))
            return Response({"error": f"Failed to send email: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
        OTPRequest.objects.filter(email=email).delete()
        OTPRequest.objects.create(email=email, otp=otp)
        
        return Response({"message": f"OTP sent to {email}."}, status=status.HTTP_200_OK)


class ForgotPasswordResetView(APIView):
    """Resets password using OTP."""
    permission_classes = [AllowAny]
    
    def post(self, request):
        from .models import OTPRequest
        
        query = request.data.get('email') or request.data.get('username_or_email')
        otp = request.data.get('otp')
        new_password = request.data.get('new_password')
        
        if not query or not otp or not new_password:
            return Response({"error": "Email/Username, OTP, and new password are required."}, status=status.HTTP_400_BAD_REQUEST)
            
        from django.db.models import Q
        user = User.objects.filter(Q(username__iexact=query) | Q(email__iexact=query)).first()
        if not user or not user.email:
             return Response({"error": "Invalid user or email."}, status=status.HTTP_400_BAD_REQUEST)
             
        try:
             otp_req = OTPRequest.objects.filter(email=user.email).latest('created_at')
        except OTPRequest.DoesNotExist:
             return Response({"error": "No OTP requested for this email."}, status=status.HTTP_400_BAD_REQUEST)
             
        if otp_req.otp != otp:
             return Response({"error": "Invalid OTP."}, status=status.HTTP_400_BAD_REQUEST)
             
        if otp_req.is_expired():
             return Response({"error": "OTP has expired."}, status=status.HTTP_400_BAD_REQUEST)
             
        otp_req.is_verified = True
        otp_req.save()
        
        if len(new_password) < 8:
             return Response({"error": "Password must be at least 8 characters long."}, status=status.HTTP_400_BAD_REQUEST)
        
        user.set_password(new_password)
        user.save()
        
        return Response({"message": "Password reset successfully."}, status=status.HTTP_200_OK)

class SendOTPView(APIView):
    """Sends OTP to user email for verification."""
    permission_classes = [AllowAny]
    
    def post(self, request):
        email = request.data.get('email')
        if not email:
            return Response({"error": "Email is required."}, status=status.HTTP_400_BAD_REQUEST)
            
        if User.objects.filter(email__iexact=email).exists():
            return Response({"error": "This email is already registered."}, status=status.HTTP_400_BAD_REQUEST)
            
        # Generate 6 digit OTP
        otp = str(random.randint(100000, 999999))
        
        try:
            send_email_via_api(
                to_email=email,
                subject='Trend Twist Registration OTP',
                text_content=f'Your OTP for registration is {otp}. It is valid for 5 minutes.'
            )
        except Exception as e:
            print("Mail Error:", str(e))
            return Response({"error": f"Failed to send email: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
        OTPRequest.objects.filter(email=email).delete()
        OTPRequest.objects.create(email=email, otp=otp)
        
        return Response({"message": "OTP sent successfully."}, status=status.HTTP_200_OK)

class PasswordRegisterView(APIView):
    """Password-based registration with optional phone number."""
    permission_classes = [AllowAny]
    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        user = serializer.save()
        refresh = RefreshToken.for_user(user)
        return Response({
            'refresh': str(refresh),
            'access': str(refresh.access_token),
            'user': UserSerializer(user, context={'request': request}).data
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
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    def get_object(self): return self.request.user.profile
    def get_serializer_context(self): return {'request': self.request}

class CreatorModeToggleView(APIView):
    """PATCH /api/profile/creator-mode/ - Enables or disables creator mode for the current user."""
    permission_classes = [IsAuthenticated]

    def patch(self, request):
        is_creator = request.data.get('is_creator')
        if is_creator is None:
            return Response({"error": "is_creator field is required."}, status=status.HTTP_400_BAD_REQUEST)
        
        profile = request.user.profile
        profile.is_creator = bool(is_creator)
        profile.save()
        
        return Response({
            "status": "success",
            "is_creator": profile.is_creator,
            "message": "Creator mode enabled successfully." if profile.is_creator else "Creator mode disabled."
        }, status=status.HTTP_200_OK)

class UserProfileDetailView(generics.RetrieveAPIView):
    """Retrieves a user profile, respecting privacy settings."""
    def get_queryset(self):
        return User.objects.exclude(profile__blocked_until__gt=timezone.now())
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
            ).exclude(id=self.request.user.id).exclude(profile__blocked_until__gt=timezone.now()).order_by('username')
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
        requesting_user = self.request.user
        
        # Base queryset
        queryset = Post.objects.filter(author_id=user_id).exclude(author__profile__blocked_until__gt=timezone.now())
        
        # Check if the requesting user has access to exclusive content
        try:
            target_author = User.objects.get(id=user_id)
            can_see_exclusive = has_subscription_access(requesting_user, target_author)
        except User.DoesNotExist:
            can_see_exclusive = False
            
        if not can_see_exclusive:
            queryset = queryset.filter(is_exclusive=False)
            
        return queryset.order_by('-created_at')

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
            notif_to_delete = Notification.objects.filter(follow_request_ref=pending_request).first()
            if notif_to_delete:
                notif_id = notif_to_delete.id
                notif_to_delete.delete()
                
                # Broadcast deletion to receiver to remove from their list in real-time
                try:
                    channel_layer = get_channel_layer()
                    async_to_sync(channel_layer.group_send)(
                        f"user_{user_to_follow.id}",
                        {
                            'type': 'notification_message',
                            'data': {
                                'action': 'deleted',
                                'id': notif_id 
                            }
                        }
                    )
                except: pass
            
            pending_request.delete()

            return Response({"status": "request_cancelled"}, status=status.HTTP_200_OK)

        if is_private:
            # Private: Send request
            req, created = FollowRequest.objects.get_or_create(sender=request.user, receiver=user_to_follow)

            # Check if Notification already exists (e.g. from signal)
            existing_notif = Notification.objects.filter(
                recipient=user_to_follow, 
                sender=request.user, 
                notification_type='follow_request', 
                follow_request_ref=req
            ).first()

            if not existing_notif:
                # Creating Notification
                try:
                    notif = Notification.objects.create(
                        recipient=user_to_follow,
                        sender=request.user,
                        notification_type='follow_request',
                        follow_request_ref=req
                    )
                    
                    # Broadcast
                    channel_layer = get_channel_layer()
                    async_to_sync(channel_layer.group_send)(
                        f"user_{user_to_follow.id}",
                        {
                            'type': 'notification_message', # This triggers the frontend update
                            'data': NotificationSerializer(notif).data
                        }
                    )
                except Exception as e:
                    print(f"Notification error: {e}")

            return Response({"status": "request_sent"}, status=status.HTTP_201_CREATED)
        else:
            # Public: Instant follow
            Follow.objects.create(follower=request.user, following=user_to_follow)
            
            # Creating Notification (Optional for Follow Accept/Public Follow)
            try:
                notif = Notification.objects.create(
                    recipient=user_to_follow,
                    sender=request.user,
                    notification_type='follow_accept' # or create a new type 'new_follower'
                )
                # Note: 'follow_accept' usually implies a request was accepted. 
                # Ideally, we should have a 'new_follower' type. 
                # For now, using 'follow_accept' broadly or skipping notification for public follow if not desired.
                # Let's Skip for now or add if user wants. The prompt says "notification perfect".
                # A new follower is definitely a notification event.
                # However, the Notification model only has 'follow_accept' and 'follow_request'. 
                # Let's map it to 'follow_accept' for now or just skip to avoid confusion. 
                # Actually, 'follow_accept' text is "started following you" usually.
                # Ref NotificationItem in frontend: 'follow_accept' isn't explicitly handled there? 
                # Frontend has 'follow_request'. 
                # Let's leave public follow silent for now unless requested, to avoid 'follow_accept' confusion.
            except Exception: pass

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


class ChatGroupListView(generics.ListCreateAPIView):
    """GET /api/groups/ - List all chat groups | POST - Create new group"""
    serializer_class = ChatGroupSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def get_queryset(self):
        return self.request.user.chat_groups.all().order_by('-last_message_at')

    def perform_create(self, serializer):
        group = serializer.save(admin=self.request.user)
        group.members.add(self.request.user) # Admin is always a member

        # Add other members if provided in request
        member_ids_str = self.request.data.get('members', '') # "1,2,3"
        if member_ids_str:
            member_ids = [int(id) for id in member_ids_str.split(',') if id.isdigit()]
            users = User.objects.filter(id__in=member_ids)
            group.members.add(*users)


class ChatGroupDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET/PUT/DELETE /api/groups/<pk>/"""
    queryset = ChatGroup.objects.all()
    serializer_class = ChatGroupSerializer
    permission_classes = [IsAuthenticated]

    def perform_update(self, serializer):
        group = serializer.save()
        # Handle adding members logic if needed
        add_members_str = self.request.data.get('add_members', '')
        if add_members_str:
            member_ids = [int(id) for id in add_members_str.split(',') if id.isdigit()]
            users = User.objects.filter(id__in=member_ids)
            group.members.add(*users)

        remove_members_str = self.request.data.get('remove_members', '')
        if remove_members_str:
             if self.request.user != group.admin:
                 return # Only admin can remove? Or self-leave.
             member_ids = [int(id) for id in remove_members_str.split(',') if id.isdigit()]
             users = User.objects.filter(id__in=member_ids)
             group.members.remove(*users)

class ChatGroupMessageListView(generics.ListAPIView):
    """GET /api/groups/<pk>/messages/"""
    serializer_class = ChatMessageSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        group_id = self.kwargs['pk']
        try:
             group = ChatGroup.objects.get(pk=group_id)
        except ChatGroup.DoesNotExist: return ChatMessage.objects.none()

        # Verify membership
        if self.request.user not in group.members.all():
            return ChatMessage.objects.none()

        return ChatMessage.objects.filter(group=group).order_by('timestamp')


class SendMessageView(APIView):
    permission_classes = [IsAuthenticated]
    def post(self, request):
        recipient_username = request.data.get('recipient_username')
        group_id = request.data.get('group_id')
        content = request.data.get('content')
        story_id = request.data.get('story_id')

        if not content:
             return Response({"error": "Content is required."}, status=status.HTTP_400_BAD_REQUEST)

        # Optional: Link story
        story_ref = None
        if story_id:
            try:
                story_ref = Story.objects.get(id=story_id)
            except Story.DoesNotExist: pass

        # Scenario A: Group Message
        if group_id:
            try:
                group = ChatGroup.objects.get(pk=group_id)
                if request.user not in group.members.all():
                     return Response({"error": "Not a member."}, status=status.HTTP_403_FORBIDDEN)

                group.last_message_at = timezone.now()
                group.save()

                msg = ChatMessage.objects.create(
                    group=group,
                    author=request.user,
                    content=content,
                    story_reply=story_ref
                )

                # Broadcast to Group Room
                channel_layer = get_channel_layer()
                room_group_name = f'chat_group_{group.id}'

                msg_data = ChatMessageSerializer(msg, context={'request': request}).data
                async_to_sync(channel_layer.group_send)(
                    room_group_name,
                    {
                        'type': 'chat_message',
                        **msg_data
                    }
                )

                # Broadcast Global Alert to all members (Except Sender)
                for member in group.members.all():
                    if member != request.user:
                        async_to_sync(channel_layer.group_send)(
                             f"user_{member.id}",
                            {
                                'type': 'chat_alert',
                                'data': {
                                    'sender': request.user.username,
                                    'content': msg.content[:30],
                                    'group_id': group.id,
                                    'group_name': group.name
                                }
                            }
                        )

                return Response(ChatMessageSerializer(msg, context={'request': request}).data, status=status.HTTP_201_CREATED)

            except ChatGroup.DoesNotExist:
                return Response({"error": "Group not found."}, status=status.HTTP_404_NOT_FOUND)

        # Scenario B: Direct Message (Existing Logic)
        elif recipient_username:
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

            msg_data = ChatMessageSerializer(msg, context={'request': request}).data
            async_to_sync(channel_layer.group_send)(
                room_group_name,
                {
                    'type': 'chat_message',
                    **msg_data
                }
            )



            # Broadcast Global Alert to Recipient
            async_to_sync(channel_layer.group_send)(
                 f"user_{recipient.id}",
                {
                    'type': 'chat_alert',
                    'data': {
                        'sender': request.user.username,
                        'content': msg.content[:30],
                        'recipient_username': request.user.username # The other person IS the sender from recipient POV
                    }
                }
            )

            return Response(ChatMessageSerializer(msg, context={'request': request}).data, status=status.HTTP_201_CREATED)

        else:
            return Response({"error": "Recipient or Group ID required."}, status=status.HTTP_400_BAD_REQUEST)



# ----------------------------------------------------------------------
#                       CONTENT & ENGAGEMENT
# ----------------------------------------------------------------------


from rest_framework.pagination import PageNumberPagination

class FeedPagination(PageNumberPagination):
    page_size = 2
    page_size_query_param = 'page_size'
    max_page_size = 100

class PostListCreateView(generics.ListCreateAPIView):
    """List posts from followed users (Main Feed) or create a new post."""
    serializer_class = PostSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]
    pagination_class = FeedPagination
    
    def get_queryset(self):
        from django.db.models import Case, When, Value, IntegerField
        user = self.request.user
        search_query = self.request.query_params.get('search', None) # Simplified search
        
        # Base Feed: Following + Self + Public users
        following_users = Follow.objects.filter(follower=user).values_list('following_id', flat=True)
        following_users = list(following_users) + [user.id]

        # EXCLUDE exclusive posts from the main feed UNLESS the user is the author or a subscriber
        # Get users I am subscribed to
        from .models import UserSubscription
        subscribed_to_ids = UserSubscription.objects.filter(
            subscriber=user, status='active'
        ).filter(
            Q(expiry_date__isnull=True) | Q(expiry_date__gt=timezone.now())
        ).values_list('creator_id', flat=True)

        is_following_or_self = Q(author_id__in=following_users)

        queryset = Post.objects.filter(
            is_following_or_self | Q(author__profile__is_private=False)
        ).exclude(
            author__profile__blocked_until__gt=timezone.now()
        ).filter(
            Q(is_exclusive=False) | Q(author=user) | Q(author_id__in=subscribed_to_ids)
        )

        # Basic text search support for main feed
        if search_query:
            queryset = queryset.filter(content__icontains=search_query)

        # Annotate whether the user is followed (or self). 
        # Then sort by 'is_followed' descending (followed users at top), then created_at descending.
        queryset = queryset.annotate(
            is_followed=Case(
                When(author_id__in=following_users, then=Value(1)),
                default=Value(0),
                output_field=IntegerField()
            )
        )

        return queryset.order_by('-is_followed', '-created_at')

    def perform_create(self, serializer): serializer.save(author=self.request.user)
    def get_serializer_context(self): return {'request': self.request}


# NEW: Public/Trending Feed View
class PublicPostListView(generics.ListAPIView):
    """
    GET /api/posts/public/?tag=<trend>
    Returns PUBLIC posts matching a specific hashtag or search term.
    """
    serializer_class = PostSerializer
    permission_classes = [AllowAny] # It's a public discovery feed
    
    def get_queryset(self):
        tag = self.request.query_params.get('tag', None)
        # Exclude exclusive posts from public feed
        queryset = Post.objects.filter(author__profile__is_private=False, is_exclusive=False).exclude(author__profile__blocked_until__gt=timezone.now()).order_by('-created_at')
        
        if tag:
            # Filter by hashtag (naive text search for now, ideally use Hashtag model relations)
            # Or use the Hashtag model reverse lookup if it was reliably populated.
            # For robustness sake -> Text Search
            queryset = queryset.filter(content__icontains=f"#{tag}")
            
        return queryset

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
        
        # Create Notification
        if post.author != request.user:
            try:
                notif = Notification.objects.create(
                    recipient=post.author,
                    sender=request.user,
                    notification_type='like_post',
                    post=post
                )
                
                channel_layer = get_channel_layer()
                async_to_sync(channel_layer.group_send)(
                    f"user_{post.author.id}",
                    {
                        'type': 'notification_message',
                        'data': NotificationSerializer(notif).data
                    }
                )
            except Exception as e:
                print(f"Notification error: {e}")

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
        
        # Create Notification
        if post.author != self.request.user:
            try:
                notif = Notification.objects.create(
                    recipient=post.author,
                    sender=self.request.user,
                    notification_type='comment_post',
                    post=post
                )

                channel_layer = get_channel_layer()
                async_to_sync(channel_layer.group_send)(
                    f"user_{post.author.id}",
                    {
                        'type': 'notification_message',
                        'data': NotificationSerializer(notif).data
                    }
                )
            except Exception as e:
                print(f"Notification error: {e}")
        
    def get_serializer_context(self): return {'request': self.request}


class CommentDetailView(generics.DestroyAPIView):
    """DELETE /api/comments/<pk>/"""
    queryset = Comment.objects.all()
    serializer_class = CommentSerializer
    permission_classes = [IsAuthenticated, IsOwnerOrReadOnly]
    def get_serializer_context(self): return {'request': self.request}



# --- Twist Views (Standalone) ---

class TwistListCreateView(generics.ListCreateAPIView):
    """
    GET /api/twists/ - List twists from following users (Feed)
    POST /api/twists/ - Create a new twist
    """
    serializer_class = TwistSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def get_queryset(self):
        user = self.request.user
        following_users = list(Follow.objects.filter(follower=user).values_list('following_id', flat=True))
        following_users.append(user.id) # Include self in the twist feed

        # Exclude exclusive twists from the main twist feed UNLESS the user is the author or a subscriber
        from .models import UserSubscription
        subscribed_to_ids = UserSubscription.objects.filter(
            subscriber=user, status='active'
        ).filter(
            Q(expiry_date__isnull=True) | Q(expiry_date__gt=timezone.now())
        ).values_list('creator_id', flat=True)

        return Twist.objects.filter(author_id__in=following_users).exclude(
            author__profile__blocked_until__gt=timezone.now()
        ).filter(
            Q(is_exclusive=False) | Q(author=user) | Q(author_id__in=subscribed_to_ids)
        ).order_by('-created_at')

    def perform_create(self, serializer): serializer.save(author=self.request.user)
    def get_serializer_context(self): return {'request': self.request}


class PostTwistListView(generics.ListAPIView):
    """GET /api/posts/<post_id>/twists/"""
    serializer_class = TwistSerializer
    permission_classes = [AllowAny] # Allow viewing twists on public posts
    
    def get_queryset(self):
        post_id = self.kwargs['post_id']
        return Twist.objects.filter(original_post_id=post_id).exclude(author__profile__blocked_until__gt=timezone.now()).order_by('-created_at')

    def get_serializer_context(self): return {'request': self.request}


class TwistDetailView(generics.RetrieveDestroyAPIView):
    """DELETE /api/twists/<pk>/"""
    queryset = Twist.objects.all()
    serializer_class = TwistSerializer
    permission_classes = [IsAuthenticated, IsOwnerOrReadOnly]
    def get_serializer_context(self): return {'request': self.request}


class TwistLikeToggleView(APIView):
    permission_classes = [IsAuthenticated]
    def post(self, request, pk):
        try:
            twist = Twist.objects.get(pk=pk)
        except Twist.DoesNotExist: return Response({"error": "Twist not found"}, status=status.HTTP_404_NOT_FOUND)
        
        like_obj, created = TwistLike.objects.get_or_create(user=request.user, twist=twist)
        if not created:
            like_obj.delete()
            return Response({"status": "unliked"}, status=status.HTTP_200_OK)
        
        # Make notification
        if twist.author != request.user:
            Notification.objects.create(
                recipient=twist.author,
                sender=request.user,
                notification_type='like_twist',
                twist=twist
            )
            
        return Response({"status": "liked"}, status=status.HTTP_201_CREATED)

class PublicTwistListView(generics.ListAPIView):
    """
    GET /api/twists/public/?tag=<trend>
    Returns PUBLIC twists matching a specific hashtag or search term.
    """
    serializer_class = TwistSerializer
    permission_classes = [AllowAny] 
    
    def get_queryset(self):
        tag = self.request.query_params.get('tag', None)
        # All public twists (no check for private profile logic yet since Twist model doesn't have it explicitly, 
        # but we can assume author.profile.is_private. Let's add that check.)
        
        # Exclude exclusive twists from public feed
        queryset = Twist.objects.filter(author__profile__is_private=False, is_exclusive=False).exclude(author__profile__blocked_until__gt=timezone.now()).order_by('-created_at')
        
        if tag:
            queryset = queryset.filter(content__icontains=f"#{tag}")
            
        return queryset

    def get_serializer_context(self): return {'request': self.request}
    
class UserTwistListView(generics.ListAPIView):
    """GET /api/twists/user/<user_id>/"""
    serializer_class = TwistSerializer
    permission_classes = [AllowAny] 
    
    def get_queryset(self):
        user_id = self.kwargs['user_id']
        requesting_user = self.request.user
        
        # Base queryset
        queryset = Twist.objects.filter(author_id=user_id).exclude(author__profile__blocked_until__gt=timezone.now())
        
        # Check if the requesting user has access to exclusive content
        try:
            target_author = User.objects.get(id=user_id)
            can_see_exclusive = has_subscription_access(requesting_user, target_author)
        except User.DoesNotExist:
            can_see_exclusive = False
            
        if not can_see_exclusive:
            queryset = queryset.filter(is_exclusive=False)
            
        return queryset.order_by('-created_at')
    
    
    def get_serializer_context(self): return {'request': self.request}

class TwistCommentListCreateView(generics.ListCreateAPIView):
    """GET/POST /api/twists/<pk>/comments/"""
    serializer_class = TwistCommentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        twist_id = self.kwargs['pk']
        return TwistComment.objects.filter(twist_id=twist_id).order_by('created_at')

    def perform_create(self, serializer):
        twist = Twist.objects.get(pk=self.kwargs['pk'])
        comment = serializer.save(author=self.request.user, twist=twist)
        
        # Notify author
        if twist.author != self.request.user:
            Notification.objects.create(
                recipient=twist.author,
                sender=self.request.user,
                notification_type='comment_twist',
                twist=twist
            )
        
    def get_serializer_context(self): return {'request': self.request}

class TwistCommentDetailView(generics.DestroyAPIView):
    """DELETE /api/twist-comments/<pk>/"""
    queryset = TwistComment.objects.all()
    serializer_class = TwistCommentSerializer
    permission_classes = [IsAuthenticated, IsOwnerOrReadOnly]
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
        return Story.objects.filter(author_id__in=following_ids, expires_at__gt=timezone.now()).exclude(author__profile__blocked_until__gt=timezone.now()).order_by('-created_at')

    def perform_create(self, serializer):
        # Use frontend-provided media_type if valid, otherwise auto-detect from file MIME type
        provided_type = self.request.data.get('media_type', '').strip().lower()
        media_file = self.request.FILES.get('media_file')
        
        if provided_type in ('image', 'video'):
            # Trust the frontend but verify with MIME type as final authority
            media_type = provided_type
        else:
            # Auto-detect from MIME type
            media_type = 'image'
            if media_file:
                content_type = getattr(media_file, 'content_type', '') or ''
                if content_type.startswith('video/'):
                    media_type = 'video'
                elif media_file.name:
                    video_exts = ('.mp4', '.mov', '.avi', '.webm', '.mkv', '.m4v', '.3gp')
                    if media_file.name.lower().endswith(video_exts):
                        media_type = 'video'
        
        # Final MIME-type override (security: ensure claimed type matches actual file)
        if media_file:
            content_type = getattr(media_file, 'content_type', '') or ''
            if content_type.startswith('video/'):
                media_type = 'video'
            elif content_type.startswith('image/'):
                media_type = 'image'
        
        serializer.save(author=self.request.user, media_type=media_type)


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

    
class StoryArchiveView(generics.ListAPIView):
    """
    GET /api/stories/archive/
    Returns all stories created by the current user, including expired ones.
    Used for story history/archive.
    """
    serializer_class = StorySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Story.objects.filter(author=self.request.user).order_by('-created_at')

    def get_serializer_context(self):
        return {'request': self.request}

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
        
        # 2. Return User objects who have viewed this story, ordered by view time
        # We filter by the specific story to ensure the join only brings in the relevant view time
        return User.objects.filter(storyview__story=story).distinct().order_by('-storyview__viewed_at')
        
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
        return Story.objects.filter(author_id=user_id, expires_at__gt=timezone.now()).exclude(author__profile__blocked_until__gt=timezone.now()).order_by('-created_at')

    def get_serializer_context(self):
        return {'request': self.request}

class FollowerListView(generics.ListAPIView):
    """
    Returns a list of User objects who follow the target user.
    Uses UserSerializer for rich profile data and follow state.
    """
    serializer_class = UserSerializer
    permission_classes = [AllowAny]
    
    def get_queryset(self):
        username = self.kwargs['username']
        user = get_object_or_404(User, username__iexact=username)
        # return the User objects from the follow records
        return User.objects.filter(following__following=user).distinct().exclude(profile__blocked_until__gt=timezone.now())

class FollowingListView(generics.ListAPIView):
    """
    Returns a list of User objects whom the target user is following.
    Uses UserSerializer for rich profile data and follow state.
    """
    serializer_class = UserSerializer
    permission_classes = [AllowAny]
    
    def get_queryset(self):
        username = self.kwargs['username']
        user = get_object_or_404(User, username__iexact=username)
        return User.objects.filter(followers__follower=user).distinct().exclude(profile__blocked_until__gt=timezone.now())

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
        user = self.request.user
        following_ids = list(Follow.objects.filter(follower=user).values_list('following_id', flat=True))
        
        # Exclusive check logic: I see my own, or I see if subscribed, or I see if PUBLIC and NOT EXCLUSIVE
        from .models import UserSubscription
        subscribed_to_ids = UserSubscription.objects.filter(
            subscriber=user, status='active'
        ).filter(
            Q(expiry_date__isnull=True) | Q(expiry_date__gt=timezone.now())
        ).values_list('creator_id', flat=True)

        # Base filters
        is_mine = Q(author=user)
        is_not_exclusive = Q(is_exclusive=False)
        is_subscribed = Q(author_id__in=subscribed_to_ids)

        return Reel.objects.filter(
            (is_not_exclusive & (Q(author__profile__is_private=False) | Q(author_id__in=following_ids))) | 
            is_mine | 
            is_subscribed
        ).filter(is_draft=False).exclude(author__profile__blocked_until__gt=timezone.now()).distinct().order_by('?')

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
        requesting_user = self.request.user
        
        # Base queryset
        queryset = Reel.objects.filter(author_id=user_id).exclude(author__profile__blocked_until__gt=timezone.now())
        
        # Check if the requesting user has access to exclusive content
        try:
            target_author = User.objects.get(id=user_id)
            can_see_exclusive = has_subscription_access(requesting_user, target_author)
        except User.DoesNotExist:
            can_see_exclusive = False
            
        if not can_see_exclusive:
            queryset = queryset.filter(is_exclusive=False)
            
        return queryset.order_by('-created_at')
        
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
            
        # Create Notification
        if reel.author != request.user:
            try:
                notif = Notification.objects.create(
                    recipient=reel.author,
                    sender=request.user,
                    notification_type='like_reel',
                    reel=reel
                )
                
                channel_layer = get_channel_layer()
                async_to_sync(channel_layer.group_send)(
                    f"user_{reel.author.id}",
                    {
                        'type': 'notification_message',
                        'data': NotificationSerializer(notif).data
                    }
                )
            except Exception as e:
                print(f"Notification error: {e}")

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
        
        # Create Notification
        if reel.author != self.request.user:
            try:
                notif = Notification.objects.create(
                    recipient=reel.author,
                    sender=self.request.user,
                    notification_type='comment_reel',
                    reel=reel
                )

                channel_layer = get_channel_layer()
                async_to_sync(channel_layer.group_send)(
                    f"user_{reel.author.id}",
                    {
                        'type': 'notification_message',
                        'data': NotificationSerializer(notif).data
                    }
                )
            except Exception as e:
                print(f"Notification error: {e}")
        
    def get_serializer_context(self): return {'request': self.request}

class RegisterReelViewView(APIView):
    """POST /api/reels/<pk>/view/ - Increment view count."""
    permission_classes = [AllowAny]
    
    def post(self, request, pk):
        try:
            reel = Reel.objects.get(pk=pk)
            
            # Prevent self-view counting
            if request.user.is_authenticated and reel.author == request.user:
                 return Response({"status": "ignored_self_view"}, status=status.HTTP_200_OK)

            # Atomic increment
            from django.db.models import F
            reel.views_count = F('views_count') + 1
            reel.save(update_fields=['views_count'])
            return Response({"status": "viewed"}, status=status.HTTP_200_OK)
        except Reel.DoesNotExist:
            return Response({"error": "Reel not found"}, status=status.HTTP_404_NOT_FOUND)

# --- Notifications Views ---
from .models import Notification
from .serializers import NotificationSerializer

class NotificationListView(generics.ListAPIView):
    """GET /api/notifications/ - List all notifications."""
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = Notification.objects.filter(recipient=self.request.user).order_by('-created_at')
        
        # Self-healing: Advanced Deduplication
        from collections import defaultdict
        grouped = defaultdict(list)
        
        all_notifs = list(qs)
        
        for notif in all_notifs:
            # Key generation
            if notif.notification_type in ['follow_request', 'req_approved', 'req_rejected']:
                key = (notif.sender_id, 'inbound_follow_workflow')
            else:
                key = (
                    notif.sender_id,
                    notif.notification_type,
                    notif.post_id or 0,
                    notif.reel_id or 0,
                    notif.story_id or 0,
                    notif.twist_id or 0,
                    notif.follow_request_ref_id or 0
                )
            grouped[key].append(notif)
            
        duplicates_to_delete = []
        
        for key, notifs in grouped.items():
            if len(notifs) > 1:
                # Resolve conflict: Prioritize Handled > Pending
                # Sort by: 
                # 1. Is Handled (Approved/Rejected) - True first
                # 2. Created At - Newest first
                
                def sort_key(n):
                    is_handled = n.notification_type in ['req_approved', 'req_rejected']
                    return (is_handled, n.created_at)

                # Python sort is stable. We want Best Last? No, we want Best at index 0?
                # reverse=True -> True (Handled) comes before False. Newest comes before Oldest.
                notifs.sort(key=sort_key, reverse=True)
                
                # Keep first, delete rest
                keep = notifs[0]
                for junk in notifs[1:]:
                    duplicates_to_delete.append(junk.id)
                    
        if duplicates_to_delete:
            from django.db import transaction
            try:
                with transaction.atomic():
                    Notification.objects.filter(id__in=duplicates_to_delete).delete()
            except Exception as e:
                print(f"Dedupe error: {e}")
            
            # Refetch to ensure clean list return
            return Notification.objects.filter(recipient=self.request.user).order_by('-created_at')
            
        return qs

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
            follow_req = notification.follow_request_ref
            
            if not follow_req:
                is_following = Follow.objects.filter(follower=notification.sender, following=notification.recipient).exists()
                
                if action == 'accept_follow':
                    if is_following:
                         notification.is_read = True
                         notification.notification_type = 'req_approved'
                         notification.save()
                         return Response({"status": "already_followed"}, status=status.HTTP_200_OK)
                    else:
                         return Response({"error": "Follow request no longer exists."}, status=status.HTTP_404_NOT_FOUND)

                elif action == 'reject_follow':
                    notification.is_read = True
                    notification.notification_type = 'req_rejected'
                    notification.save()
                    return Response({"status": "request_rejected"}, status=status.HTTP_200_OK)
            
            # Normal flow (Request exists)
            if action == 'accept_follow':
                # Capture variables needed for broadcast before deletion/save
                original_sender_id = follow_req.sender_id
                receiver_user = follow_req.receiver
                
                Follow.objects.get_or_create(follower=follow_req.sender, following=follow_req.receiver)
                follow_req.delete()
                
                notification.is_read = True
                notification.notification_type = 'req_approved'
                notification.save()
                
                from channels.layers import get_channel_layer
                from asgiref.sync import async_to_sync
                from .serializers import NotificationSerializer
                channel_layer = get_channel_layer()

                # 1. Create & BROADCAST "Follow Accept" notification back to the person who requested
                try:
                    new_notif = Notification.objects.create(
                        recipient_id=original_sender_id,
                        sender=request.user,
                        notification_type='follow_accept'
                    )
                    
                    async_to_sync(channel_layer.group_send)(
                        f"user_{original_sender_id}",
                        {
                            'type': 'notification_message',
                            'data': NotificationSerializer(new_notif, context={'request': request}).data
                        }
                    )
                except Exception as e:
                    print(f"Follow accept broadcast failed: {e}")

                # 2. BROADCAST UPDATE to current user (the acceptor) to update UI state
                try:
                     group_name = f"user_{request.user.id}"
                     data = NotificationSerializer(notification, context={'request': request}).data
                     async_to_sync(channel_layer.group_send)(
                        group_name,
                        {
                            'type': 'notification_message',
                            'data': data
                        }
                     )
                except Exception: pass

                return Response({"status": "follow_accepted"}, status=status.HTTP_200_OK)
            
            elif action == 'reject_follow':
                follow_req.delete()
                notification.is_read = True
                notification.notification_type = 'req_rejected'
                notification.save()

                # BROADCAST UPDATE
                try:
                     from channels.layers import get_channel_layer
                     from asgiref.sync import async_to_sync
                     from .serializers import NotificationSerializer
                     
                     channel_layer = get_channel_layer()
                     group_name = f"user_{request.user.id}"
                     data = NotificationSerializer(notification, context={'request': request}).data
                     
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

class MarkAllNotificationsReadView(APIView):
    """POST /api/notifications/read-all/ - Mark all unread notifications as read."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        # Update all notifications for the user
        unread_notifications = Notification.objects.filter(recipient=request.user, is_read=False)
        count = unread_notifications.count()
        unread_notifications.update(is_read=True)
        return Response({"status": "all_read", "marked_count": count}, status=status.HTTP_200_OK)


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

class SharePostView(APIView):
    """
    POST /api/posts/<id>/share/
    Body: { "user_ids": [1, 2, 5] }
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            post = Post.objects.get(pk=pk)
        except Post.DoesNotExist:
            return Response({"error": "Post not found"}, status=status.HTTP_404_NOT_FOUND)

        recipient_ids = request.data.get('user_ids', [])
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
                    content=f"Shared a post: {post.content[:20] if post.content else 'Post'}", # Fallback text
                    shared_post=post
                )
                
                # Broadcast via WebSocket
                user_ids = sorted([str(request.user.id), str(recipient.id)])
                room_group_name = f'chat_{user_ids[0]}_{user_ids[1]}'
                
                serialized_msg = ChatMessageSerializer(msg).data
                
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
                        'shared_post': msg.shared_post.id,
                        'shared_post_data': serialized_msg['shared_post_data']
                    }
                )
                created_messages.append(msg.id)

            except User.DoesNotExist:
                continue
        
        return Response({"status": "shared", "count": len(created_messages)}, status=status.HTTP_200_OK)

class ShareTwistView(APIView):
    """
    POST /api/twists/<id>/share/
    Body: { "user_ids": [1, 2, 5] }
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            twist = Twist.objects.get(pk=pk)
        except Twist.DoesNotExist:
            return Response({"error": "Twist not found"}, status=status.HTTP_404_NOT_FOUND)

        recipient_ids = request.data.get('user_ids', [])
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
                    content=f"Shared a twist: {twist.content[:20] if twist.content else 'Twist'}",
                    shared_twist=twist
                )
                
                # Broadcast via WebSocket
                user_ids = sorted([str(request.user.id), str(recipient.id)])
                room_group_name = f'chat_{user_ids[0]}_{user_ids[1]}'
                
                serialized_msg = ChatMessageSerializer(msg).data
                
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
                        'shared_twist': msg.shared_twist.id,
                        'shared_twist_data': serialized_msg['shared_twist_data']
                    }
                )
                created_messages.append(msg.id)

            except User.DoesNotExist:
                continue
        
        return Response({"status": "shared", "count": len(created_messages)}, status=status.HTTP_200_OK)

# --- 10. REPORT SYSTEM ---

from .models import Report
from .serializers import ReportSerializer

class ReportCreateView(APIView):
    """POST /api/reports/ - User submits a report"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        serializer = ReportSerializer(data=request.data)
        if serializer.is_valid():
            reported_user_id = request.data.get('reported_user')
            if not reported_user_id:
                return Response({'error': 'Reported user ID is required.'}, status=status.HTTP_400_BAD_REQUEST)
                
            try:
                reported_user = User.objects.get(id=reported_user_id)
            except User.DoesNotExist:
                return Response({'error': 'Reported user not found.'}, status=status.HTTP_404_NOT_FOUND)
                
            serializer.save(reporter=request.user, reported_user=reported_user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

# --- 11. SAVED ITEMS SYSTEM ---

class SaveToggleView(APIView):
    """
    POST /api/save/
    Body: { "type": "post"|"reel"|"twist", "id": 123 }
    Toggles saving an item.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        item_type = request.data.get('type')
        item_id = request.data.get('id')
        
        if not item_type or not item_id:
            return Response({"error": "Type and item ID are required."}, status=status.HTTP_400_BAD_REQUEST)
            
        filters = {'user': request.user}
        if item_type == 'post':
            filters['post_id'] = item_id
        elif item_type == 'reel':
            filters['reel_id'] = item_id
        elif item_type == 'twist':
            filters['twist_id'] = item_id
        else:
            return Response({"error": "Invalid item type."}, status=status.HTTP_400_BAD_REQUEST)
            
        saved_item = SavedItem.objects.filter(**filters).first()
        if saved_item:
            saved_item.delete()
            return Response({"status": "unsaved"}, status=status.HTTP_200_OK)
        else:
            SavedItem.objects.create(**filters)
            return Response({"status": "saved"}, status=status.HTTP_201_CREATED)

class SavedItemsListView(generics.ListAPIView):
    """
    GET /api/saved/?type=post
    Lists all saved items for the current user, optionally filtered by type.
    """
    serializer_class = SavedItemSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        item_type = self.request.query_params.get('type')
        queryset = SavedItem.objects.filter(user=self.request.user)
        
        if item_type == 'post':
            queryset = queryset.filter(post__isnull=False)
        elif item_type == 'reel':
            queryset = queryset.filter(reel__isnull=False)
        elif item_type == 'twist':
            queryset = queryset.filter(twist__isnull=False)
            
        return queryset.order_by('-created_at')

    def get_serializer_context(self):
        return {'request': self.request}

# ----------------------------------------------------------------------
# KEEP-ALIVE ENDPOINT (Prevents Render free-tier cold starts)
# GET /api/ping/  — No auth required, responds immediately with 200.
# The frontend pings this every 14 minutes to keep the server warm.
# ----------------------------------------------------------------------

class PingView(APIView):
    """Lightweight health-check / keep-alive endpoint. No auth required."""
    permission_classes = [AllowAny]

    def get(self, request):
        return Response({"status": "ok"}, status=status.HTTP_200_OK)

# --- 13. Withdrawal & Creator Earnings Views ---

class WithdrawalListCreateView(generics.ListCreateAPIView):
    """
    GET: List my withdrawal requests
    POST: Submit a new withdrawal request
    """
    serializer_class = WithdrawalRequestSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return WithdrawalRequest.objects.filter(creator=self.request.user).order_by('-created_at')

    def perform_create(self, serializer):
        user = self.request.user
        # Check if user is a creator
        if not hasattr(user, 'profile') or not user.profile.is_creator:
            raise serializers.ValidationError({"error": "Only creators can request withdrawals."})

        # Check Balance
        from django.db.models import Sum
        from .models import CreatorEarning
        total_earned = CreatorEarning.objects.filter(creator=user).aggregate(total=Sum('creator_amount'))['total'] or 0
        total_processed = WithdrawalRequest.objects.filter(creator=user, status__in=['pending', 'completed']).aggregate(total=Sum('amount'))['total'] or 0
        available_balance = total_earned - total_processed

        requested_amount = serializer.validated_data['amount']
        if requested_amount > available_balance:
            raise serializers.ValidationError({"error": f"Insufficient balance. Available: ₹{available_balance:.2f}"})
        
        if requested_amount < 100:
            raise serializers.ValidationError({"error": "Minimum withdrawal amount is ₹100.00"})

        # Capture current withdrawal info from profile
        payment_details = user.profile.withdrawal_info or {}
        if not payment_details:
             raise serializers.ValidationError({"error": "Please set your withdrawal information in Settings first."})

        serializer.save(creator=user, payment_details=payment_details)


class AdminWithdrawalListView(generics.ListAPIView):
    """Admin-only view to see all withdrawal requests across the platform."""
    serializer_class = WithdrawalRequestSerializer
    permission_classes = [IsAdminUser]
    queryset = WithdrawalRequest.objects.all().order_by('-created_at')


class AdminWithdrawalActionView(APIView):
    """Admin-only view to approve/complete or reject a specific request."""
    permission_classes = [IsAdminUser]

    def post(self, request, pk):
        try:
            withdrawal = WithdrawalRequest.objects.get(pk=pk)
        except WithdrawalRequest.DoesNotExist:
            return Response({"error": "Request not found"}, status=status.HTTP_404_NOT_FOUND)

        if withdrawal.status != 'pending':
            return Response({"error": "Already processed"}, status=status.HTTP_400_BAD_REQUEST)

        action_ser = AdminWithdrawalActionSerializer(data=request.data)
        if action_ser.is_valid():
            withdrawal.status = action_ser.validated_data['status']
            withdrawal.admin_note = action_ser.validated_data.get('admin_note', '')
            withdrawal.processed_at = timezone.now()
            withdrawal.save()
            return Response({"status": "success", "new_status": withdrawal.status})
        
        return Response(action_ser.errors, status=status.HTTP_400_BAD_REQUEST)


class WithdrawalTAndCView(APIView):
    """Returns fixed Terms & Conditions for creators."""
    permission_classes = [AllowAny]
    def get(self, request):
        content = [
            "1. Withdrawal processing can take 3-5 business days.",
            "2. Ensure your bank/UPI details are correct. Incorrect details may lead to loss of funds.",
            "3. Platform fee (20%) is already deducted from earnings shown in your balance.",
            "4. Minimum withdrawal amount is ₹100.",
            "5. Any fraudulent activity will lead to permanent account suspension and forfeiture of earnings."
        ]
        return Response({"terms": content})

class DeleteAccountView(APIView):
    """
    Deletes the authenticated user account and all associated data.
    Because User relies on models.CASCADE across the DB structurally,
    this securely nukes their profile, posts, history, etc.
    """
    permission_classes = [IsAuthenticated]

    def delete(self, request):
        user = request.user
        try:
            if user.is_superuser:
                return Response({"error": "Superusers cannot delete their account from the client."}, status=status.HTTP_400_BAD_REQUEST)
            user.delete()
            return Response({"status": "Account deleted successfully."}, status=status.HTTP_204_NO_CONTENT)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

class UserBlockListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from .models import UserBlock
        blocks = UserBlock.objects.filter(blocker=request.user).select_related('blocked__profile')
        results = []
        for block in blocks:
            profile = block.blocked.profile
            results.append({
                "id": block.blocked.id,
                "username": block.blocked.username,
                "display_name": f"{block.blocked.first_name} {block.blocked.last_name}".strip() or block.blocked.username,
                "profile_picture": request.build_absolute_uri(profile.profile_picture.url) if profile.profile_picture else None,
            })
        return Response(results)

class UserUnblockView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, user_id):
        from .models import UserBlock
        UserBlock.objects.filter(blocker=request.user, blocked_id=user_id).delete()
        return Response({"message": "Successfully unblocked."})
