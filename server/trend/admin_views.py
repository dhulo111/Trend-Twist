from django.db.models import Count, Q, Sum
from django.contrib.auth.models import User
from rest_framework import views, permissions, status
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from .models import Post, Twist, Reel, Comment, Hashtag, Profile, CreatorEarning, WithdrawalRequest, Story
from decimal import Decimal

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
        total_revenue = CreatorEarning.objects.aggregate(Sum('gross_amount'))['gross_amount__sum'] or Decimal('0.00')
        total_fees = CreatorEarning.objects.aggregate(Sum('platform_fee'))['platform_fee__sum'] or Decimal('0.00')
        
        from django.utils import timezone
        import datetime
        from django.utils.dateparse import parse_date
        
        # New Withdrawal Stats for Dashboard
        pending_withdrawal_sum = WithdrawalRequest.objects.filter(status='pending').aggregate(Sum('amount'))['amount__sum'] or Decimal('0.00')
        pending_withdrawal_count = WithdrawalRequest.objects.filter(status='pending').count()
        
        # Date filtering
        from_date_str = request.query_params.get('from_date')
        to_date_str = request.query_params.get('to_date')
        
        today = timezone.now().date()
        if from_date_str and to_date_str:
            from_date = parse_date(from_date_str)
            to_date = parse_date(to_date_str)
            if not from_date or not to_date or to_date < from_date:
                from_date = today - datetime.timedelta(days=6)
                to_date = today
        else:
            from_date = today - datetime.timedelta(days=6)
            to_date = today

        u_date_filter = Q(date_joined__date__gte=from_date, date_joined__date__lte=to_date)
        c_date_filter = Q(created_at__date__gte=from_date, created_at__date__lte=to_date)

        # Chart Data: Growth over selected period
        chart_data = []
        delta = (to_date - from_date).days
        for i in range(delta + 1):
            date_obj = from_date + datetime.timedelta(days=i)
            day_users = User.objects.filter(date_joined__date=date_obj).count()
            day_posts = Post.objects.filter(created_at__date=date_obj).count()
            day_reels = Reel.objects.filter(created_at__date=date_obj).count()
            day_stories = Story.objects.filter(created_at__date=date_obj).count()
            
            chart_data.append({
                'name': date_obj.strftime('%b %d'),
                'users': day_users,
                'posts': day_posts,
                'reels': day_reels,
                'stories': day_stories,
            })
            
        # Recent Activities
        recent_activities = []
        
        for u in User.objects.filter(u_date_filter).order_by('-date_joined')[:5]:
            recent_activities.append({
                'id': f"user_{u.id}",
                'type': 'user',
                'action': f"New user registered: @{u.username}",
                'time': u.date_joined.isoformat(),
                'timestamp': u.date_joined.timestamp()
            })
            
        for p in Post.objects.select_related('author').filter(c_date_filter).order_by('-created_at')[:5]:
            recent_activities.append({
                'id': f"post_{p.id}",
                'type': 'post',
                'action': f"New post published by @{p.author.username}",
                'time': p.created_at.isoformat(),
                'timestamp': p.created_at.timestamp()
            })
            
        for r in Reel.objects.select_related('author').filter(c_date_filter).order_by('-created_at')[:5]:
            recent_activities.append({
                'id': f"reel_{r.id}",
                'type': 'reel',
                'action': f"New reel shared by @{r.author.username}",
                'time': r.created_at.isoformat(),
                'timestamp': r.created_at.timestamp()
            })
            
        for s in Story.objects.select_related('author').filter(c_date_filter).order_by('-created_at')[:5]:
            recent_activities.append({
                'id': f"story_{s.id}",
                'type': 'story',
                'action': f"New story added by @{s.author.username}",
                'time': s.created_at.isoformat(),
                'timestamp': s.created_at.timestamp()
            })
            
        recent_activities.sort(key=lambda x: x['timestamp'], reverse=True)
        recent_activities = recent_activities[:10]
        
        stats = {
            'users': User.objects.filter(u_date_filter).count(),
            'posts': Post.objects.filter(c_date_filter).count(),
            'twists': Twist.objects.filter(c_date_filter).count(),
            'reels': Reel.objects.filter(c_date_filter).count(),
            'stories': Story.objects.filter(c_date_filter).count(),
            'comments': Comment.objects.filter(c_date_filter).count(),
            'hashtags': Hashtag.objects.count(),
            'total_revenue': float(total_revenue),
            'total_fees': float(total_fees),
            'pending_withdrawals_total': float(pending_withdrawal_sum),
            'pending_withdrawals_count': pending_withdrawal_count,
            'chart_data': chart_data,
            'recent_activities': recent_activities,
            'filtered_from': from_date.isoformat(),
            'filtered_to': to_date.isoformat(),
        }
        return Response(stats)

