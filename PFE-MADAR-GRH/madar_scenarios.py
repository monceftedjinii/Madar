"""
MADAR Enterprise scenarios – fills DB with realistic data for presentation.
Run with:  python manage.py shell < madar_scenarios.py
"""
import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

import random
from datetime import date, timedelta, time as dtime
from decimal import Decimal
from django.utils import timezone
from django.contrib.auth import get_user_model
from madar_app.models import (
    Employee, Service, Position, User, RoleChoices, EmployeeRoleChoices,
    LeaveType, LeaveRequest, ValidationWorkflow, SoldeConge,
    Attendance, Evaluation, EvaluationCriteria, EvaluationScore, EvaluationCampaign,
    Task, Notification, AbsenceJustification,
)

User = get_user_model()
TODAY = date.today()
PWD = 'Demo1234!'

def p(msg): print(msg)

# ─── 0. Reset passwords for key accounts ──────────────────────────────────────
p('\n── 0. Setting passwords ──')
for email in ['rh_senior@example.com', 'abdelmonceftedjini@gmail.com',
              'sofiane.belkacem@madar.com', 'djamel.benali@madar.com']:
    try:
        u = User.objects.get(email=email)
        u.set_password(PWD)
        u.save()
        p(f'  ✓ {email}')
    except User.DoesNotExist:
        p(f'  ✗ NOT FOUND: {email}')

# ─── 1. Add more HR employees so the chef has a real team ─────────────────────
p('\n── 1. Adding HR team members ──')
HR_POS_DATA = [
    ('Chargé RH', 'HR'), ('Gestionnaire Paie', 'HR'), ('Assistant Formation', 'HR'),
    ('Responsable Recrutement', 'HR'), ('Conseiller RH', 'HR'),
]
for pos_name, svc in HR_POS_DATA:
    Position.objects.get_or_create(name=pos_name, service_id=svc)

hr_new_employees = [
    ('Rania',    'Boussaid',  'rania.boussaid@madar.com',    'FEMME', '0661230001', 'Chargé RH',               'CDI',   date(1994, 3, 15), date(2021, 9, 1),  Decimal('75000')),
    ('Anis',     'Benmoussa', 'anis.benmoussa@madar.com',    'HOMME', '0770150012', 'Gestionnaire Paie',        'CDI',   date(1990, 7, 22), date(2019, 4, 15), Decimal('82000')),
    ('Sara',     'Khelil',    'sara.khelil@madar.com',       'FEMME', '0551890034', 'Assistant Formation',      'CDD',   date(1997, 11, 5), date(2023, 1, 10), Decimal('65000')),
    ('Mehdi',    'Ouadah',    'mehdi.ouadah@madar.com',      'HOMME', '0660750078', 'Responsable Recrutement',  'CDI',   date(1988, 5, 30), date(2017, 6, 20), Decimal('90000')),
    ('Yasmine',  'Bouafia',   'yasmine.bouafia@madar.com',   'FEMME', '0770380056', 'Conseiller RH',            'CDI',   date(1995, 8, 18), date(2022, 3, 7),  Decimal('72000')),
    ('Karim',    'Slimane',   'karim.slimane@madar.com',     'HOMME', '0550660043', 'Chargé RH',               'STAGE', date(2001, 2, 14), date(2025, 10, 1), Decimal('30000')),
]

created_hr = []
for (fn, ln, email, sexe, phone, pos_name, ct, bd, ha, sal) in hr_new_employees:
    pos = Position.objects.filter(name=pos_name, service_id='HR').first()
    emp, created = Employee.objects.get_or_create(email=email, defaults={
        'first_name': fn, 'last_name': ln, 'sexe': sexe, 'phone_number': phone,
        'position': pos, 'service_id': 'HR', 'role': EmployeeRoleChoices.EMPLOYEE,
        'contract_type': ct, 'birth_date': bd, 'salary': sal,
        'attendance_pin': str(random.randint(1000,9999)),
    })
    if created:
        Employee.objects.filter(pk=emp.pk).update(hired_at=ha)
        emp.refresh_from_db()
        # Create User account
        u, _ = User.objects.get_or_create(email=email, defaults={
            'first_name': fn, 'last_name': ln, 'role': RoleChoices.EMPLOYEE,
        })
        u.set_password(PWD); u.save()
        p(f'  ✓ Created {fn} {ln}')
    created_hr.append(emp)

