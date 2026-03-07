import os
import django
import sys

with open('setup.log', 'w') as f:
    f.write("Starting script\n")
    try:
        os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'trend_twist_api.settings')
        django.setup()
        f.write("Django setup done\n")
        from django.contrib.auth import get_user_model
        User = get_user_model()
        
        username = 'admin'
        email = 'admin@example.com'
        password = 'Admin123'
        
        if not User.objects.filter(username=username).exists():
            f.write(f"Creating superuser: {username}\n")
            User.objects.create_superuser(username, email, password)
            f.write("Superuser created successfully.\n")
        else:
            f.write(f"Superuser '{username}' already exists. Updating password.\n")
            u = User.objects.get(username=username)
            u.set_password(password)
            u.is_active = True
            u.save()
            f.write("Password updated and is_active set to True.\n")
    except Exception as e:
        f.write(f"Error: {str(e)}\n")
        import traceback
        f.write(traceback.format_exc() + "\n")
