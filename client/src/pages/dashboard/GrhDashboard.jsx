import NotificationBell from "../../components/NotificationBell";
import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import AdminPanelSettingsOutlinedIcon from "@mui/icons-material/AdminPanelSettingsOutlined";
import ApartmentOutlinedIcon from "@mui/icons-material/ApartmentOutlined";
import Navbar from "../../components/Navbar";
import useDarkModePreference from "../../hooks/useDarkModePreference";
import usePersistentNavState from "../../hooks/usePersistentNavState";
import DashboardHeader from "../../components/dashboard/DashboardHeader";
import StatsCards from "../../components/dashboard/StatsCards";
import PerformanceBarChart from "../../components/dashboard/PerformanceBarChart";

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
  header: { monthLabel: "", monthValue: "" },
  profile: {
    fullName: "",
    role: "GRH",
    department: "Direction RH",
    email: "",
    avatar: "",
    employeesCount: 0,
    onlineCount: 0,
    pendingLeaves: 0,
    documentsToValidate: 0,
  },
  stats: [],
  charts: {
    services: { labels: [], values: [] },
    leaves: { pending: 0, accepted: 0, refused: 0 },
  },
  employees: [],
  leaves: [],
  documents: [],
  formations: [],
  evaluations: [],
  notifications: [],
};