# ─── 2. Ensure leave balances for all employees ───────────────────────────────
p('\n── 2. Leave balances ──')
ca_type = LeaveType.objects.get(code='CA')
cm_type = LeaveType.objects.get(code='CM')
ce_type = LeaveType.objects.get(code='CE')

all_emps = list(Employee.objects.all())
for emp in all_emps:
    for lt in [ca_type, cm_type, ce_type]:
        SoldeConge.objects.get_or_create(
            employee=emp, leaveType=lt, annee=2026,
            defaults={'joursAcquis': lt.nbrJoursDroit, 'joursPris': 0,
                      'joursReportes': 0, 'joursRestants': lt.nbrJoursDroit}
        )
p(f'  ✓ Balances created for {len(all_emps)} employees')

# ─── 3. Realistic leave requests for HR team ──────────────────────────────────
p('\n── 3. Leave requests ──')

# Helper: get user for employee
def get_user(emp):
    return User.objects.filter(email=emp.email).first()

# Helper: create leave + workflow
def make_leave(emp, lt, start, end, status, chef_decision=None):
    lr, created = LeaveRequest.objects.get_or_create(
        employee=emp, start_date=start, end_date=end, type=lt,
        defaults={'reason': f'Demande de {lt.libelle}', 'status': status}
    )
    if not created:
        return lr
    lr.status = status; lr.save()

    # Initialize workflow
    steps = ValidationWorkflow.objects.filter(leave_request=lr)
    if not steps.exists():
        ValidationWorkflow.objects.create(
            leave_request=lr, validation_order=1,
            validator_role=RoleChoices.CHEF, is_active=(status == 'PENDING')
        )
        ValidationWorkflow.objects.create(
            leave_request=lr, validation_order=2,
            validator_role=RoleChoices.GRH, is_active=False
        )

    if chef_decision == 'APPROVED' and status in ('ACCEPTED', 'PENDING'):
        chef_step = ValidationWorkflow.objects.get(leave_request=lr, validation_order=1)
        chef_user = User.objects.filter(role=RoleChoices.CHEF, email='abdelmonceftedjini@gmail.com').first()
        if chef_user:
            chef_step.decision = ValidationWorkflow.Decision.APPROVED
            chef_step.validator = chef_user
            chef_step.decided_at = timezone.now()
            chef_step.is_active = False
            chef_step.save()
            rh_step = ValidationWorkflow.objects.get(leave_request=lr, validation_order=2)
            rh_step.is_active = (status == 'PENDING')  # pending at RH
            rh_step.save()

    if status == 'ACCEPTED':
        grh_step = ValidationWorkflow.objects.get(leave_request=lr, validation_order=2)
        grh_user = User.objects.filter(email='rh_senior@example.com').first()
        if grh_user:
            grh_step.decision = ValidationWorkflow.Decision.APPROVED
            grh_step.validator = grh_user
            grh_step.decided_at = timezone.now()
            grh_step.is_active = False
            grh_step.save()
        lr.decided_by = grh_user; lr.decided_at = timezone.now(); lr.save()
        # Debit balance
        days = (end - start).days + 1
        solde = SoldeConge.objects.filter(employee=emp, leaveType=lt, annee=2026).first()
        if solde and solde.joursRestants >= days:
            solde.joursPris += days; solde.joursRestants -= days; solde.save()

    return lr

