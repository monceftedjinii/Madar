"""
Chart/Graph generation endpoints.

This module provides endpoints for converting KPI data into graph/chart formats
suitable for frontend visualization.
"""

from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from django.utils import timezone
from datetime import datetime, timedelta

from madar_app.services import (
    StatisticsService,
    ReportFilter,
    Graph
)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def generate_kpi_chart(request, kpi_type):
    """
    Generate a chart from a KPI result.
    
    URL Parameters:
        - kpi_type: 'employee_count', 'turnover', 'absenteeism', 'evaluations'
    
    Query Parameters:
        - start_date: ISO date string (default: 90 days ago)
        - end_date: ISO date string (default: today)
        - service_id: Filter by service (optional)
        - contract_type: Filter by contract type (optional)
        - chart_type: 'bar', 'line', 'pie' (optional, auto-detected)
    
    Returns:
        {
            'type': 'bar|line|pie',
            'title': 'Employee Count',
            'labels': ['Service A', 'Service B', ...],
            'values': [100, 150, ...],
            'meta': {
                'unit': 'people',
                'total': 250,
                'trend': 'stable',
                'period': {...}
            }
        }
    """
    try:
        # Extract filter parameters
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        service_id = request.query_params.get('service_id')
        contract_type = request.query_params.get('contract_type')
        chart_type = request.query_params.get('chart_type')
        
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
        
        # Generate graph
        graph = Graph.from_kpi(kpi_result, chart_type=chart_type)
        
        if not graph:
            return Response(
                {'error': 'Failed to generate chart'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        # Convert to dict and add metadata
        chart_dict = graph.to_dict()
        chart_dict['meta']['period'] = {
            'start_date': start_date_obj.isoformat(),
            'end_date': end_date_obj.isoformat()
        }
        chart_dict['meta']['kpi_type'] = kpi_result.type.value
        chart_dict['meta']['trend'] = kpi_result.trend.value if kpi_result.trend else None
        
        return Response(chart_dict)
    
    except ValueError as e:
        return Response(
            {'error': f'Invalid parameter: {str(e)}'},
            status=status.HTTP_400_BAD_REQUEST
        )
    except Exception as e:
        return Response(
            {'error': f'Failed to generate chart: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def generate_multiple_charts(request):
    """
    Generate charts for multiple KPIs at once.
    
    Query Parameters:
        - kpi_types: comma-separated KPI types ('employee_count,turnover,absenteeism')
        - start_date: ISO date string (default: 90 days ago)
        - end_date: ISO date string (default: today)
        - service_id: Filter by service (optional)
        - contract_type: Filter by contract type (optional)
    
    Returns:
        {
            'charts': [
                {'type': 'bar', 'title': '...', 'labels': [...], 'values': [...], ...},
                {'type': 'line', 'title': '...', 'labels': [...], 'values': [...], ...},
                ...
            ]
        }
    """
    try:
        # Extract parameters
        kpi_types_param = request.query_params.get('kpi_types', 'employee_count,turnover,absenteeism,evaluations')
        kpi_types = [k.strip() for k in kpi_types_param.split(',')]
        
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
        
        # Generate charts for each KPI
        stats_service = StatisticsService()
        charts = []
        
        for kpi_type in kpi_types:
            try:
                # Calculate KPI
                kpi_result = stats_service.calculerKPI(kpi_type, report_filter)
                
                if kpi_result:
                    # Generate graph
                    graph = Graph.from_kpi(kpi_result)
                    
                    if graph:
                        chart_dict = graph.to_dict()
                        chart_dict['meta']['period'] = {
                            'start_date': start_date_obj.isoformat(),
                            'end_date': end_date_obj.isoformat()
                        }
                        chart_dict['meta']['kpi_type'] = kpi_result.type.value
                        chart_dict['meta']['trend'] = kpi_result.trend.value if kpi_result.trend else None
                        
                        charts.append(chart_dict)
            except Exception as e:
                charts.append({
                    'type': kpi_type,
                    'error': str(e)
                })
        
        return Response({
            'charts': charts,
            'count': len(charts),
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
            {'error': f'Failed to generate charts: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def generate_custom_chart(request):
    """
    Generate a custom chart from raw KPI data.
    
    Request Body:
        {
            'title': 'Custom KPI Chart',
            'chart_type': 'bar|line|pie',
            'labels': ['Label 1', 'Label 2', ...],
            'values': [10, 20, ...],
            'colors': ['#FF6B6B', '#4ECDC4', ...] (optional)
        }
    
    Returns:
        {
            'type': 'bar|line|pie',
            'title': 'Custom KPI Chart',
            'labels': [...],
            'values': [...],
            'colors': [...],
            'meta': {...}
        }
    """
    try:
        title = request.data.get('title', 'Custom Chart')
        chart_type = request.data.get('chart_type', 'bar')
        labels = request.data.get('labels', [])
        values = request.data.get('values', [])
        colors = request.data.get('colors', [])
        
        if not labels or not values:
            return Response(
                {'error': 'labels and values are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if len(labels) != len(values):
            return Response(
                {'error': 'labels and values must have the same length'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create custom graph
        graph = Graph(
            title=title,
            chart_type=chart_type,
            labels=labels,
            values=values,
            colors=colors if colors else None
        )
        
        chart_dict = graph.to_dict()
        chart_dict['meta']['custom'] = True
        chart_dict['meta']['created_at'] = timezone.now().isoformat()
        
        return Response(chart_dict)
    
    except Exception as e:
        return Response(
            {'error': f'Failed to generate chart: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_chart_types(request):
    """
    Get list of available chart types.
    
    Returns:
        {
            'types': [
                {'id': 'bar', 'name': 'Bar Chart', 'description': '...'},
                {'id': 'line', 'name': 'Line Chart', 'description': '...'},
                {'id': 'pie', 'name': 'Pie Chart', 'description': '...'}
            ]
        }
    """
    chart_types = [
        {
            'id': 'bar',
            'name': 'Bar Chart',
            'description': 'Best for comparing values across categories',
            'uses': ['employee_count', 'evaluations']
        },
        {
            'id': 'line',
            'name': 'Line Chart',
            'description': 'Best for showing trends over time',
            'uses': ['turnover', 'absenteeism']
        },
        {
            'id': 'pie',
            'name': 'Pie Chart',
            'description': 'Best for showing proportions and percentages',
            'uses': []
        }
    ]
    
    return Response({'types': chart_types})
