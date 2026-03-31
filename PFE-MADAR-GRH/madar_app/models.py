from django.db import models, transaction
from django.contrib.auth.models import AbstractUser
from django.contrib.auth.base_user import BaseUserManager
from django.core.validators import MinValueValidator
from django.core.exceptions import ValidationError
from decimal import Decimal
from django.utils import timezone
import hashlib


class RoleChoices(models.TextChoices):
    EMPLOYEE = 'EMPLOYEE', 'Employee'
    CHEF = 'CHEF', 'Chef'
    RH_SIMPLE = 'RH_SIMPLE', 'RH'
    RH_AGENT = 'RH_AGENT', 'RH Agent'
    RH_SENIOR = 'RH_SENIOR', 'Senior RH'
    GRH = 'GRH', 'GRH'
   


class UserManager(BaseUserManager):
    use_in_migrations = True

    def _create_user(self, email, password, **extra_fields):
        if not email:
            raise ValueError('The given email must be set')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_user(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', False)
        extra_fields.setdefault('is_superuser', False)
        return self._create_user(email, password, **extra_fields)

    def create_superuser(self, email, password, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')
        return self._create_user(email, password, **extra_fields)


class User(AbstractUser):
    username = None
    email = models.EmailField('email address', unique=True)
    role = models.CharField(max_length=20, choices=RoleChoices.choices, default=RoleChoices.EMPLOYEE)
    attendance_pin_hash = models.CharField(max_length=128, blank=True)
    profile_picture = models.ImageField(upload_to='profile_pictures/', null=True, blank=True)
    last_seen = models.DateTimeField(null=True, blank=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []

    objects = UserManager()

    def __str__(self):
        return self.email

    @property
    def is_employee(self):
        return self.role == RoleChoices.EMPLOYEE

    @property
    def is_chef(self):
        return self.role == RoleChoices.CHEF

    @property
    def is_rh_simple(self):
        return self.role == RoleChoices.RH_SIMPLE

    @property
    def is_rh_senior(self):
        return self.role == RoleChoices.RH_SENIOR

    @property
    def is_grh(self):
        return self.role == RoleChoices.GRH


class Service(models.Model):
    class Statut(models.TextChoices):
        ACTIF = 'ACTIF', 'Actif'
        INACTIF = 'INACTIF', 'Inactif'
    
    code = models.CharField(max_length=20, primary_key=True, help_text="Unique service code (e.g., RH, INFO)")
    nomService = models.CharField(max_length=200, verbose_name="Nom du service")
    statut = models.CharField(
        max_length=10, 
        choices=Statut.choices, 
        default=Statut.ACTIF,
        verbose_name="Statut"
    )
    budget = models.DecimalField(
        max_digits=12, 
        decimal_places=2, 
        validators=[MinValueValidator(0)],
        help_text="Budget alloué (doit être >= 0)"
    )
    serviceParentId = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='sous_services',
        verbose_name="Service parent"
    )
    
    class Meta:
        verbose_name = "Service"
        verbose_name_plural = "Services"
        ordering = ['code']
    
    def __str__(self):
        return f"{self.code} - {self.nomService}"
    
    def clean(self):
        """Validate that a service cannot be its own ancestor (no cycles)"""
        super().clean()
        
        # Check for self-reference
        if self.serviceParentId and self.serviceParentId.code == self.code:
            raise ValidationError({
                'serviceParentId': 'Un service ne peut pas être son propre parent.'
            })
        
        # Check for cycles in the hierarchy
        if self.serviceParentId:
            parent = self.serviceParentId
            visited = {self.code}
            
            while parent:
                if parent.code in visited:
                    raise ValidationError({
                        'serviceParentId': f'Cycle détecté : le service {parent.code} est déjà un ancêtre.'
                    })
                visited.add(parent.code)
                parent = parent.serviceParentId
        
        # Business rule: An inactive service cannot contain active employees
        if self.statut == self.Statut.INACTIF and self.pk:
            active_employees_count = self.employees.count()
            if active_employees_count > 0:
                raise ValidationError({
                    'statut': f'Impossible de désactiver ce service : {active_employees_count} employé(s) actif(s) y sont affectés.'
                })
    
    def save(self, *args, **kwargs):
        """Run full validation before saving"""
        self.full_clean()
        super().save(*args, **kwargs)
    
    def has_active_employees(self):
        """Check if service has active employees"""
        return self.employees.exists()
    
    def get_all_descendants(self):
        """Get all descendant services recursively"""
        descendants = []
        children = Service.objects.filter(serviceParentId=self)
        for child in children:
            descendants.append(child)
            descendants.extend(child.get_all_descendants())
        return descendants


class Position(models.Model):
    name = models.CharField(max_length=100, unique=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class Job(models.Model):
    """
    Job/Poste model representing roles/functions in the company.
    Supports hierarchical structure with parent-child relationships.
    """
    intitule = models.CharField(
        max_length=200,
        unique=True,
        verbose_name="Intitulé du poste",
        help_text="Job title/name (e.g., Directeur RH, Développeur Senior)"
    )
    niveauHierarchique = models.IntegerField(
        verbose_name="Niveau hiérarchique",
        help_text="Hierarchy level (1=Direction, 2=Manager, 3=Execution, etc.)"
    )
    estManagerial = models.BooleanField(
        default=False,
        verbose_name="Est managérial",
        help_text="Whether this job manages other people"
    )
    salaireMini = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0)],
        verbose_name="Salaire minimum",
        help_text="Minimum allowed salary for this job"
    )
    salaireMaxi = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0)],
        verbose_name="Salaire maximum",
        help_text="Maximum allowed salary for this job"
    )
    nbrPostes = models.IntegerField(
        default=1,
        validators=[MinValueValidator(0)],
        verbose_name="Nombre de postes",
        help_text="How many people can occupy this job"
    )
    posteParentId = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='sous_postes',
        verbose_name="Poste parent",
        help_text="Parent job in the hierarchy (N+1 relationship)"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Poste"
        verbose_name_plural = "Postes"
        ordering = ['niveauHierarchique', 'intitule']

    def __str__(self):
        return f"{self.intitule} (Niveau {self.niveauHierarchique})"

    def clean(self):
        """Validate Job constraints"""
        errors = {}

        # Validate salary constraints
        if self.salaireMini < 0:
            errors['salaireMini'] = "Salaire minimum must be >= 0"
        
        if self.salaireMaxi < 0:
            errors['salaireMaxi'] = "Salaire maximum must be >= 0"
        
        if self.salaireMini > self.salaireMaxi:
            errors['salaireMaxi'] = "Salaire maximum must be >= Salaire minimum"

        # Validate number of positions
        if self.nbrPostes < 0:
            errors['nbrPostes'] = "Nombre de postes must be >= 0"

        # Check for cycles in parent hierarchy
        if self.posteParentId:
            visited = set()
            current = self.posteParentId
            while current:
                if current.id in visited:
                    errors['posteParentId'] = "Cycle detected in job hierarchy"
                    break
                visited.add(current.id)
                current = current.posteParentId

        # Check for self-reference
        if self.posteParentId and self.pk and self.posteParentId.id == self.pk:
            errors['posteParentId'] = "A job cannot be its own parent"

        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def has_subordinate_jobs(self):
        """Check if this job has subordinate jobs"""
        return self.sous_postes.exists()

    def get_all_descendants(self):
        """Get all descendant jobs recursively"""
        descendants = []
        for child in self.sous_postes.all():
            descendants.append(child)
            descendants.extend(child.get_all_descendants())
        return descendants

    def get_hierarchy_chain(self):
        """Get the complete hierarchy chain from this job to the top"""
        chain = [self]
        current = self.posteParentId
        while current:
            chain.insert(0, current)
            current = current.posteParentId
        return chain


