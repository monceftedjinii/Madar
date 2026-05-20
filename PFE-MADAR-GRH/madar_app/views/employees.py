from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from django.conf import settings
from django.utils import timezone
from ..models import Service, Employee, Position, User, RoleChoices, EmployeeRoleChoices, ServiceChoices
from ..permissions import IsGRH, is_drh

_EMPLOYEE_ROLE_TO_USER_ROLE = {
	'EMPLOYEE': 'EMPLOYEE',
	'CHEF': 'CHEF',
	'RH': 'RH_SIMPLE',
	'RH_CONGE': 'RH_SIMPLE',
	'RH_FORMATION': 'RH_AGENT',
	'DRH': 'GRH',
}
_RH_EMPLOYEE_ROLES = {'RH', 'RH_CONGE', 'RH_FORMATION', 'DRH'}
from ..scopes import employee_queryset_for, employee_team_queryset_for
from ..models import Attendance
from datetime import date, timedelta
import secrets


def _is_user_online(user):
	if not user or not user.last_seen:
		return False
	window_seconds = getattr(settings, 'ONLINE_WINDOW_SECONDS', 300)
	return (timezone.now() - user.last_seen).total_seconds() <= window_seconds


def _resolve_position(position_value):
	if position_value in [None, '']:
		return None

	if isinstance(position_value, int) or (isinstance(position_value, str) and position_value.isdigit()):
		try:
			return Position.objects.get(id=int(position_value))
		except Position.DoesNotExist:
			return None

	if isinstance(position_value, str):
		return Position.objects.filter(name=position_value.strip()).first()

	return None


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def employees_list(request):
	# Check if this is for messaging (should return all employees for message recipients)
	for_messaging = request.query_params.get('for_messaging', 'false').lower() == 'true'
	
	include_inactive = request.query_params.get('include_inactive', 'false').lower() == 'true'

	if for_messaging:
		qs = Employee.objects.filter(is_active=True)
	elif include_inactive:
		qs = Employee.objects.filter(is_active=False)
	else:
		scope = request.query_params.get('scope', '').lower()
		if scope == 'team':
			qs = employee_team_queryset_for(request.user).filter(is_active=True)
		else:
			qs = employee_queryset_for(request.user).filter(is_active=True)

	employees = list(qs.order_by('id'))
	emails = [e.email for e in employees]
	users_by_email = {u.email: u for u in User.objects.filter(email__in=emails)}

	# Batch last-absence lookup for team scope (30-day lookback)
	is_team_scope = (not for_messaging) and (request.query_params.get('scope', '').lower() == 'team')
	last_absence_by_emp = {}
	if is_team_scope and employees:
		lookback = date.today() - timedelta(days=30)
		attended = {}
		for row in Attendance.objects.filter(
			employee__in=employees, date__gte=lookback
		).values('employee_id', 'date'):
			attended.setdefault(row['employee_id'], set()).add(row['date'])
		today_d = date.today()
		for emp in employees:
			emp_attended = attended.get(emp.id, set())
			d = today_d
			while d >= lookback:
				if d.weekday() < 5 and d not in emp_attended:
					last_absence_by_emp[emp.id] = d.isoformat()
					break
				d -= timedelta(days=1)

	data = []
	current_user_id = request.user.id

	for e in employees:
		related_user = users_by_email.get(e.email)
		employee_data = {
			'id': e.id,
			'first_name': e.first_name,
			'last_name': e.last_name,
			'sexe': e.sexe,
			'birth_date': e.birth_date.isoformat() if e.birth_date else None,
			'position': e.position.name if e.position else '',
			'position_id': e.position.id if e.position else None,
			'email': e.email,
			'is_online': _is_user_online(related_user),
			'role': related_user.role if related_user else None,
			'employee_role': e.role,
			'phone_number': e.phone_number if not for_messaging else None,
			'address': e.address if not for_messaging else None,
			'contract_type': e.contract_type if not for_messaging else None,
			'contract_file_url': (request.build_absolute_uri(e.contract_file.url) if e.contract_file and e.contract_file.name else None) if not for_messaging else None,
			'salary': str(e.salary) if not for_messaging else None,
			'hired_at': e.hired_at.isoformat() if e.hired_at else None,
			'is_active': e.is_active,
			'terminated_at': e.terminated_at.isoformat() if e.terminated_at else None,
			'attendance_pin': e.attendance_pin if not for_messaging else None,
			'service': {
				'code': e.service.code,
				'nomService': e.service.nomService,
			} if e.service else None,
			'last_absence': last_absence_by_emp.get(e.id) if is_team_scope else None,
		}
		
		# For messaging, find the User ID for this employee
		if for_messaging:
			try:
				user = related_user or User.objects.get(email=e.email)
				# Skip the current user by comparing IDs - can't message themselves
				if user.id == current_user_id:
					continue
				employee_data['user_id'] = user.id
				data.append(employee_data)
			except User.DoesNotExist:
				# For messaging, skip employees without User accounts
				continue
		else:
			data.append(employee_data)
	
	return Response(data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def services_list(request):
	data = [
		{
			'code': s.code,
			'nomService': s.nomService,
			'statut': s.statut,
			'is_rh_service': s.code == ServiceChoices.HR,
		}
		for s in Service.objects.order_by('code')
	]
	return Response(data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_service(request):
	"""Create a new service (DRH only)."""
	if not is_drh(request.user):
		return Response({'detail': 'DRH access required.'}, status=status.HTTP_403_FORBIDDEN)

	code = request.data.get('code', '').strip().upper()
	nom = request.data.get('nomService', '').strip()
	statut = request.data.get('statut', 'ACTIF').strip()

	if not code or not nom:
		return Response({'detail': 'code and nomService are required.'}, status=status.HTTP_400_BAD_REQUEST)

	if Service.objects.filter(code=code).exists():
		return Response({'detail': 'A service with this code already exists.'}, status=status.HTTP_400_BAD_REQUEST)

	from decimal import Decimal
	service = Service.objects.create(code=code, nomService=nom, statut=statut, budget=Decimal('0'))
	return Response({'code': service.code, 'nomService': service.nomService, 'statut': service.statut}, status=status.HTTP_201_CREATED)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def update_service(request, code):
	"""Update a service name or status (DRH only)."""
	if not is_drh(request.user):
		return Response({'detail': 'DRH access required.'}, status=status.HTTP_403_FORBIDDEN)

	try:
		service = Service.objects.get(code=code)
	except Service.DoesNotExist:
		return Response({'detail': 'Service not found.'}, status=status.HTTP_404_NOT_FOUND)

	nom = request.data.get('nomService', '').strip()
	statut = request.data.get('statut', '').strip()

	if nom:
		service.nomService = nom
	if statut in ('ACTIF', 'INACTIF'):
		service.statut = statut

	service.save()
	return Response({'code': service.code, 'nomService': service.nomService, 'statut': service.statut})


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_service(request, code):
	"""Delete a service (DRH only)."""
	if not is_drh(request.user):
		return Response({'detail': 'DRH access required.'}, status=status.HTTP_403_FORBIDDEN)

	try:
		service = Service.objects.get(code=code)
	except Service.DoesNotExist:
		return Response({'detail': 'Service not found.'}, status=status.HTTP_404_NOT_FOUND)

	if service.code == 'HR':
		return Response({'detail': 'Le service RH est le service par défaut et ne peut pas être supprimé.'}, status=status.HTTP_400_BAD_REQUEST)

	if Employee.objects.filter(service=service).exists():
		return Response({'detail': 'Cannot delete a service that still has employees.'}, status=status.HTTP_400_BAD_REQUEST)

	service.delete()
	return Response({'detail': 'Service deleted.'}, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def positions_list(request):
	service_code = request.query_params.get('service')
	qs = Position.objects.order_by('name')
	if service_code:
		qs = qs.filter(service__code=service_code)
	data = [
		{'id': p.id, 'name': p.name, 'service': p.service.code if p.service else None}
		for p in qs
	]
	return Response(data)


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsGRH])
def create_position(request):
	"""GRH: create a new position linked to a service."""
	name = request.data.get('name', '').strip()
	service_code = request.data.get('service_code', '').strip()
	if not name or not service_code:
		return Response({'detail': 'name and service_code are required'}, status=status.HTTP_400_BAD_REQUEST)
	try:
		service = Service.objects.get(code=service_code)
	except Service.DoesNotExist:
		return Response({'detail': 'Service not found'}, status=status.HTTP_404_NOT_FOUND)
	if Position.objects.filter(name__iexact=name, service=service).exists():
		return Response({'detail': 'Ce poste existe déjà pour ce service'}, status=status.HTTP_400_BAD_REQUEST)
	pos = Position.objects.create(name=name, service=service)
	return Response({'id': pos.id, 'name': pos.name, 'service': service_code}, status=status.HTTP_201_CREATED)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated, IsGRH])