# HR employees leave scenarios
rania = Employee.objects.get(email='rania.boussaid@madar.com')
anis  = Employee.objects.get(email='anis.benmoussa@madar.com')
sara  = Employee.objects.get(email='sara.khelil@madar.com')
mehdi = Employee.objects.get(email='mehdi.ouadah@madar.com')
yasmine = Employee.objects.get(email='yasmine.bouafia@madar.com')
lamia = Employee.objects.get(email='lamia.gharbi@madar.com')
sofiane = Employee.objects.get(email='sofiane.belkacem@madar.com')
walid = Employee.objects.get(email='walid.mekki@madar.com')
imad  = Employee.objects.get(email='imad.cherif@madar.com')

# Past accepted leaves
make_leave(rania,   ca_type, date(2026, 3, 10), date(2026, 3, 20), 'ACCEPTED', 'APPROVED')
make_leave(anis,    ca_type, date(2026, 2, 3),  date(2026, 2, 14), 'ACCEPTED', 'APPROVED')
make_leave(mehdi,   cm_type, date(2026, 4, 7),  date(2026, 4, 9),  'ACCEPTED', 'APPROVED')
make_leave(lamia,   ce_type, date(2026, 3, 25), date(2026, 3, 26), 'ACCEPTED', 'APPROVED')
make_leave(sofiane, ca_type, date(2026, 6, 1),  date(2026, 6, 15), 'ACCEPTED', 'APPROVED')
make_leave(walid,   cm_type, date(2026, 5, 17), date(2026, 5, 19), 'PENDING')
make_leave(imad,    ce_type, date(2026, 5, 20), date(2026, 5, 22), 'PENDING')

# Pending leaves waiting chef
make_leave(sara,    ca_type, date(2026, 5, 26), date(2026, 6, 6),  'PENDING')
make_leave(yasmine, ce_type, date(2026, 5, 28), date(2026, 5, 29), 'PENDING')

# Chef approved, awaiting RH
make_leave(rania, cm_type, date(2026, 5, 12), date(2026, 5, 14), 'PENDING', 'APPROVED')

p(f'  ✓ Leave requests created')

# ─── 4. Attendance – 2 full months (Mar 15 – May 14) for HR team ──────────────
p('\n── 4. Attendance records ──')

hr_team_emails = [
    'rania.boussaid@madar.com', 'anis.benmoussa@madar.com',
    'sara.khelil@madar.com', 'mehdi.ouadah@madar.com',
    'yasmine.bouafia@madar.com', 'karim.slimane@madar.com',
    'lamia.gharbi@madar.com', 'abdelmonceftedjini@gmail.com',
]
hr_team = list(Employee.objects.filter(email__in=hr_team_emails))

WORK_START = dtime(8, 0)
WORK_END   = dtime(17, 0)

def random_checkin():
    # 80% on time, 20% late
    if random.random() < 0.80:
        return dtime(7, random.randint(45, 59))
    return dtime(8, random.randint(30, 59))

def random_checkout():
    return dtime(17, random.randint(0, 45))

start_date = date(2026, 3, 15)
end_date   = TODAY - timedelta(days=1)

absence_days_per_emp = {}  # track unexcused absences for justification

current = start_date
while current <= end_date:
    dow = current.weekday()  # 0=Mon 6=Sun
    if dow < 5:  # weekday only
        for emp in hr_team:
            # Skip dates before hire
            if current < emp.hired_at:
                continue
            # Decide presence: 92% present
            if random.random() < 0.92:
                ci = random_checkin()
                co = random_checkout()
                Attendance.objects.get_or_create(
                    employee=emp, date=current,
                    defaults={'check_in_time': ci, 'check_out_time': co}
                )
            else:
                # Absent – no attendance record
                absence_days_per_emp.setdefault(emp.email, []).append(current)
    current += timedelta(days=1)

p(f'  ✓ Attendance generated; absences: {sum(len(v) for v in absence_days_per_emp.values())} days')

