import NotificationBell from "../../components/NotificationBell";
import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import Navbar from "../../components/Navbar";
import useDarkModePreference from "../../hooks/useDarkModePreference";
import usePersistentNavState from "../../hooks/usePersistentNavState";
import DashboardHeader from "../../components/dashboard/DashboardHeader";
import StatsCards from "../../components/dashboard/StatsCards";
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
    submittedCount: 0,
    revisionCount: 0,
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
        setDashboardData({
          ...emptyDashboard,
          ...data,
          profile: {
            ...emptyDashboard.profile,
            ...(data.profile || {}),
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
          <section>
            <ChefSummaryCard dark={dark} profile={dashboardData.profile} />
          </section>

          {/* Equipe du service — second card */}
          <article className={cardClass}>
            <div className="mb-6 flex items-center justify-between gap-4">
              <div>
                <h3 className={`text-lg font-bold ${dark ? "text-slate-50" : "text-slate-900"}`}>
                  Equipe du service
                </h3>
                <p className={`mt-1 text-sm ${dark ? "text-slate-400" : "text-slate-500"}`}>
                  Presence en ligne et pointage du jour pour chaque membre.
                </p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-bold ${dark ? "bg-blue-500/15 text-blue-300" : "bg-blue-50 text-blue-600"}`}>
                {dashboardData.team.length} membre{dashboardData.team.length !== 1 ? "s" : ""}
              </span>
            </div>

            {dashboardData.team.length === 0 ? (
              <div className={`rounded-2xl p-6 text-center text-sm ${dark ? "bg-slate-800 text-slate-400" : "bg-slate-50 text-slate-400"}`}>
                Aucun membre d'equipe a afficher.
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {dashboardData.team.map((member) => {
                  const initials = (() => {
                    const parts = (member.fullName || "").trim().split(/\s+/).filter(Boolean);
                    if (!parts.length) return "?";
                    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
                    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
                  })();
                  const attendanceBadge = member.checkedOutToday
                    ? { label: "Journee complete", cls: "badge-termine" }
                    : member.checkedInToday
                      ? { label: "En cours", cls: "badge-attente" }
                      : { label: "Absent", cls: "badge-refuse" };
                  return (
                    <div
                      key={member.id}
                      className={`relative flex flex-col gap-3 rounded-2xl p-4 transition hover:-translate-y-0.5 hover:shadow-md ${dark ? "bg-slate-800 border border-slate-700" : "bg-slate-50 border border-slate-100"}`}
                    >
                      {/* Online dot */}
                      <span
                        className={`absolute right-4 top-4 h-2.5 w-2.5 rounded-full ring-2 ${member.isOnline ? "bg-emerald-400 ring-emerald-100" : "bg-slate-300 ring-slate-100"} ${dark ? "ring-slate-800" : ""}`}
                        title={member.isOnline ? "En ligne" : "Hors ligne"}
                      />
                      {/* Avatar */}
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 text-sm font-extrabold text-white shadow-sm">
                        {initials}
                      </div>
                      {/* Info */}
                      <div className="min-w-0">
                        <p className={`truncate text-sm font-semibold ${dark ? "text-slate-100" : "text-slate-800"}`}>
                          {member.fullName}
                        </p>
                        <p className={`mt-0.5 truncate text-xs ${dark ? "text-slate-400" : "text-slate-500"}`}>
                          {member.employee_role || "—"}
                        </p>
                      </div>
                      {/* Attendance badge + times */}
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`badge ${attendanceBadge.cls}`}>
                          {attendanceBadge.label}
                        </span>
                        {member.checkInTime && (
                          <span className={`text-xs font-medium ${dark ? "text-slate-400" : "text-slate-500"}`}>
                            {member.checkInTime}{member.checkOutTime ? ` → ${member.checkOutTime}` : ""}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </article>

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

          <section>
            <article className={cardClass}>
              <div className="mb-6 flex items-center justify-between gap-4">
                <div>
                  <h3 className={`text-lg font-bold ${dark ? "text-slate-50" : "text-slate-900"}`}>
                    Historique de conge
                  </h3>
                  <p className={`mt-1 text-sm ${dark ? "text-slate-400" : "text-slate-500"}`}>
                    Toutes les demandes de l equipe sur la periode selectionnee.
                  </p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${dark ? "bg-slate-700 text-slate-300" : "bg-slate-100 text-slate-500"}`}>
                  {dashboardData.leaves.length} demande{dashboardData.leaves.length !== 1 ? "s" : ""}
                </span>
              </div>

              {dashboardData.leaves.length === 0 ? (
                <div className={`rounded-2xl p-6 text-center text-sm ${dark ? "bg-slate-800 text-slate-400" : "bg-slate-50 text-slate-400"}`}>
                  Aucune demande de conge sur cette periode.
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {dashboardData.leaves.map((leave) => {
                    const isAccepted = leave.status === "accepted" || leave.status === "ACCEPTED";
                    const isRefused  = leave.status === "refused"  || leave.status === "REFUSED";
                    const isPending  = !isAccepted && !isRefused;
                    const statusLabel = isAccepted ? "Validee" : isRefused ? "Refusee" : "En attente";
                    const rowBase = isAccepted
                      ? dark
                        ? "bg-emerald-900/30 border border-emerald-700/50"
                        : "bg-emerald-50 border border-emerald-200"
                      : isRefused
                        ? dark
                          ? "bg-rose-900/30 border border-rose-700/50"
                          : "bg-rose-50 border border-rose-200"
                        : dark
                          ? "bg-slate-800 border border-slate-700"
                          : "bg-slate-50 border border-slate-100";
                    return (
                      <div key={leave.id} className={`rounded-2xl p-4 transition hover:-translate-y-0.5 hover:shadow-md ${rowBase}`}>
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-sm font-semibold leading-snug ${dark ? "text-slate-100" : "text-slate-800"}`}>
                            {leave.employee}
                          </p>
                          {isAccepted ? (
                            <span className="flex-shrink-0 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-700 ring-1 ring-emerald-300">
                              ✓ {statusLabel}
                            </span>
                          ) : isRefused ? (
                            <span className="flex-shrink-0 rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-bold text-rose-700 ring-1 ring-rose-300">
                              ✗ {statusLabel}
                            </span>
                          ) : (
                            <span className="badge badge-attente flex-shrink-0">{statusLabel}</span>
                          )}
                        </div>
                        <p className={`mt-2 text-xs font-medium ${isAccepted ? (dark ? "text-emerald-300" : "text-emerald-700") : dark ? "text-slate-300" : "text-slate-600"}`}>
                          {leave.type}
                        </p>
                        <p className={`mt-1 text-xs ${dark ? "text-slate-400" : "text-slate-500"}`}>
                          {formatDate(leave.startDate)} → {formatDate(leave.endDate)}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
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
