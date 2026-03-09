import logging
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from django.utils import timezone
from ..models import Task, Employee, User
from ..permissions import IsChef, IsEmployee
from .helpers import notify

logger = logging.getLogger(__name__)


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsChef])
def create_task(request):
	"""Chef assigns a task to an employee in his service only."""
	data = request.data
	logger.info(f'create_task request from {request.user.email} with data: {data}')

	title = data.get('title')
	if not title:
		logger.warning('create_task: title is required')
		return Response({'detail': 'title is required'}, status=status.HTTP_400_BAD_REQUEST)

	assigned_to_id = data.get('assigned_to')
	if not assigned_to_id:
		logger.warning('create_task: assigned_to is required')
		return Response({'detail': 'assigned_to is required'}, status=status.HTTP_400_BAD_REQUEST)

	try:
		emp = Employee.objects.get(id=assigned_to_id)
		logger.info(f'create_task: found employee {emp.email}')
	except Employee.DoesNotExist:
		logger.warning(f'create_task: employee {assigned_to_id} not found')
		return Response({'detail': 'assigned_to not found'}, status=status.HTTP_400_BAD_REQUEST)

	try:
		chef_emp = Employee.objects.get(email=request.user.email)
		logger.info(f'create_task: chef {chef_emp.email} found in service {chef_emp.service.nomService}')
	except Employee.DoesNotExist:
		logger.warning(f'create_task: chef {request.user.email} has no employee record')
		return Response({'detail': 'chef has no employee record'}, status=status.HTTP_400_BAD_REQUEST)

	if emp.service_id != chef_emp.service_id:
		logger.warning(f'create_task: chef service {chef_emp.service_id} != employee service {emp.service_id}')
		return Response({'detail': 'cannot assign outside your service'}, status=status.HTTP_403_FORBIDDEN)

	task = Task.objects.create(
		title=title,
		description=data.get('description', ''),
		due_date=data.get('due_date', None),
		assigned_to=emp,
		assigned_by=request.user,
	)

	try:
		assigned_user = User.objects.get(email=emp.email)
		chef_name = f"{request.user.first_name} {request.user.last_name}".strip() or request.user.email
		notify(
			assigned_user,
			title='New task assigned',
			message=f"{chef_name} assigned you a task: {title}",
			link='/tasks'
		)
	except User.DoesNotExist:
		pass

	logger.info(f'create_task: task {task.id} created and assigned to {emp.email}')
	return Response({'id': task.id}, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_tasks(request):
	"""Employee view of their tasks."""
	try:
		emp = Employee.objects.get(email=request.user.email)
	except Employee.DoesNotExist:
		return Response([], status=status.HTTP_200_OK)

	qs = Task.objects.filter(assigned_to=emp).order_by('-created_at')
	data = [{
		'id': t.id,
		'title': t.title,
		'description': t.description,
		'status': t.status,
		'due_date': t.due_date,
		'created_at': t.created_at,
		'completed_at': t.completed_at,
		'assigned_by': {
			'id': t.assigned_by.id,
			'email': t.assigned_by.email,
			'first_name': t.assigned_by.first_name,
			'last_name': t.assigned_by.last_name,
		} if t.assigned_by else None
	} for t in qs]
	return Response(data)


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsChef])
def chef_tasks(request):
	"""Chef view of all tasks assigned by this chef."""
	qs = Task.objects.filter(assigned_by=request.user).order_by('-created_at')
	logger.info(f'chef_tasks: fetching tasks for chef {request.user.email}, found {qs.count()} tasks')

	data = [{
		'id': t.id,
		'title': t.title,
		'description': t.description,
		'status': t.status,
		'due_date': t.due_date,
		'created_at': t.created_at,
		'completed_at': t.completed_at,
		'employee': {
			'id': t.assigned_to.id,
			'email': t.assigned_to.email,
			'first_name': t.assigned_to.first_name,
			'last_name': t.assigned_to.last_name,
			'service': {
				'code': t.assigned_to.service.code,
				'nomService': t.assigned_to.service.nomService
			} if t.assigned_to.service else None
		},
		'assigned_by': {
			'id': t.assigned_by.id,
			'email': t.assigned_by.email,
			'first_name': t.assigned_by.first_name,
			'last_name': t.assigned_by.last_name,
		} if t.assigned_by else None
	} for t in qs]
	return Response(data)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def mark_task_done(request, pk):
	"""Mark a task as done (only assigned employee can do this)."""
	try:
		task = Task.objects.get(id=pk)
	except Task.DoesNotExist:
		return Response({'detail': 'not found'}, status=status.HTTP_404_NOT_FOUND)

	if task.assigned_to.email != request.user.email:
		return Response({'detail': 'forbidden'}, status=status.HTTP_403_FORBIDDEN)

	task.status = Task.Status.DONE
	task.completed_at = timezone.now()
	task.save()

	if task.assigned_by:
		emp = task.assigned_to
		notify(
			task.assigned_by,
			title='Task Completed',
			message=f"{emp.first_name} {emp.last_name} marked '{task.title}' as done",
			link='/tasks'
		)
		logger.info(f'mark_task_done: notified chef {task.assigned_by.email} that task {task.id} was completed')

	return Response({'ok': True})
