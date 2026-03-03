from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from rest_framework.parsers import MultiPartParser, FormParser
from django.db import transaction
from ..models import User, Employee


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_profile(request):
    """Get current user's profile information"""
    user = request.user
    
    profile_data = {
        'id': user.id,
        'email': user.email,
        'first_name': user.first_name,
        'last_name': user.last_name,
        'role': user.role,
        'profile_picture': request.build_absolute_uri(user.profile_picture.url) if user.profile_picture else None,
        'employee_info': None
    }
    
    # Try to get employee information if this user is linked to an employee
    try:
        employee = Employee.objects.get(user=user)
        profile_data['employee_info'] = {
            'id': employee.id,
            'phone_number': employee.phone_number,
            'address': employee.address,
            'date_of_birth': employee.date_of_birth,
            'hire_date': employee.hire_date,
            'salary': employee.salary,
            'position': employee.position,
            'department': {
                'id': employee.department.id,
                'name': employee.department.name,
                'description': employee.department.description
            } if employee.department else None
        }
    except Employee.DoesNotExist:
        pass
    
    return Response(profile_data)


@api_view(['PUT', 'PATCH'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser])
def update_profile(request):
    """Update current user's profile information"""
    user = request.user
    
    try:
        with transaction.atomic():
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
            
            # Update employee info if exists and data provided
            try:
                employee = Employee.objects.get(user=user)
                
                if 'phone_number' in request.data:
                    employee.phone_number = request.data['phone_number']
                if 'address' in request.data:
                    employee.address = request.data['address']
                
                # Update employee profile picture to match user
                if 'profile_picture' in request.FILES:
                    if employee.profile_picture:
                        employee.profile_picture.delete(save=False)
                    employee.profile_picture = request.FILES['profile_picture']
                
                employee.save()
            except Employee.DoesNotExist:
                pass
            
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
