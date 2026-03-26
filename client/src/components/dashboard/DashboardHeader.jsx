export default function DashboardHeader({
  monthLabel = "Ce mois",
  monthValue = "",
  monthOptions = [],
  onMonthChange,
}) {
  return (
    <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">
          Espace Employé
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
          Tableau de bord employé
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-500 md:text-base">
          Suivez votre performance, votre productivité et votre note mensuelle dans un tableau de bord RH clair et moderne.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-[220px]">
        <label className="flex items-center rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <div className="w-full">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
              Mois
            </p>
            <select
              className="mt-1 w-full bg-transparent text-sm font-medium text-slate-700 outline-none"
              value={monthValue}
              onChange={(event) => onMonthChange?.(event.target.value)}
            >
              {monthOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
              {!monthOptions.length && <option value="">{monthLabel}</option>}
            </select>
          </div>
        </label>
      </div>
    </div>
  );
}
