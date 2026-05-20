from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from django.db.models import Q
from ..models import (
    FormationRequest, FormationCatalog, RoleChoices, Employee,
    FormationParticipant, ServiceChoices, EmployeeRoleChoices, User, Notification, Message
)
from ..permissions import is_formation_rh


def _is_chef(user):
    return (
        user.role == RoleChoices.CHEF or
        (user.service != ServiceChoices.HR and user.get_employee_role() == EmployeeRoleChoices.CHEF)
    )


def _notify(user, title, message, link=''):
    Notification.objects.create(user=user, title=title, message=message, link=link)


def _serialize_request(r):
    item = {
        'id': r.id,
        'nom': r.nom,
        'description': r.description,
        'reasons': r.reasons,
        'people_count': r.people_count,
        'status': r.status,
        'status_label': r.get_status_display(),
        'created_at': r.created_at.isoformat(),
        'updated_at': r.updated_at.isoformat(),
        'requested_by_email': r.requested_by.email,
        'requested_by_name': f"{r.requested_by.first_name} {r.requested_by.last_name}".strip() or r.requested_by.email,
    }
    try:
        emp = Employee.objects.select_related('service').get(email=r.requested_by.email)
        item['service'] = emp.service.nomService if emp.service else None
    except Employee.DoesNotExist:
        item['service'] = None

    if r.approved_formation:
        item['approved_formation'] = {
            'id': r.approved_formation.id,
            'name': r.approved_formation.name,
            'duration_hours': r.approved_formation.duration_hours,
            'company_name': r.approved_formation.company_name,
        }
    else:
        item['approved_formation'] = None

    item['participants'] = [
        {
            'id': p.employee.id,
            'name': f"{p.employee.first_name} {p.employee.last_name}",
            'email': p.employee.email,
        }
        for p in r.participants.all()
    ]
    return item


