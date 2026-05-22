from datetime import date, timedelta
from rest_framework.decorators import api_view, permission_classes
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from django.utils import timezone
from ..models import Employee, Attendance, LeaveRequest, AbsenceWarning, AbsenceJustification, DisciplineFlag, User, RoleChoices
from ..permissions import IsRH, CanIssueWarnings, is_any_rh
from ..scopes import service_scope_ids_for_employee
from .helpers import notify


def _serialize_justification(j, request=None):
	doc_url = None
	if j.document and j.document.name:
		doc_url = request.build_absolute_uri(j.document.url) if request else j.document.url
	return {
		'id': j.id,
		'date': j.date.isoformat(),
		'status': j.status,
		'document_url': doc_url,
		'submitted_at': j.submitted_at.isoformat() if j.submitted_at else None,
		'reviewed_at': j.reviewed_at.isoformat() if j.reviewed_at else None,
		'review_note': j.review_note,
	}


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

	qs = Employee.objects.select_related('service').exclude(id__in=attended_ids).exclude(id__in=onleave_ids)
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

	# Notify GRH if flag reaches 3
	if flag.warning_count >= 3:
		grh_users = User.objects.filter(role=RoleChoices.GRH)
		for rh_user in grh_users:
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
	qs = DisciplineFlag.objects.select_related('employee').filter(month=month_start, warning_count__gte=3).order_by('-warning_count')
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


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def submit_absence_justification(request):
	"""Employee submits a justification document for an absence date."""
	date_str = request.data.get('date')
	document = request.FILES.get('document')

	if not date_str:
		return Response({'detail': 'date is required'}, status=status.HTTP_400_BAD_REQUEST)
	try:
		absence_date = date.fromisoformat(date_str)
	except Exception:
		return Response({'detail': 'invalid date format'}, status=status.HTTP_400_BAD_REQUEST)

	try:
		emp = Employee.objects.get(email=request.user.email)
	except Employee.DoesNotExist:
		return Response({'detail': 'employee not found'}, status=status.HTTP_400_BAD_REQUEST)

	justif, _ = AbsenceJustification.objects.get_or_create(
		employee=emp, date=absence_date,
		defaults={'status': AbsenceJustification.Status.NON_JUSTIFIE}
	)

	if justif.status not in (AbsenceJustification.Status.NON_JUSTIFIE, AbsenceJustification.Status.NON_ACCEPTE):
		return Response({'detail': 'justification already submitted or reviewed'}, status=status.HTTP_400_BAD_REQUEST)

	if not document:
		return Response({'detail': 'document is required'}, status=status.HTTP_400_BAD_REQUEST)

	justif.document = document
	justif.status = AbsenceJustification.Status.EN_COURS
	justif.submitted_at = timezone.now()
	justif.save()

	rh_users = User.objects.filter(role__in=[RoleChoices.RH_SIMPLE, RoleChoices.RH_AGENT, RoleChoices.GRH])
	for rh in rh_users:
		notify(rh, 'Justification d\'absence soumise',
			f'{emp.first_name} {emp.last_name} a soumis une justification pour le {absence_date.isoformat()}.',
			link='/rh/conges')

	return Response(_serialize_justification(justif, request), status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_absence_justifications(request):
	"""Return employee's absence justification statuses for the date range."""
	qfrom = request.query_params.get('from')
	qto = request.query_params.get('to')
	today = timezone.localdate()
	if qfrom:
		from_date = date.fromisoformat(qfrom)
	else:
		first = today.replace(day=1)
		for _ in range(2):
			first = (first - timedelta(days=1)).replace(day=1)
		from_date = first
	to_date = date.fromisoformat(qto) if qto else today

	try:
		emp = Employee.objects.get(email=request.user.email)
	except Employee.DoesNotExist:
		return Response({}, status=status.HTTP_200_OK)

	justifs = AbsenceJustification.objects.filter(employee=emp, date__gte=from_date, date__lte=to_date)
	data = {j.date.isoformat(): _serialize_justification(j, request) for j in justifs}
	return Response(data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def rh_absences_global(request):
	"""RH/GRH: all employee absences with justification status — 3 batched queries."""
	if not is_any_rh(request.user):
		return Response({'detail': 'forbidden'}, status=status.HTTP_403_FORBIDDEN)

	now = timezone.localtime()
	today = now.date()
	days_back = int(request.query_params.get('days', 365))
	from_date = today - timedelta(days=days_back)

	# Today only counts as absent after 17:00; before that the workday isn't over yet
	absence_cutoff = today if now.hour >= 17 else today - timedelta(days=1)

	# 1 — all check-in dates per employee
	attended_by_emp = {}
	for row in Attendance.objects.filter(
		date__gte=from_date, date__lte=today, check_in_time__isnull=False
	).values('employee_id', 'date'):
		attended_by_emp.setdefault(row['employee_id'], set()).add(row['date'])

	# 2 — all approved-leave date ranges per employee
	on_leave_by_emp = {}
	for lr in LeaveRequest.objects.filter(
		status=LeaveRequest.Status.ACCEPTED,
		start_date__lte=today, end_date__gte=from_date
	).values('employee_id', 'start_date', 'end_date'):
		d = max(lr['start_date'], from_date)
		while d <= min(lr['end_date'], today):
			on_leave_by_emp.setdefault(lr['employee_id'], set()).add(d)
			d += timedelta(days=1)

	# 3 — existing justification records
	justifs_map = {}
	for j in AbsenceJustification.objects.filter(date__gte=from_date, date__lte=today):
		justifs_map[(j.employee_id, j.date.isoformat())] = j

	employees = Employee.objects.select_related('service').all()
	result = []

	for emp in employees:
		attended = attended_by_emp.get(emp.id, set())
		on_leave = on_leave_by_emp.get(emp.id, set())
		emp_start = max(from_date, emp.hired_at) if emp.hired_at else from_date
		d = emp_start
		while d <= absence_cutoff:
			if d.weekday() < 5 and d not in attended and d not in on_leave:
				j = justifs_map.get((emp.id, d.isoformat()))
				doc_url = None
				if j and j.document and j.document.name:
					doc_url = request.build_absolute_uri(j.document.url)
				result.append({
					'justification_id': j.id if j else None,
					'employee_id': emp.id,
					'employee_name': f"{emp.first_name} {emp.last_name}".strip(),
					'employee_email': emp.email,
					'service': emp.service.nomService if emp.service else None,
					'date': d.isoformat(),
					'justification_status': j.status if j else 'NON_JUSTIFIE',
					'document_url': doc_url,
					'review_note': j.review_note if j else '',
				})
			d += timedelta(days=1)

	result.sort(key=lambda x: x['date'], reverse=True)
	return Response(result)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def rh_accept_justification(request, pk):
	"""RH accepts an absence justification."""
	if not is_any_rh(request.user):
		return Response({'detail': 'forbidden'}, status=status.HTTP_403_FORBIDDEN)
	try:
		j = AbsenceJustification.objects.select_related('employee').get(pk=pk)
	except AbsenceJustification.DoesNotExist:
		return Response({'detail': 'not found'}, status=status.HTTP_404_NOT_FOUND)
	if j.status != AbsenceJustification.Status.EN_COURS:
		return Response({'detail': 'justification is not pending review'}, status=status.HTTP_400_BAD_REQUEST)
	j.status = AbsenceJustification.Status.JUSTIFIE
	j.reviewed_by = request.user
	j.reviewed_at = timezone.now()
	j.review_note = request.data.get('note', '')
	j.save()
	emp_user = User.objects.filter(email=j.employee.email).first()
	if emp_user:
		notify(emp_user, 'Justification acceptée',
			f'Votre justification d\'absence du {j.date.isoformat()} a été acceptée.',
			link='/attendance')
	return Response(_serialize_justification(j, request))


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def rh_refuse_justification(request, pk):
	"""RH refuses an absence justification."""
	if not is_any_rh(request.user):
		return Response({'detail': 'forbidden'}, status=status.HTTP_403_FORBIDDEN)
	try:
		j = AbsenceJustification.objects.select_related('employee').get(pk=pk)
	except AbsenceJustification.DoesNotExist:
		return Response({'detail': 'not found'}, status=status.HTTP_404_NOT_FOUND)
	if j.status != AbsenceJustification.Status.EN_COURS:
		return Response({'detail': 'justification is not pending review'}, status=status.HTTP_400_BAD_REQUEST)
	j.status = AbsenceJustification.Status.NON_ACCEPTE
	j.reviewed_by = request.user
	j.reviewed_at = timezone.now()
	j.review_note = request.data.get('note', '')
	j.save()
	emp_user = User.objects.filter(email=j.employee.email).first()
	if emp_user:
		notify(emp_user, 'Justification refusée',
			f'Votre justification d\'absence du {j.date.isoformat()} a été refusée. {j.review_note}'.strip(),
			link='/attendance')
	return Response(_serialize_justification(j, request))
