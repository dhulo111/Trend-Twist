import random
import time
from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from django.db import transaction
from django.utils import timezone
from faker import Faker
from django.urls import reverse
from rest_framework.test import APIClient
from io import BytesIO
from PIL import Image, ImageDraw

from trend.models import Profile, Post, Reel, Story, SubscriptionPlan, Twist, Comment, ReelComment, Like, Follow

class Command(BaseCommand):
    help = 'Seeds the database with massive dynamic data using API logic for real feeling'

    def add_arguments(self, parser):
        parser.add_argument('user_count', type=int, default=100, help='Number of users (e.g., 500 for large testing)')
        parser.add_argument('--clear', action='store_true', help='Clear before seeding')

    def get_gradient_image(self, width=800, height=800):
        c1 = (random.randint(0, 255), random.randint(0, 255), random.randint(0, 255))
        c2 = (random.randint(0, 255), random.randint(0, 255), random.randint(0, 255))
        img = Image.new('RGB', (width, height))
        draw = ImageDraw.Draw(img)
        for y in range(height):
            col = tuple(int(c1[i] + (c2[i] - c1[i]) * y / height) for i in range(3))
            draw.line((0, y, width, y), fill=col)
        buf = BytesIO()
        img.save(buf, format='JPEG')
        buf.seek(0)
        return SimpleUploadedFile("seed_img.jpg", buf.read(), content_type="image/jpeg")

    def handle(self, *args, **options):
        user_count = options['user_count']
        fake = Faker()
        client = APIClient()

        if options['clear']:
            self.stdout.write("⚠️ Clearing existing data...")
            User.objects.filter(is_superuser=False).delete()
            Post.objects.all().delete()
            Reel.objects.all().delete()

        self.stdout.write(self.style.SUCCESS(f"🚀 SEEDING SCALE: {user_count} Users"))

        # 1. Sub Plans
        plans = [('basic', 99), ('pro', 499), ('elite', 999)]
        for t, p in plans:
            SubscriptionPlan.objects.get_or_create(tier=t, defaults={'price': p, 'features': f'Access to {t} perks'})

        # 2. Users
        users = []
        for i in range(user_count):
            unames = [fake.user_name(), fake.first_name().lower(), fake.word()]
            username = f"{random.choice(unames)}_{random.randint(100, 999)}_{i}"
            user = User.objects.create_user(username=username, email=fake.email(), password='password123')
            user.first_name, user.last_name = fake.first_name(), fake.last_name()
            user.save()
            
            p = user.profile
            p.bio = fake.sentence(nb_words=12)
            p.is_creator = True
            if random.random() < 0.2:
                p.profile_picture = self.get_gradient_image(400, 400)
            p.save()
            users.append(user)
            if (i+1) % 50 == 0: self.stdout.write(f"   👤 {i+1} users created...")

        # 3. Content - Using APIClient for real feel
        self.stdout.write("📩 Uploading content via APIs (Post & Reels)...")
        start_time = time.time()
        
        # Cache URLs to avoid repeated reverse() calls
        url_post = reverse('post_list_create')
        url_reel = reverse('reel_list_create')

        for i, user in enumerate(users):
            client.force_authenticate(user=user)
            
            # Posts
            for _ in range(random.randint(1, 4)):
                post_data = {'content': fake.paragraph(nb_sentences=2)}
                if random.random() > 0.5:
                    post_data['media_file'] = self.get_gradient_image()
                client.post(url_post, post_data, format='multipart')

            # Reels
            if random.random() > 0.4:
                reel_data = {
                    'caption': fake.sentence(),
                    'media_file': SimpleUploadedFile("dummy.mp4", b"data", content_type="video/mp4"),
                    'media_type': 'video',
                    'music_name': fake.catch_phrase(),
                    'music_file': self.get_gradient_image(1, 1) # Dummy small file for music if needed
                }
                client.post(url_reel, reel_data, format='multipart')

            if (i+1) % 25 == 0:
                elapsed = time.time() - start_time
                self.stdout.write(f"   💠 {i+1} users uploaded content. ({elapsed:.1f}s)")

        # 4. Interactions - Using Bulk for massive scale speed
        self.stdout.write("🤝 Generating engagement (Bulk)...")
        posts = list(Post.objects.all())
        all_likes = []
        all_follows = []
        
        for user in users:
            # Random follows
            targets = random.sample(users, min(len(users), 8))
            for t in targets:
                if t != user:
                    all_follows.append(Follow(follower=user, following=t))
            
            # Random likes
            if posts:
                lucky = random.sample(posts, min(len(posts), 15))
                for p in lucky:
                    all_likes.append(Like(post=p, user=user))

        Follow.objects.bulk_create(all_follows, ignore_conflicts=True)
        Like.objects.bulk_create(all_likes, ignore_conflicts=True)

        self.stdout.write(self.style.SUCCESS(f"✨ Large Scale Seeding Finished! Created {user_count} users, {Post.objects.count()} posts, and {Reel.objects.count()} reels."))
