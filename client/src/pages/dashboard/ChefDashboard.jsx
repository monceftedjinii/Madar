import NotificationBell from "../../components/NotificationBell";
import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import BarChartOutlinedIcon from "@mui/icons-material/BarChartOutlined";
import ChecklistRtlOutlinedIcon from "@mui/icons-material/ChecklistRtlOutlined";
import Navbar from "../../components/Navbar";
import useDarkModePreference from "../../hooks/useDarkModePreference";
import usePersistentNavState from "../../hooks/usePersistentNavState";
import DashboardHeader from "../../components/dashboard/DashboardHeader";
import StatsCards from "../../components/dashboard/StatsCards";
import PerformanceBarChart from "../../components/dashboard/PerformanceBarChart";
import ChefSummaryCard from "../../components/dashboard/ChefSummaryCard";
import "../../styles/chef-space.css";

const MONTH_LABELS = [
  "Janvier",
  "Fevrier",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Aout",
  "Septembre",
  "Octobre",
  "Novembre",
  "Decembre",
];

const emptyDashboard = {
  header: {
    department: "Non renseigne",
    monthLabel: "",
    monthValue: "",
  },
  profile: {
    fullName: "",
    role: "Chef de service",
    department: "",
    email: "",
    avatar: "",
    teamSize: 0,
    onlineCount: 0,
    checkedInCount: 0,
    pendingLeaves: 0,
  },
  stats: [],
  charts: {
    attendance: [0, 0, 0],
    tasks: {
      todo: 0,
      submitted: 0,
      revision: 0,
      done: 0,
    },
  },
  team: [],
  tasks: [],
  leaves: [],
  notifications: [],
};

function formatDate(value) {
  if (!value || value === "-") return "-";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("fr-FR");
}

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getTaskBadgeClass(status) {
  if (status === "Terminee") return "badge badge-termine";
  if (status === "Travail remis") return "badge badge-genere";
  if (status === "Correction demandee") return "badge badge-attente";
  if (status === "En retard") return "badge badge-refuse";
  return "badge badge-attente";
}

