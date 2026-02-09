from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('madar_app', '0011_task_completed_at'),
    ]

    operations = [
        migrations.AddField(
            model_name='document',
            name='sent_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
