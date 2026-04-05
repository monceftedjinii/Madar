from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from django.utils import timezone
from django.db.models import Q
from django.http import FileResponse
import os
from ..models import (
	Employee, User, RoleChoices, Service,
	Document, DocumentType, DocumentHistory,
	DocumentVersion, DocumentValidation, DocumentAccess
)
from ..permissions import CanUploadDocument, CanValidateDocument
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


def _serialize_document(doc, request):
	"""Return a dict representation of a Document instance."""
	created_by_name = None
	if doc.created_by:
		name = f"{doc.created_by.first_name} {doc.created_by.last_name}".strip()
		created_by_name = name or doc.created_by.email
	current_version = doc.current_version
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
		'file_url': request.build_absolute_uri(current_version.file_path.url) if current_version and current_version.file_path else (request.build_absolute_uri(doc.file.url) if doc.file else None),
		'current_version': current_version.numVersion if current_version else None,
		'current_checksum': current_version.checksum if current_version else None,
	}


def _employee_public_access_required(user, document):
	"""Employees can only access received documents when they are public."""
	if not user or user.role != RoleChoices.EMPLOYEE:
		return False
	if document.created_by_id == user.id:
		return False
	return document.confidentiality_level != Document.ConfidentialityLevel.PUBLIC


def _can_access_comments(user, document):
	"""Check whether a user can read/write comments on a document."""
	if _employee_public_access_required(user, document):
		return False
	if user.id == document.created_by_id:
		return True
	if user.role == RoleChoices.CHEF:
		try:
			chef_emp = Employee.objects.get(email=user.email)
			return (
				chef_emp.service_id == document.source_service_id or
				(document.target_service_id and chef_emp.service_id == document.target_service_id)
			)
		except Employee.DoesNotExist:
			return False
	if user.role in [RoleChoices.RH_AGENT, RoleChoices.RH_SENIOR, RoleChoices.GRH]:
		return True
	if user.role == RoleChoices.EMPLOYEE:
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
	"""Create a default two-step workflow (RH_SIMPLE -> RH_SENIOR/GRH) if none exists."""
	if document.validations.exists():
		return

	validators = []
	rh_user = User.objects.filter(role=RoleChoices.RH_SIMPLE).order_by('id').first()
	if rh_user:
		rh_emp = _employee_from_user(rh_user)
		if rh_emp:
			validators.append(rh_emp)

	drh_user = User.objects.filter(role=RoleChoices.RH_SENIOR).order_by('id').first()
	if not drh_user:
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
	confidentiality_level = (request.data.get('confidentiality_level') or Document.ConfidentialityLevel.INTERNAL).upper()
	valid_confidentiality = {choice[0] for choice in Document.ConfidentialityLevel.choices}
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
	if not source_service:
		try:
			user_emp = Employee.objects.get(email=request.user.email)
			source_service = user_emp.service
		except Employee.DoesNotExist:
			return Response({'detail': 'source_service is required'}, status=status.HTTP_400_BAD_REQUEST)

	target_service = _resolve_service(request.data.get('target_service'))
	if request.user.role == RoleChoices.CHEF and not target_service:
		return Response({'detail': 'target_service is required'}, status=status.HTTP_400_BAD_REQUEST)

	# Employees and chefs can only upload for their own service
	if request.user.role in [RoleChoices.EMPLOYEE, RoleChoices.CHEF]:
		try:
			emp = Employee.objects.get(email=request.user.email)
			if source_service and emp.service_id != source_service.code:
				return Response({'detail': 'can only upload for own service'}, status=status.HTTP_403_FORBIDDEN)
		except Employee.DoesNotExist:
			return Response({'detail': 'user has no employee record'}, status=status.HTTP_403_FORBIDDEN)

	if request.user.role == RoleChoices.RH_SIMPLE and doc_type.category != DocumentType.Category.RH:
		return Response({'detail': 'RH_SIMPLE can only upload RH documents'}, status=status.HTTP_403_FORBIDDEN)

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
	_initialize_validation_workflow(doc)
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
	role = request.user.role

	if role == RoleChoices.GRH:
		qs = Document.objects.all()
	elif role == RoleChoices.RH_SENIOR:
		qs = Document.objects.all()
	elif role == RoleChoices.RH_SIMPLE:
		qs = Document.objects.filter(
			created_by=request.user,
			doc_type__category=DocumentType.Category.RH
		)
	elif role == RoleChoices.RH_AGENT:
		qs = Document.objects.all()
	elif role == RoleChoices.CHEF:
		try:
			chef_emp = Employee.objects.get(email=request.user.email)
			qs = Document.objects.filter(
				Q(source_service_id=chef_emp.service_id) |
				Q(target_service_id=chef_emp.service_id)
			)
		except Employee.DoesNotExist:
			qs = Document.objects.none()
	elif role == RoleChoices.EMPLOYEE:
		try:
			emp = Employee.objects.get(email=request.user.email)
			qs = Document.objects.filter(
				Q(created_by=request.user) |
				Q(
					target_service_id=emp.service_id,
					status__in=[Document.Status.SENT, Document.Status.VALIDATED, Document.Status.ARCHIVED],
					confidentiality_level=Document.ConfidentialityLevel.PUBLIC,
				)
			)
		except Employee.DoesNotExist:
			qs = Document.objects.filter(created_by=request.user)
	else:
		qs = Document.objects.none()

	data = [_serialize_document(d, request) for d in qs.order_by('-created_at')]
	return Response(data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def documents_feed(request):
	"""Employee feed: documents sent to the employee's service."""
	if request.user.role != RoleChoices.EMPLOYEE:
		return Response({'detail': 'forbidden'}, status=status.HTTP_403_FORBIDDEN)

	try:
		emp = Employee.objects.get(email=request.user.email)
	except Employee.DoesNotExist:
		return Response([], status=status.HTTP_200_OK)

	qs = Document.objects.filter(
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
	if request.user.role != RoleChoices.CHEF:
		return Response({'detail': 'forbidden'}, status=status.HTTP_403_FORBIDDEN)

	try:
		chef_emp = Employee.objects.get(email=request.user.email)
	except Employee.DoesNotExist:
		return Response([], status=status.HTTP_200_OK)

	qs = Document.objects.filter(
		source_service_id=chef_emp.service_id
	).order_by('-created_at')

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
	if _employee_public_access_required(request.user, doc):
		DocumentAccess.log_access(
			document=doc,
			user=request.user,
			action=DocumentAccess.Action.DOWNLOAD,
			ip_address=ip_address,
			result=False,
			details='Employees can only download public received documents',
		)
		return Response({'detail': 'forbidden'}, status=status.HTTP_403_FORBIDDEN)

	permission = DocumentAccess.check_permission(request.user, doc, DocumentAccess.Action.DOWNLOAD)
	if not permission['allowed']:
		DocumentAccess.log_access(
			document=doc,
			user=request.user,
			action=DocumentAccess.Action.DOWNLOAD,
			ip_address=ip_address,
			result=False,
			details=permission['reason'],
		)
		return Response({'detail': 'forbidden'}, status=status.HTTP_403_FORBIDDEN)

	current_version = doc.current_version
	if not current_version or not current_version.file_path:
		return Response({'detail': 'no current version available'}, status=status.HTTP_404_NOT_FOUND)

	if not current_version.verify_integrity():
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
		details=f'Downloaded version {current_version.numVersion}',
	)

	file_name = os.path.basename(current_version.file_path.name)
	response = FileResponse(current_version.file_path.open('rb'), as_attachment=True, filename=file_name)
	return response


@api_view(['POST'])
@permission_classes([IsAuthenticated, CanValidateDocument])
def archive_document(request, pk):
	"""Archive a document (RH_SENIOR/GRH only, status → ARCHIVED)."""
	try:
		doc = Document.objects.get(id=pk)
	except Document.DoesNotExist:
		return Response({'detail': 'not found'}, status=status.HTTP_404_NOT_FOUND)

	if doc.status == Document.Status.ARCHIVED:
		return Response({'detail': 'already archived'}, status=status.HTTP_400_BAD_REQUEST)

	doc.status = Document.Status.ARCHIVED
	doc.save()
	_create_doc_history(doc, DocumentHistory.Action.ARCHIVED, request.user)
	return Response({'id': doc.id, 'status': doc.status})
