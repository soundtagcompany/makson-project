from django.db import migrations, models

class Migration(migrations.Migration):
    dependencies = [('chat', '0004_gameinvite_pushsubscription_friendship_notification')]
    operations = [migrations.AlterField(model_name='gameinvite', name='code', field=models.CharField(max_length=4))]
