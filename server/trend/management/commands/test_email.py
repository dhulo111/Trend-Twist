from django.core.management.base import BaseCommand
from django.core.mail import send_mail
from django.conf import settings
import os

class Command(BaseCommand):
    help = 'Test email sending configuration'

    def add_arguments(self, parser):
        parser.add_argument('email', type=str, help='The email address to send the test message to')

    def handle(self, *args, **kwargs):
        recipient = kwargs['email']
        self.stdout.write(f"Testing email configuration...")
        self.stdout.write(f"EMAIL_HOST: {settings.EMAIL_HOST}")
        self.stdout.write(f"EMAIL_PORT: {settings.EMAIL_PORT}")
        self.stdout.write(f"EMAIL_USE_TLS: {settings.EMAIL_USE_TLS}")
        self.stdout.write(f"EMAIL_USE_SSL: {settings.EMAIL_USE_SSL}")
        
        user = settings.EMAIL_HOST_USER
        password = settings.EMAIL_HOST_PASSWORD
        
        self.stdout.write(f"EMAIL_HOST_USER: {'Set' if user else 'NOT SET'} ({user if user else 'None'})")
        self.stdout.write(f"EMAIL_HOST_PASSWORD: {'Set' if password else 'NOT SET'} ({'******' if password else 'None'})")
        self.stdout.write(f"DEFAULT_FROM_EMAIL: {settings.DEFAULT_FROM_EMAIL}")

        try:
            send_mail(
                'TrendTwist Test Email',
                'If you are reading this, your email configuration is working perfectly!',
                settings.DEFAULT_FROM_EMAIL,
                [recipient],
                fail_silently=False,
            )
            self.stdout.write(self.style.SUCCESS(f'Successfully sent test email to {recipient}'))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Failed to send email: {e}'))
