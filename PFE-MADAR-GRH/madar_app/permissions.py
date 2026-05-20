from rest_framework import permissions
from .models import RoleChoices, ServiceChoices, Employee, EmployeeRoleChoices

# Sets of EmployeeRoleChoices that can access each feature area
RH_ALL_ROLES = {EmployeeRoleChoices.RH, EmployeeRoleChoices.RH_CONGE, EmployeeRoleChoices.RH_FORMATION, EmployeeRoleChoices.DRH}
RH_CONGE_ROLES = {EmployeeRoleChoices.RH_CONGE, EmployeeRoleChoices.DRH}
RH_FORMATION_ROLES = {EmployeeRoleChoices.RH_FORMATION, EmployeeRoleChoices.DRH}
RH_DRH_ROLES = {EmployeeRoleChoices.DRH}


def get_rh_employee_role(user):
    """Return the Employee.role for a given user, or None."""
    try:
        return Employee.objects.get(email=user.email).role
    except Employee.DoesNotExist:
        return None


def is_any_rh(user):
    """True if user has any RH role — Employee.role is source of truth, User.role as fallback."""
    emp_role = get_rh_employee_role(user)
    if emp_role in RH_ALL_ROLES:
        return True
    return user.role in {RoleChoices.RH_SIMPLE, RoleChoices.RH_AGENT, RoleChoices.GRH}


def is_conge_rh(user):
    """True if user can manage leaves/absences (RH_CONGE or DRH, or old RH roles)."""
    emp_role = get_rh_employee_role(user)
    if emp_role in RH_CONGE_ROLES:
        return True
    return user.role in {RoleChoices.RH_SIMPLE, RoleChoices.RH_AGENT, RoleChoices.GRH}


def is_formation_rh(user):
    """True if user can manage formations (RH_FORMATION or DRH, or old agent/GRH)."""
    emp_role = get_rh_employee_role(user)
    if emp_role in RH_FORMATION_ROLES:
        return True
    return user.role in {RoleChoices.RH_AGENT, RoleChoices.GRH}


def is_drh(user):
    """True if user is DRH (or old GRH) — full RH management access."""
    emp_role = get_rh_employee_role(user)
    if emp_role == EmployeeRoleChoices.DRH:
        return True
    return user.role == RoleChoices.GRH


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

        # Always allow if user.role matches directly (e.g. DRH with role=CHEF)
        if user.role in allowed:
            return True

        # HR service has its own role mapping for RH roles
        if user.service == ServiceChoices.HR:
            hr_roles = [RoleChoices.RH_SIMPLE, RoleChoices.RH_AGENT, RoleChoices.GRH]
            return any(r in allowed for r in hr_roles)

        return False


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


class IsGRH(permissions.BasePermission):
    """DRH (new schema) or GRH (old schema)."""

    def has_permission(self, request, view):
        user = getattr(request, 'user', None)
        if user is None or not user.is_authenticated:
            return False
        return is_drh(user)


class IsChef(HasRole):
    allowed_roles = [RoleChoices.CHEF]


class IsServiceManager(HasRole):
    allowed_roles = [RoleChoices.CHEF, RoleChoices.GRH]


class IsEmployee(HasRole):
    allowed_roles = [RoleChoices.EMPLOYEE]


class IsEmployeeOrChef(HasRole):
    allowed_roles = [RoleChoices.EMPLOYEE, RoleChoices.CHEF]


class CanUseAttendance(permissions.BasePermission):
    def has_permission(self, request, view):
        user = getattr(request, 'user', None)
        if user is None or not user.is_authenticated:
            return False
        return True


class IsRHSimple(permissions.BasePermission):
    """Any RH role (new) or old RH roles — for absences/warnings (RH_CONGE + DRH)."""

    def has_permission(self, request, view):
        user = getattr(request, 'user', None)
        if user is None or not user.is_authenticated:
            return False
        return is_conge_rh(user)


class IsRHSenior(permissions.BasePermission):
    """DRH or old GRH."""

    def has_permission(self, request, view):
        user = getattr(request, 'user', None)
        if user is None or not user.is_authenticated:
            return False
        return is_drh(user)


class IsRH(permissions.BasePermission):
    """Any RH role — new or old schema."""

    def has_permission(self, request, view):
        user = getattr(request, 'user', None)
        if user is None or not user.is_authenticated:
            return False
        return is_any_rh(user)


class CanIssueWarnings(permissions.BasePermission):
    """CHEF, or RH_CONGE/DRH in new schema, or old RH roles."""

    def has_permission(self, request, view):
        user = getattr(request, 'user', None)
        if user is None or not user.is_authenticated:
            return False
        if user.role == RoleChoices.CHEF:
            return True
        return is_conge_rh(user)


class CanUploadDocument(permissions.BasePermission):
    """RH service members and CHEFs can upload. Employees cannot."""

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.service == ServiceChoices.HR:
            return True
        return request.user.role in [
            RoleChoices.RH_SIMPLE,
            RoleChoices.RH_AGENT,
            RoleChoices.CHEF,
            RoleChoices.GRH,
        ]


class CanValidateDocument(permissions.BasePermission):
    """Only DRH (new) or GRH (old) can validate documents."""

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return is_drh(request.user)
