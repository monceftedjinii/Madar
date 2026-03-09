from dataclasses import dataclass, field
from datetime import date, timedelta
from enum import Enum
from typing import Optional, Union
from django.apps import apps
from django.core.cache import cache
from django.db import models
from django.db.models import Count, Avg
from django.utils import timezone

from ..models import Employee, LeaveRequest, AbsenceWarning


@dataclass
class ReportFilter:
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    service_id: Optional[Union[int, str]] = None
    contract_type: Optional[str] = None
    employee_status: Optional[str] = None


class KPIType(Enum):
    EMPLOYEE_COUNT = 'EMPLOYEE_COUNT'
    TURNOVER = 'TURNOVER'
    ABSENTEEISM = 'ABSENTEEISM'
    PERFORMANCE_SCORE = 'PERFORMANCE_SCORE'


class KPITrend(Enum):
    INCREASE = 'INCREASE'
    DECREASE = 'DECREASE'
    STABLE = 'STABLE'


@dataclass
class KPIResult:
    type: KPIType
    value: float
    trend: KPITrend
    calculation_date: date = field(default_factory=lambda: timezone.now().date())
    details: dict = field(default_factory=dict)

    def to_dict(self):
        return {
            'type': self.type.value,
            'value': self.value,
            'trend': self.trend.value,
            'calculation_date': self.calculation_date.isoformat(),
            'details': self.details,
        }


@dataclass
class Graph:
    chart_type: str
    data_json: dict

    @classmethod
    def generate_from_kpi(cls, kpi_result, chart_type='bar'):
        """Convert KPIResult into frontend-ready chart JSON."""
        if not isinstance(kpi_result, KPIResult):
            raise ValueError('kpi_result must be an instance of KPIResult')

        normalized_chart = (chart_type or '').lower().strip()
        if normalized_chart not in {'bar', 'line', 'pie'}:
            raise ValueError('chart_type must be one of: bar, line, pie')

        details = kpi_result.details or {}

        if kpi_result.type == KPIType.EMPLOYEE_COUNT:
            by_service = details.get('by_service') or {}
            labels = list(by_service.keys())
            values = list(by_service.values())
        elif kpi_result.type == KPIType.PERFORMANCE_SCORE:
            by_service = details.get('by_service') or {}
            labels = list(by_service.keys())
            values = list(by_service.values())
        else:
            labels = [kpi_result.type.value]
            values = [kpi_result.value]

        data_json = {
            'labels': labels,
            'values': values,
            'meta': {
                'kpi_type': kpi_result.type.value,
                'trend': kpi_result.trend.value,
                'calculation_date': kpi_result.calculation_date.isoformat(),
            }
        }

        return cls(chart_type=normalized_chart, data_json=data_json)

    @classmethod
    def from_kpi(cls, kpi_result, chart_type='bar'):
        """Alias constructor for readability in service flow."""
        return cls.generate_from_kpi(kpi_result=kpi_result, chart_type=chart_type)

    def to_dict(self):
        return {
            'chart_type': self.chart_type,
            'data_json': self.data_json,
        }


