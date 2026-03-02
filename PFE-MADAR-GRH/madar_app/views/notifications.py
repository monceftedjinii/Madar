from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from ..models import Notification


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_notifications(request):
	"""Return the authenticated user's notifications (latest first)."""
	qs = Notification.objects.filter(user=request.user).order_by('-created_at')
	data = [
		{
			'id': n.id,
			'title': n.title,
			'message': n.message,
			'link': n.link or None,
			'is_read': n.is_read,
			'created_at': n.created_at.isoformat(),
		}
		for n in qs
	]
	return Response(data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mark_notification_read(request, pk):
	"""Mark a specific notification as read."""
	try:
		notif = Notification.objects.get(id=pk)
	except Notification.DoesNotExist:
		return Response({'detail': 'not found'}, status=status.HTTP_404_NOT_FOUND)

	if notif.user != request.user:
		return Response({'detail': 'forbidden'}, status=status.HTTP_403_FORBIDDEN)

	notif.is_read = True
	notif.save()
	return Response({'id': notif.id, 'is_read': True})
