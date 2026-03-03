"""
URL configuration for config project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path
from django.conf import settings
from django.conf.urls.static import static
from madar_app import views as madar_views
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/ping/', madar_views.ping, name='api-ping'),
    path('api/rbac-test/', madar_views.rbac_test, name='api-rbac-test'),
    path('api/auth/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/whoami/', madar_views.whoami, name='api-whoami'),
    path('api/profile/', madar_views.get_profile, name='api-profile'),
    path('api/profile/update/', madar_views.update_profile, name='api-profile-update'),
    path('api/profile/change-password/', madar_views.change_password, name='api-profile-change-password'),
    path('api/employees/', madar_views.employees_list, name='api-employees'),
    path('api/employees/create/', madar_views.create_employee, name='api-employees-create'),
    path('api/employees/<int:pk>/update/', madar_views.update_employee, name='api-employees-update'),
    path('api/employees/<int:pk>/delete/', madar_views.delete_employee, name='api-employees-delete'),
    path('api/employees/<int:pk>/reset-password/', madar_views.reset_employee_password, name='api-employees-reset-password'),
    path('api/departments/', madar_views.departments_list, name='api-departments'),
    path('api/tasks/', madar_views.create_task, name='api-tasks-create'),
    path('api/tasks/me/', madar_views.my_tasks, name='api-tasks-me'),
    path('api/tasks/chef/', madar_views.chef_tasks, name='api-tasks-chef'),
    path('api/tasks/<int:pk>/done/', madar_views.mark_task_done, name='api-tasks-done'),
    path('api/attendance/check-in/', madar_views.attendance_check_in, name='api-att-check-in'),
    path('api/attendance/check-out/', madar_views.attendance_check_out, name='api-att-check-out'),
    path('api/attendance/me/', madar_views.attendance_me, name='api-att-me'),
    path('api/leaves/', madar_views.create_leave, name='api-leaves-create'),
    path('api/leaves/me/', madar_views.my_leaves, name='api-leaves-me'),
    path('api/leaves/department/', madar_views.department_pending_leaves, name='api-leaves-department'),
    path('api/leaves/<int:pk>/approve/', madar_views.approve_leave, name='api-leaves-approve'),
    path('api/leaves/<int:pk>/reject/', madar_views.reject_leave, name='api-leaves-reject'),
    path('api/absences/yesterday/', madar_views.absences_yesterday, name='api-absences-yesterday'),
    path('api/warnings/', madar_views.create_warning, name='api-warnings-create'),
    path('api/discipline/flags/', madar_views.discipline_flags, name='api-discipline-flags'),
    path('api/notifications/', madar_views.list_notifications, name='api-notifications'),
    path('api/notifications/<int:pk>/read/', madar_views.mark_notification_read, name='api-notifications-read'),
    path('api/documents/', madar_views.upload_document, name='api-documents-upload'),
    path('api/documents/me/', madar_views.list_documents_scoped, name='api-documents-list'),
    path('api/documents/feed/', madar_views.documents_feed, name='api-documents-feed'),
    path('api/documents/mine/', madar_views.documents_mine, name='api-documents-mine'),
    path('api/documents/<int:pk>/send/', madar_views.send_document, name='api-documents-send'),
    path('api/documents/<int:pk>/comment/', madar_views.comment_document, name='api-documents-comment'),
    path('api/documents/<int:pk>/comments/', madar_views.document_comments, name='api-documents-comments'),
    path('api/documents/<int:pk>/validate/', madar_views.validate_document, name='api-documents-validate'),
    path('api/documents/<int:pk>/archive/', madar_views.archive_document, name='api-documents-archive'),
    path('api/reports/summary/', madar_views.reports_summary, name='api-reports-summary'),
    path('api/reports/attendance/export/', madar_views.export_attendance_report, name='api-reports-attendance-export'),
    path('api/reports/leaves/export/', madar_views.export_leaves_report, name='api-reports-leaves-export'),
    path('api/reports/tasks/export/', madar_views.export_tasks_report, name='api-reports-tasks-export'),
    path('api/reports/attendance/export', madar_views.export_attendance_report, name='api-reports-attendance-export-noslash'),
    path('api/reports/leaves/export', madar_views.export_leaves_report, name='api-reports-leaves-export-noslash'),
    path('api/reports/tasks/export', madar_views.export_tasks_report, name='api-reports-tasks-export-noslash'),
    
    # MODULE 10: INTERNAL MESSAGING
    # Employee: Inbox & Message Management
    path('api/messages/inbox/', madar_views.inbox, name='api-messages-inbox'),
    path('api/messages/sent/', madar_views.sent, name='api-messages-sent'),
    path('api/messages/<int:pk>/', madar_views.get_message, name='api-messages-get'),
    path('api/messages/<int:pk>/read-status/', madar_views.mark_message_read_unread, name='api-messages-read-status'),
    path('api/messages/<int:pk>/delete/', madar_views.delete_message, name='api-messages-delete'),
    path('api/messages/search/', madar_views.search_messages, name='api-messages-search'),
    
    # Employee: Compose & Send
    path('api/messages/send/', madar_views.send_message, name='api-messages-send'),
    path('api/messages/<int:pk>/reply/', madar_views.reply_message, name='api-messages-reply'),
    path('api/messages/<int:pk>/forward/', madar_views.forward_message, name='api-messages-forward'),
    
    # Employee: Drafts
    path('api/messages/drafts/', madar_views.drafts_list, name='api-messages-drafts'),
    path('api/messages/save-draft/', madar_views.save_draft, name='api-messages-save-draft'),
    path('api/messages/drafts/<int:pk>/delete/', madar_views.delete_draft, name='api-messages-delete-draft'),
    
    # Employee: Reporting & Blocking
    path('api/messages/<int:pk>/report/', madar_views.report_message, name='api-messages-report'),
    path('api/users/<int:user_id>/block/', madar_views.block_user, name='api-users-block'),
    path('api/users/<int:user_id>/unblock/', madar_views.unblock_user, name='api-users-unblock'),
    path('api/users/blocked/', madar_views.blocked_users_list, name='api-users-blocked'),
    
    # Admin: View & Moderate Reports
    path('api/admin/message-reports/', madar_views.admin_reports_list, name='api-admin-message-reports'),
    path('api/admin/message-reports/<int:pk>/resolve/', madar_views.admin_resolve_report, name='api-admin-resolve-report'),
    
    # Admin: Announcements
    path('api/announcements/', madar_views.announcements_list, name='api-announcements'),
    path('api/announcements/create/', madar_views.create_announcement, name='api-announcements-create'),
    
    # Admin: Messaging Settings
    path('api/admin/messaging-settings/', madar_views.messaging_settings, name='api-messaging-settings'),
    path('api/admin/messaging-settings/update/', madar_views.update_messaging_settings, name='api-messaging-settings-update'),
]
# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)