class AdminUserListView(views.APIView):
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]

    def get(self, request):
        users = User.objects.select_related('profile').all().order_by('-date_joined')
        search = request.query_params.get('search', '')
        if search:
            q_objects = Q(username__icontains=search) | Q(email__icontains=search)
            if search.isdigit():
                q_objects |= Q(id=int(search))
            users = users.filter(q_objects)
            
        paginator = AdminPagination()
        paginated_users = paginator.paginate_queryset(users, request, view=self)

        data = []
        for user in paginated_users:
            try:
                profile = user.profile
            except Profile.DoesNotExist:
                profile = None

            from django.utils import timezone
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
                    'profile_picture': profile.profile_picture.url if profile and profile.profile_picture else None,
                    'is_blocked': bool(profile and profile.blocked_until and profile.blocked_until > timezone.now()),
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
            q_objects = Q(content__icontains=search) | Q(author__username__icontains=search)
            if search.isdigit():
                q_objects |= Q(id=int(search))
            posts = posts.filter(q_objects)
            
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
            q_objects = Q(caption__icontains=search) | Q(author__username__icontains=search)
            if search.isdigit():
                q_objects |= Q(id=int(search))
            reels = reels.filter(q_objects)
            
        paginator = AdminPagination()
        paginated_reels = paginator.paginate_queryset(reels, request, view=self)

        data = []
        for reel in paginated_reels:
            data.append({
                'id': reel.id,
                'caption': getattr(reel, 'caption', ''),
                'author': reel.author.username,
                'created_at': reel.created_at,
                'media_url': reel.media_file.url if reel.media_file else None,
                'media_type': getattr(reel, 'media_type', 'video'),
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
            q_objects = Q(content__icontains=search) | Q(author__username__icontains=search)
            if search.isdigit():
                q_objects |= Q(id=int(search))
            twists = twists.filter(q_objects)
            
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
            reported_profile = getattr(report.reported_user, 'profile', None)
            is_blocked = bool(reported_profile and reported_profile.blocked_until and reported_profile.blocked_until > timezone.now())
            
            data.append({
                'id': report.id,
                'reporter': {'id': report.reporter.id, 'username': report.reporter.username},
                'reported_user': {
                    'id': report.reported_user.id, 
                    'username': report.reported_user.username,
                    'is_blocked': is_blocked
                },
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

class AdminBlockedUserListView(views.APIView):
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]

    def get(self, request):
        users = User.objects.select_related('profile').filter(profile__blocked_until__gt=timezone.now()).order_by('-profile__blocked_until')
        search = request.query_params.get('search', '')
        if search:
            q_objects = Q(username__icontains=search) | Q(email__icontains=search)
            if search.isdigit():
                q_objects |= Q(id=int(search))
            users = users.filter(q_objects)
            
        paginator = AdminPagination()
        paginated_users = paginator.paginate_queryset(users, request, view=self)

        data = []
        for user in paginated_users:
            profile = user.profile
            duration_str = profile.blocked_until.strftime("%B %d, %Y at %I:%M %p") if profile.blocked_until else None
            data.append({
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'is_staff': user.is_staff,
                'is_active': user.is_active,
                'blocked_until': duration_str,
                'block_reason': profile.block_reason,
                'profile': {
                    'is_trendsetter': profile.is_trendsetter if profile else False,
                    'is_private': profile.is_private if profile else False,
                }
            })
        return paginator.get_paginated_response(data)

class AdminUserUnblockView(views.APIView):
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]
    
    def post(self, request, user_id):
        try:
            user = User.objects.get(id=user_id)
            profile = user.profile
            profile.blocked_until = None
            profile.block_reason = ''
        except User.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

from .models import UserSubscription

class AdminSubscriptionListView(views.APIView):
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]

    def get(self, request):
        subs = UserSubscription.objects.select_related('subscriber', 'creator').all().order_by('-start_date')
        
        search = request.query_params.get('search', '')
        if search:
            q_objects = Q(subscriber__username__icontains=search) | Q(creator__username__icontains=search)
            subs = subs.filter(q_objects)

        paginator = AdminPagination()
        paginated_subs = paginator.paginate_queryset(subs, request, view=self)

        data = []
        for sub in paginated_subs:
            data.append({
                'id': sub.id,
                'subscriber': sub.subscriber.username,
                'creator': sub.creator.username,
                'tier': sub.tier,
                'status': sub.status,
                'start_date': sub.start_date,
                'expiry_date': sub.expiry_date,
            })
        return paginator.get_paginated_response(data)
