export default function ActivityPanels({
  planning,
  notifications,
  hrRequests,
  quickMessages,
}) {
  return (
    <div className="grid gap-6 xl:grid-cols-3">
      <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-bold text-slate-900">Planning / Calendar</h3>
        <p className="mt-1 text-sm text-slate-500">
          Working hours, meetings and deadlines.
        </p>
        <div className="mt-5 space-y-4">
          {planning.map((item) => (
            <div key={item.id} className="flex gap-4 rounded-2xl bg-slate-50 p-4">
              <div className="w-16 text-sm font-semibold text-blue-600">{item.time}</div>
              <div>
                <p className="font-semibold text-slate-800">{item.title}</p>
                <p className="text-sm text-slate-500">{item.subtitle}</p>
              </div>
            </div>
          ))}
        </div>
      </article>

      <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-bold text-slate-900">Notifications</h3>
        <p className="mt-1 text-sm text-slate-500">
          Internal alerts and important updates.
        </p>
        <div className="mt-5 space-y-4">
          {notifications.map((item) => (
            <div key={item.id} className="rounded-2xl bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold text-slate-800">{item.title}</p>
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
              <p className="mt-2 text-sm text-slate-500">{item.message}</p>
            </div>
          ))}
        </div>
      </article>

      <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-bold text-slate-900">RH & Quick Communication</h3>
        <p className="mt-1 text-sm text-slate-500">
          HR requests and quick team messages.
        </p>
        <div className="mt-5 space-y-4">
          <div className="space-y-3">
            {hrRequests.map((item) => (
              <div key={item.id} className="flex items-center justify-between rounded-2xl bg-slate-50 p-4">
                <p className="font-semibold text-slate-800">{item.label}</p>
                <span className="text-sm text-slate-500">{item.status}</span>
              </div>
            ))}
          </div>
          <div className="rounded-2xl border border-dashed border-slate-200 p-4">
            <p className="mb-3 text-sm font-semibold text-slate-700">Quick Messages</p>
            <div className="space-y-3">
              {quickMessages.map((item) => (
                <div key={item.id}>
                  <p className="text-sm font-semibold text-slate-800">{item.sender}</p>
                  <p className="text-sm text-slate-500">{item.subject}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </article>
    </div>
  );
}
