from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('madar_app', '0022_employee_position'),
    ]

    operations = [
        migrations.AlterField(
            model_name='employee',
            name='position',
            field=models.CharField(blank=True, choices=[('Comptable', 'Comptable'), ('Femme de ménage', 'Femme de ménage'), ('Extra', 'Extra'), ('Technicien', 'Technicien'), ('Assistant RH', 'Assistant RH'), ('Commercial', 'Commercial'), ('Chef de service', 'Chef de service'), ('Responsable RH', 'Responsable RH'), ('Directeur RH', 'Directeur RH')], default='', max_length=100),
        ),
    ]