@dataclass
class Indicator:
    label: str
    target: float
    unit: str
    kpi_type: KPIType
    filters: ReportFilter = field(default_factory=ReportFilter)
    value: float = 0.0
    trend: KPITrend = KPITrend.STABLE
    evolution_history: list = field(default_factory=list)

    def _build_period_filter(self, period):
        today = timezone.now().date()
        normalized = (period or '').lower().strip()

        if normalized == 'weekly':
            start_date = today - timedelta(days=6)
        elif normalized == 'yearly':
            start_date = today.replace(month=1, day=1)
        else:
            start_date = today.replace(day=1)

        return ReportFilter(
            start_date=start_date,
            end_date=today,
            service_id=self.filters.service_id,
            contract_type=self.filters.contract_type,
            employee_status=self.filters.employee_status,
        )

    def calculate(self, period='monthly'):
        period_filter = self._build_period_filter(period)
        result = StatisticsService.calculerKPI(self.kpi_type.value.lower(), filters=period_filter)
        self.value = float(result.value)
        self.trend = result.trend
        return result

    def getEvolution(self, months=6):
        today = timezone.now().date()
        evolution = []

        for offset in range(months - 1, -1, -1):
            month_number = today.month - offset
            year = today.year
            while month_number <= 0:
                month_number += 12
                year -= 1

            start_date = date(year, month_number, 1)
            if month_number == 12:
                next_month = date(year + 1, 1, 1)
            else:
                next_month = date(year, month_number + 1, 1)
            end_date = next_month - timedelta(days=1)

            month_filter = ReportFilter(
                start_date=start_date,
                end_date=end_date,
                service_id=self.filters.service_id,
                contract_type=self.filters.contract_type,
                employee_status=self.filters.employee_status,
            )
            result = StatisticsService.calculerKPI(self.kpi_type.value.lower(), filters=month_filter)
            evolution.append({
                'month': start_date.strftime('%b'),
                'value': round(float(result.value), 2),
            })

        self.evolution_history = evolution
        return evolution

    def compareTarget(self):
        difference = round(float(self.value) - float(self.target), 2)
        return {
            'label': self.label,
            'value': round(float(self.value), 2),
            'target': round(float(self.target), 2),
            'difference': difference,
            'unit': self.unit,
            'on_target': self.value <= self.target,
        }

    def alert(self, threshold):
        triggered = float(self.value) > float(threshold)
        return {
            'triggered': triggered,
            'label': self.label,
            'value': round(float(self.value), 2),
            'threshold': round(float(threshold), 2),
            'unit': self.unit,
            'message': f'{self.label} exceeded threshold' if triggered else f'{self.label} is within threshold',
        }


