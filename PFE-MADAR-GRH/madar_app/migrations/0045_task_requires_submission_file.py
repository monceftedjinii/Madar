from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("madar_app", "0044_task_submission_flow"),
    ]

    operations = [
        migrations.AddField(
            model_name="task",
            name="requires_submission_file",
            field=models.BooleanField(default=False),
        ),
    ]
