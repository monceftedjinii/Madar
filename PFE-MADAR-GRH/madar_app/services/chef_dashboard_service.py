from datetime import date, timedelta

from django.utils import timezone

from madar_app.models import Attendance, Employee, Evaluation, LeaveRequest, Notification, Task, User


class ChefDashboardService:
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

    def __init__(self, user, request=None, month=None):
        self.user = user
        self.request = request
        selected_date = self._parse_month(month) if month else timezone.localdate()
        self.period_start = selected_date.replace(day=1)
        self.period_end = self._get_month_end(self.period_start)
        self.today = min(timezone.localdate(), self.period_end)
        self.chef_employee = (
            Employee.objects.select_related("service", "position").filter(email=user.email).first()
        )

    def build(self):
        if not self.chef_employee:
            raise ValueError("chef employee record not found")

        # All employees in service (excluding chef) shown in team list
        team_members = list(
            Employee.objects.select_related("position", "service")
            .filter(service=self.chef_employee.service, is_active=True)
            .exclude(email=self.user.email)
            .order_by("first_name", "last_name")
        )
        # Team size excluding the chef himself
        total_service_size = Employee.objects.filter(service=self.chef_employee.service, is_active=True).exclude(email=self.user.email).count()
        team_emails = [employee.email for employee in team_members]
        team_users = {
            item.email: item
            for item in User.objects.filter(email__in=team_emails)
        }

        tasks_qs = (
            Task.objects.filter(
                assigned_by=self.user,
                created_at__date__gte=self.period_start,
                created_at__date__lte=self.today,
            )
            .select_related("assigned_to__service", "assigned_by", "reviewed_by")
            .order_by("-created_at")
        )
        leaves_qs = (
            LeaveRequest.objects.filter(
                employee__service=self.chef_employee.service,
                created_at__date__gte=self.period_start,
                created_at__date__lte=self.today,
            )
            .select_related("employee", "type")
            .order_by("-created_at")
        )
        leaves = list(leaves_qs)
        notifications_qs = Notification.objects.filter(user=self.user).order_by("-created_at")[:10]
        notifications = list(notifications_qs)

        # Include all service employees (including chef) for attendance tracking
        all_service_employees = list(
            Employee.objects.filter(service=self.chef_employee.service, is_active=True)
        )
        today_attendance = Attendance.objects.filter(
            employee__in=all_service_employees,
            date=self.today,
        ).select_related("employee")

        attendance_by_employee = {item.employee_id: item for item in today_attendance}
        online_count = sum(1 for member in team_members if self._is_user_online(team_users.get(member.email)))
        checked_in_count = sum(1 for item in attendance_by_employee.values() if item.check_in_time)
        completed_attendance_count = sum(
            1 for item in attendance_by_employee.values() if item.check_in_time and item.check_out_time
        )

        tasks = list(tasks_qs)
        submitted_count = sum(1 for t in tasks if t.status == Task.Status.SUBMITTED)
        revision_count = sum(1 for t in tasks if t.status == Task.Status.REVISION)
        done_count = sum(1 for t in tasks if t.status == Task.Status.DONE)
        late_count = sum(1 for t in tasks if t.status != Task.Status.DONE and t.due_date and t.due_date < self.today)

        task_dicts = []
        for task in tasks:
            status_label = self._task_status_label(task)
            employee_name = f"{task.assigned_to.first_name} {task.assigned_to.last_name}".strip() or task.assigned_to.email
            task_dicts.append(
                {
                    "id": task.id,
                    "name": task.title,
                    "employee": employee_name,
                    "status": status_label,
                    "deadline": task.due_date.isoformat() if task.due_date else "-",
                    "submissionNote": task.submission_note,
                    "reviewComment": task.review_comment,
                    "submittedAt": task.submitted_at.isoformat() if task.submitted_at else None,
                }
            )

        pending_leaves_count = sum(1 for l in leaves if l.status == LeaveRequest.Status.PENDING)

        # Monthly metrics
        # Team attendance rate for the selected month
        month_att = Attendance.objects.filter(
            employee__in=all_service_employees,
            date__gte=self.period_start,
            date__lte=self.today,
        )
        month_att_total = month_att.count()
        month_att_complete = month_att.filter(check_in_time__isnull=False, check_out_time__isnull=False).count()
        team_attendance_rate = round((month_att_complete / month_att_total) * 100) if month_att_total else 0

        # Evaluations done this month by this chef
        evals_done = Evaluation.objects.filter(
            evaluator=self.user,
            evaluation_date__gte=self.period_start,
            evaluation_date__lte=self.today,
        ).count()

        # Approved leaves this month
        approved_leaves_count = sum(1 for l in leaves if l.status == LeaveRequest.Status.ACCEPTED)

        return {
            "header": {
                "department": self.chef_employee.service.nomService if self.chef_employee.service else "Non renseigne",
                "monthLabel": self._format_month_label(self.period_start),
                "monthValue": self.period_start.strftime("%Y-%m"),
            },
            "profile": {
                "fullName": f"{self.user.first_name or self.chef_employee.first_name} {self.user.last_name or self.chef_employee.last_name}".strip()
                or self.user.email,
                "role": self.chef_employee.role or "Chef de service",
                "department": self.chef_employee.service.nomService if self.chef_employee.service else "Non renseigne",
                "email": self.user.email,
                "avatar": (
                    self.request.build_absolute_uri(self.user.profile_picture.url)
                    if self.request and getattr(self.user, "profile_picture", None)
                    else ""
                ),
                "teamSize": total_service_size,
                "onlineCount": online_count,
                "checkedInCount": checked_in_count,
                "submittedCount": submitted_count,
                "revisionCount": revision_count,
                "pendingLeaves": pending_leaves_count,
            },
            "stats": [
                {"id": "tasks", "label": "Taches assignees", "value": len(task_dicts), "helper": "Sur le mois selectionne"},
                {"id": "completed", "label": "Taches terminees", "value": done_count, "helper": "Validees ce mois"},
                {"id": "late", "label": "Taches en retard", "value": late_count, "helper": "Delais depasses"},
                {"id": "attendance", "label": "Presence equipe", "value": f"{team_attendance_rate}%", "helper": "Taux moyen ce mois"},
                {"id": "evaluations", "label": "Evaluations effectuees", "value": evals_done, "helper": "Evaluations soumises ce mois"},
                {"id": "leaves_approved", "label": "Conges accordes", "value": approved_leaves_count, "helper": "Approuves ce mois"},
            ],
            "charts": {
                "attendance": [
                    checked_in_count,
                    max(total_service_size - checked_in_count, 0),
                    completed_attendance_count,
                ],
                "tasks": {
                    "todo": max(len(task_dicts) - done_count - submitted_count - revision_count, 0),
                    "submitted": submitted_count,
                    "revision": revision_count,
                    "done": done_count,
                },
            },
            "team": [
                {
                    "id": member.id,
                    "fullName": f"{member.first_name} {member.last_name}".strip() or member.email,
                    "employee_role": member.role or "-",
                    "email": member.email,
                    "isOnline": self._is_user_online(team_users.get(member.email)),
                    "checkedInToday": bool(attendance_by_employee.get(member.id) and attendance_by_employee[member.id].check_in_time),
                    "checkedOutToday": bool(attendance_by_employee.get(member.id) and attendance_by_employee[member.id].check_out_time),
                    "checkInTime": (
                        attendance_by_employee[member.id].check_in_time.strftime("%H:%M")
                        if attendance_by_employee.get(member.id) and attendance_by_employee[member.id].check_in_time
                        else None
                    ),
                    "checkOutTime": (
                        attendance_by_employee[member.id].check_out_time.strftime("%H:%M")
                        if attendance_by_employee.get(member.id) and attendance_by_employee[member.id].check_out_time
                        else None
                    ),
                }
                for member in team_members
            ],
            "tasks": task_dicts[:8],
            "leaves": [
                {
                    "id": leave.id,
                    "employee": f"{leave.employee.first_name} {leave.employee.last_name}".strip() or leave.employee.email,
                    "type": leave.type.libelle if leave.type else leave.type_id,
                    "status": leave.status,
                    "startDate": leave.start_date.isoformat(),
                    "endDate": leave.end_date.isoformat(),
                }
                for leave in leaves[:6]
            ],
            "notifications": [
                {
                    "id": item.id,
                    "title": item.title,
                    "message": item.message,
                    "isRead": item.is_read,
                    "createdAt": item.created_at.isoformat(),
                }
                for item in notifications[:5]
            ],
        }

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

    def _task_status_label(self, task):
        if task.status == Task.Status.DONE:
            return "Terminee"
        if task.status == Task.Status.SUBMITTED:
            return "Travail remis"
        if task.status == Task.Status.REVISION:
            return "Correction demandee"
        if task.due_date and task.due_date < self.today:
            return "En retard"
        return "En cours"

    def _is_user_online(self, user):
        if not user or not user.last_seen:
            return False
        return (timezone.now() - user.last_seen).total_seconds() <= 300
