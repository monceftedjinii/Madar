"""
KPI calculation endpoints.

This module provides endpoints for calculating individual KPIs:
- Employee count
- Turnover rate
- Absenteeism rate
- Evaluation scores
"""

from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from django.utils import timezone
from datetime import datetime, timedelta

from madar_app.services import StatisticsService, ReportFilter, Indicator
from madar_app.models import Notification


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def calculate_kpi(request, kpi_type):
    """
    Calculate a specific KPI with filters.
    
    URL Parameters:
        - kpi_type: 'employee_count', 'turnover', 'absenteeism', 'evaluations'
    
    Query Parameters:
        - start_date: ISO date string (default: 90 days ago)
        - end_date: ISO date string (default: today)
        - service_id: Filter by service (optional)
        - contract_type: Filter by contract type (optional)
        - trend_comparison: number of days to compare for trend (default: 30)
    
    Returns:
        {
            'type': 'turnover',
            'value': 3.2,
            'unit': '%',
            'trend': 'decreasing',
            'trend_value': -0.5,
            'calculation_date': '2026-03-09T10:30:00Z',
            'period': {'start_date': '2025-12-09', 'end_date': '2026-03-09'},
            'details': {
                'departures': 8,
                'average_workforce': 250,
                'calculation_method': '(departures / avg_workforce) * 100'
            }
        }
    """
    try:
        # Extract filter parameters
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        service_id = request.query_params.get('service_id')
        contract_type = request.query_params.get('contract_type')
        trend_days = int(request.query_params.get('trend_comparison', 30))
        
        # Set defaults
        end_date_obj = datetime.fromisoformat(end_date).date() if end_date else timezone.now().date()
        start_date_obj = datetime.fromisoformat(start_date).date() if start_date else (end_date_obj - timedelta(days=90))
        
        # Create report filter
        report_filter = ReportFilter(
            start_date=start_date_obj,
            end_date=end_date_obj,
            service_id=service_id,
            contract_type=contract_type,
            employee_status='ACTIVE'
        )
        
        # Calculate KPI
        stats_service = StatisticsService()
        kpi_result = stats_service.calculerKPI(kpi_type, report_filter)
        
        if not kpi_result:
            return Response(
                {'error': f'Unknown KPI type: {kpi_type}'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        response_data = {
            'type': kpi_result.type.value,
            'value': float(kpi_result.value),
            'unit': _get_kpi_unit(kpi_type),
            'trend': kpi_result.trend.value if kpi_result.trend else None,
            'trend_value': kpi_result.details.get('trend_value') if kpi_result.details else None,
            'calculation_date': kpi_result.calculation_date.isoformat(),
            'period': {
                'start_date': start_date_obj.isoformat(),
                'end_date': end_date_obj.isoformat()
            },
            'details': kpi_result.details if kpi_result.details else {}
        }
        
        return Response(response_data)
    
    except ValueError as e:
        return Response(
            {'error': f'Invalid parameter: {str(e)}'},
            status=status.HTTP_400_BAD_REQUEST
        )
    except Exception as e:
        return Response(
            {'error': f'Failed to calculate KPI: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_all_kpis(request):
    """
    Calculate and return all KPIs at once.
    
    Query Parameters:
        - start_date: ISO date string (default: 90 days ago)
        - end_date: ISO date string (default: today)
        - service_id: Filter by service (optional)
        - contract_type: Filter by contract type (optional)
    
    Returns:
        {
            'period': {...},
            'kpis': [
                {'type': 'employee_count', 'value': 245, ...},
                {'type': 'turnover', 'value': 3.2, ...},
                ...
            ]
        }
    """
    try:
        # Extract filter parameters
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        service_id = request.query_params.get('service_id')
        contract_type = request.query_params.get('contract_type')
        
        # Set defaults
        end_date_obj = datetime.fromisoformat(end_date).date() if end_date else timezone.now().date()
        start_date_obj = datetime.fromisoformat(start_date).date() if start_date else (end_date_obj - timedelta(days=90))
        
        # Create report filter
        report_filter = ReportFilter(
            start_date=start_date_obj,
            end_date=end_date_obj,
            service_id=service_id,
            contract_type=contract_type,
            employee_status='ACTIVE'
        )
        
        # Calculate all KPIs
        stats_service = StatisticsService()
        kpi_types = ['employee_count', 'turnover', 'absenteeism', 'evaluations']
        
        kpis = []
        for kpi_type in kpi_types:
            try:
                kpi_result = stats_service.calculerKPI(kpi_type, report_filter)
                if kpi_result:
                    kpis.append({
                        'type': kpi_result.type.value,
                        'value': float(kpi_result.value),
                        'unit': _get_kpi_unit(kpi_type),
                        'trend': kpi_result.trend.value if kpi_result.trend else None,
                        'calculation_date': kpi_result.calculation_date.isoformat(),
                        'details': kpi_result.details if kpi_result.details else {}
                    })
            except Exception as e:
                kpis.append({
                    'type': kpi_type,
                    'error': str(e)
                })
        
        return Response({
            'period': {
                'start_date': start_date_obj.isoformat(),
                'end_date': end_date_obj.isoformat()
            },
            'filter': {
                'service_id': service_id,
                'contract_type': contract_type,
                'employee_status': 'ACTIVE'
            },
            'kpis': kpis,
            'calculation_date': timezone.now().isoformat()
        })
    
    except Exception as e:
        return Response(
            {'error': f'Failed to calculate KPIs: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def check_kpi_threshold(request):
    """
    Check if a KPI exceeds or falls below a threshold and trigger alerts.
    
    Request Body:
        {
            'kpi_type': 'absenteeism',
            'threshold': 8.0,
            'threshold_type': 'greater_than|less_than',
            'alert_message': 'Absenteeism is too high',
            'alert_severity': 'warning|critical',
            'notify_users': ['drh@company.com']
        }
    
    Returns:
        {
            'kpi_type': 'absenteeism',
            'current_value': 8.5,
            'threshold': 8.0,
            'threshold_exceeded': True,
            'alerts_triggered': [
                {'id': 123, 'message': '...', 'severity': 'critical'}
            ]
        }
    """
    try:
        kpi_type = request.data.get('kpi_type')
        threshold = float(request.data.get('threshold'))
        threshold_type = request.data.get('threshold_type', 'greater_than')
        alert_message = request.data.get('alert_message', f'{kpi_type} threshold reached')
        alert_severity = request.data.get('alert_severity', 'warning')
        notify_users_list = request.data.get('notify_users', [])
        
        # Get current KPI value
        start_date = request.data.get('start_date')
        end_date = request.data.get('end_date')
        service_id = request.data.get('service_id')
        contract_type = request.data.get('contract_type')
        
        end_date_obj = datetime.fromisoformat(end_date).date() if end_date else timezone.now().date()
        start_date_obj = datetime.fromisoformat(start_date).date() if start_date else (end_date_obj - timedelta(days=90))
        
        report_filter = ReportFilter(
            start_date=start_date_obj,
            end_date=end_date_obj,
            service_id=service_id,
            contract_type=contract_type,
            employee_status='ACTIVE'
        )
        
        stats_service = StatisticsService()
        kpi_result = stats_service.calculerKPI(kpi_type, report_filter)
        
        if not kpi_result:
            return Response(
                {'error': f'Unknown KPI type: {kpi_type}'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        current_value = float(kpi_result.value)
        
        # Check threshold
        threshold_exceeded = False
        if threshold_type == 'greater_than':
            threshold_exceeded = current_value > threshold
        elif threshold_type == 'less_than':
            threshold_exceeded = current_value < threshold
        
        # Create indicator and check alerts
        indicator = Indicator(
            kpi_result=kpi_result,
            threshold=threshold,
            threshold_type=threshold_type
        )
        
        alerts = []
        if threshold_exceeded:
            # Trigger alert
            alert = indicator.alert(threshold)
            
            # Create notifications for specified users
            from madar_app.models import User
            if notify_users_list:
                for user_email in notify_users_list:
                    try:
                        user = User.objects.get(email=user_email)
                        notification = Notification.objects.create(
                            user=user,
                            title=f'{kpi_type.upper()} Alert',
                            message=alert_message,
                            link=f'/dashboard?focus={kpi_type}'
                        )
                        alerts.append({
                            'id': notification.id,
                            'message': alert_message,
                            'severity': alert_severity,
                            'user': user_email,
                            'created_at': notification.created_at.isoformat()
                        })
                    except User.DoesNotExist:
                        pass
        
        return Response({
            'kpi_type': kpi_type,
            'current_value': current_value,
            'threshold': threshold,
            'threshold_type': threshold_type,
            'threshold_exceeded': threshold_exceeded,
            'alerts_triggered': alerts,
            'period': {
                'start_date': start_date_obj.isoformat(),
                'end_date': end_date_obj.isoformat()
            }
        })
    
    except ValueError as e:
        return Response(
            {'error': f'Invalid parameter: {str(e)}'},
            status=status.HTTP_400_BAD_REQUEST
        )
    except Exception as e:
        return Response(
            {'error': f'Failed to check threshold: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


def _get_kpi_unit(kpi_type):
    """Helper: get the unit of measurement for a KPI type."""
    units = {
        'employee_count': 'people',
        'turnover': '%',
        'absenteeism': '%',
        'evaluations': 'score'
    }
    return units.get(kpi_type, 'value')
