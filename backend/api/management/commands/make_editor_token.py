"""Mint a long-lived editor token for the web admin surfaces.

Usage:
    python manage.py make_editor_token [username]

Prints a signed Bearer token (valid ~30 days, like app sessions). Put it in
`web/.env` as VITE_API_TOKEN (and in the web host's env on deploy) so the
web UI can write through `IsAuthenticatedOrReadOnly`. Regenerate monthly.
"""
from django.core.management.base import BaseCommand
from django.core.signing import TimestampSigner

from api.authentication import AUTH_SALT


class Command(BaseCommand):
    help = 'Print a Bearer editor token for the web admin UI.'

    def add_arguments(self, parser):
        parser.add_argument('username', nargs='?', default='editor')

    def handle(self, *args, **options):
        token = TimestampSigner(salt=AUTH_SALT).sign(f'auth:{options["username"]}')
        self.stdout.write(token)
        self.stdout.write(
            self.style.WARNING(
                'Valid ~30 days. Anyone holding it can edit via the API — '
                'treat it like a password and never commit it.'
            )
        )
