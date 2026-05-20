from datetime import date, timedelta
from decimal import Decimal
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from django.utils import timezone
from django.db.models import Q
from ..models import Employee, LeaveRequest, LeaveType, User, RoleChoices, ServiceChoices, ValidationWorkflow, SoldeConge, EmployeeRoleChoices
from ..permissions import IsEmployee, is_conge_rh, is_drh, is_any_rh
from .helpers import notify


LEGACY_LEAVE_TYPE_MAP = {
	'ANNUAL': LeaveRequest.LeaveType.ANNUAL,
	'SICK': LeaveRequest.LeaveType.SICK,
	'OTHER': LeaveRequest.LeaveType.OTHER,
}


def _normalize_leave_type_code(value):
	if not value:
		return value
	return LEGACY_LEAVE_TYPE_MAP.get(str(value).upper(), value)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_leave(request):
	"""Employee creates a leave request for themselves."""
	data = request.data
	try:
		emp = Employee.objects.get(email=request.user.email)
	except Employee.DoesNotExist:
		return Response({'detail': 'employee record not found'}, status=status.HTTP_400_BAD_REQUEST)

	ltype_code = _normalize_leave_type_code(data.get('type'))
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
		earliest_date = date.today() + timedelta(days=leave_type.delaiPreavis)
		return Response(
			{
				'detail': f"délai de préavis non respecté : {leave_type.delaiPreavis} jour(s) requis",
				'code': 'NOTICE_PERIOD_NOT_RESPECTED',
				'required_notice_days': leave_type.delaiPreavis,
				'earliest_start_date': earliest_date.isoformat(),
			},
			status=status.HTTP_400_BAD_REQUEST
		)

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

	# Annual leave 2-split rule (code CA, 30 days max, at most 2 fractions per year)
	ANNUAL_CODE = 'CA'
	if leave_type.code == ANNUAL_CODE:
		year = sd.year
		accepted_annual = list(LeaveRequest.objects.filter(
			employee=emp,
			type__code=ANNUAL_CODE,
			status=LeaveRequest.Status.ACCEPTED,
			start_date__year=year,
		))
		accepted_count = len(accepted_annual)
		requested_days = (ed - sd).days + 1

		if accepted_count >= 2:
			return Response(
				{'detail': 'Vous avez déjà utilisé vos 2 fractions de congé annuel pour cette année.'},
				status=status.HTTP_400_BAD_REQUEST
			)

		if accepted_count == 1:
			days_taken = sum((lr.end_date - lr.start_date).days + 1 for lr in accepted_annual)
			days_remaining = leave_type.nbrJoursDroit - days_taken
			if days_remaining <= 0:
				return Response(
					{'detail': 'Votre solde de congé annuel est épuisé pour cette année.'},
					status=status.HTTP_400_BAD_REQUEST
				)
			if requested_days != days_remaining:
				return Response(
					{
						'detail': f'Pour votre 2ème fraction de congé annuel, vous devez demander exactement {days_remaining} jour(s) restant(s).',
						'code': 'ANNUAL_EXACT_REMAINING',
						'days_remaining': days_remaining,
					},
					status=status.HTTP_400_BAD_REQUEST
				)

	is_drh_user = is_drh(request.user)
	is_rh_user = is_any_rh(request.user)
	is_unlimited = leave_type.nbrJoursDroit == 0

	# DRH: auto-accept immediately — no validation needed
	if is_drh_user:
		jours = Decimal((ed - sd).days + 1)
		leave = LeaveRequest.objects.create(
			employee=emp,
			start_date=sd,
			end_date=ed,
			type=leave_type,
			reason=reason,
			attachment=request.FILES.get('attachment') or None,
			status=LeaveRequest.Status.ACCEPTED,
			decided_by=request.user,
			decided_at=timezone.now(),
		)
		if not is_unlimited:
			solde, _ = SoldeConge.get_or_create_balance(emp, leave_type, sd.year)
			solde.debiter(jours)
		return Response({'id': leave.id}, status=status.HTTP_201_CREATED)

	leave = LeaveRequest.objects.create(
		employee=emp,
		start_date=sd,
		end_date=ed,
		type=leave_type,
		reason=reason,
		attachment=request.FILES.get('attachment') or None,
		status=LeaveRequest.Status.PENDING,
	)

	if is_rh_user:
		# RH (non-DRH): single step — GRH validates
		step = ValidationWorkflow.objects.create(
			leave_request=leave,
			validation_order=1,
			validator_role=RoleChoices.GRH,
			is_active=True,
		)
		_notify_step_validators(leave, step)
	else:
		# Regular employee / chef: 2-step workflow
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
			'created_at': l.created_at.isoformat() if l.created_at else None,
			'workflow': _serialize_workflow(l),
		}
		for l in qs
	]
	return Response(data)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def update_my_leave(request, pk):
	"""Allow an employee to modify their own pending leave request."""
	try:
		emp = Employee.objects.get(email=request.user.email)
	except Employee.DoesNotExist:
		return Response({'detail': 'employee record not found'}, status=status.HTTP_400_BAD_REQUEST)

	try:
		leave = LeaveRequest.objects.select_related('type').get(id=pk, employee=emp)
	except LeaveRequest.DoesNotExist:
		return Response({'detail': 'leave request not found'}, status=status.HTTP_404_NOT_FOUND)

	if leave.status != LeaveRequest.Status.PENDING:
		return Response({'detail': 'only pending leave requests can be modified'}, status=status.HTTP_400_BAD_REQUEST)

	ltype_code = _normalize_leave_type_code(request.data.get('type', leave.type.code))
	start_date = request.data.get('start_date', leave.start_date.isoformat())
	end_date = request.data.get('end_date', leave.end_date.isoformat())
	reason = request.data.get('reason', leave.reason or '')

	leave_type = LeaveType.objects.filter(code=ltype_code).first()
	if not leave_type:
		return Response({'detail': 'invalid leave type'}, status=status.HTTP_400_BAD_REQUEST)

	try:
		sd = date.fromisoformat(start_date)
		ed = date.fromisoformat(end_date)
	except Exception:
		return Response({'detail': 'invalid date format, use YYYY-MM-DD'}, status=status.HTTP_400_BAD_REQUEST)

	if ed < sd:
		return Response({'detail': 'end_date must be the same or after start_date'}, status=status.HTTP_400_BAD_REQUEST)

	if leave_type.justificatifRequis and not request.FILES.get('attachment') and not leave.attachment:
		return Response({'detail': 'attachment required for this leave type'}, status=status.HTTP_400_BAD_REQUEST)

	if leave_type.delaiPreavis and (sd - date.today()).days < leave_type.delaiPreavis:
		earliest_date = date.today() + timedelta(days=leave_type.delaiPreavis)
		return Response(
			{
				'detail': f"délai de préavis non respecté : {leave_type.delaiPreavis} jour(s) requis",
				'code': 'NOTICE_PERIOD_NOT_RESPECTED',
				'required_notice_days': leave_type.delaiPreavis,
				'earliest_start_date': earliest_date.isoformat(),
			},
			status=status.HTTP_400_BAD_REQUEST
		)

	leave.type = leave_type
	leave.start_date = sd
	leave.end_date = ed
	leave.reason = reason
	if request.FILES.get('attachment'):
		leave.attachment = request.FILES.get('attachment')
	leave.save()

	return Response({'id': leave.id, 'detail': 'leave request updated'})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def cancel_my_leave(request, pk):
	"""Allow an employee to cancel their own pending leave request."""
	try:
		emp = Employee.objects.get(email=request.user.email)
	except Employee.DoesNotExist:
		return Response({'detail': 'employee record not found'}, status=status.HTTP_400_BAD_REQUEST)

	try:
		leave = LeaveRequest.objects.get(id=pk, employee=emp)
	except LeaveRequest.DoesNotExist:
		return Response({'detail': 'leave request not found'}, status=status.HTTP_404_NOT_FOUND)

	if leave.status != LeaveRequest.Status.PENDING:
		return Response({'detail': 'only pending leave requests can be canceled'}, status=status.HTTP_400_BAD_REQUEST)

	leave.delete()
	return Response({'detail': 'leave request canceled'})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def department_pending_leaves(request):
	"""List leaves visible to current validator role, with workflow metadata."""
	drh = is_drh(request.user)
	is_chef = (
		not drh and (
			request.user.role == RoleChoices.CHEF or
			(request.user.service != ServiceChoices.HR and
			 request.user.get_employee_role() == EmployeeRoleChoices.CHEF)
		)
	)
	is_rh_conge = drh or is_conge_rh(request.user)

	if not is_chef and not is_rh_conge:
		return Response({'detail': 'forbidden'}, status=status.HTTP_403_FORBIDDEN)

	qs = LeaveRequest.objects.select_related('employee', 'type', 'decided_by').prefetch_related('validation_workflow__validator')

	if is_chef:
		try:
			chef_emp = Employee.objects.get(email=request.user.email)
		except Employee.DoesNotExist:
			return Response({'detail': 'validator has no Employee record'}, status=status.HTTP_400_BAD_REQUEST)
		if not chef_emp.service_id:
			return Response([], status=status.HTTP_200_OK)
		qs = qs.filter(
			Q(employee__service_id=chef_emp.service_id) |
			Q(validation_workflow__validator=request.user)
		)
	elif is_drh(request.user):
		# DRH sees both GRH-step (RH employee requests) and RH_SIMPLE-step (employee requests)
		qs = qs.filter(validation_workflow__validator_role__in=[
			RoleChoices.RH_SIMPLE, RoleChoices.RH_AGENT, RoleChoices.GRH
		])
	else:
		# Regular RH Congé: only sees employee leaves at RH_SIMPLE step
		qs = qs.filter(validation_workflow__validator_role__in=[
			RoleChoices.RH_SIMPLE, RoleChoices.RH_AGENT
		])

	qs = qs.order_by('-created_at').distinct()
	data = [
		{
			'id': l.id,
			'employee_email': l.employee.email,
			'employee': {
				'email': l.employee.email,
				'first_name': l.employee.first_name,
				'last_name': l.employee.last_name,
				'service': l.employee.service.nomService if l.employee.service else None,
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
			'decided_by': _display_name_for_user(l.decided_by),
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

	if not _role_matches(current_step.validator_role, request.user):
		return Response({'detail': 'forbidden'}, status=status.HTTP_403_FORBIDDEN)

	user_is_chef = (
		request.user.role == RoleChoices.CHEF or
		(request.user.service != ServiceChoices.HR and
		 request.user.get_employee_role() == EmployeeRoleChoices.CHEF)
	)
	if user_is_chef:
		try:
			chef_emp = Employee.objects.get(email=request.user.email)
		except Employee.DoesNotExist:
			return Response({'detail': 'validator has no employee record'}, status=status.HTTP_400_BAD_REQUEST)
		if lr.employee.service_id != chef_emp.service_id:
			return Response({'detail': 'forbidden'}, status=status.HTTP_403_FORBIDDEN)

	comment = request.data.get('comment', '')
	if accept:
		pending_steps = ValidationWorkflow.objects.filter(
			leave_request=lr,
			decision=ValidationWorkflow.Decision.PENDING,
		)
		is_last_step = pending_steps.count() == 1

		is_unlimited = lr.type.nbrJoursDroit == 0

		if is_last_step and not is_unlimited:
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

		if not is_unlimited:
			jours = Decimal((lr.end_date - lr.start_date).days + 1)
			solde, _ = SoldeConge.get_or_create_balance(lr.employee, lr.type, lr.start_date.year)
			solde.debiter(jours)

		lr.status = LeaveRequest.Status.ACCEPTED
		lr.decided_by = request.user
		lr.decided_at = timezone.now()
		lr.save(update_fields=['status', 'decided_by', 'decided_at', 'chef_comment'])

		emp_user = User.objects.filter(email=lr.employee.email).first()
		if emp_user:
			notify(
				emp_user,
				'Conge approuve',
				f'Votre demande de conge du {lr.start_date} au {lr.end_date} a ete approuvee.',
				link='/conge'
			)

		return Response({'id': lr.id, 'status': lr.status, 'detail': 'Demande de conge approuvee avec succes.'})

	current_step.reject(request.user, comment)
	ValidationWorkflow.objects.filter(leave_request=lr, decision=ValidationWorkflow.Decision.PENDING).update(is_active=False)
	lr.chef_comment = comment
	lr.decided_by = request.user
	lr.decided_at = timezone.now()
	lr.status = LeaveRequest.Status.REFUSED
	lr.save(update_fields=['chef_comment', 'decided_by', 'decided_at', 'status'])

	emp_user = User.objects.filter(email=lr.employee.email).first()
	if emp_user:
		notify(
			emp_user,
			'Conge refuse',
			f'Votre demande de conge du {lr.start_date} au {lr.end_date} a ete refusee.',
			link='/conge'
		)

	return Response({'id': lr.id, 'status': lr.status, 'detail': 'Demande de conge refusee.'})


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
	from ..models import Employee
	emp = Employee.objects.filter(email=request.user.email).first()
	emp_sexe = emp.sexe if emp else 'HOMME'

	types = LeaveType.objects.order_by('code')
	data = []
	for lt in types:
		# Skip gender-restricted types that don't match employee
		if lt.sexeAutorise == 'FEMME' and emp_sexe != 'FEMME':
			continue
		if lt.sexeAutorise == 'HOMME' and emp_sexe != 'HOMME':
			continue
		data.append({
			'code': lt.code,
			'label': lt.libelle,
			'requires_attachment': lt.justificatifRequis,
			'notice_days': lt.delaiPreavis,
		})
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

	# Annual leave: count accepted fractions this year
	accepted_annual = list(LeaveRequest.objects.filter(
		employee=emp,
		type__code='CA',
		status=LeaveRequest.Status.ACCEPTED,
		start_date__year=current_year,
	))
	annual_fractions_used = len(accepted_annual)
	annual_days_taken = sum((lr.end_date - lr.start_date).days + 1 for lr in accepted_annual)

	data = []
	for b in balances:
		entry = {
			'id': b.id,
			'type_code': b.leaveType.code,
			'type_label': b.leaveType.libelle,
			'nbrJoursDroit': b.leaveType.nbrJoursDroit,
			'joursAcquis': str(b.joursAcquis),
			'joursPris': str(b.joursPris),
			'joursReportes': str(b.joursReportes),
			'joursRestants': str(b.joursRestants),
			'annee': b.annee,
		}
		if b.leaveType.code == 'CA':
			entry['annual_fractions_used'] = annual_fractions_used
			entry['annual_days_taken'] = annual_days_taken
			entry['annual_days_remaining'] = b.leaveType.nbrJoursDroit - annual_days_taken
			entry['annual_can_request'] = annual_fractions_used < 2
			entry['annual_must_request_exact'] = annual_fractions_used == 1
		data.append(entry)
	return Response(data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def all_leaves_global(request):
	"""RH/GRH: list all leave requests across all employees with optional filters."""
	if not is_any_rh(request.user):
		return Response({'detail': 'forbidden'}, status=status.HTTP_403_FORBIDDEN)

	qs = LeaveRequest.objects.select_related('employee', 'employee__service', 'type', 'decided_by').order_by('-created_at')

	status_filter = request.query_params.get('status')
	if status_filter:
		qs = qs.filter(status=status_filter.upper())

	service_filter = request.query_params.get('service')
	if service_filter:
		qs = qs.filter(employee__service__nomService__icontains=service_filter)

	today = date.today()
	active_only = request.query_params.get('active')
	if active_only == '1':
		qs = qs.filter(start_date__lte=today, end_date__gte=today, status='ACCEPTED')

	data = [
		{
			'id': l.id,
			'employee': {
				'email': l.employee.email,
				'first_name': l.employee.first_name,
				'last_name': l.employee.last_name,
				'service': l.employee.service.nomService if l.employee.service else None,
			},
			'start_date': l.start_date.isoformat(),
			'end_date': l.end_date.isoformat(),
			'type': l.type.code,
			'type_label': l.type.libelle,
			'reason': l.reason,
			'status': l.status,
			'created_at': l.created_at.isoformat() if l.created_at else None,
			'decided_at': l.decided_at.isoformat() if l.decided_at else None,
			'decided_by': _display_name_for_user(l.decided_by),
		}
		for l in qs
	]
	return Response(data)


def _display_name_for_user(user):
	"""Return full name from Employee record, falling back to User name then email."""
	if not user:
		return None
	emp = Employee.objects.filter(email=user.email).first()
	if emp:
		name = f"{emp.first_name} {emp.last_name}".strip()
		if name:
			return name
	name = f"{user.first_name} {user.last_name}".strip()
	return name or user.email


def _role_matches(expected_role, user):
	"""Check if user can act on a workflow step with the given validator_role."""
	if expected_role == RoleChoices.GRH:
		return is_drh(user)
	if expected_role in {RoleChoices.RH_SIMPLE, RoleChoices.RH_AGENT}:
		return is_conge_rh(user)
	return expected_role == getattr(user, 'role', None)


def _get_current_pending_step(leave_request):
	return (
		leave_request.validation_workflow
		.filter(decision=ValidationWorkflow.Decision.PENDING)
		.order_by('validation_order')
		.first()
	)


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
	if not _role_matches(step.validator_role, user):
		return False
	user_is_chef = (
		user.role == RoleChoices.CHEF or
		(user.service != ServiceChoices.HR and
		 user.get_employee_role() == EmployeeRoleChoices.CHEF)
	)
	if user_is_chef:
		chef_emp = Employee.objects.filter(email=user.email).first()
		if not chef_emp:
			return False
		return chef_emp.service_id == leave_request.employee.service_id
	return True


def _notify_step_validators(leave_request, step):
	if step.validator_role == RoleChoices.CHEF:
		emails = Employee.objects.filter(service=leave_request.employee.service).values_list('email', flat=True)
		validators = User.objects.filter(role=RoleChoices.CHEF, email__in=emails)
	elif step.validator_role == RoleChoices.GRH:
		# DRH/GRH must validate this step (RH employee leave or escalated)
		drh_emails = Employee.objects.filter(role=EmployeeRoleChoices.DRH).values_list('email', flat=True)
		validators = User.objects.filter(
			Q(role=RoleChoices.GRH) | Q(email__in=drh_emails)
		).distinct()
	elif step.validator_role == RoleChoices.RH_SIMPLE:
		old_validators = User.objects.filter(role__in=[RoleChoices.RH_SIMPLE, RoleChoices.RH_AGENT, RoleChoices.GRH])
		conge_emails = Employee.objects.filter(
			role__in=[EmployeeRoleChoices.RH_CONGE, EmployeeRoleChoices.DRH]
		).values_list('email', flat=True)
		new_validators = User.objects.filter(email__in=conge_emails)
		validators = (old_validators | new_validators).distinct()
	else:
		validators = User.objects.none()

	for validator_user in validators:
		notify(
			validator_user,
			'Validation de conge requise',
			f"La demande de conge de {leave_request.employee.first_name} {leave_request.employee.last_name} attend votre validation a l'etape {step.validation_order}.",
			link='/chef/leaves' if step.validator_role == RoleChoices.CHEF else '/notifications'
		)
