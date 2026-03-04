from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('madar_app', '0021_formationcatalog_people_required_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='employee',
            name='position',
            field=models.CharField(blank=True, default='', max_length=100),
        ),
    ]
