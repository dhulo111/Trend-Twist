
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'trend_twist_api.settings')
django.setup()

from django.contrib.auth import get_user_model
User = get_user_model()

username = 'admin'
email = 'admin@example.com'
password = 'Admin123'

if not User.objects.filter(username=username).exists():
    print(f"Creating superuser: {username}")
    User.objects.create_superuser(username, email, password)
    print(f"Superuser created successfully.")
    print(f"Username: {username}")
    print(f"Password: {password}")
else:
    print(f"Superuser '{username}' already exists.")
    u = User.objects.get(username=username)
    u.set_password(password)
    u.save()
    print(f"Password for '{username}' has been reset to: {password}")