def delete_position(request, pk):
	"""GRH: delete a position."""
	try:
		pos = Position.objects.get(pk=pk)
	except Position.DoesNotExist:
		return Response({'detail': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
	if pos.employees.exists():
		return Response({'detail': 'Impossible de supprimer un poste assigné à des employés'}, status=status.HTTP_400_BAD_REQUEST)
	pos.delete()
	return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsGRH])
def create_employee(request):
	"""Create a new employee and auto-generate login credentials (GRH only)."""
	first_name = request.data.get('first_name', '').strip()
	last_name = request.data.get('last_name', '').strip()
	email = request.data.get('email', '').strip().lower()
	sexe = request.data.get('sexe', 'HOMME').strip().upper()
	birth_date_str = request.data.get('birth_date', '').strip()
	service_code = request.data.get('service')
	position_value = request.data.get('position', '')
	phone_number = request.data.get('phone_number', '').strip()
	address = request.data.get('address', '').strip()
	contract_type = request.data.get('contract_type', 'CDI')
	salary = request.data.get('salary', '0.00')
	attendance_pin = request.data.get('attendance_pin', '')
	employee_role = request.data.get('employee_role', EmployeeRoleChoices.EMPLOYEE).strip()
	if sexe not in ('HOMME', 'FEMME'):
		sexe = 'HOMME'
	birth_date = None
	if birth_date_str:
		try:
			birth_date = date.fromisoformat(birth_date_str)
		except ValueError:
			pass

	# Validation
	if not all([first_name, last_name, email, service_code]):
		return Response(
			{'detail': 'first_name, last_name, email, service required'},
			status=status.HTTP_400_BAD_REQUEST
		)

	# Validate employee_role
	valid_employee_roles = [r.value for r in EmployeeRoleChoices]
	if employee_role not in valid_employee_roles:
		return Response(
			{'detail': f'employee_role invalide. Valeurs acceptées: {", ".join(valid_employee_roles)}'},
			status=status.HTTP_400_BAD_REQUEST
		)

	user_role = _EMPLOYEE_ROLE_TO_USER_ROLE.get(employee_role, 'EMPLOYEE')
	user_service = ServiceChoices.HR if employee_role in _RH_EMPLOYEE_ROLES else service_code

	# Validate salary is numeric
	try:
		float(salary)
	except (ValueError, TypeError):
		return Response({'detail': 'salary must be a number'}, status=status.HTTP_400_BAD_REQUEST)
	
	# Check if email already exists
	if Employee.objects.filter(email=email).exists():
		return Response({'detail': 'Employee with this email already exists'}, 
						status=status.HTTP_400_BAD_REQUEST)
	
	if User.objects.filter(email=email).exists():
		return Response({'detail': 'User with this email already exists'}, 
						status=status.HTTP_400_BAD_REQUEST)
	
	# Validate contract_type
	if contract_type not in ['CDD', 'CDI', 'STAGE']:
		return Response({'detail': 'contract_type must be CDD, CDI, or STAGE'}, 
						status=status.HTTP_400_BAD_REQUEST)
	
	# Get service
	try:
		service = Service.objects.get(code=service_code)
	except Service.DoesNotExist:
		return Response({'detail': 'Service not found'}, 
						status=status.HTTP_400_BAD_REQUEST)

	position = _resolve_position(position_value)
	if position_value not in [None, ''] and not position:
		return Response({'detail': 'Position not found. Please create it in admin first.'}, status=status.HTTP_400_BAD_REQUEST)
	
	# Create User first (so signal sees it exists)
	temp_password = secrets.token_urlsafe(12)
	user = User.objects.create_user(
		email=email,
		password=temp_password,
		role=user_role,
		service=user_service,
	)
	print(f"[API] Created User account for {email}")

	# Create Employee (signal will check and skip User creation)
	try:
		employee = Employee.objects.create(
			first_name=first_name,
			last_name=last_name,
			email=email,
			sexe=sexe,
			birth_date=birth_date,
			position=position,
			phone_number=phone_number,
			address=address,
			contract_type=contract_type,
			contract_file=request.FILES.get('contract_file') or None,
			service=service,
			salary=salary,
			attendance_pin=attendance_pin,
			role=employee_role,
		)
		print(f"[API] Created Employee {email}")
	except Exception as e:
		# If Employee creation fails, delete the User
		user.delete()
		print(f"[API] Failed to create Employee: {str(e)}")
		return Response({'detail': f'Failed to create employee: {str(e)}'}, 
						status=status.HTTP_400_BAD_REQUEST)
	
	return Response({
		'success': True,
		'employee': {
			'id': employee.id,
			'first_name': employee.first_name,
			'last_name': employee.last_name,
			'position': employee.position.name if employee.position else '',
			'position_id': employee.position.id if employee.position else None,
			'email': employee.email,
			'birth_date': employee.birth_date.isoformat() if employee.birth_date else None,
			'phone_number': employee.phone_number,
			'address': employee.address,
			'contract_type': employee.contract_type,
			'hired_at': employee.hired_at.isoformat(),
			'service': service.nomService,
		},
		'user': {
			'id': user.id,
			'email': user.email,
		},
		'credentials': {
			'email': email,
			'temporary_password': temp_password,
			'message': f'Employee created successfully. Share these credentials with the employee to log in.'
		}
	}, status=status.HTTP_201_CREATED)


