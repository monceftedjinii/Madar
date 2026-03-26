export default function ActivityPanels({
  planning,
  notifications,
  hrRequests,
  quickMessages,
  dark = false,
}) {
  const cardClass = dark
    ? "rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-sm"
    : "rounded-2xl border border-slate-200 bg-white p-6 shadow-sm";
  const innerClass = dark ? "rounded-2xl bg-slate-800 p-4" : "rounded-2xl bg-slate-50 p-4";

  return (
    <div className="grid gap-6 xl:grid-cols-3">
      <article className={cardClass}>
        <h3 className={`text-lg font-bold ${dark ? "text-slate-50" : "text-slate-900"}`}>
          Planning / Calendrier
        </h3>
        <p className={`mt-1 text-sm ${dark ? "text-slate-300" : "text-slate-500"}`}>
          Horaires, réunions et échéances à venir.
        </p>
        <div className="mt-5 space-y-4">
          {planning.map((item) => (
            <div key={item.id} className={`flex gap-4 ${innerClass}`}>
              <div className="w-16 text-sm font-semibold text-blue-600">{item.time}</div>
              <div>
                <p className={`font-semibold ${dark ? "text-slate-100" : "text-slate-800"}`}>
                  {item.title}
                </p>
                <p className={`text-sm ${dark ? "text-slate-300" : "text-slate-500"}`}>
                  {item.subtitle}
                </p>
              </div>
            </div>
          ))}
        </div>
      </article>

      <article className={cardClass}>
        <h3 className={`text-lg font-bold ${dark ? "text-slate-50" : "text-slate-900"}`}>
          Notifications
        </h3>
        <p className={`mt-1 text-sm ${dark ? "text-slate-300" : "text-slate-500"}`}>
          Alertes internes et informations importantes.
        </p>
        <div className="mt-5 space-y-4">
          {notifications.map((item) => (
            <div key={item.id} className={innerClass}>
              <div className="flex items-center justify-between gap-3">
                <p className={`font-semibold ${dark ? "text-slate-100" : "text-slate-800"}`}>
                  {item.title}
                </p>
                <span
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                    item.level === "important"
                      ? "bg-rose-100 text-rose-700"
                      : "bg-blue-100 text-blue-700"
                  }`}
                >
                  {item.level}
                </span>
              </div>
              <p className={`mt-2 text-sm ${dark ? "text-slate-300" : "text-slate-500"}`}>
                {item.message}
              </p>
            </div>
          ))}
        </div>
      </article>

      <article className={cardClass}>
        <h3 className={`text-lg font-bold ${dark ? "text-slate-50" : "text-slate-900"}`}>
          RH et communication rapide
        </h3>
        <p className={`mt-1 text-sm ${dark ? "text-slate-300" : "text-slate-500"}`}>
          Suivi RH et messages rapides de l'équipe.
        </p>
        <div className="mt-5 space-y-4">
          <div className="space-y-3">
            {hrRequests.map((item) => (
              <div key={item.id} className={`flex items-center justify-between ${innerClass}`}>
                <p className={`font-semibold ${dark ? "text-slate-100" : "text-slate-800"}`}>
                  {item.label}
                </p>
                <span className={`text-sm ${dark ? "text-slate-300" : "text-slate-500"}`}>
                  {item.status}
                </span>
              </div>
            ))}
          </div>
          <div
            className={`rounded-2xl border p-4 ${
              dark ? "border-dashed border-slate-700 bg-slate-900" : "border-dashed border-slate-200"
            }`}
          >
            <p className={`mb-3 text-sm font-semibold ${dark ? "text-slate-200" : "text-slate-700"}`}>
              Messages rapides
            </p>
            <div className="space-y-3">
              {quickMessages.map((item) => (
                <div key={item.id}>
                  <p className={`text-sm font-semibold ${dark ? "text-slate-100" : "text-slate-800"}`}>
                    {item.sender}
                  </p>
                  <p className={`text-sm ${dark ? "text-slate-300" : "text-slate-500"}`}>
                    {item.subject}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </article>
    </div>
  );
}
