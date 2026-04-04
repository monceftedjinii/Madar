from django.db import transaction
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from ..models import (
    Competency,
    DevelopmentPlan,
    Employee,
    EmployeeCompetency,
    EmployeeObjective,
    RoleChoices,
)
from ..permissions import IsRH
from .helpers import notify


def _serialize_competency(item):
    return {
        "id": item.id,
        "name": item.name,
        "category": item.get_category_display(),
        "description": item.description,
        "target_level": item.target_level,
        "is_active": item.is_active,
    }


def _serialize_employee_competency(item):
    return {
        "id": item.id,
        "employee_id": item.employee.id,
        "employee_name": f"{item.employee.first_name} {item.employee.last_name}".strip() or item.employee.email,
        "competency_id": item.competency.id,
        "competency_name": item.competency.name,
        "category": item.competency.get_category_display(),
        "current_level": item.current_level,
        "target_level": item.target_level,
        "gap": max(item.target_level - item.current_level, 0),
        "notes": item.notes,
        "assessed_at": item.assessed_at.isoformat() if item.assessed_at else None,
    }


def _serialize_objective(item):
    return {
        "id": item.id,
        "employee_id": item.employee.id,
        "employee_name": f"{item.employee.first_name} {item.employee.last_name}".strip() or item.employee.email,
        "title": item.title,
        "description": item.description,
        "due_date": item.due_date.isoformat() if item.due_date else None,
        "progress": item.progress,
        "status": item.status,
        "status_label": item.get_status_display(),
        "created_at": item.created_at.isoformat() if item.created_at else None,
    }


def _serialize_plan(item):
    return {
        "id": item.id,
        "employee_id": item.employee.id,
        "employee_name": f"{item.employee.first_name} {item.employee.last_name}".strip() or item.employee.email,
        "title": item.title,
        "actions": item.actions,
        "target_date": item.target_date.isoformat() if item.target_date else None,
        "status": item.status,
        "status_label": item.get_status_display(),
        "created_at": item.created_at.isoformat() if item.created_at else None,
    }