@api_view(['PUT', 'PATCH'])
@permission_classes([IsAuthenticated, IsGRH])
def update_employee(request, pk):
	"""Update employee information (GRH only)."""
	try:
		employee = Employee.objects.get(id=pk)
	except Employee.DoesNotExist:
		return Response({'detail': 'Employee not found'}, status=status.HTTP_404_NOT_FOUND)

	first_name = request.data.get('first_name', employee.first_name).strip()
	last_name = request.data.get('last_name', employee.last_name).strip()
	email = request.data.get('email', employee.email).strip().lower()
	sexe = request.data.get('sexe', employee.sexe).strip().upper()
	if sexe not in ('HOMME', 'FEMME'):
		sexe = employee.sexe
	birth_date_str = request.data.get('birth_date', '')
	if birth_date_str:
		try:
			birth_date = date.fromisoformat(str(birth_date_str).strip())
		except ValueError:
			birth_date = employee.birth_date
	else:
		birth_date = employee.birth_date
	new_employee_role = request.data.get('employee_role', employee.role or 'EMPLOYEE').strip()
	valid_employee_roles = [r.value for r in EmployeeRoleChoices]
	if new_employee_role not in valid_employee_roles:
		new_employee_role = employee.role or 'EMPLOYEE'
	position_value = request.data.get('position', employee.position_id)
	phone_number = request.data.get('phone_number', employee.phone_number).strip()
	address = request.data.get('address', employee.address).strip()
	contract_type = request.data.get('contract_type', employee.contract_type)
	service_code = request.data.get('service', employee.service_id)
	salary = request.data.get('salary', employee.salary)
	attendance_pin = request.data.get('attendance_pin', employee.attendance_pin)

	if not all([first_name, last_name, email, service_code]):
		return Response(
			{'detail': 'first_name, last_name, email, service required'},
			status=status.HTTP_400_BAD_REQUEST
		)

	# Validate salary
	try:
		float(salary)
	except (ValueError, TypeError):
		return Response({'detail': 'salary must be a number'}, status=status.HTTP_400_BAD_REQUEST)

	# Validate contract_type
	if contract_type not in ['CDD', 'CDI', 'STAGE']:
		return Response({'detail': 'contract_type must be CDD, CDI, or STAGE'}, 
						status=status.HTTP_400_BAD_REQUEST)

	# Validate service
	try:
		service = Service.objects.get(code=service_code)
	except Service.DoesNotExist:
		return Response({'detail': 'Service not found'}, status=status.HTTP_400_BAD_REQUEST)

	position = _resolve_position(position_value)
	if position_value not in [None, ''] and not position:
		return Response({'detail': 'Position not found. Please create it in admin first.'}, status=status.HTTP_400_BAD_REQUEST)

	# Email uniqueness check (exclude current employee)
	if Employee.objects.filter(email=email).exclude(id=employee.id).exists():
		return Response({'detail': 'Employee with this email already exists'}, status=status.HTTP_400_BAD_REQUEST)

	# If email changed, keep User in sync and check user email conflicts
	old_email = employee.email
	if old_email != email:
		if User.objects.filter(email=email).exclude(email=old_email).exists():
			return Response({'detail': 'User with this email already exists'}, status=status.HTTP_400_BAD_REQUEST)

		related_user = User.objects.filter(email=old_email).first()
		if related_user:
			related_user.email = email
			related_user.save(update_fields=['email'])

	employee.first_name = first_name
	employee.last_name = last_name
	employee.email = email
	employee.sexe = sexe
	employee.birth_date = birth_date
	employee.role = new_employee_role
	employee.position = position
	employee.phone_number = phone_number
	employee.address = address
	employee.contract_type = contract_type
	if request.FILES.get('contract_file'):
		employee.contract_file = request.FILES.get('contract_file')
	employee.service = service
	employee.salary = salary
	employee.attendance_pin = attendance_pin or ''
	employee.save()

	# Sync User.role and User.service
	related_user = User.objects.filter(email=employee.email).first()
	if related_user:
		related_user.role = _EMPLOYEE_ROLE_TO_USER_ROLE.get(new_employee_role, 'EMPLOYEE')
		related_user.service = ServiceChoices.HR if new_employee_role in _RH_EMPLOYEE_ROLES else (employee.service_id or None)
		related_user.save(update_fields=['role', 'service'])

	return Response({
		'success': True,
		'employee': {
			'id': employee.id,
			'first_name': employee.first_name,
			'last_name': employee.last_name,
			'position': employee.position.name if employee.position else '',
			'position_id': employee.position.id if employee.position else None,
			'email': employee.email,
			'phone_number': employee.phone_number,
			'address': employee.address,
			'contract_type': employee.contract_type,
			'contract_file_url': request.build_absolute_uri(employee.contract_file.url) if employee.contract_file and employee.contract_file.name else None,
			'service': {
				'code': employee.service.code,
				'nomService': employee.service.nomService,
			},
			'salary': str(employee.salary),
			'hired_at': employee.hired_at.isoformat(),
		}
	})


