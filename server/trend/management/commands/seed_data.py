"""
╔══════════════════════════════════════════════════════════════════════════════╗
║                      TREND TWIST — DATA SEEDER                             ║
║                     Management Command: seed_data                          ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  ⚠  SAFETY WARNING                                                         ║
║  This command ONLY runs when DEBUG=True.                                   ║
║  NEVER run this on a production database.                                  ║
╚══════════════════════════════════════════════════════════════════════════════╝

Usage:
    python manage.py seed_data --scale=small
    python manage.py seed_data --scale=medium
    python manage.py seed_data --scale=large
    python manage.py seed_data --clear  (clears before seeding)

This version uses REAL video files from media/reels and REAL music previews from 
the iTunes API to ensure Reels play correctly and have high-quality audio.
"""

import io
import os
import random
import requests
from datetime import timedelta
from pathlib import Path

from django.conf import settings
from django.contrib.auth.models import User
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile

# ── Dependencies ─────────────────────────────────────────────────────────────
try:
    from faker import Faker
except ImportError:
    raise CommandError("Faker not installed. Run: pip install Faker")

try:
    from PIL import Image, ImageDraw, ImageFont
    HAS_PILLOW = True
except ImportError:
    HAS_PILLOW = False

from trend.models import (
    Comment, Follow, Like, Notification, Post, Profile, 
    Reel, ReelComment, ReelLike, SavedItem, 
    Story, StoryLike, StoryView, Twist, TwistComment, TwistLike
)

# ── ANSI Helpers ─────────────────────────────────────────────────────────────
CYAN   = "\033[96m"
GREEN  = "\033[92m"
YELLOW = "\033[93m"
RED    = "\033[91m"
RESET  = "\033[0m"

def _c(colour, msg): return f"{colour}{msg}{RESET}"

SCALE_PRESETS = {
    "small":  {"users": 20,   "posts": 50,  "reels": 30,  "stories": 20,  "twists": 40},
    "medium": {"users": 100,  "posts": 300, "reels": 200, "stories": 150, "twists": 250},
    "large":  {"users": 500,  "posts": 1000, "reels": 500, "stories": 300, "twists": 600},
    "massive": {"users": 1000, "posts": 4000, "reels": 2000, "stories": 1000, "twists": 2000},
}

# ──────────────────────────────────────────────────────────────────────────────
# UTILITIES & MEDIA GENERATION
# ──────────────────────────────────────────────────────────────────────────────

def _make_gradient_image(width, height, palette_idx, label):
    if not HAS_PILLOW: return b"\xff\xd8\xff\xdb\x00C\x00\x08\x06\x06\x07\x06\x05\x08\x07\x07\x07\t\t\x08\n\x0c\x14\r\x0c\x0b\x0b\x0c\x19\x12\x13\x0f\x14\x1d\x1a\x1f\x1e\x1d\x1a\x1c\x1c $.' \",#\x1c\x1c(7),01444\x1f'9=82<.342\xff\xc0\x00\x0b\x08\x00\x01\x00\x01\x01\x01\x11\x00\xff\xc4\x00\x1f\x00\x00\x01\x05\x01\x01\x01\x01\x01\x01\x00\x00\x00\x00\x00\x00\x00\x00\x01\x02\x03\x04\x05\x06\x07\x08\t\n\x0b\xff\xda\x00\x08\x01\x01\x00\x00?\x00\xed\xff\xd9"
    
    colors = [((255, 65, 54), (1, 255, 112)), ((0, 116, 217), (255, 133, 27)), ((177, 13, 201), (255, 220, 0))]
    c1, c2 = colors[palette_idx % len(colors)]
    img = Image.new('RGB', (width, height))
    draw = ImageDraw.Draw(img)
    for y in range(height):
        col = tuple(int(c1[i] + (c2[i] - c1[i]) * y / height) for i in range(3))
        draw.line((0, y, width, y), fill=col)
    
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=85)
    return buf.getvalue()

def _ensure_file(path, data_func):
    if not default_storage.exists(path):
        data = data_func()
        if data:
            default_storage.save(path, ContentFile(data))
    return path

# ──────────────────────────────────────────────────────────────────────────────
# ITUNES AUDIO / REAL VIDEO SCANNING
# ──────────────────────────────────────────────────────────────────────────────

def fetch_itunes_music(count=10):
    """Fetches trending music previews from iTunes Search API."""
    try:
        url = f"https://itunes.apple.com/search?term=trending&media=music&limit={count}"
        response = requests.get(url, timeout=10)
        if response.status_code == 200:
            data = response.json()
            results = []
            for item in data.get('results', []):
                results.append({
                    'name': f"{item.get('trackName')} - {item.get('artistName')}",
                    'preview_url': item.get('previewUrl'),
                })
            return results
    except Exception as e:
        pass
    return []

# ──────────────────────────────────────────────────────────────────────────────
# MAIN COMMAND
# ──────────────────────────────────────────────────────────────────────────────

