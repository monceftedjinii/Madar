function getAccountInitials(fullName) {
  const parts = (fullName || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!parts.length) return "U";
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();

  return `${parts[0].slice(0, 1)}${parts[parts.length - 1].slice(0, 1)}`.toUpperCase();
}

export default function ChefSummaryCard({ profile, dark = false }) {
  const cardClass = dark
    ? "rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-sm"
    : "rounded-2xl border border-slate-200 bg-white p-6 shadow-sm";
  const innerClass = dark ? "rounded-2xl bg-slate-800 p-4" : "rounded-2xl bg-slate-50 p-4";

  return (
    <article className={cardClass}>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        {profile.avatar ? (
          <img
            alt={profile.fullName}
            className="h-24 w-24 rounded-2xl object-cover shadow-md"
            src={profile.avatar}
          />
        ) : (
          <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-700 text-2xl font-extrabold uppercase tracking-[0.12em] text-white shadow-md">
            {getAccountInitials(profile.fullName)}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h2 className={`text-2xl font-bold ${dark ? "text-slate-50" : "text-slate-900"}`}>
            {profile.fullName}
          </h2>
          <p className={`mt-1 text-sm font-medium ${dark ? "text-slate-300" : "text-slate-500"}`}>
            {profile.role} • {profile.department}
          </p>
          <p className={`mt-1 text-sm ${dark ? "text-slate-400" : "text-slate-400"}`}>
            {profile.email}
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className={innerClass}>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Taille équipe
          </p>
          <p className={`mt-3 text-2xl font-bold ${dark ? "text-slate-50" : "text-slate-900"}`}>
            {profile.teamSize ?? 0}
          </p>
        </div>
        <div className={innerClass}>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            En ligne
          </p>
          <p className={`mt-3 text-2xl font-bold ${dark ? "text-slate-50" : "text-slate-900"}`}>
            {profile.onlineCount ?? 0}
          </p>
        </div>
        <div className={innerClass}>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Pointages du jour
          </p>
          <p className={`mt-3 text-2xl font-bold ${dark ? "text-slate-50" : "text-slate-900"}`}>
            {profile.checkedInCount ?? 0}
          </p>
        </div>
        <div className={innerClass}>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Congés à valider
          </p>
          <p className={`mt-3 text-2xl font-bold ${dark ? "text-slate-50" : "text-slate-900"}`}>
            {profile.pendingLeaves ?? 0}
          </p>
        </div>
      </div>
    </article>
  );
}
