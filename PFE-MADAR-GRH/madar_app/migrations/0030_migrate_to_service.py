# Generated manually on 2026-03-09
# Migrates from Department to Service model

from django.db import migrations, models
import django.db.models.deletion


def migrate_department_to_service(apps, schema_editor):
    """
    Migrate existing Department records to Service records.
    Maps department_id to service_code by creating codes from names.
    """
    Department = apps.get_model('madar_app', 'Department')
    Service = apps.get_model('madar_app', 'Service')
    Employee = apps.get_model('madar_app', 'Employee')
    
    # Create a mapping of department IDs to service codes
    dept_to_service = {}
    
    for dept in Department.objects.all():
        # Create a service code from department name (uppercase, remove spaces, max 20 chars)
        code = dept.name.upper().replace(' ', '_')[:20]
        
        # Ensure uniqueness
        base_code = code
        counter = 1
        while Service.objects.filter(code=code).exists():
            code = f"{base_code[:17]}_{counter}"
            counter += 1
        
        # Create Service record
        service = Service.objects.create(
            code=code,
            nomService=dept.name,
            statut='ACTIF',
            budget=0  # Default budget
        )
        
        dept_to_service[dept.id] = service.code
    
    # Migrate Employee.department to Employee.service
    for emp in Employee.objects.all():
        if emp.department_id and emp.department_id in dept_to_service:
            emp.service_id = dept_to_service[emp.department_id]
            emp.save()


def migrate_document_fields(apps, schema_editor):
    """
    Migrate Document source_department and target_department to service fields.
    """
    Department = apps.get_model('madar_app', 'Department')
    Service = apps.get_model('madar_app', 'Service')
    Document = apps.get_model('madar_app', 'Document')
    
    # Create mapping
    dept_to_service = {}
    for dept in Department.objects.all():
        code = dept.name.upper().replace(' ', '_')[:20]
        service = Service.objects.filter(nomService=dept.name).first()
        if service:
            dept_to_service[dept.id] = service.code
    
    # Migrate documents
    for doc in Document.objects.all():
        if doc.source_department_id and doc.source_department_id in dept_to_service:
            doc.source_service_id = dept_to_service[doc.source_department_id]
        if doc.target_department_id and doc.target_department_id in dept_to_service:
            doc.target_service_id = dept_to_service[doc.target_department_id]
        doc.save()


def migrate_announcement_fields(apps, schema_editor):
    """
    Migrate Announcement target_department to target_service.
    """
    Department = apps.get_model('madar_app', 'Department')
    Service = apps.get_model('madar_app', 'Service')
    Announcement = apps.get_model('madar_app', 'Announcement')
    
    # Create mapping
    dept_to_service = {}
    for dept in Department.objects.all():
        service = Service.objects.filter(nomService=dept.name).first()
        if service:
            dept_to_service[dept.id] = service.code
    
    # Migrate announcements
    for ann in Announcement.objects.all():
        if ann.scope == 'DEPARTMENT':
            ann.scope = 'SERVICE'
        if ann.target_department_id and ann.target_department_id in dept_to_service:
            ann.target_service_id = dept_to_service[ann.target_department_id]
        ann.save()


class Migration(migrations.Migration):

    dependencies = [
        ('madar_app', '0029_create_service_model'),
    ]

    operations = [
        # Step 1: Add service field to Employee (nullable)
        migrations.AddField(
            model_name='employee',
            name='service',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                to='madar_app.service',
                to_field='code'
            ),
        ),
        
        # Step 2: Migrate Department data to Service and update Employee.service
        migrations.RunPython(migrate_department_to_service, migrations.RunPython.noop),
        
        # Step 3: Add service fields to Document (nullable)
        migrations.AddField(
            model_name='document',
            name='source_service',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name='documents_created',
                to='madar_app.service',
                to_field='code'
            ),
        ),
        migrations.AddField(
            model_name='document',
            name='target_service',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='documents_received',
                to='madar_app.service',
                to_field='code'
            ),
        ),
        
        # Step 4: Migrate Document fields
        migrations.RunPython(migrate_document_fields, migrations.RunPython.noop),
        
        # Step 5: Add service field to Announcement (nullable)
        migrations.AddField(
            model_name='announcement',
            name='target_service',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name='announcements',
                to='madar_app.service',
                to_field='code'
            ),
        ),
        
        # Step 6: Migrate Announcement fields
        migrations.RunPython(migrate_announcement_fields, migrations.RunPython.noop),
        
        # Step 7: Update Announcement scope choices
        migrations.AlterField(
            model_name='announcement',
            name='scope',
            field=models.CharField(
                choices=[('GLOBAL', 'All Users'), ('SERVICE', 'Specific Service')],
                default='GLOBAL',
                max_length=20
            ),
        ),
        
        # Step 8: Remove old department fields
        migrations.RemoveField(
            model_name='employee',
            name='department',
        ),
        migrations.RemoveField(
            model_name='document',
            name='source_department',
        ),
        migrations.RemoveField(
            model_name='document',
            name='target_department',
        ),
        migrations.RemoveField(
            model_name='announcement',
            name='target_department',
        ),
        
        # Step 9: Delete Department model
        migrations.DeleteModel(
            name='Department',
        ),
    ]
