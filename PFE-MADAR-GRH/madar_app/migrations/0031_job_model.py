# Generated migration for Job model on 2026-03-09

from django.db import migrations, models
import django.db.models.deletion
import django.core.validators


class Migration(migrations.Migration):

    dependencies = [
        ('madar_app', '0030_migrate_to_service'),
    ]

    operations = [
        migrations.CreateModel(
            name='Job',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('intitule', models.CharField(help_text='Job title/name (e.g., Directeur RH, Développeur Senior)', max_length=200, unique=True, verbose_name='Intitulé du poste')),
                ('niveauHierarchique', models.IntegerField(help_text='Hierarchy level (1=Direction, 2=Manager, 3=Execution, etc.)', verbose_name='Niveau hiérarchique')),
                ('estManagerial', models.BooleanField(default=False, help_text='Whether this job manages other people', verbose_name='Est managérial')),
                ('salaireMini', models.DecimalField(decimal_places=2, help_text='Minimum allowed salary for this job', max_digits=10, validators=[django.core.validators.MinValueValidator(0)], verbose_name='Salaire minimum')),
                ('salaireMaxi', models.DecimalField(decimal_places=2, help_text='Maximum allowed salary for this job', max_digits=10, validators=[django.core.validators.MinValueValidator(0)], verbose_name='Salaire maximum')),
                ('nbrPostes', models.IntegerField(default=1, help_text='How many people can occupy this job', validators=[django.core.validators.MinValueValidator(0)], verbose_name='Nombre de postes')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('posteParentId', models.ForeignKey(blank=True, help_text='Parent job in the hierarchy (N+1 relationship)', null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='sous_postes', to='madar_app.job', verbose_name='Poste parent')),
            ],
            options={
                'verbose_name': 'Poste',
                'verbose_name_plural': 'Postes',
                'ordering': ['niveauHierarchique', 'intitule'],
            },
        ),
    ]