class Employee(models.Model):
    class ContractType(models.TextChoices):
        CDD = 'CDD', 'CDD'
        CDI = 'CDI', 'CDI'
        STAGE = 'STAGE', 'Stage'
    
    first_name = models.CharField(max_length=50)
    last_name = models.CharField(max_length=50)
    email = models.EmailField(unique=True)
    position = models.ForeignKey(Position, on_delete=models.SET_NULL, null=True, blank=True, related_name='employees')
    phone_number = models.CharField(max_length=30, blank=True, default='')
    address = models.CharField(max_length=255, blank=True, default='')
    contract_type = models.CharField(max_length=10, choices=ContractType.choices, default=ContractType.CDI)
    hired_at = models.DateField(auto_now_add=True)
    service = models.ForeignKey(Service, on_delete=models.CASCADE, to_field='code', null=True, blank=True)
    salary = models.DecimalField(max_digits=10, decimal_places=2)
    attendance_pin = models.CharField(max_length=4, blank=True)
    profile_picture = models.ImageField(upload_to='profile_pictures/', null=True, blank=True)

    def __str__(self):
        return f"{self.first_name} {self.last_name}"


class Affectation(models.Model):
    """
    Affectation model linking an employee to a job over time.
    Tracks job assignments, supporting multiple assignments per employee
    (temporary assignments, interim positions, detachments).
    """
    class TypeAffectation(models.TextChoices):
        TITULAIRE = 'TITULAIRE', 'Titulaire'
        INTERIM = 'INTERIM', 'Intérim'
        DETACHEMENT = 'DETACHEMENT', 'Détachement'

    employee = models.ForeignKey(
        Employee,
        on_delete=models.CASCADE,
        related_name='affectations',
        verbose_name="Employé"
    )
    job = models.ForeignKey(
        Job,
        on_delete=models.PROTECT,
        related_name='affectations',
        verbose_name="Poste"
    )
    dateDebut = models.DateField(
        verbose_name="Date de début",
        help_text="Start date of the assignment"
    )
    dateFin = models.DateField(
        null=True,
        blank=True,
        verbose_name="Date de fin",
        help_text="End date of the assignment (null = ongoing)"
    )
    typeAffectation = models.CharField(
        max_length=20,
        choices=TypeAffectation.choices,
        default=TypeAffectation.TITULAIRE,
        verbose_name="Type d'affectation"
    )
    motif = models.CharField(
        max_length=255,
        blank=True,
        verbose_name="Motif",
        help_text="Reason for the assignment (e.g., replacement, project, etc.)"
    )
    estPrimaire = models.BooleanField(
        default=False,
        verbose_name="Affectation primaire",
        help_text="Is this the employee's main official post?"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Affectation"
        verbose_name_plural = "Affectations"
        ordering = ['employee', '-estPrimaire', '-dateDebut']
        constraints = [
            models.CheckConstraint(
                check=models.Q(dateFin__isnull=True) | models.Q(dateDebut__lte=models.F('dateFin')),
                name='affectation_date_logic'
            ),
            models.UniqueConstraint(
                fields=['employee'],
                condition=models.Q(estPrimaire=True),
                name='unique_primary_affectation_per_employee'
            ),
        ]

    def __str__(self):
        status = "(primaire)" if self.estPrimaire else ""
        if self.dateFin:
            return f"{self.employee} -> {self.job.intitule} [{self.dateDebut.strftime('%d/%m/%Y')}-{self.dateFin.strftime('%d/%m/%Y')}] {status}"
        return f"{self.employee} -> {self.job.intitule} [depuis {self.dateDebut.strftime('%d/%m/%Y')}] {status}"

    def clean(self):
        """Validate Affectation constraints"""
        from django.utils import timezone
        from datetime import date

        errors = {}

        # 1. Validate date logic: dateDebut <= dateFin (when dateFin is not null)
        if self.dateFin and self.dateDebut > self.dateFin:
            errors['dateFin'] = "Date de fin must be >= Date de début"

        # 2. Validate only one primary affectation per employee
        if self.estPrimaire:
            # Count other primary affectations for this employee
            other_primary = Affectation.objects.filter(
                employee=self.employee,
                estPrimaire=True
            ).exclude(id=self.id)  # Exclude current instance if updating
            
            if other_primary.exists():
                errors['estPrimaire'] = f"Employee {self.employee} already has a primary assignment"

        # 3. Validate no overlap for TITULAIRE affectations
        if self.typeAffectation == self.TypeAffectation.TITULAIRE:
            # Check for overlapping TITULAIRE assignments
            overlapping = Affectation.objects.filter(
                employee=self.employee,
                typeAffectation=self.TypeAffectation.TITULAIRE
            ).exclude(id=self.id)  # Exclude current instance

            for other in overlapping:
                # Check if assignments overlap
                # Overlap occurs when: self.start <= other.end AND other.start <= self.end
                # (considering null dateFin as ongoing)
                if self._affectations_overlap(other):
                    errors['typeAffectation'] = (
                        f"Titulaire assignment overlaps with existing assignment "
                        f"from {other.dateDebut.strftime('%d/%m/%Y')} "
                        f"to {other.dateFin.strftime('%d/%m/%Y') if other.dateFin else 'ongoing'}"
                    )
                    break

        if errors:
            raise ValidationError(errors)

    def _affectations_overlap(self, other):
        """Check if two affectations overlap in time"""
        # self.dateDebut <= other.dateFin (or other.dateFin is None)
        if other.dateFin and self.dateDebut > other.dateFin:
            return False
        
        # other.dateDebut <= self.dateFin (or self.dateFin is None)
        if self.dateFin and other.dateDebut > self.dateFin:
            return False
        
        return True

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def get_current_assignment(self):
        """Returns True if this assignment is currently active"""
        from datetime import date
        today = date.today()
        return self.dateDebut <= today and (self.dateFin is None or today <= self.dateFin)

    @classmethod
    def get_employee_primary_affectation(cls, employee, date_ref=None):
        """Get the primary affectation for an employee at a given date (or today)"""
        from datetime import date
        if date_ref is None:
            date_ref = date.today()
        
        return cls.objects.filter(
            employee=employee,
            estPrimaire=True,
            dateDebut__lte=date_ref
        ).filter(
            models.Q(dateFin__isnull=True) | models.Q(dateFin__gte=date_ref)
        ).first()

    @classmethod
    def get_employee_current_affectations(cls, employee):
        """Get all current/active affectations for an employee"""
        from datetime import date
        today = date.today()
        
        return cls.objects.filter(
            employee=employee,
            dateDebut__lte=today
        ).filter(
            models.Q(dateFin__isnull=True) | models.Q(dateFin__gte=today)
        )


class Task(models.Model):
    class Status(models.TextChoices):
        TODO = 'TODO', 'To Do'
        SUBMITTED = 'SUBMITTED', 'Submitted'
        REVISION = 'REVISION', 'Needs Revision'
        DONE = 'DONE', 'Done'

    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    due_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.TODO)
    requires_submission_file = models.BooleanField(default=False)
    assigned_to = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='tasks')
    assigned_by = models.ForeignKey('User', on_delete=models.SET_NULL, null=True, related_name='assigned_tasks')
    created_at = models.DateTimeField(auto_now_add=True)
    submission_note = models.TextField(blank=True, default='')
    submission_attachment = models.FileField(upload_to='task_submissions/', null=True, blank=True)
    submitted_at = models.DateTimeField(null=True, blank=True)
    review_comment = models.TextField(blank=True, default='')
    reviewed_by = models.ForeignKey('User', on_delete=models.SET_NULL, null=True, blank=True, related_name='reviewed_tasks')
    reviewed_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"{self.title} -> {self.assigned_to}"


