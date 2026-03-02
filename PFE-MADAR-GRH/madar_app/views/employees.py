from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from ..models import Department
from ..scopes import employee_queryset_for


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
