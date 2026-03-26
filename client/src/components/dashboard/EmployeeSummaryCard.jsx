const badgeStyles = {
  Excellent: "bg-emerald-100 text-emerald-700",
  Good: "bg-blue-100 text-blue-700",
  Average: "bg-amber-100 text-amber-700",
  "Needs Improvement": "bg-rose-100 text-rose-700",
};

export default function EmployeeSummaryCard({ employee }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <img
          alt={employee.fullName}
          className="h-24 w-24 rounded-2xl object-cover shadow-md"
          src={employee.avatar}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-2xl font-bold text-slate-900">{employee.fullName}</h2>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${badgeStyles[employee.statusLabel]}`}
            >
              {employee.statusLabel}
            </span>
          </div>
          <p className="mt-1 text-sm font-medium text-slate-500">
            {employee.role} • {employee.department}
          </p>
          <p className="mt-1 text-sm text-slate-400">{employee.email}</p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Attendance Rate
          </p>
          <p className="mt-3 text-2xl font-bold text-slate-900">{employee.attendanceRate}%</p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Overall Progress
          </p>
          <p className="mt-3 text-2xl font-bold text-slate-900">{employee.overallProgress}%</p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Final Score
          </p>
          <p className="mt-3 text-2xl font-bold text-slate-900">
            {employee.finalScore.toFixed(1)}/20
          </p>
        </div>
      </div>
    </article>
  );
}
