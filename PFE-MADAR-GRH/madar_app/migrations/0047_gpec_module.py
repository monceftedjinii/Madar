from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone


class Migration(migrations.Migration):

    dependencies = [
        ("madar_app", "0046_evaluations_module"),
    ]

    operations = [
        migrations.CreateModel(
            name="Competency",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=150, unique=True)),
                ("category", models.CharField(choices=[("TECHNICAL", "Technique"), ("BEHAVIORAL", "Comportementale"), ("MANAGEMENT", "Manageriale"), ("RH", "RH")], default="TECHNICAL", max_length=20)),
                ("description", models.TextField(blank=True, default="")),
                ("target_level", models.PositiveIntegerField(default=3)),
                ("is_active", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
            ],
            options={"ordering": ["name"]},
        ),
        migrations.CreateModel(
            name="DevelopmentPlan",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("title", models.CharField(max_length=255)),
                ("actions", models.TextField()),
                ("target_date", models.DateField(blank=True, null=True)),
                ("status", models.CharField(choices=[("PLANNED", "Planifie"), ("ONGOING", "En cours"), ("COMPLETED", "Complete")], default="PLANNED", max_length=20)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("created_by", models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="created_development_plans", to="madar_app.user")),
                ("employee", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="development_plans", to="madar_app.employee")),
            ],
            options={"ordering": ["status", "target_date", "-created_at"]},
        ),
        migrations.CreateModel(
            name="EmployeeObjective",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("title", models.CharField(max_length=255)),
                ("description", models.TextField(blank=True, default="")),
                ("due_date", models.DateField(blank=True, null=True)),
                ("progress", models.PositiveIntegerField(default=0)),
                ("status", models.CharField(choices=[("TODO", "A faire"), ("IN_PROGRESS", "En cours"), ("DONE", "Termine"), ("BLOCKED", "Bloque")], default="TODO", max_length=20)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("created_by", models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="created_objectives", to="madar_app.user")),
                ("employee", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="objectives", to="madar_app.employee")),
            ],
            options={"ordering": ["status", "due_date", "-created_at"]},
        ),
        migrations.CreateModel(
            name="EmployeeCompetency",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("current_level", models.PositiveIntegerField(default=0)),
                ("target_level", models.PositiveIntegerField(default=3)),
                ("notes", models.TextField(blank=True, default="")),
                ("assessed_at", models.DateField(default=django.utils.timezone.localdate)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("competency", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="employee_links", to="madar_app.competency")),
                ("employee", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="competencies", to="madar_app.employee")),
                ("updated_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="updated_employee_competencies", to="madar_app.user")),
            ],
            options={"ordering": ["employee_id", "competency__name"], "unique_together": {("employee", "competency")}},
        ),
    ]
