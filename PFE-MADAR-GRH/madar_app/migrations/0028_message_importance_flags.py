from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('madar_app', '0027_employee_contract_type_alter_employee_hired_at'),
    ]

    operations = [
        migrations.AddField(
            model_name='message',
            name='is_important_by_recipient',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='message',
            name='is_important_by_sender',
            field=models.BooleanField(default=False),
        ),
    ]
