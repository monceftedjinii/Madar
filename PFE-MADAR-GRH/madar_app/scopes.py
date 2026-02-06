from .models import Employee, RoleChoices


def employee_queryset_for(user):
    """Return an Employee queryset scoped for the given user.

    - GRH, RH_SENIOR, RH_SIMPLE: all employees
    - CHEF: employees in the same department as the chef (chef must have an Employee record)
    - EMPLOYEE: only his own Employee record (matched by email)
    """
    if user is None or not getattr(user, 'is_authenticated', False):
        return Employee.objects.none()

    role = getattr(user, 'role', None)
    if role in (RoleChoices.GRH, RoleChoices.RH_SENIOR, RoleChoices.RH_SIMPLE):
        return Employee.objects.all()

    if role == RoleChoices.CHEF:
        try:
            chef_emp = Employee.objects.get(email=user.email)
        except Employee.DoesNotExist:
            return Employee.objects.none()
        return Employee.objects.filter(department=chef_emp.department)

    if role == RoleChoices.EMPLOYEE:
        return Employee.objects.filter(email=user.email)

    return Employee.objects.none()
