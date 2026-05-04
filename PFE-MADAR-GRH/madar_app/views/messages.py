import logging
import os
from django.db.models import Q, F
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from ..models import (
    Message, MessageAttachment, Draft, BlockedUser, MessageReport, 
    Announcement, MessagingSettings, User, Service, Employee
)
from ..permissions import IsGRH, IsRHSimple, IsRHSenior
from .helpers import notify

logger = logging.getLogger(__name__)

# ============================================================
# HELPER FUNCTIONS
# ============================================================

def get_messaging_settings():
    """Get or create messaging settings (singleton)."""
    settings, _ = MessagingSettings.objects.get_or_create(pk=1)
    return settings

def is_user_blocked(sender, recipient):
    """Check if sender is blocked by recipient."""
    return BlockedUser.objects.filter(blocker=recipient, blocked=sender).exists()

def get_user_display_name(user):
    """Get display name for a user from Employee model if available, fallback to User details."""
    try:
        employee = Employee.objects.get(email=user.email)
        full_name = f"{employee.first_name} {employee.last_name}".strip()
        if full_name:
            return full_name
    except Employee.DoesNotExist:
        pass
    
    # Fallback to User first_name and last_name
    if user.first_name and user.last_name:
        return f"{user.first_name} {user.last_name}"
    elif user.first_name:
        return user.first_name
    elif user.last_name:
        return user.last_name
    
    # Final fallback to email
    return user.email


def notify_new_message(recipient, sender, subject, kind="message"):
    """Create an in-app notification for a new messaging event."""
    sender_name = get_user_display_name(sender)

    if kind == "reply":
        title = "Nouvelle reponse"
        message = f"{sender_name} vous a repondu : {subject}"
    elif kind == "forward":
        title = "Message transfere"
        message = f"{sender_name} vous a transfere un message : {subject}"
    else:
        title = "Nouveau message"
        message = f"{sender_name} vous a envoye un message : {subject}"

    notify(
        recipient,
        title=title,
        message=message,
        link="/messagerie",
    )

def serialize_message(msg, requesting_user=None):
    """Serialize a message with attachments and report status."""
    data = {
        'id': msg.id,
        'sender': {
            'id': msg.sender.id,
            'email': msg.sender.email,
            'name': get_user_display_name(msg.sender)
        },
        'recipient': {
            'id': msg.recipient.id,
            'email': msg.recipient.email,
            'name': get_user_display_name(msg.recipient)
        },
        'subject': msg.subject,
        'body': msg.body,
        'is_read': msg.is_read,
        'is_reply': msg.is_reply,
        'is_forward': msg.is_forward,
        'parent_message_id': msg.parent_message_id,
        'has_attachments': msg.attachments.exists(),
        'attachments': [
            {
                'id': att.id,
                'file_name': att.file_name,
                'file_size': att.file_size,
                'file_url': att.file.url if att.file else None,
            }
            for att in msg.attachments.all()
        ],
        'created_at': msg.created_at.isoformat(),
    }
    
    # Add report status if user has reported this message
    if requesting_user:
        data['is_important_for_me'] = False
        report = MessageReport.objects.filter(message=msg, reporter=requesting_user).first()
        if report:
            data['reported_by_me'] = True
            data['report_id'] = report.id
        # Business rule: user can reply only once per parent message
        data['has_replied_by_me'] = Message.objects.filter(
            parent_message=msg,
            sender=requesting_user,
            is_reply=True
        ).exists()
    
    return data

def serialize_draft(draft):
    """Serialize a draft message."""
    return {
        'id': draft.id,
        'recipient': {
            'id': draft.recipient.id,
            'email': draft.recipient.email,
            'name': f"{draft.recipient.first_name} {draft.recipient.last_name}".strip() or draft.recipient.email
        } if draft.recipient else None,
        'subject': draft.subject,
        'body': draft.body,
        'created_at': draft.created_at.isoformat(),
        'updated_at': draft.updated_at.isoformat(),
    }

def serialize_announcement(ann):
    """Serialize an announcement."""
    return {
        'id': ann.id,
        'creator': {
            'id': ann.creator.id,
            'email': ann.creator.email,
            'name': f"{ann.creator.first_name} {ann.creator.last_name}".strip() or ann.creator.email
        },
        'title': ann.title,
        'message': ann.message,
        'scope': ann.scope,
        'target_service': {
            'code': ann.target_service.code,
            'nomService': ann.target_service.nomService
        } if ann.target_service else None,
        'created_at': ann.created_at.isoformat(),
    }

