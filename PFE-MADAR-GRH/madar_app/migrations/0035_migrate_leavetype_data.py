# Generated manually for data migration

from django.db import migrations


def create_default_leave_types(apps, schema_editor):
    """Create default leave type records"""
    LeaveType = apps.get_model('madar_app', 'LeaveType')
    
    # Create default leave types
    leave_types = [
        {
            'code': 'CA',
            'libelle': 'Congé Annuel',
            'nbrJoursDroit': 30,
            'estPayant': True,
            'reconductible': False,
            'delaiPreavis': 15,
            'justificatifRequis': False,
            'sexeAutorise': 'TOUS'
        },
        {
            'code': 'CM',
            'libelle': 'Congé Maladie',
            'nbrJoursDroit': 15,
            'estPayant': True,
            'reconductible': False,
            'delaiPreavis': 0,
            'justificatifRequis': True,
            'sexeAutorise': 'TOUS'
        },
        {
            'code': 'AUTRE',
            'libelle': 'Autre',
            'nbrJoursDroit': 0,
            'estPayant': False,
            'reconductible': False,
            'delaiPreavis': 0,
            'justificatifRequis': False,
            'sexeAutorise': 'TOUS'
        },
    ]
    
    for lt_data in leave_types:
        LeaveType.objects.get_or_create(code=lt_data['code'], defaults=lt_data)


def migrate_leave_request_types(apps, schema_editor):
    """Migrate existing LeaveRequest records to use new LeaveType FK"""
    LeaveRequest = apps.get_model('madar_app', 'LeaveRequest')
    LeaveType = apps.get_model('madar_app', 'LeaveType')
    
    # Mapping of old CharField values to new LeaveType codes
    type_mapping = {
        'ANNUAL': 'CA',
        'SICK': 'CM',
        'OTHER': 'AUTRE',
    }
    
    # Update all existing LeaveRequest records
    for leave_request in LeaveRequest.objects.all():
        old_type = leave_request.type_old
        if old_type and old_type in type_mapping:
            new_code = type_mapping[old_type]
            try:
                leave_type = LeaveType.objects.get(code=new_code)
                leave_request.leave_type = leave_type
                leave_request.save(update_fields=['leave_type'])
            except LeaveType.DoesNotExist:
                pass  # Skip if leave type doesn't exist


class Migration(migrations.Migration):

    dependencies = [
        ('madar_app', '0034_leavetype_remove_leaverequest_type_and_more'),
    ]

    operations = [
        migrations.RunPython(create_default_leave_types, migrations.RunPython.noop),
        migrations.RunPython(migrate_leave_request_types, migrations.RunPython.noop),
    ]
