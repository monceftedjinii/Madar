import os, django, time
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()
from django.contrib.auth import get_user_model
User = get_user_model()
u = User.objects.filter(role='RH_SENIOR').first()
from madar_app.services import RhDashboardService
from django.db import connection

svc = RhDashboardService(u)

t0 = time.time()
q0 = len(connection.queries)
svc.build()
q1 = len(connection.queries)
t1 = time.time()

print(f"Total time: {t1-t0:.2f}s")
print(f"Total queries: {q1-q0}")
