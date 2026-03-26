from datetime import date
from decimal import Decimal
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from django.utils import timezone
from django.db.models import Q
from ..models import Employee, LeaveRequest, LeaveType, User, RoleChoices, ValidationWorkflow, SoldeConge
from ..permissions import IsEmployee
from .helpers import notify


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_leave(request):
	"""Employee creates a leave request for themselves."""
	data = request.data
	try:
		emp = Employee.objects.get(email=request.user.email)
	except Employee.DoesNotExist:
		return Response({'detail': 'employee record not found'}, status=status.HTTP_400_BAD_REQUEST)

	ltype_code = data.get('type')
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

	if not ltype_code:
		default_type = LeaveType.objects.order_by('code').first()
		if not default_type:
			return Response({'detail': 'no leave types configured'}, status=status.HTTP_400_BAD_REQUEST)
		leave_type = default_type
	else:
		leave_type = LeaveType.objects.filter(code=ltype_code).first()
		if not leave_type:
			return Response({'detail': 'invalid leave type'}, status=status.HTTP_400_BAD_REQUEST)

	if leave_type.justificatifRequis and not request.FILES.get('attachment'):
		return Response({'detail': 'attachment required for this leave type'}, status=status.HTTP_400_BAD_REQUEST)

	if leave_type.delaiPreavis and (sd - date.today()).days < leave_type.delaiPreavis:
		return Response({'detail': f'notice period not respected: {leave_type.delaiPreavis} day(s) required'}, status=status.HTTP_400_BAD_REQUEST)

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
		type=leave_type,
		reason=reason,
		attachment=request.FILES.get('attachment') if request.FILES.get('attachment') else None,
		status=LeaveRequest.Status.PENDING,
	)

	workflow_steps = ValidationWorkflow.initialize_for_leave_request(leave)
	ValidationWorkflow.objects.filter(leave_request=leave).update(is_active=False)
	first_step = workflow_steps.first()
	if first_step:
		first_step.is_active = True
		first_step.save(update_fields=['is_active', 'updated_at'])
		_notify_step_validators(leave, first_step)

	return Response({'id': leave.id}, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
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
			'type': l.type.code,
			'type_label': l.type.libelle,
			'status': l.status,
			'reason': l.reason,
			'chef_comment': l.chef_comment,
			'decided_by': l.decided_by.email if l.decided_by else None,
			'decided_at': l.decided_at.isoformat() if l.decided_at else None,
			'workflow': _serialize_workflow(l),
		}
		for l in qs
	]
	return Response(data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def department_pending_leaves(request):
	"""List leaves visible to current validator role, with workflow metadata."""
	if request.user.role not in {
		RoleChoices.CHEF,
		RoleChoices.RH_SIMPLE,
		RoleChoices.RH_AGENT,
		RoleChoices.RH_SENIOR,
		RoleChoices.GRH,
	}:
		return Response({'detail': 'forbidden'}, status=status.HTTP_403_FORBIDDEN)

	qs = LeaveRequest.objects.select_related('employee', 'type', 'decided_by').prefetch_related('validation_workflow__validator')

	if request.user.role == RoleChoices.CHEF:
		try:
			chef_emp = Employee.objects.get(email=request.user.email)
		except Employee.DoesNotExist:
			return Response({'detail': 'validator has no Employee record'}, status=status.HTTP_400_BAD_REQUEST)
		qs = qs.filter(employee__service=chef_emp.service)
	else:
		expected_role = RoleChoices.RH_SIMPLE if request.user.role in {RoleChoices.RH_SIMPLE, RoleChoices.RH_AGENT, RoleChoices.RH_SENIOR} else request.user.role
		qs = qs.filter(validation_workflow__validator_role=expected_role)

	qs = qs.order_by('-created_at').distinct()
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
			'type': l.type.code,
			'type_label': l.type.libelle,
			'reason': l.reason,
			'attachment': request.build_absolute_uri(l.attachment.url) if l.attachment else None,
			'status': l.status,
			'chef_comment': l.chef_comment,
			'decided_at': l.decided_at.isoformat() if l.decided_at else None,
			'can_decide': _can_user_decide_leave(request.user, l),
			'current_step': _serialize_current_step(l),
			'workflow': _serialize_workflow(l),
		}
		for l in qs
	]
	return Response(data)


