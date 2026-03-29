# madar_app/views/__init__.py
# Central re-export: keeps config/urls.py intact (no changes needed there).

from .auth import ping, rbac_test, whoami, token_obtain_pair, logout
from .employees import employees_list, services_list, positions_list, create_employee, update_employee, delete_employee, reset_employee_password
from .profile import get_profile, update_profile, change_password
from .tasks import create_task, my_tasks, chef_tasks, submit_task_work, review_task_submission, mark_task_done
from .attendance import attendance_check_in, attendance_check_out, attendance_me, attendance_team
from .leaves import create_leave, my_leaves, update_my_leave, cancel_my_leave, department_pending_leaves, approve_leave, reject_leave, leave_types_list, my_leave_balances
from .absences import absences_yesterday, create_warning, discipline_flags
from .notifications import list_notifications, mark_notification_read
from .formation import (
	formation_list,
	create_formation_request,
	formation_detail,
	agent_formation_requests,
	agent_formations_catalog,
	approve_formation_request,
	reject_formation_request,
	get_department_employees,
	add_formation_participants,
	update_delete_formation_catalog,
)
from .documents import (
	upload_document,
	document_detail,
	send_document,
	modify_document,
	download_document,
	list_documents_scoped,
	documents_feed,
	documents_mine,
	comment_document,
	document_comments,
	validate_document,
	reject_document_validation,
	archive_document,
)
from .reports import reports_summary, export_attendance_report, export_leaves_report, export_tasks_report
from .messages import (
	inbox,
	sent,
	trash,
	get_message,
	mark_message_read_unread,
	delete_message,
	search_messages,
	send_message,
	reply_message,
	forward_message,
	drafts_list,
	save_draft,
	delete_draft,
	report_message,
	block_user,
	unblock_user,
	blocked_users_list,
	admin_reports_list,
	admin_resolve_report,
	announcements_list,
	create_announcement,
	messaging_settings,
	update_messaging_settings,
)
from . import dashboard, kpis, charts

__all__ = [
	# auth
	'ping', 'rbac_test', 'whoami', 'token_obtain_pair',
	# employees
	'employees_list', 'departments_list', 'positions_list', 'create_employee', 'update_employee', 'delete_employee', 'reset_employee_password',
	# profile
	'get_profile', 'update_profile', 'change_password',
	# tasks
	'create_task', 'my_tasks', 'chef_tasks', 'submit_task_work', 'review_task_submission', 'mark_task_done',
	# attendance
	'attendance_check_in', 'attendance_check_out', 'attendance_me', 'attendance_team',
	# leaves
	'create_leave', 'my_leaves', 'update_my_leave', 'cancel_my_leave', 'department_pending_leaves', 'approve_leave', 'reject_leave', 'leave_types_list', 'my_leave_balances',
	# absences & discipline
	'absences_yesterday', 'create_warning', 'discipline_flags',
	# notifications
	'list_notifications', 'mark_notification_read',
	# formation
	'formation_list', 'create_formation_request', 'formation_detail',
	'agent_formation_requests', 'agent_formations_catalog',
	'approve_formation_request', 'reject_formation_request',
	'get_department_employees', 'add_formation_participants',
	# documents
	'upload_document', 'document_detail', 'send_document', 'modify_document', 'download_document', 'list_documents_scoped',
	'documents_feed', 'documents_mine', 'comment_document',
	'document_comments', 'validate_document', 'reject_document_validation', 'archive_document',
	# reports
	'reports_summary', 'export_attendance_report', 'export_leaves_report', 'export_tasks_report',
	# messages
	'inbox', 'sent', 'trash', 'get_message', 'mark_message_read_unread', 'delete_message',
	'search_messages', 'send_message', 'reply_message', 'forward_message',
	'drafts_list', 'save_draft', 'delete_draft', 'report_message',
	'block_user', 'unblock_user', 'blocked_users_list',
	'admin_reports_list', 'admin_resolve_report',
	'announcements_list', 'create_announcement',
	'messaging_settings', 'update_messaging_settings',
	# dashboard & statistics
	'dashboard', 'kpis', 'charts',
]
