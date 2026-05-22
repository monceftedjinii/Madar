import os
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
import django; django.setup()

from madar_app.models import Attendance, Employee
from datetime import date, timedelta, time
import random

emp = Employee.objects.get(email='sofiane.belkacem@madar.com')

# Set hire date to November 14, 2024 (about 18 months ago — clearly before 6 months)
hire_date = date(2024, 11, 14)
emp.hired_at = hire_date
emp.save()
print(f"hired_at set to: {emp.hired_at}")

# Delete existing attendance and rebuild from hire date
Attendance.objects.filter(employee=emp).delete()
print("Cleared existing attendance")

today = date.today()
random.seed(99)

# Planned absences — realistic for 18 months of work
planned_absences = {
    # Dec 2024 — settling in, few absences
    date(2024, 12, 24): "leave",
    date(2024, 12, 31): "leave",
    # Jan 2025
    date(2025, 1, 2):  "leave",  # New Year bridge
    date(2025, 1, 20): "sick",
    # Feb 2025
    date(2025, 2, 13): "sick",
    date(2025, 2, 14): "sick",
    # March 2025
    date(2025, 3, 6):  "sick",
    # April 2025
    date(2025, 4, 10): "leave",
    date(2025, 4, 22): "absence",
    # May 2025
    date(2025, 5, 1):  "leave",   # Fête du Travail
    date(2025, 5, 2):  "leave",
    # June 2025
    date(2025, 6, 19): "sick",
    date(2025, 6, 20): "sick",
    # July 2025 — summer leave
    date(2025, 7, 14): "leave",
    date(2025, 7, 15): "leave",
    date(2025, 7, 16): "leave",
    date(2025, 7, 17): "leave",
    date(2025, 7, 18): "leave",
    # Aug 2025 — summer leave
    date(2025, 8, 4):  "leave",
    date(2025, 8, 5):  "leave",
    date(2025, 8, 6):  "leave",
    date(2025, 8, 7):  "leave",
    date(2025, 8, 8):  "leave",
    # Sep 2025
    date(2025, 9, 11): "sick",
    # Oct 2025
    date(2025, 10, 9): "absence",
    date(2025, 10, 30): "absence",
    # Nov 2025
    date(2025, 11, 18): "sick",
    date(2025, 11, 19): "sick",
    # Dec 2025
    date(2025, 12, 24): "leave",
    date(2025, 12, 31): "leave",
    # Jan 2026
    date(2026, 1, 15): "sick",
    # Feb 2026
    date(2026, 2, 5):  "absence",
    date(2026, 2, 6):  "absence",
    # March 2026
    date(2026, 3, 20): "sick",
    # April 2026
    date(2026, 4, 9):  "absence",
}

# Days with incomplete records (no checkout)
incomplete_days = {
    date(2024, 12, 5),
    date(2025, 1, 28),
    date(2025, 3, 18),
    date(2025, 5, 27),
    date(2025, 7, 3),
    date(2025, 9, 25),
    date(2025, 11, 6),
    date(2026, 1, 22),
    date(2026, 3, 11),
    date(2026, 4, 23),
}

created = 0
current = hire_date

while current <= today:
    if current.weekday() >= 5:      # Skip weekends
        current += timedelta(days=1)
        continue
    if current in planned_absences:  # Skip absences
        current += timedelta(days=1)
        continue

    # Check-in: mostly 8:00-8:45, occasionally earlier/later
    if random.random() < 0.7:
        ci_m = random.randint(480, 525)   # 8:00-8:45
    elif random.random() < 0.5:
        ci_m = random.randint(455, 479)   # 7:35-7:59 (early)
    else:
        ci_m = random.randint(526, 560)   # 8:46-9:20 (late)
    check_in = time(ci_m // 60, ci_m % 60)

    # Check-out
    if current in incomplete_days:
        check_out = None
    else:
        if random.random() < 0.25:
            co_m = random.randint(1050, 1110)  # 17:30-18:30
        else:
            co_m = random.randint(1020, 1049)  # 17:00-17:29
        check_out = time(co_m // 60, co_m % 60)

    Attendance.objects.create(
        employee=emp,
        date=current,
        check_in_time=check_in,
        check_out_time=check_out,
    )
    created += 1
    current += timedelta(days=1)

# Summary by month
from collections import defaultdict
by_month = defaultdict(lambda: {"present": 0, "incomplete": 0, "absent": 0, "total_work": 0})

# Count absences per month
for d, reason in planned_absences.items():
    if d >= hire_date and d <= today and d.weekday() < 5:
        key = d.strftime('%b %Y')
        by_month[key]["absent"] += 1
        by_month[key]["total_work"] += 1

for a in Attendance.objects.filter(employee=emp).order_by('date'):
    key = a.date.strftime('%b %Y')
    by_month[key]["total_work"] += 1
    if a.check_out_time:
        by_month[key]["present"] += 1
    else:
        by_month[key]["incomplete"] += 1

print(f"\nCreated {created} attendance records")
print(f"Hire date: {hire_date}\n")
print(f"{'Mois':<16} {'Présent':>8} {'Incomplet':>10} {'Absent':>8} {'Taux':>6}")
print("-" * 52)
for month in sorted(by_month.keys(), key=lambda m: by_month[m]):
    s = by_month[month]
    total = s["total_work"]
    rate = round(s["present"] / total * 100) if total else 0
    print(f"{month:<16} {s['present']:>8} {s['incomplete']:>10} {s['absent']:>8} {rate:>5}%")
