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
    ExportFile
)
from madar_app.models import User, Notification


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
        
        # Create dashboard instance
        dashboard = Dashboard(**dashboard_config)
        
        # Determine refresh strategy
        auto_refresh = request.query_params.get('auto_refresh', 'false').lower() == 'true'
        if auto_refresh:
            dashboard.refresh_strategy = 'scheduled'
            dashboard.refresh()
        
        # Get dashboard widgets
        widgets = dashboard.get_widgets()
        
        # Generate chart data for each widget
        stats_service = StatisticsService()
        chart_widgets = []
        
        for kpi_type in dashboard_config['visible_widgets']:
            try:
                # Calculate KPI
                kpi_result = stats_service.calculerKPI(kpi_type, report_filter)
                
                # Convert to graph
                graph = Graph.from_kpi(kpi_result)
                
                chart_widgets.append({
                    'type': kpi_type,
                    'title': _translate_kpi_title(kpi_type),
                    'kpi': {
                        'type': kpi_result.type.value,
                        'value': float(kpi_result.value),
                        'trend': kpi_result.trend.value if kpi_result.trend else None,
                        'calculation_date': kpi_result.calculation_date.isoformat(),
                        'details': kpi_result.details
                    },
                    'chart': graph.to_dict() if graph else None
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
            'refresh_strategy': dashboard.refresh_strategy,
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
            visible_widgets=['employee_count', 'turnover', 'absenteeism', 'evaluations'],
            refresh_strategy=refresh_strategy
        )
        dashboard.refresh()
        
        # Get updated widgets
        widgets = dashboard.get_widgets()
        
        return Response({
            'status': 'success',
            'message': 'Dashboard refreshed successfully',
            'widgets': widgets,
            'last_updated': timezone.now().isoformat(),
            'refresh_strategy': refresh_strategy
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
