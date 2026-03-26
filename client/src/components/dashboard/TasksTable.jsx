const statusStyles = {
  Completed: "bg-emerald-100 text-emerald-700",
  "In Progress": "bg-blue-100 text-blue-700",
  Late: "bg-rose-100 text-rose-700",
  Pending: "bg-amber-100 text-amber-700",
};

const priorityStyles = {
  High: "text-rose-600",
  Medium: "text-amber-600",
  Low: "text-emerald-600",
};

export default function TasksTable({ rows }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5">
        <h3 className="text-lg font-bold text-slate-900">Assigned Tasks</h3>
        <p className="mt-1 text-sm text-slate-500">
          Track task status, priority and progress at a glance.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full border-separate border-spacing-y-3">
          <thead>
            <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
              <th className="px-3">Task Name</th>
              <th className="px-3">Priority</th>
              <th className="px-3">Deadline</th>
              <th className="px-3">Status</th>
              <th className="px-3">Progress</th>
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
