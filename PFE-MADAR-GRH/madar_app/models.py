from django.db import models
from django.contrib.auth.models import AbstractUser
from django.contrib.auth.base_user import BaseUserManager


class RoleChoices(models.TextChoices):
    EMPLOYEE = 'EMPLOYEE', 'Employee'
    CHEF = 'CHEF', 'Chef'
    RH_SIMPLE = 'RH_SIMPLE', 'RH'
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


class Department(models.Model):
    name = models.CharField(max_length=100)

    def __str__(self):
        return self.name


class Employee(models.Model):
    first_name = models.CharField(max_length=50)
    last_name = models.CharField(max_length=50)
    email = models.EmailField(unique=True)
    hired_at = models.DateField()
    department = models.ForeignKey(Department, on_delete=models.CASCADE)
    salary = models.DecimalField(max_digits=10, decimal_places=2)
    attendance_pin = models.CharField(max_length=4, blank=True)

    def __str__(self):
        return f"{self.first_name} {self.last_name}"


class Task(models.Model):
    class Status(models.TextChoices):
        TODO = 'TODO', 'To Do'
        DONE = 'DONE', 'Done'

    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    due_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.TODO)
    assigned_to = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='tasks')
    assigned_by = models.ForeignKey('User', on_delete=models.SET_NULL, null=True, related_name='assigned_tasks')
    created_at = models.DateTimeField(auto_now_add=True)
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


class LeaveRequest(models.Model):
    class LeaveType(models.TextChoices):
        ANNUAL = 'ANNUAL', 'Annual'
        SICK = 'SICK', 'Sick'
        OTHER = 'OTHER', 'Other'

    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        ACCEPTED = 'ACCEPTED', 'Accepted'
        REFUSED = 'REFUSED', 'Refused'

    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='leave_requests')
    start_date = models.DateField()
    end_date = models.DateField()
    type = models.CharField(max_length=20, choices=LeaveType.choices, default=LeaveType.ANNUAL)
    reason = models.TextField(blank=True)
    attachment = models.FileField(upload_to='leave_attachments/', null=True, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    chef_comment = models.TextField(blank=True)
    decided_by = models.ForeignKey('User', on_delete=models.SET_NULL, null=True, blank=True, related_name='decided_leaves')
    decided_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"LeaveRequest {self.employee} {self.start_date}..{self.end_date} ({self.status})"


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
        ARCHIVED = 'ARCHIVED', 'Archived'

    title = models.CharField(max_length=255)
    doc_type = models.ForeignKey(DocumentType, on_delete=models.CASCADE, related_name='documents')
    file = models.FileField(upload_to='documents/')
    source_department = models.ForeignKey(Department, on_delete=models.CASCADE, related_name='documents_created')
    target_department = models.ForeignKey(Department, on_delete=models.SET_NULL, null=True, blank=True, related_name='documents_received')
    created_by = models.ForeignKey('User', on_delete=models.SET_NULL, null=True, related_name='documents_created')
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)
    sent_at = models.DateTimeField(null=True, blank=True)
    validated_by = models.ForeignKey('User', on_delete=models.SET_NULL, null=True, blank=True, related_name='documents_validated')
    validated_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.title} ({self.status})"


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