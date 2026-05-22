function getAccountInitials(fullName) {
  const parts = (fullName || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "U";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export default function ChefSummaryCard({ profile = {}, dark = false }) {
  if (!profile) return null;

  const cardClass = dark
    ? "rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-sm"
    : "rounded-2xl border border-slate-200 bg-white p-6 shadow-sm";
  const innerClass = dark ? "rounded-xl bg-slate-800 p-4" : "rounded-xl bg-slate-50 p-4";

  const daily = [
    { label: "Equipe",           value: profile.teamSize       ?? 0, color: dark ? "text-blue-400"   : "text-blue-600"   },
    { label: "En ligne",         value: profile.onlineCount    ?? 0, color: dark ? "text-emerald-400": "text-emerald-600" },
    { label: "Pointages",        value: profile.checkedInCount ?? 0, color: dark ? "text-cyan-400"   : "text-cyan-600"   },
    { label: "Travaux remis",    value: profile.submittedCount ?? 0, color: dark ? "text-amber-400"  : "text-amber-600"  },
    { label: "Corrections",      value: profile.revisionCount  ?? 0, color: dark ? "text-rose-400"   : "text-rose-600"   },
    { label: "Conges attente",   value: profile.pendingLeaves  ?? 0, color: dark ? "text-violet-400" : "text-violet-600" },
  ];

  return (
    <article className={cardClass}>
      {/* Identity row */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        {profile.avatar ? (
          <img alt={profile.fullName} className="h-16 w-16 rounded-2xl object-cover shadow-md flex-shrink-0" src={profile.avatar} />
        ) : (
          <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-600 text-xl font-extrabold text-white shadow-md">
            {getAccountInitials(profile.fullName)}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h2 className={`text-xl font-bold ${dark ? "text-slate-50" : "text-slate-900"}`}>{profile.fullName}</h2>
          <p className={`mt-1 text-sm font-medium ${dark ? "text-slate-300" : "text-slate-500"}`}>{profile.role} · {profile.department}</p>
          <p className={`mt-0.5 text-xs ${dark ? "text-slate-400" : "text-slate-400"}`}>{profile.email}</p>
        </div>
        <span className="flex-shrink-0 rounded-full bg-blue-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-blue-600">
          Tableau du jour
        </span>
      </div>

      {/* Daily metrics */}
      <div className="mt-5 grid grid-cols-3 gap-3 sm:grid-cols-6">
        {daily.map(({ label, value, color }) => (
          <div key={label} className={innerClass}>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
            <p className={`mt-2 text-2xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>
    </article>
  );
}
