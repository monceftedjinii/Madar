from datetime import datetime, timedelta
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from django.utils import timezone
from ..models import Employee, Attendance, AbsenceJustification, Notification, User
from ..permissions import CanUseAttendance, IsServiceManager
from .helpers import notify


@api_view(['POST'])
@permission_classes([IsAuthenticated, CanUseAttendance])
def attendance_check_in(request):
	"""Employee, chef or RH staff checks in for today using their 4-digit PIN."""
	pin = request.data.get('pin')
	if not pin:
		return Response({'detail': 'pin is required'}, status=status.HTTP_400_BAD_REQUEST)
	if not str(pin).isdigit() or len(str(pin)) != 4:
		return Response({'detail': 'pin must be exactly 4 digits'}, status=status.HTTP_400_BAD_REQUEST)

	try:
		emp = Employee.objects.get(email=request.user.email)
	except Employee.DoesNotExist:
		return Response({'detail': 'employee record not found'}, status=status.HTTP_400_BAD_REQUEST)

	if not emp.attendance_pin:
		return Response({'detail': 'pin not set'}, status=status.HTTP_400_BAD_REQUEST)
	if str(pin) != emp.attendance_pin:
		return Response({'detail': 'Invalid PIN'}, status=status.HTTP_403_FORBIDDEN)

	now = timezone.localtime()
	today = now.date()

	att, created = Attendance.objects.get_or_create(employee=emp, date=today)
	if att.check_in_time:
		return Response({'detail': 'already checked in'}, status=status.HTTP_400_BAD_REQUEST)

	att.check_in_time = now.time()
	att.save()
	return Response(
		{'id': att.id, 'check_in_time': att.check_in_time.isoformat()},
		status=(status.HTTP_201_CREATED if created else status.HTTP_200_OK)
	)


@api_view(['POST'])
@permission_classes([IsAuthenticated, CanUseAttendance])
def attendance_check_out(request):
	"""Employee, chef or RH staff checks out for today using their 4-digit PIN."""
	pin = request.data.get('pin')
	if not pin:
		return Response({'detail': 'pin is required'}, status=status.HTTP_400_BAD_REQUEST)
	if not str(pin).isdigit() or len(str(pin)) != 4:
		return Response({'detail': 'pin must be exactly 4 digits'}, status=status.HTTP_400_BAD_REQUEST)

	try:
		emp = Employee.objects.get(email=request.user.email)
	except Employee.DoesNotExist:
		return Response({'detail': 'employee record not found'}, status=status.HTTP_400_BAD_REQUEST)

	if not emp.attendance_pin:
		return Response({'detail': 'pin not set'}, status=status.HTTP_400_BAD_REQUEST)
	if str(pin) != emp.attendance_pin:
		return Response({'detail': 'Invalid PIN'}, status=status.HTTP_403_FORBIDDEN)

	now = timezone.localtime()
	today = now.date()

	try:
		att = Attendance.objects.get(employee=emp, date=today)
	except Attendance.DoesNotExist:
		return Response({'detail': 'no check-in found for today'}, status=status.HTTP_400_BAD_REQUEST)

	if not att.check_in_time:
		return Response({'detail': 'no check-in found for today'}, status=status.HTTP_400_BAD_REQUEST)
	if att.check_out_time:
		return Response({'detail': 'already checked out'}, status=status.HTTP_400_BAD_REQUEST)

	att.check_out_time = now.time()
	att.save()
	return Response({'id': att.id, 'check_out_time': att.check_out_time.isoformat()})


