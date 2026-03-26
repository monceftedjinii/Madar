import AssignmentTurnedInOutlinedIcon from "@mui/icons-material/AssignmentTurnedInOutlined";
import AssignmentLateOutlinedIcon from "@mui/icons-material/AssignmentLateOutlined";
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
};

const colorMap = {
  total: "bg-blue-50 text-blue-600",
  completed: "bg-emerald-50 text-emerald-600",
  pending: "bg-amber-50 text-amber-600",
  late: "bg-rose-50 text-rose-600",
  attendance: "bg-sky-50 text-sky-600",
  performance: "bg-indigo-50 text-indigo-600",
  score: "bg-violet-50 text-violet-600",
};

function StatCard({ item }) {
  const Icon = iconMap[item.id];

  return (
    <article className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">{item.label}</p>
          <h3 className="mt-3 text-3xl font-bold text-slate-900">{item.value}</h3>
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

export default function StatsCards({ items }) {
  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7">
      {items.map((item) => (
        <StatCard key={item.id} item={item} />
      ))}
    </section>
  );
}
