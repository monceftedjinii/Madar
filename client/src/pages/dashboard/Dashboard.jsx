import NotificationBell from "../../components/NotificationBell";
import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import BarChartOutlinedIcon from "@mui/icons-material/BarChartOutlined";
import DonutLargeOutlinedIcon from "@mui/icons-material/DonutLargeOutlined";
import InsightsOutlinedIcon from "@mui/icons-material/InsightsOutlined";
import RadarOutlinedIcon from "@mui/icons-material/RadarOutlined";
import Navbar from "../../components/Navbar";
import useDarkModePreference from "../../hooks/useDarkModePreference";
import usePersistentNavState from "../../hooks/usePersistentNavState";
import ActivityPanels from "../../components/dashboard/ActivityPanels";
import DashboardHeader from "../../components/dashboard/DashboardHeader";
import EmployeeSummaryCard from "../../components/dashboard/EmployeeSummaryCard";
import PerformanceBarChart from "../../components/dashboard/PerformanceBarChart";
import ProgressLineChart from "../../components/dashboard/ProgressLineChart";
import SkillsRadarChart from "../../components/dashboard/SkillsRadarChart";
import StatsCards from "../../components/dashboard/StatsCards";
import TasksDoughnutChart from "../../components/dashboard/TasksDoughnutChart";
import TasksTable from "../../components/dashboard/TasksTable";

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
  latestEvaluation: null,
  profile: {
    fullName: "",
    role: "",
    department: "",
    email: "",
    avatar: "",
    attendanceRate: 0,
    overallProgress: 0,
    finalScore: 0,
    topSkill: "",
    statusLabel: "A ameliorer",
  },
  header: {
    department: "Non renseigne",
    monthLabel: "",
    monthValue: "",
  },
  stats: [],
  charts: {
    weeklyPerformance: [],
    monthlyProgress: [],
    taskBreakdown: { completed: 0, pending: 0, late: 0 },
    skills: {
      punctuality: 0,
      productivity: 0,
      teamwork: 0,
      discipline: 0,
      qualityOfWork: 0,
    },
  },
  scoreInsights: {
    achievement: "",
    improvement: "",
  },
  tasks: [],
  panels: {
    planning: [],
    notifications: [],
    hrRequests: [],
    quickMessages: [],
  },
};

const statusOrder = {
  "Terminée": 0,
  "En cours": 1,
  "En attente": 2,
  "En retard": 3,
  "TerminÃ©e": 0,
};

