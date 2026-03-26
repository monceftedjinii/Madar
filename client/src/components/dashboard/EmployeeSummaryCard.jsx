const badgeStyles = {
  Excellent: "bg-emerald-100 text-emerald-700",
  Bon: "bg-blue-100 text-blue-700",
  Moyen: "bg-amber-100 text-amber-700",
  "À améliorer": "bg-rose-100 text-rose-700",
  "A ameliorer": "bg-rose-100 text-rose-700",
  "Ã€ amÃ©liorer": "bg-rose-100 text-rose-700",
};

export default function EmployeeSummaryCard({ employee, dark = false }) {
  const cardClass = dark
    ? "rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-sm"
    : "rounded-2xl border border-slate-200 bg-white p-6 shadow-sm";

  const statBoxClass = dark ? "rounded-2xl bg-slate-800 p-4" : "rounded-2xl bg-slate-50 p-4";

  return (
    <article className={cardClass}>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <img
          alt={employee.fullName}
          className="h-24 w-24 rounded-2xl object-cover shadow-md"
          src={employee.avatar}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className={`text-2xl font-bold ${dark ? "text-slate-50" : "text-slate-900"}`}>
              {employee.fullName}
            </h2>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                badgeStyles[employee.statusLabel] || "bg-slate-200 text-slate-700"
              }`}
            >
              {employee.statusLabel}
            </span>
          </div>
          <p className={`mt-1 text-sm font-medium ${dark ? "text-slate-300" : "text-slate-500"}`}>
            {employee.role} • {employee.department}
          </p>
          <p className={`mt-1 text-sm ${dark ? "text-slate-400" : "text-slate-400"}`}>
            {employee.email}
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className={statBoxClass}>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Taux de présence
          </p>
          <p className={`mt-3 text-2xl font-bold ${dark ? "text-slate-50" : "text-slate-900"}`}>
            {employee.attendanceRate}%
          </p>
        </div>
        <div className={statBoxClass}>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Progression globale
          </p>
          <p className={`mt-3 text-2xl font-bold ${dark ? "text-slate-50" : "text-slate-900"}`}>
            {employee.overallProgress}%
          </p>
        </div>
        <div className={statBoxClass}>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Note finale
          </p>
          <p className={`mt-3 text-2xl font-bold ${dark ? "text-slate-50" : "text-slate-900"}`}>
            {employee.finalScore.toFixed(1)}/20
          </p>
        </div>
      </div>
    </article>
  );
}