class Attendance(models.Model):
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='attendances')
    date = models.DateField()
    check_in_time = models.TimeField(null=True, blank=True)
    check_out_time = models.TimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['employee', 'date'], name='unique_attendance_per_day')
        ]

    def __str__(self):
        return f"Attendance {self.employee} {self.date}"


class LeaveType(models.Model):
    """
    Leave Type model defining different types of leave/absence.
    Specifies rules, entitlements, and constraints for each leave category.
    """
    class SexeAutorise(models.TextChoices):
        HOMME = 'HOMME', 'Homme'
        FEMME = 'FEMME', 'Femme'
        TOUS = 'TOUS', 'Tous'

    code = models.CharField(
        max_length=10,
        unique=True,
        primary_key=True,
        verbose_name="Code",
        help_text="Short unique identifier (e.g., CA, CM, MAT)"
    )
    libelle = models.CharField(
        max_length=100,
        verbose_name="Libellé",
        help_text="Displayed name (e.g., Congé Annuel, Congé Maladie)"
    )
    nbrJoursDroit = models.IntegerField(
        validators=[MinValueValidator(0)],
        verbose_name="Nombre de jours de droit",
        help_text="Number of days allowed per year"
    )
    estPayant = models.BooleanField(
        default=True,
        verbose_name="Est payant",
        help_text="Whether the leave is paid"
    )
    reconductible = models.BooleanField(
        default=False,
        verbose_name="Reconductible",
        help_text="Can unused days carry to next year?"
    )
    delaiPreavis = models.IntegerField(
        validators=[MinValueValidator(0)],
        default=0,
        verbose_name="Délai de préavis",
        help_text="Number of days notice required"
    )
    justificatifRequis = models.BooleanField(
        default=False,
        verbose_name="Justificatif requis",
        help_text="Whether a supporting document is required"
    )
    sexeAutorise = models.CharField(
        max_length=10,
        choices=SexeAutorise.choices,
        default=SexeAutorise.TOUS,
        verbose_name="Sexe autorisé",
        help_text="Gender eligibility for this leave type"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Type de congé"
        verbose_name_plural = "Types de congé"
        ordering = ['code']

    def __str__(self):
        return self.libelle


class LeaveRequest(models.Model):
    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        ACCEPTED = 'ACCEPTED', 'Accepted'
        REFUSED = 'REFUSED', 'Refused'

    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='leave_requests')
    start_date = models.DateField()
    end_date = models.DateField()
    type = models.ForeignKey(
        LeaveType,
        on_delete=models.PROTECT,
        related_name='leave_requests',
        verbose_name="Type de congé"
    )
    reason = models.TextField(blank=True)
    attachment = models.FileField(upload_to='leave_attachments/', null=True, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    chef_comment = models.TextField(blank=True)
    decided_by = models.ForeignKey('User', on_delete=models.SET_NULL, null=True, blank=True, related_name='decided_leaves')
    decided_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"LeaveRequest {self.employee} {self.start_date}..{self.end_date} ({self.status})"


class _LegacyLeaveTypeCodes:
    ANNUAL = 'CA'
    SICK = 'CM'
    OTHER = 'AUTRE'


LeaveRequest.LeaveType = _LegacyLeaveTypeCodes


class ValidationWorkflow(models.Model):
    class Decision(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        APPROVED = 'APPROVED', 'Approved'
        REJECTED = 'REJECTED', 'Rejected'

    leave_request = models.ForeignKey(
        LeaveRequest,
        on_delete=models.CASCADE,
        related_name='validation_workflow'
    )
    validator = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='workflow_validations'
    )
    validator_role = models.CharField(
        max_length=20,
        choices=RoleChoices.choices,
        help_text='Role expected to validate this workflow step'
    )
    validation_order = models.PositiveIntegerField()
    decision = models.CharField(
        max_length=20,
        choices=Decision.choices,
        default=Decision.PENDING
    )
    comment = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    decided_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['leave_request', 'validation_order']
        constraints = [
            models.UniqueConstraint(
                fields=['leave_request', 'validation_order'],
                name='unique_workflow_order_per_leave_request'
            ),
        ]

    def __str__(self):
        return f"{self.leave_request_id} - step {self.validation_order} ({self.validator_role})"

    def clean(self):
        errors = {}

        if self.validation_order < 1:
            errors['validation_order'] = 'validation_order must be >= 1'

        if self.validator and self.validator_role:
            if self.validator.role != self.validator_role:
                if not (
                    self.validator_role == RoleChoices.RH_SIMPLE and
                    self.validator.role in {RoleChoices.RH_SIMPLE, RoleChoices.RH_AGENT, RoleChoices.RH_SENIOR}
                ):
                    errors['validator'] = 'validator role does not match validator_role for this workflow step'

        if errors:
            raise ValidationError(errors)

    def approve(self, validator_user, comment=''):
        self.validator = validator_user
        self.decision = self.Decision.APPROVED
        self.comment = comment
        self.decided_at = timezone.now()
        self.is_active = False
        self.save()

    def reject(self, validator_user, comment=''):
        self.validator = validator_user
        self.decision = self.Decision.REJECTED
        self.comment = comment
        self.decided_at = timezone.now()
        self.is_active = False
        self.save()

    @classmethod
    def initialize_for_leave_request(cls, leave_request):
        existing = cls.objects.filter(leave_request=leave_request)
        if existing.exists():
            return existing.order_by('validation_order')

        steps = [
            {'validation_order': 1, 'validator_role': RoleChoices.CHEF},
            {'validation_order': 2, 'validator_role': RoleChoices.RH_SIMPLE},
            {'validation_order': 3, 'validator_role': RoleChoices.GRH},
        ]

        for step in steps:
            cls.objects.create(leave_request=leave_request, **step)

        return cls.objects.filter(leave_request=leave_request).order_by('validation_order')


class SoldeConge(models.Model):
    """
    Leave Balance model tracking employee leave entitlements and usage.
    Maintains annual balance per employee per leave type.
    """
    employee = models.ForeignKey(
        Employee,
        on_delete=models.CASCADE,
        related_name='soldes_conge',
        verbose_name="Employé"
    )
    leaveType = models.ForeignKey(
        LeaveType,
        on_delete=models.CASCADE,
        related_name='soldes',
        verbose_name="Type de congé"
    )
    annee = models.IntegerField(
        validators=[MinValueValidator(2000)],
        verbose_name="Année",
        help_text="Year for this leave balance (e.g., 2026)"
    )
    joursAcquis = models.DecimalField(
        max_digits=5,
        decimal_places=1,
        validators=[MinValueValidator(0)],
        default=0,
        verbose_name="Jours acquis",
        help_text="Days acquired/earned for this year"
    )
    joursPris = models.DecimalField(
        max_digits=5,
        decimal_places=1,
        validators=[MinValueValidator(0)],
        default=0,
        verbose_name="Jours pris",
        help_text="Days taken/used"
    )
    joursRestants = models.DecimalField(
        max_digits=5,
        decimal_places=1,
        validators=[MinValueValidator(0)],
        default=0,
        verbose_name="Jours restants",
        help_text="Remaining days (calculated)"
    )
    joursReportes = models.DecimalField(
        max_digits=5,
        decimal_places=1,
        validators=[MinValueValidator(0)],
        default=0,
        verbose_name="Jours reportés",
        help_text="Days carried over from previous year"
    )
    derniereMaj = models.DateTimeField(
        auto_now=True,
        verbose_name="Dernière mise à jour",
        help_text="Last time this balance was updated"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Solde de congé"
        verbose_name_plural = "Soldes de congé"
        ordering = ['employee', 'leaveType', '-annee']
        constraints = [
            models.UniqueConstraint(
                fields=['employee', 'leaveType', 'annee'],
                name='unique_solde_per_employee_leavetype_year'
            ),
        ]

    def __str__(self):
        return f"{self.employee} - {self.leaveType} {self.annee}: {self.joursRestants} jours restants"

    def clean(self):
        """Validate SoldeConge constraints"""
        errors = {}

        # Validate non-negative values
        if self.joursAcquis < 0:
            errors['joursAcquis'] = "Jours acquis must be >= 0"
        
        if self.joursPris < 0:
            errors['joursPris'] = "Jours pris must be >= 0"
        
        if self.joursReportes < 0:
            errors['joursReportes'] = "Jours reportés must be >= 0"
        
        if self.joursRestants < 0:
            errors['joursRestants'] = "Jours restants must be >= 0"

        # Validate year is reasonable
        from datetime import date
        current_year = date.today().year
        if self.annee < 2000 or self.annee > current_year + 1:
            errors['annee'] = f"Year must be between 2000 and {current_year + 1}"

        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def calculer(self):
        """
        Calculate and update the leave balance.
        Formula: joursRestants = joursAcquis + joursReportes - joursPris
        """
        self.joursRestants = self.joursAcquis + self.joursReportes - self.joursPris
        
        # Ensure non-negative result
        if self.joursRestants < 0:
            self.joursRestants = 0
        
        # Save updates joursRestants and derniereMaj (auto_now)
        self.save()

    def debiter(self, jours):
        """
        Remove leave days when a leave request is approved.
        - Increase joursPris
        - Decrease joursRestants
        - Ensure balance never becomes negative
        - Save instance (updates derniereMaj via auto_now)
        """
        jours = Decimal(str(jours))
        if jours < 0:
            raise ValidationError({'joursPris': 'Le nombre de jours à débiter doit être >= 0.'})

        nouveau_solde = self.joursRestants - jours
        if nouveau_solde < 0:
            raise ValidationError({'joursRestants': 'Solde insuffisant pour débiter ce nombre de jours.'})

        self.joursPris = self.joursPris + jours
        self.joursRestants = nouveau_solde
        self.save()

    def crediter(self, jours):
        """
        Add leave days (monthly acquisition or leave cancellation).
        - Increase joursAcquis
        - Increase joursRestants
        - Save instance (updates derniereMaj via auto_now)
        """
        jours = Decimal(str(jours))
        if jours < 0:
            raise ValidationError({'joursAcquis': 'Le nombre de jours à créditer doit être >= 0.'})

        self.joursAcquis = self.joursAcquis + jours
        self.joursRestants = self.joursRestants + jours
        self.save()

    def reporter(self, annee_suivante):
        """
        Transfer remaining days to the next year.
        - Create/get next year balance for same employee and leave type
        - Move current joursRestants to next year joursReportes
        - Set current joursRestants to 0
        - Save both records
        """
        solde_suivant, _ = SoldeConge.objects.get_or_create(
            employee=self.employee,
            leaveType=self.leaveType,
            annee=annee_suivante,
            defaults={
                'joursAcquis': self.leaveType.nbrJoursDroit,
                'joursPris': 0,
                'joursReportes': 0,
                'joursRestants': self.leaveType.nbrJoursDroit,
            }
        )

        montant_reporte = self.joursRestants
        solde_suivant.joursReportes = solde_suivant.joursReportes + montant_reporte
        solde_suivant.joursRestants = solde_suivant.joursRestants + montant_reporte

        self.joursRestants = Decimal('0')

        solde_suivant.save()
        self.save()

        return solde_suivant

    def getSoldeReel(self):
        """Return real balance at current moment: acquis + reportes - pris."""
        return self.joursAcquis + self.joursReportes - self.joursPris

    @classmethod
    def get_or_create_balance(cls, employee, leave_type, annee):
        """
        Get or create a leave balance for an employee, leave type, and year.
        Automatically initializes with the leave type's default entitlement.
        """
        solde, created = cls.objects.get_or_create(
            employee=employee,
            leaveType=leave_type,
            annee=annee,
            defaults={
                'joursAcquis': leave_type.nbrJoursDroit,
                'joursPris': 0,
                'joursReportes': 0,
                'joursRestants': leave_type.nbrJoursDroit
            }
        )
        return solde, created

    @classmethod
    def get_employee_balances(cls, employee, annee=None):
        """Get all leave balances for an employee for a specific year.

        Missing balances are initialized automatically from the configured
        leave types so the frontend always receives a complete set.
        """
        from datetime import date
        if annee is None:
            annee = date.today().year

        leave_types = LeaveType.objects.order_by('code')
        for leave_type in leave_types:
            cls.get_or_create_balance(employee, leave_type, annee)

        return cls.objects.filter(employee=employee, annee=annee).select_related('leaveType')


class AbsenceWarning(models.Model):
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='absence_warnings')
    date = models.DateField()
    comment = models.TextField(blank=True)
    issued_by = models.ForeignKey('User', on_delete=models.SET_NULL, null=True, related_name='issued_warnings')
    issued_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['employee', 'date'], name='unique_absence_warning_per_day')
        ]

    def __str__(self):
        return f"Warning {self.employee} {self.date}"


