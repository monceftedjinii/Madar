from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('madar_app', '0024_position_model_and_employee_fk'),
    ]

    operations = [
        migrations.AddField(
            model_name='employee',
            name='address',
            field=models.CharField(blank=True, default='', max_length=255),
        ),
        migrations.AddField(
            model_name='employee',
            name='phone_number',
            field=models.CharField(blank=True, default='', max_length=30),
        ),
    ]
