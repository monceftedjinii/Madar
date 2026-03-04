from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.conf import settings
from django.utils import timezone
from ..permissions import IsGRH
from ..models import Employee
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView


def is_user_online(user):
	if not user or not user.last_seen:
		return False
	window_seconds = getattr(settings, 'ONLINE_WINDOW_SECONDS', 300)
	return (timezone.now() - user.last_seen).total_seconds() <= window_seconds


class ActiveTokenObtainPairSerializer(TokenObtainPairSerializer):
	def validate(self, attrs):
		data = super().validate(attrs)
		self.user.last_seen = timezone.now()
		self.user.save(update_fields=['last_seen'])
		return data


class ActiveTokenObtainPairView(TokenObtainPairView):
	serializer_class = ActiveTokenObtainPairSerializer


token_obtain_pair = ActiveTokenObtainPairView.as_view()


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
		'phone_number': employee.phone_number if employee else None,
		'address': employee.address if employee else None,
		'profile_picture': user_picture or employee_picture,
		'is_online': is_user_online(user),
	})
