# Generated manually to add employee task submission and chef review flow.

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("madar_app", "0043_integrate_document_lifecycle"),
    ]

    operations = [
        migrations.AddField(
            model_name="task",
            name="review_comment",
            field=models.TextField(blank=True, default=""),
        ),
        migrations.AddField(
            model_name="task",
            name="reviewed_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="task",
            name="reviewed_by",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="reviewed_tasks",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AddField(
            model_name="task",
            name="submission_attachment",
            field=models.FileField(blank=True, null=True, upload_to="task_submissions/"),
        ),
        migrations.AddField(
            model_name="task",
            name="submission_note",
            field=models.TextField(blank=True, default=""),
        ),
        migrations.AddField(
            model_name="task",
            name="submitted_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name="task",
            name="status",
            field=models.CharField(
                choices=[
                    ("TODO", "To Do"),
                    ("SUBMITTED", "Submitted"),
                    ("REVISION", "Needs Revision"),
                    ("DONE", "Done"),
                ],
                default="TODO",
                max_length=10,
            ),
        ),
    ]
