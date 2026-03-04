from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from django.db.models import Q
from ..models import FormationRequest, FormationCatalog, RoleChoices, Employee


def _is_agent_or_grh(user):
    return user.role in [RoleChoices.RH_AGENT, RoleChoices.GRH]


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def formation_list(request):
    """Get all formation requests (for current authenticated user)."""
    # Chefs can see their own formation requests
    if request.user.role == RoleChoices.CHEF:
        requests = FormationRequest.objects.filter(requested_by=request.user).order_by('-created_at')
    else:
        # Others can't access formation requests
        return Response({'detail': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)
    
    data = [
        {
            'id': r.id,
            'nom': r.nom,
            'description': r.description,
            'reasons': r.reasons,
            'status': r.status,
            'status_label': r.get_status_display(),
            'created_at': r.created_at.isoformat(),
            'updated_at': r.updated_at.isoformat(),
        }
        for r in requests
    ]
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

    requests = FormationRequest.objects.select_related('requested_by').order_by('-created_at')
    data = []
    for r in requests:
        # Lookup department via Employee email match
        department_name = None
        try:
            employee = Employee.objects.select_related('department').get(email=r.requested_by.email)
            department_name = employee.department.name
        except Employee.DoesNotExist:
            pass
        
        data.append({
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
        })
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
    company_email = (request.data.get('company_email') or '').strip()
    company_phone = (request.data.get('company_phone') or '').strip()
    company_address = (request.data.get('company_address') or '').strip()

    if not all([name, company_name, company_email, company_phone, company_address]):
        return Response({'detail': 'All fields are required'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        duration_hours = int(duration_hours_raw)
    except (TypeError, ValueError):
        return Response({'detail': 'duration_hours must be a valid number'}, status=status.HTTP_400_BAD_REQUEST)

    if duration_hours <= 0:
        return Response({'detail': 'duration_hours must be greater than 0'}, status=status.HTTP_400_BAD_REQUEST)

    formation = FormationCatalog.objects.create(
        name=name,
        company_name=company_name,
        duration_hours=duration_hours,
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
            'company_email': formation.company_email,
            'company_phone': formation.company_phone,
            'company_address': formation.company_address,
            'created_at': formation.created_at.isoformat(),
        },
        status=status.HTTP_201_CREATED,
    )
