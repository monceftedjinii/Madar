from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from django.db.models import Q
from ..models import FormationRequest, FormationCatalog, RoleChoices, Employee, FormationParticipant, Department


def _is_agent_or_grh(user):
    return user.role in [RoleChoices.RH_AGENT, RoleChoices.GRH]


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def formation_list(request):
    """Get all formation requests (for current authenticated user)."""
    # Chefs can see their own formation requests
    if request.user.role == RoleChoices.CHEF:
        requests = FormationRequest.objects.filter(requested_by=request.user).select_related('approved_formation').prefetch_related('participants__employee').order_by('-created_at')
    else:
        # Others can't access formation requests
        return Response({'detail': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)
    
    data = []
    for r in requests:
        item = {
            'id': r.id,
            'nom': r.nom,
            'description': r.description,
            'reasons': r.reasons,
            'status': r.status,
            'status_label': r.get_status_display(),
            'created_at': r.created_at.isoformat(),
            'updated_at': r.updated_at.isoformat(),
        }
        if r.approved_formation:
            item['approved_formation'] = {
                'id': r.approved_formation.id,
                'name': r.approved_formation.name,
                'people_required': r.approved_formation.people_required,
            }
        item['participants'] = [
            {
                'id': p.employee.id,
                'name': f"{p.employee.first_name} {p.employee.last_name}",
                'email': p.employee.email,
            }
            for p in r.participants.all()
        ]
        data.append(item)
    return Response(data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_formation_request(request):
    """Create a new formation request (Chef only)."""
    if request.user.role != RoleChoices.CHEF:
        return Response({'detail': 'Only Chefs can request formations'}, status=status.HTTP_403_FORBIDDEN)
    
    nom = request.data.get('nom', '').strip()
    description = request.data.get('description', '').strip()
    reasons = request.data.get('reasons', '').strip()
    
    if not nom or not description:
        return Response(
            {'detail': 'nom and description are required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    formation_req = FormationRequest.objects.create(
        requested_by=request.user,
        nom=nom,
        description=description,
        reasons=reasons,
        status=FormationRequest.Status.PENDING
    )
    
    return Response({
        'id': formation_req.id,
        'nom': formation_req.nom,
        'description': formation_req.description,
        'reasons': formation_req.reasons,
        'status': formation_req.status,
        'status_label': formation_req.get_status_display(),
        'created_at': formation_req.created_at.isoformat(),
    }, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def formation_detail(request, pk):
    """Get a specific formation request."""
    try:
        formation_req = FormationRequest.objects.get(id=pk)
    except FormationRequest.DoesNotExist:
        return Response({'detail': 'Formation request not found'}, status=status.HTTP_404_NOT_FOUND)
    
    # Only the requester can view their request
    if formation_req.requested_by != request.user:
        return Response({'detail': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)
    
    return Response({
        'id': formation_req.id,
        'nom': formation_req.nom,
        'description': formation_req.description,
        'reasons': formation_req.reasons,
        'status': formation_req.status,
        'status_label': formation_req.get_status_display(),
        'created_at': formation_req.created_at.isoformat(),
        'updated_at': formation_req.updated_at.isoformat(),
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def agent_formation_requests(request):
    """List formation requests for RH Agent / GRH."""
    if not _is_agent_or_grh(request.user):
        return Response({'detail': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)

    requests = FormationRequest.objects.select_related('requested_by', 'approved_formation').prefetch_related('participants__employee').order_by('-created_at')
    data = []
    for r in requests:
        # Lookup department via Employee email match
        department_name = None
        try:
            employee = Employee.objects.select_related('department').get(email=r.requested_by.email)
            department_name = employee.department.name
        except Employee.DoesNotExist:
            pass
        
        item = {
            'id': r.id,
            'nom': r.nom,
            'description': r.description,
            'reasons': r.reasons,
            'status': r.status,
            'status_label': r.get_status_display(),
            'requested_by_email': r.requested_by.email,
            'department': department_name,
            'created_at': r.created_at.isoformat(),
            'updated_at': r.updated_at.isoformat(),
        }
        if r.approved_formation:
            item['approved_formation'] = {
                'id': r.approved_formation.id,
                'name': r.approved_formation.name,
                'people_required': r.approved_formation.people_required,
            }
        item['participants'] = [
            {
                'id': p.employee.id,
                'name': f"{p.employee.first_name} {p.employee.last_name}",
                'email': p.employee.email,
            }
            for p in r.participants.all()
        ]
        data.append(item)
    return Response(data)


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def agent_formations_catalog(request):
    """List/search and create catalog formations for RH Agent / GRH."""
    if not _is_agent_or_grh(request.user):
        return Response({'detail': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)

    if request.method == 'GET':
        search = (request.GET.get('search') or '').strip()
        formations = FormationCatalog.objects.all()
        if search:
            formations = formations.filter(
                Q(name__icontains=search)
                | Q(company_name__icontains=search)
                | Q(company_email__icontains=search)
                | Q(company_phone__icontains=search)
                | Q(company_address__icontains=search)
            )

        data = [
            {
                'id': f.id,
                'name': f.name,
                'company_name': f.company_name,
                'duration_hours': f.duration_hours,
                'people_required': f.people_required,
                'company_email': f.company_email,
                'company_phone': f.company_phone,
                'company_address': f.company_address,
                'created_at': f.created_at.isoformat(),
            }
            for f in formations.order_by('-created_at')
        ]
        return Response(data)

    name = (request.data.get('name') or '').strip()
    company_name = (request.data.get('company_name') or '').strip()
    duration_hours_raw = request.data.get('duration_hours')
    people_required_raw = request.data.get('people_required', 1)
    company_email = (request.data.get('company_email') or '').strip()
    company_phone = (request.data.get('company_phone') or '').strip()
    company_address = (request.data.get('company_address') or '').strip()

    if not all([name, company_name, company_email, company_phone, company_address]):
        return Response({'detail': 'All fields are required'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        duration_hours = int(duration_hours_raw)
        people_required = int(people_required_raw)
    except (TypeError, ValueError):
        return Response({'detail': 'duration_hours and people_required must be valid numbers'}, status=status.HTTP_400_BAD_REQUEST)

    if duration_hours <= 0 or people_required <= 0:
        return Response({'detail': 'duration_hours and people_required must be greater than 0'}, status=status.HTTP_400_BAD_REQUEST)

    formation = FormationCatalog.objects.create(
        name=name,
        company_name=company_name,
        duration_hours=duration_hours,
        people_required=people_required,
        company_email=company_email,
        company_phone=company_phone,
        company_address=company_address,
        created_by=request.user,
    )

    return Response(
        {
            'id': formation.id,
            'name': formation.name,
            'company_name': formation.company_name,
            'duration_hours': formation.duration_hours,
            'people_required': formation.people_required,
            'company_email': formation.company_email,
            'company_phone': formation.company_phone,
            'company_address': formation.company_address,
            'created_at': formation.created_at.isoformat(),
        },
        status=status.HTTP_201_CREATED,
    )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def approve_formation_request(request, pk):
    """Approve a formation request with a selected formation."""
    if not _is_agent_or_grh(request.user):
        return Response({'detail': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        formation_request = FormationRequest.objects.get(id=pk)
    except FormationRequest.DoesNotExist:
        return Response({'detail': 'Request not found'}, status=status.HTTP_404_NOT_FOUND)
    
    formation_id = request.data.get('formation_id')
    if not formation_id:
        return Response({'detail': 'formation_id is required'}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        formation = FormationCatalog.objects.get(id=formation_id)
    except FormationCatalog.DoesNotExist:
        return Response({'detail': 'Formation not found'}, status=status.HTTP_404_NOT_FOUND)
    
    formation_request.status = FormationRequest.Status.WAITING_FOR_PEOPLE
    formation_request.approved_formation = formation
    formation_request.save()
    
    return Response({'detail': 'Request approved, waiting for people list'})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def reject_formation_request(request, pk):
    """Reject a formation request."""
    if not _is_agent_or_grh(request.user):
        return Response({'detail': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        formation_request = FormationRequest.objects.get(id=pk)
    except FormationRequest.DoesNotExist:
        return Response({'detail': 'Request not found'}, status=status.HTTP_404_NOT_FOUND)
    
    formation_request.status = FormationRequest.Status.REJECTED
    formation_request.save()
    
    return Response({'detail': 'Request rejected'})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_department_employees(request):
    """Get employees from chef's department."""
    if request.user.role != RoleChoices.CHEF:
        return Response({'detail': 'Only chefs can access this'}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        chef_employee = Employee.objects.select_related('department').get(email=request.user.email)
    except Employee.DoesNotExist:
        return Response({'detail': 'Chef employee record not found'}, status=status.HTTP_404_NOT_FOUND)
    
    employees = Employee.objects.filter(department=chef_employee.department).exclude(id=chef_employee.id)
    
    data = [
        {
            'id': e.id,
            'name': f"{e.first_name} {e.last_name}",
            'email': e.email,
        }
        for e in employees
    ]
    
    return Response(data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def add_formation_participants(request, pk):
    """Add participants to a formation request."""
    if request.user.role != RoleChoices.CHEF:
        return Response({'detail': 'Only chefs can add participants'}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        formation_request = FormationRequest.objects.select_related('approved_formation').get(id=pk, requested_by=request.user)
    except FormationRequest.DoesNotExist:
        return Response({'detail': 'Request not found'}, status=status.HTTP_404_NOT_FOUND)
    
    if formation_request.status != FormationRequest.Status.WAITING_FOR_PEOPLE:
        return Response({'detail': 'Request is not in waiting for people status'}, status=status.HTTP_400_BAD_REQUEST)
    
    employee_ids = request.data.get('employee_ids', [])
    if not employee_ids:
        return Response({'detail': 'employee_ids is required'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Get chef's department
    try:
        chef_employee = Employee.objects.select_related('department').get(email=request.user.email)
    except Employee.DoesNotExist:
        return Response({'detail': 'Chef employee record not found'}, status=status.HTTP_404_NOT_FOUND)
    
    # Verify employees are in same department
    employees = Employee.objects.filter(id__in=employee_ids, department=chef_employee.department)
    
    # Add participants
    for emp in employees:
        FormationParticipant.objects.get_or_create(
            formation_request=formation_request,
            employee=emp
        )
    
    # Check if we have enough participants
    current_count = formation_request.participants.count()
    required_count = formation_request.approved_formation.people_required if formation_request.approved_formation else 0
    
    if current_count >= required_count:
        formation_request.status = FormationRequest.Status.APPROVED
        formation_request.save()
    
    return Response({
        'detail': 'Participants added',
        'current_count': current_count,
        'required_count': required_count,
        'is_complete': current_count >= required_count,
    })


@api_view(['PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def update_delete_formation_catalog(request, pk):
    """Update or delete a formation from the catalog."""
    if not _is_agent_or_grh(request.user):
        return Response({'detail': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        formation = FormationCatalog.objects.get(id=pk)
    except FormationCatalog.DoesNotExist:
        return Response({'detail': 'Formation not found'}, status=status.HTTP_404_NOT_FOUND)
    
    if request.method == 'DELETE':
        formation.delete()
        return Response({'detail': 'Formation deleted successfully'})
    
    # PUT - Update formation
    name = (request.data.get('name') or '').strip()
    company_name = (request.data.get('company_name') or '').strip()
    duration_hours_raw = request.data.get('duration_hours')
    people_required_raw = request.data.get('people_required')
    company_email = (request.data.get('company_email') or '').strip()
    company_phone = (request.data.get('company_phone') or '').strip()
    company_address = (request.data.get('company_address') or '').strip()

    if not all([name, company_name, company_email, company_phone, company_address]):
        return Response({'detail': 'All fields are required'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        duration_hours = int(duration_hours_raw)
        people_required = int(people_required_raw)
    except (TypeError, ValueError):
        return Response({'detail': 'duration_hours and people_required must be valid numbers'}, status=status.HTTP_400_BAD_REQUEST)

    if duration_hours <= 0 or people_required <= 0:
        return Response({'detail': 'duration_hours and people_required must be greater than 0'}, status=status.HTTP_400_BAD_REQUEST)

    formation.name = name
    formation.company_name = company_name
    formation.duration_hours = duration_hours
    formation.people_required = people_required
    formation.company_email = company_email
    formation.company_phone = company_phone
    formation.company_address = company_address
    formation.save()

    return Response({
        'id': formation.id,
        'name': formation.name,
        'company_name': formation.company_name,
        'duration_hours': formation.duration_hours,
        'people_required': formation.people_required,
        'company_email': formation.company_email,
        'company_phone': formation.company_phone,
        'company_address': formation.company_address,
        'created_at': formation.created_at.isoformat(),
    })
