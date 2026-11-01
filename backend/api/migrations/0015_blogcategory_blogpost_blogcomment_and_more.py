

import api.models
import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0014_pdfdocument"),
    ]

    operations = [
        migrations.CreateModel(
            name="BlogCategory",
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
                ("name", models.CharField(max_length=100, unique=True)),
                ("slug", models.SlugField(blank=True, max_length=120, unique=True)),
                ("description", models.CharField(blank=True, max_length=255)),
                ("color", models.CharField(default="#2d6a4f", max_length=7)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
            ],
            options={
                "verbose_name": "Blog category",
                "verbose_name_plural": "Blog categories",
                "ordering": ["name"],
            },
        ),
        migrations.CreateModel(
            name="BlogPost",
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
                ("title", models.CharField(max_length=255)),
                ("slug", models.SlugField(blank=True, max_length=280, unique=True)),
                ("excerpt", models.TextField(blank=True)),
                ("content", models.TextField(blank=True)),
                (
                    "cover_image",
                    models.ImageField(
                        blank=True,
                        null=True,
                        upload_to=api.models.blog_cover_upload_path,
                        validators=[api.models.validate_cover_image],
                    ),
                ),
                ("tags", models.JSONField(blank=True, default=list)),
                (
                    "author",
                    models.CharField(default="Archana Timilsina", max_length=120),
                ),
                (
                    "status",
                    models.CharField(
                        choices=[("draft", "Draft"), ("published", "Published")],
                        default="draft",
                        max_length=12,
                    ),
                ),
                ("is_featured", models.BooleanField(default=False)),
                ("read_time", models.PositiveIntegerField(default=1, editable=False)),
                ("views", models.PositiveIntegerField(default=0, editable=False)),
                ("likes", models.PositiveIntegerField(default=0, editable=False)),
                ("published_at", models.DateTimeField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "category",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="posts",
                        to="api.blogcategory",
                    ),
                ),
            ],
            options={
                "verbose_name": "Blog post",
                "verbose_name_plural": "Blog posts",
                "ordering": ["-is_featured", "-published_at", "-created_at"],
            },
        ),
        migrations.CreateModel(
            name="BlogComment",
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
                ("author_name", models.CharField(default="Anonymous", max_length=120)),
                ("body", models.TextField()),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "post",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="comments",
                        to="api.blogpost",
                    ),
                ),
            ],
            options={
                "verbose_name": "Blog comment",
                "verbose_name_plural": "Blog comments",
                "ordering": ["created_at"],
            },
        ),
        migrations.AddIndex(
            model_name="blogpost",
            index=models.Index(fields=["status"], name="api_blogpos_status_c8756c_idx"),
        ),
        migrations.AddIndex(
            model_name="blogpost",
            index=models.Index(fields=["slug"], name="api_blogpos_slug_2bbab2_idx"),
        ),
    ]
