

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0002_remove_project_project_note_and_more'),
    ]

    operations = [
        migrations.RenameField(
            model_name='professionaldevelopment',
            old_name='link',
            new_name='certificate_link',
        ),
    ]
