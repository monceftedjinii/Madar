from django.db import migrations
from decimal import Decimal


def seed_hr_service(apps, schema_editor):
    """Create the HR service if it doesn't exist. HR is the only RH-specific service."""
    Service = apps.get_model('madar_app', 'Service')
    Service.objects.get_or_create(
        code='HR',
        defaults={
            'nomService': 'Ressources Humaines',
            'statut': 'ACTIF',
            'budget': Decimal('0'),
        }
    )


def reverse_seed(apps, schema_editor):
    pass  # Don't delete on reverse — service may have employees


class Migration(migrations.Migration):

    dependencies = [
        ('madar_app', '0053_add_sexe_to_employee'),
    ]

    operations = [
        migrations.RunPython(seed_hr_service, reverse_seed),
    ]
