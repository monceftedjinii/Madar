import os, django, time
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()
from django.test import Client
from django.contrib.auth import get_user_model
User = get_user_model()
u = User.objects.filter(role='EMPLOYEE').first() or User.objects.first()
client = Client(SERVER_NAME='localhost')
client.force_login(u)

endpoints = [
    '/api/documents/me/',
    '/api/leaves/me/',
    '/api/tasks/me/',
    '/api/absences/yesterday/',
    '/api/notifications/',
    '/api/documents/feed/'
]
for ep in endpoints:
    t0 = time.time()
    resp = client.get(ep)
    t1 = time.time()
    print(f"{ep}: status {resp.status_code}, {len(resp.content)} bytes, {t1-t0:.2f} seconds")
