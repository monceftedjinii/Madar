from django.db import migrations, models
import django.db.models.deletion


def migrate_employee_positions(apps, schema_editor):
    Employee = apps.get_model('madar_app', 'Employee')
    Position = apps.get_model('madar_app', 'Position')

    for employee in Employee.objects.exclude(position='').exclude(position__isnull=True):
        position_obj, _ = Position.objects.get_or_create(name=employee.position)
        employee.position_fk = position_obj
        employee.save(update_fields=['position_fk'])


def reverse_employee_positions(apps, schema_editor):
    Employee = apps.get_model('madar_app', 'Employee')

    for employee in Employee.objects.filter(position_fk__isnull=False).select_related('position_fk'):
        employee.position = employee.position_fk.name
        employee.save(update_fields=['position'])


class Migration(migrations.Migration):

    dependencies = [
        ('madar_app', '0023_alter_employee_position'),
    ]

    operations = [
        migrations.CreateModel(
            name='Position',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=100, unique=True)),
            ],
            options={
                'ordering': ['name'],
            },
        ),
        migrations.AddField(
            model_name='employee',
            name='position_fk',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='employees', to='madar_app.position'),
        ),
        migrations.RunPython(migrate_employee_positions, reverse_employee_positions),
        migrations.RemoveField(
            model_name='employee',
            name='position',
        ),
        migrations.RenameField(
            model_name='employee',
            old_name='position_fk',
            new_name='position',
        ),
    ]
