import logging

from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from ..models import Employee, Task, User
from ..permissions import IsServiceManager
from .helpers import notify

logger = logging.getLogger(__name__)


def _serialize_task(task, request=None):
    service_payload = (
        {
            "code": task.assigned_to.service.code,
            "nomService": task.assigned_to.service.nomService,
        }
        if task.assigned_to.service
        else None
    )
    return {
        "id": task.id,
        "title": task.title,
        "description": task.description,
        "status": task.status,
        "due_date": task.due_date,
        "created_at": task.created_at,
        "completed_at": task.completed_at,
        "requires_submission_file": task.requires_submission_file,
        "submission_note": task.submission_note,
        "submission_attachment": (
            request.build_absolute_uri(task.submission_attachment.url)
            if request and task.submission_attachment
            else None
        ),
        "submitted_at": task.submitted_at,
        "review_comment": task.review_comment,
        "reviewed_at": task.reviewed_at,
        "reviewed_by": {
            "id": task.reviewed_by.id,
            "email": task.reviewed_by.email,
            "first_name": task.reviewed_by.first_name,
            "last_name": task.reviewed_by.last_name,
        }
        if task.reviewed_by
        else None,
        "employee": {
            "id": task.assigned_to.id,
            "email": task.assigned_to.email,
            "first_name": task.assigned_to.first_name,
            "last_name": task.assigned_to.last_name,
            "service": service_payload,
            "department": {
                "code": service_payload["code"],
                "name": service_payload["nomService"],
            }
            if service_payload
            else None,
        },
        "assigned_by": {
            "id": task.assigned_by.id,
            "email": task.assigned_by.email,
            "first_name": task.assigned_by.first_name,
            "last_name": task.assigned_by.last_name,
        }
        if task.assigned_by
        else None,
        "can_submit": task.status in {Task.Status.TODO, Task.Status.REVISION},
        "can_review": task.status == Task.Status.SUBMITTED,
    }