class DisciplineFlag(models.Model):
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='discipline_flags')
    month = models.DateField(help_text='First day of month representing the month')
    warning_count = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['employee', 'month'], name='unique_discipline_flag_per_month')
        ]

    def __str__(self):
        return f"DisciplineFlag {self.employee} {self.month} ({self.warning_count})"


class Notification(models.Model):
    user = models.ForeignKey('User', on_delete=models.CASCADE, related_name='notifications')
    title = models.CharField(max_length=255)
    message = models.TextField()
    link = models.CharField(max_length=255, blank=True)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Notification {self.user} {self.title}"


class DocumentType(models.Model):
    class Category(models.TextChoices):
        RH = 'RH', 'HR'
        FINANCE = 'FINANCE', 'Finance'
        INTERNAL = 'INTERNAL', 'Internal'

    name = models.CharField(max_length=100)
    category = models.CharField(max_length=20, choices=Category.choices)

    def __str__(self):
        return f"{self.name} ({self.category})"


class Document(models.Model):
    class Status(models.TextChoices):
        DRAFT = 'DRAFT', 'Draft'
        SENT = 'SENT', 'Sent'
        VALIDATED = 'VALIDATED', 'Validated'
        REJECTED = 'REJECTED', 'Rejected'
        ARCHIVED = 'ARCHIVED', 'Archived'

    class ConfidentialityLevel(models.TextChoices):
        PUBLIC = 'PUBLIC', 'Public'
        INTERNAL = 'INTERNAL', 'Internal'
        CONFIDENTIAL = 'CONFIDENTIAL', 'Confidential'

    title = models.CharField(max_length=255)
    doc_type = models.ForeignKey(DocumentType, on_delete=models.CASCADE, related_name='documents')
    file = models.FileField(upload_to='documents/')
    source_service = models.ForeignKey(Service, on_delete=models.CASCADE, to_field='code', related_name='documents_created')
    target_service = models.ForeignKey(Service, on_delete=models.SET_NULL, to_field='code', null=True, blank=True, related_name='documents_received')
    created_by = models.ForeignKey('User', on_delete=models.SET_NULL, null=True, related_name='documents_created')
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)
    confidentiality_level = models.CharField(max_length=20, choices=ConfidentialityLevel.choices, default=ConfidentialityLevel.INTERNAL)
    sent_at = models.DateTimeField(null=True, blank=True)
    validated_by = models.ForeignKey('User', on_delete=models.SET_NULL, null=True, blank=True, related_name='documents_validated')
    validated_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.title} ({self.status})"

    @property
    def current_version(self):
        """Get the current version of this document."""
        return self.versions.filter(is_current=True).first()

    def get_version_history(self):
        """Get all versions of this document ordered by version number (newest first)."""
        return self.versions.all()

    @property
    def current_validation_step(self):
        """Get the currently active validation step."""
        return self.validations.filter(is_active=True).first()

    def get_validation_workflow(self):
        """Get all validation steps ordered by step_order."""
        return self.validations.all()

    @property
    def validation_status(self):
        """Get summary of validation workflow status.
        
        Returns:
            dict: Contains workflow_complete, steps_completed, total_steps, is_rejected
        """
        validations = self.validations.all()
        total_steps = validations.count()
        
        if total_steps == 0:
            return {
                'workflow_complete': True,
                'steps_completed': 0,
                'total_steps': 0,
                'is_rejected': False
            }
        
        approved_steps = validations.filter(status='APPROVED').count()
        rejected_step = validations.filter(status='REJECTED').first()
        
        return {
            'workflow_complete': approved_steps == total_steps,
            'steps_completed': approved_steps,
            'total_steps': total_steps,
            'is_rejected': rejected_step is not None
        }

    def log_access(self, user, action, ip_address=None, result=True, details=''):
        """Log an access to this document.
        
        Args:
            user (User): The user accessing the document
            action (str): The action being performed
            ip_address (str, optional): IP address of the request
            result (bool): Whether access was allowed
            details (str, optional): Additional details
            
        Returns:
            DocumentAccess: The created access log
        """
        return self.access_logs.create(
            user=user,
            action=action,
            ip_address=ip_address,
            result=result,
            details=details
        )

    def create_new_version(self, file_obj, author=None, comment=''):
        """Create a new document version and mark it as the current version."""
        if not file_obj:
            raise ValidationError('file is required to create a new version')

        with transaction.atomic():
            self.versions.filter(is_current=True).update(is_current=False)
            latest_version = self.versions.order_by('-numVersion').first()
            next_version = (latest_version.numVersion + 1) if latest_version else 1

            version = DocumentVersion.objects.create(
                document=self,
                numVersion=next_version,
                author=author,
                comment=comment,
                file_path=file_obj,
                size=getattr(file_obj, 'size', 0),
                is_current=True,
            )

            self.file = file_obj
            self.save(update_fields=['file'])
            return version

    def get_access_logs(self, action=None, user=None):
        """Get access logs for this document.
        
        Args:
            action (str, optional): Filter by action
            user (User, optional): Filter by user
            
        Returns:
            QuerySet: Access logs for this document
        """
        return self.access_logs.filter(
            **(dict(action=action) if action else {}),
            **(dict(user=user) if user else {})
        )