# Also attendance for FIN team (Sofiane etc)
fin_team = list(Employee.objects.filter(service='FIN'))
current = date(2026, 3, 15)
while current <= end_date:
    if current.weekday() < 5:
        for emp in fin_team:
            if current < emp.hired_at:
                continue
            if random.random() < 0.93:
                ci = random_checkin()
                co = random_checkout()
                Attendance.objects.get_or_create(
                    employee=emp, date=current,
                    defaults={'check_in_time': ci, 'check_out_time': co}
                )
            else:
                absence_days_per_emp.setdefault(emp.email, []).append(current)
    current += timedelta(days=1)

p(f'  ✓ Attendance for FIN team too')

# ─── 5. Absence justifications ────────────────────────────────────────────────
p('\n── 5. Absence justifications ──')

for email, days in absence_days_per_emp.items():
    emp = Employee.objects.filter(email=email).first()
    if not emp:
        continue
    for d in days:
        rnd = random.random()
        if rnd < 0.35:
            status = 'JUSTIFIE'
        elif rnd < 0.55:
            status = 'EN_COURS'
        elif rnd < 0.70:
            status = 'NON_ACCEPTE'
        else:
            status = 'NON_JUSTIFIE'
        submitted_at = timezone.now() if status in ('JUSTIFIE','EN_COURS','NON_ACCEPTE') else None
        AbsenceJustification.objects.get_or_create(
            employee=emp, date=d,
            defaults={'status': status, 'submitted_at': submitted_at}
        )

p(f'  ✓ Absence justifications created')

# ─── 6. Evaluations – 4 months (Jan–Apr 2026) ─────────────────────────────────
p('\n── 6. Evaluations ──')

criteria = list(EvaluationCriteria.objects.filter(is_active=True))
chef_user = User.objects.get(email='abdelmonceftedjini@gmail.com')

eval_subjects = list(Employee.objects.filter(service='HR').exclude(role='DRH'))
eval_subjects += list(Employee.objects.filter(service='FIN'))

def make_evaluation(emp, year, month_label, period_start, scores_map):
    ev, created = Evaluation.objects.get_or_create(
        employee=emp, year=year, period=month_label,
        defaults={
            'evaluator': chef_user,
            'evaluation_date': period_start + timedelta(days=25),
            'status': 'COMPLETED',
            'global_score': Decimal('0'),
            'recommendation': 'AVERAGE',
            'overall_comment': '',
        }
    )
    if not created:
        return

    weighted_sum = Decimal('0')
    total_weight = Decimal('0')
    for c in criteria:
        score = Decimal(str(scores_map.get(c.label, round(random.uniform(6.0, 9.5), 1))))
        EvaluationScore.objects.get_or_create(evaluation=ev, criterion=c,
            defaults={'score': score, 'comment': ''})
        weighted_sum += score * c.weight
        total_weight += c.weight

    global_score = (weighted_sum / total_weight).quantize(Decimal('0.01')) if total_weight else Decimal('0')
    if global_score >= Decimal('9.0'):
        rec = 'EXCELLENT'
    elif global_score >= Decimal('7.0'):
        rec = 'GOOD'
    elif global_score >= Decimal('5.0'):
        rec = 'AVERAGE'
    else:
        rec = 'IMPROVEMENT'

    ev.global_score = global_score
    ev.recommendation = rec
    ev.save()

# Profiles: some employees are high performers, some average
PROFILES = {
    'rania.boussaid@madar.com':    {'base': 8.5, 'var': 0.8},
    'anis.benmoussa@madar.com':    {'base': 7.8, 'var': 1.0},
    'sara.khelil@madar.com':       {'base': 8.0, 'var': 0.7},
    'mehdi.ouadah@madar.com':      {'base': 9.2, 'var': 0.5},
    'yasmine.bouafia@madar.com':   {'base': 7.5, 'var': 1.2},
    'karim.slimane@madar.com':     {'base': 6.5, 'var': 1.5},
    'lamia.gharbi@madar.com':      {'base': 8.8, 'var': 0.6},
    'sofiane.belkacem@madar.com':  {'base': 8.3, 'var': 0.9},
    'walid.mekki@madar.com':       {'base': 7.2, 'var': 1.1},
    'imad.cherif@madar.com':       {'base': 9.0, 'var': 0.4},
    'adel.hamidi@madar.com':       {'base': 7.6, 'var': 0.9},
    'mourad.saidi@madar.com':      {'base': 8.1, 'var': 0.8},
    'amine.belkadi@madar.com':     {'base': 7.4, 'var': 1.0},
    'wassila.chekired@madar.com':  {'base': 8.6, 'var': 0.7},
}