# ============================================================
# EMPLOYEE: INBOX & MESSAGE MANAGEMENT
# ============================================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def inbox(request):
    """Get user's inbox (received messages, not deleted by recipient)."""
    page = request.query_params.get('page', 1)
    page_size = 20
    offset = (int(page) - 1) * page_size
    
    messages = Message.objects.filter(
        recipient=request.user,
        is_deleted_by_recipient=False
    ).select_related('sender', 'recipient')
    
    total = messages.count()
    messages = messages[offset:offset + page_size]
    
    return Response({
        'total': total,
        'page_size': page_size,
        'page': int(page),
        'messages': [serialize_message(m, request.user) for m in messages]
    })

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def sent(request):
    """Get user's sent messages (not deleted by sender)."""
    page = request.query_params.get('page', 1)
    page_size = 20
    offset = (int(page) - 1) * page_size
    
    messages = Message.objects.filter(
        sender=request.user,
        is_deleted_by_sender=False
    ).select_related('sender', 'recipient')
    
    total = messages.count()
    messages = messages[offset:offset + page_size]
    
    return Response({
        'total': total,
        'page_size': page_size,
        'page': int(page),
        'messages': [serialize_message(m, request.user) for m in messages]
    })

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def trash(request):
    """Get user's trash (messages deleted by current user)."""
    page = request.query_params.get('page', 1)
    page_size = 20
    offset = (int(page) - 1) * page_size

    messages = Message.objects.filter(
        Q(sender=request.user, is_deleted_by_sender=True) |
        Q(recipient=request.user, is_deleted_by_recipient=True)
    ).select_related('sender', 'recipient')

    total = messages.count()
    messages = messages[offset:offset + page_size]

    return Response({
        'total': total,
        'page_size': page_size,
        'page': int(page),
        'messages': [serialize_message(m, request.user) for m in messages]
    })

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_message(request, pk):
    """Get a single message and mark it as read if recipient."""
    try:
        msg = Message.objects.select_related('sender', 'recipient').get(id=pk)
    except Message.DoesNotExist:
        return Response({'detail': 'Message not found'}, status=status.HTTP_404_NOT_FOUND)
    
    # Check access
    if msg.sender != request.user and msg.recipient != request.user:
        return Response({'detail': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)
    
    # Mark as read if recipient
    if msg.recipient == request.user and not msg.is_read:
        msg.is_read = True
        msg.save()
    
    return Response(serialize_message(msg, request.user))

@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def mark_message_read_unread(request, pk):
    """Mark message as read or unread (recipient only)."""
    try:
        msg = Message.objects.get(id=pk)
    except Message.DoesNotExist:
        return Response({'detail': 'Message not found'}, status=status.HTTP_404_NOT_FOUND)
    
    if msg.recipient != request.user:
        return Response({'detail': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)
    
    msg.is_read = request.data.get('is_read', True)
    msg.save()
    
    return Response({'success': True})

@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_message(request, pk):
    """Soft-delete a message (mark deleted for user)."""
    try:
        msg = Message.objects.get(id=pk)
    except Message.DoesNotExist:
        return Response({'detail': 'Message not found'}, status=status.HTTP_404_NOT_FOUND)
    
    if msg.sender == request.user:
        msg.is_deleted_by_sender = True
    elif msg.recipient == request.user:
        msg.is_deleted_by_recipient = True
    else:
        return Response({'detail': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)
    
    msg.save()
    return Response({'success': True})

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def search_messages(request):
    """Search messages by subject, body, or sender (case-insensitive)."""
    query = request.query_params.get('q', '').strip()
    if not query or len(query) < 2:
        return Response({'detail': 'Query must be at least 2 characters'}, status=status.HTTP_400_BAD_REQUEST)
    
    messages = Message.objects.filter(
        Q(recipient=request.user, is_deleted_by_recipient=False) |
        Q(sender=request.user, is_deleted_by_sender=False)
    ).filter(
        Q(subject__icontains=query) |
        Q(body__icontains=query) |
        Q(sender__email__icontains=query) |
        Q(sender__first_name__icontains=query) |
        Q(sender__last_name__icontains=query)
    ).select_related('sender', 'recipient')[:50]
    
    return Response({
        'query': query,
        'results': [serialize_message(m, request.user) for m in messages]
    })

# ============================================================
# EMPLOYEE: COMPOSE & SEND
# ============================================================

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def send_message(request):
    """Send a message with optional attachments."""
    recipient_id = request.data.get('recipient_id')
    subject = request.data.get('subject', '').strip()
    body = request.data.get('body', '').strip()
    parent_message_id = request.data.get('parent_message_id')  # For reply/forward
    is_reply = request.data.get('is_reply', False)
    is_forward = request.data.get('is_forward', False)
    
    logger.info(f'send_message from {request.user.email} to {recipient_id}')
    
    # Validation
    if not recipient_id:
        return Response({'detail': 'recipient_id is required'}, status=status.HTTP_400_BAD_REQUEST)
    if not subject:
        return Response({'detail': 'subject is required'}, status=status.HTTP_400_BAD_REQUEST)
    if not body:
        return Response({'detail': 'body is required'}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        recipient = User.objects.get(id=recipient_id)
    except User.DoesNotExist:
        return Response({'detail': 'Recipient not found'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Check if sender is trying to message themselves
    if recipient == request.user:
        return Response({
            'detail': 'Cannot send message to yourself',
            'sender_id': request.user.id,
            'recipient_id': recipient.id,
            'sender_email': request.user.email,
            'recipient_email': recipient.email,
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Get messaging settings
    settings = get_messaging_settings()
    
    # Create message
    parent_msg = None
    if parent_message_id:
        try:
            parent_msg = Message.objects.get(id=parent_message_id)
            if parent_msg.sender != request.user and parent_msg.recipient != request.user:
                return Response({'detail': 'Invalid parent message'}, status=status.HTTP_400_BAD_REQUEST)
        except Message.DoesNotExist:
            pass
    
    msg = Message.objects.create(
        sender=request.user,
        recipient=recipient,
        subject=subject,
        body=body,
        parent_message=parent_msg,
        is_reply=is_reply,
        is_forward=is_forward,
    )
    
    # Handle attachments
    files = request.FILES.getlist('attachments')
    attachment_errors = []
    attachment_count = 0
    
    logger.info(f'send_message: received {len(files)} files, message {msg.id} created')
    
    for i, file in enumerate(files):
        try:
            # Validate file size
            file_size_mb = file.size / (1024 * 1024)
            if file_size_mb > settings.max_attachment_size_mb:
                error_msg = f'{file.name}: exceeds max size of {settings.max_attachment_size_mb}MB'
                attachment_errors.append(error_msg)
                logger.warning(f'send_message: {error_msg}')
                file.close()
                continue
            
            # Validate file extension
            file_ext = os.path.splitext(file.name)[1].lstrip('.').lower()
            allowed_exts = [ext.strip() for ext in settings.allowed_file_extensions.split(',')]
            if file_ext and file_ext not in allowed_exts:
                error_msg = f'{file.name}: file type not allowed (allowed: {settings.allowed_file_extensions})'
                attachment_errors.append(error_msg)
                logger.warning(f'send_message: {error_msg}')
                file.close()
                continue
            
            logger.info(f'send_message: saving attachment {i+1}/{len(files)}: {file.name} ({file_size_mb:.2f}MB)')
            
            # Create attachment
            att = MessageAttachment.objects.create(
                message=msg,
                file=file,
                file_name=file.name,
                file_size=file.size,
            )
            attachment_count += 1
            logger.info(f'send_message: attachment {att.id} saved successfully for message {msg.id}')
        except Exception as e:
            error_msg = f'{file.name}: upload error - {str(e)}'
            attachment_errors.append(error_msg)
            logger.error(f'send_message: {error_msg}')
    
    logger.info(f'send_message: completed - message {msg.id} with {attachment_count}/{len(files)} attachments')

    notify_new_message(recipient, request.user, subject, kind="message")
    
    return Response({
        'id': msg.id,
        'success': True,
        'attachments_count': attachment_count,
        'attachment_errors': attachment_errors if attachment_errors else None
    }, status=status.HTTP_201_CREATED)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def reply_message(request, pk):
    """Reply to a message."""
    try:
        parent_msg = Message.objects.get(id=pk)
    except Message.DoesNotExist:
        return Response({'detail': 'Message not found'}, status=status.HTTP_404_NOT_FOUND)
    
    # Check access
    if parent_msg.sender != request.user and parent_msg.recipient != request.user:
        return Response({'detail': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)
    
    # Determine recipient (reply to sender if user is recipient, else to recipient)
    reply_recipient = parent_msg.sender if parent_msg.recipient == request.user else parent_msg.recipient
    
    body = request.data.get('body', '').strip()
    if not body:
        return Response({'detail': 'body is required'}, status=status.HTTP_400_BAD_REQUEST)

    # Allow only one reply per user for the same parent message
    already_replied = Message.objects.filter(
        parent_message=parent_msg,
        sender=request.user,
        is_reply=True
    ).exists()
    if already_replied:
        return Response(
            {'detail': 'You have already replied to this message'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Create reply message
    reply_msg = Message.objects.create(
        sender=request.user,
        recipient=reply_recipient,
        subject=f"Re: {parent_msg.subject}" if not parent_msg.subject.startswith('Re:') else parent_msg.subject,
        body=body,
        parent_message=parent_msg,
        is_reply=True,
    )
    
    logger.info(f'reply_message: reply {reply_msg.id} to message {parent_msg.id}')

    notify_new_message(reply_recipient, request.user, reply_msg.subject, kind="reply")
    
    return Response({'id': reply_msg.id}, status=status.HTTP_201_CREATED)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def forward_message(request, pk):
    """Forward a message to a new recipient."""
    try:
        original_msg = Message.objects.get(id=pk)
    except Message.DoesNotExist:
        return Response({'detail': 'Message not found'}, status=status.HTTP_404_NOT_FOUND)
    
    # Check access (only sender or recipient can forward)
    if original_msg.sender != request.user and original_msg.recipient != request.user:
        return Response({'detail': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)
    
    recipient_id = request.data.get('recipient_id')
    if not recipient_id:
        return Response({'detail': 'recipient_id is required'}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        new_recipient = User.objects.get(id=recipient_id)
    except User.DoesNotExist:
        return Response({'detail': 'Recipient not found'}, status=status.HTTP_400_BAD_REQUEST)
    
    if new_recipient == request.user:
        return Response({'detail': 'Cannot forward to yourself'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Create forwarded message
    forwarded_msg = Message.objects.create(
        sender=request.user,
        recipient=new_recipient,
        subject=f"Fwd: {original_msg.subject}" if not original_msg.subject.startswith('Fwd:') else original_msg.subject,
        body=original_msg.body,
        parent_message=original_msg,
        is_forward=True,
    )
    
    logger.info(f'forward_message: forwarded message {original_msg.id} to {forwarded_msg.id}')

    notify_new_message(new_recipient, request.user, forwarded_msg.subject, kind="forward")
    
    return Response({'id': forwarded_msg.id}, status=status.HTTP_201_CREATED)

# ============================================================
# EMPLOYEE: DRAFTS
# ============================================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def drafts_list(request):
    """Get user's drafts."""
    drafts = Draft.objects.filter(creator=request.user).select_related('recipient')
    return Response({
        'drafts': [serialize_draft(d) for d in drafts]
    })

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def save_draft(request):
    """Save or update a draft."""
    draft_id = request.data.get('id')
    recipient_id = request.data.get('recipient_id')
    subject = request.data.get('subject', '').strip()
    body = request.data.get('body', '').strip()
    
    recipient = None
    if recipient_id:
        try:
            recipient = User.objects.get(id=recipient_id)
        except User.DoesNotExist:
            return Response({'detail': 'Recipient not found'}, status=status.HTTP_400_BAD_REQUEST)
    
    if draft_id:
        # Update existing draft
        try:
            draft = Draft.objects.get(id=draft_id, creator=request.user)
            draft.recipient = recipient
            draft.subject = subject
            draft.body = body
            draft.save()
        except Draft.DoesNotExist:
            return Response({'detail': 'Draft not found'}, status=status.HTTP_404_NOT_FOUND)
    else:
        # Create new draft
        draft = Draft.objects.create(
            creator=request.user,
            recipient=recipient,
            subject=subject,
            body=body,
        )
    
    return Response(serialize_draft(draft), status=status.HTTP_201_CREATED)

@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_draft(request, pk):
    """Delete a draft."""
    try:
        draft = Draft.objects.get(id=pk, creator=request.user)
        draft.delete()
        return Response({'success': True})
    except Draft.DoesNotExist:
        return Response({'detail': 'Draft not found'}, status=status.HTTP_404_NOT_FOUND)

# ============================================================
# EMPLOYEE: REPORTING & BLOCKING
# ============================================================

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def report_message(request, pk):
    """Report a message for moderation."""
    try:
        msg = Message.objects.get(id=pk)
    except Message.DoesNotExist:
        return Response({'detail': 'Message not found'}, status=status.HTTP_404_NOT_FOUND)
    
    # Can only report messages received by you
    if msg.recipient != request.user:
        return Response({'detail': 'Can only report messages sent to you'}, status=status.HTTP_403_FORBIDDEN)
    
    reason = request.data.get('reason', '').strip()
    description = request.data.get('description', '').strip()
    
    if not reason:
        return Response({'detail': 'reason is required'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Check if already reported by this user
    existing_report = MessageReport.objects.filter(message=msg, reporter=request.user).first()
    if existing_report:
        return Response({'detail': 'You have already reported this message'}, status=status.HTTP_400_BAD_REQUEST)
    
    report = MessageReport.objects.create(
        message=msg,
        reporter=request.user,
        reason=reason,
        description=description,
    )
    
    logger.info(f'report_message: {request.user.email} reported message {msg.id}')
    
    return Response({
        'id': report.id,
        'success': True
    }, status=status.HTTP_201_CREATED)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def block_user(request, user_id):
    """Block a user (they cannot send you messages)."""
    try:
        blocked_user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return Response({'detail': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
    
    if blocked_user == request.user:
        return Response({'detail': 'Cannot block yourself'}, status=status.HTTP_400_BAD_REQUEST)
    
    settings = get_messaging_settings()
    if not settings.blocking_enabled:
        return Response({'detail': 'User blocking is disabled'}, status=status.HTTP_403_FORBIDDEN)
    
    block, created = BlockedUser.objects.get_or_create(
        blocker=request.user,
        blocked=blocked_user
    )
    
    logger.info(f'block_user: {request.user.email} blocked {blocked_user.email}')
    
    return Response({'success': True, 'blocked': blocked_user.email})

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def unblock_user(request, user_id):
    """Unblock a user."""
    try:
        BlockedUser.objects.get(blocker=request.user, blocked_id=user_id).delete()
        return Response({'success': True})
    except BlockedUser.DoesNotExist:
        return Response({'detail': 'User is not blocked'}, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def blocked_users_list(request):
    """Get list of users blocked by current user."""
    blocked = BlockedUser.objects.filter(blocker=request.user).select_related('blocked')
    return Response({
        'blocked_users': [
            {
                'id': b.blocked.id,
                'email': b.blocked.email,
                'name': f"{b.blocked.first_name} {b.blocked.last_name}".strip() or b.blocked.email
            }
            for b in blocked
        ]
    })

# ============================================================
# ADMIN: VIEW & MODERATE REPORTS
# ============================================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_reports_list(request):
    """Admin: List all message reports (GRH + RH staff only)."""
    if not (request.user.role in ['GRH', 'RH_SIMPLE']):
        return Response({'detail': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)
    
    unresolved_only = request.query_params.get('unresolved', 'true').lower() == 'true'
    
    reports = MessageReport.objects.select_related('message', 'reporter', 'message__sender')
    if unresolved_only:
        reports = reports.filter(is_resolved=False)
    
    reports = reports.order_by('-created_at')
    
    return Response({
        'reports': [
            {
                'id': r.id,
                'message': serialize_message(r.message),
                'reporter': {
                    'id': r.reporter.id,
                    'email': r.reporter.email,
                    'name': f"{r.reporter.first_name} {r.reporter.last_name}".strip() or r.reporter.email
                },
                'reason': r.reason,
                'description': r.description,
                'is_resolved': r.is_resolved,
                'message_hidden': r.message_hidden,
                'sender_blocked': r.sender_blocked,
                'created_at': r.created_at.isoformat(),
            }
            for r in reports
        ]
    })

@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def admin_resolve_report(request, pk):
    """Admin: Resolve a report (optionally hide/delete message or block sender)."""
    if not (request.user.role in ['GRH', 'RH_SIMPLE']):
        return Response({'detail': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        report = MessageReport.objects.get(id=pk)
    except MessageReport.DoesNotExist:
        return Response({'detail': 'Report not found'}, status=status.HTTP_404_NOT_FOUND)
    
    if report.is_resolved:
        return Response({'detail': 'Report already resolved'}, status=status.HTTP_400_BAD_REQUEST)
    
    resolution_note = request.data.get('resolution_note', '').strip()
    hide_message = request.data.get('hide_message', False)
    block_sender = request.data.get('block_sender', False)
    
    # Apply moderation actions
    if hide_message:
        report.message_hidden = True
        report.message.is_deleted_by_recipient = True
        report.message.save()
    
    if block_sender:
        BlockedUser.objects.get_or_create(
            blocker=report.message.recipient,
            blocked=report.message.sender
        )
        report.sender_blocked = True
    
    report.is_resolved = True
    report.resolved_by = request.user
    report.resolution_note = resolution_note
    report.resolved_at = timezone.now()
    report.save()
    
    logger.info(f'admin_resolve_report: report {pk} resolved by {request.user.email}')
    
    return Response({'success': True})

# ============================================================
# ADMIN: ANNOUNCEMENTS
# ============================================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def announcements_list(request):
    """Get all announcements (user sees only relevant ones)."""
    announcements = Announcement.objects.select_related('creator', 'target_service').order_by('-created_at')
    
    # Filter by user's scope
    user_service = None
    try:
        emp = Employee.objects.get(email=request.user.email)
        user_service = emp.service
    except Employee.DoesNotExist:
        pass
    
    # Users see global announcements + their service announcements
    if user_service:
        announcements = announcements.filter(
            Q(scope='GLOBAL') | Q(scope='SERVICE', target_service=user_service)
        )
    else:
        announcements = announcements.filter(scope='GLOBAL')
    
    return Response({
        'announcements': [serialize_announcement(a) for a in announcements]
    })

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_announcement(request):
    """Admin: Create internal announcement."""
    if not (request.user.role in ['GRH', 'RH_SIMPLE']):
        return Response({'detail': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)
    
    title = request.data.get('title', '').strip()
    message = request.data.get('message', '').strip()
    scope = request.data.get('scope', 'GLOBAL')
    target_service_code = request.data.get('target_service_code')
    
    if not title:
        return Response({'detail': 'title is required'}, status=status.HTTP_400_BAD_REQUEST)
    if not message:
        return Response({'detail': 'message is required'}, status=status.HTTP_400_BAD_REQUEST)
    
    target_service = None
    if scope == 'SERVICE':
        if not target_service_code:
            return Response({'detail': 'target_service_code required for SERVICE scope'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            target_service = Service.objects.get(code=target_service_code)
        except Service.DoesNotExist:
            return Response({'detail': 'Service not found'}, status=status.HTTP_400_BAD_REQUEST)
    
    ann = Announcement.objects.create(
        creator=request.user,
        title=title,
        message=message,
        scope=scope,
        target_service=target_service,
    )
    
    logger.info(f'create_announcement: announcement {ann.id} created by {request.user.email}')
    
    return Response(serialize_announcement(ann), status=status.HTTP_201_CREATED)

# ============================================================
# ADMIN: MESSAGING RULES & SETTINGS
# ============================================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def messaging_settings(request):
    """Admin: Get messaging settings."""
    if not (request.user.role in ['GRH', 'RH_SIMPLE']):
        return Response({'detail': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)
    
    settings = get_messaging_settings()
    return Response({
        'max_attachment_size_mb': settings.max_attachment_size_mb,
        'allowed_file_extensions': settings.allowed_file_extensions,
        'blocking_enabled': settings.blocking_enabled,
        'announcements_global_default': settings.announcements_global_default,
    })

@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def update_messaging_settings(request):
    """Admin: Update messaging settings."""
    if not (request.user.role in ['GRH', 'RH_SIMPLE']):
        return Response({'detail': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)
    
    settings = get_messaging_settings()
    
    if 'max_attachment_size_mb' in request.data:
        settings.max_attachment_size_mb = int(request.data['max_attachment_size_mb'])
    if 'allowed_file_extensions' in request.data:
        settings.allowed_file_extensions = request.data['allowed_file_extensions']
    if 'blocking_enabled' in request.data:
        settings.blocking_enabled = bool(request.data['blocking_enabled'])
    if 'announcements_global_default' in request.data:
        settings.announcements_global_default = bool(request.data['announcements_global_default'])
    
    settings.save()
    logger.info(f'update_messaging_settings: settings updated by {request.user.email}')
    
    return Response({'success': True})
