"""
Script de création de comptes de test pour le projet MADAR GRH.
Couvre tous les rôles : EMPLOYEE, CHEF, RH_SIMPLE, RH_AGENT, RH_SENIOR, GRH

Exécution :
    python manage.py shell < scripts/create_test_accounts.py

Ou via manage.py runscript (si django-extensions installé) :
    python manage.py runscript create_test_accounts
"""

from datetime import date, timedelta
from madar_app.models import (
    User, Employee, Service, Position, Job, Affectation,
    LeaveType, RoleChoices
)

SEPARATOR = "=" * 65

print(SEPARATOR)
print("  🚀  MADAR GRH — Création des comptes de test")
print(SEPARATOR)

# ============================================================
# 1. Services
# ============================================================
print("\n📂  Services...")
services_data = [
    ("DIR",   "Direction Générale",  200000.00),
    ("RH",    "Ressources Humaines", 150000.00),
    ("IT",    "Informatique",        120000.00),
    ("SALES", "Commercial",          100000.00),
    ("OPS",   "Opérations",          100000.00),
    ("FIN",   "Finance",             130000.00),
]
services = {}
for code, nom, budget in services_data:
    s, created = Service.objects.get_or_create(
        code=code,
        defaults={"nomService": nom, "statut": "ACTIF", "budget": budget},
    )
    services[code] = s
    print(f"   {'✚ créé' if created else '✔ existe'} — {code}: {nom}")

# ============================================================
# 2. Positions
# ============================================================
print("\n📋  Positions...")
positions_data = [
    "Directeur",
    "Chef de Service",
    "Responsable RH",
    "Développeur Logiciel",
    "Ingénieur Systèmes",
    "Commercial Senior",
    "Comptable",
    "Chargé RH",
    "Agent RH",
]
positions = {}
for name in positions_data:
    p, created = Position.objects.get_or_create(name=name)
    positions[name] = p
    print(f"   {'✚ créé' if created else '✔ existe'} — {name}")

# ============================================================
# 3. Jobs / Postes
# ============================================================
print("\n🏢  Postes (Jobs)...")
jobs_data = [
    # (intitule,                  niveau, estManagerial, salMin,  salMax,  nbrPostes)
    ("Directeur Général",               1, True,  80000, 120000, 1),
    ("Responsable RH",                  2, True,  40000,  70000, 2),
    ("Chef de Projet IT",               2, True,  45000,  75000, 3),
    ("Ingénieur Développement",         3, False, 30000,  55000, 10),
    ("Chargé de Recrutement",           3, False, 25000,  40000, 4),
    ("Agent Commercial",                3, False, 25000,  45000, 8),
    ("Comptable",                       3, False, 28000,  48000, 4),
    ("Agent RH",                        3, False, 22000,  38000, 5),
]
jobs = {}
for intitule, niveau, managerial, sal_min, sal_max, nbr in jobs_data:
    j, created = Job.objects.get_or_create(
        intitule=intitule,
        defaults={
            "niveauHierarchique": niveau,
            "estManagerial": managerial,
            "salaireMini": sal_min,
            "salaireMaxi": sal_max,
            "nbrPostes": nbr,
        },
    )
    jobs[intitule] = j
    print(f"   {'✚ créé' if created else '✔ existe'} — {intitule}")

# ============================================================
# 4. Types de congé
# ============================================================
print("\n🏖️  Types de congé...")
leave_types_data = [
    ("CA",   "Congé Annuel",      20, True,  True,  0,  False, "TOUS"),
    ("CM",   "Congé Maladie",     15, True,  False, 0,  True,  "TOUS"),
    ("MAT",  "Congé Maternité",   98, True,  False, 30, True,  "FEMME"),
    ("PAT",  "Congé Paternité",    3, True,  False, 0,  False, "HOMME"),
    ("SANS", "Congé Sans Solde",  30, False, False, 7,  False, "TOUS"),
    ("FORM", "Congé Formation",   10, True,  False, 14, False, "TOUS"),
]
leave_types = {}
for code, libelle, jours, payant, recond, preavis, justif, sexe in leave_types_data:
    lt, created = LeaveType.objects.get_or_create(
        code=code,
        defaults={
            "libelle": libelle,
            "nbrJoursDroit": jours,
            "estPayant": payant,
            "reconductible": recond,
            "delaiPreavis": preavis,
            "justificatifRequis": justif,
            "sexeAutorise": sexe,
        },
    )
    leave_types[code] = lt
    print(f"   {'✚ créé' if created else '✔ existe'} — {code}: {libelle}")