months = [
    (2026, 'Janvier 2026',  date(2026, 1, 1)),
    (2026, 'Février 2026',  date(2026, 2, 1)),
    (2026, 'Mars 2026',     date(2026, 3, 1)),
    (2026, 'Avril 2026',    date(2026, 4, 1)),
]

for emp in eval_subjects:
    profile = PROFILES.get(emp.email, {'base': 7.5, 'var': 1.0})
    for year, label, ps in months:
        scores = {}
        for c in criteria:
            raw = profile['base'] + random.uniform(-profile['var'], profile['var'])
            scores[c.label] = max(0.0, min(10.0, round(raw, 1)))
        make_evaluation(emp, year, label, ps, scores)

p(f'  ✓ Evaluations created for {len(eval_subjects)} employees × {len(months)} months')

# ─── 7. Tasks for chef's HR team ──────────────────────────────────────────────
p('\n── 7. Tasks ──')

TASK_DATA = [
    # (title, assigned_to_email, due_offset_days, status, desc)
    ('Mise à jour des dossiers RH Q1 2026', 'rania.boussaid@madar.com', -5, 'DONE',
     'Vérifier et mettre à jour tous les dossiers employés pour Q1 2026.'),
    ('Préparation des contrats CDD renouvellement', 'anis.benmoussa@madar.com', 7, 'TODO',
     'Préparer les avenants de renouvellement pour les 3 contrats CDD arrivant à échéance fin mai.'),
    ('Rapport mensuel absences – Mai 2026', 'lamia.gharbi@madar.com', 3, 'SUBMITTED',
     'Consolider les données d\'absences de mai et soumettre le rapport mensuel.'),
    ('Plan de formation S2 2026', 'mehdi.ouadah@madar.com', 15, 'TODO',
     'Élaborer le plan de formation pour le second semestre 2026.'),
    ('Analyse des évaluations Q1', 'yasmine.bouafia@madar.com', -2, 'DONE',
     'Analyser les résultats d\'évaluation du Q1 et préparer le tableau de bord.'),
    ('Onboarding nouvelles recrues – Mai', 'rania.boussaid@madar.com', 5, 'REVISION',
     'Préparer les kits d\'accueil et planifier les sessions d\'intégration.'),
    ('Mise à jour organigramme', 'anis.benmoussa@madar.com', 2, 'TODO',
     'Actualiser l\'organigramme suite aux derniers mouvements de personnel.'),
    ('Audit paie – Avril 2026', 'sara.khelil@madar.com', -3, 'DONE',
     'Vérifier la conformité des bulletins de paie d\'avril.'),
    # FIN tasks
    ('Clôture comptable Avril 2026', 'sofiane.belkacem@madar.com', -1, 'DONE',
     'Finaliser les écritures comptables du mois d\'avril 2026.'),
    ('Rapprochement bancaire Mai 2026', 'walid.mekki@madar.com', 6, 'TODO',
     'Effectuer le rapprochement entre relevé bancaire et comptabilité.'),
    ('Préparation budget prévisionnel S2', 'imad.cherif@madar.com', 12, 'SUBMITTED',
     'Préparer les projections budgétaires pour le second semestre.'),
    ('Révision des procédures de facturation', 'adel.hamidi@madar.com', 8, 'TODO',
     'Mettre à jour le manuel des procédures de facturation clients.'),
]

