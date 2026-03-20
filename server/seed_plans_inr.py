import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'trend_twist_api.settings')
django.setup()

from trend.models import SubscriptionPlan
from decimal import Decimal

# Clear old plans before seeding new ones
SubscriptionPlan.objects.all().delete()
print("Cleared existing plans.")

plans = [
    {
        'tier': 'basic',
        'price': Decimal('99.00'),
        'features': 'Access to exclusive posts, Supporter badge on profile, Early content access',
        'is_active': True
    },
    {
        'tier': 'pro',
        'price': Decimal('499.00'),
        'features': 'All Basic perks, Exclusive Reels & Stories, Priority DMs, Pro supporter badge',
        'is_active': True
    },
    {
        'tier': 'elite',
        'price': Decimal('999.00'),
        'features': 'All Pro perks, Exclusive Twists feed, 1-on-1 shoutouts, Elite crown badge, Behind-the-scenes content',
        'is_active': True
    }
]

for p in plans:
    plan, created = SubscriptionPlan.objects.get_or_create(
        tier=p['tier'],
        defaults={
            'price': p['price'],
            'features': p['features'],
            'is_active': p['is_active']
        }
    )
    if not created:
        plan.price = p['price']
        plan.features = p['features']
        plan.is_active = p['is_active']
        plan.save()
    print(f"Plan seeded: {plan.tier} at ₹{plan.price}")

print("Seeding complete.")