def _employee_for_user(user):
    return Employee.objects.select_related("service", "position").filter(email=user.email).first()


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def my_gpec(request):
    employee = _employee_for_user(request.user)
    if not employee:
        return Response(
            {
                "employee": None,
                "competencies": [],
                "objectives": [],
                "plans": [],
            }
        )

    competencies = (
        EmployeeCompetency.objects.select_related("employee", "competency")
        .filter(employee=employee, competency__is_active=True)
        .order_by("competency__name")
    )
    objectives = EmployeeObjective.objects.filter(employee=employee).order_by("status", "due_date", "-created_at")
    plans = DevelopmentPlan.objects.filter(employee=employee).order_by("status", "target_date", "-created_at")

    return Response(
        {
            "employee": {
                "id": employee.id,
                "full_name": f"{employee.first_name} {employee.last_name}".strip() or employee.email,
                "email": employee.email,
                "service": employee.service.nomService if employee.service else "",
                "position": employee.position.name if employee.position else "",
            },
            "competencies": [_serialize_employee_competency(item) for item in competencies],
            "objectives": [_serialize_objective(item) for item in objectives],
            "plans": [_serialize_plan(item) for item in plans],
        }
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated, IsRH])
def rh_gpec(request):
    employees = Employee.objects.select_related("service", "position").order_by("first_name", "last_name")
    competencies = Competency.objects.filter(is_active=True).order_by("name")
    employee_competencies = (
        EmployeeCompetency.objects.select_related("employee", "competency")
        .filter(competency__is_active=True)
        .order_by("employee__first_name", "competency__name")
    )
    objectives = EmployeeObjective.objects.select_related("employee").order_by("status", "due_date", "-created_at")
    plans = DevelopmentPlan.objects.select_related("employee").order_by("status", "target_date", "-created_at")

    return Response(
        {
            "employees": [
                {
                    "id": item.id,
                    "full_name": f"{item.first_name} {item.last_name}".strip() or item.email,
                    "email": item.email,
                    "service": item.service.nomService if item.service else "",
                    "position": item.position.name if item.position else "",
                }
                for item in employees
            ],
            "catalog": [_serialize_competency(item) for item in competencies],
            "employee_competencies": [_serialize_employee_competency(item) for item in employee_competencies],
            "objectives": [_serialize_objective(item) for item in objectives],
            "plans": [_serialize_plan(item) for item in plans],
        }
    )


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def gpec_competencies(request):
    if request.method == "GET":
        competencies = Competency.objects.filter(is_active=True).order_by("name")
        return Response([_serialize_competency(item) for item in competencies])

    if request.user.role not in {RoleChoices.RH_SIMPLE, RoleChoices.RH_AGENT, RoleChoices.RH_SENIOR, RoleChoices.GRH}:
        return Response({"detail": "Acces RH requis."}, status=status.HTTP_403_FORBIDDEN)

    name = (request.data.get("name") or "").strip()
    category = (request.data.get("category") or Competency.Category.TECHNICAL).strip()
    description = (request.data.get("description") or "").strip()
    target_level = int(request.data.get("target_level") or 3)

    if not name:
        return Response({"detail": "Le nom de la competence est obligatoire."}, status=status.HTTP_400_BAD_REQUEST)

    competency, created = Competency.objects.get_or_create(
        name=name,
        defaults={
            "category": category,
            "description": description,
            "target_level": target_level,
            "is_active": True,
        },
    )

    if not created:
        competency.category = category
        competency.description = description
        competency.target_level = target_level
        competency.is_active = True
        competency.save(update_fields=["category", "description", "target_level", "is_active"])

    return Response(_serialize_competency(competency), status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


@api_view(["POST"])
@permission_classes([IsAuthenticated, IsRH])
def upsert_employee_competency(request):
    employee_id = request.data.get("employee_id")
    competency_id = request.data.get("competency_id")
    current_level = int(request.data.get("current_level") or 0)
    target_level = int(request.data.get("target_level") or 3)
    notes = (request.data.get("notes") or "").strip()

    if not employee_id or not competency_id:
        return Response({"detail": "employee_id et competency_id sont obligatoires."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        employee = Employee.objects.get(id=employee_id)
        competency = Competency.objects.get(id=competency_id)
    except (Employee.DoesNotExist, Competency.DoesNotExist):
        return Response({"detail": "Employe ou competence introuvable."}, status=status.HTTP_404_NOT_FOUND)

    link, _ = EmployeeCompetency.objects.update_or_create(
        employee=employee,
        competency=competency,
        defaults={
            "current_level": current_level,
            "target_level": target_level,
            "notes": notes,
            "assessed_at": timezone.localdate(),
            "updated_by": request.user,
        },
    )

    employee_user = None
    try:
        from ..models import User

        employee_user = User.objects.filter(email=employee.email).first()
    except Exception:
        employee_user = None

    if employee_user:
        notify(
            employee_user,
            title="Competence mise a jour",
            message=f"La competence {competency.name} a ete evaluee et mise a jour.",
            link="/gpec",
        )

    return Response(_serialize_employee_competency(link), status=status.HTTP_200_OK)


@api_view(["POST"])
@permission_classes([IsAuthenticated, IsRH])
def create_objective(request):
    employee_id = request.data.get("employee_id")
    title = (request.data.get("title") or "").strip()
    description = (request.data.get("description") or "").strip()
    due_date = request.data.get("due_date") or None

    if not employee_id or not title:
        return Response({"detail": "employee_id et title sont obligatoires."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        employee = Employee.objects.get(id=employee_id)
    except Employee.DoesNotExist:
        return Response({"detail": "Employe introuvable."}, status=status.HTTP_404_NOT_FOUND)

    objective = EmployeeObjective.objects.create(
        employee=employee,
        title=title,
        description=description,
        due_date=due_date,
        created_by=request.user,
    )

    employee_user = None
    try:
        from ..models import User

        employee_user = User.objects.filter(email=employee.email).first()
    except Exception:
        employee_user = None

    if employee_user:
        notify(
            employee_user,
            title="Nouvel objectif",
            message=f"Un nouvel objectif vous a ete assigne : {title}.",
            link="/gpec",
        )

    return Response(_serialize_objective(objective), status=status.HTTP_201_CREATED)


@api_view(["PATCH"])
@permission_classes([IsAuthenticated])
def update_objective_progress(request, pk):
    try:
        objective = EmployeeObjective.objects.select_related("employee").get(id=pk)
    except EmployeeObjective.DoesNotExist:
        return Response({"detail": "Objectif introuvable."}, status=status.HTTP_404_NOT_FOUND)

    employee = _employee_for_user(request.user)
    is_owner = employee and objective.employee_id == employee.id
    is_rh = request.user.role in {RoleChoices.RH_SIMPLE, RoleChoices.RH_AGENT, RoleChoices.RH_SENIOR, RoleChoices.GRH}
    if not (is_owner or is_rh):
        return Response({"detail": "Acces non autorise."}, status=status.HTTP_403_FORBIDDEN)

    progress = request.data.get("progress")
    status_value = request.data.get("status")
    description = request.data.get("description")

    update_fields = []
    if progress is not None:
        objective.progress = max(0, min(int(progress), 100))
        update_fields.append("progress")
    if status_value:
        objective.status = status_value
        update_fields.append("status")
    if description is not None and is_rh:
        objective.description = description
        update_fields.append("description")

    if objective.progress >= 100 and objective.status != EmployeeObjective.Status.DONE:
        objective.status = EmployeeObjective.Status.DONE
        update_fields.append("status")

    if not update_fields:
        return Response({"detail": "Aucune mise a jour a appliquer."}, status=status.HTTP_400_BAD_REQUEST)

    objective.save(update_fields=list(dict.fromkeys(update_fields + ["updated_at"])))
    return Response(_serialize_objective(objective))


@api_view(["POST"])
@permission_classes([IsAuthenticated, IsRH])
def create_development_plan(request):
    employee_id = request.data.get("employee_id")
    title = (request.data.get("title") or "").strip()
    actions = (request.data.get("actions") or "").strip()
    target_date = request.data.get("target_date") or None

    if not employee_id or not title or not actions:
        return Response({"detail": "employee_id, title et actions sont obligatoires."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        employee = Employee.objects.get(id=employee_id)
    except Employee.DoesNotExist:
        return Response({"detail": "Employe introuvable."}, status=status.HTTP_404_NOT_FOUND)

    plan = DevelopmentPlan.objects.create(
        employee=employee,
        title=title,
        actions=actions,
        target_date=target_date,
        created_by=request.user,
    )

    employee_user = None
    try:
        from ..models import User

        employee_user = User.objects.filter(email=employee.email).first()
    except Exception:
        employee_user = None

    if employee_user:
        notify(
            employee_user,
            title="Plan de developpement",
            message=f"Un nouveau plan de developpement a ete ajoute : {title}.",
            link="/gpec",
        )

    return Response(_serialize_plan(plan), status=status.HTTP_201_CREATED)
