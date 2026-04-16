from datetime import date
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from django.utils import timezone
from ..models import Employee, Attendance, LeaveRequest, AbsenceWarning, DisciplineFlag, User, RoleChoices
from ..permissions import IsRH, CanIssueWarnings
from ..scopes import service_scope_ids_for_employee
from .helpers import notify


def _warning_notification_payload(employee, issuer_user, warning_date, warning_comment=''):
	comment = (warning_comment or '').strip()
	message = f'Un avertissement pour absence a ete enregistre pour la date du {warning_date.isoformat()}.'
	if comment:
		message = f'{message} Commentaire: {comment}'

	return {
		'title': 'Avertissement d\'absence',
		'message': message,
		'link': '/notifications',
	}


def _ensure_warning_notification(employee, issuer_user, warning_date, warning_comment=''):
	employee_user = User.objects.filter(email=employee.email).first()
	if not employee_user:
		return False

	payload = _warning_notification_payload(
		employee,
		issuer_user,
		warning_date,
		warning_comment=warning_comment,
	)
	notification_exists = employee_user.notifications.filter(
		title=payload['title'],
		message=payload['message'],
		link=payload['link'],
	).exists()
	if notification_exists:
		return False

	notify(employee_user, payload['title'], payload['message'], link=payload['link'])
	return True


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsRH])
def absences_yesterday(request):
	"""List employees absent yesterday (no attendance record, no approved leave)."""
	yesterday = timezone.now().date() - timezone.timedelta(days=1)
	attended_ids = Attendance.objects.filter(date=yesterday).values_list('employee_id', flat=True)
	onleave_ids = LeaveRequest.objects.filter(
		status=LeaveRequest.Status.ACCEPTED,
		start_date__lte=yesterday,
		end_date__gte=yesterday
	).values_list('employee_id', flat=True)

	qs = Employee.objects.exclude(id__in=attended_ids).exclude(id__in=onleave_ids)
	data = [
		{
			'id': e.id,
			'full_name': f"{e.first_name} {e.last_name}",
			'service': e.service.nomService if e.service else None,
		}
		for e in qs.order_by('id')
	]
	return Response(data)


@api_view(['POST'])
@permission_classes([IsAuthenticated, CanIssueWarnings])
def create_warning(request):
	"""Authorized manager issues an absence warning to an employee for a specific date."""
	emp_id = request.data.get('employee_id')
	date_str = request.data.get('date')
	comment = request.data.get('comment', '')

	if not emp_id or not date_str:
		return Response({'detail': 'employee_id and date are required'}, status=status.HTTP_400_BAD_REQUEST)

	try:
		dt = date.fromisoformat(date_str)
	except Exception:
		return Response({'detail': 'invalid date format, use YYYY-MM-DD'}, status=status.HTTP_400_BAD_REQUEST)

	try:
		emp = Employee.objects.get(id=emp_id)
	except Employee.DoesNotExist:
		return Response({'detail': 'employee not found'}, status=status.HTTP_400_BAD_REQUEST)

	if request.user.role == RoleChoices.CHEF:
		try:
			chef_emp = Employee.objects.get(email=request.user.email)
		except Employee.DoesNotExist:
			return Response({'detail': 'chef has no employee record'}, status=status.HTTP_400_BAD_REQUEST)

		if emp.service_id not in service_scope_ids_for_employee(chef_emp):
			return Response(
				{'detail': 'you can only warn employees in your service or its sub-services'},
				status=status.HTTP_403_FORBIDDEN
			)

	existing_warning = AbsenceWarning.objects.filter(employee=emp, date=dt).first()
	if existing_warning:
		month_start = dt.replace(day=1)
		flag = DisciplineFlag.objects.filter(employee=emp, month=month_start).first()
		notification_created = _ensure_warning_notification(
			emp,
			existing_warning.issued_by or request.user,
			dt,
			warning_comment=existing_warning.comment,
		)
		return Response(
			{
				'id': existing_warning.id,
				'warning_count': flag.warning_count if flag else 0,
				'detail': 'warning for this employee and date already exists',
				'notification_synced': notification_created,
			},
			status=status.HTTP_200_OK
		)

	aw = AbsenceWarning.objects.create(employee=emp, date=dt, comment=comment, issued_by=request.user)
	_ensure_warning_notification(emp, request.user, dt, warning_comment=aw.comment)

	month_start = dt.replace(day=1)
	flag, _ = DisciplineFlag.objects.get_or_create(
		employee=emp,
		month=month_start,
		defaults={'warning_count': 0}
	)
	flag.warning_count += 1
	flag.save()

	# Notify RH_SENIOR if flag reaches 3
	if flag.warning_count >= 3:
		rh_senior_users = User.objects.filter(role=RoleChoices.RH_SENIOR)
		for rh_user in rh_senior_users:
			notify(
				rh_user,
				'Discipline Flag',
				f'Employee {emp.first_name} {emp.last_name} has reached {flag.warning_count} warnings in the current month.',
				link='/discipline/flags'
			)

	return Response({'id': aw.id, 'warning_count': flag.warning_count}, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsRH])
def discipline_flags(request):
	"""Return discipline flags for the current month where warning count >= 3."""
	today = timezone.now().date()
	month_start = today.replace(day=1)
	qs = DisciplineFlag.objects.filter(month=month_start, warning_count__gte=3).order_by('-warning_count')
	data = [
		{
			'employee_id': f.employee.id,
			'employee_name': f"{f.employee.first_name} {f.employee.last_name}".strip(),
			'employee_email': f.employee.email,
			'warning_count': f.warning_count,
			'month': f.month.isoformat(),
		}
		for f in qs
	]
	return Response(data)