function getInitials(fullName) {
  const parts = (fullName || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "GR";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
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

export default function GrhDashboard() {
  const [dark, setDark] = useDarkModePreference();
  const [isNavOpen, setIsNavOpen] = usePersistentNavState();
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [dashboardData, setDashboardData] = useState(emptyDashboard);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setErrorMessage("");
        const response = await axios.get("/api/dashboard/rh/", {
          params: { month: selectedMonth },
        });
        setDashboardData({ ...emptyDashboard, ...(response.data || {}) });
      } catch (error) {
        console.error("Erreur chargement dashboard GRH:", error);
        setDashboardData(emptyDashboard);
        setErrorMessage("Impossible de charger le dashboard GRH.");
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

  const leaveValues = [
    dashboardData.charts.leaves.pending,
    dashboardData.charts.leaves.accepted,
    dashboardData.charts.leaves.refused,
  ];
  const leaveMax = Math.max(1, ...leaveValues);
  const serviceMax = Math.max(1, ...(dashboardData.charts.services.values || [0]));

  return (
    <div className={`profile-page${dark ? " dark" : ""} ${isNavOpen ? "nav-open" : "nav-closed"}`}>
      <div className={`navbar-profile-page ${isNavOpen ? "open" : "closed"}`}>
        <Navbar
          fullName={dashboardData.profile.fullName}
          post={dashboardData.profile.role}
          image={dashboardData.profile.avatar}
          email={dashboardData.profile.email}
        />
      </div>

      {isNavOpen && <div className="profile-overlay" onClick={() => setIsNavOpen(false)} aria-hidden="true" />}

      <div className="profile-content !h-auto min-h-screen bg-transparent">
        <div className={`sticky top-0 z-40 backdrop-blur ${stickyHeaderClass}`}>
          <div className="mx-auto flex w-[96%] flex-wrap items-center justify-between gap-4 py-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                Espace GRH
              </p>
              <h2 className={`text-xl font-bold ${dark ? "text-slate-50" : "text-slate-900"}`}>
                Direction RH et pilotage global
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
            eyebrow="Direction generale RH"
            title="Tableau de bord GRH"
            description="Pilotez les effectifs, les validations, les documents, les formations et les indicateurs globaux sur tout le perimetre RH."
            monthLabel={dashboardData.header.monthLabel}
            monthValue={dashboardData.header.monthValue || selectedMonth}
            monthOptions={monthOptions}
            onMonthChange={setSelectedMonth}
          />

          {errorMessage ? <div className="page-feedback error">{errorMessage}</div> : null}

          <StatsCards dark={dark} items={dashboardData.stats} />

          <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <article className={cardClass}>
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                {dashboardData.profile.avatar ? (
                  <img
                    alt={dashboardData.profile.fullName}
                    className="h-24 w-24 rounded-2xl object-cover shadow-md"
                    src={dashboardData.profile.avatar}
                  />
                ) : (
                  <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-600 to-indigo-700 text-2xl font-extrabold uppercase tracking-[0.12em] text-white shadow-md">
                    {getInitials(dashboardData.profile.fullName)}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <h2 className={`text-2xl font-bold ${dark ? "text-slate-50" : "text-slate-900"}`}>
                    {dashboardData.profile.fullName}
                  </h2>
                  <p className={`mt-1 text-sm font-medium ${dark ? "text-slate-300" : "text-slate-500"}`}>
                    {dashboardData.profile.role} • {dashboardData.profile.department}
                  </p>
                  <p className="mt-1 text-sm text-slate-400">{dashboardData.profile.email}</p>
                </div>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <div className={innerClass}>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Effectif total</p>
                  <p className={`mt-3 text-2xl font-bold ${dark ? "text-slate-50" : "text-slate-900"}`}>
                    {dashboardData.profile.employeesCount ?? 0}
                  </p>
                </div>
                <div className={innerClass}>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Connectes</p>
                  <p className={`mt-3 text-2xl font-bold ${dark ? "text-slate-50" : "text-slate-900"}`}>
                    {dashboardData.profile.onlineCount ?? 0}
                  </p>
                </div>
                <div className={innerClass}>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Conges finaux</p>
                  <p className={`mt-3 text-2xl font-bold ${dark ? "text-slate-50" : "text-slate-900"}`}>
                    {dashboardData.profile.pendingLeaves ?? 0}
                  </p>
                </div>
                <div className={innerClass}>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Docs a arbitrer</p>
                  <p className={`mt-3 text-2xl font-bold ${dark ? "text-slate-50" : "text-slate-900"}`}>
                    {dashboardData.profile.documentsToValidate ?? 0}
                  </p>
                </div>
              </div>
            </article>

            <article className={cardClass}>
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <h3 className={`text-lg font-bold ${dark ? "text-slate-50" : "text-slate-900"}`}>
                    Pilotage global
                  </h3>
                  <p className={`mt-1 text-sm ${dark ? "text-slate-300" : "text-slate-500"}`}>
                    Priorites decisionnelles sur la periode selectionnee.
                  </p>
                </div>
                <div className="rounded-2xl bg-blue-50 p-3 text-blue-600">
                  <AdminPanelSettingsOutlinedIcon fontSize="small" />
                </div>
              </div>

              <div className="space-y-4">
                <div className={innerClass}>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Formations a cadrer</p>
                  <p className={`mt-2 text-2xl font-bold ${dark ? "text-slate-50" : "text-slate-900"}`}>
                    {dashboardData.formations.length}
                  </p>
                </div>
                <div className={innerClass}>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Evaluations periode</p>
                  <p className={`mt-2 text-2xl font-bold ${dark ? "text-slate-50" : "text-slate-900"}`}>
                    {dashboardData.evaluations.length}
                  </p>
                </div>
                <div className={innerClass}>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Notifications non lues</p>
                  <p className={`mt-2 text-2xl font-bold ${dark ? "text-slate-50" : "text-slate-900"}`}>
                    {dashboardData.notifications.filter((item) => !item.isRead).length}
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
                    Repartition des effectifs
                  </h3>
                  <p className={`mt-1 text-sm ${dark ? "text-slate-300" : "text-slate-500"}`}>
                    Vision transversale de la population par service.
                  </p>
                </div>
                <div className="rounded-2xl bg-cyan-50 p-3 text-cyan-600">
                  <ApartmentOutlinedIcon fontSize="small" />
                </div>
              </div>
              <div className="h-80">
                <PerformanceBarChart
                  values={dashboardData.charts.services.values}
                  labels={dashboardData.charts.services.labels}
                  datasetLabel="Effectif global"
                  max={serviceMax}
                  colors={["#38bdf8", "#60a5fa", "#34d399", "#818cf8", "#f59e0b", "#f472b6"]}
                  dark={dark}
                />
              </div>
            </article>

            <article className={cardClass}>
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <h3 className={`text-lg font-bold ${dark ? "text-slate-50" : "text-slate-900"}`}>
                    Circuit final des conges
                  </h3>
                  <p className={`mt-1 text-sm ${dark ? "text-slate-300" : "text-slate-500"}`}>
                    Decisions finales et arbitrages GRH.
                  </p>
                </div>
                <div className="rounded-2xl bg-indigo-50 p-3 text-indigo-600">
                  <AdminPanelSettingsOutlinedIcon fontSize="small" />
                </div>
              </div>
              <div className="h-80">
                <PerformanceBarChart
                  values={leaveValues}
                  labels={["En attente", "Acceptees", "Refusees"]}
                  datasetLabel="Conge final"
                  max={leaveMax}
                  colors={["#f59e0b", "#22c55e", "#f87171"]}
                  dark={dark}
                />
              </div>
            </article>
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <article className={cardClass}>
              <div className="mb-5">
                <h3 className={`text-lg font-bold ${dark ? "text-slate-50" : "text-slate-900"}`}>
                  Dernieres fiches employees
                </h3>
                <p className={`mt-1 text-sm ${dark ? "text-slate-300" : "text-slate-500"}`}>
                  Recrutements et fiches les plus recentes sur le perimetre global.
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full border-separate border-spacing-y-3">
                  <thead>
                    <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                      <th className="px-3">Employe</th>
                      <th className="px-3">Service</th>
                      <th className="px-3">Rôle</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboardData.employees.map((employee) => (
                      <tr key={employee.id} className={dark ? "rounded-2xl bg-slate-800" : "rounded-2xl bg-slate-50"}>
                        <td className={`rounded-l-2xl px-3 py-4 text-sm font-semibold ${dark ? "text-slate-100" : "text-slate-800"}`}>
                          <div>{employee.fullName}</div>
                          <div className={`mt-1 text-xs ${dark ? "text-slate-400" : "text-slate-500"}`}>{employee.email}</div>
                        </td>
                        <td className={`px-3 py-4 text-sm ${dark ? "text-slate-300" : "text-slate-600"}`}>
                          {employee.service}
                        </td>
                        <td className={`rounded-r-2xl px-3 py-4 text-sm ${dark ? "text-slate-300" : "text-slate-600"}`}>
                          {employee.employee_role || employee.role || "-"}
                        </td>
                      </tr>
                    ))}
                    {!dashboardData.employees.length && (
                      <tr>
                        <td colSpan="3" className={`px-3 py-4 text-sm ${dark ? "text-slate-300" : "text-slate-500"}`}>
                          Aucune fiche employee a afficher.
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
                  Notifications de gouvernance
                </h3>
                <p className={`mt-1 text-sm ${dark ? "text-slate-300" : "text-slate-500"}`}>
                  Evenements recents a traiter au niveau GRH.
                </p>
              </div>
              <div className="space-y-3">
                {dashboardData.notifications.map((item) => (
                  <div key={item.id} className={innerClass}>
                    <div className="flex items-center justify-between gap-3">
                      <p className={`font-semibold ${dark ? "text-slate-100" : "text-slate-800"}`}>{item.title}</p>
                      <span className={`badge ${item.isRead ? "badge-genere" : "badge-attente"}`}>
                        {item.isRead ? "Deja traitee" : "Non lue"}
                      </span>
                    </div>
                    <p className={`mt-2 text-sm ${dark ? "text-slate-300" : "text-slate-500"}`}>{item.message}</p>
                    <p className="mt-2 text-xs text-slate-400">{formatDateTime(item.createdAt)}</p>
                  </div>
                ))}
                {!dashboardData.notifications.length && (
                  <div className={innerClass}>
                    <p className={dark ? "text-slate-300" : "text-slate-500"}>
                      Aucune notification recente sur cette periode.
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
