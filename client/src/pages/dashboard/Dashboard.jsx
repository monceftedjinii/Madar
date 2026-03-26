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
import {
  employeeInfo,
  hrRequests as mockHrRequests,
  monthlyProgress as mockMonthlyProgress,
  monthlyScoreInsights,
  notifications as mockNotifications,
  planning as mockPlanning,
  quickMessages as mockQuickMessages,
  skillsData as mockSkillsData,
  tasks as mockTasks,
  weeklyPerformance as mockWeeklyPerformance,
} from "../../data/dashboardMock";

const statusOrder = {
  Terminée: 0,
  "En cours": 1,
  "En attente": 2,
  "En retard": 3,
};

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function formatMonthLabel(date = new Date()) {
  return date.toLocaleDateString("fr-FR", {
    month: "long",
    year: "numeric",
  });
}

function getTaskPriority(dueDate) {
  if (!dueDate) return "Moyenne";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(`${dueDate}T00:00:00`);
  const diffDays = Math.ceil(
    (due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diffDays <= 1) return "Haute";
  if (diffDays <= 4) return "Moyenne";
  return "Basse";
}

function mapTaskStatus(task) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDate = task?.due_date ? new Date(`${task.due_date}T00:00:00`) : null;

  if (task.status === "DONE") return "Terminée";
  if (dueDate && dueDate < today) return "En retard";
  if (dueDate) {
    const diffDays = Math.ceil(
      (dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    );
    if (diffDays <= 2) return "En cours";
  }
  return "En attente";
}

function getTaskProgress(task, statusLabel) {
  if (statusLabel === "Terminée") return 100;
  if (statusLabel === "En retard") return 80;
  if (statusLabel === "En cours") return 65;
  return task.due_date ? 35 : 20;
}

function buildWeeklyPerformance(tasks, attendanceRate) {
  const completedTasks = tasks.filter((task) => task.status === "Terminée").length;
  const totalTasks = tasks.length || 1;
  const completionRate = Math.round((completedTasks / totalTasks) * 100);
  const base = Math.round((attendanceRate + completionRate) / 2);

  return [base - 8, base - 2, base + 3, base + 7].map((value) =>
    clamp(value, 35, 100),
  );
}

function buildMonthlyProgress(weeklyValues) {
  const first = Math.max(18, weeklyValues[0] - 20);
  return [
    first,
    weeklyValues[0] - 8,
    weeklyValues[0],
    weeklyValues[1] - 4,
    weeklyValues[1],
    weeklyValues[2] - 3,
    weeklyValues[2],
    weeklyValues[3],
  ].map((value) => clamp(value, 15, 100));
}

export default function Dashboard() {
  const [dark, setDark] = useDarkModePreference();
  const [isNavOpen, setIsNavOpen] = useState(true);
  const [searchValue, setSearchValue] = useState("");
  const [dashboardData, setDashboardData] = useState({
    profile: null,
    tasks: [],
    attendance: [],
    notifications: [],
    leaves: [],
    inboxMessages: [],
    announcements: [],
  });

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [
          profileRes,
          tasksRes,
          attendanceRes,
          notificationsRes,
          leavesRes,
          inboxRes,
          announcementsRes,
        ] = await Promise.all([
          axios.get("/api/whoami/"),
          axios.get("/api/tasks/me/"),
          axios.get("/api/attendance/me/"),
          axios.get("/api/notifications/"),
          axios.get("/api/leaves/me/"),
          axios.get("/api/messages/inbox/"),
          axios.get("/api/announcements/"),
        ]);

        setDashboardData({
          profile: profileRes.data,
          tasks: Array.isArray(tasksRes.data) ? tasksRes.data : [],
          attendance: Array.isArray(attendanceRes.data) ? attendanceRes.data : [],
          notifications: Array.isArray(notificationsRes.data)
            ? notificationsRes.data
            : [],
          leaves: Array.isArray(leavesRes.data) ? leavesRes.data : [],
          inboxMessages: inboxRes.data?.messages || [],
          announcements: announcementsRes.data?.announcements || [],
        });
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      }
    };

    fetchDashboardData();
  }, []);

  const employee = useMemo(() => {
    const profile = dashboardData.profile;
    if (!profile) {
      const finalScore = employeeInfo.finalScore;
      const statusLabel =
        finalScore >= 16
          ? "Excellent"
          : finalScore >= 12
            ? "Bon"
            : finalScore >= 8
              ? "Moyen"
              : "À améliorer";

      return {
        ...employeeInfo,
        statusLabel,
      };
    }

    const fullName = `${profile.first_name || ""} ${profile.last_name || ""}`.trim();
    const attendanceTotal = dashboardData.attendance.length;
    const attendanceCompleted = dashboardData.attendance.filter(
      (item) => item.check_in_time && item.check_out_time,
    ).length;
    const attendanceRate = attendanceTotal
      ? Math.round((attendanceCompleted / attendanceTotal) * 100)
      : 0;

    const mappedTasks = dashboardData.tasks.map((task) => ({
      ...task,
      mappedStatus: mapTaskStatus(task),
    }));
    const completedTasks = mappedTasks.filter(
      (task) => task.mappedStatus === "Terminée",
    ).length;
    const overallProgress = mappedTasks.length
      ? Math.round((completedTasks / mappedTasks.length) * 100)
      : 0;

    const unreadNotifications = dashboardData.notifications.filter(
      (item) => !item.is_read,
    ).length;
    const lateTasks = mappedTasks.filter(
      (task) => task.mappedStatus === "En retard",
    ).length;
    const rawScore =
      8 +
      attendanceRate * 0.05 +
      overallProgress * 0.06 -
      lateTasks * 0.7 -
      unreadNotifications * 0.15;
    const finalScore = Number(clamp(rawScore, 6, 20).toFixed(1));

    const statusLabel =
      finalScore >= 16
        ? "Excellent"
        : finalScore >= 12
          ? "Bon"
          : finalScore >= 8
            ? "Moyen"
            : "À améliorer";

    return {
      fullName: fullName || profile.email,
      role: profile.position || "Employé",
      department: profile.service || "Non renseigné",
      email: profile.email,
      avatar:
        profile.profile_picture ||
        "https://cdn-icons-png.flaticon.com/512/149/149071.png",
      attendanceRate,
      overallProgress,
      finalScore,
      topSkill:
        attendanceRate >= 90
          ? "Ponctualité"
          : overallProgress >= 70
            ? "Productivité"
            : "Rigueur",
      statusLabel,
    };
  }, [dashboardData]);

  const allTasks = useMemo(() => {
    if (!dashboardData.tasks.length) return mockTasks;

    return dashboardData.tasks.map((task) => {
      const status = mapTaskStatus(task);
      return {
        id: task.id,
        name: task.title,
        priority: getTaskPriority(task.due_date),
        deadline: task.due_date || "-",
        status,
        progress: getTaskProgress(task, status),
      };
    });
  }, [dashboardData.tasks]);

  const filteredTasks = useMemo(() => {
    const search = searchValue.trim().toLowerCase();
    if (!search) return allTasks;
    return allTasks.filter(
      (task) =>
        task.name.toLowerCase().includes(search) ||
        task.priority.toLowerCase().includes(search) ||
        task.status.toLowerCase().includes(search),
    );
  }, [allTasks, searchValue]);

  const orderedTasks = useMemo(
    () =>
      [...filteredTasks].sort(
        (left, right) => statusOrder[left.status] - statusOrder[right.status],
      ),
    [filteredTasks],
  );

  const weeklyPerformance = useMemo(() => {
    if (!dashboardData.profile) return mockWeeklyPerformance;
    return buildWeeklyPerformance(allTasks, employee.attendanceRate);
  }, [allTasks, dashboardData.profile, employee.attendanceRate]);

  const monthlyProgress = useMemo(() => {
    if (!dashboardData.profile) return mockMonthlyProgress;
    return buildMonthlyProgress(weeklyPerformance);
  }, [dashboardData.profile, weeklyPerformance]);

  const taskBreakdown = useMemo(() => {
    const source = dashboardData.profile ? allTasks : mockTasks;
    return {
      completed: source.filter((task) => task.status === "Terminée").length,
      pending: source.filter(
        (task) => task.status === "En attente" || task.status === "En cours",
      ).length,
      late: source.filter((task) => task.status === "En retard").length,
    };
  }, [allTasks, dashboardData.profile]);

  const skillsData = useMemo(() => {
    if (!dashboardData.profile) return mockSkillsData;

    const completed = allTasks.filter((task) => task.status === "Terminée").length;
    const late = allTasks.filter((task) => task.status === "En retard").length;

    return {
      punctuality: clamp(Math.round(employee.attendanceRate / 5), 6, 20),
      productivity: clamp(Math.round(employee.overallProgress / 5), 6, 20),
      teamwork: clamp(
        15 - late + Math.min(dashboardData.inboxMessages.length, 4),
        6,
        20,
      ),
      discipline: clamp(
        14 - late + Math.round(employee.attendanceRate / 20),
        6,
        20,
      ),
      qualityOfWork: clamp(12 + completed, 6, 20),
    };
  }, [
    allTasks,
    dashboardData.inboxMessages.length,
    dashboardData.profile,
    employee.attendanceRate,
    employee.overallProgress,
  ]);

  const stats = useMemo(() => {
    const completed = allTasks.filter((task) => task.status === "Terminée").length;
    const pending = allTasks.filter(
      (task) => task.status === "En attente" || task.status === "En cours",
    ).length;
    const late = allTasks.filter((task) => task.status === "En retard").length;
    const monthlyPerformance = Math.round(
      weeklyPerformance.reduce((sum, value) => sum + value, 0) /
        weeklyPerformance.length,
    );

    return [
      {
        id: "total",
        label: "Total des tâches",
        value: allTasks.length,
        helper: "Toutes les tâches assignées",
      },
      {
        id: "completed",
        label: "Tâches terminées",
        value: completed,
        helper: "Tâches finalisées",
      },
      {
        id: "pending",
        label: "Tâches en attente",
        value: pending,
        helper: "En cours ou à démarrer",
      },
      {
        id: "late",
        label: "Tâches en retard",
        value: late,
        helper: "Délais dépassés",
      },
      {
        id: "attendance",
        label: "Taux de présence",
        value: `${employee.attendanceRate}%`,
        helper: "Présence personnelle",
      },
      {
        id: "performance",
        label: "Performance mensuelle",
        value: `${monthlyPerformance}%`,
        helper: "Performance du mois",
      },
      {
        id: "score",
        label: "Note mensuelle",
        value: `${employee.finalScore.toFixed(1)}/20`,
        helper: "Score estimé actuel",
      },
    ];
  }, [allTasks, employee.attendanceRate, employee.finalScore, weeklyPerformance]);

  const planning = useMemo(() => {
    if (!dashboardData.profile) return mockPlanning;

    const attendanceToday = dashboardData.attendance.find(
      (item) => item.date === new Date().toISOString().slice(0, 10),
    );
    const nextTasks = allTasks
      .filter((task) => task.deadline && task.deadline !== "-")
      .slice(0, 3)
      .map((task) => ({
        id: `task-${task.id}`,
        time: task.deadline,
        title: task.name,
        subtitle: `Priorité ${task.priority.toLowerCase()}`,
      }));

    const attendanceCard = {
      id: "attendance",
      time: attendanceToday?.check_in_time?.slice(0, 5) || "08:30",
      title: attendanceToday?.check_out_time
        ? "Présence enregistrée aujourd'hui"
        : "Pointage du jour",
      subtitle: attendanceToday?.check_out_time
        ? `Entrée ${attendanceToday.check_in_time?.slice(0, 5)} • Sortie ${attendanceToday.check_out_time.slice(0, 5)}`
        : "Pensez à valider votre présence",
    };

    return [attendanceCard, ...nextTasks].slice(0, 3);
  }, [allTasks, dashboardData.attendance, dashboardData.profile]);

  const notifications = useMemo(() => {
    if (!dashboardData.profile) return mockNotifications;

    const directNotifications = dashboardData.notifications.slice(0, 2).map((item) => ({
      id: `notif-${item.id}`,
      title: item.title,
      message: item.message,
      level: item.is_read ? "info" : "important",
    }));

    const announcements = dashboardData.announcements.slice(0, 1).map((item) => ({
      id: `ann-${item.id}`,
      title: item.title,
      message: item.message,
      level: "info",
    }));

    return [...directNotifications, ...announcements];
  }, [dashboardData.announcements, dashboardData.notifications, dashboardData.profile]);

  const hrRequests = useMemo(() => {
    if (!dashboardData.profile) return mockHrRequests;

    return dashboardData.leaves.slice(0, 3).map((item) => ({
      id: item.id,
      label: item.type_label || item.type,
      status:
        item.status === "PENDING"
          ? "En attente"
          : item.status === "ACCEPTED"
            ? "Accepté"
            : "Refusé",
    }));
  }, [dashboardData.leaves, dashboardData.profile]);

  const quickMessages = useMemo(() => {
    if (!dashboardData.profile) return mockQuickMessages;

    return dashboardData.inboxMessages.slice(0, 3).map((item) => ({
      id: item.id,
      sender: item.sender?.name || item.sender?.email || "Interne",
      subject: item.subject,
    }));
  }, [dashboardData.inboxMessages, dashboardData.profile]);

  const scoreInsights = useMemo(() => {
    const achievement =
      employee.attendanceRate >= 90
        ? "Présence régulière et implication stable tout au long du mois."
        : monthlyScoreInsights.achievement;

    const lateTasks = allTasks.filter((task) => task.status === "En retard").length;
    const improvement =
      lateTasks > 0
        ? "Réduire les tâches en retard pour améliorer la note mensuelle."
        : "Maintenir le rythme actuel et clôturer plus vite les tâches en attente.";

    return { achievement, improvement };
  }, [allTasks, employee.attendanceRate]);

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
            department={employee.department}
            monthLabel={formatMonthLabel()}
            searchValue={searchValue}
            onSearchChange={setSearchValue}
          />
          <StatsCards items={stats} />

          <section className="grid gap-6 2xl:grid-cols-[1.15fr_0.85fr]">
            <EmployeeSummaryCard employee={employee} />
            <MonthlyScoreCard
              achievement={scoreInsights.achievement}
              improvement={scoreInsights.improvement}
              score={employee.finalScore}
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
                <PerformanceBarChart values={weeklyPerformance} />
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
                <ProgressLineChart values={monthlyProgress} />
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
                <TasksDoughnutChart values={taskBreakdown} />
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
