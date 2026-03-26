import { useMemo, useState } from "react";
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
import {
  employeeInfo,
  hrRequests,
  monthlyProgress,
  monthlyScoreInsights,
  notifications,
  planning,
  quickMessages,
  skillsData,
  taskBreakdown,
  tasks as initialTasks,
  weeklyPerformance,
} from "../../data/dashboardMock";

const statusOrder = {
  Completed: 0,
  "In Progress": 1,
  Pending: 2,
  Late: 3,
};

export default function Dashboard() {
  const [dark, setDark] = useDarkModePreference();
  const [isNavOpen, setIsNavOpen] = useState(true);
  const [tasks] = useState(initialTasks);

  const stats = useMemo(() => {
    const completed = tasks.filter((task) => task.status === "Completed").length;
    const pending = tasks.filter((task) => task.status === "Pending").length;
    const late = tasks.filter((task) => task.status === "Late").length;
    const monthlyPerformance = Math.round(
      weeklyPerformance.reduce((sum, value) => sum + value, 0) / weeklyPerformance.length,
    );

    return [
      {
        id: "total",
        label: "Total Tasks",
        value: tasks.length,
        helper: "All assigned tasks this month",
      },
      {
        id: "completed",
        label: "Completed Tasks",
        value: completed,
        helper: "Finished and validated tasks",
      },
      {
        id: "pending",
        label: "Pending Tasks",
        value: pending,
        helper: "Tasks waiting for execution",
      },
      {
        id: "late",
        label: "Late Tasks",
        value: late,
        helper: "Deadlines exceeded",
      },
      {
        id: "attendance",
        label: "Attendance Rate",
        value: `${employeeInfo.attendanceRate}%`,
        helper: "Monthly attendance overview",
      },
      {
        id: "performance",
        label: "Monthly Performance",
        value: `${monthlyPerformance}%`,
        helper: "Average performance this month",
      },
      {
        id: "score",
        label: "Final Monthly Score",
        value: `${employeeInfo.finalScore.toFixed(1)}/20`,
        helper: "Current evaluated score",
      },
    ];
  }, [tasks]);

  const employee = useMemo(() => {
    const finalScore = employeeInfo.finalScore;
    let statusLabel = "Needs Improvement";
    if (finalScore >= 16) statusLabel = "Excellent";
    else if (finalScore >= 12) statusLabel = "Good";
    else if (finalScore >= 8) statusLabel = "Average";

    return {
      ...employeeInfo,
      statusLabel,
    };
  }, []);

  const orderedTasks = useMemo(
    () =>
      [...tasks].sort(
        (left, right) => statusOrder[left.status] - statusOrder[right.status],
      ),
    [tasks],
  );

  return (
    <div
      className={`profile-page${dark ? " dark" : ""} ${isNavOpen ? "nav-open" : "nav-closed"}`}
    >
      <div className={`navbar-profile-page ${isNavOpen ? "open" : "closed"}`}>
        <Navbar
          fullName={employee.fullName}
          post={employee.role}
          image={employee.avatar}
          email={employee.email}
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
                Modern RH Workspace
              </p>
              <h2 className="text-xl font-bold text-slate-900">Dashboard Employee</h2>
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
          <DashboardHeader />
          <StatsCards items={stats} />

          <section className="grid gap-6 2xl:grid-cols-[1.15fr_0.85fr]">
            <EmployeeSummaryCard employee={employee} />
            <MonthlyScoreCard
              achievement={monthlyScoreInsights.achievement}
              improvement={monthlyScoreInsights.improvement}
              score={employee.finalScore}
            />
          </section>

          <section className="grid gap-6 xl:grid-cols-2">
            <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    Weekly Performance
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Employee performance by week over the current month.
                  </p>
                </div>
                <div className="rounded-2xl bg-blue-50 p-3 text-blue-600">
                  <BarChartOutlinedIcon fontSize="small" />
                </div>
              </div>
              <div className="h-80">
                <PerformanceBarChart values={weeklyPerformance} />
              </div>
            </article>

            <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    Monthly Progress
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Follow progression changes across the month.
                  </p>
                </div>
                <div className="rounded-2xl bg-indigo-50 p-3 text-indigo-600">
                  <InsightsOutlinedIcon fontSize="small" />
                </div>
              </div>
              <div className="h-80">
                <ProgressLineChart values={monthlyProgress} />
              </div>
            </article>
          </section>

          <section className="grid gap-6 xl:grid-cols-2">
            <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    Task Distribution
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Completed, pending and late tasks breakdown.
                  </p>
                </div>
                <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-600">
                  <DonutLargeOutlinedIcon fontSize="small" />
                </div>
              </div>
              <div className="h-80">
                <TasksDoughnutChart values={taskBreakdown} />
              </div>
            </article>

            <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    Core Skills Radar
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Main employee skills measured over the month.
                  </p>
                </div>
                <div className="rounded-2xl bg-violet-50 p-3 text-violet-600">
                  <RadarOutlinedIcon fontSize="small" />
                </div>
              </div>
              <div className="h-80">
                <SkillsRadarChart values={skillsData} />
              </div>
            </article>
          </section>

          <TasksTable rows={orderedTasks} />
          <ActivityPanels
            hrRequests={hrRequests}
            notifications={notifications}
            planning={planning}
            quickMessages={quickMessages}
          />
        </main>
      </div>
    </div>
  );
}
