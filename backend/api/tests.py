"""Core-flow tests: auth gates, write-locking, validation, secret handling.

Run:  cd backend && DATABASE_URL=sqlite:///db.sqlite3 SECURE_SSL_REDIRECT=0 \
        python manage.py test
"""
import json

from django.test import TestCase

from .models import AboutMe


def j(**kwargs):
    return json.dumps(kwargs)


class AuthGateFlowTests(TestCase):
    def setUp(self):
        self.r = self.client.post(
            '/api/auth/register/',
            data=j(full_name='Test User', username='testuser',
                   date_of_birth='2000-01-01', dream='fly high',
                   secret_code='abcd'),
            content_type='application/json',
        )
        assert self.r.status_code == 201, self.r.content[:200]

    def _gate1(self, username='testuser'):
        r = self.client.post('/api/auth/gate1/', data=j(username=username),
                             content_type='application/json')
        self.assertEqual(r.status_code, 200)
        return r.json()['preauth_token']

    def _gate2(self, preauth, dream='fly high'):
        r = self.client.post('/api/auth/gate2/',
                             data=j(preauth_token=preauth, dream=dream),
                             content_type='application/json')
        return r

    def test_register_stores_hash_not_plaintext(self):
        stored = AboutMe.objects.first().base_secret_code
        self.assertTrue(stored.startswith('pbkdf2_'))
        self.assertNotIn('abcd', stored)

    def test_gate2_rejects_wrong_dream(self):
        r = self._gate2(self._gate1(), dream='nope')
        self.assertEqual(r.status_code, 400)

    def test_full_flow_issues_usable_token(self):
        t2 = self._gate2(self._gate1()).json()['preauth_token']
        r3 = self.client.post('/api/auth/gate3/',
                              data=j(preauth_token=t2, secret_code='abcd'),
                              content_type='application/json')
        self.assertEqual(r3.status_code, 200)
        body = r3.json()
        self.assertIn('auth_token', body)
        self.assertEqual(body['user']['username'], 'testuser')
        me = self.client.get('/api/auth/me/',
                             HTTP_AUTHORIZATION=f'Bearer {body["auth_token"]}')
        self.assertEqual(me.status_code, 200)

    def test_chained_tokens_reject_skips(self):
        t1 = self._gate1()
        r3 = self.client.post('/api/auth/gate3/',
                              data=j(preauth_token=t1, secret_code='abcd'),
                              content_type='application/json')
        self.assertEqual(r3.status_code, 401)

    def test_legacy_plaintext_secret_upgrades_on_login(self):
        AboutMe.objects.filter(pk=AboutMe.objects.first().pk).update(
            base_secret_code='abcd')
        t2 = self._gate2(self._gate1()).json()['preauth_token']
        r3 = self.client.post('/api/auth/gate3/',
                              data=j(preauth_token=t2, secret_code='abcd'),
                              content_type='application/json')
        self.assertEqual(r3.status_code, 200)
        self.assertTrue(
            AboutMe.objects.first().base_secret_code.startswith('pbkdf2_'))

    def test_me_rejects_missing_and_bad_tokens(self):
        self.assertEqual(self.client.get('/api/auth/me/').status_code, 401)
        self.assertEqual(
            self.client.get('/api/auth/me/',
                            HTTP_AUTHORIZATION='Bearer junk').status_code, 401)

    def test_logout_ok(self):
        r = self.client.post('/api/auth/logout/', data=j(token='x'),
                             content_type='application/json')
        self.assertEqual(r.status_code, 200)


class WriteLockTests(TestCase):
    def test_reads_open_writes_locked(self):
        self.assertEqual(self.client.get('/api/node-matrix/').status_code, 200)
        self.assertEqual(self.client.get('/api/blog/posts/').status_code, 200)
        r = self.client.post('/api/node-matrix/',
                             data=j(emoji='x', title='t', text='b'),
                             content_type='application/json')
        self.assertEqual(r.status_code, 403)
        r = self.client.post('/api/challenges/',
                             data=j(title='t', type='days',
                                    start_date='2026-01-01', duration_days=3),
                             content_type='application/json')
        self.assertEqual(r.status_code, 403)

    def test_verify_secret_gate_field(self):
        AboutMe.objects.create(name='V', email='v@x.io', portal_dream='d',
                               base_secret_code='abcd')
        ok = self.client.post('/api/verify-secret/',
                              data=j(field='gate', value='abcd'),
                              content_type='application/json')
        self.assertEqual(ok.json(), {'allowed': True})
        bad = self.client.post('/api/verify-secret/',
                               data=j(field='gate', value='xxxx'),
                               content_type='application/json')
        self.assertEqual(bad.json(), {'allowed': False})


class ValidationTests(TestCase):
    def _authed(self):
        from django.core.signing import TimestampSigner
        from api.authentication import AUTH_SALT
        token = TimestampSigner(salt=AUTH_SALT).sign('auth:tester')
        return {'HTTP_AUTHORIZATION': f'Bearer {token}'}

    def test_challenge_dates_400_not_500(self):
        for payload in [
            {'title': 't', 'type': 'days', 'start_date': None, 'duration_days': 3},
            {'title': 't', 'type': 'days', 'duration_days': 3},
            {'title': 't', 'type': 'days', 'start_date': '2026-01-01'},
        ]:
            r = self.client.post('/api/challenges/', data=j(**payload),
                                 content_type='application/json', **self._authed())
            self.assertEqual(r.status_code, 400, payload)

    def test_register_short_secret_400(self):
        r = self.client.post(
            '/api/auth/register/',
            data=j(full_name='A B', username='abc', date_of_birth='2000-01-01',
                   dream='d', secret_code='x'),
            content_type='application/json')
        self.assertEqual(r.status_code, 400)

    def test_blog_ordering_accepted_values(self):
        from django.db import connection
        for q in ['?ordering=popular', '?ordering=newest']:
            self.assertEqual(
                self.client.get(f'/api/blog/posts/{q}').status_code, 200)
        if connection.vendor != 'postgresql':
            self.skipTest('tags__contains needs Postgres JSON support')
        for q in ['?tag=x', '?search=hello']:
            self.assertEqual(
                self.client.get(f'/api/blog/posts/{q}').status_code, 200)

    def test_aboutme_hides_gate_credential(self):
        AboutMe.objects.create(name='V', email='v@x.io', portal_dream='d',
                               base_secret_code='abcd')
        body = self.client.get('/api/aboutme').content.decode()
        self.assertNotIn('baseSecretCode', body)
        self.assertIn('portalDream', body)
