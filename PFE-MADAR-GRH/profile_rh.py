import os, django, time
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()
from django.contrib.auth import get_user_model
User = get_user_model()
u = User.objects.filter(role='GRH').first()
from madar_app.services import RhDashboardService

class Profiler:
    def __init__(self, svc):
        self.svc = svc
    def build(self):
        t0 = time.time()
        employees_qs = self.svc._get_employees_qs() if hasattr(self.svc, '_get_employees_qs') else []
        t1 = time.time()
        print(f"init: {t1-t0:.3f}s")
        return self.svc.build()

svc = RhDashboardService(u)
t0 = time.time()
svc.build()
t1 = time.time()
print(f"Total: {t1-t0:.3f}s")