class DocumentHistory(models.Model):
    class Action(models.TextChoices):
        CREATED = 'CREATED', 'Created'
        SENT = 'SENT', 'Sent'
        COMMENTED = 'COMMENTED', 'Commented'
        VALIDATED = 'VALIDATED', 'Validated'
        ARCHIVED = 'ARCHIVED', 'Archived'
        RETURNED = 'RETURNED', 'Returned'

    document = models.ForeignKey(Document, on_delete=models.CASCADE, related_name='history')
    parent = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, related_name='replies')
    action = models.CharField(max_length=20, choices=Action.choices)
    by_user = models.ForeignKey('User', on_delete=models.SET_NULL, null=True, related_name='document_history_actions')
    note = models.TextField(blank=True)
    is_private = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.document} {self.action} by {self.by_user}"


class DocumentVersion(models.Model):
    """Version tracking for documents - preserves full history."""
    document = models.ForeignKey(Document, on_delete=models.CASCADE, related_name='versions')
    numVersion = models.PositiveIntegerField(verbose_name="Version Number")
    author = models.ForeignKey(Employee, on_delete=models.SET_NULL, null=True, related_name='document_versions')
    comment = models.TextField(blank=True, help_text="Description of the change (e.g., 'Correction clause 3')")
    file_path = models.FileField(upload_to='document_versions/')
    size = models.BigIntegerField(help_text="File size in bytes")
    checksum = models.CharField(max_length=64, blank=True, help_text="SHA256 checksum of this file version")
    is_current = models.BooleanField(default=False, help_text="Only one version can be current per document")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-numVersion']
        constraints = [
            models.UniqueConstraint(
                fields=['document'],
                condition=models.Q(is_current=True),
                name='unique_current_version_per_document',
                violation_error_message='A document can only have one current version.'
            )
        ]

    def __str__(self):
        current_marker = " (current)" if self.is_current else ""
        return f"{self.document.title} v{self.numVersion}{current_marker}"

    @staticmethod
    def generate_checksum(file_obj):
        """Generate SHA256 checksum for a file object."""
        if not file_obj:
            return ''

        hasher = hashlib.sha256()
        should_close = False

        try:
            if hasattr(file_obj, 'open') and getattr(file_obj, 'closed', True):
                file_obj.open('rb')
                should_close = True

            if hasattr(file_obj, 'seek'):
                file_obj.seek(0)

            if hasattr(file_obj, 'chunks'):
                for chunk in file_obj.chunks():
                    hasher.update(chunk)
            else:
                while True:
                    chunk = file_obj.read(8192)
                    if not chunk:
                        break
                    hasher.update(chunk)

            if hasattr(file_obj, 'seek'):
                file_obj.seek(0)

            return hasher.hexdigest()
        finally:
            if should_close and hasattr(file_obj, 'close'):
                file_obj.close()

    def verify_integrity(self):
        """Recompute checksum and verify this file version integrity."""
        if not self.file_path or not self.checksum:
            return False

        current_checksum = self.generate_checksum(self.file_path)
        is_valid = current_checksum == self.checksum

        if not is_valid:
            DocumentAccess.log_access(
                document=self.document,
                user=self.document.created_by,
                action=DocumentAccess.Action.READ,
                result=False,
                details=f"Integrity verification failed for version {self.numVersion}"
            )

        return is_valid

    def save(self, *args, **kwargs):
        """Automatically generate checksum when file content is saved/updated."""
        if self.file_path:
            self.checksum = self.generate_checksum(self.file_path)

        super().save(*args, **kwargs)

    def mark_as_current(self):
        """Set this version as current and unset all others for the same document."""
        with transaction.atomic():
            # Set all versions of this document to not current
            DocumentVersion.objects.filter(document=self.document).update(is_current=False)
            # Set this version as current
            self.is_current = True
            self.save(update_fields=['is_current'])

    def restore(self):
        """Restore this version as the current version.
        
        This makes an old version become the current version again.
        """
        self.mark_as_current()

    def download(self):
        """Return file reference for downloading this version.
        
        Returns:
            FileField: The file_path field which can be used to access the file.
        """
        return self.file_path

    def compare(self, other_version):
        """Compare this version with another version.
        
        Args:
            other_version (DocumentVersion): Another version to compare with.
            
        Returns:
            dict: A dictionary containing differences between versions.
            
        Raises:
            ValueError: If other_version is not a DocumentVersion or belongs to a different document.
        """
        if not isinstance(other_version, DocumentVersion):
            raise ValueError("Can only compare with another DocumentVersion instance")
        
        if other_version.document_id != self.document_id:
            raise ValueError("Cannot compare versions from different documents")
        
        return {
            'version_diff': {
                'from_version': other_version.numVersion,
                'to_version': self.numVersion,
                'versions_apart': abs(self.numVersion - other_version.numVersion),
            },
            'author_diff': {
                'from_author': str(other_version.author) if other_version.author else None,
                'to_author': str(self.author) if self.author else None,
                'same_author': self.author == other_version.author,
            },
            'size_diff': {
                'from_size': other_version.size,
                'to_size': self.size,
                'difference_bytes': self.size - other_version.size,
            },
            'time_diff': {
                'from_date': other_version.created_at,
                'to_date': self.created_at,
                'time_elapsed': self.created_at - other_version.created_at,
            },
            'comment_diff': {
                'from_comment': other_version.comment,
                'to_comment': self.comment,
            }
        }


