from django.db import migrations, models

class Migration(migrations.Migration):
    dependencies = [('chat', '0006_voicecall_voicemember_voicesignal_and_more')]
    operations = [
        migrations.AddField('message', 'photo', models.CharField(max_length=80, blank=True)),
        migrations.AddField('message', 'photo_width', models.PositiveSmallIntegerField(default=0)),
        migrations.AddField('message', 'photo_height', models.PositiveSmallIntegerField(default=0)),
        migrations.AddField('message', 'photo_digest', models.CharField(max_length=64, blank=True)),
    ]
