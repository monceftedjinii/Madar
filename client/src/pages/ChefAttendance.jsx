import NotificationBell from "../components/NotificationBell";
import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import Navbar from "../components/Navbar";
import useDarkModePreference from "../hooks/useDarkModePreference";
import usePersistentNavState from "../hooks/usePersistentNavState";
import "../styles/profile.css";

function formatTime(value) {
  if (!value) return "--:--";
  return value.slice(0, 5);
}

function formatDate(value) {
  if (!value) return "-";
  const d = new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

function getInitials(name = "") {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export default function ChefAttendance() {
  const [dark, setDark] = useDarkModePreference();
  const [isNavOpen, setIsNavOpen] = usePersistentNavState();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [search, setSearch] = useState("");
  const [detailEmployee, setDetailEmployee] = useState(null);
  const [detailData, setDetailData] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailFromDate, setDetailFromDate] = useState("");
  const [detailToDate, setDetailToDate] = useState("");
  const [detailStatusFilter, setDetailStatusFilter] = useState("all");

  const fetchAttendance = async () => {
    try {
      setLoading(true);
      setErrorMessage("");
      const response = await axios.get("/api/attendance/team/");
      setRows(Array.isArray(response.data) ? response.data : []);
    } catch {
      setRows([]);
      setErrorMessage("Impossible de charger le suivi de présence de l'équipe.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAttendance(); }, []);

  const openDetail = async (row) => {
    setDetailEmployee(row);
    setDetailData(null);
    setDetailFromDate("");
    setDetailToDate("");
    setDetailStatusFilter("all");
    setDetailLoading(true);
    try {
      const res = await axios.get(`/api/attendance/team/${row.id}/`);
      setDetailData(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setDetailLoading(false);
    }
  };

  const stats = useMemo(() => {
    const total = rows.length;
    const complete = rows.filter((r) => r.today_check_in && r.today_check_out).length;
    const inProgress = rows.filter((r) => r.today_check_in && !r.today_check_out).length;
    const absent = rows.filter((r) => !r.today_check_in).length;
    const unjustified = rows.reduce((sum, r) => sum + (r.unjustified_absences || 0), 0);
    return { total, complete, inProgress, absent, unjustified };
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      (r.full_name || "").toLowerCase().includes(q) ||
      (r.email || "").toLowerCase().includes(q)
    );
  }, [rows, search]);

  const card = dark
    ? "rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-sm"
    : "rounded-2xl border border-slate-200 bg-white p-6 shadow-sm";

  const stickyHeader = dark
    ? "border-b border-slate-800 bg-slate-950/90"
    : "border-b border-slate-200/80 bg-white/90";

  const btnClass = dark
    ? "border border-slate-700 bg-slate-900 text-slate-100"
    : "border border-slate-200 bg-white text-slate-700";

  const statCards = [
    { label: "Équipe", value: stats.total, light: "bg-blue-50 text-blue-600", dark_: "bg-blue-500/15 text-blue-300" },
    { label: "Journée complète", value: stats.complete, light: "bg-emerald-50 text-emerald-600", dark_: "bg-emerald-500/15 text-emerald-300" },
    { label: "En cours", value: stats.inProgress, light: "bg-amber-50 text-amber-600", dark_: "bg-amber-500/15 text-amberald-300" },
    { label: "Absents", value: stats.absent, light: "bg-rose-50 text-rose-600", dark_: "bg-rose-500/15 text-rose-300" },
    { label: "Non justifiées", value: stats.unjustified, light: stats.unjustified > 0 ? "bg-rose-50 text-rose-600" : "bg-slate-50 text-slate-500", dark_: stats.unjustified > 0 ? "bg-rose-500/15 text-rose-300" : "bg-slate-700 text-slate-400" },
  ];

  return (
    <div className={`profile-page${dark ? " dark" : ""} ${isNavOpen ? "nav-open" : "nav-closed"}`}>
      <div className={`navbar-profile-page ${isNavOpen ? "open" : "closed"}`}>
        <Navbar />
      </div>

      {isNavOpen && (
        <div className="profile-overlay" onClick={() => setIsNavOpen(false)} aria-hidden="true" />
      )}

      <div className="profile-content !h-auto min-h-screen bg-transparent">
        {/* Sticky header */}
        <div className={`sticky top-0 z-40 backdrop-blur ${stickyHeader}`}>
          <div className="mx-auto flex w-[96%] flex-wrap items-center justify-between gap-4 py-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">Espace chef</p>
              <h2 className={`text-xl font-bold ${dark ? "text-slate-50" : "text-slate-900"}`}>Présence équipe</h2>
            </div>
            <div className="flex flex-wrap gap-3">
              <button className={`rounded-2xl px-4 py-2 text-sm font-semibold shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${btnClass}`}
                onClick={() => setIsNavOpen((p) => !p)} type="button">
                {isNavOpen ? "Masquer menu" : "Afficher menu"}
              </button>
              <button className={`rounded-2xl px-4 py-2 text-sm font-semibold shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${btnClass}`}
                onClick={() => setDark((p) => !p)} type="button">
                {dark ? "Mode clair" : "Mode sombre"}
              </button>
              <NotificationBell dark={dark} />
            </div>
          </div>
        </div>

        <main className="mx-auto w-[96%] space-y-6 py-6">
          {/* Stat cards */}
          <div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-5">
            {statCards.map(({ label, value, light, dark_ }) => (
              <article key={label} className={card}>
                <p className={`text-xs font-semibold uppercase tracking-wider ${dark ? "text-slate-400" : "text-slate-500"}`}>{label}</p>
                <p className={`mt-2 text-3xl font-black ${dark ? "text-slate-50" : "text-slate-900"}`}>{value}</p>
                <span className={`mt-3 inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${dark ? dark_ : light}`}>
                  Aujourd'hui
                </span>
              </article>
            ))}
          </div>

          {errorMessage && (
            <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 ring-1 ring-rose-200">
              {errorMessage}
            </div>
          )}

          {/* Employee list */}
          <article className={card}>
            <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className={`text-lg font-bold ${dark ? "text-slate-50" : "text-slate-900"}`}>
                  Suivi de présence
                </h3>
                <p className={`mt-1 text-sm ${dark ? "text-slate-400" : "text-slate-500"}`}>
                  {filtered.length} membre{filtered.length !== 1 ? "s" : ""} affiché{filtered.length !== 1 ? "s" : ""}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className={`flex items-center gap-2 rounded-2xl border px-4 py-2.5 ${dark ? "border-slate-700 bg-slate-800" : "border-slate-200 bg-slate-50"}`}>
                  <svg className="h-4 w-4 flex-shrink-0 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
                  </svg>
                  <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                    placeholder="Rechercher un employé..."
                    className={`w-44 bg-transparent text-sm outline-none ${dark ? "text-slate-100 placeholder:text-slate-500" : "text-slate-800 placeholder:text-slate-400"}`} />
                  {search && (
                    <button type="button" onClick={() => setSearch("")} className="text-slate-400 hover:text-slate-600">✕</button>
                  )}
                </div>
                <button type="button" onClick={fetchAttendance}
                  className={`rounded-2xl px-4 py-2.5 text-sm font-semibold shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${btnClass}`}>
                  Actualiser
                </button>
              </div>
            </div>

            {loading ? (
              <div className={`rounded-2xl p-8 text-center text-sm ${dark ? "bg-slate-800 text-slate-400" : "bg-slate-50 text-slate-400"}`}>
                Chargement de la présence équipe...
              </div>
            ) : filtered.length === 0 ? (
              <div className={`rounded-2xl p-8 text-center text-sm ${dark ? "bg-slate-800 text-slate-400" : "bg-slate-50 text-slate-400"}`}>
                {search ? `Aucun résultat pour "${search}".` : "Aucune donnée de présence disponible."}
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filtered.map((row) => {
                  const isComplete = row.today_check_in && row.today_check_out;
                  const isInProgress = row.today_check_in && !row.today_check_out;
                  const statusLabel = isComplete ? "Journée complète" : isInProgress ? "En cours" : "Absent";
                  const statusCls = isComplete
                    ? dark ? "bg-emerald-500/15 text-emerald-300" : "bg-emerald-50 text-emerald-700"
                    : isInProgress
                      ? dark ? "bg-amber-500/15 text-amber-300" : "bg-amber-50 text-amber-700"
                      : dark ? "bg-rose-500/15 text-rose-300" : "bg-rose-50 text-rose-700";

                  return (
                    <button key={row.id} type="button" onClick={() => openDetail(row)}
                      className={`group relative flex flex-col items-start gap-3 rounded-2xl p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md ${dark ? "border border-slate-700 bg-slate-800 hover:border-slate-600" : "border border-slate-100 bg-slate-50 hover:border-slate-200 hover:bg-white"}`}>

                      <div className="flex w-full items-start justify-between gap-2">
                        {/* Avatar */}
                        <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 text-sm font-extrabold text-white shadow-sm">
                          {getInitials(row.full_name)}
                        </div>
                        {/* Unjustified badge */}
                        {row.unjustified_absences > 0 && (
                          <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-bold text-rose-700 ring-1 ring-rose-200">
                            {row.unjustified_absences} inj.
                          </span>
                        )}
                      </div>

                      <div className="min-w-0 w-full">
                        <p className={`truncate text-sm font-semibold ${dark ? "text-slate-100" : "text-slate-800"}`}>{row.full_name}</p>
                        <p className={`mt-0.5 truncate text-xs ${dark ? "text-slate-400" : "text-slate-500"}`}>{row.email}</p>
                      </div>

                      {/* Times */}
                      <div className="flex items-center gap-3 text-xs">
                        <span className={`font-semibold ${row.today_check_in ? (dark ? "text-emerald-400" : "text-emerald-600") : "text-slate-400"}`}>
                          ↑ {formatTime(row.today_check_in)}
                        </span>
                        <span className={dark ? "text-slate-400" : "text-slate-400"}>
                          ↓ {formatTime(row.today_check_out)}
                        </span>
                      </div>

                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${statusCls}`}>
                        {statusLabel}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </article>
        </main>
      </div>

      {/* Detail Modal */}
      {detailEmployee && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center bg-slate-950/60 px-4 py-6 backdrop-blur-sm"
          onClick={() => setDetailEmployee(null)}>
          <div className={`flex w-full max-w-3xl flex-col rounded-3xl border shadow-2xl ${dark ? "border-slate-800 bg-slate-900" : "border-slate-200 bg-white"}`}
            style={{ maxHeight: "90vh" }} onClick={(e) => e.stopPropagation()}>

            {/* Modal header */}
            <div className={`flex items-center justify-between gap-4 px-6 py-5 border-b ${dark ? "border-slate-800" : "border-slate-100"}`}>
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 text-sm font-extrabold text-white shadow-md">
                  {getInitials(detailEmployee.full_name)}
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Détails de présence</p>
                  <h2 className={`text-xl font-black ${dark ? "text-slate-50" : "text-slate-900"}`}>{detailEmployee.full_name}</h2>
                  <p className="text-xs text-slate-400">{detailEmployee.email}</p>
                </div>
              </div>
              <button type="button" onClick={() => setDetailEmployee(null)}
                className={`rounded-2xl px-4 py-2 text-sm font-semibold ${dark ? "bg-slate-800 text-slate-300 hover:bg-slate-700" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                Fermer
              </button>
            </div>

            {/* Filters */}
            <div className={`flex flex-wrap items-center gap-3 px-6 py-4 border-b ${dark ? "border-slate-800" : "border-slate-100"}`}>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-400">Du</span>
                <input type="date" value={detailFromDate} onChange={(e) => setDetailFromDate(e.target.value)}
                  className={`rounded-xl border px-3 py-2 text-sm outline-none ${dark ? "border-slate-700 bg-slate-800 text-slate-100" : "border-slate-200 bg-slate-50 text-slate-800"}`} />
                <span className="text-xs font-semibold text-slate-400">Au</span>
                <input type="date" value={detailToDate} onChange={(e) => setDetailToDate(e.target.value)}
                  className={`rounded-xl border px-3 py-2 text-sm outline-none ${dark ? "border-slate-700 bg-slate-800 text-slate-100" : "border-slate-200 bg-slate-50 text-slate-800"}`} />
                {(detailFromDate || detailToDate) && (
                  <button type="button" onClick={() => { setDetailFromDate(""); setDetailToDate(""); }}
                    className={`rounded-xl px-3 py-2 text-xs font-semibold ${dark ? "bg-slate-700 text-slate-300" : "bg-slate-100 text-slate-600"}`}>✕</button>
                )}
              </div>
              <div className="flex gap-2">
                {["all", "Complet", "Entrée seule", "Absent"].map((s) => (
                  <button key={s} type="button" onClick={() => setDetailStatusFilter(s)}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${detailStatusFilter === s ? "bg-blue-600 text-white" : dark ? "bg-slate-800 text-slate-300 hover:bg-slate-700" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                    {s === "all" ? "Tous" : s}
                  </button>
                ))}
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto">
              {detailLoading ? (
                <div className="p-10 text-center text-sm text-slate-400">Chargement...</div>
              ) : detailData ? (() => {
                // Sort newest first; weekends only show in "Tous", hidden when a status filter is active
                const days = [...detailData.days]
                  .sort((a, b) => b.date.localeCompare(a.date))
                  .filter((day) => {
                    if (day.is_weekend) return detailStatusFilter === "all"; // weekends only in "Tous"
                    if (detailStatusFilter !== "all" && day.status !== detailStatusFilter) return false;
                    if (detailFromDate && day.date < detailFromDate) return false;
                    if (detailToDate && day.date > detailToDate) return false;
                    return true;
                  });

                if (days.length === 0) return <div className="p-10 text-center text-sm text-slate-400">Aucun enregistrement correspondant.</div>;

                return (
                  <table className="w-full border-separate border-spacing-0 text-sm">
                    <thead>
                      <tr className={dark ? "bg-slate-950" : "bg-slate-50"}>
                        {["Date", "Entrée", "Sortie", "Statut"].map((h) => (
                          <th key={h} className={`px-5 py-3 text-left text-xs font-bold uppercase tracking-widest ${dark ? "text-slate-400 border-b border-slate-800" : "text-slate-400 border-b border-slate-100"}`}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {days.map((day) => {
                        const isWeekend = day.is_weekend;
                        const isJustified = day.justification_status === "Justifié" || day.raw_justif_status === "JUSTIFIE";
                        const rowBg = isWeekend
                          ? dark ? "bg-slate-800/40" : "bg-slate-50/80"
                          : "";

                        let statusBadge;
                        if (isWeekend) {
                          statusBadge = (
                            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-500">Weekend</span>
                          );
                        } else if (day.status === "Complet") {
                          statusBadge = <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-700">Complet</span>;
                        } else if (day.status === "Absent") {
                          statusBadge = isJustified ? (
                            <span className="flex items-center gap-1.5">
                              <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-bold text-rose-700">Absent</span>
                              <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-blue-700">Justifié</span>
                            </span>
                          ) : (
                            <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-bold text-rose-700">Absent · Non justifié</span>
                          );
                        } else {
                          statusBadge = <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-700">{day.status}</span>;
                        }

                        return (
                          <tr key={day.date} className={`${rowBg} ${dark ? "border-b border-slate-800 hover:bg-slate-800/50" : "border-b border-slate-50 hover:bg-slate-50"}`}>
                            <td className={`px-5 py-3.5 text-sm font-semibold ${isWeekend ? "text-slate-400" : dark ? "text-slate-200" : "text-slate-800"}`}>
                              {new Date(`${day.date}T00:00:00`).toLocaleDateString("fr-FR", { weekday: "short", day: "2-digit", month: "short", year: "numeric" })}
                            </td>
                            <td className={`px-5 py-3.5 text-sm font-semibold ${isWeekend ? "text-slate-400" : day.check_in ? (dark ? "text-emerald-400" : "text-emerald-600") : "text-slate-400"}`}>
                              {isWeekend ? "—" : (day.check_in || "--:--")}
                            </td>
                            <td className={`px-5 py-3.5 text-sm ${isWeekend ? "text-slate-400" : day.check_out ? (dark ? "text-slate-200" : "text-slate-700") : "text-slate-400"}`}>
                              {isWeekend ? "—" : (day.check_out || "--:--")}
                            </td>
                            <td className="px-5 py-3.5">{statusBadge}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                );
              })() : null}
            </div>

            {/* Footer stats */}
            {detailData && !detailLoading && (
              <div className={`flex flex-wrap gap-6 px-6 py-4 border-t ${dark ? "border-slate-800" : "border-slate-100"}`}>
                {[
                  { label: "Complets", val: detailData.days.filter((d) => !d.is_weekend && d.status === "Complet").length, cls: "text-emerald-500" },
                  { label: "Entrée seule", val: detailData.days.filter((d) => !d.is_weekend && d.status === "Entrée seule").length, cls: "text-amber-500" },
                  { label: "Absences", val: detailData.days.filter((d) => !d.is_weekend && d.status === "Absent").length, cls: "text-rose-500" },
                  { label: "Justifiés", val: detailData.days.filter((d) => d.raw_justif_status === "JUSTIFIE").length, cls: "text-blue-500" },
                ].map(({ label, val, cls }) => (
                  <div key={label} className="flex items-center gap-2">
                    <span className={`text-lg font-black ${cls}`}>{val}</span>
                    <span className={`text-xs ${dark ? "text-slate-400" : "text-slate-500"}`}>{label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
