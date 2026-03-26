function getComment(score) {
  if (score >= 16) return "Excellente performance";
  if (score >= 12) return "Bon travail";
  if (score >= 8) return "À améliorer";
  return "Performance insuffisante";
}

export default function MonthlyScoreCard({ score, achievement, improvement, dark = false }) {
  const comment = getComment(score);
  const cardClass = dark
    ? "rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-sm"
    : "rounded-2xl border border-slate-200 bg-white p-6 shadow-sm";
  const innerClass = dark ? "rounded-2xl bg-slate-800 p-4" : "rounded-2xl bg-slate-50 p-4";

  return (
    <article className={cardClass}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className={`text-lg font-bold ${dark ? "text-slate-50" : "text-slate-900"}`}>
            Note mensuelle
          </h3>
          <p className={`mt-1 text-sm ${dark ? "text-slate-300" : "text-slate-500"}`}>
            Évaluation mensuelle finale et piste d'amélioration.
          </p>
        </div>
        <div className="rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 px-5 py-4 text-white shadow-lg">
          <p className="text-xs uppercase tracking-[0.2em] text-blue-100">Note finale</p>
          <strong className="mt-2 block text-3xl font-bold">{score.toFixed(1)}/20</strong>
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className={innerClass}>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Commentaire automatique
          </p>
          <p className={`mt-3 text-base font-semibold ${dark ? "text-slate-50" : "text-slate-900"}`}>
            {comment}
          </p>
        </div>
        <div className={innerClass}>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Point fort du mois
          </p>
          <p className={`mt-3 text-sm leading-6 ${dark ? "text-slate-200" : "text-slate-700"}`}>
            {achievement}
          </p>
        </div>
        <div className={innerClass}>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Point à améliorer
          </p>
          <p className={`mt-3 text-sm leading-6 ${dark ? "text-slate-200" : "text-slate-700"}`}>
            {improvement}
          </p>
        </div>
      </div>
    </article>
  );
}