class StatisticsService:
    """Service layer for HR KPI/statistics aggregation across modules."""

    CACHE_PREFIX = 'hr_stats'
    CACHE_TIMEOUT_SECONDS = 60 * 10

    @classmethod
    def _resolve_optional_model(cls, model_name):
        try:
            return apps.get_model('madar_app', model_name)
        except LookupError:
            return None

    @classmethod
    def _normalize_filter(cls, filters=None):
        if filters is None:
            return ReportFilter()
        if isinstance(filters, ReportFilter):
            return filters
        if isinstance(filters, dict):
            return ReportFilter(
                start_date=filters.get('start_date') or filters.get('date_from'),
                end_date=filters.get('end_date') or filters.get('date_to'),
                service_id=filters.get('service_id') or filters.get('service'),
                contract_type=filters.get('contract_type'),
                employee_status=filters.get('employee_status') or filters.get('statutEmploye'),
            )
        raise ValueError('filters must be a ReportFilter, dict, or None')

    @classmethod
    def _parse_filters(cls, filters=None):
        report_filter = cls._normalize_filter(filters)
        today = timezone.now().date()
        date_to = report_filter.end_date or today
        date_from = report_filter.start_date or (date_to - timedelta(days=30))
        service_id = report_filter.service_id
        contract_type = report_filter.contract_type
        employee_status = (report_filter.employee_status or '').upper() or None

        return {
            'date_from': date_from,
            'date_to': date_to,
            'service': service_id,
            'contract_type': contract_type,
            'employee_status': employee_status,
        }

    @classmethod
    def _employee_departure_field(cls):
        for candidate in ['left_at', 'departure_date', 'terminated_at', 'date_sortie', 'left_date']:
            if any(field.name == candidate for field in Employee._meta.fields):
                return candidate
        return None

    @classmethod
    def _apply_employee_status_filter(cls, queryset, employee_status):
        if not employee_status:
            return queryset

        departure_field = cls._employee_departure_field()
        if not departure_field:
            return queryset

        if employee_status in ['ACTIF', 'ACTIVE']:
            return queryset.filter(**{f'{departure_field}__isnull': True})
        if employee_status in ['INACTIF', 'INACTIVE']:
            return queryset.filter(**{f'{departure_field}__isnull': False})

        return queryset

    @classmethod
    def _employee_queryset(cls, filters=None):
        parsed = cls._parse_filters(filters)
        queryset = Employee.objects.all()

        if parsed['service']:
            queryset = queryset.filter(
                models.Q(service_id=parsed['service']) | models.Q(service__id=parsed['service'])
            )
        if parsed['contract_type']:
            queryset = queryset.filter(contract_type=parsed['contract_type'])
        queryset = cls._apply_employee_status_filter(queryset, parsed['employee_status'])

        return queryset, parsed

    @classmethod
    def _compute_trend(cls, current_value, previous_value):
        if current_value > previous_value:
            return KPITrend.INCREASE
        if current_value < previous_value:
            return KPITrend.DECREASE
        return KPITrend.STABLE

    @classmethod
    def _previous_period_filter(cls, parsed):
        period_days = max((parsed['date_to'] - parsed['date_from']).days, 1)
        prev_end = parsed['date_from'] - timedelta(days=1)
        prev_start = prev_end - timedelta(days=period_days)
        return ReportFilter(
            start_date=prev_start,
            end_date=prev_end,
            service_id=parsed['service'],
            contract_type=parsed['contract_type'],
            employee_status=parsed['employee_status'],
        )

    @classmethod
    def _effectif_details(cls, filters=None):
        queryset, _ = cls._employee_queryset(filters)

        by_service = (
            queryset.values('service__nomService')
            .annotate(total=Count('id'))
            .order_by('service__nomService')
        )
        by_contract = (
            queryset.values('contract_type')
            .annotate(total=Count('id'))
            .order_by('contract_type')
        )

        return {
            'total': queryset.count(),
            'by_service': {
                (row['service__nomService'] or 'Unassigned'): row['total'] for row in by_service
            },
            'by_contract': {
                row['contract_type']: row['total'] for row in by_contract
            },
        }

    @classmethod
    def _turnover_details(cls, filters=None):
        queryset, parsed = cls._employee_queryset(filters)
        date_from = parsed['date_from']
        date_to = parsed['date_to']

        start_headcount = queryset.filter(hired_at__lte=date_from).count()
        end_headcount = queryset.filter(hired_at__lte=date_to).count()
        average_workforce = (start_headcount + end_headcount) / 2 if (start_headcount or end_headcount) else 0

        departures = 0
        departure_field = cls._employee_departure_field()
        if departure_field:
            departures = queryset.filter(**{
                f'{departure_field}__isnull': False,
                f'{departure_field}__gte': date_from,
                f'{departure_field}__lte': date_to,
            }).count()

        turnover_rate = (departures / average_workforce * 100) if average_workforce else 0.0

        return {
            'period': {'from': str(date_from), 'to': str(date_to)},
            'departures': departures,
            'average_workforce': round(average_workforce, 2),
            'turnover_rate': round(turnover_rate, 2),
            'departure_field_used': departure_field,
        }

    @classmethod
    def _absenteisme_details(cls, filters=None):
        queryset, parsed = cls._employee_queryset(filters)
        date_from = parsed['date_from']
        date_to = parsed['date_to']

        Absence = cls._resolve_optional_model('Absence')

        if Absence:
            absence_qs = Absence.objects.filter(date__gte=date_from, date__lte=date_to)
            if parsed['service']:
                absence_qs = absence_qs.filter(employee__service_id=parsed['service'])
            absence_days = absence_qs.count()
            source = 'Absence'
        else:
            warning_qs = AbsenceWarning.objects.filter(date__gte=date_from, date__lte=date_to)
            if parsed['service']:
                warning_qs = warning_qs.filter(employee__service_id=parsed['service'])
            absence_days = warning_qs.count()
            source = 'AbsenceWarning (fallback)'

        total_employees = queryset.count()
        total_days = max((date_to - date_from).days + 1, 1)
        working_days = total_employees * total_days

        absenteeism_rate = (absence_days / working_days * 100) if working_days else 0.0

        return {
            'period': {'from': str(date_from), 'to': str(date_to)},
            'absence_days': absence_days,
            'working_days': working_days,
            'absenteeism_rate': round(absenteeism_rate, 2),
            'source_model': source,
        }

    @classmethod
    def _evaluations_details(cls, filters=None):
        _, parsed = cls._employee_queryset(filters)
        date_from = parsed['date_from']
        date_to = parsed['date_to']

        Evaluation = cls._resolve_optional_model('Evaluation')
        if not Evaluation:
            return {
                'by_service': {},
                'global_average': None,
                'source_model': None,
                'detail': 'Evaluation model not found in current codebase',
            }

        score_field = None
        for candidate in ['score', 'rating', 'note', 'final_score']:
            if any(field.name == candidate for field in Evaluation._meta.fields):
                score_field = candidate
                break

        if not score_field:
            return {
                'by_service': {},
                'global_average': None,
                'source_model': 'Evaluation',
                'detail': 'No numeric score field found (expected one of: score, rating, note, final_score)',
            }

        date_field = None
        for candidate in ['created_at', 'evaluation_date', 'date', 'evaluated_at']:
            if any(field.name == candidate for field in Evaluation._meta.fields):
                date_field = candidate
                break

        eval_qs = Evaluation.objects.all()
        if date_field in ['created_at', 'evaluated_at']:
            eval_qs = eval_qs.filter(**{f'{date_field}__date__gte': date_from, f'{date_field}__date__lte': date_to})
        elif date_field in ['evaluation_date', 'date']:
            eval_qs = eval_qs.filter(**{f'{date_field}__gte': date_from, f'{date_field}__lte': date_to})
        if parsed['service']:
            eval_qs = eval_qs.filter(employee__service_id=parsed['service'])

        by_service_rows = (
            eval_qs.values('employee__service__nomService')
            .annotate(avg_score=Avg(score_field))
            .order_by('employee__service__nomService')
        )
        global_avg = eval_qs.aggregate(avg_score=Avg(score_field)).get('avg_score')

        return {
            'by_service': {
                (row['employee__service__nomService'] or 'Unassigned'): round(float(row['avg_score']), 2)
                for row in by_service_rows if row['avg_score'] is not None
            },
            'global_average': round(float(global_avg), 2) if global_avg is not None else None,
            'source_model': 'Evaluation',
            'score_field': score_field,
            'date_field': date_field,
        }

    @classmethod
    def calculEffectif(cls, filters=None):
        details = cls._effectif_details(filters)
        parsed = cls._parse_filters(filters)
        prev_filter = cls._previous_period_filter(parsed)
        prev_total = cls._effectif_details(prev_filter)['total']
        current_total = float(details['total'])
        trend = cls._compute_trend(current_total, float(prev_total))
        return KPIResult(type=KPIType.EMPLOYEE_COUNT, value=current_total, trend=trend, details=details)

    @classmethod
    def calculTurnover(cls, filters=None):
        details = cls._turnover_details(filters)
        parsed = cls._parse_filters(filters)
        prev_filter = cls._previous_period_filter(parsed)
        prev_rate = cls._turnover_details(prev_filter)['turnover_rate']
        current_rate = float(details['turnover_rate'])
        trend = cls._compute_trend(current_rate, float(prev_rate))
        return KPIResult(type=KPIType.TURNOVER, value=current_rate, trend=trend, details=details)

    @classmethod
    def calculAbsenteisme(cls, filters=None):
        details = cls._absenteisme_details(filters)
        parsed = cls._parse_filters(filters)
        prev_filter = cls._previous_period_filter(parsed)
        prev_rate = cls._absenteisme_details(prev_filter)['absenteeism_rate']
        current_rate = float(details['absenteeism_rate'])
        trend = cls._compute_trend(current_rate, float(prev_rate))
        return KPIResult(type=KPIType.ABSENTEEISM, value=current_rate, trend=trend, details=details)

    @classmethod
    def calculEvaluations(cls, filters=None):
        details = cls._evaluations_details(filters)
        parsed = cls._parse_filters(filters)
        prev_filter = cls._previous_period_filter(parsed)
        prev_value = cls._evaluations_details(prev_filter).get('global_average') or 0.0
        current_value = details.get('global_average') or 0.0
        trend = cls._compute_trend(float(current_value), float(prev_value))
        return KPIResult(type=KPIType.PERFORMANCE_SCORE, value=float(current_value), trend=trend, details=details)

    @classmethod
    def calculerKPI(cls, type, filters=None):
        kpi_type = (type or '').lower().strip()

        mapping = {
            'employee_count': cls.calculEffectif,
            'effectif': cls.calculEffectif,
            'turnover': cls.calculTurnover,
            'absenteeism': cls.calculAbsenteisme,
            'absenteisme': cls.calculAbsenteisme,
            'performance_score': cls.calculEvaluations,
            'evaluations': cls.calculEvaluations,
        }

        if kpi_type not in mapping:
            raise ValueError(f'Unsupported KPI type: {type}')

        return mapping[kpi_type](filters=filters)

    @classmethod
    def genererGraphique(cls, type, filters=None):
        graph_type = (type or '').lower().strip()

        if graph_type in ['effectif_by_service', 'employee_by_service']:
            data = cls.calculEffectif(filters=filters).details
            labels = list(data.get('by_service', {}).keys())
            values = list(data.get('by_service', {}).values())
            return {'labels': labels, 'values': values, 'meta': {'source': 'calculEffectif'}}

        if graph_type in ['effectif_by_contract', 'employee_by_contract']:
            data = cls.calculEffectif(filters=filters).details
            labels = list(data.get('by_contract', {}).keys())
            values = list(data.get('by_contract', {}).values())
            return {'labels': labels, 'values': values, 'meta': {'source': 'calculEffectif'}}

        if graph_type in ['evaluations_by_service', 'evaluation_by_service']:
            data = cls.calculEvaluations(filters=filters).details
            labels = list(data.get('by_service', {}).keys())
            values = list(data.get('by_service', {}).values())
            return {'labels': labels, 'values': values, 'meta': {'source': 'calculEvaluations'}}

        if graph_type in ['turnover', 'absenteeism', 'absenteisme']:
            payload = cls.calculerKPI(graph_type, filters=filters)
            return {
                'labels': [graph_type],
                'values': [payload.value],
                'meta': {'source': 'calculerKPI'},
            }

        raise ValueError(f'Unsupported chart type: {type}')

    @classmethod
    def rafraichirCaches(cls):
        """Refresh statistics cache entries used by dashboards."""
        cache_keys = [
            f'{cls.CACHE_PREFIX}:effectif',
            f'{cls.CACHE_PREFIX}:turnover',
            f'{cls.CACHE_PREFIX}:absenteisme',
            f'{cls.CACHE_PREFIX}:evaluations',
        ]

        cache.delete_many(cache_keys)

        cache.set(cache_keys[0], cls.calculEffectif().to_dict(), cls.CACHE_TIMEOUT_SECONDS)
        cache.set(cache_keys[1], cls.calculTurnover().to_dict(), cls.CACHE_TIMEOUT_SECONDS)
        cache.set(cache_keys[2], cls.calculAbsenteisme().to_dict(), cls.CACHE_TIMEOUT_SECONDS)
        cache.set(cache_keys[3], cls.calculEvaluations().to_dict(), cls.CACHE_TIMEOUT_SECONDS)

        return {
            'refreshed': True,
            'keys': cache_keys,
            'generated_at': timezone.now().isoformat(),
        }
