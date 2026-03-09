# Generated manually for field cleanup and renaming

from django.db import migrations, models
import django.db.models.deletion


def set_default_leave_type_for_null(apps, schema_editor):
    """Set default leave type for any NULL values"""
    LeaveRequest = apps.get_model('madar_app', 'LeaveRequest')
    LeaveType = apps.get_model('madar_app', 'LeaveType')
    
    try:
        default_type = LeaveType.objects.get(code='AUTRE')
        # Update any NULL leave_type to AUTRE
        LeaveRequest.objects.filter(leave_type__isnull=True).update(leave_type=default_type)
    except LeaveType.DoesNotExist:
        pass


class Migration(migrations.Migration):

    dependencies = [
        ('madar_app', '0035_migrate_leavetype_data'),
    ]

    operations = [
        # Set default for NULL values before making field non-nullable
        migrations.RunPython(set_default_leave_type_for_null, migrations.RunPython.noop),
        # Remove the type_old field
        migrations.RemoveField(
            model_name='leaverequest',
            name='type_old',
        ),
        # Rename leave_type to type
        migrations.RenameField(
            model_name='leaverequest',
            old_name='leave_type',
            new_name='type',
        ),
        # Make type field non-nullable
        migrations.AlterField(
            model_name='leaverequest',
            name='type',
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.PROTECT,
                related_name='leave_requests',
                to='madar_app.leavetype',
                verbose_name='Type de congé'
            ),
        ),
    ]
