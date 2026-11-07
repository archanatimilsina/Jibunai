"""Token auth for the mobile 3-gate flow.

Accepts the stateless signed tokens issued by AuthGate3View
(`POST /api/auth/gate3/`). Anything without (or with an invalid)
`Authorization: Bearer …` header authenticates as nobody — endpoints stay
open under the global `AllowAny` default (see `soul/settings.py`) so the
shipped mobile/web clients keep working. The class exists so sensitive
views can opt into `IsAuthenticated` later without a flag day.
"""
from django.core.signing import BadSignature, SignatureExpired, TimestampSigner
from rest_framework.authentication import BaseAuthentication

# Single source of truth for the mobile 3-gate signed tokens.
# (Kept here instead of views.py: DRF imports this module while
# api.views is still initializing, so importing from views would cycle.)
PREAUTH_SALT = 'jibunai-preauth'
GATE2_SALT = 'jibunai-preauth2'
AUTH_SALT = 'jibunai-auth'
PREAUTH_MAX_AGE = 600
GATE2_MAX_AGE = 600
AUTH_MAX_AGE = 90 * 24 * 3600  # 90 days — mobile sessions stay logged in longer


class JibunaiUser:
    """Minimal user-like object for a verified pre-shared-secret session."""

    is_authenticated = True
    is_anonymous = False
    is_active = True

    def __init__(self, username):
        self.username = username
        # Ident used by DRF's UserRateThrottle; keyed by name (single-owner app).
        self.pk = username
        self.id = username

    def __str__(self):
        return f'jibunai:{self.username}'

    def has_perm(self, _perm, _obj=None):
        return False

    def has_perms(self, _perms, _obj=None):
        return False


class JibunaiTokenAuthentication(BaseAuthentication):
    keyword = 'Bearer'

    def authenticate(self, request):
        raw = request.META.get('HTTP_AUTHORIZATION', '')
        if not raw.startswith(f'{self.keyword} '):
            return None
        token = raw[len(self.keyword) + 1:].strip()
        if not token:
            return None
        try:
            unsigned = TimestampSigner(salt=AUTH_SALT).unsign(token, max_age=AUTH_MAX_AGE)
        except (BadSignature, SignatureExpired):
            return None
        username = unsigned.partition(':')[2] or unsigned
        if not username:
            return None
        return (JibunaiUser(username), token)
