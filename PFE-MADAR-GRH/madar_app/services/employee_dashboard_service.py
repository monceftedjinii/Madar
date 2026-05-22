from datetime import date, timedelta

from django.db.models import Q
from django.utils import timezone

from madar_app.models import (
    Announcement,
    Attendance,
    Employee,
    Evaluation,
    LeaveRequest,
    Message,
    Notification,
    Task,
)


class EmployeeDashboardService:
    """Build the employee dashboard payload from backend business data."""

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
        real_today = timezone.localdate()
        self.today = min(real_today, self.period_end)
        self.month_start = self.period_start
        self.employee = (
            Employee.objects.select_related("service", "position")
            .filter(email=user.email)
            .first()
        )

    def build(self):
        if not self.employee:
            raise ValueError("employee record not found")

        task_rows, completed_count, pending_count, late_count = self._build_tasks()
        attendance_rate, att_present, att_expected = self._compute_attendance_rate()
        overall_progress = (
            round((completed_count / len(task_rows)) * 100) if task_rows else 0
        )
        unread_notifications = self.notifications_qs.filter(is_read=False).count()
        final_score = self._compute_final_score(
            attendance_rate,
            overall_progress,
            late_count,
            unread_notifications,
        )

        latest_eval = self._get_latest_evaluation()

        return {
            "profile": self._build_profile(attendance_rate, overall_progress, final_score),
            "latestEvaluation": latest_eval,
            "header": {
                "department": self.employee.service.nomService
                if self.employee.service
                else "Non renseigne",
                "monthLabel": self._format_month_label(self.period_start),
                "monthValue": self.period_start.strftime("%Y-%m"),
            },
            "stats": self._build_stats(
                task_rows,
                completed_count,
                pending_count,
                late_count,
                attendance_rate,
                final_score,
                att_present,
                att_expected,
            ),
            "charts": self._build_charts(
                task_rows,
                completed_count,
                pending_count,
                late_count,
                attendance_rate,
                overall_progress,
            ),
            "scoreInsights": self._build_score_insights(attendance_rate, late_count),
            "tasks": task_rows,
            "panels": self._build_panels(task_rows),
            "generatedAt": timezone.now().isoformat(),
        }

    @property
    def tasks_qs(self):
        return Task.objects.filter(
            assigned_to=self.employee,
            created_at__date__gte=self.period_start,
            created_at__date__lte=self.today,
        ).order_by("-created_at")

    @property
    def attendance_qs(self):
        return Attendance.objects.filter(
            employee=self.employee,
            date__gte=self.month_start,
            date__lte=self.today,
        ).order_by("date")

    @property
    def leaves_qs(self):
        return (
            LeaveRequest.objects.filter(
                employee=self.employee,
                start_date__lte=self.today,
                end_date__gte=self.period_start,
            )
            .select_related("type")
            .order_by("-created_at")
        )

    @property
    def notifications_qs(self):
        return Notification.objects.filter(
            user=self.user,
            created_at__date__gte=self.period_start,
            created_at__date__lte=self.today,
        ).order_by("-created_at")

    @property
    def inbox_qs(self):
        return (
            Message.objects.filter(
                recipient=self.user,
                is_deleted_by_recipient=False,
                created_at__date__gte=self.period_start,
                created_at__date__lte=self.today,
            )
            .select_related("sender", "recipient")
            .order_by("-created_at")
        )

    @property
    def announcements_qs(self):
        qs = Announcement.objects.select_related("creator", "target_service").order_by(
            "-created_at"
        )
        if self.employee.service:
            return qs.filter(
                Q(scope="GLOBAL")
                | Q(scope="SERVICE", target_service=self.employee.service),
                created_at__date__gte=self.period_start,
                created_at__date__lte=self.today,
            )
        return qs.filter(
            scope="GLOBAL",
            created_at__date__gte=self.period_start,
            created_at__date__lte=self.today,
        )

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
        month_name = self.MONTH_NAMES.get(month_start.month, month_start.strftime("%m"))
        return f"{month_name} {month_start.year}"

    def _build_profile(self, attendance_rate, overall_progress, final_score):
        request_user_picture = (
            self.request.build_absolute_uri(self.user.profile_picture.url)
            if self.request and getattr(self.user, "profile_picture", None)
            else None
        )
        employee_picture = (
            self.request.build_absolute_uri(self.employee.profile_picture.url)
            if self.request and self.employee.profile_picture
            else None
        )
        full_name = (
            f"{self.user.first_name or self.employee.first_name} "
            f"{self.user.last_name or self.employee.last_name}"
        ).strip() or self.user.email

        return {
            "fullName": full_name,
            "role": self.employee.position.name if self.employee.position else "Employe",
            "department": self.employee.service.nomService
            if self.employee.service
            else "Non renseigne",
            "email": self.user.email,
            "avatar": request_user_picture or employee_picture or "",
            "attendanceRate": attendance_rate,
            "overallProgress": overall_progress,
            "finalScore": final_score,
            "topSkill": self._get_top_skill(attendance_rate, overall_progress),
            "statusLabel": self._get_evaluation_label(),
        }

    def _build_tasks(self):
        task_rows = []
        completed_count = 0
        pending_count = 0
        late_count = 0

        for task in self.tasks_qs:
            due_date = task.due_date
            if task.status == Task.Status.DONE:
                status_label = "Terminée"
                progress = 100
                completed_count += 1
            elif due_date and due_date < self.today:
                status_label = "En retard"
                progress = 80
                late_count += 1
            elif due_date and (due_date - self.today).days <= 2:
                status_label = "En cours"
                progress = 65
                pending_count += 1
            else:
                status_label = "En attente"
                progress = 35 if due_date else 20
                pending_count += 1

            task_rows.append(
                {
                    "id": task.id,
                    "name": task.title,
                    "priority": self._get_task_priority(due_date),
                    "deadline": due_date.isoformat() if due_date else "-",
                    "status": status_label,
                    "progress": progress,
                }
            )

        return task_rows, completed_count, pending_count, late_count

    def _compute_attendance_rate(self):
        expected_days = self._get_expected_attendance_days()
        if not expected_days:
            return 0, 0, 0
        attendance_complete = self.attendance_qs.filter(
            date__in=expected_days,
            check_in_time__isnull=False,
            check_out_time__isnull=False,
        ).count()
        rate = round((attendance_complete / len(expected_days)) * 100)
        return rate, attendance_complete, len(expected_days)

    def _compute_final_score(
        self,
        attendance_rate,
        overall_progress,
        late_count,
        unread_notifications,
    ):
        # Scale out of 10: base 4 + attendance contribution + task contribution - penalties
        raw_score = (
            4
            + attendance_rate * 0.025
            + overall_progress * 0.03
            - late_count * 0.35
            - unread_notifications * 0.07
        )
        return round(max(0, min(10, raw_score)), 1)

    def _build_stats(
        self,
        task_rows,
        completed_count,
        pending_count,
        late_count,
        attendance_rate,
        final_score,
        att_present=0,
        att_expected=0,
    ):
        weekly_perf_values, _, _ = self._build_weekly_performance(task_rows, attendance_rate)
        monthly_performance = (
            round(sum(weekly_perf_values) / len(weekly_perf_values))
            if weekly_perf_values
            else 0
        )
        return [
            {
                "id": "total",
                "label": "Total des tâches",
                "value": len(task_rows),
                "helper": "Toutes les tâches assignées",
            },
            {
                "id": "completed",
                "label": "Tâches terminées",
                "value": completed_count,
                "helper": "Tâches finalisées",
            },
            {
                "id": "pending",
                "label": "Tâches en attente",
                "value": pending_count,
                "helper": "En cours ou à démarrer",
            },
            {
                "id": "late",
                "label": "Tâches en retard",
                "value": late_count,
                "helper": "Délais dépassés",
            },
            {
                "id": "attendance",
                "label": "Taux de présence",
                "value": f"{attendance_rate}%",
                "helper": f"{self.MONTH_NAMES[self.period_start.month]} {self.period_start.year} · {att_present} j. présents / {att_expected} attendus",
            },
            {
                "id": "performance",
                "label": "Performance mensuelle",
                "value": f"{monthly_performance}%",
                "helper": "Performance du mois",
            },
        ]

    def _build_charts(
        self,
        task_rows,
        completed_count,
        pending_count,
        late_count,
        attendance_rate,
        overall_progress,
    ):
        weekly_values, weekly_labels, current_week_idx = self._build_weekly_performance(task_rows, attendance_rate)
        return {
            "weeklyPerformance": weekly_values,
            "weeklyLabels": weekly_labels,
            "currentWeekIndex": current_week_idx,
            "monthlyProgress": self._build_monthly_progress(weekly_values),
            "taskBreakdown": {
                "completed": completed_count,
                "pending": pending_count,
                "late": late_count,
            },
            "skills": {
                "punctuality":   max(0, min(10, round(attendance_rate / 10))),
                "productivity":  max(0, min(10, round(overall_progress / 10))),
                "teamwork":      max(0, min(10, round(7 - late_count * 0.5 + min(self.inbox_qs.count(), 2) * 0.5))),
                "discipline":    max(0, min(10, round(7 - late_count * 0.5 + attendance_rate / 50))),
                "qualityOfWork": max(0, min(10, round(6 + completed_count * 0.5))),
            },
        }

    def _build_score_insights(self, attendance_rate, late_count):
        return {
            "achievement": (
                "Présence régulière et implication stable tout au long du mois."
                if attendance_rate >= 90
                else "Progression continue sur vos missions du mois."
            ),
            "improvement": (
                "Réduire les tâches en retard pour améliorer la note mensuelle."
                if late_count > 0
                else "Maintenir le rythme actuel et clôturer plus vite les tâches en attente."
            ),
        }

    def _build_panels(self, task_rows):
        today_attendance = self.attendance_qs.filter(date=self.today).first()
        planning = [
            {
                "id": "attendance",
                "time": (
                    today_attendance.check_in_time.isoformat()[:5]
                    if today_attendance and today_attendance.check_in_time
                    else "--:--"
                ),
                "title": (
                    "Présence enregistrée aujourd'hui"
                    if today_attendance and today_attendance.check_out_time
                    else "Pointage du jour"
                ),
                "subtitle": (
                    f"Entrée {today_attendance.check_in_time.isoformat()[:5]} • "
                    f"Sortie {today_attendance.check_out_time.isoformat()[:5]}"
                    if today_attendance
                    and today_attendance.check_in_time
                    and today_attendance.check_out_time
                    else "Pensez à valider votre présence"
                ),
            }
        ]
        planning.extend(
            [
                {
                    "id": f'task-{task["id"]}',
                    "time": task["deadline"],
                    "title": task["name"],
                    "subtitle": f'Priorité {task["priority"].lower()}',
                }
                for task in task_rows
                if task["deadline"] != "-"
            ][:2]
        )

        notifications = [
            {
                "id": f"notif-{item.id}",
                "title": item.title,
                "message": item.message,
                "level": "important" if not item.is_read else "info",
            }
            for item in self.notifications_qs[:2]
        ]
        notifications.extend(
            [
                {
                    "id": f"ann-{item.id}",
                    "title": item.title,
                    "message": item.message,
                    "level": "info",
                }
                for item in self.announcements_qs[:1]
            ]
        )

        hr_requests = [
            {
                "id": leave.id,
                "label": leave.type.libelle,
                "status": (
                    "En attente"
                    if leave.status == LeaveRequest.Status.PENDING
                    else "Accepté"
                    if leave.status == LeaveRequest.Status.ACCEPTED
                    else "Refusé"
                ),
            }
            for leave in self.leaves_qs[:3]
        ]

        quick_messages = [
            {
                "id": message.id,
                "sender": (
                    f"{message.sender.first_name} {message.sender.last_name}".strip()
                    or message.sender.email
                ),
                "subject": message.subject,
            }
            for message in self.inbox_qs[:3]
        ]

        return {
            "planning": planning,
            "notifications": notifications,
            "hrRequests": hr_requests,
            "quickMessages": quick_messages,
        }

    def _build_weekly_performance(self, task_rows, attendance_rate):
        """
        Divide the selected month into 7-day windows (day 1-7, 8-14, 15-21, 22-end).
        Return only weeks that have at least started, based on pure attendance rate.
        Also returns labels and the index of the current (in-progress) week.
        """
        values = []
        labels = []
        current_week_idx = None

        # Always 4 fixed windows: 1-7, 8-14, 15-21, 22-end
        week_boundaries = [
            (self.period_start.replace(day=1),
             self.period_start.replace(day=7)),
            (self.period_start.replace(day=8),
             self.period_start.replace(day=14)),
            (self.period_start.replace(day=15),
             self.period_start.replace(day=21)),
            (self.period_start.replace(day=22),
             self.period_end),  # day 22 → end of month
        ]

        week_num = 0
        for week_start, week_end in week_boundaries:
            # Skip weeks that haven't started yet
            if week_start > self.today:
                break

            week_num += 1

            # Working days (Mon–Fri) in this window, capped at today
            cap = min(week_end, self.today)
            working_days = [
                week_start + timedelta(days=i)
                for i in range((cap - week_start).days + 1)
                if (week_start + timedelta(days=i)).weekday() < 5
            ]

            if not working_days:
                continue

            # Pure attendance: complete days / working days in this window
            complete = Attendance.objects.filter(
                employee=self.employee,
                date__in=working_days,
                check_in_time__isnull=False,
                check_out_time__isnull=False,
            ).count()

            att_rate = round((complete / len(working_days)) * 100)
            values.append(max(0, min(100, att_rate)))
            labels.append(f"S{week_num}")

            # Mark as current week only if this is the ongoing month
            real_today = timezone.localdate()
            if week_start <= real_today <= week_end and self.period_start.month == real_today.month and self.period_start.year == real_today.year:
                current_week_idx = len(values) - 1

        return values, labels, current_week_idx

    def _get_expected_attendance_days(self):
        start_date = max(self.month_start, self.employee.hired_at)
        if start_date > self.today:
            return []

        approved_leave_days = set()
        approved_leaves = self.leaves_qs.filter(
            status=LeaveRequest.Status.ACCEPTED,
            start_date__lte=self.today,
            end_date__gte=start_date,
        )

        for leave in approved_leaves:
            current_day = max(leave.start_date, start_date)
            last_day = min(leave.end_date, self.today)
            while current_day <= last_day:
                if current_day.weekday() < 5:
                    approved_leave_days.add(current_day)
                current_day += timedelta(days=1)

        expected_days = []
        current_day = start_date
        while current_day <= self.today:
            if current_day.weekday() < 5 and current_day not in approved_leave_days:
                expected_days.append(current_day)
            current_day += timedelta(days=1)

        return expected_days

    def _build_monthly_progress(self, weekly_performance):
        """Build 8 data points by interpolating between the 4 real weekly values."""
        if not weekly_performance:
            return []
        points = []
        for i, val in enumerate(weekly_performance):
            prev = weekly_performance[i - 1] if i > 0 else val
            points.append(max(0, min(100, round((prev + val) / 2))))
            points.append(val)
        return points

    def _get_top_skill(self, attendance_rate, overall_progress):
        if attendance_rate >= 90:
            return "Ponctualité"
        if overall_progress >= 70:
            return "Productivité"
        return "Rigueur"

    def _get_score_label(self, final_score):
        if final_score >= 8:
            return "Excellent"
        if final_score >= 6:
            return "Bon"
        if final_score >= 4:
            return "Moyen"
        return "À améliorer"

    def _get_evaluation_label(self):
        """Return the recommendation label from the latest real evaluation, or 'Non évalué'."""
        eval_obj = (
            Evaluation.objects.filter(
                employee=self.employee,
                evaluation_date__year=self.period_start.year,
                evaluation_date__month=self.period_start.month,
            )
            .order_by("-evaluation_date")
            .first()
        )
        if not eval_obj:
            return "Non évalué"
        label_map = {
            "EXCELLENT": "Excellent",
            "GOOD": "Bon",
            "AVERAGE": "Moyen",
            "IMPROVEMENT": "À améliorer",
        }
        return label_map.get(eval_obj.recommendation, eval_obj.recommendation)

    def _get_latest_evaluation(self):
        """Return the evaluation for the selected month, or None."""
        eval_obj = (
            Evaluation.objects.filter(
                employee=self.employee,
                evaluation_date__year=self.period_start.year,
                evaluation_date__month=self.period_start.month,
            )
            .order_by("-evaluation_date", "-created_at")
            .first()
        )
        if not eval_obj:
            return None
        rec_labels = {
            "EXCELLENT": "Excellent",
            "GOOD": "Bon",
            "AVERAGE": "Moyen",
            "IMPROVEMENT": "À améliorer",
        }
        return {
            "score": float(eval_obj.global_score),
            "period": eval_obj.period,
            "recommendation": rec_labels.get(eval_obj.recommendation, eval_obj.recommendation),
            "overall_comment": eval_obj.overall_comment,
            "evaluation_date": eval_obj.evaluation_date.isoformat(),
        }

    def _get_task_priority(self, due_date):
        if not due_date:
            return "Moyenne"
        days_until_due = (due_date - self.today).days
        if days_until_due <= 1:
            return "Haute"
        if days_until_due <= 4:
            return "Moyenne"
        return "Basse"