# ============================================================
# Helper : création d'un User + Employee + Affectation
# ============================================================
def create_test_user(
    email, password, first_name, last_name, role,
    service_code, job_intitule, position_name, salary, contract="CDI"
):
    """Crée un User Django + un Employee lié + une Affectation primaire."""
    # User
    user, u_created = User.objects.get_or_create(
        email=email,
        defaults={
            "first_name": first_name,
            "last_name": last_name,
            "role": role,
            "is_active": True,
        },
    )
    if u_created:
        user.set_password(password)
        user.save()

    # Employee
    employee, e_created = Employee.objects.get_or_create(
        email=email,
        defaults={
            "first_name": first_name,
            "last_name": last_name,
            "service": services.get(service_code),
            "position": positions.get(position_name),
            "salary": salary,
            "contract_type": contract,
        },
    )

    # Affectation primaire
    job = jobs.get(job_intitule)
    if job and not employee.affectations.filter(estPrimaire=True).exists():
        Affectation.objects.create(
            employee=employee,
            job=job,
            dateDebut=date.today() - timedelta(days=365),
            dateFin=None,
            typeAffectation="TITULAIRE",
            estPrimaire=True,
            motif="Affectation initiale",
        )

    status = "✚ créé" if u_created else "✔ existe"
    return user, employee, status


# ============================================================
# 5. Comptes de test — un compte par rôle
# ============================================================
print("\n👤  Création des comptes utilisateurs...\n")

test_accounts = []

# ── GRH (Gestionnaire RH — accès total) ──────────────────────────────────────
user, emp, st = create_test_user(
    email="grh@madar.dz",
    password="Madar@2025",
    first_name="Karim",
    last_name="Benali",
    role=RoleChoices.GRH,
    service_code="RH",
    job_intitule="Responsable RH",
    position_name="Responsable RH",
    salary=65000,
)
test_accounts.append(("GRH", "grh@madar.dz", "Madar@2025", st))

# ── RH_SENIOR ────────────────────────────────────────────────────────────────
user, emp, st = create_test_user(
    email="rh.senior@madar.dz",
    password="Madar@2025",
    first_name="Amira",
    last_name="Ouali",
    role=RoleChoices.RH_SENIOR,
    service_code="RH",
    job_intitule="Responsable RH",
    position_name="Responsable RH",
    salary=52000,
)
test_accounts.append(("RH_SENIOR", "rh.senior@madar.dz", "Madar@2025", st))

# ── RH_AGENT ─────────────────────────────────────────────────────────────────
user, emp, st = create_test_user(
    email="rh.agent@madar.dz",
    password="Madar@2025",
    first_name="Yacine",
    last_name="Hadj",
    role=RoleChoices.RH_AGENT,
    service_code="RH",
    job_intitule="Agent RH",
    position_name="Agent RH",
    salary=35000,
)
test_accounts.append(("RH_AGENT", "rh.agent@madar.dz", "Madar@2025", st))

# ── RH_SIMPLE ─────────────────────────────────────────────────────────────────
user, emp, st = create_test_user(
    email="rh@madar.dz",
    password="Madar@2025",
    first_name="Nadia",
    last_name="Meziane",
    role=RoleChoices.RH_SIMPLE,
    service_code="RH",
    job_intitule="Chargé de Recrutement",
    position_name="Chargé RH",
    salary=30000,
)
test_accounts.append(("RH_SIMPLE", "rh@madar.dz", "Madar@2025", st))

# ── CHEF de service IT ────────────────────────────────────────────────────────
user, emp, st = create_test_user(
    email="chef.it@madar.dz",
    password="Madar@2025",
    first_name="Sofiane",
    last_name="Bouzid",
    role=RoleChoices.CHEF,
    service_code="IT",
    job_intitule="Chef de Projet IT",
    position_name="Chef de Service",
    salary=60000,
)
test_accounts.append(("CHEF (IT)", "chef.it@madar.dz", "Madar@2025", st))

