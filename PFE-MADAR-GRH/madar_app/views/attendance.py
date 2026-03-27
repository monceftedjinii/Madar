from datetime import datetime
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from django.utils import timezone
from ..models import Employee, Attendance
from ..permissions import IsEmployeeOrChef


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
