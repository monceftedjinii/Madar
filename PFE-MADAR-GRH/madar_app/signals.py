"""
Django signals for automatic User creation when Employees are created.
"""
from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Employee, User, RoleChoices
import secrets


@receiver(post_save, sender=Employee)
def create_user_for_employee(sender, instance, created, **kwargs):
    """
    Signal handler to automatically create a User account when an Employee is created.
    This ensures every employee can send/receive messages.
    """
    if created:
        # Check if a User already exists for this employee's email
        try:
            User.objects.get(email=instance.email)
            print(f"[SIGNAL] User already exists for employee {instance.email}")
        except User.DoesNotExist:
            # Generate a temporary password (employee should reset on first login)
            temp_password = secrets.token_urlsafe(12)
            
            user = User.objects.create_user(
                email=instance.email,
                password=temp_password,
                role=RoleChoices.EMPLOYEE
            )
            print(f"[SIGNAL] Created User account for employee {instance.email} (role: EMPLOYEE)")
            print(f"[SIGNAL] Temporary password: {temp_password} (should be reset by user)")
