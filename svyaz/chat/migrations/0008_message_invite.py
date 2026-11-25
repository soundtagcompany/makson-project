from django.db import migrations, models
import django.db.models.deletion

class Migration(migrations.Migration):
    dependencies = [('chat', '0007_message_photo')]
    operations = [migrations.AddField('message', 'invite', models.ForeignKey(to='chat.gameinvite', null=True, blank=True, on_delete=django.db.models.deletion.SET_NULL, related_name='chat_messages'))]
