import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'trend_twist_api.settings')
django.setup()

from trend.models import Notification
from django.contrib.auth.models import User

with open('debug_output.txt', 'w') as f:
    f.write("--- DEBUG NOTIFICATIONS ---\n")
    for u in User.objects.all():
        qs = Notification.objects.filter(recipient=u).order_by('-created_at')
        if qs.count() > 0:
            f.write(f"\nRecipient: {u.username} (ID: {u.id})\n")
            for n in qs:
                f.write(f"  Notif ID: {n.id}, Type: '{n.notification_type}', Sender: {n.sender.username} (ID: {n.sender.id}), Created: {n.created_at}, Is Read: {n.is_read}\n")
