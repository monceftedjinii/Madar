from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('madar_app', '0025_employee_phone_number_employee_address'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='last_seen',
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
