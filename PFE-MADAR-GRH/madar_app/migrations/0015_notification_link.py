from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('madar_app', '0014_documenthistory_is_private'),
    ]

    operations = [
        migrations.AddField(
            model_name='notification',
            name='link',
            field=models.CharField(blank=True, max_length=255),
        ),
    ]
