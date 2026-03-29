from datetime import datetime, timedelta
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from django.utils import timezone
from ..models import Employee, Attendance
from ..permissions import IsChef, IsEmployeeOrChef


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsEmployeeOrChef])
def attendance_check_in(request):
	"""Employee or chef checks in for today using their 4-digit PIN."""
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
@permission_classes([IsAuthenticated, IsEmployeeOrChef])
def attendance_check_out(request):
	"""Employee or chef checks out for today using their 4-digit PIN."""
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
@permission_classes([IsAuthenticated, IsEmployeeOrChef])
def attendance_me(request):
	"""Return attendance records for the current employee or chef in a date range."""
	qfrom = request.query_params.get('from')
	qto = request.query_params.get('to')
	today = timezone.localdate()

	from_date = datetime.fromisoformat(qfrom).date() if qfrom else today.replace(day=1)
	to_date = datetime.fromisoformat(qto).date() if qto else today

	try:
		emp = Employee.objects.get(email=request.user.email)
	except Employee.DoesNotExist:
		return Response([], status=status.HTTP_200_OK)

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
@permission_classes([IsAuthenticated, IsChef])
def attendance_team(request):
	"""Return attendance summary for the chef's service on a date range."""
	qfrom = request.query_params.get('from')
	qto = request.query_params.get('to')
	today = timezone.localdate()

	from_date = datetime.fromisoformat(qfrom).date() if qfrom else today.replace(day=1)
	to_date = datetime.fromisoformat(qto).date() if qto else today

	try:
		chef_emp = Employee.objects.select_related('service', 'position').get(email=request.user.email)
	except Employee.DoesNotExist:
		return Response({'detail': "Aucune fiche employe n'est liee a ce chef."}, status=status.HTTP_400_BAD_REQUEST)

	team = list(
		Employee.objects.select_related('service', 'position')
		.filter(service=chef_emp.service)
		.exclude(email=request.user.email)
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

	data = []
	for employee in team:
		records = attendance_by_employee.get(employee.id, [])
		complete_days = len([item for item in records if item.check_in_time and item.check_out_time])
		pending_checkout = len([item for item in records if item.check_in_time and not item.check_out_time])
		absent_days = 0

		current_date = from_date
		record_map = {item.date: item for item in records}
		while current_date <= to_date:
			if current_date.weekday() < 5 and current_date not in record_map:
				absent_days += 1
			current_date = current_date + timedelta(days=1)

		today_record = record_map.get(today)
		data.append({
			'id': employee.id,
			'full_name': f"{employee.first_name} {employee.last_name}".strip() or employee.email,
			'email': employee.email,
			'position': employee.position.name if employee.position else '',
			'service': employee.service.nomService if employee.service else '',
			'from': from_date.isoformat(),
			'to': to_date.isoformat(),
			'complete_days': complete_days,
			'pending_checkout_days': pending_checkout,
			'absent_days': absent_days,
			'today_check_in': today_record.check_in_time.isoformat() if today_record and today_record.check_in_time else None,
			'today_check_out': today_record.check_out_time.isoformat() if today_record and today_record.check_out_time else None,
			'status_today': 'Complet' if today_record and today_record.check_in_time and today_record.check_out_time else 'En cours' if today_record and today_record.check_in_time else 'Absent',
		})

	return Response(data)
