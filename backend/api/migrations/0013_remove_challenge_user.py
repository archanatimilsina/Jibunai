

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0012_challenge_challengeday"),
    ]

    operations = [
        migrations.RemoveField(
            model_name="challenge",
            name="user",
        ),
    ]
