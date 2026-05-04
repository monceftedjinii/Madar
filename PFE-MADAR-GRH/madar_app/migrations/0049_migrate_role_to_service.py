# Generated data migration to map old role/service structure to new one

from django.db import migrations

def migrate_user_roles_to_services(apps, schema_editor):
    """
    Map old User.role values to new User.service values.
    RH_SIMPLE, RH_AGENT, GRH -> RH service
    CHEF, EMPLOYEE -> mapped to OTHER for now
    """
    User = apps.get_model('madar_app', 'User')
    
    # Map RH roles to RH service
    User.objects.filter(role__in=['RH_SIMPLE', 'RH_AGENT', 'GRH']).update(service='RH')
    # Map other roles to OTHER service as default
    User.objects.filter(role='EMPLOYEE').update(service='OTHER')
    User.objects.filter(role='CHEF').update(service='OTHER')


def migrate_employee_roles(apps, schema_editor):
    """
    Map Employee.service to Employee.role.
    If service.code == 'RH', set role to 'RH'. 
    For other services, set role to 'EMPLOYEE'.
    """
    Employee = apps.get_model('madar_app', 'Employee')
    
    # Map RH service employees to RH role
    Employee.objects.filter(service__code='RH').update(role='RH')
    
    # Map other service employees to EMPLOYEE role
    Employee.objects.exclude(service__code='RH').update(role='EMPLOYEE')
    
    # Handle null service case
    Employee.objects.filter(service__isnull=True).update(role='EMPLOYEE')


def reverse_migrate_user_roles(apps, schema_editor):
    """Reverse: Clear service field (user can manually set roles again)."""
    User = apps.get_model('madar_app', 'User')
    User.objects.all().update(service=None)


def reverse_migrate_employee_roles(apps, schema_editor):
    """Reverse: Clear role field."""
    Employee = apps.get_model('madar_app', 'Employee')
    Employee.objects.all().update(role=None)


class Migration(migrations.Migration):

    dependencies = [
        ('madar_app', '0048_employee_role_user_service_alter_user_role'),
    ]

    operations = [
        migrations.RunPython(migrate_user_roles_to_services, reverse_migrate_user_roles),
        migrations.RunPython(migrate_employee_roles, reverse_migrate_employee_roles),
    ]