export default function ChefDashboard() {
  const [dark, setDark] = useDarkModePreference();
  const [isNavOpen, setIsNavOpen] = usePersistentNavState();
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    return `${now.getFullYear()}-${month}`;
  });
  const [dashboardData, setDashboardData] = useState(emptyDashboard);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const response = await axios.get("/api/dashboard/chef/", {
          params: { month: selectedMonth },
        });
        const data = response.data || {};
        const checkedInStat = Array.isArray(data.stats)
          ? data.stats.find((item) => item.id === "attendance")
          : null;
        const leavesStat = Array.isArray(data.stats)
          ? data.stats.find((item) => item.id === "leaves")
          : null;

        setDashboardData({
          ...emptyDashboard,
          ...data,
          profile: {
            ...emptyDashboard.profile,
            ...(data.profile || {}),
            checkedInCount: Number.parseInt(checkedInStat?.value ?? 0, 10) || 0,
            pendingLeaves: Number.parseInt(leavesStat?.value ?? 0, 10) || 0,
          },
        });
      } catch (error) {
        console.error("Erreur chargement dashboard chef:", error);
      }
    };

    fetchDashboardData();
  }, [selectedMonth]);

  const monthOptions = useMemo(() => {
    const options = [];
    const current = new Date();
    current.setDate(1);

    for (let index = 0; index < 12; index += 1) {
      const optionDate = new Date(current.getFullYear(), current.getMonth() - index, 1);
      const month = String(optionDate.getMonth() + 1).padStart(2, "0");
      options.push({
        value: `${optionDate.getFullYear()}-${month}`,
        label: `${MONTH_LABELS[optionDate.getMonth()]} ${optionDate.getFullYear()}`,
      });
    }

    return options;
  }, []);

  const stickyHeaderClass = dark
    ? "border-b border-slate-800 bg-slate-950/90"
    : "border-b border-slate-200/80 bg-white/90";

  const topButtonClass = dark
    ? "border border-slate-700 bg-slate-900 text-slate-100"
    : "border border-slate-200 bg-white text-slate-700";

  const cardClass = dark
    ? "rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-sm"
    : "rounded-2xl border border-slate-200 bg-white p-6 shadow-sm";

  const innerClass = dark ? "rounded-2xl bg-slate-800 p-4" : "rounded-2xl bg-slate-50 p-4";

  const taskChartValues = [
    dashboardData.charts.tasks.todo,
    dashboardData.charts.tasks.submitted,
    dashboardData.charts.tasks.revision,
    dashboardData.charts.tasks.done,
  ];
  const taskChartMax = Math.max(1, ...taskChartValues);
  const attendanceChartMax = Math.max(1, dashboardData.profile.teamSize || 0);

  return (
    <div
      className={`profile-page${dark ? " dark" : ""} ${isNavOpen ? "nav-open" : "nav-closed"}`}
    >
      <div className={`navbar-profile-page ${isNavOpen ? "open" : "closed"}`}>
        <Navbar
          fullName={dashboardData.profile.fullName}
          post={dashboardData.profile.role}
          image={dashboardData.profile.avatar}
          email={dashboardData.profile.email}
        />
      </div>

      {isNavOpen && (
        <div
          className="profile-overlay"
          onClick={() => setIsNavOpen(false)}
          aria-hidden="true"
        />
      )}

      <div className="profile-content !h-auto min-h-screen bg-transparent">
        <div className={`sticky top-0 z-40 backdrop-blur ${stickyHeaderClass}`}>
          <div className="mx-auto flex w-[96%] flex-wrap items-center justify-between gap-4 py-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                Espace chef
              </p>
              <h2 className={`text-xl font-bold ${dark ? "text-slate-50" : "text-slate-900"}`}>
                Pilotage du service
              </h2>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                className={`rounded-2xl px-4 py-2 text-sm font-semibold shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${topButtonClass}`}
                onClick={() => setIsNavOpen((prev) => !prev)}
                type="button"
              >
                {isNavOpen ? "Masquer menu" : "Afficher menu"}
              </button>
              <button
                className={`rounded-2xl px-4 py-2 text-sm font-semibold shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${topButtonClass}`}
                onClick={() => setDark((prev) => !prev)}
                type="button"
              >
                {dark ? "Mode clair" : "Mode sombre"}
              </button>
              <NotificationBell dark={dark} />
            </div>
          </div>
        </div>

        <main className="chef-page-stack">
          <section className="chef-hero">
            <div className="chef-hero-copy">
              <span className="chef-eyebrow">Espace chef</span>
              <h2 className="chef-hero-title">Pilotage du service sur une seule vue</h2>
              <p className="chef-hero-description">
                Surveillez l&apos;effectif, les pointages actifs, les conges en attente et la charge
                de travail avant d&apos;entrer dans les tableaux de detail.
              </p>
            </div>
            <div className="chef-hero-kpis">
              <article className="chef-kpi-card">
                <span>Equipe</span>
                <strong>{dashboardData.profile.teamSize}</strong>
                <p>Employes actuellement suivis dans votre service.</p>
              </article>
              <article className="chef-kpi-card">
                <span>En ligne</span>
                <strong>{dashboardData.profile.onlineCount}</strong>
                <p>Collaborateurs actifs sur la periode choisie.</p>
              </article>
              <article className="chef-kpi-card">
                <span>Pointages</span>
                <strong>{dashboardData.profile.checkedInCount}</strong>
                <p>Presences deja enregistrees aujourd&apos;hui.</p>
              </article>
              <article className="chef-kpi-card">
                <span>Conges</span>
                <strong>{dashboardData.profile.pendingLeaves}</strong>
                <p>Demandes en attente d&apos;attention manager.</p>
              </article>
            </div>
          </section>

          <DashboardHeader
            dark={dark}
            eyebrow="Espace chef"
            title="Tableau de bord du service"
            description="Suivez votre equipe, les travaux remis, les pointages du jour et les conges en attente depuis un espace de pilotage unique."
            monthLabel={dashboardData.header.monthLabel}
            monthValue={dashboardData.header.monthValue || selectedMonth}
            monthOptions={monthOptions}
            onMonthChange={setSelectedMonth}
          />

          <StatsCards dark={dark} items={dashboardData.stats} />

          <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <ChefSummaryCard dark={dark} profile={dashboardData.profile} />

            <article className={cardClass}>
              <h3 className={`text-lg font-bold ${dark ? "text-slate-50" : "text-slate-900"}`}>
                Alertes manager
              </h3>
              <p className={`mt-1 text-sm ${dark ? "text-slate-300" : "text-slate-500"}`}>
                Priorites a suivre pour votre service sur la periode choisie.
              </p>

              <div className="mt-5 space-y-4">
                <div className={innerClass}>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Travaux remis
                  </p>
                  <p className={`mt-2 text-2xl font-bold ${dark ? "text-slate-50" : "text-slate-900"}`}>
                    {dashboardData.charts.tasks.submitted}
                  </p>
                  <p className={`mt-1 text-sm ${dark ? "text-slate-300" : "text-slate-500"}`}>
                    Remises en attente de validation du chef.
                  </p>
                </div>
                <div className={innerClass}>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Corrections demandees
                  </p>
                  <p className={`mt-2 text-2xl font-bold ${dark ? "text-slate-50" : "text-slate-900"}`}>
                    {dashboardData.charts.tasks.revision}
                  </p>
                  <p className={`mt-1 text-sm ${dark ? "text-slate-300" : "text-slate-500"}`}>
                    Taches retournees a l equipe pour ajustement.
                  </p>
                </div>
                <div className={innerClass}>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Notifications non lues
                  </p>
                  <p className={`mt-2 text-2xl font-bold ${dark ? "text-slate-50" : "text-slate-900"}`}>
                    {dashboardData.notifications.filter((item) => !item.isRead).length}
                  </p>
                  <p className={`mt-1 text-sm ${dark ? "text-slate-300" : "text-slate-500"}`}>
                    Informations recentes a traiter.
                  </p>
                </div>
              </div>
            </article>
          </section>

          <section className="grid gap-6 xl:grid-cols-2">
            <article className={cardClass}>
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <h3 className={`text-lg font-bold ${dark ? "text-slate-50" : "text-slate-900"}`}>
                    Presence de l equipe
                  </h3>
                  <p className={`mt-1 text-sm ${dark ? "text-slate-300" : "text-slate-500"}`}>
                    Vision immediate des pointages du jour.
                  </p>
                </div>
                <div className="rounded-2xl bg-blue-50 p-3 text-blue-600">
                  <BarChartOutlinedIcon fontSize="small" />
                </div>
              </div>
              <div className="h-80">
                <PerformanceBarChart
                  values={dashboardData.charts.attendance}
                  labels={["Pointes", "Absents", "Journees completes"]}
                  datasetLabel="Presence equipe"
                  max={attendanceChartMax}
                  colors={["#38bdf8", "#f87171", "#22c55e"]}
                  dark={dark}
                />
              </div>
            </article>

            <article className={cardClass}>
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <h3 className={`text-lg font-bold ${dark ? "text-slate-50" : "text-slate-900"}`}>
                    Cycle des taches
                  </h3>
                  <p className={`mt-1 text-sm ${dark ? "text-slate-300" : "text-slate-500"}`}>
                    Repartition des taches creees par le chef sur le mois.
                  </p>
                </div>
                <div className="rounded-2xl bg-indigo-50 p-3 text-indigo-600">
                  <ChecklistRtlOutlinedIcon fontSize="small" />
                </div>
              </div>
              <div className="h-80">
                <PerformanceBarChart
                  values={taskChartValues}
                  labels={["En cours", "Remises", "Corrections", "Terminees"]}
                  datasetLabel="Taches equipe"
                  max={taskChartMax}
                  colors={["#60a5fa", "#38bdf8", "#f59e0b", "#10b981"]}
                  dark={dark}
                />
              </div>
            </article>
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <article className={cardClass}>
              <div className="mb-5">
                <h3 className={`text-lg font-bold ${dark ? "text-slate-50" : "text-slate-900"}`}>
                  Equipe du service
                </h3>
                <p className={`mt-1 text-sm ${dark ? "text-slate-300" : "text-slate-500"}`}>
                  Presence en ligne et pointage du jour pour chaque employe.
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full border-separate border-spacing-y-3">
                  <thead>
                    <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                      <th className="px-3">Employe</th>
                      <th className="px-3">Poste</th>
                      <th className="px-3">En ligne</th>
                      <th className="px-3">Pointage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboardData.team.map((member) => (
                      <tr key={member.id} className={dark ? "rounded-2xl bg-slate-800" : "rounded-2xl bg-slate-50"}>
                        <td className={`rounded-l-2xl px-3 py-4 text-sm font-semibold ${dark ? "text-slate-100" : "text-slate-800"}`}>
                          <div>{member.fullName}</div>
                          <div className={`mt-1 text-xs ${dark ? "text-slate-400" : "text-slate-500"}`}>{member.email}</div>
                        </td>
                        <td className={`px-3 py-4 text-sm ${dark ? "text-slate-300" : "text-slate-600"}`}>
                          {member.employee_role || "-"}
                        </td>
                        <td className="px-3 py-4 text-sm">
                          <span className={`badge ${member.isOnline ? "badge-termine" : "badge-refuse"}`}>
                            {member.isOnline ? "En ligne" : "Hors ligne"}
                          </span>
                        </td>
                        <td className="rounded-r-2xl px-3 py-4 text-sm">
                          <span className={`badge ${member.checkedOutToday ? "badge-termine" : member.checkedInToday ? "badge-attente" : "badge-refuse"}`}>
                            {member.checkedOutToday
                              ? "Journee complete"
                              : member.checkedInToday
                                ? "En cours"
                                : "Absent"}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {!dashboardData.team.length && (
                      <tr>
                        <td colSpan="4" className={`px-3 py-4 text-sm ${dark ? "text-slate-300" : "text-slate-500"}`}>
                          Aucun employe d equipe a afficher.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </article>

            <article className={cardClass}>
              <div className="mb-5">
                <h3 className={`text-lg font-bold ${dark ? "text-slate-50" : "text-slate-900"}`}>
                  Conges en attente
                </h3>
                <p className={`mt-1 text-sm ${dark ? "text-slate-300" : "text-slate-500"}`}>
                  Demandes d equipe a verifier rapidement.
                </p>
              </div>
              <div className="space-y-3">
                {dashboardData.leaves.map((leave) => (
                  <div key={leave.id} className={innerClass}>
                    <div className="flex items-center justify-between gap-3">
                      <p className={`font-semibold ${dark ? "text-slate-100" : "text-slate-800"}`}>
                        {leave.employee}
                      </p>
                      <span className="badge badge-attente">{leave.status}</span>
                    </div>
                    <p className={`mt-1 text-sm ${dark ? "text-slate-300" : "text-slate-500"}`}>
                      {leave.type} • du {formatDate(leave.startDate)} au {formatDate(leave.endDate)}
                    </p>
                  </div>
                ))}
                {!dashboardData.leaves.length && (
                  <div className={innerClass}>
                    <p className={dark ? "text-slate-300" : "text-slate-500"}>
                      Aucun conge en attente sur cette periode.
                    </p>
                  </div>
                )}
              </div>
            </article>
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <article className={cardClass}>
              <div className="mb-5">
                <h3 className={`text-lg font-bold ${dark ? "text-slate-50" : "text-slate-900"}`}>
                  Taches a suivre
                </h3>
                <p className={`mt-1 text-sm ${dark ? "text-slate-300" : "text-slate-500"}`}>
                  Remises, corrections et echeances de l equipe.
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full border-separate border-spacing-y-3">
                  <thead>
                    <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                      <th className="px-3">Tache</th>
                      <th className="px-3">Employe</th>
                      <th className="px-3">Echeance</th>
                      <th className="px-3">Remise</th>
                      <th className="px-3">Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboardData.tasks.map((task) => (
                      <tr key={task.id} className={dark ? "rounded-2xl bg-slate-800" : "rounded-2xl bg-slate-50"}>
                        <td className={`rounded-l-2xl px-3 py-4 text-sm font-semibold ${dark ? "text-slate-100" : "text-slate-800"}`}>
                          {task.name}
                        </td>
                        <td className={`px-3 py-4 text-sm ${dark ? "text-slate-300" : "text-slate-600"}`}>
                          {task.employee}
                        </td>
                        <td className={`px-3 py-4 text-sm ${dark ? "text-slate-300" : "text-slate-600"}`}>
                          {formatDate(task.deadline)}
                        </td>
                        <td className={`px-3 py-4 text-sm ${dark ? "text-slate-300" : "text-slate-600"}`}>
                          {task.submittedAt ? formatDateTime(task.submittedAt) : "-"}
                        </td>
                        <td className="rounded-r-2xl px-3 py-4 text-sm">
                          <span className={getTaskBadgeClass(task.status)}>{task.status}</span>
                        </td>
                      </tr>
                    ))}
                    {!dashboardData.tasks.length && (
                      <tr>
                        <td colSpan="5" className={`px-3 py-4 text-sm ${dark ? "text-slate-300" : "text-slate-500"}`}>
                          Aucune tache a suivre sur cette periode.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </article>

            <article className={cardClass}>
              <div className="mb-5">
                <h3 className={`text-lg font-bold ${dark ? "text-slate-50" : "text-slate-900"}`}>
                  Notifications recentes
                </h3>
                <p className={`mt-1 text-sm ${dark ? "text-slate-300" : "text-slate-500"}`}>
                  Derniers messages systeme remontes au chef.
                </p>
              </div>
              <div className="space-y-3">
                {dashboardData.notifications.map((item) => (
                  <div key={item.id} className={innerClass}>
                    <div className="flex items-center justify-between gap-3">
                      <p className={`font-semibold ${dark ? "text-slate-100" : "text-slate-800"}`}>
                        {item.title}
                      </p>
                      <span className={`badge ${item.isRead ? "badge-genere" : "badge-attente"}`}>
                        {item.isRead ? "Deja traitee" : "Non lue"}
                      </span>
                    </div>
                    <p className={`mt-2 text-sm ${dark ? "text-slate-300" : "text-slate-500"}`}>
                      {item.message}
                    </p>
                    <p className="mt-2 text-xs text-slate-400">{formatDateTime(item.createdAt)}</p>
                  </div>
                ))}
                {!dashboardData.notifications.length && (
                  <div className={innerClass}>
                    <p className={dark ? "text-slate-300" : "text-slate-500"}>
                      Aucune notification recente pour ce mois.
                    </p>
                  </div>
                )}
              </div>
            </article>
          </section>
        </main>
      </div>
    </div>
  );
}
