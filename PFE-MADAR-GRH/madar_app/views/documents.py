from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from django.utils import timezone
from django.db.models import Q, Prefetch
from django.http import FileResponse
import mimetypes
import os
from ..models import (
	Employee, User, RoleChoices, Service, ServiceChoices, EmployeeRoleChoices,
	Document, DocumentType, DocumentHistory,
	DocumentVersion, DocumentValidation, DocumentAccess
)
from ..permissions import CanUploadDocument, CanValidateDocument, is_any_rh, is_drh
from .helpers import notify, _display_name, _notify_service_users


# ──────────────────────────────────────────────────────────────────────────────
# Internal helpers
# ──────────────────────────────────────────────────────────────────────────────

def _create_doc_history(document, action, by_user, note='', parent=None, is_private=False):
	"""Create a document history / audit entry."""
	return DocumentHistory.objects.create(
		document=document,
		parent=parent,
		action=action,
		by_user=by_user,
		note=note,
		is_private=is_private,
	)


def _resolve_service(value):
	"""Resolve a service by code (string) or nomService."""
	if not value:
		return None
	if isinstance(value, str):
		# Try by code first
		service = Service.objects.filter(code=value).first()
		if service:
			return service
		# Fall back to name match
		return Service.objects.filter(nomService=value).first()
	return None


def _fallback_rh_service():
	"""Best-effort fallback service for RH-created documents."""
	for code in ['HR', 'RH', 'GRH', 'DRH']:
		service = Service.objects.filter(code__iexact=code).first()
		if service:
			return service
	service = Service.objects.filter(nomService__icontains='RH').order_by('code').first()
	if service:
		return service
	return Service.objects.order_by('code').first()


def _serialize_document(doc, request):
	"""Return a dict representation of a Document instance."""
	created_by_name = None
	if doc.created_by:
		name = f"{doc.created_by.first_name} {doc.created_by.last_name}".strip()
		created_by_name = name or doc.created_by.email
	if hasattr(doc, '_prefetched_current_version'):
		current_version = doc._prefetched_current_version[0] if doc._prefetched_current_version else None
	else:
		current_version = doc.current_version
	file_field = current_version.file_path if current_version and current_version.file_path else doc.file
	file_name = os.path.basename(file_field.name) if file_field else None
	return {
		'id': doc.id,
		'title': doc.title,
		'doc_type': doc.doc_type.name,
		'doc_type_category': doc.doc_type.category,
		'confidentiality_level': doc.confidentiality_level,
		'status': doc.status,
		'source_service': doc.source_service.nomService if doc.source_service else None,
		'target_service': doc.target_service.nomService if doc.target_service else None,
		'created_by': doc.created_by.email if doc.created_by else None,
		'created_by_name': created_by_name,
		'created_at': doc.created_at.isoformat() if doc.created_at else None,
		'sent_at': doc.sent_at.isoformat() if doc.sent_at else None,
		'file_url': request.build_absolute_uri(file_field.url) if file_field else None,
		'preview_url': request.build_absolute_uri(f'/api/documents/{doc.id}/preview/'),
		'file_name': file_name,
		'content_type': mimetypes.guess_type(file_name or '')[0] or 'application/octet-stream',
		'current_version': current_version.numVersion if current_version else None,
		'current_checksum': current_version.checksum if current_version else None,
	}


def _get_current_document_file(doc):
	current_version = doc.current_version
	if current_version and current_version.file_path:
		return current_version.file_path, current_version
	if doc.file:
		return doc.file, None
	return None, current_version


def _check_document_file_access(request, doc, action):
	ip_address = _get_client_ip(request)
	if _employee_public_access_required(request.user, doc):
		DocumentAccess.log_access(
			document=doc,
			user=request.user,
			action=action,
			ip_address=ip_address,
			result=False,
			details='Employees can only access public received documents',
		)
		return False, Response({'detail': 'forbidden'}, status=status.HTTP_403_FORBIDDEN)

	permission = DocumentAccess.check_permission(request.user, doc, action)
	if not permission['allowed']:
		DocumentAccess.log_access(
			document=doc,
			user=request.user,
			action=action,
			ip_address=ip_address,
			result=False,
			details=permission['reason'],
		)
		return False, Response({'detail': 'forbidden'}, status=status.HTTP_403_FORBIDDEN)

	return True, None


