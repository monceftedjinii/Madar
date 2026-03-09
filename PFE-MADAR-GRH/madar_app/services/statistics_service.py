from datetime import timedelta
from django.apps import apps
from django.core.cache import cache
from django.db.models import Count, Avg
from django.utils import timezone

from ..models import Employee, LeaveRequest, AbsenceWarning


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
    def _parse_filters(cls, filters=None):
        filters = filters or {}
        today = timezone.now().date()
        date_to = filters.get('date_to') or today
        date_from = filters.get('date_from') or (date_to - timedelta(days=30))
        service_code = filters.get('service')
        contract_type = filters.get('contract_type')

        return {
            'date_from': date_from,
            'date_to': date_to,
            'service': service_code,
            'contract_type': contract_type,
        }

    @classmethod
    def _employee_queryset(cls, filters=None):
        parsed = cls._parse_filters(filters)
        queryset = Employee.objects.all()

        if parsed['service']:
            queryset = queryset.filter(service_id=parsed['service'])
        if parsed['contract_type']:
            queryset = queryset.filter(contract_type=parsed['contract_type'])

        return queryset, parsed

    @classmethod
    def calculEffectif(cls, filters=None):
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
    def calculTurnover(cls, filters=None):
        queryset, parsed = cls._employee_queryset(filters)
        date_from = parsed['date_from']
        date_to = parsed['date_to']

        start_headcount = queryset.filter(hired_at__lte=date_from).count()
        end_headcount = queryset.filter(hired_at__lte=date_to).count()
        average_workforce = (start_headcount + end_headcount) / 2 if (start_headcount or end_headcount) else 0

        departures = 0
        departure_field = None
        for candidate in ['left_at', 'departure_date', 'terminated_at', 'date_sortie', 'left_date']:
            if any(field.name == candidate for field in Employee._meta.fields):
                departure_field = candidate
                break

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
    def calculAbsenteisme(cls, filters=None):
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
    def calculEvaluations(cls, filters=None):
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
    def calculerKPI(cls, type, filters=None):
        kpi_type = (type or '').lower().strip()

        mapping = {
            'employee_count': cls.calculEffectif,
            'effectif': cls.calculEffectif,
            'turnover': cls.calculTurnover,
            'absenteeism': cls.calculAbsenteisme,
            'absenteisme': cls.calculAbsenteisme,
            'evaluations': cls.calculEvaluations,
        }

        if kpi_type not in mapping:
            raise ValueError(f'Unsupported KPI type: {type}')

        return {
            'kpi_type': kpi_type,
            'data': mapping[kpi_type](filters=filters),
        }

    @classmethod
    def genererGraphique(cls, type, filters=None):
        graph_type = (type or '').lower().strip()

        if graph_type in ['effectif_by_service', 'employee_by_service']:
            data = cls.calculEffectif(filters=filters)
            labels = list(data['by_service'].keys())
            values = list(data['by_service'].values())
            return {'labels': labels, 'values': values, 'meta': {'source': 'calculEffectif'}}

        if graph_type in ['effectif_by_contract', 'employee_by_contract']:
            data = cls.calculEffectif(filters=filters)
            labels = list(data['by_contract'].keys())
            values = list(data['by_contract'].values())
            return {'labels': labels, 'values': values, 'meta': {'source': 'calculEffectif'}}

        if graph_type in ['evaluations_by_service', 'evaluation_by_service']:
            data = cls.calculEvaluations(filters=filters)
            labels = list(data['by_service'].keys())
            values = list(data['by_service'].values())
            return {'labels': labels, 'values': values, 'meta': {'source': 'calculEvaluations'}}

        if graph_type in ['turnover', 'absenteeism', 'absenteisme']:
            payload = cls.calculerKPI(graph_type, filters=filters)['data']
            value_key = 'turnover_rate' if graph_type == 'turnover' else 'absenteeism_rate'
            return {
                'labels': [graph_type],
                'values': [payload.get(value_key, 0)],
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

        cache.set(cache_keys[0], cls.calculEffectif(), cls.CACHE_TIMEOUT_SECONDS)
        cache.set(cache_keys[1], cls.calculTurnover(), cls.CACHE_TIMEOUT_SECONDS)
        cache.set(cache_keys[2], cls.calculAbsenteisme(), cls.CACHE_TIMEOUT_SECONDS)
        cache.set(cache_keys[3], cls.calculEvaluations(), cls.CACHE_TIMEOUT_SECONDS)

        return {
            'refreshed': True,
            'keys': cache_keys,
            'generated_at': timezone.now().isoformat(),
        }
