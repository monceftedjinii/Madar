from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('madar_app', '0013_documenthistory_parent'),
    ]

    operations = [
        migrations.AddField(
            model_name='documenthistory',
            name='is_private',
            field=models.BooleanField(default=False),
        ),
    ]
