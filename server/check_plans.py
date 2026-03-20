import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'trend_twist_api.settings')
django.setup()

from trend.models import SubscriptionPlan

plans = SubscriptionPlan.objects.all()
if plans.count() == 0:
    print("NO_PLANS_YET")
else:
    for p in plans:
        print(f"{p.tier}: {p.price}")
