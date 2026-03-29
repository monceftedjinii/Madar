from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone


class Migration(migrations.Migration):

    dependencies = [
        ("madar_app", "0045_task_requires_submission_file"),
    ]

    operations = [
        migrations.CreateModel(
            name="EvaluationCampaign",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("title", models.CharField(max_length=255)),
                ("start_date", models.DateField()),
                ("end_date", models.DateField()),
                ("status", models.CharField(choices=[("DRAFT", "Brouillon"), ("OPEN", "Ouverte"), ("CLOSED", "Cloturee")], default="OPEN", max_length=20)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
            ],
            options={"ordering": ["-start_date", "-created_at"]},
        ),
        migrations.CreateModel(
            name="EvaluationCriteria",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("label", models.CharField(max_length=150, unique=True)),
                ("weight", models.DecimalField(decimal_places=2, default=1, max_digits=5)),
                ("note_min", models.DecimalField(decimal_places=2, default=0, max_digits=5)),
                ("note_max", models.DecimalField(decimal_places=2, default=5, max_digits=5)),
                ("is_active", models.BooleanField(default=True)),
            ],
            options={"ordering": ["id"]},
        ),
        migrations.CreateModel(
            name="Evaluation",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("year", models.IntegerField()),
                ("period", models.CharField(default="Annuel", max_length=50)),
                ("evaluation_date", models.DateField(default=django.utils.timezone.localdate)),
                ("status", models.CharField(choices=[("DRAFT", "Brouillon"), ("COMPLETED", "Completee")], default="COMPLETED", max_length=20)),
                ("global_score", models.DecimalField(decimal_places=2, default=0, max_digits=5)),
                ("recommendation", models.CharField(choices=[("EXCELLENT", "Excellent"), ("GOOD", "Bon"), ("AVERAGE", "Moyen"), ("IMPROVEMENT", "A ameliorer")], default="AVERAGE", max_length=20)),
                ("overall_comment", models.TextField(blank=True, default="")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("campaign", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="evaluations", to="madar_app.evaluationcampaign")),
                ("employee", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="evaluations", to="madar_app.employee")),
                ("evaluator", models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="evaluations_given", to="madar_app.user")),
            ],
            options={"ordering": ["-evaluation_date", "-created_at"]},
        ),
        migrations.CreateModel(
            name="EvaluationScore",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("score", models.DecimalField(decimal_places=2, max_digits=5)),
                ("comment", models.TextField(blank=True, default="")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("criterion", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="scores", to="madar_app.evaluationcriteria")),
                ("evaluation", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="scores", to="madar_app.evaluation")),
            ],
            options={"ordering": ["criterion_id"]},
        ),
    ]
