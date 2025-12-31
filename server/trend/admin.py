# backend/api/admin.py (અથવા backend/trend/admin.py)

from django.contrib import admin
from . import models

# Register all models here so they appear in the admin panel
admin.site.register(models.Profile)
admin.site.register(models.Post)
admin.site.register(models.Comment)
admin.site.register(models.Like)
admin.site.register(models.Twist)
admin.site.register(models.Hashtag)
admin.site.register(models.OTPRequest)
admin.site.register(models.Follow)
admin.site.register(models.FollowRequest) # Follow Requests
admin.site.register(models.ChatRoom) # Live Chat
admin.site.register(models.ChatMessage) # Live Chat Messages

# --- NEW: Story Models ---
admin.site.register(models.Story) 
admin.site.register(models.StoryView)

# --- NEW: Reel Models ---
admin.site.register(models.Reel)
admin.site.register(models.ReelLike)
admin.site.register(models.ReelComment)