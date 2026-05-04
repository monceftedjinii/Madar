from decimal import Decimal

from django.db import transaction
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from ..models import Employee, Evaluation, EvaluationCampaign, EvaluationCriteria, EvaluationScore
from ..permissions import IsChef
from .helpers import notify


DEFAULT_CRITERIA = [
    ("Ponctualite", Decimal("1.00")),
    ("Productivite", Decimal("1.20")),
    ("Esprit d'equipe", Decimal("1.00")),
    ("Discipline", Decimal("1.00")),
    ("Qualite du travail", Decimal("1.30")),
]


def _ensure_default_criteria():
    for label, weight in DEFAULT_CRITERIA:
        EvaluationCriteria.objects.get_or_create(
            label=label,
            defaults={"weight": weight, "note_min": 0, "note_max": 5, "is_active": True},
        )


def _recommendation_from_score(score):
    if score >= Decimal("4.50"):
        return Evaluation.Recommendation.EXCELLENT
    if score >= Decimal("3.50"):
        return Evaluation.Recommendation.GOOD
    if score >= Decimal("2.50"):
        return Evaluation.Recommendation.AVERAGE
    return Evaluation.Recommendation.IMPROVEMENT


def _serialize_evaluation(evaluation):
    return {
        "id": evaluation.id,
        "employee": {
            "id": evaluation.employee.id,
            "full_name": f"{evaluation.employee.first_name} {evaluation.employee.last_name}".strip() or evaluation.employee.email,
            "email": evaluation.employee.email,
            "service": evaluation.employee.service.nomService if evaluation.employee.service else "",
            "position": evaluation.employee.position.name if evaluation.employee.position else "",
        },
        "evaluator": {
            "id": evaluation.evaluator.id,
            "full_name": f"{evaluation.evaluator.first_name} {evaluation.evaluator.last_name}".strip() or evaluation.evaluator.email,
            "email": evaluation.evaluator.email,
        }
        if evaluation.evaluator
        else None,
        "campaign": {
            "id": evaluation.campaign.id,
            "title": evaluation.campaign.title,
        }
        if evaluation.campaign
        else None,
        "year": evaluation.year,
        "period": evaluation.period,
        "evaluation_date": evaluation.evaluation_date.isoformat(),
        "status": evaluation.status,
        "global_score": float(evaluation.global_score),
        "recommendation": evaluation.get_recommendation_display(),
        "overall_comment": evaluation.overall_comment,
        "scores": [
            {
                "criterion_id": item.criterion.id,
                "criterion_label": item.criterion.label,
                "weight": float(item.criterion.weight),
                "score": float(item.score),
                "comment": item.comment,
            }
            for item in evaluation.scores.select_related("criterion").all()
        ],
    }


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def evaluation_criteria_list(request):
    _ensure_default_criteria()
    criteria = EvaluationCriteria.objects.filter(is_active=True).order_by("id")
    return Response(
        [
            {
                "id": item.id,
                "label": item.label,
                "weight": float(item.weight),
                "note_min": float(item.note_min),
                "note_max": float(item.note_max),
            }
            for item in criteria
        ]
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def my_evaluations(request):
    employee = Employee.objects.filter(email=request.user.email).first()
    if not employee:
        return Response([], status=status.HTTP_200_OK)

    evaluations = (
        Evaluation.objects.filter(employee=employee)
        .select_related("employee__service", "employee__position", "evaluator", "campaign")
        .prefetch_related("scores__criterion")
        .order_by("-evaluation_date", "-created_at")
    )
    return Response([_serialize_evaluation(item) for item in evaluations])


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def rh_evaluations(request):
    if request.user.role not in {"RH_SIMPLE", "RH_AGENT", "GRH"}:
        return Response({"detail": "Acces RH requis."}, status=status.HTTP_403_FORBIDDEN)

    evaluations = (
        Evaluation.objects.select_related("employee__service", "employee__position", "evaluator", "campaign")
        .prefetch_related("scores__criterion")
        .order_by("-evaluation_date", "-created_at")
    )
    return Response([_serialize_evaluation(item) for item in evaluations])


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated, IsChef])
def chef_evaluations(request):
    _ensure_default_criteria()

    try:
        chef_employee = Employee.objects.select_related("service").get(email=request.user.email)
    except Employee.DoesNotExist:
        return Response({"detail": "Aucune fiche employe n'est liee a ce chef."}, status=status.HTTP_400_BAD_REQUEST)

    if request.method == "GET":
        evaluations = (
            Evaluation.objects.filter(employee__service=chef_employee.service)
            .select_related("employee__service", "employee__position", "evaluator", "campaign")
            .prefetch_related("scores__criterion")
            .order_by("-evaluation_date", "-created_at")
        )
        return Response([_serialize_evaluation(item) for item in evaluations])

    employee_id = request.data.get("employee_id")
    scores_payload = request.data.get("scores") or []
    period = (request.data.get("period") or "Annuel").strip()
    campaign_title = (request.data.get("campaign_title") or f"Campagne {timezone.localdate().year}").strip()
    overall_comment = (request.data.get("overall_comment") or "").strip()

    if not employee_id:
        return Response({"detail": "employee_id est obligatoire."}, status=status.HTTP_400_BAD_REQUEST)
    if not scores_payload:
        return Response({"detail": "Ajoutez au moins une note de critere."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        employee = Employee.objects.select_related("service").get(id=employee_id)
    except Employee.DoesNotExist:
        return Response({"detail": "Employe introuvable."}, status=status.HTTP_404_NOT_FOUND)

    if employee.service_id != chef_employee.service_id:
        return Response({"detail": "Vous ne pouvez evaluer que les employes de votre service."}, status=status.HTTP_403_FORBIDDEN)

    criteria_map = {item.id: item for item in EvaluationCriteria.objects.filter(is_active=True)}
    total_weight = Decimal("0")
    weighted_sum = Decimal("0")
    normalized_scores = []

    for row in scores_payload:
        criterion_id = row.get("criterion_id")
        score_value = row.get("score")
        comment = (row.get("comment") or "").strip()
        criterion = criteria_map.get(criterion_id)
        if not criterion:
          return Response({"detail": f"Critere invalide: {criterion_id}."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            score_decimal = Decimal(str(score_value))
        except Exception:
            return Response({"detail": f"Note invalide pour {criterion.label}."}, status=status.HTTP_400_BAD_REQUEST)
        if score_decimal < criterion.note_min or score_decimal > criterion.note_max:
            return Response(
                {"detail": f"La note pour {criterion.label} doit etre entre {criterion.note_min} et {criterion.note_max}."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        total_weight += criterion.weight
        weighted_sum += score_decimal * criterion.weight
        normalized_scores.append((criterion, score_decimal, comment))

    global_score = (weighted_sum / total_weight) if total_weight else Decimal("0")
    recommendation = _recommendation_from_score(global_score)
    today = timezone.localdate()

    with transaction.atomic():
        campaign, _ = EvaluationCampaign.objects.get_or_create(
            title=campaign_title,
            defaults={
                "start_date": today.replace(month=1, day=1),
                "end_date": today.replace(month=12, day=31),
                "status": EvaluationCampaign.Status.OPEN,
            },
        )
        evaluation = Evaluation.objects.create(
            employee=employee,
            evaluator=request.user,
            campaign=campaign,
            year=today.year,
            period=period,
            evaluation_date=today,
            status=Evaluation.Status.COMPLETED,
            global_score=global_score.quantize(Decimal("0.01")),
            recommendation=recommendation,
            overall_comment=overall_comment,
        )
        for criterion, score_decimal, comment in normalized_scores:
            EvaluationScore.objects.create(
                evaluation=evaluation,
                criterion=criterion,
                score=score_decimal,
                comment=comment,
            )

    employee_user = None
    try:
        from ..models import User

        employee_user = User.objects.filter(email=employee.email).first()
    except Exception:
        employee_user = None

    if employee_user:
        notify(
            employee_user,
            title="Nouvelle evaluation",
            message=f"Une evaluation a ete enregistree pour la periode {period}.",
            link="/evaluations",
        )

    evaluation = (
        Evaluation.objects.filter(id=evaluation.id)
        .select_related("employee__service", "employee__position", "evaluator", "campaign")
        .prefetch_related("scores__criterion")
        .first()
    )
    return Response(_serialize_evaluation(evaluation), status=status.HTTP_201_CREATED)