class DocumentValidation(models.Model):
    """Multi-step validation workflow for documents."""
    
    class Status(models.TextChoices):
        IN_PROGRESS = 'IN_PROGRESS', 'In Progress'
        APPROVED = 'APPROVED', 'Approved'
        REJECTED = 'REJECTED', 'Rejected'
    
    document = models.ForeignKey(Document, on_delete=models.CASCADE, related_name='validations')
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.IN_PROGRESS)
    validation_date = models.DateTimeField(null=True, blank=True, help_text="When the decision was made")
    validator = models.ForeignKey(Employee, on_delete=models.SET_NULL, null=True, related_name='validations')
    comment = models.TextField(blank=True, help_text="Explanation of the decision")
    signature = models.CharField(max_length=500, blank=True, help_text="Electronic/digital signature of the validator")
    step_order = models.PositiveIntegerField(help_text="Step number in the workflow (1, 2, 3...)")
    is_active = models.BooleanField(default=False, help_text="Indicates the current validation step")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['step_order']
        constraints = [
            models.UniqueConstraint(
                fields=['document', 'step_order'],
                name='unique_step_per_document',
                violation_error_message='Each step order must be unique per document.'
            ),
            models.UniqueConstraint(
                fields=['document'],
                condition=models.Q(is_active=True),
                name='unique_active_step_per_document',
                violation_error_message='Only one validation step can be active per document.'
            )
        ]

    def __str__(self):
        return f"{self.document.title} - Step {self.step_order} ({self.status})"

    def validate(self, signature):
        """Mark this step as APPROVED and activate the next step.
        
        Args:
            signature (str): Digital signature of the validator
            
        Returns:
            DocumentValidation or None: The next validation step if exists, None otherwise
        """
        with transaction.atomic():
            # Mark this step as approved
            self.status = self.Status.APPROVED
            self.validation_date = timezone.now()
            self.signature = signature
            self.is_active = False
            self.save(update_fields=['status', 'validation_date', 'signature', 'is_active', 'updated_at'])
            
            # Find and activate the next step
            next_step = DocumentValidation.objects.filter(
                document=self.document,
                step_order__gt=self.step_order
            ).order_by('step_order').first()
            
            if next_step:
                next_step.is_active = True
                next_step.save(update_fields=['is_active', 'updated_at'])
                next_step.notify()
                return next_step
            else:
                # All steps completed - mark document as VALIDATED
                self.document.status = Document.Status.VALIDATED
                self.document.validated_at = timezone.now()
                self.document.save(update_fields=['status', 'validated_at'])
                return None

    def reject(self, reason):
        """Mark this step as REJECTED and stop the workflow.
        
        Args:
            reason (str): Explanation for the rejection
        """
        with transaction.atomic():
            # Mark this step as rejected
            self.status = self.Status.REJECTED
            self.validation_date = timezone.now()
            self.comment = reason
            self.is_active = False
            self.save(update_fields=['status', 'validation_date', 'comment', 'is_active', 'updated_at'])
            
            # Deactivate all remaining steps in the workflow
            DocumentValidation.objects.filter(
                document=self.document,
                step_order__gt=self.step_order
            ).update(is_active=False)

            self.document.status = Document.Status.REJECTED
            self.document.save(update_fields=['status'])

    def notify(self):
        """Send notification to the validator when it's their turn.
        
        Creates a notification for the validator using the notification system.
        """
        from .views.helpers import notify
        
        if self.validator and self.validator.email:
            try:
                # Find the User associated with this validator
                user = User.objects.filter(email=self.validator.email).first()
                if user:
                    notify(
                        user=user,
                        title="Document Validation Required",
                        message=f"Document '{self.document.title}' requires your validation (Step {self.step_order})",
                        link=f"/documents/{self.document.id}"
                    )
            except Exception as e:
                # Log error but don't fail the workflow
                pass

    @classmethod
    def getWorkflow(cls, document):
        """Get all validation steps for a document ordered by step_order.
        
        Args:
            document (Document): The document to get workflow for
            
        Returns:
            QuerySet: All validation steps ordered by step_order
        """
        return cls.objects.filter(document=document).order_by('step_order')

    @classmethod
    def initialize_workflow(cls, document, validators_with_order):
        """Initialize a validation workflow for a document.
        
        Args:
            document (Document): The document to create workflow for
            validators_with_order (list): List of tuples (Employee, step_order)
                Example: [(employee1, 1), (employee2, 2), (employee3, 3)]
        
        Returns:
            list: List of created DocumentValidation instances
        """
        with transaction.atomic():
            validation_steps = []
            for idx, (validator, step_order) in enumerate(validators_with_order):
                step = cls.objects.create(
                    document=document,
                    validator=validator,
                    step_order=step_order,
                    is_active=(idx == 0)  # First step is active
                )
                validation_steps.append(step)
            
            # Notify the first validator
            if validation_steps:
                validation_steps[0].notify()
            
            return validation_steps


