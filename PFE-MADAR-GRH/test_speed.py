import os, django, time
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()
from django.test import Client
from django.contrib.auth import get_user_model
User = get_user_model()
u = User.objects.filter(role='GRH').first() or User.objects.first()
client = Client(SERVER_NAME='localhost')
client.force_login(u)

endpoints = [
    '/api/whoami/',
    '/api/notifications/',
    '/api/dashboard/rh/?month=2026-05',
    '/api/leave-types/',
    '/api/leaves/balances/',
    '/api/absences/yesterday/',
    '/api/discipline/flags/'
]
for ep in endpoints:
    t0 = time.time()
    resp = client.get(ep)
    t1 = time.time()
    print(f"{ep}: status {resp.status_code}, {t1-t0:.2f} seconds")
