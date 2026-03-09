from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from rest_framework.parsers import MultiPartParser, FormParser
from django.db import transaction
from django.conf import settings
from django.utils import timezone
from ..models import User, Employee


def _employee_for_user(user):
    return Employee.objects.filter(email=user.email).select_related('service', 'position').first()


def _is_user_online(user):
    if not user or not user.last_seen:
        return False
    window_seconds = getattr(settings, 'ONLINE_WINDOW_SECONDS', 300)
    return (timezone.now() - user.last_seen).total_seconds() <= window_seconds


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_profile(request):
    """Get current user's profile information"""
    user = request.user
    employee = _employee_for_user(user)

    first_name = user.first_name or (employee.first_name if employee else '')
    last_name = user.last_name or (employee.last_name if employee else '')
    
    profile_data = {
        'id': user.id,
        'email': user.email,
        'first_name': first_name,
        'last_name': last_name,
        'role': user.role,
        'is_online': _is_user_online(user),
        'profile_picture': request.build_absolute_uri(user.profile_picture.url) if user.profile_picture else None,
        'employee_info': None
    }
    
    if employee:
        profile_data['employee_info'] = {
            'id': employee.id,
            'phone_number': employee.phone_number,
            'address': employee.address,
            'contract_type': employee.contract_type,
            'date_of_birth': None,
            'hire_date': employee.hired_at.isoformat() if employee.hired_at else None,
            'salary': str(employee.salary) if employee.salary is not None else None,
            'position': employee.position.name if employee.position else None,
            'is_online': _is_user_online(user),
            'service': {
                'code': employee.service.code,
                'nomService': employee.service.nomService,
                'description': None
            } if employee.service else None
        }
    
    return Response(profile_data)


@api_view(['PUT', 'PATCH'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser])
def update_profile(request):
    """Update current user's profile information"""
    user = request.user
    
    try:
        with transaction.atomic():
            employee = _employee_for_user(user)

            # Update user fields
            if 'first_name' in request.data:
                user.first_name = request.data['first_name']
            if 'last_name' in request.data:
                user.last_name = request.data['last_name']
            
            # Handle profile picture upload
            if 'profile_picture' in request.FILES:
                # Delete old profile picture if exists
                if user.profile_picture:
                    user.profile_picture.delete(save=False)
                user.profile_picture = request.FILES['profile_picture']
            
            user.save()
            
            # Keep Employee names/picture in sync when linked by email
            if employee:
                if 'first_name' in request.data:
                    employee.first_name = request.data['first_name']
                if 'last_name' in request.data:
                    employee.last_name = request.data['last_name']
                if 'phone_number' in request.data:
                    employee.phone_number = request.data['phone_number']
                if 'address' in request.data:
                    employee.address = request.data['address']

                if 'profile_picture' in request.FILES:
                    if employee.profile_picture:
                        employee.profile_picture.delete(save=False)
                    employee.profile_picture = request.FILES['profile_picture']

                employee.save()
            
            # Return updated profile
            profile_data = {
                'id': user.id,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'role': user.role,
                'profile_picture': request.build_absolute_uri(user.profile_picture.url) if user.profile_picture else None,
            }
            
            return Response({
                'message': 'Profile updated successfully',
                'profile': profile_data
            })
            
    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_400_BAD_REQUEST
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_password(request):
    """Change password for current authenticated user."""
    user = request.user

    current_password = request.data.get('current_password', '')
    new_password = request.data.get('new_password', '')
    confirm_password = request.data.get('confirm_password', '')

    if not current_password or not new_password or not confirm_password:
        return Response({'detail': 'current_password, new_password, confirm_password are required'}, status=status.HTTP_400_BAD_REQUEST)

    if not user.check_password(current_password):
        return Response({'detail': 'Current password is incorrect'}, status=status.HTTP_400_BAD_REQUEST)

    if new_password != confirm_password:
        return Response({'detail': 'New password and confirmation do not match'}, status=status.HTTP_400_BAD_REQUEST)

    if len(new_password) < 8:
        return Response({'detail': 'New password must be at least 8 characters'}, status=status.HTTP_400_BAD_REQUEST)

    if current_password == new_password:
        return Response({'detail': 'New password must be different from current password'}, status=status.HTTP_400_BAD_REQUEST)

    user.set_password(new_password)
    user.save(update_fields=['password'])

    return Response({'success': True, 'detail': 'Password changed successfully'})
