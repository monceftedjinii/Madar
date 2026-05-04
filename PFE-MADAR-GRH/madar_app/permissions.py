from rest_framework import permissions
from .models import RoleChoices, ServiceChoices, Employee, EmployeeRoleChoices


class HasRole(permissions.BasePermission):
    """Reusable permission that checks whether the user's role is in allowed roles.
    
    DEPRECATED: Use HasService or HasEmployeeRole instead for new code.
    This is kept for backward compatibility during migration.

    Usage:
    - Subclass and set `allowed_roles = [RoleChoices.GRH]`, or
    - Set `allowed_roles` on the view, e.g. `view.allowed_roles = [RoleChoices.CHEF]`.
    """

    allowed_roles = None

    def __init__(self, allowed_roles=None):
        if allowed_roles is not None:
            self.allowed_roles = allowed_roles

    def has_permission(self, request, view):
        user = getattr(request, 'user', None)
        if user is None or not user.is_authenticated:
            return False

        # View may override allowed_roles
        allowed = getattr(view, 'allowed_roles', None) or self.allowed_roles
        if not allowed:
            return False

        # Check new User.service for backward compat
        if user.service:
            # Map new service-based roles to old role checks
            service_to_roles = {
                ServiceChoices.RH: [RoleChoices.RH_SIMPLE, RoleChoices.RH_AGENT, RoleChoices.GRH],
                ServiceChoices.OTHER: [RoleChoices.EMPLOYEE, RoleChoices.CHEF],
            }
            return user.service in service_to_roles and any(
                r in allowed for r in service_to_roles[user.service]
            )
        
        # Fallback to old role field for users not yet migrated
        return user.role in allowed


class HasService(permissions.BasePermission):
    """Check if user belongs to specific service(s)."""
    
    allowed_services = None

    def __init__(self, allowed_services=None):
        if allowed_services is not None:
            self.allowed_services = allowed_services

    def has_permission(self, request, view):
        user = getattr(request, 'user', None)
        if user is None or not user.is_authenticated:
            return False

        allowed = getattr(view, 'allowed_services', None) or self.allowed_services
        if not allowed:
            return False

        return user.service in allowed


class HasEmployeeRole(permissions.BasePermission):
    """Check if user's related employee has specific role(s)."""
    
    allowed_roles = None

    def __init__(self, allowed_roles=None):
        if allowed_roles is not None:
            self.allowed_roles = allowed_roles

    def has_permission(self, request, view):
        user = getattr(request, 'user', None)
        if user is None or not user.is_authenticated:
            return False

        allowed = getattr(view, 'allowed_roles', None) or self.allowed_roles
        if not allowed:
            return False

        try:
            employee = Employee.objects.get(email=user.email)
            return employee.role in allowed
        except Employee.DoesNotExist:
            return False


class IsGRH(HasRole):
    allowed_roles = [RoleChoices.GRH]


class IsChef(HasRole):
    allowed_roles = [RoleChoices.CHEF]


class IsServiceManager(HasRole):
    allowed_roles = [RoleChoices.CHEF, RoleChoices.GRH]


class IsEmployee(HasRole):
    allowed_roles = [RoleChoices.EMPLOYEE]


class IsEmployeeOrChef(HasRole):
    allowed_roles = [RoleChoices.EMPLOYEE, RoleChoices.CHEF]


class CanUseAttendance(HasRole):
    allowed_roles = [
        RoleChoices.EMPLOYEE,
        RoleChoices.CHEF,
        RoleChoices.RH_SIMPLE,
        RoleChoices.RH_AGENT,
        RoleChoices.GRH,
    ]


class IsRHSimple(HasRole):
    allowed_roles = [RoleChoices.RH_SIMPLE]


class IsRHSenior(HasRole):
    allowed_roles = [RoleChoices.GRH]


class IsRH(HasRole):
    """Check if user belongs to RH service. Works for both old and new schema."""
    
    def has_permission(self, request, view):
        user = getattr(request, 'user', None)
        if user is None or not user.is_authenticated:
            return False
        
        # New structure: check service
        if user.service == ServiceChoices.RH:
            return True
        
        # Fallback to old role field
        return user.role in [
            RoleChoices.RH_SIMPLE,
            RoleChoices.RH_AGENT,
            RoleChoices.GRH,
        ]


class CanIssueWarnings(HasRole):
    allowed_roles = [
        RoleChoices.CHEF,
        RoleChoices.RH_SIMPLE,
        RoleChoices.RH_AGENT,
        RoleChoices.GRH,
    ]


class CanUploadDocument(permissions.BasePermission):
    """Allow users from RH service or with old RH roles to upload documents."""

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        # New structure: RH service members can upload
        if request.user.service == ServiceChoices.RH:
            return True
        
        # Fallback to old roles for backward compat
        return request.user.role in [
            RoleChoices.EMPLOYEE,
            RoleChoices.RH_SIMPLE,
            RoleChoices.RH_AGENT,
            RoleChoices.CHEF,
            RoleChoices.GRH
        ]


class CanValidateDocument(permissions.BasePermission):
    """Only GRH can validate documents."""

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.role in [RoleChoices.GRH]
