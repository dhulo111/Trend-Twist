# backend/api/urls.py

from django.urls import path, include # Added 'include' for the API grouping
from rest_framework_simplejwt.views import TokenRefreshView # Re-added for session refresh
from . import views

urlpatterns = [
    # ----------------------------------------------------------------------
    # 1. AUTHENTICATION & SESSIONS
    # ----------------------------------------------------------------------
    
    # JWT Refresh (Re-added for session persistence)
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'), 
    
    # OTP & Google Auth
    path('auth/google/', views.GoogleLoginView.as_view(), name='google_login'),
    path('auth/login/request-otp/', views.RequestLoginOTPView.as_view(), name='request_login_otp'),
    path('auth/login/verify-otp/', views.VerifyLoginOTPView.as_view(), name='verify_login_otp'),
    path('auth/register/request-otp/', views.RequestRegisterOTPView.as_view(), name='request_register_otp'),
    path('auth/register/verify-only-otp/', views.VerifyOnlyOTPView.as_view(), name='verify_only_otp'),
    path('auth/register/complete/', views.CompleteRegistrationView.as_view(), name='complete_registration'),


    # ----------------------------------------------------------------------
    # 2. USER, PROFILE & SEARCH
    # ----------------------------------------------------------------------
    
    # Profile Management
    path('user/', views.CurrentUserProfileView.as_view(), name='current_user_profile'),
    path('profile/update/', views.ProfileUpdateView.as_view(), name='profile_update'),
    path('profiles/<str:username>/', views.UserProfileDetailView.as_view(), name='user_profile_detail'),
    path('users/<int:user_id>/posts/', views.UserPostListView.as_view(), name='user_posts_list'),
    
    # Live User Search (NEW)
    path('users/search/', views.UserSearchView.as_view(), name='user_search'),


    # ----------------------------------------------------------------------
    # 3. FOLLOW & REQUESTS (Private Accounts)
    # ----------------------------------------------------------------------

    # Toggle Follow/Send Request
    path('users/<int:pk>/follow/', views.FollowToggleView.as_view(), name='follow_toggle'),
    
    # Follower/Following Lists
    path('profiles/<str:username>/followers/', views.FollowerListView.as_view(), name='follower_list'),
    path('profiles/<str:username>/following/', views.FollowingListView.as_view(), name='following_list'),

    # Follow Request Inbox (NEW)
    path('requests/', views.FollowRequestListView.as_view(), name='follow_request_list'),
    path('requests/<int:pk>/<str:action>/', views.FollowRequestActionView.as_view(), name='follow_request_action'),
    

    # ----------------------------------------------------------------------
    # 4. LIVE CHAT (Inbox & Detail)
    # ----------------------------------------------------------------------

    # Inbox List
    path('chats/', views.ChatRoomListView.as_view(), name='chat_inbox'),
    
    # Chat History/Room Detail (Uses user ID to identify the conversation partner)
    # Chat History/Room Detail (Uses user ID to identify the conversation partner)
    path('chats/<int:user_id>/', views.ChatRoomDetailView.as_view(), name='chat_detail'),
    
    # Group Chat (NEW)
    path('groups/', views.ChatGroupListView.as_view(), name='group_list'),
    path('groups/<int:pk>/', views.ChatGroupDetailView.as_view(), name='group_detail'),
    path('groups/<int:pk>/messages/', views.ChatGroupMessageListView.as_view(), name='group_messages'),


    # ----------------------------------------------------------------------
    # 5. CONTENT (Posts, Stories, Trends)
    # ----------------------------------------------------------------------

    # Posts
    path('posts/', views.PostListCreateView.as_view(), name='post_list_create'),
    path('posts/public/', views.PublicPostListView.as_view(), name='public_post_list'),
    path('posts/<int:pk>/', views.PostDetailView.as_view(), name='post_detail'),
    
    # Engagement
    path('posts/<int:pk>/like/', views.LikeToggleView.as_view(), name='like_toggle'),
    path('posts/<int:pk>/comments/', views.CommentListCreateView.as_view(), name='comment_list_create'),
    path('comments/<int:pk>/', views.CommentDetailView.as_view(), name='comment_detail'),
    path('posts/<int:post_id>/twists/', views.PostTwistListView.as_view(), name='post_twists_list'),
    path('posts/<int:pk>/share/', views.SharePostView.as_view(), name='share_post'),

    # Twists (Standalone)
    path('twists/', views.TwistListCreateView.as_view(), name='twist_list_create_standalone'),
    path('twists/public/', views.PublicTwistListView.as_view(), name='public_twist_list'),
    path('twists/<int:pk>/', views.TwistDetailView.as_view(), name='twist_detail'),
    path('twists/<int:pk>/like/', views.TwistLikeToggleView.as_view(), name='twist_like'),
    path('users/<int:user_id>/twists/', views.UserTwistListView.as_view(), name='user_twist_list'),
    path('twists/<int:pk>/comments/', views.TwistCommentListCreateView.as_view(), name='twist_comment_list_create'),
    path('twist-comments/<int:pk>/', views.TwistCommentDetailView.as_view(), name='twist_comment_detail'),
    path('twists/<int:pk>/share/', views.ShareTwistView.as_view(), name='share_twist'),

    # Stories
    path('stories/', views.StoryListCreateView.as_view(), name='story_list_create'),
    path('stories/<int:story_id>/view/', views.RegisterStoryView.as_view(), name='register_story_view'),
    path('stories/<int:pk>/', views.StoryDetailDeleteView.as_view(), name='story_delete'),
    path('stories/user/<int:user_id>/', views.UserStoryListView.as_view(), name='user_story_list'),
    path('stories/<int:pk>/like/', views.StoryLikeToggleView.as_view(), name='story_like_toggle'),
    path('messages/send/', views.SendMessageView.as_view(), name='send_message'),

path('stories/<int:story_id>/analytics/', views.StoryAnalyticsView.as_view(), name='story_analytics'),
    # Trends
    path('trends/hashtags/', views.TrendingHashtagsView.as_view(), name='trending_hashtags'),

    # Reels
    path('reels/', views.ReelListCreateView.as_view(), name='reel_list_create'),
    path('reels/<int:pk>/', views.ReelDetailView.as_view(), name='reel_detail'),
    path('reels/user/<int:user_id>/', views.UserReelListView.as_view(), name='user_reel_list'),
    path('reels/<int:pk>/like/', views.ReelLikeToggleView.as_view(), name='reel_like_toggle'),
    path('reels/<int:pk>/comments/', views.ReelCommentListCreateView.as_view(), name='reel_comment_list_create'),
    path('reels/<int:pk>/share/', views.ShareReelView.as_view(), name='share_reel'),
    path('reels/<int:pk>/view/', views.RegisterReelViewView.as_view(), name='register_reel_view'),

    # ----------------------------------------------------------------------
    # 6. NOTIFICATIONS
    # ----------------------------------------------------------------------
    path('notifications/', views.NotificationListView.as_view(), name='notification_list'),
    path('notifications/<int:pk>/<str:action>/', views.NotificationActionView.as_view(), name='notification_action'),
]