export default function DashboardHeader({
  monthLabel = "Ce mois",
  monthValue = "",
  monthOptions = [],
  dark = false,
  onMonthChange,
}) {
  return (
    <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <p
          className={`mb-2 text-sm font-semibold uppercase tracking-[0.2em] ${
            dark ? "text-blue-400" : "text-blue-600"
          }`}
        >
          Espace Employe
        </p>
        <h1
          className={`text-3xl font-bold tracking-tight md:text-4xl ${
            dark ? "text-slate-50" : "text-slate-900"
          }`}
        >
          Tableau de bord employe
        </h1>
        <p
          className={`mt-2 max-w-2xl text-sm md:text-base ${
            dark ? "text-slate-300" : "text-slate-500"
          }`}
        >
          Suivez votre performance, votre productivite et votre note mensuelle
          dans un tableau de bord RH clair et moderne.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-[220px]">
        <label
          className={`flex items-center rounded-2xl px-4 py-3 shadow-sm ${
            dark
              ? "border border-slate-700 bg-slate-900"
              : "border border-slate-200 bg-white"
          }`}
        >
          <div className="w-full">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
              Mois
            </p>
            <select
              className={`mt-1 w-full rounded-xl border-none text-sm font-medium outline-none ${
                dark
                  ? "bg-slate-900 text-slate-100 [color-scheme:dark]"
                  : "bg-white text-slate-700 [color-scheme:light]"
              }`}
              value={monthValue}
              onChange={(event) => onMonthChange?.(event.target.value)}
            >
              {monthOptions.map((option) => (
                <option
                  key={option.value}
                  value={option.value}
                  className={dark ? "bg-slate-900 text-slate-100" : "bg-white text-slate-900"}
                >
                  {option.label}
                </option>
              ))}
              {!monthOptions.length && (
                <option
                  value=""
                  className={dark ? "bg-slate-900 text-slate-100" : "bg-white text-slate-900"}
                >
                  {monthLabel}
                </option>
              )}
            </select>
          </div>
        </label>
      </div>
    </div>
  );
}
