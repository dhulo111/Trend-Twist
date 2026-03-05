from django.db.models import Count, Q
from django.contrib.auth.models import User
from rest_framework import views, permissions, status
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from .models import Post, Twist, Reel, Comment, Hashtag, Profile

class IsAdminUser(permissions.BasePermission):
    """
    Allows access only to admin users.
    """
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_staff)

class AdminPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100

class AdminDashboardStatsView(views.APIView):
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]

    def get(self, request):
        stats = {
            'users': User.objects.count(),
            'posts': Post.objects.count(),
            'twists': Twist.objects.count(),
            'reels': Reel.objects.count(),
            'comments': Comment.objects.count(),
            'hashtags': Hashtag.objects.count(),
        }
        return Response(stats)

class AdminUserListView(views.APIView):
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]

    def get(self, request):
        users = User.objects.select_related('profile').all().order_by('-date_joined')
        search = request.query_params.get('search', '')
        if search:
            users = users.filter(Q(username__icontains=search) | Q(email__icontains=search))
            
        paginator = AdminPagination()
        paginated_users = paginator.paginate_queryset(users, request, view=self)

        data = []
        for user in paginated_users:
            try:
                profile = user.profile
            except Profile.DoesNotExist:
                profile = None

            data.append({
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'is_staff': user.is_staff,
                'is_active': user.is_active,
                'date_joined': user.date_joined,
                'profile': {
                    'is_trendsetter': profile.is_trendsetter if profile else False,
                    'is_private': profile.is_private if profile else False,
                }
            })
        return paginator.get_paginated_response(data)

class AdminUserActionView(views.APIView):
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]

    def delete(self, request, user_id):
        try:
            user = User.objects.get(id=user_id)
            if user.is_superuser:
                return Response({"detail": "Cannot delete superuser."}, status=status.HTTP_400_BAD_REQUEST)
            user.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except User.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

    def patch(self, request, user_id):
        try:
            user = User.objects.get(id=user_id)
            action = request.data.get('action')
            
            if action == 'toggle_active':
                if user.is_superuser:
                    return Response({"detail": "Cannot toggle active status of superuser."}, status=status.HTTP_400_BAD_REQUEST)
                user.is_active = not user.is_active
                user.save()
            elif action == 'toggle_trendsetter':
                profile, _ = Profile.objects.get_or_create(user=user)
                profile.is_trendsetter = not profile.is_trendsetter
                profile.save()
            
            return Response({'status': 'success'}, status=status.HTTP_200_OK)
        except User.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

class AdminPostListView(views.APIView):
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]

    def get(self, request):
        posts = Post.objects.select_related('author').prefetch_related('hashtags').all().order_by('-created_at')
        search = request.query_params.get('search', '')
        if search:
            posts = posts.filter(Q(content__icontains=search) | Q(author__username__icontains=search))
            
        paginator = AdminPagination()
        paginated_posts = paginator.paginate_queryset(posts, request, view=self)

        data = []
        for post in paginated_posts:
            data.append({
                'id': post.id,
                'content': post.content,
                'author': post.author.username,
                'created_at': post.created_at,
                'media_url': post.media_file.url if post.media_file else None,
                'is_private': getattr(post, 'is_private', False), 
            })
        return paginator.get_paginated_response(data)

class AdminPostActionView(views.APIView):
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]

    def delete(self, request, post_id):
        try:
            post = Post.objects.get(id=post_id)
            post.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except Post.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

class AdminReelListView(views.APIView):
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]

    def get(self, request):
        reels = Reel.objects.select_related('author').all().order_by('-created_at')
        search = request.query_params.get('search', '')
        if search:
            reels = reels.filter(Q(caption__icontains=search) | Q(author__username__icontains=search))
            
        paginator = AdminPagination()
        paginated_reels = paginator.paginate_queryset(reels, request, view=self)

        data = []
        for reel in paginated_reels:
            data.append({
                'id': reel.id,
                'caption': getattr(reel, 'caption', ''),
                'author': reel.author.username,
                'created_at': reel.created_at,
                'media_url': reel.video_file.url if reel.video_file else None,
            })
        return paginator.get_paginated_response(data)

class AdminReelActionView(views.APIView):
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]

    def delete(self, request, reel_id):
        try:
            reel = Reel.objects.get(id=reel_id)
            reel.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except Reel.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

class AdminTwistListView(views.APIView):
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]

    def get(self, request):
        twists = Twist.objects.select_related('author').all().order_by('-created_at')
        search = request.query_params.get('search', '')
        if search:
            twists = twists.filter(Q(content__icontains=search) | Q(author__username__icontains=search))
            
        paginator = AdminPagination()
        paginated_twists = paginator.paginate_queryset(twists, request, view=self)

        data = []
        for twist in paginated_twists:
            data.append({
                'id': twist.id,
                'content': twist.content,
                'author': twist.author.username,
                'created_at': twist.created_at,
                'media_url': twist.media_file.url if twist.media_file else None,
            })
        return paginator.get_paginated_response(data)

class AdminTwistActionView(views.APIView):
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]

    def delete(self, request, twist_id):
        try:
            twist = Twist.objects.get(id=twist_id)
            twist.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except Twist.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

from .models import Report
from django.utils import timezone
import datetime

class AdminReportListView(views.APIView):
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]

    def get(self, request):
        reports = Report.objects.select_related('reporter', 'reported_user').all().order_by('-created_at')
        status_filter = request.query_params.get('status', '')
        if status_filter:
            reports = reports.filter(status=status_filter)
            
        paginator = AdminPagination()
        paginated_reports = paginator.paginate_queryset(reports, request, view=self)

        data = []
        for report in paginated_reports:
            data.append({
                'id': report.id,
                'reporter': {'id': report.reporter.id, 'username': report.reporter.username},
                'reported_user': {'id': report.reported_user.id, 'username': report.reported_user.username},
                'post_id': report.post_id,
                'reel_id': report.reel_id,
                'twist_id': report.twist_id,
                'reason': report.reason,
                'status': report.status,
                'created_at': report.created_at,
            })
        return paginator.get_paginated_response(data)

class AdminReportActionView(views.APIView):
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]
    
    def patch(self, request, report_id):
        try:
            report = Report.objects.get(id=report_id)
            new_status = request.data.get('status')
            if new_status in dict(Report.STATUS_CHOICES):
                report.status = new_status
                report.save()
                return Response({'status': 'success'})
            return Response({'error': 'Invalid status'}, status=status.HTTP_400_BAD_REQUEST)
        except Report.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)
            
class AdminUserBlockView(views.APIView):
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]
    
    def post(self, request, user_id):
        try:
            user = User.objects.get(id=user_id)
            if user.is_superuser:
                return Response({'error': 'Cannot block a superuser.'}, status=status.HTTP_400_BAD_REQUEST)
                
            duration = request.data.get('duration') # '1', '5', '7', 'permanent'
            reason = request.data.get('reason', '')
            
            profile = user.profile
            if duration == 'permanent':
                profile.blocked_until = timezone.now() + datetime.timedelta(days=365*100) # Effectively permanent
            elif duration in ['1', '5', '7']:
                profile.blocked_until = timezone.now() + datetime.timedelta(days=int(duration))
            else:
                return Response({'error': 'Invalid block duration.'}, status=status.HTTP_400_BAD_REQUEST)
                
            profile.block_reason = reason
            profile.save()
            
            # Optionally, mark related pending reports as resolved
            Report.objects.filter(reported_user=user, status='pending').update(status='resolved')
            
            return Response({'status': 'user blocked', 'blocked_until': profile.blocked_until})
        except User.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