@api_view(['DELETE'])
@permission_classes([IsAuthenticated, IsGRH])
def delete_employee(request, pk):
	"""Delete employee and linked user account (GRH only)."""
	try:
		employee = Employee.objects.get(id=pk)
	except Employee.DoesNotExist:
		return Response({'detail': 'Employee not found'}, status=status.HTTP_404_NOT_FOUND)

	email = employee.email
	employee.delete()

	# Also remove linked User account if it exists
	related_user = User.objects.filter(email=email).first()
	if related_user:
		related_user.delete()

	return Response({'success': True, 'detail': 'Employee deleted successfully'})


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsGRH])
def terminate_employee(request, pk):
	"""Mark employee as terminated (fin de contrat) — keeps record."""
	try:
		employee = Employee.objects.get(id=pk)
	except Employee.DoesNotExist:
		return Response({'detail': 'Employé introuvable.'}, status=status.HTTP_404_NOT_FOUND)

	# Verify DRH PIN
	pin = request.data.get('pin', '').strip()
	if pin:
		emp_profile = Employee.objects.filter(email=request.user.email).first()
		if not emp_profile or emp_profile.attendance_pin != pin:
			return Response({'detail': 'PIN incorrect.'}, status=status.HTTP_403_FORBIDDEN)

	from django.utils import timezone as tz
	employee.is_active = False
	employee.terminated_at = tz.localdate()
	employee.save(update_fields=['is_active', 'terminated_at'])

	# Disable linked user account
	related_user = User.objects.filter(email=employee.email).first()
	if related_user:
		related_user.is_active = False
		related_user.save(update_fields=['is_active'])

	return Response({'success': True, 'detail': f'{employee.first_name} {employee.last_name} marqué comme ancien employé.'})


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsGRH])
def reset_employee_password(request, pk):
	"""Generate and set a new temporary password for employee user account (GRH only)."""
	try:
		employee = Employee.objects.get(id=pk)
	except Employee.DoesNotExist:
		return Response({'detail': 'Employee not found'}, status=status.HTTP_404_NOT_FOUND)

	user = User.objects.filter(email=employee.email).first()
	if not user:
		# Recreate user if missing
		temp_password = secrets.token_urlsafe(12)
		user = User.objects.create_user(
			email=employee.email,
			password=temp_password,
			role=RoleChoices.EMPLOYEE
		)
		return Response({
			'success': True,
			'detail': 'User account was missing and has been recreated',
			'credentials': {
				'email': user.email,
				'temporary_password': temp_password,
			}
		})

	new_password = secrets.token_urlsafe(12)
	user.set_password(new_password)
	user.save(update_fields=['password'])

	return Response({
		'success': True,
		'detail': 'Password reset successfully',
		'credentials': {
			'email': user.email,
			'temporary_password': new_password,
		}
	})


