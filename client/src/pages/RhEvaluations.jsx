import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import Navbar from "../components/Navbar";
import useDarkModePreference from "../hooks/useDarkModePreference";
import usePersistentNavState from "../hooks/usePersistentNavState";
import "../styles/profile.css";

const recommendationThemes = {
  Excellent: {
    badge: "bg-emerald-100 text-emerald-800 ring-emerald-200",
    dot: "bg-emerald-500",
    panel: "from-emerald-500/15 to-lime-500/10",
  },
  Bon: {
    badge: "bg-sky-100 text-sky-800 ring-sky-200",
    dot: "bg-sky-500",
    panel: "from-sky-500/15 to-cyan-500/10",
  },
  Moyen: {
    badge: "bg-amber-100 text-amber-800 ring-amber-200",
    dot: "bg-amber-500",
    panel: "from-amber-500/15 to-orange-500/10",
  },
};

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getRecommendationTheme(recommendation, dark) {
  const fallback = dark
    ? {
        badge: "bg-slate-800 text-slate-100 ring-slate-700",
        dot: "bg-slate-400",
        panel: "from-slate-500/15 to-slate-500/5",
      }
    : {
        badge: "bg-slate-100 text-slate-700 ring-slate-200",
        dot: "bg-slate-400",
        panel: "from-slate-500/10 to-slate-500/5",
      };
  return recommendationThemes[recommendation] || fallback;
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

export default function RhEvaluations() {
  const [dark, setDark] = useDarkModePreference();
  const [isNavOpen, setIsNavOpen] = usePersistentNavState();
  const [role, setRole] = useState("");
  const [evaluations, setEvaluations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const fetchEvaluations = async () => {
    try {
      setLoading(true);
      setErrorMessage("");
      const [meResponse, response] = await Promise.all([
        axios.get("/api/whoami/"),
        axios.get("/api/evaluations/rh/"),
      ]);
      setRole(meResponse.data?.role || "");
      setEvaluations(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error("Erreur chargement evaluations RH:", error);
      setEvaluations([]);
      setErrorMessage("Impossible de charger les evaluations RH.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvaluations();
  }, []);

  const stats = useMemo(() => {
    const excellent = evaluations.filter((item) => item.recommendation === "Excellent").length;
    const good = evaluations.filter((item) => item.recommendation === "Bon").length;
    const average = evaluations.filter((item) => item.recommendation === "Moyen").length;
    const averageScore = evaluations.length
      ? (evaluations.reduce((sum, item) => sum + Number(item.global_score || 0), 0) / evaluations.length).toFixed(1)
      : "0.0";
    return { total: evaluations.length, excellent, good, average, averageScore };
  }, [evaluations]);

  const isGrh = role === "GRH";

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
              <h1 className="monprofile">{isGrh ? "Evaluations globales" : "Evaluations RH"}</h1>
              <p className="morinfo">
                {isGrh
                  ? "Lisez rapidement les tendances d'evaluation sur tout le perimetre et reperez les profils a forte valeur."
                  : "Suivez les performances employees avec une vue plus claire des notes, recommandations et periodes."}
              </p>
            </div>
            <div className="yamin">
              <button className="nav-toggle" onClick={() => setIsNavOpen((prev) => !prev)} type="button">
                {isNavOpen ? "Masquer menu" : "Afficher menu"}
              </button>
              <button className="mode" onClick={() => setDark((prev) => !prev)} type="button">
                {dark ? "mode clair" : "mode sombre"}
              </button>
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
              <div className="relative overflow-hidden rounded-[30px] border border-emerald-300/20 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.18),_transparent_40%),linear-gradient(135deg,#0f172a_0%,#133241_45%,#1d6f57_100%)] p-6 text-white shadow-2xl shadow-emerald-950/20">
                <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
                <div className="absolute bottom-0 right-0 h-28 w-28 rounded-tl-[40px] border-l border-t border-white/10 bg-white/5" />
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-200/80">
                  {isGrh ? "Vision globale" : "Lecture RH"}
                </p>
                <h2 className="mt-4 max-w-xl text-3xl font-black leading-tight md:text-4xl">
                  Une page d'evaluation plus lisible pour relier score, recommandation et contexte collaborateur.
                </h2>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-200">
                  Les evaluations ne sont plus noyees dans un tableau brut. Chaque fiche met en avant la note globale,
                  la recommandation, la periode et l'identite de l'evaluateur.
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={fetchEvaluations}
                    className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-emerald-50"
                  >
                    Actualiser les evaluations
                  </button>
                  <div className="rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-medium text-slate-100">
                    Score moyen: {stats.averageScore}/5
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <MetricCard dark={dark} eyebrow="Total" value={stats.total} helper="Evaluations visibles" accent="from-emerald-400 via-emerald-500 to-lime-500" />
                <MetricCard dark={dark} eyebrow="Excellent" value={stats.excellent} helper="Recommandations les plus fortes" accent="from-sky-400 via-cyan-500 to-blue-500" />
                <MetricCard dark={dark} eyebrow="Bon" value={stats.good} helper="Performances stables" accent="from-amber-400 via-orange-500 to-rose-500" />
                <MetricCard dark={dark} eyebrow="Moyen" value={stats.average} helper="Profils a accompagner" accent="from-rose-400 via-fuchsia-500 to-orange-500" />
              </div>
            </div>
          </section>

          {errorMessage ? (
            <div className={`rounded-[24px] border px-5 py-4 text-sm font-medium shadow-sm ${dark ? "border-rose-800 bg-rose-950/40 text-rose-100" : "border-rose-200 bg-rose-50 text-rose-800"}`}>
              {errorMessage}
            </div>
          ) : null}

          <div className="grid gap-6 xl:grid-cols-[1.45fr_0.92fr]">
            <section
              className={`rounded-[32px] border p-6 shadow-sm ${
                dark ? "border-slate-800 bg-slate-900/90 shadow-black/20" : "border-white/80 bg-white/90 shadow-slate-200/70"
              }`}
            >
              <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">Historique</p>
                  <h2 className={`mt-2 text-2xl font-black ${dark ? "text-slate-50" : "text-slate-900"}`}>
                    Fiches d'evaluation
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                    Une vue plus respirante des collaborateurs evalues, des evaluateurs et des recommandations.
                  </p>
                </div>
                <div className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] ${dark ? "bg-slate-800 text-slate-200" : "bg-slate-100 text-slate-700"}`}>
                  {loading ? "Chargement..." : `${evaluations.length} fiche${evaluations.length > 1 ? "s" : ""}`}
                </div>
              </div>

              {loading ? (
                <div className="grid gap-4">
                  {[1, 2, 3].map((item) => (
                    <div key={item} className={`h-40 animate-pulse rounded-[28px] ${dark ? "bg-slate-800/70" : "bg-slate-100"}`} />
                  ))}
                </div>
              ) : evaluations.length === 0 ? (
                <div className={`rounded-[28px] border border-dashed px-6 py-12 text-center ${dark ? "border-slate-700 bg-slate-950/40" : "border-slate-200 bg-slate-50"}`}>
                  <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Aucune evaluation</p>
                  <h3 className={`mt-3 text-2xl font-black ${dark ? "text-slate-50" : "text-slate-900"}`}>
                    Aucune evaluation RH disponible pour le moment.
                  </h3>
                </div>
              ) : (
                <div className="grid gap-4">
                  {evaluations.map((item) => {
                    const theme = getRecommendationTheme(item.recommendation, dark);
                    return (
                      <article
                        key={item.id}
                        className={`rounded-[28px] border p-5 transition ${
                          dark ? "border-slate-800 bg-slate-950/65 hover:border-slate-700" : "border-slate-200 bg-slate-50/70 hover:border-slate-300"
                        }`}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div className="max-w-3xl">
                            <div className="flex flex-wrap items-center gap-3">
                              <span className={`h-3 w-3 rounded-full ${theme.dot}`} />
                              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                                Evaluation #{item.id}
                              </p>
                              <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ${theme.badge}`}>
                                {item.recommendation}
                              </span>
                            </div>
                            <h3 className={`mt-3 text-xl font-black ${dark ? "text-slate-50" : "text-slate-900"}`}>
                              {item.employee?.full_name || "-"}
                            </h3>
                            <p className="mt-2 text-sm leading-6 text-slate-500">
                              {item.employee?.service || "Service non renseigne"} • {item.employee?.email || "Email non renseigne"}
                            </p>
                          </div>
                          <div className={`min-w-[220px] rounded-[24px] bg-gradient-to-br p-4 ${theme.panel} ${dark ? "border border-slate-800" : "border border-white/70"}`}>
                            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Performance</p>
                            <p className={`mt-3 text-4xl font-black ${dark ? "text-slate-50" : "text-slate-900"}`}>
                              {item.global_score}/5
                            </p>
                            <p className="mt-2 text-sm text-slate-500">Periode {item.period || "-"}</p>
                          </div>
                        </div>

                        <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_1fr]">
                          <div className={`rounded-[22px] p-4 ${dark ? "bg-slate-900" : "bg-white"}`}>
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Evaluateur</p>
                            <p className={`mt-2 text-base font-semibold ${dark ? "text-slate-100" : "text-slate-900"}`}>
                              {item.evaluator?.full_name || "-"}
                            </p>
                            <p className="mt-1 text-sm text-slate-500">{item.evaluator?.email || "Email non renseigne"}</p>
                          </div>
                          <div className={`rounded-[22px] p-4 ${dark ? "bg-slate-900" : "bg-white"}`}>
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Date d'evaluation</p>
                            <p className={`mt-2 text-base font-semibold ${dark ? "text-slate-100" : "text-slate-900"}`}>
                              {formatDate(item.evaluation_date)}
                            </p>
                            <p className="mt-1 text-sm text-slate-500">Recommendation: {item.recommendation}</p>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>

            <aside className="grid gap-6">
              <section
                className={`rounded-[32px] border p-6 shadow-sm ${
                  dark ? "border-slate-800 bg-slate-900/90 shadow-black/20" : "border-white/80 bg-white/90 shadow-slate-200/70"
                }`}
              >
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Lecture rapide</p>
                  <h2 className={`mt-2 text-2xl font-black ${dark ? "text-slate-50" : "text-slate-900"}`}>
                    Reperes RH
                  </h2>
                </div>

                <div className="mt-5 grid gap-3">
                  {[
                    { label: "Perimetre", value: isGrh ? "Global GRH" : "RH", helper: "Scope de lecture applique" },
                    { label: "Top recommandation", value: stats.excellent, helper: "Evaluations au plus haut niveau" },
                    { label: "Score moyen", value: `${stats.averageScore}/5`, helper: "Lecture globale des performances" },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className={`rounded-[24px] border p-4 ${
                        dark ? "border-slate-800 bg-slate-950/70" : "border-slate-200 bg-slate-50"
                      }`}
                    >
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{item.label}</p>
                      <p className={`mt-3 text-2xl font-black ${dark ? "text-slate-50" : "text-slate-900"}`}>{item.value}</p>
                      <p className="mt-1 text-sm text-slate-500">{item.helper}</p>
                    </div>
                  ))}
                </div>
              </section>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}
