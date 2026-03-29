import AssignmentTurnedInOutlinedIcon from "@mui/icons-material/AssignmentTurnedInOutlined";
import AssignmentLateOutlinedIcon from "@mui/icons-material/AssignmentLateOutlined";
import Groups2OutlinedIcon from "@mui/icons-material/Groups2Outlined";
import MarkEmailReadOutlinedIcon from "@mui/icons-material/MarkEmailReadOutlined";
import PendingActionsOutlinedIcon from "@mui/icons-material/PendingActionsOutlined";
import QueryStatsOutlinedIcon from "@mui/icons-material/QueryStatsOutlined";
import SpeedOutlinedIcon from "@mui/icons-material/SpeedOutlined";
import TaskAltOutlinedIcon from "@mui/icons-material/TaskAltOutlined";
import TimerOutlinedIcon from "@mui/icons-material/TimerOutlined";

const iconMap = {
  total: TaskAltOutlinedIcon,
  completed: AssignmentTurnedInOutlinedIcon,
  pending: PendingActionsOutlinedIcon,
  late: AssignmentLateOutlinedIcon,
  attendance: TimerOutlinedIcon,
  performance: QueryStatsOutlinedIcon,
  score: SpeedOutlinedIcon,
  team: Groups2OutlinedIcon,
  online: MarkEmailReadOutlinedIcon,
  tasks: TaskAltOutlinedIcon,
  submitted: AssignmentTurnedInOutlinedIcon,
  revision: PendingActionsOutlinedIcon,
  leaves: AssignmentLateOutlinedIcon,
};

const colorMap = {
  total: "bg-blue-50 text-blue-600",
  completed: "bg-emerald-50 text-emerald-600",
  pending: "bg-amber-50 text-amber-600",
  late: "bg-rose-50 text-rose-600",
  attendance: "bg-sky-50 text-sky-600",
  performance: "bg-indigo-50 text-indigo-600",
  score: "bg-violet-50 text-violet-600",
  team: "bg-cyan-50 text-cyan-600",
  online: "bg-emerald-50 text-emerald-600",
  tasks: "bg-blue-50 text-blue-600",
  submitted: "bg-sky-50 text-sky-600",
  revision: "bg-amber-50 text-amber-600",
  leaves: "bg-rose-50 text-rose-600",
};

function StatCard({ item, dark = false }) {
  const Icon = iconMap[item.id];
  const cardClass = dark
    ? "group rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
    : "group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg";

  return (
    <article className={cardClass}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className={`text-sm font-medium ${dark ? "text-slate-300" : "text-slate-500"}`}>
            {item.label}
          </p>
          <h3 className={`mt-3 text-3xl font-bold ${dark ? "text-slate-50" : "text-slate-900"}`}>
            {item.value}
          </h3>
          <p className="mt-2 text-xs text-slate-400">{item.helper}</p>
        </div>
        <div
          className={`flex h-11 w-11 items-center justify-center rounded-2xl ${colorMap[item.id]}`}
        >
          <Icon fontSize="small" />
        </div>
      </div>
    </article>
  );
}

export default function StatsCards({ items, dark = false }) {
  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7">
      {items.map((item) => (
        <StatCard key={item.id} dark={dark} item={item} />
      ))}
    </section>
  );
}