def _employee_public_access_required(user, document):
	"""Employees (non-chef, non-RH) can only access public received documents."""
	if not user:
		return False
	if document.created_by_id == user.id:
		return False
	if is_any_rh(user):
		return False
	# Chefs can see confidential docs for their service — handled by check_permission
	is_chef = (
		user.role == RoleChoices.CHEF or
		(user.service != ServiceChoices.HR and user.get_employee_role() == EmployeeRoleChoices.CHEF)
	)
	if is_chef:
		return False
	return document.confidentiality_level != Document.ConfidentialityLevel.PUBLIC


def _can_access_comments(user, document):
	"""Check whether a user can read/write comments on a document."""
	if _employee_public_access_required(user, document):
		return False
	if user.id == document.created_by_id:
		return True
	
	# CHEF role check (works for both old and new schema)
	is_chef = (
		user.role == RoleChoices.CHEF or  # old schema
		(user.service != ServiceChoices.HR and user.get_employee_role() == EmployeeRoleChoices.CHEF)  # new schema
	)
	if is_chef:
		try:
			chef_emp = Employee.objects.get(email=user.email)
			return (
				chef_emp.service_id == document.source_service_id or
				(document.target_service_id and chef_emp.service_id == document.target_service_id)
			)
		except Employee.DoesNotExist:
			return False
	
	if is_any_rh(user):
		return True
	
	# EMPLOYEE role check
	is_employee = (
		user.role == RoleChoices.EMPLOYEE or  # old schema
		(user.service != ServiceChoices.HR and user.get_employee_role() == EmployeeRoleChoices.EMPLOYEE)  # new schema
	)
	if is_employee:
		try:
			emp = Employee.objects.get(email=user.email)
			return (
				emp.service_id == document.source_service_id or
				(document.target_service_id and emp.service_id == document.target_service_id)
			)
		except Employee.DoesNotExist:
			return False
	return False


def _get_client_ip(request):
	"""Extract client IP address from request."""
	x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
	if x_forwarded_for:
		return x_forwarded_for.split(',')[0].strip()
	return request.META.get('REMOTE_ADDR')


def _employee_from_user(user):
	"""Resolve employee profile from user email."""
	if not user or not user.email:
		return None
	return Employee.objects.filter(email=user.email).first()


def _initialize_validation_workflow(document):
	"""Create a default two-step workflow (RH_SIMPLE -> GRH) if none exists."""
	if document.validations.exists():
		return

	validators = []
	rh_user = User.objects.filter(role=RoleChoices.RH_SIMPLE).order_by('id').first()
	if rh_user:
		rh_emp = _employee_from_user(rh_user)
		if rh_emp:
			validators.append(rh_emp)

	drh_user = User.objects.filter(role=RoleChoices.GRH).order_by('id').first()
	if drh_user:
		drh_emp = _employee_from_user(drh_user)
		if drh_emp and (not validators or drh_emp.id != validators[-1].id):
			validators.append(drh_emp)

	if validators:
		DocumentValidation.initialize_workflow(
			document,
			[(validator, idx + 1) for idx, validator in enumerate(validators)]
		)


