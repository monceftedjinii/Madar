import NotificationBell from "../components/NotificationBell";
import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import Navbar from "../components/Navbar";
import useDarkModePreference from "../hooks/useDarkModePreference";
import usePersistentNavState from "../hooks/usePersistentNavState";
import "../styles/profile.css";

const statusThemes = {
  PENDING: {
    badge: "bg-amber-100 text-amber-800 ring-amber-200",
    dot: "bg-amber-500",
    panel: "from-amber-500/15 to-orange-500/10",
  },
  ACCEPTED: {
    badge: "bg-emerald-100 text-emerald-800 ring-emerald-200",
    dot: "bg-emerald-500",
    panel: "from-emerald-500/15 to-lime-500/10",
  },
  REFUSED: {
    badge: "bg-rose-100 text-rose-800 ring-rose-200",
    dot: "bg-rose-500",
    panel: "from-rose-500/15 to-red-500/10",
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

function getStatusLabel(status) {
  const labels = {
    PENDING: "En attente",
    ACCEPTED: "Acceptée",
    REFUSED: "Refusée",
  };
  return labels[status] || status;
}

function getStatusTheme(status, dark) {
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
  return statusThemes[status] || fallback;
}

function getEmployeeName(requestItem) {
  return (
    `${requestItem.employee?.first_name || ""} ${requestItem.employee?.last_name || ""}`.trim() ||
    requestItem.employee_email ||
    "-"
  );
}

const ROLE_LABELS = {
  CHEF: "Chef de service",
  RH_SIMPLE: "RH Congé",
  RH_AGENT: "RH Congé",
  GRH: "DRH",
};

function getStepLabel(step) {
  if (!step) return "Aucune étape active";
  const roleLabel = ROLE_LABELS[step.validator_role] || step.validator_role;
  return `Étape ${step.validation_order} - ${roleLabel}`;
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

const globalStatusLabels = {
  PENDING: "En attente",
  ACCEPTED: "Acceptée",
  REFUSED: "Refusée",
};

const globalStatusThemes = {
  PENDING: "bg-amber-100 text-amber-800 ring-amber-200",
  ACCEPTED: "bg-emerald-100 text-emerald-800 ring-emerald-200",
  REFUSED: "bg-rose-100 text-rose-800 ring-rose-200",
};

export default function RhLeaves() {
  const [dark, setDark] = useDarkModePreference();
  const [isNavOpen, setIsNavOpen] = usePersistentNavState();
  const [activeTab, setActiveTab] = useState("validation");
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState(null);
  const [feedback, setFeedback] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [decisionTarget, setDecisionTarget] = useState(null);
  const [decisionAction, setDecisionAction] = useState("approve");
  const [decisionComment, setDecisionComment] = useState("");
  const [allLeaves, setAllLeaves] = useState([]);
  const [allLeavesLoading, setAllLeavesLoading] = useState(false);
  const [globalFilter, setGlobalFilter] = useState("");
  const [absences, setAbsences] = useState([]);
  const [absencesLoading, setAbsencesLoading] = useState(false);
  const [absenceActionId, setAbsenceActionId] = useState(null);
  const [absenceReviewModal, setAbsenceReviewModal] = useState(null);
  const [absenceReviewAction, setAbsenceReviewAction] = useState("accept");
  const [absenceReviewNote, setAbsenceReviewNote] = useState("");
  const [absenceMsg, setAbsenceMsg] = useState("");
  const [absenceSearch, setAbsenceSearch] = useState("");
  const [absenceStatusFilter, setAbsenceStatusFilter] = useState("");

  const pendingRequests = requests.filter((item) => item.status === "PENDING");
  const fieldClassName = `w-full rounded-2xl border px-4 py-3 text-sm outline-none transition ${
    dark
      ? "border-slate-700 bg-slate-950/80 text-slate-100 placeholder:text-slate-500 focus:border-emerald-400"
      : "border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-emerald-500"
  }`;

  const fetchRequests = async () => {
    try {
      setLoading(true);
      setErrorMessage("");
      const [meResponse, response] = await Promise.all([
        axios.get("/api/whoami/"),
        axios.get("/api/leaves/department/"),
      ]);
      setRequests(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error("Erreur chargement validation RH des congés :", error);
      setRequests([]);
      setErrorMessage("Impossible de charger les demandes RH.");
    } finally {
      setLoading(false);
    }
  };

  const fetchAllLeaves = async () => {
    try {
      setAllLeavesLoading(true);
      const res = await axios.get("/api/leaves/all/");
      setAllLeaves(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Erreur chargement congés globaux:", err);
      setAllLeaves([]);
    } finally {
      setAllLeavesLoading(false);
    }
  };

  const fetchAbsences = async () => {
    try {
      setAbsencesLoading(true);
      const res = await axios.get("/api/absences/rh/");
      setAbsences(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Erreur chargement absences:", err);
      setAbsences([]);
    } finally {
      setAbsencesLoading(false);
    }
  };

  const warnEmployee = async (absence) => {
    try {
      setAbsenceActionId(`warn-${absence.employee_id}-${absence.date}`);
      setAbsenceMsg("");
      await axios.post("/api/warnings/", { employee_id: absence.employee_id, date: absence.date });
      setAbsenceMsg(`Avertissement envoyé à ${absence.employee_name}.`);
    } catch (err) {
      setAbsenceMsg(err?.response?.data?.detail || "Erreur lors de l'avertissement.");
    } finally {
      setAbsenceActionId(null);
    }
  };

  const submitAbsenceReview = async () => {
    if (!absenceReviewModal) return;
    try {
      setAbsenceActionId(`review-${absenceReviewModal.justification_id}`);
      setAbsenceMsg("");
      await axios.post(`/api/absences/${absenceReviewModal.justification_id}/${absenceReviewAction}/`, { note: absenceReviewNote });
      setAbsenceMsg(absenceReviewAction === "accept" ? "Justification acceptée." : "Justification refusée.");
      setAbsenceReviewModal(null);
      await fetchAbsences();
    } catch (err) {
      setAbsenceMsg(err?.response?.data?.detail || "Erreur.");
    } finally {
      setAbsenceActionId(null);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  useEffect(() => {
    if (activeTab === "global") fetchAllLeaves();
    if (activeTab === "absences") fetchAbsences();
  }, [activeTab]);

  const stats = useMemo(() => {
    const pending = requests.filter((item) => item.status === "PENDING").length;
    const accepted = requests.filter((item) => item.status === "ACCEPTED").length;
    const refused = requests.filter((item) => item.status === "REFUSED").length;
    return { total: requests.length, pending, accepted, refused };
  }, [requests]);

  const filteredAllLeaves = useMemo(() => {
    if (!globalFilter) return allLeaves;
    const q = globalFilter.toLowerCase();
    return allLeaves.filter(
      (l) =>
        `${l.employee?.first_name} ${l.employee?.last_name}`.toLowerCase().includes(q) ||
        (l.employee?.service || "").toLowerCase().includes(q) ||
        (l.type_label || "").toLowerCase().includes(q),
    );
  }, [allLeaves, globalFilter]);

  const filteredAbsences = useMemo(() => {
    return absences.filter((ab) => {
      if (absenceStatusFilter && ab.justification_status !== absenceStatusFilter) return false;
      if (absenceSearch) {
        const q = absenceSearch.toLowerCase();
        return (
          (ab.employee_name || "").toLowerCase().includes(q) ||
          (ab.service || "").toLowerCase().includes(q) ||
          (ab.employee_email || "").toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [absences, absenceSearch, absenceStatusFilter]);

  const absenceStats = useMemo(() => ({
    non_justifie: absences.filter(a => a.justification_status === "NON_JUSTIFIE").length,
    en_cours: absences.filter(a => a.justification_status === "EN_COURS").length,
    justifie: absences.filter(a => a.justification_status === "JUSTIFIE").length,
    non_accepte: absences.filter(a => a.justification_status === "NON_ACCEPTE").length,
  }), [absences]);

  const openDecisionModal = (requestItem, action) => {
    setDecisionTarget(requestItem);
    setDecisionAction(action);
    setDecisionComment("");
    setFeedback("");
    setErrorMessage("");
  };

  const closeDecisionModal = () => {
    if (actionId) return;
    setDecisionTarget(null);
    setDecisionComment("");
  };

  const submitDecision = async () => {
    if (!decisionTarget) return;

    try {
      setActionId(decisionTarget.id);
      setFeedback("");
      setErrorMessage("");
      await axios.post(`/api/leaves/${decisionTarget.id}/${decisionAction}/`, {
        comment: decisionComment,
      });
      setFeedback(
        decisionAction === "approve"
          ? "Demande RH validée avec succès."
          : "Demande RH refusée avec succès.",
      );
      closeDecisionModal();
      await fetchRequests();
    } catch (error) {
      console.error("Erreur décision RH congé :", error);
      setErrorMessage(error?.response?.data?.detail || "Impossible de traiter cette demande.");
    } finally {
      setActionId(null);
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
              <h1 className="monprofile">Congés RH</h1>
              <p className="morinfo">
                Traitez les demandes de congés et consultez les absences globales de tous les employés.
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
          <div className={`flex gap-2 rounded-[20px] border p-1.5 ${dark ? "border-slate-800 bg-slate-900/80" : "border-slate-200 bg-white/80"}`}>
            {[
              { key: "validation", label: "Validation des congés" },
              { key: "global", label: "Tous les congés" },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`rounded-[14px] px-5 py-2.5 text-sm font-semibold transition ${
                  activeTab === tab.key
                    ? dark
                      ? "bg-slate-700 text-slate-50"
                      : "bg-slate-900 text-white"
                    : dark
                      ? "text-slate-400 hover:text-slate-200"
                      : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === "absences_disabled_removed" && (
            <div className="flex flex-col gap-6">
              <section className={`rounded-[32px] border p-6 shadow-sm ${dark ? "border-slate-800 bg-slate-900/90 shadow-black/20" : "border-white/80 bg-white/90 shadow-slate-200/70"}`}>
                <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">Vue globale</p>
                    <h2 className={`mt-2 text-2xl font-black ${dark ? "text-slate-50" : "text-slate-900"}`}>Absences globales</h2>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                      Tous les jours ouvrables sans pointage sur 60 jours. Chaque ligne = un jour d'absence d'un employé.
                    </p>
                  </div>
                  <button type="button" onClick={fetchAbsences} className={`rounded-full px-5 py-2.5 text-sm font-semibold transition ${dark ? "bg-slate-800 text-slate-100 hover:bg-slate-700" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}>
                    Actualiser
                  </button>
                </div>

                {/* stats chips */}
                {!absencesLoading && absences.length > 0 && (
                  <div className="mb-5 flex flex-wrap gap-2">
                    {[
                      { key: "", label: `Tout (${absences.length})`, theme: dark ? "bg-slate-800 text-slate-200" : "bg-slate-100 text-slate-700" },
                      { key: "NON_JUSTIFIE", label: `Non justifié (${absenceStats.non_justifie})`, theme: "bg-rose-100 text-rose-800" },
                      { key: "EN_COURS", label: `En cours (${absenceStats.en_cours})`, theme: "bg-amber-100 text-amber-800" },
                      { key: "JUSTIFIE", label: `Justifié (${absenceStats.justifie})`, theme: "bg-emerald-100 text-emerald-800" },
                      { key: "NON_ACCEPTE", label: `Non accepté (${absenceStats.non_accepte})`, theme: "bg-slate-100 text-slate-600" },
                    ].map(chip => (
                      <button key={chip.key} type="button"
                        onClick={() => setAbsenceStatusFilter(chip.key)}
                        className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ring-2 ${chip.theme} ${absenceStatusFilter === chip.key ? "ring-slate-500" : "ring-transparent"}`}>
                        {chip.label}
                      </button>
                    ))}
                  </div>
                )}

                {/* search */}
                <div className="mb-4">
                  <input type="text" value={absenceSearch} onChange={e => setAbsenceSearch(e.target.value)}
                    placeholder="Filtrer par employé ou service..."
                    className={`w-full max-w-sm rounded-2xl border px-4 py-2.5 text-sm outline-none transition ${dark ? "border-slate-700 bg-slate-950/80 text-slate-100 placeholder:text-slate-500 focus:border-sky-400" : "border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-sky-500"}`}
                  />
                </div>

                {absenceMsg && (
                  <div className={`mb-4 rounded-[20px] border px-4 py-3 text-sm font-medium ${dark ? "border-sky-800 bg-sky-950/40 text-sky-100" : "border-sky-200 bg-sky-50 text-sky-800"}`}>
                    {absenceMsg}
                  </div>
                )}

                {absencesLoading ? (
                  <div className="grid gap-3">{[1,2,3,4].map(i => <div key={i} className={`h-14 animate-pulse rounded-[20px] ${dark ? "bg-slate-800/70" : "bg-slate-100"}`} />)}</div>
                ) : filteredAbsences.length === 0 ? (
                  <div className={`rounded-[24px] border border-dashed px-6 py-10 text-center ${dark ? "border-slate-700 bg-slate-950/40" : "border-slate-200 bg-slate-50"}`}>
                    <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Aucun résultat</p>
                    <h3 className={`mt-2 text-xl font-black ${dark ? "text-slate-50" : "text-slate-900"}`}>
                      {absences.length === 0 ? "Aucune absence détectée sur 60 jours." : "Aucune absence ne correspond aux filtres."}
                    </h3>
                  </div>
                ) : (
                  <div className={`overflow-x-auto rounded-[24px] border ${dark ? "border-slate-800" : "border-slate-200"}`}>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className={dark ? "bg-slate-800/60" : "bg-slate-50"}>
                          {["Employé", "Service", "Date", "Statut", "Actions"].map(h => (
                            <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredAbsences.map((ab) => {
                          const jStatus = ab.justification_status;
                          const statusLabels = { NON_JUSTIFIE: "Non justifié", EN_COURS: "En cours", JUSTIFIE: "Justifié", NON_ACCEPTE: "Non acceptée" };
                          const statusTheme = {
                            NON_JUSTIFIE: "bg-rose-100 text-rose-800 ring-rose-200",
                            EN_COURS: "bg-amber-100 text-amber-800 ring-amber-200",
                            JUSTIFIE: "bg-emerald-100 text-emerald-800 ring-emerald-200",
                            NON_ACCEPTE: "bg-slate-100 text-slate-600 ring-slate-200",
                          };
                          const rowKey = `${ab.employee_id}-${ab.date}`;
                          const isActing = absenceActionId === `warn-${ab.employee_id}-${ab.date}`;
                          return (
                            <tr key={rowKey} className={`border-t transition ${dark ? "border-slate-800 hover:bg-slate-800/40" : "border-slate-100 hover:bg-slate-50"}`}>
                              <td className={`px-4 py-3 font-semibold ${dark ? "text-slate-100" : "text-slate-900"}`}>{ab.employee_name || ab.employee_email}</td>
                              <td className="px-4 py-3 text-slate-500">{ab.service || "-"}</td>
                              <td className={`px-4 py-3 font-medium ${dark ? "text-slate-200" : "text-slate-700"}`}>{formatDate(ab.date)}</td>
                              <td className="px-4 py-3">
                                <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${statusTheme[jStatus] || statusTheme.NON_JUSTIFIE}`}>
                                  {statusLabels[jStatus] || jStatus}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex flex-wrap gap-2">
                                  {jStatus === "NON_JUSTIFIE" && (
                                    <button type="button" disabled={isActing} onClick={() => warnEmployee(ab)}
                                      className="rounded-full bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-rose-500 disabled:opacity-60">
                                      {isActing ? "..." : "Avertir l'employé"}
                                    </button>
                                  )}
                                  {jStatus === "EN_COURS" && (
                                    <div className="flex flex-wrap gap-2">
                                      {ab.document_url && (
                                        <a href={ab.document_url} target="_blank" rel="noreferrer"
                                          className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${dark ? "bg-slate-700 text-slate-100 hover:bg-slate-600" : "bg-slate-200 text-slate-700 hover:bg-slate-300"}`}>
                                          Voir le document
                                        </a>
                                      )}
                                      <button type="button"
                                        onClick={() => { setAbsenceReviewModal(ab); setAbsenceReviewAction("accept"); setAbsenceReviewNote(""); setAbsenceMsg(""); }}
                                        className="rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-500">
                                        Accepter
                                      </button>
                                      <button type="button"
                                        onClick={() => { setAbsenceReviewModal(ab); setAbsenceReviewAction("refuse"); setAbsenceReviewNote(""); setAbsenceMsg(""); }}
                                        className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${dark ? "border-slate-600 text-slate-200 hover:border-rose-500 hover:text-rose-300" : "border-slate-300 text-slate-600 hover:border-rose-400 hover:text-rose-600"}`}>
                                        Refuser
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </div>
          )}

          {activeTab === "global" && (
            <div className="flex flex-col gap-6">
              <section className={`rounded-[32px] border p-6 shadow-sm ${dark ? "border-slate-800 bg-slate-900/90 shadow-black/20" : "border-white/80 bg-white/90 shadow-slate-200/70"}`}>
                <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">Vue globale</p>
                    <h2 className={`mt-2 text-2xl font-black ${dark ? "text-slate-50" : "text-slate-900"}`}>Absences globales</h2>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                      Toutes les demandes de congés de l'ensemble des employés, tous services confondus.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={fetchAllLeaves}
                    className={`rounded-full px-5 py-2.5 text-sm font-semibold transition ${dark ? "bg-slate-800 text-slate-100 hover:bg-slate-700" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}
                  >
                    Actualiser
                  </button>
                </div>

                <div className="mb-5">
                  <input
                    type="text"
                    value={globalFilter}
                    onChange={(e) => setGlobalFilter(e.target.value)}
                    placeholder="Filtrer par employé, service ou type..."
                    className={`w-full max-w-sm rounded-2xl border px-4 py-2.5 text-sm outline-none transition ${dark ? "border-slate-700 bg-slate-950/80 text-slate-100 placeholder:text-slate-500 focus:border-sky-400" : "border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-sky-500"}`}
                  />
                </div>

                {allLeavesLoading ? (
                  <div className="grid gap-3">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className={`h-16 animate-pulse rounded-[20px] ${dark ? "bg-slate-800/70" : "bg-slate-100"}`} />
                    ))}
                  </div>
                ) : filteredAllLeaves.length === 0 ? (
                  <div className={`rounded-[24px] border border-dashed px-6 py-10 text-center ${dark ? "border-slate-700 bg-slate-950/40" : "border-slate-200 bg-slate-50"}`}>
                    <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Aucun résultat</p>
                    <h3 className={`mt-2 text-xl font-black ${dark ? "text-slate-50" : "text-slate-900"}`}>Aucune absence trouvée.</h3>
                  </div>
                ) : (
                  <div className={`overflow-x-auto rounded-[24px] border ${dark ? "border-slate-800" : "border-slate-200"}`}>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className={dark ? "bg-slate-800/60" : "bg-slate-50"}>
                          {["Employé", "Service", "Type", "Début", "Fin", "Statut"].map((h) => (
                            <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredAllLeaves.map((l) => (
                          <tr
                            key={l.id}
                            className={`border-t transition ${dark ? "border-slate-800 hover:bg-slate-800/50" : "border-slate-100 hover:bg-slate-50"}`}
                          >
                            <td className={`px-4 py-3 font-medium ${dark ? "text-slate-100" : "text-slate-900"}`}>
                              {`${l.employee?.first_name || ""} ${l.employee?.last_name || ""}`.trim() || l.employee?.email || "-"}
                            </td>
                            <td className="px-4 py-3 text-slate-500">{l.employee?.service || "-"}</td>
                            <td className="px-4 py-3 text-slate-500">{l.type_label || l.type || "-"}</td>
                            <td className="px-4 py-3 text-slate-500">{formatDate(l.start_date)}</td>
                            <td className="px-4 py-3 text-slate-500">{formatDate(l.end_date)}</td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${globalStatusThemes[l.status] || "bg-slate-100 text-slate-700 ring-slate-200"}`}>
                                {globalStatusLabels[l.status] || l.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </div>
          )}

          {activeTab === "validation" && (
            <>
            {/* Compact stats bar */}
            <div style={{ borderRadius: 20, background: dark ? "linear-gradient(135deg,#0f172a,#1e3a5f)" : "linear-gradient(135deg,#1e40af,#2563eb)", padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap", boxShadow: "0 4px 24px rgba(37,99,235,0.25)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                <div>
                  <span style={{ fontSize: 40, fontWeight: 900, color: "#fff", lineHeight: 1 }}>{stats.total}</span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.55)", marginLeft: 10 }}>demandes</span>
                </div>
                <div style={{ width: 1, height: 40, background: "rgba(255,255,255,0.15)" }} />
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {[
                    { count: stats.pending,  label: "en attente", bg: "rgba(251,191,36,0.2)",  border: "rgba(251,191,36,0.5)",  color: "#fbbf24" },
                    { count: stats.accepted, label: "acceptées",  bg: "rgba(34,197,94,0.2)",   border: "rgba(34,197,94,0.5)",   color: "#4ade80" },
                    { count: stats.refused,  label: "refusées",   bg: "rgba(239,68,68,0.18)",  border: "rgba(239,68,68,0.45)",  color: "#f87171" },
                  ].map(p => (
                    <div key={p.label} style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "8px 18px", borderRadius: 14, background: p.bg, border: `1px solid ${p.border}`, minWidth: 80 }}>
                      <span style={{ fontSize: 26, fontWeight: 900, color: p.color, lineHeight: 1 }}>{p.count}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.6)", textTransform: "uppercase", letterSpacing: "0.08em", marginTop: 3 }}>{p.label}</span>
                    </div>
                  ))}
                </div>
              </div>
              <button type="button" onClick={fetchRequests} style={{ padding: "10px 20px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.25)", background: "rgba(255,255,255,0.1)", fontSize: 13, fontWeight: 700, cursor: "pointer", color: "#fff", backdropFilter: "blur(4px)" }}>
                ↺ Actualiser
              </button>
            </div>

          {(feedback || errorMessage) && (
            <div
              className={`rounded-[24px] border px-5 py-4 text-sm font-medium shadow-sm ${
                errorMessage
                  ? dark
                    ? "border-rose-800 bg-rose-950/40 text-rose-100"
                    : "border-rose-200 bg-rose-50 text-rose-800"
                  : dark
                    ? "border-emerald-800 bg-emerald-950/40 text-emerald-100"
                    : "border-emerald-200 bg-emerald-50 text-emerald-800"
              }`}
            >
              {errorMessage || feedback}
            </div>
          )}

          <section className={`rounded-[24px] border shadow-sm ${dark ? "border-slate-800 bg-slate-900/90" : "border-white/80 bg-white/90"}`}>
              <div className={`flex items-center justify-between gap-4 px-5 py-3 border-b ${dark ? "border-slate-800 bg-slate-950/60" : "border-slate-100 bg-slate-50/80"}`} style={{ borderRadius: "24px 24px 0 0" }}>
                <div>
                  <h2 className={`text-sm font-black ${dark ? "text-slate-50" : "text-slate-900"}`}>File de validation</h2>
                  <p className="text-xs text-slate-500">{loading ? "Chargement..." : `${requests.length} demande${requests.length > 1 ? "s" : ""} dans votre périmètre`}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${pendingRequests.length > 0 ? "bg-amber-100 text-amber-800" : (dark ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-600")}`}>
                  {pendingRequests.length} en attente
                </span>
              </div>

              {loading ? (
                <div className="grid gap-3 p-4">{[1,2,3].map(i => <div key={i} className={`h-16 animate-pulse rounded-2xl ${dark ? "bg-slate-800/70" : "bg-slate-100"}`} />)}</div>
              ) : requests.length === 0 ? (
                <div className="px-6 py-10 text-center">
                  <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Aucune demande</p>
                  <h3 className={`mt-2 text-lg font-black ${dark ? "text-slate-50" : "text-slate-900"}`}>Aucune demande RH visible.</h3>
                </div>
              ) : (
                <div className="grid gap-3 p-4">
                  {requests.map((requestItem) => {
                    const canDecide = !!requestItem.can_decide && requestItem.status === "PENDING";
                    const theme = getStatusTheme(requestItem.status, dark);

                    return (
                      <article key={requestItem.id} className={`rounded-2xl border p-4 transition ${dark ? "border-slate-800 bg-slate-950/65 hover:border-slate-700" : "border-slate-200 bg-slate-50/80 hover:border-slate-300"}`}>
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <span className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${theme.dot}`} />
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className={`text-sm font-black ${dark ? "text-slate-50" : "text-slate-900"}`}>{getEmployeeName(requestItem)}</h3>
                                <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${theme.badge}`}>{getStatusLabel(requestItem.status)}</span>
                              </div>
                              <p className="text-xs text-slate-500 mt-0.5">
                                {requestItem.type_label || requestItem.type || "-"} · {formatDate(requestItem.start_date)} → {formatDate(requestItem.end_date)}
                                {requestItem.employee?.service ? ` · ${requestItem.employee.service}` : ""}
                              </p>
                              {requestItem.reason && <p className="text-xs text-slate-400 mt-0.5 truncate max-w-lg">{requestItem.reason}</p>}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className={`text-xs px-2.5 py-1 rounded-full ${dark ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-600"}`}>
                              {getStepLabel(requestItem.current_step)}
                            </span>
                            {canDecide ? (
                              <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">Action requise</span>
                            ) : null}
                          </div>
                        </div>

                        <div className="mt-3 flex items-center gap-2 flex-wrap">
                          {requestItem.chef_comment && (
                            <span className={`text-xs px-2.5 py-1 rounded-full ${dark ? "bg-slate-800 text-slate-400" : "bg-slate-100 text-slate-500"}`}>
                              Chef: {requestItem.chef_comment}
                            </span>
                          )}
                          {requestItem.decided_by && (
                            <span className="text-xs text-slate-400">Décidé par: {requestItem.decided_by?.email || requestItem.decided_by}</span>
                          )}
                          <div className="ml-auto flex gap-2">
                            {requestItem.attachment && (
                              <a href={requestItem.attachment} target="_blank" rel="noreferrer"
                                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${dark ? "border-sky-700 bg-sky-950/40 text-sky-300 hover:bg-sky-900/60" : "border-sky-300 bg-sky-50 text-sky-700 hover:bg-sky-100"}`}>
                                📎 Justificatif
                              </a>
                            )}
                            {canDecide && (
                              <>
                                <button type="button" onClick={() => openDecisionModal(requestItem, "approve")}
                                  className="rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 transition">
                                  Valider
                                </button>
                                <button type="button" onClick={() => openDecisionModal(requestItem, "refuse")}
                                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${dark ? "border-slate-600 text-slate-200 hover:border-rose-500 hover:text-rose-300" : "border-slate-300 text-slate-600 hover:border-rose-400 hover:text-rose-600"}`}>
                                  Refuser
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
            </>
          )}
        </div>
      </div>

      {decisionTarget ? (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/60 px-4 py-6 backdrop-blur-sm"
          onClick={closeDecisionModal}
        >
          <div
            className={`w-full max-w-2xl rounded-[32px] border p-6 shadow-2xl ${
              dark ? "border-slate-800 bg-slate-900 text-slate-100" : "border-white bg-white text-slate-900"
            }`}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                  {decisionAction === "approve" ? "Validation" : "Refus"}
                </p>
                <h3 className="mt-2 text-2xl font-black">
                  {decisionAction === "approve" ? "Confirmer la validation" : "Confirmer le refus"}
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  {getEmployeeName(decisionTarget)} • {decisionTarget.type_label || decisionTarget.type || "-"} •{" "}
                  {formatDate(decisionTarget.start_date)} au {formatDate(decisionTarget.end_date)}
                </p>
              </div>

              <button
                type="button"
                onClick={closeDecisionModal}
                className={`rounded-full px-4 py-2 text-sm font-semibold ${
                  dark ? "bg-slate-800 text-slate-100 hover:bg-slate-700" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                Fermer
              </button>
            </div>

            <div className={`mt-6 rounded-[24px] p-4 ${dark ? "bg-slate-950/70" : "bg-slate-50"}`}>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Commentaire {decisionAction === "approve" ? "de validation" : "de refus"}
              </p>
              <textarea
                rows={5}
                value={decisionComment}
                onChange={(event) => setDecisionComment(event.target.value)}
                className={`${fieldClassName} mt-3 resize-y`}
                placeholder={
                  decisionAction === "approve"
                    ? "Commentaire RH optionnel..."
                    : "Motif RH du refus optionnel..."
                }
              />
            </div>

            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={closeDecisionModal}
                disabled={!!actionId}
                className={`rounded-full border px-5 py-3 text-sm font-semibold ${
                  dark ? "border-slate-700 bg-slate-900 text-slate-100" : "border-slate-300 bg-white text-slate-700"
                } disabled:cursor-not-allowed disabled:opacity-60`}
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={submitDecision}
                disabled={!!actionId}
                className={`rounded-full px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60 ${
                  decisionAction === "approve" ? "bg-emerald-600 hover:bg-emerald-500" : "bg-rose-600 hover:bg-rose-500"
                }`}
              >
                {actionId ? "Enregistrement..." : decisionAction === "approve" ? "Confirmer la validation" : "Confirmer le refus"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {absenceReviewModal && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/60 px-4 py-6 backdrop-blur-sm"
          onClick={() => { if (!absenceActionId) setAbsenceReviewModal(null); }}>
          <div className={`w-full max-w-lg rounded-[32px] border p-6 shadow-2xl ${dark ? "border-slate-800 bg-slate-900 text-slate-100" : "border-white bg-white text-slate-900"}`}
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                  {absenceReviewAction === "accept" ? "Accepter la justification" : "Refuser la justification"}
                </p>
                <h3 className="mt-2 text-xl font-black">{absenceReviewModal.employee_name}</h3>
                <p className="mt-1 text-sm text-slate-500">{formatDate(absenceReviewModal.date)} • {absenceReviewModal.service || "-"}</p>
              </div>
              <button type="button" onClick={() => setAbsenceReviewModal(null)}
                className={`rounded-full px-4 py-2 text-sm font-semibold ${dark ? "bg-slate-800 text-slate-100 hover:bg-slate-700" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}>
                Fermer
              </button>
            </div>

            {absenceReviewModal.document_url && (
              <div className={`mt-4 rounded-[20px] p-4 ${dark ? "bg-slate-950/70" : "bg-slate-50"}`}>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 mb-2">Document soumis</p>
                <a href={absenceReviewModal.document_url} target="_blank" rel="noreferrer"
                  className="inline-flex rounded-full bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-500">
                  Voir le document
                </a>
              </div>
            )}

            <div className={`mt-4 rounded-[20px] p-4 ${dark ? "bg-slate-950/70" : "bg-slate-50"}`}>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Note</p>
              <textarea
                rows={3}
                value={absenceReviewNote}
                onChange={(e) => setAbsenceReviewNote(e.target.value)}
                className={`${fieldClassName} mt-2 resize-y`}
                placeholder="Note optionnelle..."
              />
            </div>

            <div className="mt-5 flex flex-wrap justify-end gap-3">
              <button type="button" onClick={() => setAbsenceReviewModal(null)} disabled={!!absenceActionId}
                className={`rounded-full border px-5 py-3 text-sm font-semibold ${dark ? "border-slate-700 bg-slate-900 text-slate-100" : "border-slate-300 bg-white text-slate-700"} disabled:opacity-60`}>
                Annuler
              </button>
              <button type="button" onClick={submitAbsenceReview} disabled={!!absenceActionId}
                className={`rounded-full px-5 py-3 text-sm font-semibold text-white disabled:opacity-60 ${absenceReviewAction === "accept" ? "bg-emerald-600 hover:bg-emerald-500" : "bg-rose-600 hover:bg-rose-500"}`}>
                {absenceActionId ? "..." : absenceReviewAction === "accept" ? "Confirmer l'acceptation" : "Confirmer le refus"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