class DocumentAccess(models.Model):
    """Audit log for document access traceability."""
    
    class Action(models.TextChoices):
        READ = 'READ', 'Read'
        DOWNLOAD = 'DOWNLOAD', 'Download'
        MODIFY = 'MODIFY', 'Modify'
        DELETE = 'DELETE', 'Delete'
        SHARE = 'SHARE', 'Share'
    
    document = models.ForeignKey(Document, on_delete=models.CASCADE, related_name='access_logs')
    user = models.ForeignKey('User', on_delete=models.SET_NULL, null=True, related_name='document_accesses')
    access_datetime = models.DateTimeField(auto_now_add=True, help_text="Exact timestamp of the access")
    action = models.CharField(max_length=20, choices=Action.choices, help_text="Action performed on the document")
    ip_address = models.GenericIPAddressField(null=True, blank=True, help_text="IP address from which access was made")
    result = models.BooleanField(default=True, help_text="True = access allowed, False = access denied")
    details = models.TextField(blank=True, help_text="Additional details about the access attempt")

    class Meta:
        ordering = ['-access_datetime']
        verbose_name = 'Document Access Log'
        verbose_name_plural = 'Document Access Logs'
        indexes = [
            models.Index(fields=['document', '-access_datetime']),
            models.Index(fields=['user', '-access_datetime']),
            models.Index(fields=['action', '-access_datetime']),
        ]

    def __str__(self):
        status = "allowed" if self.result else "denied"
        return f"{self.user} - {self.action} on {self.document.title} ({status})"

    @classmethod
    def log_access(cls, document, user, action, ip_address=None, result=True, details=''):
        """Create an access log entry.
        
        Args:
            document (Document): The document being accessed
            user (User): The user performing the action
            action (str): The action being performed (READ, DOWNLOAD, MODIFY, DELETE, SHARE)
            ip_address (str, optional): IP address of the request
            result (bool): Whether the access was allowed (True) or denied (False)
            details (str, optional): Additional details about the access
            
        Returns:
            DocumentAccess: The created access log entry
        """
        return cls.objects.create(
            document=document,
            user=user,
            action=action,
            ip_address=ip_address,
            result=result,
            details=details
        )

    @classmethod
    def get_logs(cls, document, action=None, user=None, result=None):
        """Get all access logs for a document with optional filters.
        
        Args:
            document (Document): The document to get logs for
            action (str, optional): Filter by action type
            user (User, optional): Filter by user
            result (bool, optional): Filter by access result (allowed/denied)
            
        Returns:
            QuerySet: Filtered access logs ordered by datetime (newest first)
        """
        queryset = cls.objects.filter(document=document)
        
        if action:
            queryset = queryset.filter(action=action)
        if user:
            queryset = queryset.filter(user=user)
        if result is not None:
            queryset = queryset.filter(result=result)
        
        return queryset

    @classmethod
    def get_user_activity(cls, user, days=30):
        """Get a user's document access activity for the last N days.
        
        Args:
            user (User): The user to get activity for
            days (int): Number of days to look back
            
        Returns:
            QuerySet: User's access logs for the period
        """
        from datetime import timedelta
        cutoff_date = timezone.now() - timedelta(days=days)
        return cls.objects.filter(user=user, access_datetime__gte=cutoff_date)

    @classmethod
    def get_denied_attempts(cls, document=None, user=None):
        """Get all denied access attempts.
        
        Args:
            document (Document, optional): Filter by specific document
            user (User, optional): Filter by specific user
            
        Returns:
            QuerySet: Denied access attempts
        """
        queryset = cls.objects.filter(result=False)
        
        if document:
            queryset = queryset.filter(document=document)
        if user:
            queryset = queryset.filter(user=user)
        
        return queryset

    @staticmethod
    def check_permission(user, document, action):
        """Check if a user has permission to perform an action on a document.
        
        This is a basic permission check that can be extended with custom logic.
        
        Args:
            user (User): The user attempting the action
            document (Document): The document being accessed
            action (str): The action being performed
            
        Returns:
            dict: Contains 'allowed' (bool) and 'reason' (str) keys
        """
        # Basic permission logic - can be extended based on business rules
        if not user or not user.is_authenticated:
            return {'allowed': False, 'reason': 'User not authenticated'}
        
        # Document creator always has access
        if document.created_by_id == user.id:
            return {'allowed': True, 'reason': 'Document creator'}
        
        # Check if user is in the document's service
        try:
            employee = Employee.objects.filter(email=user.email).first()
            if employee:
                # User in source or target service
                if document.source_service_id == employee.service_id:
                    return {'allowed': True, 'reason': 'User in source service'}
                if document.target_service_id == employee.service_id:
                    return {'allowed': True, 'reason': 'User in target service'}
        except Exception:
            pass
        
        # GRH and RH roles have access to all documents
        if user.role in ['GRH', 'RH_SENIOR', 'RH_AGENT', 'RH_SIMPLE']:
            return {'allowed': True, 'reason': f'User has {user.role} role'}
        
        # MODIFY and DELETE actions require higher permissions
        if action in [DocumentAccess.Action.MODIFY, DocumentAccess.Action.DELETE]:
            if user.role not in ['GRH', 'RH_SENIOR', 'CHEF']:
                return {'allowed': False, 'reason': 'Insufficient permissions for modify/delete'}
        
        # Default: deny access
        return {'allowed': False, 'reason': 'No matching permissions'}


# ============================================================
# MODULE 10: INTERNAL MESSAGING
# ============================================================

class Message(models.Model):
    """Main message model for internal messaging system."""
    sender = models.ForeignKey('User', on_delete=models.CASCADE, related_name='sent_messages')
    recipient = models.ForeignKey('User', on_delete=models.CASCADE, related_name='received_messages')
    subject = models.CharField(max_length=255)
    body = models.TextField()
    is_read = models.BooleanField(default=False)
    is_deleted_by_sender = models.BooleanField(default=False)
    is_deleted_by_recipient = models.BooleanField(default=False)
    parent_message = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, related_name='replies')
    is_reply = models.BooleanField(default=False)
    is_forward = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Message from {self.sender.email} to {self.recipient.email}: {self.subject}"


class MessageAttachment(models.Model):
    """File attachments for messages."""
    message = models.ForeignKey(Message, on_delete=models.CASCADE, related_name='attachments')
    file = models.FileField(upload_to='message_attachments/')
    file_name = models.CharField(max_length=255)
    file_size = models.IntegerField()  # in bytes
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Attachment {self.file_name} for message {self.message.id}"


