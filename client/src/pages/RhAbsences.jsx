import NotificationBell from "../components/NotificationBell";
import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import Navbar from "../components/Navbar";
import useDarkModePreference from "../hooks/useDarkModePreference";
import usePersistentNavState from "../hooks/usePersistentNavState";
import "../styles/profile.css";

const JUSTIF_LABELS = {
  NON_JUSTIFIE: "Non justifié",
  EN_COURS: "En cours",
  JUSTIFIE: "Justifié",
  NON_ACCEPTE: "Non acceptée",
};

const JUSTIF_THEME = {
  NON_JUSTIFIE: { badge: "bg-rose-100 text-rose-800 ring-rose-200", dot: "bg-rose-500" },
  EN_COURS:     { badge: "bg-amber-100 text-amber-800 ring-amber-200", dot: "bg-amber-500" },
  JUSTIFIE:     { badge: "bg-emerald-100 text-emerald-800 ring-emerald-200", dot: "bg-emerald-500" },
  NON_ACCEPTE:  { badge: "bg-slate-100 text-slate-600 ring-slate-200", dot: "bg-slate-400" },
};

function formatDate(value) {
  if (!value) return "-";
  const d = new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

function formatMonth(value) {
  if (!value) return "-";
  const d = new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
}

function MetricCard({ dark, eyebrow, value, helper, accent }) {
  return (
    <div className={`rounded-[28px] border p-5 shadow-sm transition ${dark ? "border-slate-800 bg-slate-900/90 shadow-black/20" : "border-white/80 bg-white/90 shadow-slate-200/70"}`}>
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

export default function RhAbsences() {
  const [dark, setDark] = useDarkModePreference();
  const [isNavOpen, setIsNavOpen] = usePersistentNavState();

  const [absences, setAbsences] = useState([]);
  const [flags, setFlags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [feedback, setFeedback] = useState("");

  // warn modal
  const [warningTarget, setWarningTarget] = useState(null);
  const [warningComment, setWarningComment] = useState("");
  const [warnLoading, setWarnLoading] = useState(false);

  // review modal (accept / refuse justification)
  const [reviewTarget, setReviewTarget] = useState(null);
  const [reviewAction, setReviewAction] = useState("accept");
  const [reviewNote, setReviewNote] = useState("");
  const [reviewLoading, setReviewLoading] = useState(false);

  // filter
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const fieldCls = `w-full rounded-2xl border px-4 py-3 text-sm outline-none transition ${
    dark
      ? "border-slate-700 bg-slate-950/80 text-slate-100 placeholder:text-slate-500 focus:border-amber-400"
      : "border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-amber-500"
  }`;

  const fetchData = async () => {
    try {
      setLoading(true);
      setErrorMessage("");
      const [absRes, flagsRes] = await Promise.all([
        axios.get("/api/absences/rh/"),
        axios.get("/api/discipline/flags/"),
      ]);
      setAbsences(Array.isArray(absRes.data) ? absRes.data : []);
      setFlags(Array.isArray(flagsRes.data) ? flagsRes.data : []);
    } catch (err) {
      console.error("Erreur chargement absences RH:", err);
      setAbsences([]);
      setFlags([]);
      setErrorMessage("Impossible de charger les absences RH.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const stats = useMemo(() => ({
    total: absences.length,
    non_justifie: absences.filter(a => a.justification_status === "NON_JUSTIFIE").length,
    en_cours: absences.filter(a => a.justification_status === "EN_COURS").length,
    justifie: absences.filter(a => a.justification_status === "JUSTIFIE").length,
    flags: flags.length,
    highRisk: flags.filter(f => Number(f.warning_count) >= 5).length,
  }), [absences, flags]);

  const filtered = useMemo(() => absences.filter(ab => {
    if (statusFilter && ab.justification_status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (ab.employee_name || "").toLowerCase().includes(q) ||
             (ab.service || "").toLowerCase().includes(q);
    }
    return true;
  }), [absences, search, statusFilter]);

  const issueWarning = async () => {
    if (!warningTarget) return;
    try {
      setWarnLoading(true);
      setFeedback("");
      const res = await axios.post("/api/warnings/", {
        employee_id: warningTarget.employee_id,
        date: warningTarget.date,
        comment: warningComment,
      });
      const count = res.data?.warning_count;
      setFeedback(
        res.data?.detail === "warning for this employee and date already exists"
          ? "Avertissement déjà enregistré pour cette date."
          : `Avertissement enregistré.${count ? ` Total du mois : ${count}.` : ""}`
      );
      setWarningTarget(null);
      await fetchData();
    } catch (err) {
      setFeedback(err?.response?.data?.detail || "Impossible d'enregistrer l'avertissement.");
    } finally {
      setWarnLoading(false);
    }
  };

  const submitReview = async () => {
    if (!reviewTarget || !reviewTarget.justification_id) return;
    try {
      setReviewLoading(true);
      setFeedback("");
      await axios.post(`/api/absences/${reviewTarget.justification_id}/${reviewAction}/`, { note: reviewNote });
      setFeedback(reviewAction === "accept" ? "Justification acceptée." : "Justification refusée.");
      setReviewTarget(null);
      await fetchData();
    } catch (err) {
      setFeedback(err?.response?.data?.detail || "Erreur lors de la décision.");
    } finally {
      setReviewLoading(false);
    }
  };

  return (
    <div className={`profile-page${dark ? " dark" : ""} ${isNavOpen ? "nav-open" : "nav-closed"}`}>
      <div className={`navbar-profile-page ${isNavOpen ? "open" : "closed"}`}>
        <Navbar />
      </div>

      {isNavOpen && <div className="profile-overlay" onClick={() => setIsNavOpen(false)} aria-hidden="true" />}

      <div className={`profile-content min-h-screen !h-auto ${dark ? "bg-slate-950 text-slate-100" : "bg-[#f4f7f1] text-slate-900"}`}>
        <div className={`sticky top-0 z-40 border-b backdrop-blur ${dark ? "border-slate-800 bg-slate-950/90" : "border-white/70 bg-[#f4f7f1]/92"}`}>
          <div className="profile-naaav">
            <div className="yasar">
              <h1 className="monprofile">Absences RH</h1>
              <p className="morinfo">Toutes les absences non pointées avec leur statut de justification.</p>
            </div>
            <div className="yamin">
              <button className="nav-toggle" onClick={() => setIsNavOpen(p => !p)} type="button">
                {isNavOpen ? "Masquer menu" : "Afficher menu"}
              </button>
              <button className="mode" onClick={() => setDark(p => !p)} type="button">
                {dark ? "mode clair" : "mode sombre"}
              </button>
              <NotificationBell dark={dark} />
            </div>
          </div>
        </div>

        <div className="mx-auto flex w-[96%] max-w-[1500px] flex-col gap-6 py-6">

          {/* hero */}
          <section className={`overflow-hidden rounded-[36px] border p-6 md:p-8 ${dark ? "border-slate-800 bg-slate-900/90" : "border-white/80 bg-white/85"}`}>
            <div className="grid gap-6 lg:grid-cols-[1.3fr_0.9fr]">
              <div className="relative overflow-hidden rounded-[30px] border border-amber-300/20 bg-[radial-gradient(circle_at_top_left,_rgba(245,158,11,0.22),_transparent_42%),linear-gradient(135deg,#111827_0%,#3d2511_45%,#7c3f18_100%)] p-6 text-white shadow-2xl shadow-amber-950/20">
                <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-200/80">Surveillance RH</p>
                <h2 className="mt-4 max-w-xl text-3xl font-black leading-tight md:text-4xl">
                  Suivez les absences, traitez les justifications et avertissez si nécessaire.
                </h2>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-200">
                  Chaque ligne correspond à un jour d'absence d'un employé. Quand il soumet un document, le statut passe à "En cours" et vous pouvez accepter ou refuser.
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <button type="button" onClick={fetchData}
                    className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-amber-50">
                    Actualiser
                  </button>
                  <div className="rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-medium text-slate-100">
                    {loading ? "Chargement..." : `${absences.length} absence${absences.length > 1 ? "s" : ""} sur 60 jours`}
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <MetricCard dark={dark} eyebrow="Total" value={stats.total} helper="Jours d'absence détectés" accent="from-amber-400 via-orange-500 to-red-500" />
                <MetricCard dark={dark} eyebrow="Non justifiés" value={stats.non_justifie} helper="En attente de document" accent="from-rose-400 via-rose-500 to-red-500" />
                <MetricCard dark={dark} eyebrow="En cours" value={stats.en_cours} helper="Document soumis, à traiter" accent="from-sky-400 via-cyan-500 to-blue-500" />
                <MetricCard dark={dark} eyebrow="Flags discipl." value={stats.flags} helper="Employés au-dessus du seuil" accent="from-fuchsia-400 via-rose-500 to-orange-500" />
              </div>
            </div>
          </section>

          {feedback && (
            <div className={`rounded-[24px] border px-5 py-4 text-sm font-medium shadow-sm ${dark ? "border-sky-800 bg-sky-950/40 text-sky-100" : "border-sky-200 bg-sky-50 text-sky-800"}`}>
              {feedback}
            </div>
          )}
          {errorMessage && (
            <div className={`rounded-[24px] border px-5 py-4 text-sm font-medium shadow-sm ${dark ? "border-rose-800 bg-rose-950/40 text-rose-100" : "border-rose-200 bg-rose-50 text-rose-800"}`}>
              {errorMessage}
            </div>
          )}

          <div className="grid gap-6 xl:grid-cols-[1.45fr_0.92fr]">
            {/* main absence list */}
            <section className={`rounded-[32px] border p-6 shadow-sm ${dark ? "border-slate-800 bg-slate-900/90 shadow-black/20" : "border-white/80 bg-white/90 shadow-slate-200/70"}`}>
              <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">Absences détectées</p>
                  <h2 className={`mt-2 text-2xl font-black ${dark ? "text-slate-50" : "text-slate-900"}`}>Employés à traiter</h2>
                  <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">60 derniers jours — un employé peut avoir plusieurs lignes.</p>
                </div>
              </div>

              {/* status chips */}
              {!loading && absences.length > 0 && (
                <div className="mb-4 flex flex-wrap gap-2">
                  {[
                    { key: "", label: `Tout (${absences.length})` },
                    { key: "NON_JUSTIFIE", label: `Non justifié (${stats.non_justifie})`, cls: "bg-rose-100 text-rose-800" },
                    { key: "EN_COURS", label: `En cours (${stats.en_cours})`, cls: "bg-amber-100 text-amber-800" },
                    { key: "JUSTIFIE", label: `Justifié (${stats.justifie})`, cls: "bg-emerald-100 text-emerald-800" },
                  ].map(chip => (
                    <button key={chip.key} type="button"
                      onClick={() => setStatusFilter(chip.key)}
                      className={`rounded-full px-3 py-1.5 text-xs font-semibold ring-2 transition ${chip.cls || (dark ? "bg-slate-800 text-slate-200" : "bg-slate-100 text-slate-700")} ${statusFilter === chip.key ? "ring-slate-500" : "ring-transparent"}`}>
                      {chip.label}
                    </button>
                  ))}
                </div>
              )}

              {/* search */}
              <div className="mb-5">
                <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Filtrer par employé ou service..."
                  className={`w-full max-w-sm rounded-2xl border px-4 py-2.5 text-sm outline-none transition ${dark ? "border-slate-700 bg-slate-950/80 text-slate-100 placeholder:text-slate-500 focus:border-amber-400" : "border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-amber-500"}`}
                />
              </div>

              {loading ? (
                <div className="grid gap-4">
                  {[1,2,3].map(i => <div key={i} className={`h-36 animate-pulse rounded-[28px] ${dark ? "bg-slate-800/70" : "bg-slate-100"}`} />)}
                </div>
              ) : filtered.length === 0 ? (
                <div className={`rounded-[28px] border border-dashed px-6 py-12 text-center ${dark ? "border-slate-700 bg-slate-950/40" : "border-slate-200 bg-slate-50"}`}>
                  <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Aucune absence</p>
                  <h3 className={`mt-3 text-2xl font-black ${dark ? "text-slate-50" : "text-slate-900"}`}>
                    {absences.length === 0 ? "Aucune absence détectée sur 60 jours." : "Aucun résultat pour ces filtres."}
                  </h3>
                </div>
              ) : (
                <div className="grid gap-4">
                  {filtered.map((ab) => {
                    const jStatus = ab.justification_status || "NON_JUSTIFIE";
                    const theme = JUSTIF_THEME[jStatus] || JUSTIF_THEME.NON_JUSTIFIE;
                    const rowKey = `${ab.employee_id}-${ab.date}`;
                    return (
                      <article key={rowKey} className={`rounded-[28px] border p-5 transition ${dark ? "border-slate-800 bg-slate-950/65 hover:border-slate-700" : "border-slate-200 bg-slate-50/70 hover:border-slate-300"}`}>
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div className="max-w-3xl">
                            <div className="flex flex-wrap items-center gap-3">
                              <span className={`h-3 w-3 rounded-full ${theme.dot}`} />
                              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Absence</p>
                              <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ${theme.badge}`}>
                                {JUSTIF_LABELS[jStatus] || jStatus}
                              </span>
                            </div>
                            <h3 className={`mt-3 text-xl font-black ${dark ? "text-slate-50" : "text-slate-900"}`}>
                              {ab.employee_name || ab.employee_email}
                            </h3>
                            <p className="mt-2 text-sm leading-6 text-slate-500">
                              {ab.service || "Service non renseigné"} • Date concernée : {formatDate(ab.date)}
                            </p>
                          </div>

                          {/* action panel */}
                          <div className={`min-w-[260px] rounded-[24px] border p-4 ${dark ? "border-slate-800 bg-slate-900" : "border-slate-200 bg-white"}`}>
                            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Action RH</p>

                            {jStatus === "NON_JUSTIFIE" && (
                              <div className="mt-4">
                                <button type="button"
                                  onClick={() => { setWarningTarget(ab); setWarningComment("Absence non justifiée"); setFeedback(""); }}
                                  className="w-full rounded-full bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-400">
                                  Avertir l'employé
                                </button>
                              </div>
                            )}

                            {jStatus === "EN_COURS" && (
                              <div className="mt-3 flex flex-col gap-3">
                                {/* document — always shown, download if available */}
                                <div className={`rounded-[16px] border px-4 py-3 ${dark ? "border-slate-700 bg-slate-950/60" : "border-slate-100 bg-slate-50"}`}>
                                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Document soumis</p>
                                  {ab.document_url ? (
                                    <div className="mt-2 flex gap-2">
                                      <a href={ab.document_url} target="_blank" rel="noreferrer"
                                        className="flex-1 rounded-full bg-sky-600 px-3 py-2 text-center text-xs font-semibold text-white transition hover:bg-sky-500">
                                        Voir
                                      </a>
                                      <a href={ab.document_url} download
                                        className={`flex-1 rounded-full border px-3 py-2 text-center text-xs font-semibold transition ${dark ? "border-slate-600 text-slate-200 hover:bg-slate-800" : "border-slate-300 text-slate-700 hover:bg-slate-100"}`}>
                                        Télécharger
                                      </a>
                                    </div>
                                  ) : (
                                    <p className="mt-1.5 text-xs text-slate-400">Aucun fichier joint.</p>
                                  )}
                                </div>
                                {/* decision buttons */}
                                <div className="flex gap-2">
                                  <button type="button"
                                    onClick={() => { setReviewTarget(ab); setReviewAction("accept"); setReviewNote(""); setFeedback(""); }}
                                    className="flex-1 rounded-full bg-emerald-600 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500">
                                    Accepter
                                  </button>
                                  <button type="button"
                                    onClick={() => { setReviewTarget(ab); setReviewAction("refuse"); setReviewNote(""); setFeedback(""); }}
                                    className={`flex-1 rounded-full border px-3 py-2.5 text-sm font-semibold transition ${dark ? "border-slate-600 text-slate-200 hover:border-rose-500 hover:text-rose-300" : "border-slate-300 text-slate-600 hover:border-rose-400 hover:text-rose-600"}`}>
                                    Refuser
                                  </button>
                                </div>
                              </div>
                            )}

                            {(jStatus === "JUSTIFIE" || jStatus === "NON_ACCEPTE") && (
                              <div className="mt-4">
                                <p className="text-sm text-slate-500">Décision déjà prise.</p>
                                {ab.document_url && (
                                  <a href={ab.document_url} target="_blank" rel="noreferrer"
                                    className={`mt-3 inline-block rounded-full px-4 py-2 text-xs font-semibold transition ${dark ? "bg-slate-800 text-slate-200 hover:bg-slate-700" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                                    Voir le document
                                  </a>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>

            {/* sidebar */}
            <aside className="grid gap-6">
              <section className={`rounded-[32px] border p-6 shadow-sm ${dark ? "border-slate-800 bg-slate-900/90 shadow-black/20" : "border-white/80 bg-white/90 shadow-slate-200/70"}`}>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Discipline du mois</p>
                  <h2 className={`mt-2 text-2xl font-black ${dark ? "text-slate-50" : "text-slate-900"}`}>Flags disciplinaires</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-500">Employés ayant au moins 3 avertissements ce mois.</p>
                </div>
                <div className="mt-5 grid gap-3">
                  {loading ? (
                    [1,2].map(i => <div key={i} className={`h-28 animate-pulse rounded-[24px] ${dark ? "bg-slate-800/70" : "bg-slate-100"}`} />)
                  ) : flags.length === 0 ? (
                    <div className={`rounded-[24px] border border-dashed px-5 py-8 text-center ${dark ? "border-slate-700 bg-slate-950/40" : "border-slate-200 bg-slate-50"}`}>
                      <p className="text-sm text-slate-500">Aucun flag disciplinaire ce mois-ci.</p>
                    </div>
                  ) : flags.map(flag => (
                    <div key={`${flag.employee_id}-${flag.month}`}
                      className={`rounded-[24px] border p-4 ${dark ? "border-slate-800 bg-slate-950/70" : "border-slate-200 bg-slate-50"}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className={`text-base font-bold ${dark ? "text-slate-50" : "text-slate-900"}`}>{flag.employee_name || "-"}</h3>
                          <p className="mt-1 text-sm text-slate-500">{flag.employee_email}</p>
                        </div>
                        <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-800 ring-1 ring-rose-200">
                          {flag.warning_count} avert.
                        </span>
                      </div>
                      <div className="mt-4 flex items-center justify-between gap-4 text-sm">
                        <span className="text-slate-500">Mois</span>
                        <span className={dark ? "text-slate-100" : "text-slate-900"}>{formatMonth(flag.month)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className={`rounded-[32px] border p-6 shadow-sm ${dark ? "border-slate-800 bg-slate-900/90 shadow-black/20" : "border-white/80 bg-white/90 shadow-slate-200/70"}`}>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Mode d'emploi</p>
                  <h2 className={`mt-2 text-2xl font-black ${dark ? "text-slate-50" : "text-slate-900"}`}>Comment traiter</h2>
                </div>
                <div className="mt-5 grid gap-3">
                  {[
                    "Non justifié → avertissez l'employé si l'absence n'est pas normale.",
                    "En cours → l'employé a soumis un document. Consultez-le avant d'accepter ou refuser.",
                    "Justifié / Non acceptée → décision déjà prise, aucune action requise.",
                  ].map(item => (
                    <div key={item} className={`rounded-[22px] px-4 py-4 text-sm leading-6 ${dark ? "bg-slate-950/70 text-slate-300" : "bg-slate-50 text-slate-600"}`}>
                      {item}
                    </div>
                  ))}
                </div>
              </section>
            </aside>
          </div>
        </div>
      </div>

      {/* warn modal */}
      {warningTarget && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/60 px-4 py-6 backdrop-blur-sm"
          onClick={() => { if (!warnLoading) setWarningTarget(null); }}>
          <div className={`w-full max-w-xl rounded-[32px] border p-6 shadow-2xl ${dark ? "border-slate-800 bg-slate-900 text-slate-100" : "border-white bg-white text-slate-900"}`}
            onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Avertissement d'absence</p>
                <h3 className="mt-2 text-xl font-black">{warningTarget.employee_name}</h3>
                <p className="mt-1 text-sm text-slate-500">{warningTarget.service || "-"} • {formatDate(warningTarget.date)}</p>
              </div>
              <button type="button" onClick={() => setWarningTarget(null)}
                className={`rounded-full px-4 py-2 text-sm font-semibold ${dark ? "bg-slate-800 text-slate-100 hover:bg-slate-700" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}>
                Fermer
              </button>
            </div>
            <div className={`mt-5 rounded-[24px] p-4 ${dark ? "bg-slate-950/70" : "bg-slate-50"}`}>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Commentaire RH</p>
              <textarea rows={4} value={warningComment} onChange={e => setWarningComment(e.target.value)}
                className={`${fieldCls} mt-3 resize-y`}
                placeholder="Contexte de l'absence..." />
            </div>
            <div className="mt-5 flex flex-wrap justify-end gap-3">
              <button type="button" onClick={() => setWarningTarget(null)} disabled={warnLoading}
                className={`rounded-full border px-5 py-3 text-sm font-semibold disabled:opacity-60 ${dark ? "border-slate-700 bg-slate-900 text-slate-100" : "border-slate-300 bg-white text-slate-700"}`}>
                Annuler
              </button>
              <button type="button" onClick={issueWarning} disabled={warnLoading}
                className="rounded-full bg-amber-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-amber-400 disabled:opacity-60">
                {warnLoading ? "Enregistrement..." : "Confirmer l'avertissement"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* review modal (accept / refuse justification) */}
      {reviewTarget && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/60 px-4 py-6 backdrop-blur-sm"
          onClick={() => { if (!reviewLoading) setReviewTarget(null); }}>
          <div className={`w-full max-w-xl rounded-[32px] border p-6 shadow-2xl ${dark ? "border-slate-800 bg-slate-900 text-slate-100" : "border-white bg-white text-slate-900"}`}
            onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                  {reviewAction === "accept" ? "Accepter la justification" : "Refuser la justification"}
                </p>
                <h3 className="mt-2 text-xl font-black">{reviewTarget.employee_name}</h3>
                <p className="mt-1 text-sm text-slate-500">{reviewTarget.service || "-"} • {formatDate(reviewTarget.date)}</p>
              </div>
              <button type="button" onClick={() => setReviewTarget(null)}
                className={`rounded-full px-4 py-2 text-sm font-semibold ${dark ? "bg-slate-800 text-slate-100 hover:bg-slate-700" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}>
                Fermer
              </button>
            </div>

            <div className={`mt-4 rounded-[20px] p-4 ${dark ? "bg-slate-950/70" : "bg-slate-50"}`}>
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Document soumis</p>
              {reviewTarget.document_url ? (
                <div className="flex gap-2">
                  <a href={reviewTarget.document_url} target="_blank" rel="noreferrer"
                    className="flex-1 rounded-full bg-sky-600 px-4 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-sky-500">
                    Voir le document
                  </a>
                  <a href={reviewTarget.document_url} download
                    className={`flex-1 rounded-full border px-4 py-2.5 text-center text-sm font-semibold transition ${dark ? "border-slate-600 text-slate-200 hover:bg-slate-800" : "border-slate-300 text-slate-700 hover:bg-slate-100"}`}>
                    Télécharger
                  </a>
                </div>
              ) : (
                <p className="text-sm text-slate-400">Aucun fichier joint par l'employé.</p>
              )}
            </div>

            <div className={`mt-4 rounded-[24px] p-4 ${dark ? "bg-slate-950/70" : "bg-slate-50"}`}>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Note</p>
              <textarea rows={3} value={reviewNote} onChange={e => setReviewNote(e.target.value)}
                className={`${fieldCls} mt-3 resize-y`} placeholder="Note optionnelle..." />
            </div>

            <div className="mt-5 flex flex-wrap justify-end gap-3">
              <button type="button" onClick={() => setReviewTarget(null)} disabled={reviewLoading}
                className={`rounded-full border px-5 py-3 text-sm font-semibold disabled:opacity-60 ${dark ? "border-slate-700 bg-slate-900 text-slate-100" : "border-slate-300 bg-white text-slate-700"}`}>
                Annuler
              </button>
              <button type="button" onClick={submitReview} disabled={reviewLoading}
                className={`rounded-full px-5 py-3 text-sm font-semibold text-white disabled:opacity-60 ${reviewAction === "accept" ? "bg-emerald-600 hover:bg-emerald-500" : "bg-rose-600 hover:bg-rose-500"}`}>
                {reviewLoading ? "..." : reviewAction === "accept" ? "Confirmer l'acceptation" : "Confirmer le refus"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
