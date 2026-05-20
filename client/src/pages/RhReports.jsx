import NotificationBell from "../components/NotificationBell";
import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import Navbar from "../components/Navbar";
import useDarkModePreference from "../hooks/useDarkModePreference";
import usePersistentNavState from "../hooks/usePersistentNavState";
import { getRoleContext } from "../app/roleAccess";
import "../styles/profile.css";

function getCurrentMonthRange() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const today = String(now.getDate()).padStart(2, "0");
  return { from: `${year}-${month}-01`, to: `${year}-${month}-${today}` };
}

function MetricCard({ dark, eyebrow, value, helper, accent }) {
  return (
    <div
      className={`rounded-[28px] border p-5 shadow-sm transition ${
        dark ? "border-slate-800 bg-slate-900/90 shadow-black/20" : "border-white/80 bg-white/90 shadow-slate-200/70"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-500">{eyebrow}</p>
          <p className={`mt-4 text-4xl font-black ${dark ? "text-slate-50" : "text-slate-900"}`}>{value}</p>
          <p className="mt-2 text-sm text-slate-500">{helper}</p>
        </div>
        <div className={`h-12 w-12 rounded-2xl bg-gradient-to-br ${accent}`} />
      </div>
    </div>
  );
}

function FilterLabel({ children }) {
  return <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{children}</label>;
}

export default function RhReports() {
  const [dark, setDark] = useDarkModePreference();
  const [isNavOpen, setIsNavOpen] = usePersistentNavState();
  const [roleCtx, setRoleCtx] = useState({});
  const [filters, setFilters] = useState(getCurrentMonthRange);
  const [summary, setSummary] = useState(null);
  const [todaySummary, setTodaySummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const fieldClassName = `w-full rounded-2xl border px-4 py-3 text-sm outline-none transition ${
    dark
      ? "border-slate-700 bg-slate-950/80 text-slate-100 placeholder:text-slate-500 focus:border-cyan-400"
      : "border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-cyan-500"
  }`;

  const fetchSummary = async () => {
    try {
      setLoading(true);
      setErrorMessage("");
      const todayStr = new Date().toISOString().slice(0, 10);
      const [meResponse, response, todayResponse] = await Promise.all([
        axios.get("/api/whoami/"),
        axios.get("/api/reports/summary/", { params: filters }),
        axios.get("/api/reports/summary/", { params: { from: todayStr, to: todayStr } }),
      ]);
      setRoleCtx(getRoleContext({ role: meResponse.data?.role, service: meResponse.data?.service, employee_role: meResponse.data?.employee_role }));
      setSummary(response.data || null);
      setTodaySummary(todayResponse.data || null);
    } catch (error) {
      console.error("Erreur chargement rapports RH:", error);
      setSummary(null);
      setTodaySummary(null);
      setErrorMessage("Impossible de charger les indicateurs RH.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, [filters.from, filters.to]);

  const cards = useMemo(() => {
    if (!summary) return [];
    return [
      { label: "Employés actifs", value: summary.employees_count ?? 0, sub: `Ont travaillé sur la période` },
      { label: "Absences détectées", value: summary.absences_detected_count ?? 0, sub: `${filters.from} → ${filters.to}` },
    ];
  }, [summary, filters]);

  const isGrh = roleCtx.isDrh ?? false;

  const downloadReport = async (type, format) => {
    try {
      const response = await axios.get(`/api/reports/${type}/export/`, {
        params: {
          ...filters,
          file_format: format,
        },
        responseType: "blob",
      });
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${type}-rh-report.${format === "xlsx" ? "xlsx" : "pdf"}`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error(`Erreur export RH ${type}:`, error);
      setErrorMessage(error?.response?.data?.detail || `Impossible d'exporter le rapport ${type}.`);
    }
  };

  return (
    <div className={`profile-page${dark ? " dark" : ""} ${isNavOpen ? "nav-open" : "nav-closed"}`}>
      <div className={`navbar-profile-page ${isNavOpen ? "open" : "closed"}`}>
        <Navbar />
      </div>

      {isNavOpen && <div className="profile-overlay" onClick={() => setIsNavOpen(false)} aria-hidden="true" />}

      <div className={`profile-content min-h-screen !h-auto ${dark ? "bg-slate-950 text-slate-100" : "bg-[#f4f7f1] text-slate-900"}`}>
        <div
          className={`sticky top-0 z-40 border-b backdrop-blur ${
            dark ? "border-slate-800 bg-slate-950/90" : "border-white/70 bg-[#f4f7f1]/92"
          }`}
        >
          <div className="profile-naaav">
            <div className="yasar">
              <h1 className="monprofile">Rapport d'absence</h1>
              <p className="morinfo">
                {isGrh
                  ? "Pilotez les exports globaux et l'activité RH depuis un cockpit plus lisible."
                  : "Filtrez la période, lisez les indicateurs et exportez les rapports RH depuis un seul espace clair."}
              </p>
            </div>
            <div className="yamin">
              <button className="nav-toggle" onClick={() => setIsNavOpen((prev) => !prev)} type="button">
                {isNavOpen ? "Masquer menu" : "Afficher menu"}
              </button>
              <button className="mode" onClick={() => setDark((prev) => !prev)} type="button">
                {dark ? "mode clair" : "mode sombre"}
              </button>
              <NotificationBell dark={dark} />
            </div>
          </div>
        </div>

        <div className="mx-auto flex w-[96%] max-w-[1500px] flex-col gap-6 py-6">
          <section
            className={`overflow-hidden rounded-[36px] border p-6 md:p-8 ${
              dark ? "border-slate-800 bg-slate-900/90" : "border-white/80 bg-white/85"
            }`}
          >
            <div className="grid gap-6 lg:grid-cols-[1.3fr_0.9fr]">
              <div className="relative overflow-hidden rounded-[30px] border border-cyan-300/20 bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.20),_transparent_40%),linear-gradient(135deg,#0f172a_0%,#10293a_45%,#165e6d_100%)] p-6 text-white shadow-2xl shadow-cyan-950/20">
                <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
                <div className="absolute bottom-0 right-0 h-28 w-28 rounded-tl-[40px] border-l border-t border-white/10 bg-white/5" />
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-200/80">
                  Rapport d'absence
                </p>
                <h2 className="mt-4 max-w-xl text-3xl font-black leading-tight md:text-4xl">
                  Un cockpit RH plus net pour filtrer, lire les indicateurs et lancer les exports utiles.
                </h2>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-200">
                  Les filtres de période, les exports et la synthèse ne sont plus dispersés. Tout est regroupé dans une vue
                  simple à lire, plus proche d'un panneau de pilotage RH.
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={fetchSummary}
                    className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-cyan-50"
                  >
                    Recharger les indicateurs
                  </button>
                  <div className="rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-medium text-slate-100">
                    Période : {filters.from} au {filters.to}
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <MetricCard dark={dark} eyebrow="Employés actifs" value={summary?.employees_count ?? 0} helper="Ont travaillé sur la période" accent="from-cyan-400 via-cyan-500 to-blue-500" />
                <MetricCard dark={dark} eyebrow="Présence aujourd'hui" value={todaySummary?.attendance_days_count ?? 0} helper="Employés présents ce jour" accent="from-emerald-400 via-emerald-500 to-lime-500" />
                <MetricCard dark={dark} eyebrow="Absences aujourd'hui" value={Math.max(0, (summary?.employees_count ?? 0) - (todaySummary?.attendance_days_count ?? 0))} helper="Employés absents ce jour" accent="from-amber-400 via-orange-500 to-rose-500" />
                <MetricCard dark={dark} eyebrow="Absences (période)" value={summary?.absences_detected_count ?? 0} helper={`Sur la période sélectionnée`} accent="from-rose-400 via-red-500 to-orange-500" />
              </div>
            </div>
          </section>

          {errorMessage ? (
            <div className={`rounded-[24px] border px-5 py-4 text-sm font-medium shadow-sm ${dark ? "border-rose-800 bg-rose-950/40 text-rose-100" : "border-rose-200 bg-rose-50 text-rose-800"}`}>
              {errorMessage}
            </div>
          ) : null}

          <div className="grid gap-6 xl:grid-cols-[1.1fr_1.25fr]">
            <aside className="grid gap-6">
              <section
                className={`rounded-[32px] border p-6 shadow-sm ${
                  dark ? "border-slate-800 bg-slate-900/90 shadow-black/20" : "border-white/80 bg-white/90 shadow-slate-200/70"
                }`}
              >
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Filtres</p>
                <h2 className={`mt-2 text-2xl font-black ${dark ? "text-slate-50" : "text-slate-900"}`}>Période d'analyse</h2>

                <div className="mt-5 grid gap-4">
                  <div>
                    <FilterLabel>Du</FilterLabel>
                    <input
                      type="date"
                      value={filters.from}
                      max={new Date().toISOString().slice(0, 10)}
                      onChange={(e) => {
                        const newFrom = e.target.value;
                        setFilters((p) => ({
                          ...p,
                          from: newFrom,
                          to: p.to < newFrom ? newFrom : p.to,
                        }));
                      }}
                      className={fieldClassName}
                    />
                  </div>
                  <div>
                    <FilterLabel>Au</FilterLabel>
                    <input
                      type="date"
                      value={filters.to}
                      min={filters.from}
                      max={new Date().toISOString().slice(0, 10)}
                      onChange={(e) => setFilters((p) => ({ ...p, to: e.target.value }))}
                      className={fieldClassName}
                    />
                  </div>
                </div>
              </section>

              <section
                className={`rounded-[32px] border p-6 shadow-sm ${
                  dark ? "border-slate-800 bg-slate-900/90 shadow-black/20" : "border-white/80 bg-white/90 shadow-slate-200/70"
                }`}
              >
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Exports</p>
                <h2 className={`mt-2 text-2xl font-black ${dark ? "text-slate-50" : "text-slate-900"}`}>Rapports disponibles</h2>

                <div className="mt-5 grid gap-3">
                  {[
                    { label: "Présence PDF", action: () => downloadReport("attendance", "pdf") },
                    { label: "Présence Excel", action: () => downloadReport("attendance", "xlsx") },
                  ].map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      onClick={item.action}
                      className={`rounded-[22px] border px-4 py-4 text-left text-sm font-semibold transition ${
                        dark ? "border-slate-800 bg-slate-950/70 text-slate-100 hover:border-cyan-500" : "border-slate-200 bg-slate-50 text-slate-700 hover:border-cyan-400"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </section>
            </aside>

            <section
              className={`rounded-[32px] border p-6 shadow-sm ${
                dark ? "border-slate-800 bg-slate-900/90 shadow-black/20" : "border-white/80 bg-white/90 shadow-slate-200/70"
              }`}
            >
              <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">Synthèse</p>
                  <h2 className={`mt-2 text-2xl font-black ${dark ? "text-slate-50" : "text-slate-900"}`}>
                    Indicateurs RH
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                    Les indicateurs backend sont présentés sous forme de cartes lisibles, prêtes pour le pilotage.
                  </p>
                </div>
                <div className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] ${dark ? "bg-slate-800 text-slate-200" : "bg-slate-100 text-slate-700"}`}>
                  {loading ? "Chargement..." : `${cards.length} indicateur${cards.length > 1 ? "s" : ""}`}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {loading ? (
                  [1, 2, 3, 4].map((item) => (
                    <div key={item} className={`h-32 animate-pulse rounded-[24px] ${dark ? "bg-slate-800/70" : "bg-slate-100"}`} />
                  ))
                ) : (
                  cards.map((card) => (
                    <div
                      key={card.label}
                      className={`rounded-[24px] border p-5 ${
                        dark ? "border-slate-800 bg-slate-950/70" : "border-slate-200 bg-slate-50"
                      }`}
                    >
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{card.label}</p>
                      <p className={`mt-4 text-4xl font-black ${dark ? "text-slate-50" : "text-slate-900"}`}>{card.value}</p>
                      {card.sub && <p className="mt-1 text-[11px] text-slate-400">{card.sub}</p>}
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