class Draft(models.Model):
    """Draft messages (only visible to creator, editable)."""
    creator = models.ForeignKey('User', on_delete=models.CASCADE, related_name='drafts')
    recipient = models.ForeignKey('User', on_delete=models.SET_NULL, null=True, blank=True, related_name='received_drafts')
    subject = models.CharField(max_length=255, blank=True)
    body = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']

    def __str__(self):
        return f"Draft by {self.creator.email}: {self.subject}"


class BlockedUser(models.Model):
    """User blocking system."""
    blocker = models.ForeignKey('User', on_delete=models.CASCADE, related_name='blocked_users')
    blocked = models.ForeignKey('User', on_delete=models.CASCADE, related_name='blocked_by')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('blocker', 'blocked')

    def __str__(self):
        return f"{self.blocker.email} blocked {self.blocked.email}"


class MessageReport(models.Model):
    """Reported messages for moderation."""
    message = models.ForeignKey(Message, on_delete=models.CASCADE, related_name='reports')
    reporter = models.ForeignKey('User', on_delete=models.CASCADE, related_name='message_reports')
    reason = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    is_resolved = models.BooleanField(default=False)
    resolved_by = models.ForeignKey('User', on_delete=models.SET_NULL, null=True, blank=True, related_name='resolved_reports')
    resolution_note = models.TextField(blank=True)
    message_hidden = models.BooleanField(default=False)
    sender_blocked = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    resolved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ('message', 'reporter')
        ordering = ['-created_at']

    def __str__(self):
        return f"Report {self.id} on message {self.message.id} by {self.reporter.email}"


class Announcement(models.Model):
    """Internal announcements from Admin RH/DRH."""
    class TargetScope(models.TextChoices):
        GLOBAL = 'GLOBAL', 'All Users'
        SERVICE = 'SERVICE', 'Specific Service'

    creator = models.ForeignKey('User', on_delete=models.CASCADE, related_name='announcements')
    title = models.CharField(max_length=255)
    message = models.TextField()
    scope = models.CharField(max_length=20, choices=TargetScope.choices, default=TargetScope.GLOBAL)
    target_service = models.ForeignKey(Service, on_delete=models.CASCADE, to_field='code', null=True, blank=True, related_name='announcements')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Announcement: {self.title}"


class MessagingSettings(models.Model):
    """Global messaging rules and settings (singleton)."""
    max_attachment_size_mb = models.IntegerField(default=10)  # in MB
    allowed_file_extensions = models.CharField(
        max_length=500,
        default='pdf,txt,doc,docx,xls,xlsx,jpg,jpeg,png,gif',
        help_text='Comma-separated file extensions without dot'
    )
    blocking_enabled = models.BooleanField(default=True)
    announcements_global_default = models.BooleanField(default=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = 'Messaging Settings'

    def __str__(self):
        return 'Messaging Settings'


class EvaluationCampaign(models.Model):
    class Status(models.TextChoices):
        DRAFT = 'DRAFT', 'Brouillon'
        OPEN = 'OPEN', 'Ouverte'
        CLOSED = 'CLOSED', 'Cloturee'

    title = models.CharField(max_length=255)
    start_date = models.DateField()
    end_date = models.DateField()
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.OPEN)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-start_date', '-created_at']

    def __str__(self):
        return self.title


class EvaluationCriteria(models.Model):
    label = models.CharField(max_length=150, unique=True)
    weight = models.DecimalField(max_digits=5, decimal_places=2, default=1)
    note_min = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    note_max = models.DecimalField(max_digits=5, decimal_places=2, default=5)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['id']

    def __str__(self):
        return self.label


class Evaluation(models.Model):
    class Status(models.TextChoices):
        DRAFT = 'DRAFT', 'Brouillon'
        COMPLETED = 'COMPLETED', 'Completee'

    class Recommendation(models.TextChoices):
        EXCELLENT = 'EXCELLENT', 'Excellent'
        GOOD = 'GOOD', 'Bon'
        AVERAGE = 'AVERAGE', 'Moyen'
        IMPROVEMENT = 'IMPROVEMENT', 'A ameliorer'

    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='evaluations')
    evaluator = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='evaluations_given')
    campaign = models.ForeignKey(EvaluationCampaign, on_delete=models.SET_NULL, null=True, blank=True, related_name='evaluations')
    year = models.IntegerField()
    period = models.CharField(max_length=50, default='Annuel')
    evaluation_date = models.DateField(default=timezone.localdate)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.COMPLETED)
    global_score = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    recommendation = models.CharField(max_length=20, choices=Recommendation.choices, default=Recommendation.AVERAGE)
    overall_comment = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-evaluation_date', '-created_at']

    def __str__(self):
        return f"Evaluation {self.employee} - {self.year}"


class EvaluationScore(models.Model):
    evaluation = models.ForeignKey(Evaluation, on_delete=models.CASCADE, related_name='scores')
    criterion = models.ForeignKey(EvaluationCriteria, on_delete=models.CASCADE, related_name='scores')
    score = models.DecimalField(max_digits=5, decimal_places=2)
    comment = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['criterion_id']

    def __str__(self):
        return f"{self.evaluation_id} - {self.criterion.label}"


class FormationRequest(models.Model):
    """Formation/Training request from Chef."""
    class Status(models.TextChoices):
        PENDING = 'PENDING', 'En Attente'
        WAITING_FOR_PEOPLE = 'WAITING_FOR_PEOPLE', 'Waiting for People List'
        APPROVED = 'APPROVED', 'Approuvé'
        REJECTED = 'REJECTED', 'Rejeté'

    requested_by = models.ForeignKey('User', on_delete=models.CASCADE, related_name='formation_requests')
    nom = models.CharField(max_length=255, help_text='Formation name')
    description = models.TextField(help_text='Formation description')
    reasons = models.TextField(blank=True, help_text='Reasons for requesting this formation')
    status = models.CharField(max_length=30, choices=Status.choices, default=Status.PENDING)
    approved_formation = models.ForeignKey('FormationCatalog', on_delete=models.SET_NULL, null=True, blank=True, related_name='approved_requests')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.nom} - {self.get_status_display()}"


class FormationCatalog(models.Model):
    """Formation definitions managed by RH Agent."""
    name = models.CharField(max_length=255)
    company_name = models.CharField(max_length=255)
    duration_hours = models.PositiveIntegerField()
    people_required = models.PositiveIntegerField(default=1)
    company_email = models.EmailField()
    company_phone = models.CharField(max_length=30)
    company_address = models.CharField(max_length=500)
    created_by = models.ForeignKey('User', on_delete=models.SET_NULL, null=True, related_name='created_formations')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} - {self.company_name}"


class FormationParticipant(models.Model):
    """Participants assigned to a formation request."""
    formation_request = models.ForeignKey(FormationRequest, on_delete=models.CASCADE, related_name='participants')
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='formation_participations')
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('formation_request', 'employee')
        ordering = ['added_at']

    def __str__(self):
        return f"{self.employee} in {self.formation_request.nom}"
