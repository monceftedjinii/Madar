from ..models import Notification, Employee, User


def notify(user, title, message, link=''):
	"""Helper to create a notification."""
	return Notification.objects.create(user=user, title=title, message=message, link=link)


def _display_name(user):
	if not user:
		return 'Someone'
	name = f"{user.first_name} {user.last_name}".strip()
	return name or user.email


def _notify_service_users(service_code, actor_user, title, message, link=''):
	if not service_code:
		return
	for emp in Employee.objects.filter(service_id=service_code):
		try:
			user = User.objects.get(email=emp.email)
		except User.DoesNotExist:
			continue
		if actor_user and user.id == actor_user.id:
			continue
		notify(user, title, message, link=link)
