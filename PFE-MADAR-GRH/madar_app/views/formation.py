from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from ..models import FormationRequest, RoleChoices


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
