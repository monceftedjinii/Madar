function getComment(score) {
  if (score >= 16) return "Excellent Performance";
  if (score >= 12) return "Good Job";
  if (score >= 8) return "Needs Improvement";
  return "Poor Performance";
}

export default function MonthlyScoreCard({ score, achievement, improvement }) {
  const comment = getComment(score);

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900">Monthly Score</h3>
          <p className="mt-1 text-sm text-slate-500">
            Final monthly evaluation and actionable insight.
          </p>
        </div>
        <div className="rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 px-5 py-4 text-white shadow-lg">
          <p className="text-xs uppercase tracking-[0.2em] text-blue-100">Final Score</p>
          <strong className="mt-2 block text-3xl font-bold">{score.toFixed(1)}/20</strong>
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Automatic Comment
          </p>
          <p className="mt-3 text-base font-semibold text-slate-900">{comment}</p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Best Achievement
          </p>
          <p className="mt-3 text-sm leading-6 text-slate-700">{achievement}</p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Point To Improve
          </p>
          <p className="mt-3 text-sm leading-6 text-slate-700">{improvement}</p>
        </div>
      </div>
    </article>
  );
}
