from rest_framework import permissions
from .models import RoleChoices


class HasRole(permissions.BasePermission):
    """Reusable permission that checks whether the user's role is in allowed roles.

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

        return user.role in allowed


class IsGRH(HasRole):
    allowed_roles = [RoleChoices.GRH]


class IsChef(HasRole):
    allowed_roles = [RoleChoices.CHEF]


class IsEmployee(HasRole):
    allowed_roles = [RoleChoices.EMPLOYEE]


class IsRHSimple(HasRole):
    allowed_roles = [RoleChoices.RH_SIMPLE]


class IsRHSenior(HasRole):
    allowed_roles = [RoleChoices.RH_SENIOR]

class CanUploadDocument(permissions.BasePermission):
    """Only EMPLOYEE, RH_SIMPLE, RH_SENIOR, CHEF, GRH can upload documents."""

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.role in [
            RoleChoices.EMPLOYEE,
            RoleChoices.RH_SIMPLE,
            RoleChoices.RH_SENIOR,
            RoleChoices.CHEF,
            RoleChoices.GRH
        ]


class CanValidateDocument(permissions.BasePermission):
    """Only RH_SENIOR and GRH can validate documents."""

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.role in [RoleChoices.RH_SENIOR, RoleChoices.GRH]