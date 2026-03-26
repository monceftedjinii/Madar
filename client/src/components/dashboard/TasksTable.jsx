const statusStyles = {
  Terminée: "bg-emerald-100 text-emerald-700",
  "En cours": "bg-blue-100 text-blue-700",
  "En retard": "bg-rose-100 text-rose-700",
  "En attente": "bg-amber-100 text-amber-700",
};

const priorityStyles = {
  Haute: "text-rose-600",
  Moyenne: "text-amber-600",
  Basse: "text-emerald-600",
};

export default function TasksTable({ rows }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5">
        <h3 className="text-lg font-bold text-slate-900">Tâches assignées</h3>
        <p className="mt-1 text-sm text-slate-500">
          Suivez rapidement le statut, la priorité et l'avancement de vos tâches.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full border-separate border-spacing-y-3">
          <thead>
            <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
              <th className="px-3">Tâche</th>
              <th className="px-3">Priorité</th>
              <th className="px-3">Échéance</th>
              <th className="px-3">Statut</th>
              <th className="px-3">Progression</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((task) => (
              <tr key={task.id} className="rounded-2xl bg-slate-50">
                <td className="rounded-l-2xl px-3 py-4 text-sm font-semibold text-slate-800">
                  {task.name}
                </td>
                <td className={`px-3 py-4 text-sm font-semibold ${priorityStyles[task.priority]}`}>
                  {task.priority}
                </td>
                <td className="px-3 py-4 text-sm text-slate-600">{task.deadline}</td>
                <td className="px-3 py-4 text-sm">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[task.status]}`}
                  >
                    {task.status}
                  </span>
                </td>
                <td className="rounded-r-2xl px-3 py-4">
                  <div className="flex min-w-[160px] items-center gap-3">
                    <div className="h-2 flex-1 rounded-full bg-slate-200">
                      <div
                        className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500"
                        style={{ width: `${task.progress}%` }}
                      />
                    </div>
                    <span className="text-sm font-semibold text-slate-700">{task.progress}%</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </article>
  );
}
