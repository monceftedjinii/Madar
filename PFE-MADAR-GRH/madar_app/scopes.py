from .models import Employee, RoleChoices


def employee_queryset_for(user):
    """Return an Employee queryset scoped for the given user.

    - GRH, RH_SENIOR, RH_SIMPLE, RH_AGENT: all employees
    - CHEF: employees in the same service as the chef (chef must have an Employee record)
    - EMPLOYEE: only his own Employee record (matched by email)
    """
    if user is None or not getattr(user, 'is_authenticated', False):
        return Employee.objects.none()

    role = getattr(user, 'role', None)
    if role in (RoleChoices.GRH, RoleChoices.RH_SENIOR, RoleChoices.RH_SIMPLE, RoleChoices.RH_AGENT):
        return Employee.objects.all()

    if role == RoleChoices.CHEF:
        try:
            chef_emp = Employee.objects.get(email=user.email)
        except Employee.DoesNotExist:
            return Employee.objects.none()
        return Employee.objects.filter(service=chef_emp.service).exclude(email=user.email)

    if role == RoleChoices.EMPLOYEE:
        return Employee.objects.filter(email=user.email)

    return Employee.objects.none()


def employee_team_queryset_for(user):
    """Return the team queryset for service managers.

    - CHEF, RH_SENIOR: employees in the same service, excluding the manager
    - others: fallback to the regular scoped queryset
    """
    if user is None or not getattr(user, 'is_authenticated', False):
        return Employee.objects.none()

    role = getattr(user, 'role', None)
    if role in (RoleChoices.CHEF, RoleChoices.RH_SENIOR):
        try:
            manager_emp = Employee.objects.get(email=user.email)
        except Employee.DoesNotExist:
            return Employee.objects.none()
        return Employee.objects.filter(service=manager_emp.service).exclude(email=user.email)

    return employee_queryset_for(user)
