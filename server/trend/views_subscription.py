import stripe
from decimal import Decimal
from django.conf import settings
from django.utils import timezone
from django.db.models import Sum, Q
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from django.shortcuts import get_object_or_404
from django.contrib.auth.models import User
from .models import SubscriptionPlan, UserSubscription, CreatorEarning, WithdrawalRequest
from .serializers import SubscriptionPlanSerializer, UserSubscriptionSerializer
from rest_framework_simplejwt.authentication import JWTAuthentication
import datetime

PLATFORM_FEE_PERCENT = Decimal('0.20')  # 20% admin cut
CREATOR_SHARE_PERCENT = Decimal('0.80')  # 80% to creator

stripe.api_key = getattr(settings, 'STRIPE_SECRET_KEY', '')


# ─────────────────────────────────────────────
# PUBLIC: View Global Plans
# ─────────────────────────────────────────────
class GlobalPlansView(APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def get(self, request):
        plans = SubscriptionPlan.objects.filter(is_active=True).order_by('price')
        serializer = SubscriptionPlanSerializer(plans, many=True)
        return Response(serializer.data)


# ─────────────────────────────────────────────
# ADMIN: Manage Global Plans
# ─────────────────────────────────────────────
class AdminGlobalPlansView(APIView):
    permission_classes = [permissions.IsAuthenticated, permissions.IsAdminUser]

    def get(self, request):
        plans = SubscriptionPlan.objects.all().order_by('price')
        return Response(SubscriptionPlanSerializer(plans, many=True).data)

    def post(self, request):
        tier = request.data.get('tier')
        price = request.data.get('price')
        features = request.data.get('features', '')
        if not tier or not price:
            return Response({'error': 'tier and price are required.'}, status=status.HTTP_400_BAD_REQUEST)
        
        plan, created = SubscriptionPlan.objects.get_or_create(
            tier=tier,
            defaults={'price': price, 'features': features, 'is_active': True}
        )
        if not created:
            plan.price = price
            plan.features = features
            plan.is_active = True
            plan.save()
        return Response(SubscriptionPlanSerializer(plan).data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)

    def delete(self, request):
        tier = request.data.get('tier')
        if not tier:
            return Response({'error': 'tier is required.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            plan = SubscriptionPlan.objects.get(tier=tier)
            plan.is_active = False
            plan.save()
            return Response({'status': 'plan deactivated'})
        except SubscriptionPlan.DoesNotExist:
            return Response({'error': 'Plan not found.'}, status=status.HTTP_404_NOT_FOUND)


# ─────────────────────────────────────────────
# CREATOR: View Own Earnings Outline
# ─────────────────────────────────────────────
class MyCreatorEarningsView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        creator = request.user
        earnings = CreatorEarning.objects.filter(creator=creator).order_by('-created_at')
        withdrawals = WithdrawalRequest.objects.filter(creator=creator).order_by('-created_at')

        total_gross = earnings.aggregate(t=Sum('gross_amount'))['t'] or Decimal('0')
        total_platform = earnings.aggregate(t=Sum('platform_fee'))['t'] or Decimal('0')
        total_creator = earnings.aggregate(t=Sum('creator_amount'))['t'] or Decimal('0')
        
        # Balance = total_creator - (completed + pending withdrawals)
        total_processed_withdrawals = withdrawals.filter(status__in=['pending', 'completed']).aggregate(t=Sum('amount'))['t'] or Decimal('0')
        available_balance = total_creator - total_processed_withdrawals
        
        total_completed_withdrawn = withdrawals.filter(status='completed').aggregate(t=Sum('amount'))['t'] or Decimal('0')

        earnings_data = [{
            'id': e.id,
            'subscriber': e.subscriber.username if e.subscriber else 'deleted',
            'tier': e.tier,
            'gross_amount': str(e.gross_amount),
            'platform_fee': str(e.platform_fee),
            'creator_amount': str(e.creator_amount),
            'date': e.created_at.isoformat(),
        } for e in earnings[:20]]

        return Response({
            'total_gross': str(total_gross),
            'platform_fee_total': str(total_platform),
            'creator_earnings_total': str(total_creator),
            'available_balance': str(available_balance),
            'total_withdrawn': str(total_completed_withdrawn),
            'recent_transactions': earnings_data,
            'withdrawal_info': creator.profile.withdrawal_info,
            'terms': 'Platform fee (20%) is already deducted. Withdrawals take 3-5 days. Minimum ₹100.'
        })


# ─────────────────────────────────────────────
# STRIPE: Create Checkout Session
# All payments go to the ADMIN's Stripe account
# ─────────────────────────────────────────────
class CreateCheckoutSessionView(APIView):
    def post(self, request):
        plan_id = request.data.get('plan_id')
        creator_username = request.data.get('creator_username')
        
        if not plan_id or not creator_username:
            return Response({'error': 'plan_id and creator_username are required.'}, status=status.HTTP_400_BAD_REQUEST)

        stripe.api_key = getattr(settings, 'STRIPE_SECRET_KEY', '')
        plan = get_object_or_404(SubscriptionPlan, id=plan_id)
        creator = get_object_or_404(User, username=creator_username)
        origin = request.headers.get('origin', 'http://localhost:5173')

        try:
            line_item = (
                [{'price': plan.stripe_price_id, 'quantity': 1}]
                if plan.stripe_price_id else
                [{
                    'price_data': {
                        'currency': 'inr',
                        'product_data': {'name': f"Subscribe to {creator.username} - {plan.tier.capitalize()} Tier"},
                        'unit_amount': int(plan.price * 100),
                        'recurring': {'interval': 'month'},
                    },
                    'quantity': 1,
                }]
            )
            session = stripe.checkout.Session.create(
                payment_method_types=['card'],
                line_items=line_item,
                mode='subscription',
                success_url=f'{origin}/success?session_id={{CHECKOUT_SESSION_ID}}',
                cancel_url=f'{origin}/profile/{creator.username}/subscribe',
                metadata={
                    'subscriber_id': str(request.user.id),
                    'plan_id': str(plan.id),
                    'creator_id': str(creator.id),
                    'tier': plan.tier,
                    'plan_price': str(plan.price),
                }
            )
            return Response({'checkout_url': session.url})
        except stripe.error.StripeError as e:
            return Response({'error': f'Stripe Error: {str(e)}'}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({'error': f'Checkout Creation Error ({type(e).__name__}): {str(e)}'}, status=status.HTTP_400_BAD_REQUEST)

# Helper for both Webhook and Manual Verification
def activate_subscription_from_session(session):
    """
    Shared logic to upsert UserSubscription and record earnings from a Stripe Session.
    Returns (True, "msg") or (False, "err_msg")
    """
    # Access metadata from the session object safely (works for both dict and Stripe Object)
    if isinstance(session, dict):
        meta = session.get('metadata') or {}
    else:
        meta = getattr(session, 'metadata', {}) or {}
    
    subscriber_id_str = meta.get('subscriber_id')
    creator_id_str = meta.get('creator_id')
    plan_id_str = meta.get('plan_id')
    tier = meta.get('tier')
    plan_price_str = meta.get('plan_price', '0')

    # Extremely thorough key check
    if not (subscriber_id_str and creator_id_str):
        keys = list(meta.keys()) if meta else "Empty"
        return False, f"Metadata missing mandatory IDs. Found Keys: {keys}. Session ID: {getattr(session, 'id', 'unknown')}"

    try:
        s_id = int(subscriber_id_str)
        c_id = int(creator_id_str)
        p_id = int(plan_id_str) if plan_id_str else None
        plan_price = Decimal(plan_price_str)
    except (ValueError, TypeError) as e:
        return False, f"Type Conversion Error. Meta: {meta}. Err: {str(e)}"

    stripe_sub_id = session.get('subscription') if isinstance(session, dict) else getattr(session, 'subscription', None)
    if not stripe_sub_id:
        return False, "Session does not contain a subscription ID (ensure checkout mode is 'subscription')"

    try:
        # Upsert subscription record
        sub, created = UserSubscription.objects.get_or_create(
            subscriber_id=s_id,
            creator_id=c_id,
            defaults={
                'plan_id': p_id, 'tier': tier,
                'stripe_subscription_id': stripe_sub_id,
                'status': 'active',
                'expiry_date': timezone.now() + datetime.timedelta(days=30)
            }
        )
        if not created:
            sub.plan_id = p_id
            sub.tier = tier
            sub.stripe_subscription_id = stripe_sub_id
            sub.status = 'active'
            sub.expiry_date = timezone.now() + datetime.timedelta(days=30)
            sub.save()

        # Record earnings split
        if isinstance(session, dict):
            pi = session.get('payment_intent')
            session_id = session.get('id')
        else:
            pi = getattr(session, 'payment_intent', None)
            session_id = getattr(session, 'id', None)
            
        dedupe_marker = pi or session_id
        
        if dedupe_marker:
            if not CreatorEarning.objects.filter(Q(stripe_payment_intent=dedupe_marker)).exists():
                 _record_earning_helper(
                    creator_id=c_id,
                    subscriber_id=s_id,
                    subscription=sub,
                    tier=tier,
                    gross=plan_price,
                    payment_intent=dedupe_marker,
                )
        return True, "Activation Successful"
    except Exception as e:
        return False, f"Database error during activation: {str(e)}"

def _record_earning_helper(creator_id, subscriber_id, subscription, tier, gross, payment_intent=None):
    if gross <= 0: return
    platform_fee = (gross * Decimal('0.20')).quantize(Decimal('0.01'))
    creator_amount = (gross * Decimal('0.80')).quantize(Decimal('0.01'))
    CreatorEarning.objects.create(
        creator_id=creator_id,
        subscriber_id=subscriber_id,
        subscription=subscription,
        tier=tier,
        gross_amount=gross,
        platform_fee=platform_fee,
        creator_amount=creator_amount,
        stripe_payment_intent=payment_intent,
    )

class VerifySubscriptionView(APIView):
    """
    GET /api/subscriptions/verify/?session_id=...
    Manual fallback to verify payment success in case webhooks are delayed.
    Allows unauthenticated access because the session_id is our shared secret.
    """
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def get(self, request):
        session_id = request.query_params.get('session_id')
        if not session_id:
            return Response({'error': 'Session ID is missing from the request.'}, status=status.HTTP_400_BAD_REQUEST)

        # Force key refresh from settings
        api_key = getattr(settings, 'STRIPE_SECRET_KEY', '')
        if not api_key:
            return Response({'error': 'Stripe Secret Key is not configured on the server.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
        try:
            stripe.api_key = api_key
            session = stripe.checkout.Session.retrieve(session_id)
            
            if session.payment_status == 'paid':
                success, reason = activate_subscription_from_session(session)
                if success:
                    return Response({'status': 'success', 'message': 'Subscription verified and activated.'})
                return Response({'error': f'Activation failed: {reason}'}, status=status.HTTP_400_BAD_REQUEST)
            
            return Response({'status': 'pending', 'message': f'Payment status: {session.payment_status}'})
        except stripe.error.StripeError as e:
            return Response({'error': f'Stripe Error: {str(e)}'}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({'error': f'Unexpected Error ({type(e).__name__}): {str(e)}'}, status=status.HTTP_400_BAD_REQUEST)

class DebugStatsView(APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []
    def get(self, request):
        return Response({
            'earnings_count': CreatorEarning.objects.count(),
            'subscriptions_count': UserSubscription.objects.count(),
            'plans_count': SubscriptionPlan.objects.count(),
            'earnings_sample': list(CreatorEarning.objects.values().order_by('-created_at')[:5])
        })

class PeekSessionView(APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []
    def get(self, request):
        session_id = request.query_params.get('session_id')
        if not session_id: return Response({'error': 'no id'})
        stripe.api_key = settings.STRIPE_SECRET_KEY
        session = stripe.checkout.Session.retrieve(session_id)
        return Response(session)


# ─────────────────────────────────────────────
# STRIPE: Webhook Handler
# ─────────────────────────────────────────────
class StripeWebhookView(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        payload = request.body
        sig_header = request.headers.get('STRIPE_SIGNATURE') or request.headers.get('Stripe-Signature')
        endpoint_secret = getattr(settings, 'STRIPE_WEBHOOK_SECRET', '')

        try:
            if endpoint_secret:
                event = stripe.Webhook.construct_event(payload, sig_header, endpoint_secret)
            else:
                import json
                event = stripe.Event.construct_from(json.loads(payload), stripe.api_key)
        except Exception:
            return Response(status=status.HTTP_400_BAD_REQUEST)

        if event['type'] == 'checkout.session.completed':
            self.handle_checkout_session(event['data']['object'])
        elif event['type'] == 'customer.subscription.deleted':
            self.handle_cancel_subscription(event['data']['object'])
        elif event['type'] == 'invoice.payment_failed':
            self.handle_payment_failed(event['data']['object'])
        elif event['type'] == 'invoice.payment_succeeded':
            # Fires on every renewal — record recurring earnings
            self.handle_invoice_paid(event['data']['object'])

        return Response({'status': 'success'})

    def handle_checkout_session(self, session):
        activate_subscription_from_session(session)

    def handle_invoice_paid(self, invoice):
        """Fired on every monthly renewal — record recurring earnings."""
        stripe_sub_id = invoice.get('subscription')
        amount_paid = Decimal(str(invoice.get('amount_paid', 0))) / 100
        if not stripe_sub_id or amount_paid <= 0:
            return
        try:
            sub = UserSubscription.objects.get(stripe_subscription_id=stripe_sub_id)
            sub.expiry_date = timezone.now() + datetime.timedelta(days=30)
            sub.status = 'active'
            sub.save()
            _record_earning_helper(
                creator_id=sub.creator_id,
                subscriber_id=sub.subscriber_id,
                subscription=sub,
                tier=sub.tier,
                gross=amount_paid,
                payment_intent=invoice.get('payment_intent'),
            )
        except UserSubscription.DoesNotExist:
            pass

    def handle_cancel_subscription(self, subscription_obj):
        stripe_sub_id = subscription_obj.get('id')
        try:
            sub = UserSubscription.objects.get(stripe_subscription_id=stripe_sub_id)
            sub.status = 'canceled'
            sub.save()
        except UserSubscription.DoesNotExist:
            pass

    def handle_payment_failed(self, invoice_obj):
        stripe_sub_id = invoice_obj.get('subscription')
        if stripe_sub_id:
            try:
                sub = UserSubscription.objects.get(stripe_subscription_id=stripe_sub_id)
                sub.status = 'past_due'
                sub.save()
            except UserSubscription.DoesNotExist:
                pass

    def _record_earning(self, creator_id, subscriber_id, subscription, tier, gross, payment_intent=None):
        """Compute 20/80 split and save CreatorEarning record."""
        if gross <= 0:
            return
        platform_fee = (gross * PLATFORM_FEE_PERCENT).quantize(Decimal('0.01'))
        creator_amount = (gross * CREATOR_SHARE_PERCENT).quantize(Decimal('0.01'))
        CreatorEarning.objects.create(
            creator_id=creator_id,
            subscriber_id=subscriber_id,
            subscription=subscription,
            tier=tier,
            gross_amount=gross,
            platform_fee=platform_fee,
            creator_amount=creator_amount,
            stripe_payment_intent=payment_intent,
        )


# ─────────────────────────────────────────────
# SUBSCRIBER: My Subscriptions
# ─────────────────────────────────────────────
class MySubscriptionsView(APIView):
    def get(self, request):
        subs = UserSubscription.objects.filter(subscriber=request.user)
        return Response(UserSubscriptionSerializer(subs, many=True).data)


# ─────────────────────────────────────────────
# SUBSCRIBER: Stripe Billing Portal
# ─────────────────────────────────────────────
class CreateBillingPortalSessionView(APIView):
    def post(self, request):
        origin = request.headers.get('origin', 'http://localhost:5173')
        sub = UserSubscription.objects.filter(
            subscriber=request.user, stripe_subscription_id__isnull=False
        ).first()
        if not sub:
            return Response({'error': 'No active Stripe subscription found.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            stripe.api_key = getattr(settings, 'STRIPE_SECRET_KEY', '')
            stripe_sub = stripe.Subscription.retrieve(sub.stripe_subscription_id)
            portal_session = stripe.billing_portal.Session.create(
                customer=stripe_sub.customer,
                return_url=f'{origin}/settings'
            )
            return Response({'url': portal_session.url})
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


# ─────────────────────────────────────────────
# ADMIN: Earnings Overview (per creator)
# ─────────────────────────────────────────────
class AdminEarningsView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [permissions.IsAuthenticated, permissions.IsAdminUser]

    def get(self, request):
        creators = User.objects.filter(earnings__isnull=False).distinct()
        data = []
        for creator in creators:
            earnings = CreatorEarning.objects.filter(creator=creator)
            total_gross = earnings.aggregate(t=Sum('gross_amount'))['t'] or Decimal('0')
            total_platform = earnings.aggregate(t=Sum('platform_fee'))['t'] or Decimal('0')
            total_creator = earnings.aggregate(t=Sum('creator_amount'))['t'] or Decimal('0')
            
            # Use WithdrawalRequest instead of CreatorPayout
            total_withdrawn = WithdrawalRequest.objects.filter(creator=creator, status='completed').aggregate(
                t=Sum('amount'))['t'] or Decimal('0')
            total_pending = WithdrawalRequest.objects.filter(creator=creator, status='pending').aggregate(
                t=Sum('amount'))['t'] or Decimal('0')
                
            data.append({
                'creator_id': creator.id,
                'creator_username': creator.username,
                'total_gross': str(total_gross),
                'platform_fee_total': str(total_platform),
                'creator_earnings_total': str(total_creator),
                'total_withdrawn': str(total_withdrawn),
                'pending_payout': str(total_pending),
                'transaction_count': earnings.count(),
            })
        platform_total = CreatorEarning.objects.aggregate(t=Sum('platform_fee'))['t'] or Decimal('0')
        gross_total = CreatorEarning.objects.aggregate(t=Sum('gross_amount'))['t'] or Decimal('0')
        return Response({
            'creators': data,
            'platform_total_revenue': str(gross_total),
            'platform_total_fee_collected': str(platform_total),
        })


# ─────────────────────────────────────────────
# ADMIN: Creator Earnings Detail + Payout
# ─────────────────────────────────────────────
class AdminCreatorPayoutView(APIView):
    permission_classes = [permissions.IsAuthenticated, permissions.IsAdminUser]

    def get(self, request, creator_id):
        """Get full earnings history and withdrawal requests for a specific creator."""
        creator = get_object_or_404(User, id=creator_id)
        earnings = CreatorEarning.objects.filter(creator=creator).order_by('-created_at')
        withdrawals = WithdrawalRequest.objects.filter(creator=creator).order_by('-created_at')

        earnings_data = [{
            'id': e.id,
            'subscriber': e.subscriber.username if e.subscriber else 'deleted',
            'tier': e.tier,
            'gross_amount': str(e.gross_amount),
            'platform_fee': str(e.platform_fee),
            'creator_amount': str(e.creator_amount),
            'date': e.created_at.isoformat(),
        } for e in earnings]

        withdrawals_data = [{
            'id': w.id,
            'amount': str(w.amount),
            'status': w.status,
            'payment_method': w.payment_method,
            'created_at': w.created_at.isoformat(),
            'processed_at': w.processed_at.isoformat() if w.processed_at else None,
        } for w in withdrawals]

        total_earned = earnings.aggregate(t=Sum('creator_amount'))['t'] or Decimal('0')
        total_withdrawn = WithdrawalRequest.objects.filter(creator=creator, status='completed').aggregate(t=Sum('amount'))['t'] or Decimal('0')

        return Response({
            'creator': creator.username,
            'earnings': earnings_data,
            'withdrawals': withdrawals_data,
            'total_earned': str(total_earned),
            'total_withdrawn': str(total_withdrawn),
            'available_balance': str(max(total_earned - total_withdrawn, Decimal('0'))),
        })

class CreatorSubscribersListView(APIView):
    """
    Lists all active subscribers for a creator.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, username):
        creator = get_object_or_404(User, username__iexact=username)
        # In a real app, you might restrict this to the creator or following logic.
        # For now, we'll allow viewing if the account is public or follow-linked.
        active_subs = UserSubscription.objects.filter(creator=creator, status='active').select_related('subscriber', 'subscriber__profile')
        
        # We can reuse UserSerializer (imported from .serializers if possible)
        from .serializers import UserSerializer
        subscribers = [sub.subscriber for sub in active_subs]
        serializer = UserSerializer(subscribers, many=True, context={'request': request})
        return Response(serializer.data)
