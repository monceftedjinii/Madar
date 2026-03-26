import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import BarChartOutlinedIcon from "@mui/icons-material/BarChartOutlined";
import DonutLargeOutlinedIcon from "@mui/icons-material/DonutLargeOutlined";
import InsightsOutlinedIcon from "@mui/icons-material/InsightsOutlined";
import RadarOutlinedIcon from "@mui/icons-material/RadarOutlined";
import Navbar from "../../components/Navbar";
import useDarkModePreference from "../../hooks/useDarkModePreference";
import ActivityPanels from "../../components/dashboard/ActivityPanels";
import DashboardHeader from "../../components/dashboard/DashboardHeader";
import EmployeeSummaryCard from "../../components/dashboard/EmployeeSummaryCard";
import MonthlyScoreCard from "../../components/dashboard/MonthlyScoreCard";
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
  profile: {
    fullName: "",
    role: "",
    department: "",
    email: "",
    avatar: "https://cdn-icons-png.flaticon.com/512/149/149071.png",
    attendanceRate: 0,
    overallProgress: 0,
    finalScore: 0,
    topSkill: "",
    statusLabel: "À améliorer",
  },
  header: {
    department: "Non renseigné",
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
  Terminée: 0,
  "En cours": 1,
  "En attente": 2,
  "En retard": 3,
};

export default function Dashboard() {
  const [dark, setDark] = useDarkModePreference();
  const [isNavOpen, setIsNavOpen] = useState(true);
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
        (left, right) => statusOrder[left.status] - statusOrder[right.status],
      ),
    [dashboardData.tasks],
  );

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
        <div className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur">
          <div className="mx-auto flex w-[96%] flex-wrap items-center justify-between gap-4 py-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                Espace RH moderne
              </p>
              <h2 className="text-xl font-bold text-slate-900">
                Tableau de bord employé
              </h2>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                onClick={() => setIsNavOpen((prev) => !prev)}
                type="button"
              >
                {isNavOpen ? "Masquer menu" : "Afficher menu"}
              </button>
              <button
                className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                onClick={() => setDark((prev) => !prev)}
                type="button"
              >
                {dark ? "Mode clair" : "Mode sombre"}
              </button>
            </div>
          </div>
        </div>

        <main className="mx-auto flex w-[96%] flex-col gap-6 py-6">
          <DashboardHeader
            monthLabel={dashboardData.header.monthLabel}
            monthValue={dashboardData.header.monthValue || selectedMonth}
            monthOptions={monthOptions}
            onMonthChange={setSelectedMonth}
          />
          <StatsCards items={dashboardData.stats} />

          <section className="grid gap-6 2xl:grid-cols-[1.15fr_0.85fr]">
            <EmployeeSummaryCard employee={dashboardData.profile} />
            <MonthlyScoreCard
              achievement={dashboardData.scoreInsights.achievement}
              improvement={dashboardData.scoreInsights.improvement}
              score={dashboardData.profile.finalScore}
            />
          </section>

          <section className="grid gap-6 xl:grid-cols-2">
            <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    Performance hebdomadaire
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Vue de votre performance semaine par semaine.
                  </p>
                </div>
                <div className="rounded-2xl bg-blue-50 p-3 text-blue-600">
                  <BarChartOutlinedIcon fontSize="small" />
                </div>
              </div>
              <div className="h-80">
                <PerformanceBarChart values={dashboardData.charts.weeklyPerformance} />
              </div>
            </article>

            <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    Progression mensuelle
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Suivez l'évolution de votre progression sur le mois.
                  </p>
                </div>
                <div className="rounded-2xl bg-indigo-50 p-3 text-indigo-600">
                  <InsightsOutlinedIcon fontSize="small" />
                </div>
              </div>
              <div className="h-80">
                <ProgressLineChart values={dashboardData.charts.monthlyProgress} />
              </div>
            </article>
          </section>

          <section className="grid gap-6 xl:grid-cols-2">
            <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    Répartition des tâches
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Répartition entre tâches terminées, en attente et en retard.
                  </p>
                </div>
                <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-600">
                  <DonutLargeOutlinedIcon fontSize="small" />
                </div>
              </div>
              <div className="h-80">
                <TasksDoughnutChart values={dashboardData.charts.taskBreakdown} />
              </div>
            </article>

            <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    Radar des compétences
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Principales compétences observées sur le mois.
                  </p>
                </div>
                <div className="rounded-2xl bg-violet-50 p-3 text-violet-600">
                  <RadarOutlinedIcon fontSize="small" />
                </div>
              </div>
              <div className="h-80">
                <SkillsRadarChart values={dashboardData.charts.skills} />
              </div>
            </article>
          </section>

          <TasksTable rows={orderedTasks} />
          <ActivityPanels
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