for (title, emp_email, due_offset, status, desc) in TASK_DATA:
    emp = Employee.objects.filter(email=emp_email).first()
    if not emp:
        continue
    due_date = TODAY + timedelta(days=due_offset)
    t, created = Task.objects.get_or_create(
        title=title, assigned_to=emp,
        defaults={
            'description': desc,
            'assigned_by': chef_user,
            'due_date': due_date,
            'status': status,
        }
    )
    if not created:
        t.status = status; t.save()

p(f'  ✓ {len(TASK_DATA)} tasks created')

# ─── 8. Notifications ─────────────────────────────────────────────────────────
p('\n── 8. Notifications ──')

def notify(email, title, msg, link='', is_read=False):
    u = User.objects.filter(email=email).first()
    if not u:
        return
    Notification.objects.get_or_create(
        user=u, title=title,
        defaults={'message': msg, 'link': link, 'is_read': is_read}
    )

# GRH notifications
notify('rh_senior@example.com',
       'Congé en attente de validation',
       'Sara Khelil a soumis une demande de congé annuel du 26/05 au 06/06/2026.',
       '/rh/conges', False)
notify('rh_senior@example.com',
       'Absence non justifiée – Karim Slimane',
       'Karim Slimane est absent depuis 2 jours sans justificatif.',
       '/rh/absences', False)
notify('rh_senior@example.com',
       'Nouveau document soumis',
       'Rapport mensuel absences de mai a été soumis par Lamia Gharbi.',
       '/notifications', True)
notify('rh_senior@example.com',
       'Évaluation complétée',
       'L\'évaluation de Rania Boussaid pour avril 2026 a été enregistrée.',
       '/rh/evaluations', True)

# Chef notifications
notify('abdelmonceftedjini@gmail.com',
       'Demande de congé – Yasmine Bouafia',
       'Yasmine Bouafia a soumis une demande de congé exceptionnel les 28-29/05/2026.',
       '/chef/leaves', False)
notify('abdelmonceftedjini@gmail.com',
       'Tâche soumise',
       'Lamia Gharbi a soumis le rapport mensuel absences pour révision.',
       '/chef/tasks', False)
notify('abdelmonceftedjini@gmail.com',
       'Absence – Karim Slimane',
       'Karim Slimane n\'a pas pointé aujourd\'hui.',
       '/chef/attendance', False)

# Employee notifications
notify('sofiane.belkacem@madar.com',
       'Congé approuvé',
       'Votre congé annuel du 01/06 au 15/06/2026 a été approuvé.',
       '/conge', True)
notify('sofiane.belkacem@madar.com',
       'Nouvelle évaluation disponible',
       'Votre évaluation du mois d\'avril 2026 a été complétée. Score: 8.3/10.',
       '/evaluations', False)
notify('sofiane.belkacem@madar.com',
       'Rappel – Pointage manqué',
       'Vous avez une absence non justifiée le 08/05/2026. Veuillez soumettre un justificatif.',
       '/attendance', False)

notify('rania.boussaid@madar.com',
       'Tâche en révision',
       'Le chef vous demande de revoir le kit d\'onboarding des nouvelles recrues.',
       '/profile', False)
notify('rania.boussaid@madar.com',
       'Congé maladie approuvé',
       'Votre congé maladie du 12/05 au 14/05/2026 a été approuvé.',
       '/conge', True)

p('  ✓ Notifications created')

# ─── Summary ──────────────────────────────────────────────────────────────────
from madar_app.models import LeaveRequest, Evaluation, Task, Notification, Attendance, AbsenceJustification
p('\n══ Summary ══')
p(f'  Employees:            {Employee.objects.count()}')
p(f'  Leave requests:       {LeaveRequest.objects.count()}')
p(f'  Attendance records:   {Attendance.objects.count()}')
p(f'  Absence justifs:      {AbsenceJustification.objects.count()}')
p(f'  Evaluations:          {Evaluation.objects.count()}')
p(f'  Tasks:                {Task.objects.count()}')
p(f'  Notifications:        {Notification.objects.count()}')
p('\n✅ MADAR scenarios loaded successfully!\n')
