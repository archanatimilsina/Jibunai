import mimetypes
import uuid
import os
from django.conf import settings
from django.core.exceptions import ImproperlyConfigured
from django.core.files.storage import Storage
from supabase import create_client, Client


class SupabaseStorage(Storage):
    def __init__(self):
        if not settings.SUPABASE_URL or not settings.SUPABASE_KEY:
            raise ImproperlyConfigured(
                "SUPABASE_URL and SUPABASE_KEY must be set "
                "(backend/.env — see backend README / .env handling)."
            )
        self.client: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
        self.bucket_name = settings.SUPABASE_BUCKET_NAME

    def _save(self, name, content):
        content.seek(0)
        file_bytes = content.read()
        content_type = mimetypes.guess_type(name)[0] or 'application/octet-stream'

        self.client.storage.from_(self.bucket_name).upload(
            path=name,
            file=file_bytes,
            file_options={"content-type": content_type, "upsert": "true"},
        )
        return name

    def _open(self, name, mode='rb'):
        raise NotImplementedError("SupabaseStorage does not support opening files for read.")

    def exists(self, name):
        return False

    def get_available_name(self, name, max_length=None):
        # Preserve the model's upload_to prefix (pdfs/{id}/, scrapbook/,
        # certificates/, blog/covers/) — only the basename is uniquified.
        directory, filename = os.path.split(name)
        root, ext = os.path.splitext(filename)
        unique = f"{root or 'file'}-{uuid.uuid4().hex[:12]}{ext}"
        candidate = f"{directory}/{unique}" if directory else unique
        if max_length and len(candidate) > max_length:
            overflow = len(candidate) - max_length
            trimmed = root[: max(1, len(root) - overflow)] or 'file'
            unique = f"{trimmed}-{uuid.uuid4().hex[:8]}{ext}"
            candidate = f"{directory}/{unique}" if directory else unique
        return candidate

    def url(self, name):
        return self.client.storage.from_(self.bucket_name).get_public_url(name)

    def delete(self, name):
        try:
            self.client.storage.from_(self.bucket_name).remove([name])
        except Exception:
            pass

    def size(self, name):
        return 0
