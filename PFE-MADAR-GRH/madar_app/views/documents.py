from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from django.utils import timezone
from django.db.models import Q
from ..models import (
	Employee, User, RoleChoices, Service,
	Document, DocumentType, DocumentHistory
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
	return {
		'id': doc.id,
		'title': doc.title,
		'doc_type': doc.doc_type.name,
		'doc_type_category': doc.doc_type.category,
		'status': doc.status,
		'source_service': doc.source_service.nomService if doc.source_service else None,
		'target_service': doc.target_service.nomService if doc.target_service else None,
		'created_by': doc.created_by.email if doc.created_by else None,
		'created_by_name': created_by_name,
		'created_at': doc.created_at.isoformat() if doc.created_at else None,
		'sent_at': doc.sent_at.isoformat() if doc.sent_at else None,
		'file_url': request.build_absolute_uri(doc.file.url) if doc.file else None,
	}


def _can_access_comments(user, document):
	"""Check whether a user can read/write comments on a document."""
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
	if user.role in [RoleChoices.RH_SENIOR, RoleChoices.GRH]:
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
		status=Document.Status.DRAFT
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
		return Response({'detail': 'target_service is required to send'}, status=status.HTTP_400_BAD_REQUEST)

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
				Q(target_service_id=emp.service_id, status__in=[Document.Status.SENT, Document.Status.VALIDATED, Document.Status.ARCHIVED]) |
				Q(source_service_id=emp.service_id, status__in=[Document.Status.SENT, Document.Status.VALIDATED, Document.Status.ARCHIVED])
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
		status=Document.Status.SENT
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
	"""Validate a document (RH_SENIOR/GRH only, status → VALIDATED)."""
	try:
		doc = Document.objects.get(id=pk)
	except Document.DoesNotExist:
		return Response({'detail': 'not found'}, status=status.HTTP_404_NOT_FOUND)

	if doc.status == Document.Status.VALIDATED:
		return Response({'detail': 'already validated'}, status=status.HTTP_400_BAD_REQUEST)
	if doc.status == Document.Status.ARCHIVED:
		return Response({'detail': 'cannot validate archived documents'}, status=status.HTTP_400_BAD_REQUEST)

	doc.status = Document.Status.VALIDATED
	doc.validated_by = request.user
	doc.validated_at = timezone.now()
	doc.save()
	_create_doc_history(doc, DocumentHistory.Action.VALIDATED, request.user)
	return Response({'id': doc.id, 'status': doc.status})


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