# ──────────────────────────────────────────────────────────────────────────────
# Endpoints
# ──────────────────────────────────────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([IsAuthenticated, CanUploadDocument])
def upload_document(request):
	"""Upload a new document (DRAFT status)."""
	title = request.data.get('title')
	file_obj = request.FILES.get('file')
	if not all([title, file_obj]):
		return Response({'detail': 'title and file required'}, status=status.HTTP_400_BAD_REQUEST)

	doc_type_id = request.data.get('doc_type')
	doc_type_name = request.data.get('type')
	category = (request.data.get('category') or DocumentType.Category.INTERNAL).upper()
	confidentiality_level = (request.data.get('confidentiality_level') or Document.ConfidentialityLevel.PUBLIC).upper()
	# Treat legacy INTERNAL as PUBLIC; only PUBLIC and CONFIDENTIAL are valid
	if confidentiality_level == 'INTERNAL':
		confidentiality_level = Document.ConfidentialityLevel.PUBLIC
	valid_confidentiality = {Document.ConfidentialityLevel.PUBLIC, Document.ConfidentialityLevel.CONFIDENTIAL}
	if confidentiality_level not in valid_confidentiality:
		return Response({'detail': 'invalid confidentiality_level'}, status=status.HTTP_400_BAD_REQUEST)

	if doc_type_id:
		try:
			doc_type = DocumentType.objects.get(id=doc_type_id)
		except DocumentType.DoesNotExist:
			return Response({'detail': 'doc_type not found'}, status=status.HTTP_400_BAD_REQUEST)
	else:
		if not doc_type_name:
			return Response({'detail': 'type is required'}, status=status.HTTP_400_BAD_REQUEST)
		doc_type, _ = DocumentType.objects.get_or_create(
			name=doc_type_name,
			defaults={'category': category},
		)
		if doc_type.category != category:
			doc_type.category = category
			doc_type.save()

	source_service = _resolve_service(request.data.get('source_service'))
	target_service = _resolve_service(request.data.get('target_service'))

	if not source_service:
		user_emp = Employee.objects.filter(email=request.user.email).select_related('service').first()
		if user_emp and user_emp.service:
			source_service = user_emp.service

	# Fall back to User.service field (new schema)
	if not source_service and request.user.service:
		source_service = _resolve_service(request.user.service)

	is_rh_user = is_any_rh(request.user)
	if not source_service and is_rh_user:
		source_service = target_service or _fallback_rh_service()

	if not source_service:
		return Response({'detail': 'source_service is required'}, status=status.HTTP_400_BAD_REQUEST)

	is_chef = (
		request.user.role == RoleChoices.CHEF or
		(request.user.service != ServiceChoices.HR and request.user.get_employee_role() == EmployeeRoleChoices.CHEF)
	)
	if is_chef and not target_service:
		return Response({'detail': 'target_service is required'}, status=status.HTTP_400_BAD_REQUEST)

	# Non-RH users can only upload from their own service
	is_employee_or_chef = (
		request.user.role in [RoleChoices.EMPLOYEE, RoleChoices.CHEF] or
		(request.user.service != ServiceChoices.HR and request.user.get_employee_role() in [EmployeeRoleChoices.EMPLOYEE, EmployeeRoleChoices.CHEF])
	)
	if is_employee_or_chef:
		emp = Employee.objects.filter(email=request.user.email).first()
		if emp and emp.service_id and source_service and emp.service_id != source_service.code:
			return Response({'detail': 'can only upload for own service'}, status=status.HTTP_403_FORBIDDEN)

	# All RH roles can only upload RH documents
	if is_rh_user and doc_type.category != DocumentType.Category.RH:
		return Response({'detail': 'RH roles can only upload RH documents'}, status=status.HTTP_403_FORBIDDEN)

	doc = Document.objects.create(
		title=title,
		doc_type=doc_type,
		file=file_obj,
		source_service=source_service,
		target_service=target_service,
		created_by=request.user,
		confidentiality_level=confidentiality_level,
		status=Document.Status.DRAFT
	)
	author_employee = _employee_from_user(request.user)
	doc.create_new_version(
		file_obj=file_obj,
		author=author_employee,
		comment='Initial version'
	)
	_create_doc_history(doc, DocumentHistory.Action.CREATED, request.user)

	return Response(_serialize_document(doc, request), status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def send_document(request, pk):
	"""Send a document (DRAFT → SENT)."""
	try:
		doc = Document.objects.get(id=pk)
	except Document.DoesNotExist:
		return Response({'detail': 'not found'}, status=status.HTTP_404_NOT_FOUND)

	if doc.status != Document.Status.DRAFT:
		return Response({'detail': 'can only send DRAFT documents'}, status=status.HTTP_400_BAD_REQUEST)
	if not doc.target_service_id:
		doc.target_service = doc.source_service
		doc.save(update_fields=['target_service'])

	is_creator = doc.created_by_id == request.user.id
	is_chef_of_service = False
	if request.user.role == RoleChoices.CHEF:
		try:
			chef_emp = Employee.objects.get(email=request.user.email)
			is_chef_of_service = chef_emp.service_id == doc.source_service_id
		except Employee.DoesNotExist:
			pass

	if not (is_creator or is_chef_of_service):
		return Response({'detail': 'forbidden'}, status=status.HTTP_403_FORBIDDEN)

	doc.status = Document.Status.SENT
	doc.sent_at = timezone.now()
	doc.save()
	_create_doc_history(doc, DocumentHistory.Action.SENT, request.user)

	if doc.target_service_id:
		for emp in Employee.objects.filter(service_id=doc.target_service_id):
			try:
				user = User.objects.get(email=emp.email)
				notify(
					user,
					title='New document received',
					message=f"{doc.title} was sent to your service.",
					link=f"/documents?docId={doc.id}"
				)
			except User.DoesNotExist:
				continue

	return Response({'id': doc.id, 'status': doc.status, 'sent_at': doc.sent_at.isoformat()})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def document_detail(request, pk):
	"""Read a document metadata with permission check and access traceability."""
	try:
		doc = Document.objects.get(id=pk)
	except Document.DoesNotExist:
		return Response({'detail': 'not found'}, status=status.HTTP_404_NOT_FOUND)

	ip_address = _get_client_ip(request)
	if _employee_public_access_required(request.user, doc):
		DocumentAccess.log_access(
			document=doc,
			user=request.user,
			action=DocumentAccess.Action.READ,
			ip_address=ip_address,
			result=False,
			details='Employees can only view public received documents',
		)
		return Response({'detail': 'forbidden'}, status=status.HTTP_403_FORBIDDEN)

	permission = DocumentAccess.check_permission(request.user, doc, DocumentAccess.Action.READ)
	if not permission['allowed']:
		DocumentAccess.log_access(
			document=doc,
			user=request.user,
			action=DocumentAccess.Action.READ,
			ip_address=ip_address,
			result=False,
			details=permission['reason'],
		)
		return Response({'detail': 'forbidden'}, status=status.HTTP_403_FORBIDDEN)

	DocumentAccess.log_access(
		document=doc,
		user=request.user,
		action=DocumentAccess.Action.READ,
		ip_address=ip_address,
		result=True,
		details='Document metadata viewed',
	)

	return Response(_serialize_document(doc, request))


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_documents_scoped(request):
	"""List documents scoped to the user's role and service."""
	user = request.user

	if is_drh(user):
		# DRH sees everything
		qs = Document.objects.all()
	elif is_any_rh(user):
		# RH sees their own docs + PUBLIC (non-archived) docs sent to the HR service
		qs = Document.objects.filter(
			Q(created_by=user) |
			Q(
				target_service_id=ServiceChoices.HR,
				status__in=[Document.Status.SENT, Document.Status.VALIDATED],
				confidentiality_level=Document.ConfidentialityLevel.PUBLIC,
			)
		).distinct()
	else:
		is_chef = (
			user.role == RoleChoices.CHEF or
			(user.service != ServiceChoices.HR and user.get_employee_role() == EmployeeRoleChoices.CHEF)
		)
		emp = Employee.objects.filter(email=user.email).first()
		emp_service = emp.service_id if emp else None

		if is_chef:
			# Chef sees their own docs + non-archived docs for their service
			if emp_service:
				qs = Document.objects.filter(
					Q(created_by=user) |
					Q(
						target_service_id=emp_service,
						status__in=[Document.Status.SENT, Document.Status.VALIDATED],
					) |
					Q(
						source_service_id=emp_service,
						status__in=[Document.Status.SENT, Document.Status.VALIDATED],
					)
				).distinct()
			else:
				qs = Document.objects.filter(created_by=user)
		else:
			# Employee: only public non-archived docs for their service + their own
			if emp_service:
				qs = Document.objects.filter(
					Q(created_by=user) |
					Q(
						target_service_id=emp_service,
						status__in=[Document.Status.SENT, Document.Status.VALIDATED],
						confidentiality_level=Document.ConfidentialityLevel.PUBLIC,
					)
				).distinct()
			else:
				qs = Document.objects.filter(created_by=user)

	qs = qs.select_related('doc_type', 'source_service', 'target_service', 'created_by').prefetch_related(
		Prefetch('versions', queryset=DocumentVersion.objects.filter(is_current=True), to_attr='_prefetched_current_version')
	)
	data = [_serialize_document(d, request) for d in qs.order_by('-created_at')]
	return Response(data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def documents_feed(request):
	"""Employee feed: documents sent to the employee's service."""
	# Check if user is an EMPLOYEE
	is_employee = request.user.role == RoleChoices.EMPLOYEE or (request.user.service != ServiceChoices.HR and request.user.get_employee_role() == EmployeeRoleChoices.EMPLOYEE)
	if not is_employee:
		return Response({'detail': 'forbidden'}, status=status.HTTP_403_FORBIDDEN)

	try:
		emp = Employee.objects.get(email=request.user.email)
	except Employee.DoesNotExist:
		return Response([], status=status.HTTP_200_OK)

	qs = Document.objects.select_related('doc_type', 'source_service', 'target_service', 'created_by').prefetch_related(
		Prefetch('versions', queryset=DocumentVersion.objects.filter(is_current=True), to_attr='_prefetched_current_version')
	).filter(
		target_service_id=emp.service_id,
		status__in=[Document.Status.SENT, Document.Status.VALIDATED, Document.Status.ARCHIVED],
		confidentiality_level=Document.ConfidentialityLevel.PUBLIC,
	).order_by('-sent_at', '-created_at')

	data = [_serialize_document(d, request) for d in qs]
	return Response(data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def documents_mine(request):
	"""Chef history: documents posted from the chef's service."""
	# Check if user is a CHEF
	is_chef = request.user.role == RoleChoices.CHEF or (request.user.service != ServiceChoices.HR and request.user.get_employee_role() == EmployeeRoleChoices.CHEF)
	if not is_chef:
		return Response({'detail': 'forbidden'}, status=status.HTTP_403_FORBIDDEN)

	try:
		chef_emp = Employee.objects.get(email=request.user.email)
	except Employee.DoesNotExist:
		return Response([], status=status.HTTP_200_OK)

	qs = Document.objects.select_related('doc_type', 'source_service', 'target_service', 'created_by').prefetch_related(
		Prefetch('versions', queryset=DocumentVersion.objects.filter(is_current=True), to_attr='_prefetched_current_version')
	).filter(
		Q(created_by=request.user) |
		Q(
			source_service_id=chef_emp.service_id,
			status__in=[Document.Status.SENT, Document.Status.VALIDATED],
		) |
		Q(
			target_service_id=chef_emp.service_id,
			status__in=[Document.Status.SENT, Document.Status.VALIDATED],
		)
	).distinct().order_by('-created_at')

	data = [_serialize_document(d, request) for d in qs]
	return Response(data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def comment_document(request, pk):
	"""Add a comment (with optional reply and privacy) to a document."""
	try:
		doc = Document.objects.get(id=pk)
	except Document.DoesNotExist:
		return Response({'detail': 'not found'}, status=status.HTTP_404_NOT_FOUND)

	if not _can_access_comments(request.user, doc):
		return Response({'detail': 'forbidden'}, status=status.HTTP_403_FORBIDDEN)

	comment = request.data.get('comment', '')
	if not comment:
		return Response({'detail': 'comment required'}, status=status.HTTP_400_BAD_REQUEST)

	parent = None
	parent_id = request.data.get('parent_id')
	if parent_id:
		try:
			parent = DocumentHistory.objects.get(
				id=parent_id,
				document=doc,
				action=DocumentHistory.Action.COMMENTED
			)
		except DocumentHistory.DoesNotExist:
			return Response({'detail': 'parent comment not found'}, status=status.HTTP_400_BAD_REQUEST)
		if parent.is_private and request.user not in [doc.created_by, parent.by_user]:
			return Response({'detail': 'forbidden'}, status=status.HTTP_403_FORBIDDEN)

	is_private = bool(request.data.get('is_private'))
	if parent and parent.is_private:
		is_private = True

	comment_entry = _create_doc_history(
		doc,
		DocumentHistory.Action.COMMENTED,
		request.user,
		note=comment,
		parent=parent,
		is_private=is_private
	)
	comment_link = f"/documents?docId={doc.id}&commentId={comment_entry.id}"
	actor_name = _display_name(request.user)
	owner = doc.created_by

	# Notify relevant users about the comment/reply
	if parent:
		if parent.by_user and parent.by_user != request.user:
			label = 'Reply to private comment' if (parent.is_private or is_private) else 'New reply'
			msg = f"{actor_name} replied to your {'private ' if (parent.is_private or is_private) else ''}comment on {doc.title}."
			notify(parent.by_user, label, msg, link=comment_link)
		if owner and owner != request.user and owner != parent.by_user:
			label = 'Private reply' if is_private else 'New reply'
			msg = f"{actor_name} replied {'privately ' if is_private else ''}on {doc.title}."
			notify(owner, label, msg, link=comment_link)
	else:
		if owner and owner != request.user:
			label = 'Private comment' if is_private else 'New comment'
			msg = f"{actor_name} left a {'private ' if is_private else ''}comment on {doc.title}."
			notify(owner, label, msg, link=comment_link)

	# Notify service users for public top-level comments
	if not parent and not is_private:
		service_code = doc.target_service_id or doc.source_service_id
		_notify_service_users(service_code, request.user, 'New comment', f"{actor_name} commented on {doc.title}.", link=comment_link)

	return Response({'detail': 'comment added'})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def document_comments(request, pk):
	"""List visible comments for a document (threaded, respecting privacy)."""
	try:
		doc = Document.objects.get(id=pk)
	except Document.DoesNotExist:
		return Response({'detail': 'not found'}, status=status.HTTP_404_NOT_FOUND)

	if not _can_access_comments(request.user, doc):
		return Response({'detail': 'forbidden'}, status=status.HTTP_403_FORBIDDEN)

	visibility_filter = Q(is_private=False)
	if request.user == doc.created_by:
		visibility_filter = Q()
	else:
		visibility_filter |= Q(is_private=True, by_user=request.user)
		visibility_filter |= Q(is_private=True, parent__by_user=request.user)

	comments = DocumentHistory.objects.filter(
		document=doc,
		action=DocumentHistory.Action.COMMENTED
	).filter(visibility_filter).select_related('by_user', 'parent').order_by('created_at')

	comment_map = {}
	ordered = []
	for c in comments:
		by_user_name = None
		if c.by_user:
			name = f"{c.by_user.first_name} {c.by_user.last_name}".strip()
			by_user_name = name or c.by_user.email
		item = {
			'id': c.id,
			'note': c.note,
			'by_user': c.by_user.email if c.by_user else None,
			'by_user_name': by_user_name,
			'created_at': c.created_at.isoformat() if c.created_at else None,
			'parent_id': c.parent_id,
			'is_private': c.is_private,
			'replies': [],
		}
		comment_map[c.id] = item
		ordered.append(item)

	data = []
	for item in ordered:
		if item['parent_id'] and item['parent_id'] in comment_map:
			comment_map[item['parent_id']]['replies'].append(item)
		else:
			data.append(item)

	return Response(data)


@api_view(['POST'])
@permission_classes([IsAuthenticated, CanValidateDocument])
def validate_document(request, pk):
	"""Approve the active validation step for a document workflow."""
	try:
		doc = Document.objects.get(id=pk)
	except Document.DoesNotExist:
		return Response({'detail': 'not found'}, status=status.HTTP_404_NOT_FOUND)

	if doc.status in [Document.Status.ARCHIVED, Document.Status.VALIDATED, Document.Status.REJECTED]:
		return Response({'detail': f'cannot validate document with status {doc.status}'}, status=status.HTTP_400_BAD_REQUEST)

	if not doc.validations.exists():
		_initialize_validation_workflow(doc)

	active_step = doc.current_validation_step
	if not active_step:
		if doc.status != Document.Status.VALIDATED:
			doc.status = Document.Status.VALIDATED
			doc.validated_by = request.user
			doc.validated_at = timezone.now()
			doc.save(update_fields=['status', 'validated_by', 'validated_at'])
			_create_doc_history(doc, DocumentHistory.Action.VALIDATED, request.user, note='Direct validation approval')
		return Response({'id': doc.id, 'status': doc.status, 'detail': 'workflow already completed'})

	if not active_step.validator or active_step.validator.email != request.user.email:
		return Response({'detail': 'it is not your validation step'}, status=status.HTTP_403_FORBIDDEN)

	signature = request.data.get('signature')
	if not signature:
		return Response({'detail': 'signature is required'}, status=status.HTTP_400_BAD_REQUEST)

	next_step = active_step.validate(signature)
	if not next_step:
		doc.validated_by = request.user
		doc.validated_at = timezone.now()
		doc.save(update_fields=['validated_by', 'validated_at'])
		_create_doc_history(doc, DocumentHistory.Action.VALIDATED, request.user, note='Final workflow approval')

	return Response({
		'id': doc.id,
		'status': doc.status,
		'active_step': next_step.step_order if next_step else None,
		'detail': 'validation step approved',
	})


@api_view(['POST'])
@permission_classes([IsAuthenticated, CanValidateDocument])
def reject_document_validation(request, pk):
	"""Reject the active validation step and stop the workflow."""
	try:
		doc = Document.objects.get(id=pk)
	except Document.DoesNotExist:
		return Response({'detail': 'not found'}, status=status.HTTP_404_NOT_FOUND)

	active_step = doc.current_validation_step
	if not active_step:
		return Response({'detail': 'no active validation step'}, status=status.HTTP_400_BAD_REQUEST)
	if not active_step.validator or active_step.validator.email != request.user.email:
		return Response({'detail': 'it is not your validation step'}, status=status.HTTP_403_FORBIDDEN)

	reason = request.data.get('reason') or request.data.get('comment')
	if not reason:
		return Response({'detail': 'reason is required'}, status=status.HTTP_400_BAD_REQUEST)

	active_step.reject(reason)
	_create_doc_history(doc, DocumentHistory.Action.RETURNED, request.user, note=reason)
	return Response({'id': doc.id, 'status': doc.status, 'detail': 'validation rejected'})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def modify_document(request, pk):
	"""Create a new document version after permission check and access logging."""
	try:
		doc = Document.objects.get(id=pk)
	except Document.DoesNotExist:
		return Response({'detail': 'not found'}, status=status.HTTP_404_NOT_FOUND)

	ip_address = _get_client_ip(request)
	permission = DocumentAccess.check_permission(request.user, doc, DocumentAccess.Action.MODIFY)
	if not permission['allowed']:
		DocumentAccess.log_access(
			document=doc,
			user=request.user,
			action=DocumentAccess.Action.MODIFY,
			ip_address=ip_address,
			result=False,
			details=permission['reason'],
		)
		return Response({'detail': 'forbidden'}, status=status.HTTP_403_FORBIDDEN)

	file_obj = request.FILES.get('file')
	if not file_obj:
		return Response({'detail': 'file is required'}, status=status.HTTP_400_BAD_REQUEST)

	comment = request.data.get('comment', '').strip()
	author_employee = _employee_from_user(request.user)
	version = doc.create_new_version(file_obj=file_obj, author=author_employee, comment=comment or 'Document modified')

	DocumentAccess.log_access(
		document=doc,
		user=request.user,
		action=DocumentAccess.Action.MODIFY,
		ip_address=ip_address,
		result=True,
		details=f'Created version {version.numVersion}',
	)

	return Response({
		'detail': 'document version created',
		'document': _serialize_document(doc, request),
		'version': version.numVersion,
		'checksum': version.checksum,
	})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def download_document(request, pk):
	"""Download current document version with permission and integrity checks."""
	try:
		doc = Document.objects.get(id=pk)
	except Document.DoesNotExist:
		return Response({'detail': 'not found'}, status=status.HTTP_404_NOT_FOUND)

	ip_address = _get_client_ip(request)
	allowed, error_response = _check_document_file_access(request, doc, DocumentAccess.Action.DOWNLOAD)
	if not allowed:
		return error_response

	file_field, current_version = _get_current_document_file(doc)
	if not file_field:
		return Response({'detail': 'no current version available'}, status=status.HTTP_404_NOT_FOUND)

	if current_version and not current_version.verify_integrity():
		DocumentAccess.log_access(
			document=doc,
			user=request.user,
			action=DocumentAccess.Action.DOWNLOAD,
			ip_address=ip_address,
			result=False,
			details=f'Integrity check failed for version {current_version.numVersion}',
		)
		return Response({'detail': 'integrity verification failed'}, status=status.HTTP_409_CONFLICT)

	DocumentAccess.log_access(
		document=doc,
		user=request.user,
		action=DocumentAccess.Action.DOWNLOAD,
		ip_address=ip_address,
		result=True,
		details=f'Downloaded version {current_version.numVersion if current_version else "original"}',
	)

	file_name = os.path.basename(file_field.name)
	content_type = mimetypes.guess_type(file_name)[0] or 'application/octet-stream'
	response = FileResponse(file_field.open('rb'), as_attachment=True, filename=file_name, content_type=content_type)
	return response


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def preview_document(request, pk):
	"""Render current document version inline for browser preview."""
	try:
		doc = Document.objects.get(id=pk)
	except Document.DoesNotExist:
		return Response({'detail': 'not found'}, status=status.HTTP_404_NOT_FOUND)

	allowed, error_response = _check_document_file_access(request, doc, DocumentAccess.Action.READ)
	if not allowed:
		return error_response

	file_field, current_version = _get_current_document_file(doc)
	if not file_field:
		return Response({'detail': 'no current version available'}, status=status.HTTP_404_NOT_FOUND)

	if current_version and not current_version.verify_integrity():
		DocumentAccess.log_access(
			document=doc,
			user=request.user,
			action=DocumentAccess.Action.READ,
			ip_address=_get_client_ip(request),
			result=False,
			details=f'Integrity check failed for version {current_version.numVersion}',
		)
		return Response({'detail': 'integrity verification failed'}, status=status.HTTP_409_CONFLICT)

	file_name = os.path.basename(file_field.name)
	content_type = mimetypes.guess_type(file_name)[0] or 'application/octet-stream'
	response = FileResponse(file_field.open('rb'), as_attachment=False, filename=file_name, content_type=content_type)
	return response


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def archive_document(request, pk):
	"""Archive a document. DRH can archive any doc; any RH can archive their own."""
	try:
		doc = Document.objects.get(id=pk)
	except Document.DoesNotExist:
		return Response({'detail': 'not found'}, status=status.HTTP_404_NOT_FOUND)

	if doc.created_by_id != request.user.id and not is_drh(request.user):
		return Response({'detail': 'forbidden'}, status=status.HTTP_403_FORBIDDEN)

	if doc.status == Document.Status.ARCHIVED:
		return Response({'detail': 'already archived'}, status=status.HTTP_400_BAD_REQUEST)

	doc.status = Document.Status.ARCHIVED
	doc.save()
	_create_doc_history(doc, DocumentHistory.Action.ARCHIVED, request.user)
	return Response({'id': doc.id, 'status': doc.status})

@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_document(request, pk):
	"""Delete a document completely from the database.

	Allowed: GRH users or the document creator.
	"""
	try:
		doc = Document.objects.get(id=pk)
	except Document.DoesNotExist:
		return Response({'detail': 'not found'}, status=status.HTTP_404_NOT_FOUND)

	# Allow deletion if the user is GRH (old or new schema) or the creator of the document
	is_grh = request.user.role == RoleChoices.GRH or (request.user.service == ServiceChoices.HR and request.user.get_employee_role() == EmployeeRoleChoices.DRH)
	if not (is_grh or doc.created_by_id == request.user.id):
		return Response({'detail': 'forbidden'}, status=status.HTTP_403_FORBIDDEN)

	doc.delete()
	return Response({'detail': 'document deleted'}, status=status.HTTP_204_NO_CONTENT)