@api_view(["POST"])
@permission_classes([IsAuthenticated, IsServiceManager])
def create_task(request):
    """Service manager assigns a task to an employee in the same service only."""
    data = request.data
    logger.info("create_task request from %s with data: %s", request.user.email, data)

    title = data.get("title")
    if not title:
        return Response(
            {"detail": "Le titre est obligatoire.", "title": ["Le titre est obligatoire."]},
            status=status.HTTP_400_BAD_REQUEST,
        )

    assigned_to_id = data.get("assigned_to")
    if not assigned_to_id:
        return Response(
            {
                "detail": "L'employe cible est obligatoire.",
                "assigned_to": ["L'employe cible est obligatoire."],
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        employee = Employee.objects.get(id=assigned_to_id)
    except Employee.DoesNotExist:
        return Response({"detail": "Employe introuvable."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        chef_emp = Employee.objects.get(email=request.user.email)
    except Employee.DoesNotExist:
        return Response({"detail": "Aucune fiche employe n'est liee a ce responsable."}, status=status.HTTP_400_BAD_REQUEST)

    if employee.service_id != chef_emp.service_id:
        return Response(
            {"detail": "Vous ne pouvez affecter une tache qu'aux employes de votre service."},
            status=status.HTTP_403_FORBIDDEN,
        )

    task = Task.objects.create(
        title=title,
        description=data.get("description", ""),
        due_date=data.get("due_date") or None,
        requires_submission_file=str(data.get("requires_submission_file", "")).lower() in {"true", "1", "yes", "on"},
        assigned_to=employee,
        assigned_by=request.user,
    )

    assigned_user = User.objects.filter(email=employee.email).first()
    if assigned_user:
        chef_name = f"{request.user.first_name} {request.user.last_name}".strip() or request.user.email
        notify(
            assigned_user,
            title="Nouvelle tache assignee",
            message=f"{chef_name} vous a assigne la tache : {title}",
            link="/tasks",
        )

    return Response({"id": task.id}, status=status.HTTP_201_CREATED)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def my_tasks(request):
    """Employee view of their tasks."""
    employee = Employee.objects.filter(email=request.user.email).first()
    if not employee:
        return Response([], status=status.HTTP_200_OK)

    tasks = (
        Task.objects.filter(assigned_to=employee)
        .select_related("assigned_to__service", "assigned_by", "reviewed_by")
        .order_by("-created_at")
    )
    return Response([_serialize_task(task, request=request) for task in tasks])


@api_view(["GET"])
@permission_classes([IsAuthenticated, IsServiceManager])
def chef_tasks(request):
    """Service manager view of all tasks assigned by this manager."""
    tasks = (
        Task.objects.filter(assigned_by=request.user)
        .select_related("assigned_to__service", "assigned_by", "reviewed_by")
        .order_by("-created_at")
    )
    return Response([_serialize_task(task, request=request) for task in tasks])


@api_view(["PATCH"])
@permission_classes([IsAuthenticated, IsServiceManager])
def update_chef_task(request, pk):
    """Service manager updates a task he created."""
    try:
        task = Task.objects.select_related("assigned_to__service", "assigned_by").get(id=pk)
    except Task.DoesNotExist:
        return Response({"detail": "Tache introuvable."}, status=status.HTTP_404_NOT_FOUND)

    if task.assigned_by_id != request.user.id:
        return Response({"detail": "Vous ne pouvez modifier que vos propres taches."}, status=status.HTTP_403_FORBIDDEN)

    if task.status == Task.Status.DONE:
        return Response({"detail": "Une tache terminee ne peut plus etre modifiee."}, status=status.HTTP_400_BAD_REQUEST)

    data = request.data

    if "title" in data:
        title = (data.get("title") or "").strip()
        if not title:
            return Response({"detail": "Le titre est obligatoire."}, status=status.HTTP_400_BAD_REQUEST)
        task.title = title

    if "description" in data:
        task.description = (data.get("description") or "").strip()

    if "due_date" in data:
        task.due_date = data.get("due_date") or None

    if "requires_submission_file" in data:
        task.requires_submission_file = str(data.get("requires_submission_file", "")).lower() in {
            "true",
            "1",
            "yes",
            "on",
        }

    if "assigned_to" in data:
        assigned_to_id = data.get("assigned_to")
        if not assigned_to_id:
            return Response({"detail": "L'employe cible est obligatoire."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            employee = Employee.objects.get(id=assigned_to_id)
        except Employee.DoesNotExist:
            return Response({"detail": "Employe introuvable."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            chef_emp = Employee.objects.get(email=request.user.email)
        except Employee.DoesNotExist:
            return Response({"detail": "Aucune fiche employe n'est liee a ce responsable."}, status=status.HTTP_400_BAD_REQUEST)

        if employee.service_id != chef_emp.service_id:
            return Response(
                {"detail": "Vous ne pouvez affecter une tache qu'aux employes de votre service."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if task.assigned_to_id != employee.id:
            if task.submission_attachment:
                task.submission_attachment.delete(save=False)
            task.assigned_to = employee
            task.status = Task.Status.TODO
            task.submission_note = ""
            task.submission_attachment = None
            task.submitted_at = None
            task.review_comment = ""
            task.reviewed_by = None
            task.reviewed_at = None
            task.completed_at = None

    task.save()
    return Response(_serialize_task(task, request=request))


@api_view(["DELETE"])
@permission_classes([IsAuthenticated, IsServiceManager])
def delete_chef_task(request, pk):
    """Service manager deletes a task he created, as long as it is not already completed."""
    try:
        task = Task.objects.get(id=pk)
    except Task.DoesNotExist:
        return Response({"detail": "Tache introuvable."}, status=status.HTTP_404_NOT_FOUND)

    if task.assigned_by_id != request.user.id:
        return Response({"detail": "Vous ne pouvez supprimer que vos propres taches."}, status=status.HTTP_403_FORBIDDEN)

    if task.status == Task.Status.DONE:
        return Response({"detail": "Une tache terminee ne peut pas etre supprimee."}, status=status.HTTP_400_BAD_REQUEST)

    if task.submission_attachment:
        task.submission_attachment.delete(save=False)

    task.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def submit_task_work(request, pk):
    """Employee submits work back to the chef for review."""
    try:
        task = Task.objects.select_related("assigned_to", "assigned_by").get(id=pk)
    except Task.DoesNotExist:
        return Response({"detail": "Tache introuvable."}, status=status.HTTP_404_NOT_FOUND)

    if task.assigned_to.email != request.user.email:
        return Response({"detail": "Vous n'avez pas le droit de remettre ce travail."}, status=status.HTTP_403_FORBIDDEN)

    if task.status == Task.Status.DONE:
        return Response({"detail": "Cette tache est deja terminee."}, status=status.HTTP_400_BAD_REQUEST)

    submission_note = (
        request.data.get("submission_note")
        or request.data.get("note")
        or ""
    ).strip()
    submission_attachment = (
        request.FILES.get("submission_attachment")
        or request.FILES.get("attachment")
    )

    if task.requires_submission_file and not submission_attachment:
        return Response(
            {"detail": "Cette tache exige un fichier de remise."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    task.submission_note = submission_note
    if submission_attachment:
        task.submission_attachment = submission_attachment
    task.submitted_at = timezone.now()
    task.review_comment = ""
    task.reviewed_by = None
    task.reviewed_at = None
    task.status = Task.Status.SUBMITTED
    task.save()

    if task.assigned_by:
        employee_name = f"{task.assigned_to.first_name} {task.assigned_to.last_name}".strip() or task.assigned_to.email
        notify(
            task.assigned_by,
            title="Travail remis",
            message=f"{employee_name} a remis le travail pour la tache : {task.title}",
            link="/chef/tasks",
        )

    return Response(
        {
            "id": task.id,
            "status": task.status,
            "detail": "Travail remis avec succes.",
        }
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated, IsServiceManager])
def review_task_submission(request, pk):
    """Service manager approves or requests revision for a submitted task."""
    try:
        task = Task.objects.select_related("assigned_to", "assigned_by").get(id=pk)
    except Task.DoesNotExist:
        return Response({"detail": "Tache introuvable."}, status=status.HTTP_404_NOT_FOUND)

    if task.assigned_by_id != request.user.id:
        return Response({"detail": "Vous n'avez pas le droit de relire cette tache."}, status=status.HTTP_403_FORBIDDEN)

    if task.status != Task.Status.SUBMITTED:
        return Response({"detail": "Cette tache n'attend pas encore une revue du chef."}, status=status.HTTP_400_BAD_REQUEST)

    action = (request.data.get("action") or "").strip().lower()
    review_comment = (request.data.get("review_comment") or "").strip()

    if action not in {"approve", "reject"}:
        return Response({"detail": "L'action doit etre approve ou reject."}, status=status.HTTP_400_BAD_REQUEST)

    task.review_comment = review_comment
    task.reviewed_by = request.user
    task.reviewed_at = timezone.now()

    employee_user = User.objects.filter(email=task.assigned_to.email).first()

    if action == "approve":
        task.status = Task.Status.DONE
        task.completed_at = timezone.now()
        task.save()

        if employee_user:
            notify(
                employee_user,
                title="Tache validee",
                message=f"Votre travail pour la tache '{task.title}' a ete valide par le chef.",
                link="/tasks",
            )

        return Response(
            {
                "id": task.id,
                "status": task.status,
                "detail": "Travail valide avec succes.",
            }
        )

    task.status = Task.Status.REVISION
    task.completed_at = None
    task.save()

    if employee_user:
        notify(
            employee_user,
            title="Correction demandee",
            message=f"Le chef demande une correction pour la tache '{task.title}'.",
            link="/tasks",
        )

    return Response(
        {
            "id": task.id,
            "status": task.status,
            "detail": "Demande de correction envoyee a l'employe.",
        }
    )


@api_view(["PATCH"])
@permission_classes([IsAuthenticated])
def mark_task_done(request, pk):
    """Legacy shortcut: assigned employee marks a task as done directly."""
    try:
        task = Task.objects.select_related("assigned_to", "assigned_by").get(id=pk)
    except Task.DoesNotExist:
        return Response({"detail": "Tache introuvable."}, status=status.HTTP_404_NOT_FOUND)

    if task.assigned_to.email != request.user.email:
        return Response({"detail": "Vous n'avez pas le droit de modifier cette tache."}, status=status.HTTP_403_FORBIDDEN)

    task.status = Task.Status.DONE
    task.completed_at = timezone.now()
    task.review_comment = ""
    task.reviewed_by = None
    task.reviewed_at = None
    task.save()

    if task.assigned_by:
        employee = task.assigned_to
        notify(
            task.assigned_by,
            title="Tache terminee",
            message=f"{employee.first_name} {employee.last_name} a marque la tache '{task.title}' comme terminee",
            link="/chef/tasks",
        )

    return Response({"ok": True})