export default function Dashboard() {
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
        const response = await axios.get("/api/dashboard/employee/", {
          params: { month: selectedMonth },
        });
        setDashboardData({
          ...emptyDashboard,
          ...response.data,
        });
      } catch (error) {
        console.error("Error fetching employee dashboard:", error);
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

  const orderedTasks = useMemo(
    () =>
      [...dashboardData.tasks].sort(
        (left, right) =>
          (statusOrder[left.status] ?? 99) - (statusOrder[right.status] ?? 99),
      ),
    [dashboardData.tasks],
  );

  const stickyHeaderClass = dark
    ? "border-b border-slate-800 bg-slate-950/90"
    : "border-b border-slate-200/80 bg-white/90";

  const topButtonClass = dark
    ? "border border-slate-700 bg-slate-900 text-slate-100"
    : "border border-slate-200 bg-white text-slate-700";

  const chartCardClass = dark
    ? "rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-sm"
    : "rounded-2xl border border-slate-200 bg-white p-6 shadow-sm";

  const chartTitleClass = dark ? "text-lg font-bold text-slate-50" : "text-lg font-bold text-slate-900";
  const chartTextClass = dark ? "mt-1 text-sm text-slate-300" : "mt-1 text-sm text-slate-500";

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
                Espace RH moderne
              </p>
              <h2 className={`text-xl font-bold ${dark ? "text-slate-50" : "text-slate-900"}`}>
                Tableau de bord employe
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

        <main className="mx-auto flex w-[96%] flex-col gap-6 py-6">
          <DashboardHeader
            dark={dark}
            monthLabel={dashboardData.header.monthLabel}
            monthValue={dashboardData.header.monthValue || selectedMonth}
            monthOptions={monthOptions}
            onMonthChange={setSelectedMonth}
          />
          <StatsCards dark={dark} items={dashboardData.stats} />

          {/* Latest evaluation note */}
          {dashboardData.latestEvaluation && (() => {
            const ev = dashboardData.latestEvaluation;
            const score = ev.score;
            const scoreColor = score >= 9 ? "#16a34a" : score >= 7 ? "#d97706" : score >= 5 ? "#2563eb" : "#dc2626";
            const recColor = score >= 9 ? "#dcfce7" : score >= 7 ? "#fef9c3" : score >= 5 ? "#eff6ff" : "#fee2e2";
            const recBorder = score >= 9 ? "#86efac" : score >= 7 ? "#fde047" : score >= 5 ? "#93c5fd" : "#fca5a5";
            return (
              <section className={`flex flex-wrap items-center gap-6 rounded-[28px] border p-5 ${dark ? "border-slate-800 bg-slate-900/90" : "border-white/80 bg-white/90"}`}>
                <div style={{ display: "flex", alignItems: "center", gap: 20, flex: 1, minWidth: 240 }}>
                  <div style={{
                    minWidth: 80, height: 80, borderRadius: "50%",
                    border: `3px solid ${scoreColor}`,
                    display: "flex", flexDirection: "column",
                    alignItems: "center", justifyContent: "center",
                    background: dark ? "#0f172a" : "#f8fafc",
                  }}>
                    <span style={{ fontSize: 22, fontWeight: 900, color: scoreColor, lineHeight: 1 }}>{score.toFixed(1)}</span>
                    <span style={{ fontSize: 11, color: dark ? "#94a3b8" : "#64748b", letterSpacing: "0.05em" }}>/10</span>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-500">Note mensuelle</p>
                    <h3 className={`mt-1 text-xl font-black ${dark ? "text-slate-50" : "text-slate-900"}`}>
                      {ev.period}
                    </h3>
                    {ev.overall_comment && (
                      <p className="mt-1 text-sm text-slate-500 max-w-xl">{ev.overall_comment}</p>
                    )}
                  </div>
                </div>
                <div style={{
                  background: recColor, border: `1px solid ${recBorder}`,
                  borderRadius: 16, padding: "10px 20px",
                  fontSize: 14, fontWeight: 700, color: scoreColor,
                  whiteSpace: "nowrap",
                }}>
                  {ev.recommendation}
                </div>
              </section>
            );
          })()}

          <section>
            <EmployeeSummaryCard dark={dark} employee={dashboardData.profile} />
          </section>

          <section className="grid gap-6 xl:grid-cols-2">
            <article className={chartCardClass}>
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <h3 className={chartTitleClass}>Performance hebdomadaire</h3>
                  <p className={chartTextClass}>
                    Vue de votre performance semaine par semaine.
                  </p>
                </div>
                <div className="rounded-2xl bg-blue-50 p-3 text-blue-600">
                  <BarChartOutlinedIcon fontSize="small" />
                </div>
              </div>
              <div className="h-80">
                <PerformanceBarChart values={dashboardData.charts.weeklyPerformance} dark={dark} />
              </div>
            </article>

            <article className={chartCardClass}>
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <h3 className={chartTitleClass}>Progression mensuelle</h3>
                  <p className={chartTextClass}>
                    Suivez l evolution de votre progression sur le mois.
                  </p>
                </div>
                <div className="rounded-2xl bg-indigo-50 p-3 text-indigo-600">
                  <InsightsOutlinedIcon fontSize="small" />
                </div>
              </div>
              <div className="h-80">
                <ProgressLineChart values={dashboardData.charts.monthlyProgress} dark={dark} />
              </div>
            </article>
          </section>

          <section className="grid gap-6 xl:grid-cols-2">
            <article className={chartCardClass}>
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <h3 className={chartTitleClass}>Repartition des taches</h3>
                  <p className={chartTextClass}>
                    Repartition entre taches terminees, en attente et en retard.
                  </p>
                </div>
                <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-600">
                  <DonutLargeOutlinedIcon fontSize="small" />
                </div>
              </div>
              <div className="h-80">
                <TasksDoughnutChart values={dashboardData.charts.taskBreakdown} dark={dark} />
              </div>
            </article>

            <article className={chartCardClass}>
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <h3 className={chartTitleClass}>Radar des competences</h3>
                  <p className={chartTextClass}>
                    Principales competences observees sur le mois.
                  </p>
                </div>
                <div className="rounded-2xl bg-violet-50 p-3 text-violet-600">
                  <RadarOutlinedIcon fontSize="small" />
                </div>
              </div>
              <div className="h-80">
                <SkillsRadarChart values={dashboardData.charts.skills} dark={dark} />
              </div>
            </article>
          </section>

          <TasksTable dark={dark} rows={orderedTasks} />
          <ActivityPanels
            dark={dark}
            hrRequests={dashboardData.panels.hrRequests}
            notifications={dashboardData.panels.notifications}
            planning={dashboardData.panels.planning}
            quickMessages={dashboardData.panels.quickMessages}
          />
        </main>
      </div>
    </div>
  );
}
