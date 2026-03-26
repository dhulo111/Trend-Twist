import os
import django
import random
from decimal import Decimal
from django.core.files.uploadedfile import SimpleUploadedFile
from django.contrib.auth.models import User
from django.utils import timezone
from faker import Faker
from rest_framework.test import APIClient
from django.urls import reverse
from io import BytesIO
from PIL import Image

# 1. Setup Django Environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'trend_twist_api.settings')
django.setup()

from trend.models import Profile, Post, Reel, Story, SubscriptionPlan, Twist, Comment, ReelComment

fake = Faker()
client = APIClient()

def get_dummy_image():
    """Generates a simple dummy RGB image."""
    file_obj = BytesIO()
    image = Image.new('RGB', (800, 800), color=(random.randint(0, 255), random.randint(0, 255), random.randint(0, 255)))
    image.save(file_obj, 'JPEG')
    file_obj.seek(0)
    return SimpleUploadedFile("dummy.jpg", file_obj.read(), content_type="image/jpeg")

def get_dummy_video():
    """Generates a fake mp4 file (just a small text file with .mp4 extension) 
    since standard backends usually just store the file."""
    return SimpleUploadedFile("dummy.mp4", b"fake_video_content", content_type="video/mp4")

def get_dummy_audio():
    """Generates a fake mp3 file."""
    return SimpleUploadedFile("dummy.mp3", b"fake_audio_content", content_type="audio/mpeg")

def seed_data(user_count=50, posts_per_user=5, reels_per_user=2):
    print(f"🚀 Starting LARGE SCALE Seeding Process ({user_count} users)...")

    # Ensure we have global plans first
    if not SubscriptionPlan.objects.exists():
        print("Seeding Subscription Plans...")
        plans = [
            ('basic', 99.00, 'Access to exclusive posts'),
            ('pro', 499.00, 'Exclusive Reels & Stories'),
            ('elite', 999.00, 'Elite crown badge'),
        ]
        for tier, price, feat in plans:
            SubscriptionPlan.objects.get_or_create(tier=tier, defaults={'price': price, 'features': feat})

    dummy_users = []
    
    # 2. Create Dummy Users (Efficiently)
    print(f"👤 Creating {user_count} Dummy Users...")
    for i in range(user_count):
        first_name = fake.first_name()
        last_name = fake.last_name()
        username = f"{first_name.lower()}_{random.randint(1000, 9999)}_{i}"
        
        user, created = User.objects.get_or_create(
            username=username,
            defaults={
                'email': f"{username}@example.com",
                'first_name': first_name,
                'last_name': last_name
            }
        )
        if created:
            user.set_password('password123')
            user.save()
            # Update Profile
            profile = user.profile
            profile.bio = fake.sentence(nb_words=10)
            profile.is_creator = True
            # Profile picture is a bit slow to generate every time, so we do it for some
            if random.random() < 0.2:
                profile.profile_picture = get_dummy_image()
            profile.save()
        
        dummy_users.append(user)
        if (i+1) % 10 == 0:
            print(f"   - Created {i+1} users...")

    # 3. Use API to Upload Content (Real Feel)
    print("\n📩 Uploading Content through APIs (Randomly distributed)...")
    # Cache URLs
    url_post = reverse('post_list_create')
    url_reel = reverse('reel_list_create')
    url_story = reverse('story_list_create')

    for i, user in enumerate(dummy_users):
        client.force_authenticate(user=user)
        
        # --- Create Posts ---
        for _ in range(random.randint(1, posts_per_user)):
            post_data = {
                'content': fake.paragraph(nb_sentences=random.randint(2, 5)),
                'is_exclusive': random.choice([True, False, False, False]),
            }
            if random.random() > 0.3:
                post_data['media_file'] = get_dummy_image()
            
            required_tier = random.choice(['basic', 'pro']) if random.choice([True, False]) else None
            if required_tier:
                post_data['required_tier'] = required_tier
                
            client.post(url_post, post_data, format='multipart')

        # --- Create Reels ---
        for _ in range(random.randint(0, reels_per_user)):
            reel_data = {
                'caption': fake.sentence(nb_words=8),
                'media_file': get_dummy_video(),
                'media_type': 'video',
                'music_name': fake.catch_phrase(),
                'duration': random.randint(10, 60),
                'is_exclusive': random.choice([True, False, False]),
            }
            if random.random() > 0.5:
                # Add a tiny dummy "music" file
                reel_data['music_file'] = SimpleUploadedFile("seed_music.mp3", b"dummy_audio", content_type="audio/mpeg")
                
            client.post(url_reel, reel_data, format='multipart')

        if (i+1) % 10 == 0:
            print(f"   [Progress] {i+1} users finished uploading content.")

    # 4. Social Interactions (Likes, Comments, Follows)
    print("\n🤝 Generating Heavy Interactions...")
    all_post_ids = list(Post.objects.values_list('id', flat=True))
    all_reel_ids = list(Reel.objects.values_list('id', flat=True))

    for i, user in enumerate(dummy_users):
        client.force_authenticate(user=user)
        
        # Follow a few random people
        targets = random.sample(dummy_users, min(len(dummy_users), 10))
        for target in targets:
            if target != user:
                client.post(f'/users/{target.id}/follow/')

        # Like and Comment on random posts
        if all_post_ids:
            lucky_post_ids = random.sample(all_post_ids, min(len(all_post_ids), 10))
            for pid in lucky_post_ids:
                client.post(f'/posts/{pid}/like/')
                if random.random() > 0.5:
                    client.post(f'/posts/{pid}/comments/', {'text': fake.sentence(nb_words=6)})

        if (i+1) % 20 == 0:
            print(f"   [Interaction Progress] {i+1} users finished interacting.")

    print("\n✨ LARGE SCALE Seeding Complete!")

if __name__ == "__main__":
    import sys
    # Default to 100 users, 5 posts each, 2 reels each for "Large Scale"
    # User can override via args
    u_count = int(sys.argv[1]) if len(sys.argv) > 1 else 100
    seed_data(user_count=u_count)
