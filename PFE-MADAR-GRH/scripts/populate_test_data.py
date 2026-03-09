"""
Script to populate sample data for testing the analytics dashboard.
Run with: python manage.py shell < scripts/populate_test_data.py
"""

from datetime import date, timedelta
from django.utils import timezone
from madar_app.models import (
    User, Employee, Service, Position, Job, Affectation,
    LeaveType, LeaveRequest, AbsenceWarning, ValidationWorkflow
)

# Clear existing test data (optional)
print("Creating sample data for analytics dashboard...")

# ============================================================
# 1. Create Services
# ============================================================
services = {}
service_data = [
    ('HR', 'Human Resources'),
    ('IT', 'Information Technology'),
    ('SALES', 'Sales Department'),
    ('OPS', 'Operations'),
    ('FIN', 'Finance'),
]

for code, name in service_data:
    service, created = Service.objects.get_or_create(
        code=code,
        defaults={
            'nomService': name,
            'statut': 'ACTIF',
            'budget': 100000.00,
        }
    )
    services[code] = service
    print(f"✓ Service: {code} ({name})")

# ============================================================
# 2. Create Positions
# ============================================================
positions_data = [
    'Developer',
    'Manager',
    'HR Specialist',
    'Sales Executive',
    'Accountant',
    'Operations Coordinator',
]

positions = {}
for pos_name in positions_data:
    position, created = Position.objects.get_or_create(
        name=pos_name,
    )
    positions[pos_name] = position
    print(f"✓ Position: {pos_name}")

# ============================================================
# 3. Create Job/Poste
# ============================================================
jobs = {}
job_data = [
    ('Dev', 'Senior Developer', 3, 3000, 5000),
    ('Manager', 'Department Manager', 2, 4000, 7000),
    ('HR', 'HR Specialist', 3, 2500, 4000),
    ('Sales', 'Sales Executive', 3, 2000, 4500),
    ('Accounting', 'Accountant', 3, 2500, 4000),
]

for intitule, name, level, min_sal, max_sal in job_data:
    job, created = Job.objects.get_or_create(
        intitule=intitule,
        defaults={
            'niveauHierarchique': level,
            'estManagerial': level <= 2,
            'salaireMini': min_sal,
            'salaireMaxi': max_sal,
            'nbrPostes': 3,
        }
    )
    jobs[intitule] = job
    print(f"✓ Job: {intitule}")

# ============================================================
# 4. Create Employees
# ============================================================
employees = []
employee_data = [
    # HR Service
    ('alice', 'alice@company.com', 'HR', 'Dev', 'CDI'),
    ('bob', 'bob@company.com', 'HR', 'Manager', 'CDI'),
    ('charlie', 'charlie@company.com', 'HR', 'HR', 'CDI'),
    
    # IT Service
    ('david', 'david@company.com', 'IT', 'Dev', 'CDI'),
    ('eve', 'eve@company.com', 'IT', 'Dev', 'CDD'),
    ('frank', 'frank@company.com', 'IT', 'Dev', 'CDI'),
    
    # Sales Service
    ('grace', 'grace@company.com', 'SALES', 'Sales', 'CDI'),
    ('henry', 'henry@company.com', 'SALES', 'Sales', 'CDI'),
    ('iris', 'iris@company.com', 'SALES', 'Sales', 'CDI'),
    ('jack', 'jack@company.com', 'SALES', 'Sales', 'CDI'),
    ('kate', 'kate@company.com', 'SALES', 'Sales', 'CDI'),
    ('leo', 'leo@company.com', 'SALES', 'Sales', 'CDD'),
    ('mia', 'mia@company.com', 'SALES', 'Sales', 'STAGE'),
    
    # Operations
    ('noah', 'noah@company.com', 'OPS', 'Accounting', 'CDI'),
    ('olivia', 'olivia@company.com', 'OPS', 'Accounting', 'CDI'),
]

for fname, email, service_code, job_intitule, contract in employee_data:
    employee, created = Employee.objects.get_or_create(
        email=email,
        defaults={
            'first_name': fname.capitalize(),
            'last_name': 'Test',
            'position': positions.get('Developer'),
            'service': services[service_code],
            'contract_type': contract,
            'salary': 3000.00,
        }
    )
    employees.append(employee)
    print(f"✓ Employee: {fname} ({service_code}, {contract})")

# ============================================================
# 5. Create Affectations (Job Assignments)
# ============================================================
for employee in employees:
    job = jobs.get('Dev') or jobs[list(jobs.keys())[0]]
    affectation, created = Affectation.objects.get_or_create(
        employee=employee,
        job=job,
        defaults={
            'dateDebut': date.today() - timedelta(days=180),
            'dateFin': None,
            'typeAffectation': 'TITULAIRE',
            'estPrimaire': True,
        }
    )
    if created:
        print(f"✓ Affectation: {employee.first_name} -> {job.intitule}")

# ============================================================
# 6. Create Leave Types
# ============================================================
leave_types = {}
leave_data = [
    ('CA', 'Congé Annuel', 20, True, False, 0),
    ('CM', 'Congé Maladie', 5, True, True, 0),
    ('MAT', 'Congé Maternité', 90, True, False, 30),
]

for code, libelle, days, payant, recond, preavis in leave_data:
    lt, created = LeaveType.objects.get_or_create(
        code=code,
        defaults={
            'libelle': libelle,
            'nbrJoursDroit': days,
            'estPayant': payant,
            'reconductible': recond,
            'delaiPreavis': preavis,
        }
    )
    leave_types[code] = lt
    print(f"✓ LeaveType: {code}")

# ============================================================
# 7. Create some Leave Requests (for turnover/absence calc)
# ============================================================
# Add a couple leaves to create history
today = date.today()
for i, employee in enumerate(employees[:3]):  # First 3 employees
    for leave_code in ['CA', 'CM']:
        leave_type = leave_types.get(leave_code)
        if leave_type:
            leave_req, created = LeaveRequest.objects.get_or_create(
                employee=employee,
                start_date=today - timedelta(days=60 + i*10),
                end_date=today - timedelta(days=55 + i*10),
                type=leave_type,
                defaults={
                    'status': 'ACCEPTED',
                    'reason': f'Test leave for {leave_code}',
                }
            )
            if created:
                print(f"✓ LeaveRequest: {employee.first_name} ({leave_code})")

# ============================================================
# 8. Create Absence Warnings (for absenteeism calculation)
# ============================================================
for i, employee in enumerate(employees[:5]):  # First 5 employees
    for day_offset in range(0, 10, 3):  # Multiple absence days
        absence, created = AbsenceWarning.objects.get_or_create(
            employee=employee,
            date=today - timedelta(days=day_offset),
            defaults={
                'comment': 'Test absence',
            }
        )
        if created:
            print(f"✓ AbsenceWarning: {employee.first_name}")

# ============================================================
# 9. Create a GRH user for testing
# ============================================================
grh_user, created = User.objects.get_or_create(
    email='drh@company.com',
    defaults={
        'first_name': 'Director',
        'last_name': 'RH',
        'role': 'GRH',
    }
)
if created:
    grh_user.set_password('Test123!')
    grh_user.save()
    print(f"✓ GRH User: drh@company.com (password: Test123!)")
else:
    print(f"✓ GRH User exists: drh@company.com")

print("\n" + "="*60)
print("✅ Sample data population complete!")
print("="*60)
print("\nYou can now login with:")
print("  Email: drh@company.com")
print("  Password: Test123!")
print("\nAnd access the Analytics Dashboard at:")
print("  http://localhost:5173/analytics")
print("\n" + "="*60)