@api_view(['PATCH'])
@permission_classes([IsAuthenticated, IsGRH])
def update_employee_role(request, pk):
	"""Update the role of the User account linked to an employee (GRH only)."""
	try:
		employee = Employee.objects.get(id=pk)
	except Employee.DoesNotExist:
		return Response({'detail': 'Employee not found'}, status=status.HTTP_404_NOT_FOUND)

	new_employee_role = request.data.get('employee_role', '').strip()
	valid_employee_roles = [r.value for r in EmployeeRoleChoices]
	if new_employee_role not in valid_employee_roles:
		return Response(
			{'detail': f'employee_role invalide. Valeurs acceptées: {", ".join(valid_employee_roles)}'},
			status=status.HTTP_400_BAD_REQUEST
		)

	user = User.objects.filter(email=employee.email).first()
	if not user:
		return Response({'detail': 'Aucun compte utilisateur lié à cet employé.'}, status=status.HTTP_404_NOT_FOUND)

	employee.role = new_employee_role
	employee.save(update_fields=['role'])

	user.role = _EMPLOYEE_ROLE_TO_USER_ROLE.get(new_employee_role, 'EMPLOYEE')
	user.service = ServiceChoices.HR if new_employee_role in _RH_EMPLOYEE_ROLES else (employee.service_id or None)
	user.save(update_fields=['role', 'service'])

	return Response({
		'success': True,
		'detail': 'Rôle mis à jour avec succès.',
		'employee_role': new_employee_role,
	})
