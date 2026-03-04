from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from ..permissions import IsGRH
from ..models import Employee


@api_view(['GET'])
def ping(request):
	return Response({'ping': 'pong'})


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsGRH])
def rbac_test(request):
	role = getattr(request.user, 'role', None)
	return Response({'ok': True, 'role': role})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def whoami(request):
	user = request.user
	employee = Employee.objects.filter(email=user.email).select_related('department', 'position').first()
	first_name = user.first_name or (employee.first_name if employee else '')
	last_name = user.last_name or (employee.last_name if employee else '')
	user_picture = request.build_absolute_uri(user.profile_picture.url) if getattr(user, 'profile_picture', None) else None
	employee_picture = request.build_absolute_uri(employee.profile_picture.url) if employee and employee.profile_picture else None
	return Response({
		'id': user.id,
		'email': user.email,
		'role': getattr(user, 'role', None),
		'first_name': first_name,
		'last_name': last_name,
		'department': employee.department.name if employee and employee.department else None,
		'position': employee.position.name if employee and employee.position else None,
		'profile_picture': user_picture or employee_picture,
	})