class Command(BaseCommand):
    help = "Seed the development DB with BETTER realistic data, real videos, and iTunes music."

    def add_arguments(self, parser):
        parser.add_argument("--scale", type=str, choices=["small", "medium", "large", "massive"], default="small")
        parser.add_argument("--clear", action="store_true", default=False)

    def handle(self, *args, **options):
        if not settings.DEBUG:
            raise CommandError(_c(RED, "⛔ ABORTED — Not in DEBUG mode!"))

        scale = options["scale"]
        counts = SCALE_PRESETS[scale]
        fake = Faker()
        random.seed(42)

        if options["clear"]:
            self._clear_data()

        self._log("🔍 Scanning for real videos in media/reels/ ...")
        # Find real MP4 files already present in the media directory
        real_video_files = []
        media_reels_dir = Path(settings.MEDIA_ROOT) / 'reels'
        if media_reels_dir.exists():
            # Filter for files that aren't 'seed_' placeholders
            real_video_files = [f"reels/{f.name}" for f in media_reels_dir.glob("*.mp4") if not f.name.startswith("seed_")]
        
        if not real_video_files:
            self._log(f"{YELLOW}Warning: No real MP4 videos found in {media_reels_dir}. Using placeholders.{RESET}")
            # Generate a few slightly better placeholders if none exist
            real_video_files = [_ensure_file(f"reels/seed_{i}.mp4", lambda: b"DummyVideoData" * 1000) for i in range(5)]

        self._log("🎵 Fetching music from iTunes ...")
        itunes_tracks = fetch_itunes_music(20)
        
        music_pool = []
        for i, track in enumerate(itunes_tracks):
            track_name_safe = "".join(x for x in track['name'] if x.isalnum() or x in " -_").strip()
            file_path = f"reels/music/itunes_{i}.m4a"
            def get_music_data():
                try: r = requests.get(track['preview_url'], timeout=10); return r.content if r.status_code == 200 else None
                except: return None
            
            p = _ensure_file(file_path, get_music_data)
            music_pool.append({'name': track['name'], 'file': p})

        if not music_pool:
            self._log(f"{YELLOW}Warning: Could not fetch iTunes music. Using silent placeholders.{RESET}")
            music_pool = [{'name': f"Generic Beat {i}", 'file': _ensure_file(f"reels/music/seed_{i}.mp3", lambda: b"\xff\xfb\x90\x44" + b"\x00"*1000)} for i in range(5)]

        # 1. Assets Pool
        self._log("🖼 Preparing Image Pools ...")
        p_pool = [_ensure_file(f"posts/seed_{i}.jpg", lambda: _make_gradient_image(1080, 1080, i, f"Post {i}")) for i in range(20)]
        s_pool = [_ensure_file(f"stories/seed_{i}.jpg", lambda: _make_gradient_image(1080, 1920, i, f"Story {i}")) for i in range(10)]
        u_pool = [_ensure_file(f"profiles/seed_{i}.jpg", lambda: _make_gradient_image(400, 400, i+10, "User")) for i in range(15)]

        # 2. Users
        users = self._seed_users(fake, counts["users"], u_pool)
        
        # 3. Content
        posts = self._seed_posts(fake, users, counts["posts"], p_pool)
        reels = self._seed_reels(fake, users, counts["reels"], real_video_files, music_pool)
        twists = self._seed_twists(fake, users, counts["twists"])
        stories = self._seed_stories(fake, users, counts["stories"], s_pool, music_pool)

        # 4. Engagement
        self._seed_engagement(fake, users, posts, reels, twists, stories, scale)

        self.stdout.write(_c(GREEN, f"\n🚀 Seeding Complete! Used {len(real_video_files)} real videos and {len(music_pool)} iTunes tracks."))

    def _clear_data(self):
        self._log("🗑 Clearing DB ...")
        with transaction.atomic():
            Profile.objects.all().delete()
            Post.objects.all().delete()
            Reel.objects.all().delete()
            Twist.objects.all().delete()
            Story.objects.all().delete()
            User.objects.filter(is_staff=False, is_superuser=False).delete()

    def _seed_users(self, fake, count, u_pool):
        self._log(f"👤 Creating {count} users ...")
        from django.contrib.auth.hashers import make_password
        users = []
        pwd = make_password("SeedPass@123")
        for _ in range(count):
            u = User(username=fake.user_name() + str(random.randint(10000, 99999)), password=pwd, email=fake.email())
            users.append(u)
        
        User.objects.bulk_create(users, batch_size=500, ignore_conflicts=True)
        users = list(User.objects.filter(is_staff=False, is_superuser=False))
        
        profiles = [Profile(user=u, profile_picture=random.choice(u_pool), bio=fake.sentence(), is_creator=True, is_private=False) for u in users]
        Profile.objects.bulk_create(profiles, batch_size=500, ignore_conflicts=True)
        return users

    def _seed_posts(self, fake, users, count, p_pool):
        self._log(f"📸 Creating {count} posts ...")
        posts = [Post(author=random.choice(users), content=fake.paragraph(nb_sentences=2), media_file=random.choice(p_pool)) for _ in range(count)]
        Post.objects.bulk_create(posts, batch_size=500)
        return list(Post.objects.all())

    def _seed_reels(self, fake, users, count, v_pool, m_pool):
        self._log(f"🎬 Creating {count} reels ...")
        reels = []
        # Find some images for image reels
        image_pool = [_ensure_file(f"reels/seed_img_{i}.jpg", lambda: _make_gradient_image(1080, 1920, i, f"Reel Image {i}")) for i in range(5)]
        
        for i in range(count):
            music = random.choice(m_pool)
            media_type = 'video' if random.random() > 0.3 else 'image'
            media_file = random.choice(v_pool) if media_type == 'video' else random.choice(image_pool)
            
            reels.append(Reel(
                author=random.choice(users),
                media_file=media_file,
                media_type=media_type,
                music_file=music['file'],
                music_name=music['name'],
                caption=fake.sentence(),
                duration=random.randint(10, 60) if media_type == 'video' else random.choice([15, 30, 60])
            ))
        Reel.objects.bulk_create(reels, batch_size=500)
        return list(Reel.objects.all())

    def _seed_twists(self, fake, users, count):
        self._log(f"🌀 Creating {count} twists ...")
        twists = [Twist(author=random.choice(users), content=fake.paragraph(nb_sentences=1)) for _ in range(count)]
        Twist.objects.bulk_create(twists, batch_size=500)
        return list(Twist.objects.all())

    def _seed_stories(self, fake, users, count, s_pool, m_pool):
        self._log(f"📖 Creating {count} stories ...")
        now = timezone.now()
        stories = []
        for _ in range(count):
            music = random.choice(m_pool)
            stories.append(Story(
                author=random.choice(users),
                media_file=random.choice(s_pool),
                music_title=music['name'],
                music_file=music['file'],
                created_at=now,
                expires_at=now+timedelta(hours=24)
            ))
        Story.objects.bulk_create(stories, batch_size=500)
        return list(Story.objects.all())

    def _seed_engagement(self, fake, users, posts, reels, twists, stories, scale):
        self._log("❤️ Adding massive engagement (Likes, Comments, Views) ...")
        likes, reel_likes, twist_likes, story_likes, story_views = [], [], [], [], []
        comments, reel_comments, twist_comments = [], [], []

        engagement_factor = 200 if scale == "massive" else (50 if scale == "large" else 10)
        
        sampled_posts = random.sample(posts, min(len(posts), engagement_factor * 10))
        sampled_reels = random.sample(reels, min(len(reels), engagement_factor * 10))
        sampled_twists = random.sample(twists, min(len(twists), engagement_factor * 10))
        sampled_stories = random.sample(stories, min(len(stories), engagement_factor * 10))
        
        for p in sampled_posts:
            likers = random.sample(users, min(len(users), random.randint(10, engagement_factor)))
            for u in likers: likes.append(Like(post=p, user=u))
            for _ in range(random.randint(2, max(3, engagement_factor // 4))):
                comments.append(Comment(post=p, author=random.choice(users), text=fake.sentence()))

        for r in sampled_reels:
            likers = random.sample(users, min(len(users), random.randint(10, engagement_factor)))
            for u in likers: reel_likes.append(ReelLike(reel=r, user=u))
            for _ in range(random.randint(2, max(3, engagement_factor // 4))):
                reel_comments.append(ReelComment(reel=r, author=random.choice(users), text=fake.sentence()))

        for t in sampled_twists:
            likers = random.sample(users, min(len(users), random.randint(10, engagement_factor)))
            for u in likers: twist_likes.append(TwistLike(twist=t, user=u))
            for _ in range(random.randint(2, max(3, engagement_factor // 4))):
                twist_comments.append(TwistComment(twist=t, author=random.choice(users), text=fake.sentence()))

        for s in sampled_stories:
            viewers = random.sample(users, min(len(users), random.randint(10, engagement_factor)))
            for u in viewers:
                story_views.append(StoryView(story=s, user=u))
                if random.random() > 0.5:
                    story_likes.append(StoryLike(story=s, user=u))

        Like.objects.bulk_create(likes, batch_size=500, ignore_conflicts=True)
        Comment.objects.bulk_create(comments, batch_size=500)
        
        ReelLike.objects.bulk_create(reel_likes, batch_size=500, ignore_conflicts=True)
        ReelComment.objects.bulk_create(reel_comments, batch_size=500)
        
        TwistLike.objects.bulk_create(twist_likes, batch_size=500, ignore_conflicts=True)
        TwistComment.objects.bulk_create(twist_comments, batch_size=500)
        
        StoryView.objects.bulk_create(story_views, batch_size=500, ignore_conflicts=True)
        StoryLike.objects.bulk_create(story_likes, batch_size=500, ignore_conflicts=True)
        
        for r in sampled_reels:
            r.views_count = random.randint(100, engagement_factor * 50)
        Reel.objects.bulk_update(sampled_reels, ['views_count'], batch_size=500)

    def _log(self, msg): self.stdout.write(_c(CYAN, f"  ⏳ {msg}"))
