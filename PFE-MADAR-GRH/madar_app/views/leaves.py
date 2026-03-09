from datetime import date
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from django.utils import timezone
from ..models import Employee, LeaveRequest, User, RoleChoices
from ..permissions import IsEmployee, IsChef
from .helpers import notify


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsEmployee])
def create_leave(request):
	"""Employee creates a leave request for themselves."""
	data = request.data
	try:
		emp = Employee.objects.get(email=request.user.email)
	except Employee.DoesNotExist:
		return Response({'detail': 'employee record not found'}, status=status.HTTP_400_BAD_REQUEST)

	ltype = data.get('type')
	start_date = data.get('start_date')
	end_date = data.get('end_date')
	reason = data.get('reason', '')

	if not start_date or not end_date:
		return Response({'detail': 'start_date and end_date are required'}, status=status.HTTP_400_BAD_REQUEST)

	try:
		sd = date.fromisoformat(start_date)
		ed = date.fromisoformat(end_date)
	except Exception:
		return Response({'detail': 'invalid date format, use YYYY-MM-DD'}, status=status.HTTP_400_BAD_REQUEST)

	if ed < sd:
		return Response({'detail': 'end_date must be the same or after start_date'}, status=status.HTTP_400_BAD_REQUEST)

	if ltype == LeaveRequest.LeaveType.SICK and not request.FILES.get('attachment'):
		return Response({'detail': 'attachment required for sick leave'}, status=status.HTTP_400_BAD_REQUEST)

	# Block if employee has a pending request or ongoing approved leave
	today = date.today()
	blocked = LeaveRequest.objects.filter(
		employee=emp,
		status=LeaveRequest.Status.PENDING
	).exists() or LeaveRequest.objects.filter(
		employee=emp,
		status=LeaveRequest.Status.ACCEPTED,
		end_date__gte=today
	).exists()

	if blocked:
		return Response(
			{'detail': "You can't submit a new leave request while you have a pending request or an ongoing approved leave."},
			status=status.HTTP_400_BAD_REQUEST
		)

	leave = LeaveRequest.objects.create(
		employee=emp,
		start_date=sd,
		end_date=ed,
		type=ltype or LeaveRequest.LeaveType.ANNUAL,
		reason=reason,
		attachment=request.FILES.get('attachment') if request.FILES.get('attachment') else None,
		status=LeaveRequest.Status.PENDING,
	)

	# Notify chefs in the same service
	chef_emails = Employee.objects.filter(service=emp.service).values_list('email', flat=True)
	chef_users = User.objects.filter(role=RoleChoices.CHEF, email__in=chef_emails)
	for chef_user in chef_users:
		notify(
			chef_user,
			'New leave request',
			f'{emp.first_name} {emp.last_name} requested leave from {sd} to {ed}.',
			link='/leaves/service'
		)

	return Response({'id': leave.id}, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsEmployee])
def my_leaves(request):
	"""Return the current employee's own leave requests."""
	try:
		emp = Employee.objects.get(email=request.user.email)
	except Employee.DoesNotExist:
		return Response([], status=status.HTTP_200_OK)

	qs = LeaveRequest.objects.filter(employee=emp).order_by('-created_at')
	data = [
		{
			'id': l.id,
			'start_date': l.start_date.isoformat(),
			'end_date': l.end_date.isoformat(),
			'type': l.type,
			'status': l.status,
			'reason': l.reason,
			'chef_comment': l.chef_comment,
			'decided_by': l.decided_by.email if l.decided_by else None,
			'decided_at': l.decided_at.isoformat() if l.decided_at else None,
		}
		for l in qs
	]
	return Response(data)


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsChef])
def department_pending_leaves(request):
	"""Chef lists all leaves in his service (history + pending)."""
	try:
		chef_emp = Employee.objects.get(email=request.user.email)
	except Employee.DoesNotExist:
		return Response(
			{'detail': 'Chef has no Employee record / service assigned'},
			status=status.HTTP_400_BAD_REQUEST
		)

	qs = LeaveRequest.objects.filter(employee__service=chef_emp.service).order_by('-created_at')
	data = [
		{
			'id': l.id,
			'employee_email': l.employee.email,
			'employee': {
				'email': l.employee.email,
				'first_name': l.employee.first_name,
				'last_name': l.employee.last_name,
			},
			'start_date': l.start_date.isoformat(),
			'end_date': l.end_date.isoformat(),
			'type': l.type,
			'reason': l.reason,
			'attachment': request.build_absolute_uri(l.attachment.url) if l.attachment else None,
			'status': l.status,
		}
		for l in qs
	]
	return Response(data)


def _chef_decide_common(request, pk, accept=True):
	"""Shared logic for approve/reject leave by a chef."""
	try:
		lr = LeaveRequest.objects.get(id=pk)
	except LeaveRequest.DoesNotExist:
		return Response({'detail': 'not found'}, status=status.HTTP_404_NOT_FOUND)

	if lr.status != LeaveRequest.Status.PENDING:
		return Response({'detail': 'leave not pending'}, status=status.HTTP_400_BAD_REQUEST)

	try:
		chef_emp = Employee.objects.get(email=request.user.email)
	except Employee.DoesNotExist:
		return Response({'detail': 'chef has no employee record'}, status=status.HTTP_400_BAD_REQUEST)

	if lr.employee.service_id != chef_emp.service_id:
		return Response({'detail': 'forbidden'}, status=status.HTTP_403_FORBIDDEN)

	comment = request.data.get('comment', '')
	lr.chef_comment = comment
	lr.decided_by = request.user
	lr.decided_at = timezone.now()
	lr.status = LeaveRequest.Status.ACCEPTED if accept else LeaveRequest.Status.REFUSED
	lr.save()

	# Notify the employee
	emp_user = None
	try:
		emp_user = User.objects.get(email=lr.employee.email)
	except Exception:
		pass
	if emp_user:
		status_label = 'approved' if accept else 'rejected'
		notify(
			emp_user,
			f'Leave {status_label}',
			f'Your leave request from {lr.start_date} to {lr.end_date} has been {status_label}.',
			link='/leaves'
		)

	return Response({'id': lr.id, 'status': lr.status})


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsChef])
def approve_leave(request, pk):
	"""Chef approves a pending leave request."""
	return _chef_decide_common(request, pk, accept=True)


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsChef])
def reject_leave(request, pk):
	"""Chef rejects a pending leave request."""
	return _chef_decide_common(request, pk, accept=False)
