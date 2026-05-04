from .models import Employee, RoleChoices


def service_scope_ids_for_employee(employee):
    """Return the manager service scope including descendant services."""
    if not employee or not employee.service_id:
        return []

    descendants = employee.service.get_all_descendants() if employee.service else []
    service_ids = [employee.service_id, *[service.code for service in descendants]]
    return list(dict.fromkeys(service_ids))


def employee_queryset_for(user):
    """Return an Employee queryset scoped for the given user.

    - GRH, RH_SIMPLE, RH_AGENT: all employees
    - CHEF: employees in the same service as the chef (chef must have an Employee record)
    - EMPLOYEE: only his own Employee record (matched by email)
    """
    if user is None or not getattr(user, 'is_authenticated', False):
        return Employee.objects.none()

    role = getattr(user, 'role', None)
    if role in (RoleChoices.GRH, RoleChoices.RH_SIMPLE, RoleChoices.RH_AGENT):
        return Employee.objects.all()

    if role == RoleChoices.CHEF:
        try:
            chef_emp = Employee.objects.get(email=user.email)
        except Employee.DoesNotExist:
            return Employee.objects.none()
        return Employee.objects.filter(
            service_id__in=service_scope_ids_for_employee(chef_emp)
        ).exclude(email=user.email)

    if role == RoleChoices.EMPLOYEE:
        return Employee.objects.filter(email=user.email)

    return Employee.objects.none()


def employee_team_queryset_for(user):
    """Return the team queryset for service managers.

    - CHEF, GRH: employees in the same service, excluding the manager
    - others: fallback to the regular scoped queryset
    """
    if user is None or not getattr(user, 'is_authenticated', False):
        return Employee.objects.none()

    role = getattr(user, 'role', None)
    if role in (RoleChoices.CHEF, RoleChoices.GRH):
        try:
            manager_emp = Employee.objects.get(email=user.email)
        except Employee.DoesNotExist:
            return Employee.objects.none()
        return Employee.objects.filter(
            service_id__in=service_scope_ids_for_employee(manager_emp)
        ).exclude(email=user.email)

    return employee_queryset_for(user)
