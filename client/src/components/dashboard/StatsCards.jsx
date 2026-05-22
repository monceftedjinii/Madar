import AssignmentTurnedInOutlinedIcon from "@mui/icons-material/AssignmentTurnedInOutlined";
import AssignmentLateOutlinedIcon from "@mui/icons-material/AssignmentLateOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import FactCheckOutlinedIcon from "@mui/icons-material/FactCheckOutlined";
import Groups2OutlinedIcon from "@mui/icons-material/Groups2Outlined";
import MenuBookOutlinedIcon from "@mui/icons-material/MenuBookOutlined";
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
  employees: Groups2OutlinedIcon,
  documents: DescriptionOutlinedIcon,
  validations: FactCheckOutlinedIcon,
  formations: MenuBookOutlinedIcon,
  evaluations: QueryStatsOutlinedIcon,
  alerts: AssignmentLateOutlinedIcon,
  leaves_approved: FactCheckOutlinedIcon,
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
  employees: "bg-cyan-50 text-cyan-600",
  documents: "bg-indigo-50 text-indigo-600",
  validations: "bg-emerald-50 text-emerald-600",
  formations: "bg-fuchsia-50 text-fuchsia-600",
  evaluations: "bg-violet-50 text-violet-600",
  alerts: "bg-rose-50 text-rose-600",
  leaves_approved: "bg-emerald-50 text-emerald-600",
};

const darkColorMap = {
  total: "bg-blue-500/15 text-blue-300",
  completed: "bg-emerald-500/15 text-emerald-300",
  pending: "bg-amber-500/15 text-amber-300",
  late: "bg-rose-500/15 text-rose-300",
  attendance: "bg-sky-500/15 text-sky-300",
  performance: "bg-indigo-500/15 text-indigo-300",
  score: "bg-violet-500/15 text-violet-300",
  team: "bg-cyan-500/15 text-cyan-300",
  online: "bg-emerald-500/15 text-emerald-300",
  tasks: "bg-blue-500/15 text-blue-300",
  submitted: "bg-sky-500/15 text-sky-300",
  revision: "bg-amber-500/15 text-amber-300",
  leaves: "bg-rose-500/15 text-rose-300",
  employees: "bg-cyan-500/15 text-cyan-300",
  documents: "bg-indigo-500/15 text-indigo-300",
  validations: "bg-emerald-500/15 text-emerald-300",
  formations: "bg-fuchsia-500/15 text-fuchsia-300",
  evaluations: "bg-violet-500/15 text-violet-300",
  alerts: "bg-rose-500/15 text-rose-300",
  leaves_approved: "bg-emerald-500/15 text-emerald-300",
};

function StatCard({ item, dark = false }) {
  const Icon = iconMap[item.id] ?? TaskAltOutlinedIcon;
  const isAttendance = item.id === "attendance";
  const cardClass = dark
    ? "group rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
    : "group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg";

  return (
    <article className={cardClass}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className={`text-sm font-medium ${dark ? "text-slate-300" : "text-slate-500"}`}>
            {item.label}
          </p>
          <h3 className={`mt-3 text-3xl font-bold ${dark ? "text-slate-50" : "text-slate-900"}`}>
            {item.value}
          </h3>
          <p className={`mt-2 text-xs leading-relaxed ${isAttendance ? (dark ? "text-sky-300 font-semibold" : "text-sky-600 font-semibold") : "text-slate-400"}`}>
            {item.helper}
          </p>
        </div>
        <div
          className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl ${
            dark ? darkColorMap[item.id] : colorMap[item.id]
          }`}
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
