

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0009_remove_operativegoal_emoji_and_more"),
    ]

    operations = [
        migrations.RemoveField(
            model_name="aboutme",
            name="clearance_level",
        ),
    ]
