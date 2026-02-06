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
    path('api/employees/', madar_views.employees_list, name='api-employees'),
    path('api/tasks/', madar_views.create_task, name='api-tasks-create'),
    path('api/tasks/me/', madar_views.my_tasks, name='api-tasks-me'),
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
    path('api/documents/<int:pk>/send/', madar_views.send_document, name='api-documents-send'),
    path('api/documents/<int:pk>/comment/', madar_views.comment_document, name='api-documents-comment'),
    path('api/documents/<int:pk>/validate/', madar_views.validate_document, name='api-documents-validate'),
    path('api/documents/<int:pk>/archive/', madar_views.archive_document, name='api-documents-archive'),
    path('api/reports/summary/', madar_views.reports_summary, name='api-reports-summary'),
]
# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)