from datetime import date, timedelta

from django.db.models import Count
from django.utils import timezone

from madar_app.models import (
    AbsenceWarning,
    Document,
    DocumentValidation,
    Employee,
    Evaluation,
    FormationRequest,
    LeaveRequest,
    Notification,
    RoleChoices,
    User,
)


class RhDashboardService:
    MONTH_NAMES = {
        1: "Janvier",
        2: "Fevrier",
        3: "Mars",
        4: "Avril",
        5: "Mai",
        6: "Juin",
        7: "Juillet",
        8: "Aout",
        9: "Septembre",
        10: "Octobre",
        11: "Novembre",
        12: "Decembre",
    }

    RH_ROLES = {
        RoleChoices.RH_SIMPLE,
        RoleChoices.RH_AGENT,
        RoleChoices.RH_SENIOR,
        RoleChoices.GRH,
    }

    ROLE_LABELS = {
        RoleChoices.RH_SIMPLE: "RH",
        RoleChoices.RH_AGENT: "Agent RH",
        RoleChoices.RH_SENIOR: "RH Senior",
        RoleChoices.GRH: "GRH",
    }

    def __init__(self, user, request=None, month=None):
        self.user = user
        self.request = request
        selected_date = self._parse_month(month) if month else timezone.localdate()
        self.period_start = selected_date.replace(day=1)
        self.period_end = self._get_month_end(self.period_start)
        self.today = min(timezone.localdate(), self.period_end)
        self.employee = Employee.objects.select_related("service", "position").filter(email=user.email).first()

    def build(self):
        if self.user.role not in self.RH_ROLES:
            raise ValueError("role RH requis")

        employees_qs = Employee.objects.select_related("service", "position").order_by("first_name", "last_name")
        employees = list(employees_qs)
        users_by_email = {item.email: item for item in User.objects.filter(email__in=[emp.email for emp in employees])}

        pending_leaves_qs = self._pending_leaves_queryset()
        visible_documents_qs = self._visible_documents_queryset()
        documents_to_validate_qs = self._documents_to_validate_queryset()
        formation_requests_qs = self._formation_requests_queryset()
        evaluations_qs = (
            Evaluation.objects.select_related("employee__service", "employee__position", "evaluator")
            .prefetch_related("scores__criterion")
            .filter(evaluation_date__gte=self.period_start, evaluation_date__lte=self.today)
            .order_by("-evaluation_date", "-created_at")
        )
        warnings_qs = AbsenceWarning.objects.filter(date__gte=self.period_start, date__lte=self.today)
        notifications_qs = Notification.objects.filter(user=self.user).order_by("-created_at")

        online_count = sum(1 for employee in employees if self._is_user_online(users_by_email.get(employee.email)))

        service_distribution = list(
            Employee.objects.filter(service__isnull=False)
            .values("service__nomService")
            .annotate(total=Count("id"))
            .order_by("-total", "service__nomService")[:6]
        )
        leave_breakdown = {
            "pending": pending_leaves_qs.count(),
            "accepted": LeaveRequest.objects.filter(
                status=LeaveRequest.Status.ACCEPTED,
                created_at__date__gte=self.period_start,
                created_at__date__lte=self.today,
            ).count(),
            "refused": LeaveRequest.objects.filter(
                status=LeaveRequest.Status.REFUSED,
                created_at__date__gte=self.period_start,
                created_at__date__lte=self.today,
            ).count(),
        }

        recent_employees = sorted(
            [item for item in employees if item.hired_at],
            key=lambda employee: employee.hired_at,
            reverse=True,
        )[:6]

        return {
            "header": {
                "department": "Pilotage RH",
                "monthLabel": self._format_month_label(self.period_start),
                "monthValue": self.period_start.strftime("%Y-%m"),
            },
            "profile": {
                "fullName": self._full_name(),
                "role": self.ROLE_LABELS.get(self.user.role, self.user.role),
                "department": self.employee.service.nomService if self.employee and self.employee.service else "Direction RH",
                "email": self.user.email,
                "avatar": self._avatar_url(),
                "employeesCount": len(employees),
                "onlineCount": online_count,
                "pendingLeaves": pending_leaves_qs.count(),
                "documentsToValidate": documents_to_validate_qs.count(),
            },
            "stats": [
                {"id": "employees", "label": "Employes", "value": len(employees), "helper": "Effectif total visible"},
                {"id": "online", "label": "En ligne", "value": online_count, "helper": "Actifs maintenant"},
                {"id": "leaves", "label": "Conges a traiter", "value": pending_leaves_qs.count(), "helper": "Etape RH en attente"},
                {"id": "documents", "label": "Documents visibles", "value": visible_documents_qs.count(), "helper": "Dans le scope RH"},
                {"id": "validations", "label": "Docs a valider", "value": documents_to_validate_qs.count(), "helper": "Validation en cours"},
                {"id": "formations", "label": "Demandes formation", "value": formation_requests_qs.count(), "helper": "Cycle RH formation"},
                {"id": "evaluations", "label": "Evaluations", "value": evaluations_qs.count(), "helper": "Sur la periode"},
                {"id": "alerts", "label": "Alertes absences", "value": warnings_qs.count(), "helper": "A surveiller"},
            ],
            "charts": {
                "services": {
                    "labels": [item["service__nomService"] for item in service_distribution],
                    "values": [item["total"] for item in service_distribution],
                },
                "leaves": leave_breakdown,
            },
            "employees": [
                {
                    "id": item.id,
                    "fullName": f"{item.first_name} {item.last_name}".strip() or item.email,
                    "email": item.email,
                    "service": item.service.nomService if item.service else "-",
                    "position": item.position.name if item.position else "-",
                    "isOnline": self._is_user_online(users_by_email.get(item.email)),
                    "hiredAt": item.hired_at.isoformat() if item.hired_at else None,
                }
                for item in recent_employees
            ],
            "leaves": [
                {
                    "id": item.id,
                    "employee": f"{item.employee.first_name} {item.employee.last_name}".strip() or item.employee.email,
                    "type": item.type.libelle if item.type else item.type_id,
                    "status": item.status,
                    "startDate": item.start_date.isoformat(),
                    "endDate": item.end_date.isoformat(),
                }
                for item in pending_leaves_qs[:6]
            ],
            "documents": [
                {
                    "id": item.id,
                    "title": item.title,
                    "status": item.status,
                    "sourceService": item.source_service.nomService if item.source_service else "-",
                    "targetService": item.target_service.nomService if item.target_service else "-",
                    "createdAt": item.created_at.isoformat() if item.created_at else None,
                }
                for item in visible_documents_qs[:6]
            ],
            "formations": [
                {
                    "id": item.id,
                    "name": item.nom,
                    "status": item.status,
                    "requestedBy": item.requested_by.email,
                    "createdAt": item.created_at.isoformat(),
                }
                for item in formation_requests_qs[:6]
            ],
            "evaluations": [
                {
                    "id": item.id,
                    "employee": f"{item.employee.first_name} {item.employee.last_name}".strip() or item.employee.email,
                    "score": float(item.global_score),
                    "period": item.period,
                    "date": item.evaluation_date.isoformat(),
                }
                for item in evaluations_qs[:6]
            ],
            "notifications": [
                {
                    "id": item.id,
                    "title": item.title,
                    "message": item.message,
                    "isRead": item.is_read,
                    "createdAt": item.created_at.isoformat(),
                }
                for item in notifications_qs[:5]
            ],
        }

    def _pending_leaves_queryset(self):
        if self.user.role in {RoleChoices.RH_SIMPLE, RoleChoices.RH_AGENT, RoleChoices.RH_SENIOR}:
            expected_role = RoleChoices.RH_SIMPLE
        else:
            expected_role = RoleChoices.GRH

        return (
            LeaveRequest.objects.filter(
                status=LeaveRequest.Status.PENDING,
                validation_workflow__validator_role=expected_role,
            )
            .select_related("employee__service", "type")
            .prefetch_related("validation_workflow")
            .distinct()
            .order_by("-created_at")
        )

    def _visible_documents_queryset(self):
        queryset = Document.objects.select_related("source_service", "target_service", "doc_type").order_by("-created_at")
        if self.user.role == RoleChoices.RH_SIMPLE:
            return queryset.filter(created_by=self.user, doc_type__category="RH")
        if self.user.role in {RoleChoices.RH_AGENT, RoleChoices.RH_SENIOR, RoleChoices.GRH}:
            return queryset
        return queryset.none()

    def _documents_to_validate_queryset(self):
        return (
            Document.objects.filter(
                validations__is_active=True,
                validations__validator__email=self.user.email,
                status=Document.Status.SENT,
            )
            .select_related("source_service", "target_service", "doc_type")
            .distinct()
            .order_by("-created_at")
        )

    def _formation_requests_queryset(self):
        if self.user.role not in {RoleChoices.RH_AGENT, RoleChoices.GRH}:
            return FormationRequest.objects.none()
        return (
            FormationRequest.objects.select_related("requested_by", "approved_formation")
            .prefetch_related("participants__employee")
            .order_by("-created_at")
        )

    def _full_name(self):
        first_name = self.user.first_name or (self.employee.first_name if self.employee else "")
        last_name = self.user.last_name or (self.employee.last_name if self.employee else "")
        return f"{first_name} {last_name}".strip() or self.user.email

    def _avatar_url(self):
        if self.request and getattr(self.user, "profile_picture", None):
            return self.request.build_absolute_uri(self.user.profile_picture.url)
        if self.request and self.employee and self.employee.profile_picture:
            return self.request.build_absolute_uri(self.employee.profile_picture.url)
        return ""

    def _parse_month(self, month_value):
        try:
            return date.fromisoformat(f"{month_value}-01")
        except (TypeError, ValueError):
            return timezone.localdate()

    def _get_month_end(self, month_start):
        if month_start.month == 12:
            next_month = month_start.replace(year=month_start.year + 1, month=1, day=1)
        else:
            next_month = month_start.replace(month=month_start.month + 1, day=1)
        return next_month - timedelta(days=1)

    def _format_month_label(self, month_start):
        return f"{self.MONTH_NAMES.get(month_start.month, month_start.strftime('%m'))} {month_start.year}"

    def _is_user_online(self, user):
        if not user or not user.last_seen:
            return False
        return (timezone.now() - user.last_seen).total_seconds() <= 300
