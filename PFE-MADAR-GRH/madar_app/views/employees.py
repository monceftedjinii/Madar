from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from django.conf import settings
from django.utils import timezone
from ..models import Department, Employee, Position, User, RoleChoices
from ..permissions import IsGRH
from ..scopes import employee_queryset_for
import secrets
from datetime import date as date_type


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
	
	if for_messaging:
		# For messaging, return all employees so users can message anyone (except themselves)
		qs = Employee.objects.all()
	else:
		# Use normal scoped queryset for other purposes (tasks, leaves, etc.)
		qs = employee_queryset_for(request.user)

	employees = list(qs.order_by('id'))
	emails = [e.email for e in employees]
	users_by_email = {u.email: u for u in User.objects.filter(email__in=emails)}
	
	data = []
	current_user_id = request.user.id
	current_user_email = request.user.email
	
	for e in employees:
		related_user = users_by_email.get(e.email)
		employee_data = {
			'id': e.id,
			'first_name': e.first_name,
			'last_name': e.last_name,
			'position': e.position.name if e.position else '',
			'position_id': e.position.id if e.position else None,
			'email': e.email,
			'is_online': _is_user_online(related_user),
			'phone_number': e.phone_number if not for_messaging else None,
			'address': e.address if not for_messaging else None,
			'salary': str(e.salary) if not for_messaging else None,
			'hired_at': e.hired_at.isoformat() if e.hired_at else None,
			'attendance_pin': e.attendance_pin if not for_messaging else None,
			'department': {
				'id': e.department.id,
				'name': e.department.name,
			} if e.department else None,
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
def departments_list(request):
	data = [
		{'id': d.id, 'name': d.name}
		for d in Department.objects.order_by('name')
	]
	return Response(data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def positions_list(request):
	data = [
		{'id': p.id, 'name': p.name}
		for p in Position.objects.order_by('name')
	]
	return Response(data)


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsGRH])
def create_employee(request):
	"""Create a new employee and auto-generate login credentials (GRH only)."""
	first_name = request.data.get('first_name', '').strip()
	last_name = request.data.get('last_name', '').strip()
	email = request.data.get('email', '').strip().lower()
	department_id = request.data.get('department')
	position_value = request.data.get('position', '')
	phone_number = request.data.get('phone_number', '').strip()
	address = request.data.get('address', '').strip()
	salary = request.data.get('salary', '0.00')
	hired_at_str = request.data.get('hired_at')
	attendance_pin = request.data.get('attendance_pin', '')
	
	# Validation
	if not all([first_name, last_name, email, department_id]):
		return Response(
			{'detail': 'first_name, last_name, email, department required'}, 
			status=status.HTTP_400_BAD_REQUEST
		)
	
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
	
	# Parse hired_at date
	try:
		if hired_at_str:
			hired_at = date_type.fromisoformat(hired_at_str)
		else:
			hired_at = date_type.today()
	except (ValueError, TypeError):
		return Response({'detail': 'hired_at must be YYYY-MM-DD format'}, 
						status=status.HTTP_400_BAD_REQUEST)
	
	# Get department
	try:
		dept = Department.objects.get(id=department_id)
	except Department.DoesNotExist:
		return Response({'detail': 'Department not found'}, 
						status=status.HTTP_400_BAD_REQUEST)

	position = _resolve_position(position_value)
	if position_value not in [None, ''] and not position:
		return Response({'detail': 'Position not found. Please create it in admin first.'}, status=status.HTTP_400_BAD_REQUEST)
	
	# Create User first (so signal sees it exists)
	temp_password = secrets.token_urlsafe(12)
	user = User.objects.create_user(
		email=email,
		password=temp_password,
		role=RoleChoices.EMPLOYEE
	)
	print(f"[API] Created User account for {email}")
	
	# Create Employee (signal will check and skip User creation)
	try:
		employee = Employee.objects.create(
			first_name=first_name,
			last_name=last_name,
			email=email,
			position=position,
			phone_number=phone_number,
			address=address,
			department=dept,
			salary=salary,
			hired_at=hired_at,
			attendance_pin=attendance_pin
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
			'phone_number': employee.phone_number,
			'address': employee.address,
			'department': dept.name,
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
	position_value = request.data.get('position', employee.position_id)
	phone_number = request.data.get('phone_number', employee.phone_number).strip()
	address = request.data.get('address', employee.address).strip()
	department_id = request.data.get('department', employee.department_id)
	salary = request.data.get('salary', employee.salary)
	hired_at_str = request.data.get('hired_at', employee.hired_at.isoformat())
	attendance_pin = request.data.get('attendance_pin', employee.attendance_pin)

	if not all([first_name, last_name, email, department_id]):
		return Response(
			{'detail': 'first_name, last_name, email, department required'},
			status=status.HTTP_400_BAD_REQUEST
		)

	# Validate salary
	try:
		float(salary)
	except (ValueError, TypeError):
		return Response({'detail': 'salary must be a number'}, status=status.HTTP_400_BAD_REQUEST)

	# Validate date
	try:
		hired_at = date_type.fromisoformat(hired_at_str)
	except (ValueError, TypeError):
		return Response({'detail': 'hired_at must be YYYY-MM-DD format'}, status=status.HTTP_400_BAD_REQUEST)

	# Validate department
	try:
		dept = Department.objects.get(id=department_id)
	except Department.DoesNotExist:
		return Response({'detail': 'Department not found'}, status=status.HTTP_400_BAD_REQUEST)

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
	employee.position = position
	employee.phone_number = phone_number
	employee.address = address
	employee.department = dept
	employee.salary = salary
	employee.hired_at = hired_at
	employee.attendance_pin = attendance_pin or ''
	employee.save()

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
			'department': {
				'id': employee.department.id,
				'name': employee.department.name,
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