@api_view(['GET'])
@permission_classes([IsAuthenticated, CanUseAttendance])
def attendance_me(request):
	"""Return attendance records for the current employee, chef or RH staff in a date range."""
	qfrom = request.query_params.get('from')
	qto = request.query_params.get('to')
	today = timezone.localdate()

	if qfrom:
		from_date = datetime.fromisoformat(qfrom).date()
	else:
		first = today.replace(day=1)
		for _ in range(2):
			first = (first - timedelta(days=1)).replace(day=1)
		from_date = first
	to_date = datetime.fromisoformat(qto).date() if qto else today

	try:
		emp = Employee.objects.get(email=request.user.email)
	except Employee.DoesNotExist:
		return Response([], status=status.HTTP_200_OK)

	# Never show absences before the employee was hired
	if emp.hired_at and from_date < emp.hired_at:
		from_date = emp.hired_at

	qs = Attendance.objects.filter(
		employee=emp,
		date__gte=from_date,
		date__lte=to_date
	).order_by('date')

	data = [
		{
			'date': a.date.isoformat(),
			'check_in_time': a.check_in_time.isoformat() if a.check_in_time else None,
			'check_out_time': a.check_out_time.isoformat() if a.check_out_time else None,
		}
		for a in qs
	]
	return Response(data)


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsServiceManager])
def attendance_team(request):
	"""Return attendance summary for the manager's service on a date range."""
	qfrom = request.query_params.get('from')
	qto = request.query_params.get('to')
	today = timezone.localdate()

	from_date = datetime.fromisoformat(qfrom).date() if qfrom else today.replace(day=1)
	to_date = datetime.fromisoformat(qto).date() if qto else today

	try:
		chef_emp = Employee.objects.select_related('service', 'position').get(email=request.user.email)
	except Employee.DoesNotExist:
		return Response({'detail': "Aucune fiche employe n'est liee a ce responsable."}, status=status.HTTP_400_BAD_REQUEST)

	team = list(
		Employee.objects.select_related('service', 'position')
		.filter(service=chef_emp.service)
		.exclude(id=chef_emp.id)
		.order_by('first_name', 'last_name')
	)
	attendance_qs = Attendance.objects.filter(
		employee__in=team,
		date__gte=from_date,
		date__lte=to_date,
	).select_related('employee').order_by('employee_id', 'date')

	attendance_by_employee = {}
	for item in attendance_qs:
		attendance_by_employee.setdefault(item.employee_id, []).append(item)

	# Batch: justified absence counts per employee in date range
	justified_dates_by_emp = {}
	for j in AbsenceJustification.objects.filter(
		employee__in=team,
		date__gte=from_date,
		date__lte=to_date,
		status__in=['EN_COURS', 'JUSTIFIE'],
	).values('employee_id', 'date'):
		justified_dates_by_emp.setdefault(j['employee_id'], set()).add(j['date'])

	# Batch: already-notified absent employees for today (avoid duplicates)
	already_notified_today = set(
		Notification.objects.filter(
			user=request.user,
			title='Absence détectée',
			created_at__date=today,
		).values_list('message', flat=True)
	)

	data = []
	for employee in team:
		records = attendance_by_employee.get(employee.id, [])
		complete_days = len([item for item in records if item.check_in_time and item.check_out_time])
		pending_checkout = len([item for item in records if item.check_in_time and not item.check_out_time])
		absent_days = 0
		unjustified_absences = 0
		last_absence_date = None

		record_map = {item.date: item for item in records}
		justified_dates = justified_dates_by_emp.get(employee.id, set())
		emp_start = max(from_date, employee.hired_at) if employee.hired_at else from_date
		current_date = emp_start
		while current_date <= to_date:
			if current_date.weekday() < 5 and current_date not in record_map:
				absent_days += 1
				last_absence_date = current_date
				if current_date not in justified_dates:
					unjustified_absences += 1
			current_date = current_date + timedelta(days=1)

		# Notify chef if this employee is absent today
		today_record = record_map.get(today)
		full_name = f"{employee.first_name} {employee.last_name}".strip() or employee.email
		if today.weekday() < 5 and not today_record:
			notif_message = f"{full_name} n'est pas venu(e) au travail le {today.isoformat()}."
			if notif_message not in already_notified_today:
				notify(request.user, 'Absence détectée', notif_message, link='/chef/attendance')
				already_notified_today.add(notif_message)

		data.append({
			'id': employee.id,
			'full_name': full_name,
			'email': employee.email,
			'position': employee.position.name if employee.position else '',
			'service': employee.service.nomService if employee.service else '',
			'from': from_date.isoformat(),
			'to': to_date.isoformat(),
			'complete_days': complete_days,
			'pending_checkout_days': pending_checkout,
			'absent_days': absent_days,
			'unjustified_absences': unjustified_absences,
			'last_absence': last_absence_date.isoformat() if last_absence_date else None,
			'today_check_in': today_record.check_in_time.isoformat() if today_record and today_record.check_in_time else None,
			'today_check_out': today_record.check_out_time.isoformat() if today_record and today_record.check_out_time else None,
		})

	return Response(data)


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsServiceManager])
def attendance_employee_detail(request, employee_id):
	"""Chef: full daily attendance log for one employee in their team."""
	today = timezone.localdate()
	qfrom = request.query_params.get('from')
	qto = request.query_params.get('to')
	if qfrom:
		from_date = datetime.fromisoformat(qfrom).date()
	else:
		first = today.replace(day=1)
		for _ in range(2):
			first = (first - timedelta(days=1)).replace(day=1)
		from_date = first
	to_date = datetime.fromisoformat(qto).date() if qto else today

	try:
		chef_emp = Employee.objects.get(email=request.user.email)
	except Employee.DoesNotExist:
		return Response({'detail': 'validator has no Employee record'}, status=status.HTTP_400_BAD_REQUEST)

	try:
		emp = Employee.objects.select_related('service', 'position').get(id=employee_id)
	except Employee.DoesNotExist:
		return Response({'detail': 'Employee not found'}, status=status.HTTP_404_NOT_FOUND)

	if emp.service_id != chef_emp.service_id:
		return Response({'detail': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)

	attendance_map = {a.date: a for a in Attendance.objects.filter(
		employee=emp, date__gte=from_date, date__lte=to_date
	)}
	justif_map = {j.date: j for j in AbsenceJustification.objects.filter(
		employee=emp, date__gte=from_date, date__lte=to_date
	)}

	JUSTIF_LABELS = {
		'NON_JUSTIFIE': 'Non justifié', 'EN_COURS': 'En cours',
		'JUSTIFIE': 'Justifié', 'NON_ACCEPTE': 'Non acceptée',
	}

	days = []
	d = from_date
	while d <= to_date:
		a = attendance_map.get(d)
		j = justif_map.get(d)
		is_weekend = d.weekday() >= 5
		if a:
			day_status = 'Complet' if a.check_in_time and a.check_out_time else 'Entrée seule'
		elif is_weekend:
			day_status = 'Weekend'
		else:
			day_status = 'Absent'

		days.append({
			'date': d.isoformat(),
			'is_weekend': is_weekend,
			'check_in': a.check_in_time.isoformat()[:5] if a and a.check_in_time else None,
			'check_out': a.check_out_time.isoformat()[:5] if a and a.check_out_time else None,
			'status': day_status,
			'justification_status': JUSTIF_LABELS.get(j.status, j.status) if j else None,
			'raw_justif_status': j.status if j else None,
		})
		d += timedelta(days=1)

	return Response({
		'employee': {
			'id': emp.id,
			'full_name': f"{emp.first_name} {emp.last_name}".strip(),
			'email': emp.email,
			'service': emp.service.nomService if emp.service else '',
			'position': emp.position.name if emp.position else '',
		},
		'from': from_date.isoformat(),
		'to': to_date.isoformat(),
		'days': days,
	})
