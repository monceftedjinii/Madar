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
from rest_framework_simplejwt.views import TokenRefreshView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/ping/', madar_views.ping, name='api-ping'),
    path('api/rbac-test/', madar_views.rbac_test, name='api-rbac-test'),
    path('api/auth/token/', madar_views.token_obtain_pair, name='token_obtain_pair'),
    path('api/auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/auth/logout/', madar_views.logout, name='api-logout'),
    path('api/whoami/', madar_views.whoami, name='api-whoami'),
    path('api/profile/', madar_views.get_profile, name='api-profile'),
    path('api/profile/update/', madar_views.update_profile, name='api-profile-update'),
    path('api/profile/change-password/', madar_views.change_password, name='api-profile-change-password'),
    path('api/employees/', madar_views.employees_list, name='api-employees'),
    path('api/employees/create/', madar_views.create_employee, name='api-employees-create'),
    path('api/employees/<int:pk>/update/', madar_views.update_employee, name='api-employees-update'),
    path('api/employees/<int:pk>/delete/', madar_views.delete_employee, name='api-employees-delete'),
    path('api/employees/<int:pk>/reset-password/', madar_views.reset_employee_password, name='api-employees-reset-password'),
    path('api/services/', madar_views.services_list, name='api-services'),
    path('api/positions/', madar_views.positions_list, name='api-positions'),
    path('api/tasks/', madar_views.create_task, name='api-tasks-create'),
    path('api/tasks/me/', madar_views.my_tasks, name='api-tasks-me'),
    path('api/tasks/chef/', madar_views.chef_tasks, name='api-tasks-chef'),
    path('api/tasks/<int:pk>/update/', madar_views.update_chef_task, name='api-tasks-update'),
    path('api/tasks/<int:pk>/delete/', madar_views.delete_chef_task, name='api-tasks-delete'),
    path('api/tasks/<int:pk>/submit/', madar_views.submit_task_work, name='api-tasks-submit'),
    path('api/tasks/<int:pk>/review/', madar_views.review_task_submission, name='api-tasks-review'),
    path('api/tasks/<int:pk>/done/', madar_views.mark_task_done, name='api-tasks-done'),
    path('api/attendance/check-in/', madar_views.attendance_check_in, name='api-att-check-in'),
    path('api/attendance/check-out/', madar_views.attendance_check_out, name='api-att-check-out'),
    path('api/attendance/me/', madar_views.attendance_me, name='api-att-me'),
    path('api/attendance/team/', madar_views.attendance_team, name='api-att-team'),
    path('api/leaves/', madar_views.create_leave, name='api-leaves-create'),
    path('api/leave-types/', madar_views.leave_types_list, name='api-leave-types-list'),
    path('api/leaves/balances/', madar_views.my_leave_balances, name='api-leaves-balances'),
    path('api/leaves/me/', madar_views.my_leaves, name='api-leaves-me'),
    path('api/leaves/<int:pk>/update/', madar_views.update_my_leave, name='api-leaves-update-my'),
    path('api/leaves/<int:pk>/cancel/', madar_views.cancel_my_leave, name='api-leaves-cancel-my'),
    path('api/leaves/department/', madar_views.department_pending_leaves, name='api-leaves-department'),
    path('api/leaves/<int:pk>/approve/', madar_views.approve_leave, name='api-leaves-approve'),
    path('api/leaves/<int:pk>/reject/', madar_views.reject_leave, name='api-leaves-reject'),
    path('api/absences/yesterday/', madar_views.absences_yesterday, name='api-absences-yesterday'),
    path('api/warnings/', madar_views.create_warning, name='api-warnings-create'),
    path('api/discipline/flags/', madar_views.discipline_flags, name='api-discipline-flags'),
    path('api/notifications/', madar_views.list_notifications, name='api-notifications'),
    path('api/notifications/<int:pk>/read/', madar_views.mark_notification_read, name='api-notifications-read'),
    path('api/formations/', madar_views.formation_list, name='api-formations-list'),
    path('api/formations/create/', madar_views.create_formation_request, name='api-formations-create'),
    path('api/formations/<int:pk>/', madar_views.formation_detail, name='api-formations-detail'),
    path('api/agent/formations/requests/', madar_views.agent_formation_requests, name='api-agent-formations-requests'),
    path('api/agent/formations/catalog/', madar_views.agent_formations_catalog, name='api-agent-formations-catalog'),
    path('api/agent/formations/catalog/<int:pk>/', madar_views.update_delete_formation_catalog, name='api-agent-formations-catalog-detail'),
    path('api/agent/formations/requests/<int:pk>/approve/', madar_views.approve_formation_request, name='api-agent-approve-request'),
    path('api/agent/formations/requests/<int:pk>/reject/', madar_views.reject_formation_request, name='api-agent-reject-request'),
    path('api/formations/<int:pk>/add-participants/', madar_views.add_formation_participants, name='api-formations-add-participants'),
    path('api/formations/department-employees/', madar_views.get_department_employees, name='api-formations-department-employees'),
    path('api/documents/', madar_views.upload_document, name='api-documents-upload'),
    path('api/documents/<int:pk>/', madar_views.document_detail, name='api-documents-detail'),
    path('api/documents/me/', madar_views.list_documents_scoped, name='api-documents-list'),
    path('api/documents/feed/', madar_views.documents_feed, name='api-documents-feed'),
    path('api/documents/mine/', madar_views.documents_mine, name='api-documents-mine'),
    path('api/documents/<int:pk>/send/', madar_views.send_document, name='api-documents-send'),
    path('api/documents/<int:pk>/modify/', madar_views.modify_document, name='api-documents-modify'),
    path('api/documents/<int:pk>/download/', madar_views.download_document, name='api-documents-download'),
    path('api/documents/<int:pk>/comment/', madar_views.comment_document, name='api-documents-comment'),
    path('api/documents/<int:pk>/comments/', madar_views.document_comments, name='api-documents-comments'),
    path('api/documents/<int:pk>/validate/', madar_views.validate_document, name='api-documents-validate'),
    path('api/documents/<int:pk>/validate/reject/', madar_views.reject_document_validation, name='api-documents-validate-reject'),
    path('api/documents/<int:pk>/archive/', madar_views.archive_document, name='api-documents-archive'),
    path('api/reports/summary/', madar_views.reports_summary, name='api-reports-summary'),
    path('api/reports/attendance/export/', madar_views.export_attendance_report, name='api-reports-attendance-export'),
    path('api/reports/leaves/export/', madar_views.export_leaves_report, name='api-reports-leaves-export'),
    path('api/reports/tasks/export/', madar_views.export_tasks_report, name='api-reports-tasks-export'),
    path('api/evaluation/criteria/', madar_views.evaluation_criteria_list, name='api-evaluation-criteria'),
    path('api/evaluations/me/', madar_views.my_evaluations, name='api-evaluations-me'),
    path('api/evaluations/chef/', madar_views.chef_evaluations, name='api-evaluations-chef'),
    path('api/reports/attendance/export', madar_views.export_attendance_report, name='api-reports-attendance-export-noslash'),
    path('api/reports/leaves/export', madar_views.export_leaves_report, name='api-reports-leaves-export-noslash'),
    path('api/reports/tasks/export', madar_views.export_tasks_report, name='api-reports-tasks-export-noslash'),
    
    # MODULE 10: INTERNAL MESSAGING
    # Employee: Inbox & Message Management
    path('api/messages/inbox/', madar_views.inbox, name='api-messages-inbox'),
    path('api/messages/sent/', madar_views.sent, name='api-messages-sent'),
    path('api/messages/trash/', madar_views.trash, name='api-messages-trash'),
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
    
    # ──────────────────────────────────────────────────────────────────────
    # Dashboard & Statistics API Endpoints
    # ──────────────────────────────────────────────────────────────────────
    
    # Dashboard endpoints
    path('api/dashboard/', madar_views.dashboard.get_dashboard, name='api-dashboard'),
    path('api/dashboard/employee/', madar_views.dashboard.get_employee_dashboard, name='api-dashboard-employee'),
    path('api/dashboard/chef/', madar_views.dashboard.get_chef_dashboard, name='api-dashboard-chef'),
    path('api/dashboard/refresh/', madar_views.dashboard.refresh_dashboard, name='api-dashboard-refresh'),
    path('api/dashboard/customize/', madar_views.dashboard.customize_dashboard, name='api-dashboard-customize'),
    path('api/dashboard/widgets/', madar_views.dashboard.get_dashboard_widgets, name='api-dashboard-widgets'),
    
    # KPI calculation endpoints
    path('api/kpis/<str:kpi_type>/', madar_views.kpis.calculate_kpi, name='api-kpi-calculate'),
    path('api/kpis/', madar_views.kpis.get_all_kpis, name='api-kpis-all'),
    path('api/kpis/threshold/check/', madar_views.kpis.check_kpi_threshold, name='api-kpi-threshold'),
    
    # Chart/Graph generation endpoints
    path('api/charts/<str:kpi_type>/', madar_views.charts.generate_kpi_chart, name='api-chart-kpi'),
    path('api/charts/', madar_views.charts.generate_multiple_charts, name='api-charts-multiple'),
    path('api/charts/custom/', madar_views.charts.generate_custom_chart, name='api-chart-custom'),
    path('api/charts/types/', madar_views.charts.get_chart_types, name='api-chart-types'),
    
    # Report generation and export endpoints
    path('api/reports/generate/', madar_views.reports.generate_dashboard_report, name='api-report-generate'),
    path('api/reports/export/', madar_views.reports.export_dashboard_report, name='api-report-export'),
]
# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
