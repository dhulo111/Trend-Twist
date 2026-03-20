from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('trend', '0016_profile_block_reason_profile_blocked_until_report'),
    ]

    operations = [
        migrations.AddField(
            model_name='story',
            name='media_type',
            field=models.CharField(
                choices=[('image', 'Image'), ('video', 'Video')],
                default='image',
                max_length=10,
            ),
        ),
    ]
