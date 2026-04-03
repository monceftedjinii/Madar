"""
Dashboard API endpoints for HR Director.

This module implements the complete dashboard flow:
1. Retrieve dashboard with widgets (KPIs, charts)
2. Auto-refresh dashboard data
3. Handle dashboard customization
4. Generate and export reports
"""

from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from datetime import datetime, timedelta
from django.core.cache import cache
from django.db.models import Q

from madar_app.services import (
    StatisticsService,
    ReportFilter,
    KPIResult,
    Dashboard,
    Graph,
    ExportService,
    ExportFile,
    EmployeeDashboardService,
    ChefDashboardService,
    RhDashboardService,
)
from madar_app.models import (
    User,
    Notification,
    Employee,
    Task,
    Attendance,
    LeaveRequest,
    Message,
    Announcement,
)
from ..permissions import IsChef, IsEmployee, IsRH


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsEmployee])
def get_employee_dashboard(request):
    """Return a complete employee dashboard payload for a standard employee."""
    try:
        return Response(
            EmployeeDashboardService(
                request.user,
                request=request,
                month=request.query_params.get("month"),
            ).build()
        )
    except ValueError as e:
        return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        return Response(
            {'error': f'Failed to load employee dashboard: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
@permission_classes([IsAuthenticated, IsChef])
def get_chef_dashboard(request):
    """Return a complete dashboard payload for a chef de service."""
    try:
        return Response(
            ChefDashboardService(
                request.user,
                request=request,
                month=request.query_params.get("month"),
            ).build()
        )
    except ValueError as e:
        return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        return Response(
            {'error': f'Echec du chargement du dashboard chef: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsRH])
def get_rh_dashboard(request):
    """Return a complete dashboard payload for RH, RH senior, RH agent and GRH."""
    try:
        return Response(
            RhDashboardService(
                request.user,
                request=request,
                month=request.query_params.get("month"),
            ).build()
        )
    except ValueError as e:
        return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        return Response(
            {'error': f"Echec du chargement du dashboard RH: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

    try:
        today = timezone.localdate()
        month_start = today.replace(day=1)

        employee = Employee.objects.select_related('service', 'position').filter(
            email=request.user.email
        ).first()

        full_name = f"{request.user.first_name or (employee.first_name if employee else '')} {request.user.last_name or (employee.last_name if employee else '')}".strip() or request.user.email
        department = employee.service.nomService if employee and employee.service else 'Non renseigné'
        role = employee.position.name if employee and employee.position else 'Employé'
        avatar = request.build_absolute_uri(request.user.profile_picture.url) if getattr(request.user, 'profile_picture', None) else (
            request.build_absolute_uri(employee.profile_picture.url) if employee and employee.profile_picture else None
        )

        tasks_qs = Task.objects.filter(assigned_to=employee).order_by('-created_at') if employee else Task.objects.none()
        attendance_qs = Attendance.objects.filter(employee=employee, date__gte=month_start, date__lte=today).order_by('date') if employee else Attendance.objects.none()
        leaves_qs = LeaveRequest.objects.filter(employee=employee).select_related('type').order_by('-created_at') if employee else LeaveRequest.objects.none()
        notifications_qs = Notification.objects.filter(user=request.user).order_by('-created_at')
        inbox_qs = Message.objects.filter(
            recipient=request.user,
            is_deleted_by_recipient=False,
        ).select_related('sender', 'recipient').order_by('-created_at')

        announcements_qs = Announcement.objects.select_related('creator', 'target_service').order_by('-created_at')
        if employee and employee.service:
            announcements_qs = announcements_qs.filter(
                Q(scope='GLOBAL') | Q(scope='SERVICE', target_service=employee.service)
            )
        else:
            announcements_qs = announcements_qs.filter(scope='GLOBAL')

        task_rows = []
        completed_count = 0
        pending_count = 0
        late_count = 0
        for task in tasks_qs:
            due_date = task.due_date
            if task.status == Task.Status.DONE:
                status_label = 'Terminée'
                progress = 100
                completed_count += 1
            elif due_date and due_date < today:
                status_label = 'En retard'
                progress = 80
                late_count += 1
            elif due_date and (due_date - today).days <= 2:
                status_label = 'En cours'
                progress = 65
                pending_count += 1
            else:
                status_label = 'En attente'
                progress = 35 if due_date else 20
                pending_count += 1

            if due_date:
                days_until_due = (due_date - today).days
                if days_until_due <= 1:
                    priority = 'Haute'
                elif days_until_due <= 4:
                    priority = 'Moyenne'
                else:
                    priority = 'Basse'
            else:
                priority = 'Moyenne'

            task_rows.append({
                'id': task.id,
                'name': task.title,
                'priority': priority,
                'deadline': due_date.isoformat() if due_date else '-',
                'status': status_label,
                'progress': progress,
            })

        attendance_total = attendance_qs.count()
        attendance_complete = attendance_qs.filter(
            check_in_time__isnull=False,
            check_out_time__isnull=False,
        ).count()
        attendance_rate = round((attendance_complete / attendance_total) * 100) if attendance_total else 0
        overall_progress = round((completed_count / len(task_rows)) * 100) if task_rows else 0
        unread_notifications = notifications_qs.filter(is_read=False).count()

        raw_score = 8 + attendance_rate * 0.05 + overall_progress * 0.06 - late_count * 0.7 - unread_notifications * 0.15
        final_score = round(max(6, min(20, raw_score)), 1)
        if final_score >= 16:
            status_label = 'Excellent'
        elif final_score >= 12:
            status_label = 'Bon'
        elif final_score >= 8:
            status_label = 'Moyen'
        else:
            status_label = 'À améliorer'

        base_perf = round((attendance_rate + (round((completed_count / len(task_rows)) * 100) if task_rows else 0)) / 2) if (attendance_rate or task_rows) else 40
        weekly_performance = [
            max(35, min(100, base_perf - 8)),
            max(35, min(100, base_perf - 2)),
            max(35, min(100, base_perf + 3)),
            max(35, min(100, base_perf + 7)),
        ]
        monthly_progress = [
            max(15, min(100, weekly_performance[0] - 20)),
            max(15, min(100, weekly_performance[0] - 8)),
            weekly_performance[0],
            max(15, min(100, weekly_performance[1] - 4)),
            weekly_performance[1],
            max(15, min(100, weekly_performance[2] - 3)),
            weekly_performance[2],
            weekly_performance[3],
        ]

        skills = {
            'punctuality': max(6, min(20, round(attendance_rate / 5) if attendance_rate else 8)),
            'productivity': max(6, min(20, round(overall_progress / 5) if overall_progress else 8)),
            'teamwork': max(6, min(20, 15 - late_count + min(inbox_qs.count(), 4))),
            'discipline': max(6, min(20, 14 - late_count + round(attendance_rate / 20) if attendance_rate else 10)),
            'qualityOfWork': max(6, min(20, 12 + completed_count)),
        }

        today_attendance = attendance_qs.filter(date=today).first()
        planning = [{
            'id': 'attendance',
            'time': (today_attendance.check_in_time.isoformat()[:5] if today_attendance and today_attendance.check_in_time else '08:30'),
            'title': 'Présence enregistrée aujourd\'hui' if today_attendance and today_attendance.check_out_time else 'Pointage du jour',
            'subtitle': (
                f"Entrée {today_attendance.check_in_time.isoformat()[:5]} • Sortie {today_attendance.check_out_time.isoformat()[:5]}"
                if today_attendance and today_attendance.check_in_time and today_attendance.check_out_time
                else 'Pensez à valider votre présence'
            ),
        }]
        planning.extend([
            {
                'id': f'task-{task["id"]}',
                'time': task['deadline'],
                'title': task['name'],
                'subtitle': f"Priorité {task['priority'].lower()}",
            }
            for task in task_rows if task['deadline'] != '-'
        ][:2])

        panel_notifications = [
            {
                'id': f'notif-{item.id}',
                'title': item.title,
                'message': item.message,
                'level': 'important' if not item.is_read else 'info',
            }
            for item in notifications_qs[:2]
        ]
        panel_notifications.extend([
            {
                'id': f'ann-{item.id}',
                'title': item.title,
                'message': item.message,
                'level': 'info',
            }
            for item in announcements_qs[:1]
        ])

        hr_requests = [
            {
                'id': leave.id,
                'label': leave.type.libelle,
                'status': 'En attente' if leave.status == LeaveRequest.Status.PENDING else 'Accepté' if leave.status == LeaveRequest.Status.ACCEPTED else 'Refusé',
            }
            for leave in leaves_qs[:3]
        ]

        quick_messages = [
            {
                'id': message.id,
                'sender': (
                    f"{message.sender.first_name} {message.sender.last_name}".strip() or message.sender.email
                ),
                'subject': message.subject,
            }
            for message in inbox_qs[:3]
        ]

        stats = [
            {'id': 'total', 'label': 'Total des tâches', 'value': len(task_rows), 'helper': 'Toutes les tâches assignées'},
            {'id': 'completed', 'label': 'Tâches terminées', 'value': completed_count, 'helper': 'Tâches finalisées'},
            {'id': 'pending', 'label': 'Tâches en attente', 'value': pending_count, 'helper': 'En cours ou à démarrer'},
            {'id': 'late', 'label': 'Tâches en retard', 'value': late_count, 'helper': 'Délais dépassés'},
            {'id': 'attendance', 'label': 'Taux de présence', 'value': f'{attendance_rate}%', 'helper': 'Présence personnelle'},
            {'id': 'performance', 'label': 'Performance mensuelle', 'value': f'{round(sum(weekly_performance) / len(weekly_performance))}%', 'helper': 'Performance du mois'},
            {'id': 'score', 'label': 'Note mensuelle', 'value': f'{final_score:.1f}/20', 'helper': 'Score estimé actuel'},
        ]

        response_data = {
            'profile': {
                'fullName': full_name,
                'role': role,
                'department': department,
                'email': request.user.email,
                'avatar': avatar or '',
                'attendanceRate': attendance_rate,
                'overallProgress': overall_progress,
                'finalScore': final_score,
                'topSkill': 'Ponctualité' if attendance_rate >= 90 else 'Productivité' if overall_progress >= 70 else 'Rigueur',
                'statusLabel': status_label,
            },
            'header': {
                'department': department,
                'monthLabel': today.strftime('%B %Y'),
            },
            'stats': stats,
            'charts': {
                'weeklyPerformance': weekly_performance,
                'monthlyProgress': monthly_progress,
                'taskBreakdown': {
                    'completed': completed_count,
                    'pending': pending_count,
                    'late': late_count,
                },
                'skills': skills,
            },
            'scoreInsights': {
                'achievement': 'Présence régulière et implication stable tout au long du mois.' if attendance_rate >= 90 else 'Progression continue sur vos missions du mois.',
                'improvement': 'Réduire les tâches en retard pour améliorer la note mensuelle.' if late_count > 0 else 'Maintenir le rythme actuel et clôturer plus vite les tâches en attente.',
            },
            'tasks': task_rows,
            'panels': {
                'planning': planning,
                'notifications': panel_notifications,
                'hrRequests': hr_requests,
                'quickMessages': quick_messages,
            },
            'generatedAt': timezone.now().isoformat(),
        }
        return Response(response_data)
    except Exception as e:
        return Response(
            {'error': f'Failed to load employee dashboard: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_dashboard(request):
    """
    Retrieve the complete dashboard with all widgets.
    
    Query Parameters:
        - start_date: ISO date string (default: 90 days ago)
        - end_date: ISO date string (default: today)
        - service_id: specific service filter (optional)
        - contract_type: CDD/CDI/STAGE (optional)
        - auto_refresh: boolean to enable auto refresh (default: false)
    
    Returns:
        {
            'id': 'dashboard-1',
            'name': 'HR Director Dashboard',
            'widgets': [...],
            'period': {'start_date': '2026-01-01', 'end_date': '2026-03-09'},
            'last_updated': '2026-03-09T10:30:00Z',
            'refresh_strategy': 'on-demand|cache|scheduled',
            'refresh_interval': 300000 (milliseconds)
        }
    """
    try:
        # Extract and validate filter parameters
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        service_id = request.query_params.get('service_id')
        contract_type = request.query_params.get('contract_type')
        
        # Set defaults if not provided
        end_date = end_date or timezone.now().date().isoformat()
        start_date = start_date or (timezone.now().date() - timedelta(days=90)).isoformat()
        
        # Create report filter
        report_filter = ReportFilter(
            start_date=datetime.fromisoformat(start_date).date(),
            end_date=datetime.fromisoformat(end_date).date(),
            service_id=service_id,
            contract_type=contract_type,
            employee_status='ACTIVE'
        )
        
        # Build dashboard configuration
        dashboard_config = {
            'period': {'start_date': start_date, 'end_date': end_date},
            'filters': {
                'service_id': service_id,
                'contract_type': contract_type,
                'employee_status': 'ACTIVE'
            },
            'visible_widgets': ['employee_count', 'turnover', 'absenteeism', 'evaluations'],
            'refresh_strategy': 'on-demand'  # Can be changed in settings
        }
        
        # Determine auto refresh
        auto_refresh = request.query_params.get('auto_refresh', 'false').lower() == 'true'
        
        # Create dashboard instance with correct parameters
        dashboard = Dashboard(
            report_filter=report_filter,
            auto_refresh=auto_refresh,
            is_public=False
        )
        
        # Refresh if auto_refresh is enabled
        if auto_refresh:
            dashboard.refresh()
        
        # Get dashboard widgets
        widgets = dashboard.get_widgets()
        
        # Generate chart data for each widget
        stats_service = StatisticsService()
        chart_widgets = []
        
        for kpi_type in ['employee_count', 'turnover', 'absenteeism', 'evaluations']:
            try:
                # Calculate KPI
                kpi_result = stats_service.calculerKPI(kpi_type, report_filter)
                
                if kpi_result:
                    # Convert to graph
                    graph = Graph.from_kpi(kpi_result)
                    
                    # Build chart widget with proper format
                    graph_dict = graph.to_dict() if graph else {}
                    
                    chart_widgets.append({
                        'type': kpi_type,
                        'title': _translate_kpi_title(kpi_type),
                        'kpi': {
                            'type': kpi_result.type.value,
                            'value': float(kpi_result.value),
                            'unit': _get_kpi_unit(kpi_type),
                            'trend': kpi_result.trend.value if kpi_result.trend else None,
                            'calculation_date': kpi_result.calculation_date.isoformat(),
                            'details': kpi_result.details
                        },
                        'chart': {
                            'type': graph_dict.get('chart_type', 'bar'),
                            'title': _translate_kpi_title(kpi_type),
                            'labels': graph_dict.get('data_json', {}).get('labels', []),
                            'values': graph_dict.get('data_json', {}).get('values', []),
                            'meta': graph_dict.get('data_json', {}).get('meta', {})
                        } if graph_dict else None
                    })
            except Exception as e:
                # Log error but continue rendering other widgets
                chart_widgets.append({
                    'type': kpi_type,
                    'error': str(e)
                })
        
        response_data = {
            'id': 'dashboard-main',
            'name': 'HR Director Dashboard',
            'period': dashboard_config['period'],
            'widgets': chart_widgets,
            'filter': {
                'start_date': start_date,
                'end_date': end_date,
                'service_id': service_id,
                'contract_type': contract_type
            },
            'last_updated': timezone.now().isoformat(),
            'refresh_strategy': 'on-demand',
            'refresh_interval': 300000  # 5 minutes in milliseconds
        }
        
        return Response(response_data)
    
    except ValueError as e:
        return Response(
            {'error': f'Invalid date format or parameter: {str(e)}'},
            status=status.HTTP_400_BAD_REQUEST
        )
    except Exception as e:
        return Response(
            {'error': f'Failed to load dashboard: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def refresh_dashboard(request):
    """
    Manually refresh the dashboard data.
    
    Request Body:
        {
            'refresh_strategy': 'on-demand|cache|scheduled'
        }
    
    Returns:
        {
            'status': 'success',
            'widgets': [...],
            'last_updated': '2026-03-09T10:30:00Z'
        }
    """
    try:
        refresh_strategy = request.data.get('refresh_strategy', 'on-demand')
        
        # Extract filters from request
        start_date = request.data.get('start_date')
        end_date = request.data.get('end_date')
        service_id = request.data.get('service_id')
        contract_type = request.data.get('contract_type')
        
        # Create report filter
        report_filter = ReportFilter(
            start_date=datetime.fromisoformat(start_date).date() if start_date else (timezone.now().date() - timedelta(days=90)),
            end_date=datetime.fromisoformat(end_date).date() if end_date else timezone.now().date(),
            service_id=service_id,
            contract_type=contract_type,
            employee_status='ACTIVE'
        )
        
        # Create and refresh dashboard
        dashboard = Dashboard(
            report_filter=report_filter,
            auto_refresh=True
        )
        refresh_result = dashboard.refresh(strategy=refresh_strategy)
        
        # Get updated widgets
        widgets = dashboard.get_widgets()
        
        return Response({
            'status': 'success',
            'message': 'Dashboard refreshed successfully',
            'widgets': widgets,
            'last_updated': timezone.now().isoformat(),
            'refresh_strategy': refresh_strategy,
            'refresh_detail': refresh_result
        })
    
    except Exception as e:
        return Response(
            {'error': f'Failed to refresh dashboard: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def customize_dashboard(request):
    """
    Customize dashboard widgets and visibility.
    
    Request Body:
        {
            'visible_widgets': ['employee_count', 'turnover', ...],
            'widget_order': [...],
            'refresh_strategy': 'on-demand|cache|scheduled',
            'refresh_interval': 300000
        }
    
    Returns:
        {
            'status': 'success',
            'dashboard': {...}
        }
    """
    try:
        visible_widgets = request.data.get('visible_widgets', [])
        widget_order = request.data.get('widget_order', [])
        refresh_strategy = request.data.get('refresh_strategy', 'on-demand')
        
        # Store user preferences in cache (in production, use database)
        cache_key = f'dashboard_config_{request.user.id}'
        dashboard_config = {
            'visible_widgets': visible_widgets,
            'widget_order': widget_order,
            'refresh_strategy': refresh_strategy
        }
        cache.set(cache_key, dashboard_config, timeout=86400 * 30)  # 30 days
        
        return Response({
            'status': 'success',
            'message': 'Dashboard customization saved',
            'configuration': dashboard_config
        })
    
    except Exception as e:
        return Response(
            {'error': f'Failed to customize dashboard: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_dashboard_widgets(request):
    """
    Get list of available dashboard widgets with descriptions.
    
    Returns:
        {
            'widgets': [
                {
                    'id': 'employee_count',
                    'title': 'Employee Count',
                    'description': '...',
                    'type': 'kpi'
                },
                ...
            ]
        }
    """
    available_widgets = [
        {
            'id': 'employee_count',
            'title': 'Total Employees',
            'description': 'Total number of active employees by service and contract type',
            'type': 'kpi',
            'chart_type': 'bar'
        },
        {
            'id': 'turnover',
            'title': 'Turnover Rate',
            'description': 'Employee turnover rate (departures / average workforce) with trend',
            'type': 'kpi',
            'chart_type': 'line'
        },
        {
            'id': 'absenteeism',
            'title': 'Absenteeism Rate',
            'description': 'Percentage of absent days relative to working days',
            'type': 'kpi',
            'chart_type': 'line'
        },
        {
            'id': 'evaluations',
            'title': 'Average Evaluation Score',
            'description': 'Mean performance evaluation score by service',
            'type': 'kpi',
            'chart_type': 'bar'
        }
    ]
    
    return Response({'widgets': available_widgets})


def _translate_kpi_title(kpi_type):
    """Helper: translate KPI type to readable title."""
    translations = {
        'employee_count': 'Total Employees',
        'turnover': 'Turnover Rate',
        'absenteeism': 'Absenteeism Rate',
        'evaluations': 'Average Evaluation Score'
    }
    return translations.get(kpi_type, kpi_type)


def _get_kpi_unit(kpi_type):
    """Helper: get unit of measurement for KPI type."""
    units = {
        'employee_count': 'employees',
        'turnover': '%',
        'absenteeism': '%',
        'evaluations': '/5.0'
    }
    return units.get(kpi_type, '')
