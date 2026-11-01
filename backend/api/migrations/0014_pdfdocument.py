

import api.models
import uuid
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0013_remove_challenge_user"),
    ]

    operations = [
        migrations.CreateModel(
            name="PDFDocument",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                ("title", models.CharField(max_length=255)),
                (
                    "file",
                    models.FileField(
                        upload_to=api.models.pdf_upload_path,
                        validators=[api.models.validate_pdf],
                    ),
                ),
                (
                    "size",
                    models.PositiveIntegerField(blank=True, editable=False, null=True),
                ),
                ("uploaded_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={
                "ordering": ["-uploaded_at"],
            },
        ),
    ]
