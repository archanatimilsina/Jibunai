import mimetypes
import uuid
import os
from django.conf import settings
from django.core.files.storage import Storage
from supabase import create_client, Client


class SupabaseStorage(Storage):
    def __init__(self):
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
        ext = os.path.splitext(name)[1]
        return f"{uuid.uuid4().hex}{ext}"

    def url(self, name):
        return self.client.storage.from_(self.bucket_name).get_public_url(name)

    def delete(self, name):
        try:
            self.client.storage.from_(self.bucket_name).remove([name])
        except Exception:
            pass

    def size(self, name):
        return 0