# ── CHEF de service SALES ─────────────────────────────────────────────────────
user, emp, st = create_test_user(
    email="chef.sales@madar.dz",
    password="Madar@2025",
    first_name="Rania",
    last_name="Selmi",
    role=RoleChoices.CHEF,
    service_code="SALES",
    job_intitule="Chef de Projet IT",
    position_name="Chef de Service",
    salary=58000,
)
test_accounts.append(("CHEF (SALES)", "chef.sales@madar.dz", "Madar@2025", st))

# ── EMPLOYEE — équipe IT ──────────────────────────────────────────────────────
employees_it = [
    ("Mourad",   "Aissaoui",   "emp.mourad@madar.dz",  38000),
    ("Lina",     "Cherif",     "emp.lina@madar.dz",    36000),
    ("Omar",     "Hamidi",     "emp.omar@madar.dz",    34000),
]
for fn, ln, email, salary in employees_it:
    user, emp, st = create_test_user(
        email=email,
        password="Madar@2025",
        first_name=fn,
        last_name=ln,
        role=RoleChoices.EMPLOYEE,
        service_code="IT",
        job_intitule="Ingénieur Développement",
        position_name="Développeur Logiciel",
        salary=salary,
    )
    test_accounts.append((f"EMPLOYEE (IT)", email, "Madar@2025", st))

# ── EMPLOYEE — équipe SALES ───────────────────────────────────────────────────
employees_sales = [
    ("Ines",    "Tabet",    "emp.ines@madar.dz",   32000),
    ("Bilal",   "Rahmani",  "emp.bilal@madar.dz",  31000),
]
for fn, ln, email, salary in employees_sales:
    user, emp, st = create_test_user(
        email=email,
        password="Madar@2025",
        first_name=fn,
        last_name=ln,
        role=RoleChoices.EMPLOYEE,
        service_code="SALES",
        job_intitule="Agent Commercial",
        position_name="Commercial Senior",
        salary=salary,
    )
    test_accounts.append((f"EMPLOYEE (SALES)", email, "Madar@2025", st))

# ── EMPLOYEE — Finance ────────────────────────────────────────────────────────
user, emp, st = create_test_user(
    email="emp.finance@madar.dz",
    password="Madar@2025",
    first_name="Hana",
    last_name="Bensalem",
    role=RoleChoices.EMPLOYEE,
    service_code="FIN",
    job_intitule="Comptable",
    position_name="Comptable",
    salary=37000,
)
test_accounts.append(("EMPLOYEE (FIN)", "emp.finance@madar.dz", "Madar@2025", st))


# ============================================================
# 6. Superuser admin (accès Django Admin)
# ============================================================
print("\n🔑  Compte Superuser (Django Admin)...")
superuser, su_created = User.objects.get_or_create(
    email="admin@madar.dz",
    defaults={
        "first_name": "Admin",
        "last_name": "MADAR",
        "role": RoleChoices.GRH,
        "is_staff": True,
        "is_superuser": True,
        "is_active": True,
    },
)
if su_created:
    superuser.set_password("Admin@Madar2025!")
    superuser.save()
    print(f"   ✚ créé — admin@madar.dz")
else:
    print(f"   ✔ existe — admin@madar.dz")


# ============================================================
# 7. Résumé final
# ============================================================
print("\n" + SEPARATOR)
print("  ✅  Comptes de test créés avec succès !")
print(SEPARATOR)

print(f"\n{'RÔLE':<20} {'EMAIL':<30} {'MOT DE PASSE'}")
print("-" * 65)
for role, email, pwd, _ in test_accounts:
    print(f"  {role:<18} {email:<30} {pwd}")

print("\n" + "-" * 65)
print(f"  {'SUPERUSER (Admin)':<18} {'admin@madar.dz':<30} Admin@Madar2025!")
print("-" * 65)

print("""
🌐  Accès :
   · API / Frontend  →  http://localhost:5173
   · Django Admin    →  http://localhost:8000/admin
   · API Auth login  →  POST http://localhost:8000/api/auth/login/
                        {"email": "...", "password": "..."}
""")
print(SEPARATOR)
