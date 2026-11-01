from django.db import migrations, models


def rename_old_moods(apps, schema_editor):
    """'Okay' became 'Fine' and 'Wired' became 'Worse'."""
    DayLog = apps.get_model('api', 'DayLog')
    DayLog.objects.filter(mood='Okay').update(mood='Fine')
    DayLog.objects.filter(mood='Wired').update(mood='Worse')


def restore_old_moods(apps, schema_editor):
    DayLog = apps.get_model('api', 'DayLog')
    DayLog.objects.filter(mood='Fine').update(mood='Okay')
    DayLog.objects.filter(mood='Worse').update(mood='Wired')


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0015_blogcategory_blogpost_blogcomment_and_more"),
    ]

    operations = [
        migrations.AlterField(
            model_name='daylog',
            name='mood',
            field=models.CharField(
                choices=[
                    ('Happy', 'Happy'),
                    ('Fine', 'Fine'),
                    ('Neutral', 'Neutral'),
                    ('Sad', 'Sad'),
                    ('Worse', 'Worse'),
                    ('Tired', 'Tired'),
                    ('Wooow', 'Wooow'),
                ],
                default='Neutral',
                max_length=15,
            ),
        ),
        migrations.RunPython(rename_old_moods, restore_old_moods),
    ]