def _chef_decide_common(request, pk, accept=True):
	"""Shared logic for approve/reject leave through workflow steps."""
	try:
		lr = LeaveRequest.objects.select_related('employee', 'type').get(id=pk)
	except LeaveRequest.DoesNotExist:
		return Response({'detail': 'not found'}, status=status.HTTP_404_NOT_FOUND)

	if lr.status != LeaveRequest.Status.PENDING:
		return Response({'detail': 'leave not pending'}, status=status.HTTP_400_BAD_REQUEST)

	current_step = _get_current_pending_step(lr)
	if not current_step:
		return Response({'detail': 'workflow is not initialized or already completed'}, status=status.HTTP_400_BAD_REQUEST)

	if not _role_matches(current_step.validator_role, request.user.role):
		return Response({'detail': 'forbidden'}, status=status.HTTP_403_FORBIDDEN)

	if request.user.role == RoleChoices.CHEF:
		try:
			chef_emp = Employee.objects.get(email=request.user.email)
		except Employee.DoesNotExist:
			return Response({'detail': 'validator has no employee record'}, status=status.HTTP_400_BAD_REQUEST)
		if lr.employee.service_id != chef_emp.service_id:
			return Response({'detail': 'forbidden'}, status=status.HTTP_403_FORBIDDEN)

	comment = request.data.get('comment', '')
	if accept:
		pending_steps = ValidationWorkflow.objects.filter(leave_request=lr, decision=ValidationWorkflow.Decision.PENDING)
		is_last_step = pending_steps.count() == 1

		if is_last_step:
			jours = Decimal((lr.end_date - lr.start_date).days + 1)
			solde, _ = SoldeConge.get_or_create_balance(lr.employee, lr.type, lr.start_date.year)
			if solde.joursRestants < jours:
				return Response({'detail': 'insufficient leave balance for final approval'}, status=status.HTTP_400_BAD_REQUEST)

		current_step.approve(request.user, comment)
		lr.chef_comment = comment

		next_step = _get_current_pending_step(lr)
		ValidationWorkflow.objects.filter(leave_request=lr, decision=ValidationWorkflow.Decision.PENDING).update(is_active=False)

		if next_step:
			next_step.is_active = True
			next_step.save(update_fields=['is_active', 'updated_at'])
			_notify_step_validators(lr, next_step)
			lr.save(update_fields=['chef_comment'])
			return Response({'id': lr.id, 'status': lr.status, 'detail': 'approved at current step; moved to next validator'})

		jours = Decimal((lr.end_date - lr.start_date).days + 1)
		solde, _ = SoldeConge.get_or_create_balance(lr.employee, lr.type, lr.start_date.year)
		solde.debiter(jours)

		lr.status = LeaveRequest.Status.ACCEPTED
		lr.decided_by = request.user
		lr.decided_at = timezone.now()
		lr.save(update_fields=['status', 'decided_by', 'decided_at', 'chef_comment'])

		emp_user = User.objects.filter(email=lr.employee.email).first()
		if emp_user:
			notify(emp_user, 'Leave approved', f'Your leave request from {lr.start_date} to {lr.end_date} has been approved.', link='/leaves')

		return Response({'id': lr.id, 'status': lr.status, 'detail': 'leave fully approved'})

	current_step.reject(request.user, comment)
	ValidationWorkflow.objects.filter(leave_request=lr, decision=ValidationWorkflow.Decision.PENDING).update(is_active=False)
	lr.chef_comment = comment
	lr.decided_by = request.user
	lr.decided_at = timezone.now()
	lr.status = LeaveRequest.Status.REFUSED
	lr.save(update_fields=['chef_comment', 'decided_by', 'decided_at', 'status'])

	emp_user = User.objects.filter(email=lr.employee.email).first()
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
@permission_classes([IsAuthenticated])
def approve_leave(request, pk):
	"""Current workflow validator approves current step."""
	return _chef_decide_common(request, pk, accept=True)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def reject_leave(request, pk):
	"""Current workflow validator rejects current step."""
	return _chef_decide_common(request, pk, accept=False)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def leave_types_list(request):
	types = LeaveType.objects.order_by('code')
	data = [
		{
			'code': lt.code,
			'label': lt.libelle,
			'requires_attachment': lt.justificatifRequis,
			'notice_days': lt.delaiPreavis,
		}
		for lt in types
	]
	return Response(data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_leave_balances(request):
	"""Return the current employee's leave balances."""
	from datetime import date
	try:
		emp = Employee.objects.get(email=request.user.email)
	except Employee.DoesNotExist:
		return Response([], status=status.HTTP_200_OK)

	current_year = date.today().year
	balances = SoldeConge.get_employee_balances(emp, current_year)
	data = [
		{
			'id': b.id,
			'type_code': b.leaveType.code,
			'type_label': b.leaveType.libelle,
			'joursAcquis': str(b.joursAcquis),
			'joursPris': str(b.joursPris),
			'joursReportes': str(b.joursReportes),
			'joursRestants': str(b.joursRestants),
			'annee': b.annee,
		}
		for b in balances
	]
	return Response(data)


def _role_matches(expected_role, user_role):
	if expected_role == RoleChoices.RH_SIMPLE:
		return user_role in {RoleChoices.RH_SIMPLE, RoleChoices.RH_AGENT, RoleChoices.RH_SENIOR}
	return expected_role == user_role


def _get_current_pending_step(leave_request):
	return leave_request.validation_workflow.filter(decision=ValidationWorkflow.Decision.PENDING).order_by('validation_order').first()


def _serialize_current_step(leave_request):
	step = _get_current_pending_step(leave_request)
	if not step:
		return None
	return {
		'id': step.id,
		'validation_order': step.validation_order,
		'validator_role': step.validator_role,
		'is_active': step.is_active,
	}


def _serialize_workflow(leave_request):
	steps = leave_request.validation_workflow.order_by('validation_order')
	return [
		{
			'id': s.id,
			'validation_order': s.validation_order,
			'validator_role': s.validator_role,
			'decision': s.decision,
			'comment': s.comment,
			'validator': s.validator.email if s.validator else None,
			'decided_at': s.decided_at.isoformat() if s.decided_at else None,
			'is_active': s.is_active,
		}
		for s in steps
	]


def _can_user_decide_leave(user, leave_request):
	step = _get_current_pending_step(leave_request)
	if not step:
		return False
	if not _role_matches(step.validator_role, user.role):
		return False
	if user.role == RoleChoices.CHEF:
		chef_emp = Employee.objects.filter(email=user.email).first()
		if not chef_emp:
			return False
		return chef_emp.service_id == leave_request.employee.service_id
	return True


def _notify_step_validators(leave_request, step):
	if step.validator_role == RoleChoices.CHEF:
		emails = Employee.objects.filter(service=leave_request.employee.service).values_list('email', flat=True)
		validators = User.objects.filter(role=RoleChoices.CHEF, email__in=emails)
	elif step.validator_role == RoleChoices.RH_SIMPLE:
		validators = User.objects.filter(role__in=[RoleChoices.RH_SIMPLE, RoleChoices.RH_AGENT, RoleChoices.RH_SENIOR])
	else:
		validators = User.objects.filter(role=RoleChoices.GRH)

	for validator_user in validators:
		notify(
			validator_user,
			'Leave approval required',
			f'{leave_request.employee.first_name} {leave_request.employee.last_name} leave request needs your validation (step {step.validation_order}).',
			link='/leaves/department'
		)
