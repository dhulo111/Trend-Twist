import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'trend_twist_api.settings')
django.setup()

from django.contrib.auth import authenticate, get_user_model
User = get_user_model()

try:
    user = User.objects.get(username='admin')
    print(f"Found admin user: {user.username}, active: {user.is_active}, password hash: {user.password[:20]}")
except User.DoesNotExist:
    print("Admin user does not exist")

auth_user = authenticate(username='admin', password='Admin123')
print(f"Authenticate result (username='admin'): {auth_user}")

auth_email_user = authenticate(username='admin@example.com', password='Admin123')
print(f"Authenticate result (username='admin@example.com'): {auth_email_user}")