# ── Chef endpoints ──────────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def formation_list(request):
    """Chef: list own formation requests."""
    if not _is_chef(request.user):
        return Response({'detail': 'Chefs only'}, status=status.HTTP_403_FORBIDDEN)
    qs = (FormationRequest.objects
          .filter(requested_by=request.user)
          .select_related('approved_formation', 'requested_by')
          .prefetch_related('participants__employee')
          .order_by('-created_at'))
    return Response([_serialize_request(r) for r in qs])


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_formation_request(request):
    """Chef: submit a formation request with participants in one step."""
    if not _is_chef(request.user):
        return Response({'detail': 'Chefs only'}, status=status.HTTP_403_FORBIDDEN)

    nom = (request.data.get('nom') or '').strip()
    description = (request.data.get('description') or '').strip()
    reasons = (request.data.get('reasons') or '').strip()
    people_count_raw = request.data.get('people_count', 1)
    employee_ids = request.data.get('employee_ids', [])

    if not nom or not description:
        return Response({'detail': 'nom et description sont obligatoires.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        people_count = int(people_count_raw)
    except (TypeError, ValueError):
        return Response({'detail': 'people_count doit être un entier.'}, status=status.HTTP_400_BAD_REQUEST)

    # Validate employees belong to chef's team
    try:
        chef_emp = Employee.objects.select_related('service').get(email=request.user.email)
    except Employee.DoesNotExist:
        return Response({'detail': 'Profil employé introuvable.'}, status=status.HTTP_400_BAD_REQUEST)

    team = Employee.objects.filter(service=chef_emp.service, is_active=True).exclude(email=request.user.email)
    team_size = team.count()

    if people_count < 1 or people_count > team_size:
        return Response(
            {'detail': f'people_count doit être entre 1 et {team_size}.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    if len(employee_ids) != people_count:
        return Response(
            {'detail': f'Vous devez sélectionner exactement {people_count} employé(s).'},
            status=status.HTTP_400_BAD_REQUEST
        )

    valid_employees = team.filter(id__in=employee_ids)
    if valid_employees.count() != people_count:
        return Response({'detail': 'Certains employés sélectionnés sont invalides.'}, status=status.HTTP_400_BAD_REQUEST)

    req = FormationRequest.objects.create(
        requested_by=request.user,
        nom=nom,
        description=description,
        reasons=reasons,
        people_count=people_count,
        status=FormationRequest.Status.PENDING,
    )

    for emp in valid_employees:
        FormationParticipant.objects.create(formation_request=req, employee=emp)

    # Notify RH Formation users
    rh_formation_users = User.objects.filter(
        Q(role__in=[RoleChoices.RH_AGENT, RoleChoices.GRH]) |
        Q(service=ServiceChoices.HR)
    ).distinct()
    for u in rh_formation_users:
        _notify(
            u,
            'Nouvelle demande de formation',
            f"{chef_emp.first_name} {chef_emp.last_name} a soumis une demande de formation : {nom} ({people_count} personne(s)).",
            '/rh/formations'
        )

    return Response(_serialize_request(req), status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def formation_detail(request, pk):
    try:
        req = FormationRequest.objects.select_related('approved_formation', 'requested_by').prefetch_related('participants__employee').get(id=pk)
    except FormationRequest.DoesNotExist:
        return Response({'detail': 'Introuvable.'}, status=status.HTTP_404_NOT_FOUND)
    if req.requested_by != request.user and not is_formation_rh(request.user):
        return Response({'detail': 'Non autorisé.'}, status=status.HTTP_403_FORBIDDEN)
    return Response(_serialize_request(req))


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_department_employees(request):
    """Chef: get team members for participant selection."""
    if not _is_chef(request.user):
        return Response({'detail': 'Chefs only'}, status=status.HTTP_403_FORBIDDEN)
    try:
        chef_emp = Employee.objects.select_related('service').get(email=request.user.email)
    except Employee.DoesNotExist:
        return Response({'detail': 'Profil introuvable.'}, status=status.HTTP_404_NOT_FOUND)

    team = Employee.objects.filter(service=chef_emp.service, is_active=True).exclude(email=request.user.email)
    return Response([
        {'id': e.id, 'name': f"{e.first_name} {e.last_name}", 'email': e.email, 'position': e.position.name if e.position else ''}
        for e in team
    ])


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def add_formation_participants(request, pk):
    """Legacy endpoint — kept for compatibility."""
    return Response({'detail': 'Use create_formation_request instead.'}, status=status.HTTP_400_BAD_REQUEST)


# ── RH Formation endpoints ──────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def agent_formation_requests(request):
    """RH Formation: list all formation requests."""
    if not is_formation_rh(request.user):
        return Response({'detail': 'RH Formation only'}, status=status.HTTP_403_FORBIDDEN)
    qs = (FormationRequest.objects
          .select_related('approved_formation', 'requested_by')
          .prefetch_related('participants__employee')
          .order_by('-created_at'))
    return Response([_serialize_request(r) for r in qs])


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def agent_formations_catalog(request):
    """RH: list/search catalog or create a new formation."""
    if not is_formation_rh(request.user):
        return Response({'detail': 'RH Formation only'}, status=status.HTTP_403_FORBIDDEN)

    if request.method == 'GET':
        q = (request.GET.get('search') or '').strip()
        qs = FormationCatalog.objects.all()
        if q:
            qs = qs.filter(Q(name__icontains=q) | Q(company_name__icontains=q))
        return Response([{
            'id': f.id, 'name': f.name, 'company_name': f.company_name,
            'duration_hours': f.duration_hours, 'people_required': f.people_required,
            'company_email': f.company_email, 'company_phone': f.company_phone,
            'company_address': f.company_address,
        } for f in qs.order_by('-created_at')])

    # POST — create
    name = (request.data.get('name') or '').strip()
    company_name = (request.data.get('company_name') or '').strip()
    company_email = (request.data.get('company_email') or '').strip()
    company_phone = (request.data.get('company_phone') or '').strip()
    company_address = (request.data.get('company_address') or '').strip()
    try:
        duration_hours = int(request.data.get('duration_hours', 0))
        people_required = int(request.data.get('people_required', 1))
    except (TypeError, ValueError):
        return Response({'detail': 'Champs numériques invalides.'}, status=status.HTTP_400_BAD_REQUEST)

    if not all([name, company_name, company_email, company_phone, company_address]) or duration_hours <= 0:
        return Response({'detail': 'Tous les champs sont obligatoires.'}, status=status.HTTP_400_BAD_REQUEST)

    f = FormationCatalog.objects.create(
        name=name, company_name=company_name, duration_hours=duration_hours,
        people_required=people_required, company_email=company_email,
        company_phone=company_phone, company_address=company_address,
        created_by=request.user,
    )
    return Response({'id': f.id, 'name': f.name, 'company_name': f.company_name,
                     'duration_hours': f.duration_hours, 'people_required': f.people_required,
                     'company_email': f.company_email, 'company_phone': f.company_phone,
                     'company_address': f.company_address}, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def approve_formation_request(request, pk):
    """RH Formation: assign a catalog formation → status APPROVED (Validé)."""
    if not is_formation_rh(request.user):
        return Response({'detail': 'RH Formation only'}, status=status.HTTP_403_FORBIDDEN)

    try:
        req = FormationRequest.objects.select_related('approved_formation', 'requested_by').get(id=pk)
    except FormationRequest.DoesNotExist:
        return Response({'detail': 'Demande introuvable.'}, status=status.HTTP_404_NOT_FOUND)

    if req.status not in [FormationRequest.Status.PENDING, FormationRequest.Status.WAITING_FOR_PEOPLE]:
        return Response({'detail': 'Cette demande ne peut pas être validée.'}, status=status.HTTP_400_BAD_REQUEST)

    formation_id = request.data.get('formation_id')
    if not formation_id:
        return Response({'detail': 'formation_id est obligatoire.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        formation = FormationCatalog.objects.get(id=formation_id)
    except FormationCatalog.DoesNotExist:
        return Response({'detail': 'Formation introuvable.'}, status=status.HTTP_404_NOT_FOUND)

    req.approved_formation = formation
    req.status = FormationRequest.Status.APPROVED
    req.save()

    sender = request.user
    formation_name = formation.name
    company = formation.company_name
    duration = formation.duration_hours

    # 1. Message to each participant
    participants = req.participants.select_related('employee').all()
    participant_names = []
    for p in participants:
        participant_names.append(f"{p.employee.first_name} {p.employee.last_name}")
        participant_user = User.objects.filter(email=p.employee.email).first()
        if participant_user:
            Message.objects.create(
                sender=sender,
                recipient=participant_user,
                subject=f"Formation : {formation_name}",
                body=(
                    f"Bonjour {p.employee.first_name},\n\n"
                    f"Vous avez été sélectionné(e) pour participer à la formation suivante :\n\n"
                    f"📚 Formation : {formation_name}\n"
                    f"🏢 Organisme : {company}\n"
                    f"⏱ Durée : {duration} heures\n\n"
                    f"Les détails concernant la date, le lieu et le programme vous seront communiqués prochainement.\n\n"
                    f"Cordialement,\nService RH — MADAR Holding"
                ),
            )

    # 2. Message to chef
    chef_name = f"{req.requested_by.first_name} {req.requested_by.last_name}".strip() or req.requested_by.email
    Message.objects.create(
        sender=sender,
        recipient=req.requested_by,
        subject=f"Demande de formation validée — {formation_name}",
        body=(
            f"Bonjour {chef_name},\n\n"
            f"Votre demande de formation « {req.nom} » a été validée.\n\n"
            f"📚 Formation assignée : {formation_name}\n"
            f"🏢 Organisme : {company}\n"
            f"⏱ Durée : {duration} heures\n"
            f"👥 Participants informés ({len(participant_names)}) : {', '.join(participant_names)}\n\n"
            f"Des messages ont été envoyés à vos employés. "
            f"Les détails (date, lieu, programme) leur seront communiqués prochainement.\n\n"
            f"Cordialement,\nService RH — MADAR Holding"
        ),
    )

    # 3. Bell notification to chef
    _notify(
        req.requested_by,
        'Demande de formation validée',
        f"Votre demande « {req.nom} » a été validée — Formation : {formation_name}.",
        '/chef/formations'
    )

    return Response(_serialize_request(req))


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def reject_formation_request(request, pk):
    """RH Formation: refuse a request → status REJECTED."""
    if not is_formation_rh(request.user):
        return Response({'detail': 'RH Formation only'}, status=status.HTTP_403_FORBIDDEN)

    try:
        req = FormationRequest.objects.select_related('requested_by').get(id=pk)
    except FormationRequest.DoesNotExist:
        return Response({'detail': 'Demande introuvable.'}, status=status.HTTP_404_NOT_FOUND)

    req.status = FormationRequest.Status.REJECTED
    req.save()

    # Notify chef
    reason = (request.data.get('reason') or '').strip()
    msg = f"Votre demande de formation « {req.nom} » a été refusée."
    if reason:
        msg += f" Motif : {reason}"
    _notify(req.requested_by, 'Demande de formation refusée', msg, '/chef/formations')

    return Response(_serialize_request(req))


@api_view(['PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def update_delete_formation_catalog(request, pk):
    if not is_formation_rh(request.user):
        return Response({'detail': 'RH Formation only'}, status=status.HTTP_403_FORBIDDEN)
    try:
        f = FormationCatalog.objects.get(id=pk)
    except FormationCatalog.DoesNotExist:
        return Response({'detail': 'Formation introuvable.'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'DELETE':
        f.delete()
        return Response({'detail': 'Supprimée.'})

    name = (request.data.get('name') or '').strip()
    company_name = (request.data.get('company_name') or '').strip()
    company_email = (request.data.get('company_email') or '').strip()
    company_phone = (request.data.get('company_phone') or '').strip()
    company_address = (request.data.get('company_address') or '').strip()
    try:
        duration_hours = int(request.data.get('duration_hours', 0))
        people_required = int(request.data.get('people_required', 1))
    except (TypeError, ValueError):
        return Response({'detail': 'Champs numériques invalides.'}, status=status.HTTP_400_BAD_REQUEST)

    if not all([name, company_name, company_email, company_phone, company_address]):
        return Response({'detail': 'Tous les champs sont obligatoires.'}, status=status.HTTP_400_BAD_REQUEST)

    f.name = name
    f.company_name = company_name
    f.duration_hours = duration_hours
    f.people_required = people_required
    f.company_email = company_email
    f.company_phone = company_phone
    f.company_address = company_address
    f.save()
    return Response({'id': f.id, 'name': f.name})
