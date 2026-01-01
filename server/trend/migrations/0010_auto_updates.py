# Generated manually by Agent

from django.db import migrations, models
import django.db.models.deletion
from django.conf import settings

class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('trend', '0009_chatmessage_shared_reel'),
    ]

    operations = [
        migrations.CreateModel(
            name='StoryLike',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('story', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='likes', to='trend.story')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'unique_together': {('story', 'user')},
            },
        ),
        migrations.AddField(
            model_name='chatmessage',
            name='story_reply',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='replies', to='trend.story'),
        ),
        migrations.AddField(
            model_name='notification',
            name='story',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, to='trend.story'),
        ),
        migrations.AlterField(
            model_name='notification',
            name='notification_type',
            field=models.CharField(choices=[('like_post', 'Like Post'), ('like_reel', 'Like Reel'), ('follow_request', 'Follow Request'), ('follow_accept', 'Follow Accept'), ('comment_post', 'Comment Post'), ('comment_reel', 'Comment Reel'), ('story_like', 'Story Like')], max_length=20),
        ),
    ]
