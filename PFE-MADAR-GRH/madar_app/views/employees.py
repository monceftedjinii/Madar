from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from ..models import Department, Employee, User
from ..permissions import IsGRH
from ..scopes import employee_queryset_for
import secrets
from datetime import date as date_type


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def employees_list(request):
	qs = employee_queryset_for(request.user)
	data = [
		{
			'id': e.id,
			'first_name': e.first_name,
			'last_name': e.last_name,
			'email': e.email,
			'department': {
				'id': e.department.id,
				'name': e.department.name,
			} if e.department else None,
		}
		for e in qs.order_by('id')
	]
	return Response(data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def departments_list(request):
	data = [
		{'id': d.id, 'name': d.name}
		for d in Department.objects.order_by('name')
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
	
	# Create User first (so signal sees it exists)
	temp_password = secrets.token_urlsafe(12)
	user = User.objects.create_user(
		email=email,
		password=temp_password,
		role='employee'
	)
	print(f"[API] Created User account for {email}")
	
	# Create Employee (signal will check and skip User creation)
	try:
		employee = Employee.objects.create(
			first_name=first_name,
			last_name=last_name,
			email=email,
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
			'email': employee.email,
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
