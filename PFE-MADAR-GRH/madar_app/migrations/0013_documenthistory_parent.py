from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('madar_app', '0012_document_sent_at'),
    ]

    operations = [
        migrations.AddField(
            model_name='documenthistory',
            name='parent',
            field=models.ForeignKey(blank=True, null=True, on_delete=models.CASCADE, related_name='replies', to='madar_app.documenthistory'),
        ),
    ]
