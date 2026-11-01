

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0011_project_live_url_alter_watchlistitem_genre_and_more"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="Challenge",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("title", models.CharField(max_length=200)),
                (
                    "type",
                    models.CharField(
                        choices=[("days", "Days"), ("instant", "Instant")],
                        max_length=10,
                    ),
                ),
                ("start_date", models.DateField()),
                ("duration_days", models.PositiveIntegerField()),
                ("end_date", models.DateField()),
                (
                    "instant_status",
                    models.CharField(
                        blank=True,
                        choices=[
                            ("completed", "Completed"),
                            ("not_completed", "Not completed"),
                            ("pending", "Pending"),
                        ],
                        default="pending",
                        max_length=20,
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="challenges",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "ordering": ["-created_at"],
            },
        ),
        migrations.CreateModel(
            name="ChallengeDay",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("date", models.DateField()),
                (
                    "status",
                    models.CharField(
                        choices=[("completed", "Completed")],
                        default="completed",
                        max_length=10,
                    ),
                ),
                ("marked_at", models.DateTimeField(auto_now_add=True)),
                (
                    "challenge",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="days",
                        to="api.challenge",
                    ),
                ),
            ],
            options={
                "ordering": ["date"],
                "unique_together": {("challenge", "date")},
            },
        ),
    ]
