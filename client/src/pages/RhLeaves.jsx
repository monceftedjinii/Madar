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

export default function RhLeaves() {
  const [dark, setDark] = useDarkModePreference();
  const [isNavOpen, setIsNavOpen] = usePersistentNavState();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState(null);
  const [feedback, setFeedback] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [decisionTarget, setDecisionTarget] = useState(null);
  const [decisionAction, setDecisionAction] = useState("approve");
  const [decisionComment, setDecisionComment] = useState("");

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

  useEffect(() => {
    fetchRequests();
  }, []);

  const stats = useMemo(() => {
    const pending = requests.filter((item) => item.status === "PENDING").length;
    const accepted = requests.filter((item) => item.status === "ACCEPTED").length;
    const refused = requests.filter((item) => item.status === "REFUSED").length;
    return { total: requests.length, pending, accepted, refused };
  }, [requests]);

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
              <h1 className="monprofile">Validation RH des congés</h1>
              <p className="morinfo">
                Traitez les demandes validées par le directeur de direction. La décision RH clôture le congé.
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
              <div className="relative overflow-hidden rounded-[30px] border border-sky-300/20 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.22),_transparent_40%),linear-gradient(135deg,#0f172a_0%,#13213c_45%,#165c75_100%)] p-6 text-white shadow-2xl shadow-sky-950/20">
                <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
                <div className="absolute bottom-0 right-0 h-28 w-28 rounded-tl-[40px] border-l border-t border-white/10 bg-white/5" />
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-sky-200/80">
                  Hub validation RH
                </p>
                <h2 className="mt-4 max-w-xl text-3xl font-black leading-tight md:text-4xl">
                  Une lecture plus nette des demandes de congés avant validation ou refus.
                </h2>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-200">
                  Les demandes actives sont maintenant présentées sous forme de cartes détaillées avec l'étape en cours,
                  la période, le type, le service et un panneau de décision plus propre que l'ancien prompt navigateur.
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={fetchRequests}
                    className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-sky-50"
                  >
                    Actualiser les demandes
                  </button>
                  <div className="rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-medium text-slate-100">
                    {pendingRequests.length} demande{pendingRequests.length > 1 ? "s" : ""} en attente
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <MetricCard
                  dark={dark}
                  eyebrow="Total"
                  value={stats.total}
                  helper="Demandes visibles dans votre périmètre"
                  accent="from-sky-400 via-cyan-500 to-blue-500"
                />
                <MetricCard
                  dark={dark}
                  eyebrow="En attente"
                  value={stats.pending}
                  helper="Demandes encore decisionnelles"
                  accent="from-amber-400 via-orange-500 to-rose-500"
                />
                <MetricCard
                  dark={dark}
                  eyebrow="Acceptées"
                  value={stats.accepted}
                  helper="Demandes déjà validées"
                  accent="from-emerald-400 via-emerald-500 to-lime-500"
                />
                <MetricCard
                  dark={dark}
                  eyebrow="Refusées"
                  value={stats.refused}
                  helper="Demandes clôturées par refus"
                  accent="from-rose-400 via-rose-500 to-red-500"
                />
              </div>
            </div>
          </section>

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

          <div className="grid gap-6 xl:grid-cols-[1.45fr_0.92fr]">
            <section
              className={`rounded-[32px] border p-6 shadow-sm ${
                dark ? "border-slate-800 bg-slate-900/90 shadow-black/20" : "border-white/80 bg-white/90 shadow-slate-200/70"
              }`}
            >
              <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">Demandes de congés</p>
                  <h2 className={`mt-2 text-2xl font-black ${dark ? "text-slate-50" : "text-slate-900"}`}>
                    File de validation
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                    Chaque carte présente le collaborateur, la période demandée, le type, le motif et l'étape de workflow.
                  </p>
                </div>
                <div
                  className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] ${
                    dark ? "bg-slate-800 text-slate-200" : "bg-slate-100 text-slate-700"
                  }`}
                >
                  {loading ? "Chargement..." : `${requests.length} element${requests.length > 1 ? "s" : ""}`}
                </div>
              </div>

              {loading ? (
                <div className="grid gap-4">
                  {[1, 2, 3].map((item) => (
                    <div
                      key={item}
                      className={`h-48 animate-pulse rounded-[28px] ${
                        dark ? "bg-slate-800/70" : "bg-slate-100"
                      }`}
                    />
                  ))}
                </div>
              ) : requests.length === 0 ? (
                <div
                  className={`rounded-[28px] border border-dashed px-6 py-12 text-center ${
                    dark ? "border-slate-700 bg-slate-950/40" : "border-slate-200 bg-slate-50"
                  }`}
                >
                  <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Aucune demande</p>
                  <h3 className={`mt-3 text-2xl font-black ${dark ? "text-slate-50" : "text-slate-900"}`}>
                    Aucune demande RH visible pour le moment.
                  </h3>
                  <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-500">
                    Les nouvelles demandes apparaîtront ici avec leur étape de workflow et les actions de validation disponibles.
                  </p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {requests.map((requestItem) => {
                    const canDecide = !!requestItem.can_decide && requestItem.status === "PENDING";
                    const theme = getStatusTheme(requestItem.status, dark);

                    return (
                      <article
                        key={requestItem.id}
                        className={`rounded-[28px] border p-5 transition ${
                          dark ? "border-slate-800 bg-slate-950/65 hover:border-slate-700" : "border-slate-200 bg-slate-50/70 hover:border-slate-300"
                        }`}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div className="max-w-3xl">
                            <div className="flex flex-wrap items-center gap-3">
                              <span className={`h-3 w-3 rounded-full ${theme.dot}`} />
                              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                                Demande #{requestItem.id}
                              </p>
                              <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ${theme.badge}`}>
                                {getStatusLabel(requestItem.status)}
                              </span>
                            </div>
                            <h3 className={`mt-3 text-xl font-black ${dark ? "text-slate-50" : "text-slate-900"}`}>
                              {getEmployeeName(requestItem)}
                            </h3>
                            <p className="mt-2 text-sm leading-6 text-slate-500">
                              {requestItem.type_label || requestItem.type || "-"} • {formatDate(requestItem.start_date)} au{" "}
                              {formatDate(requestItem.end_date)}
                            </p>
                          </div>

                          <div className={`min-w-[240px] rounded-[24px] bg-gradient-to-br p-4 ${theme.panel} ${dark ? "border border-slate-800" : "border border-white/70"}`}>
                            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Workflow</p>
                            <div className="mt-3 space-y-2 text-sm">
                              <div className="flex items-center justify-between gap-4">
                                <span className="text-slate-500">Service</span>
                                <span className={dark ? "text-slate-100" : "text-slate-900"}>{requestItem.employee?.service || "-"}</span>
                              </div>
                              <div className="flex items-center justify-between gap-4">
                                <span className="text-slate-500">Étape</span>
                                <span className={`text-right ${dark ? "text-slate-100" : "text-slate-900"}`}>
                                  {getStepLabel(requestItem.current_step)}
                                </span>
                              </div>
                              <div className="flex items-center justify-between gap-4">
                                <span className="text-slate-500">Decision</span>
                                <span className={dark ? "text-slate-100" : "text-slate-900"}>
                                  {canDecide ? "Action requise" : "Lecture seule"}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_1fr]">
                          <div className={`rounded-[22px] p-4 ${dark ? "bg-slate-900" : "bg-white"}`}>
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Motif</p>
                            <p className="mt-2 text-sm leading-6 text-slate-600">{requestItem.reason || "Aucun motif renseigné."}</p>
                          </div>

                          <div className={`rounded-[22px] p-4 ${dark ? "bg-slate-900" : "bg-white"}`}>
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Commentaires de validation</p>
                            <div className="mt-2 space-y-2 text-sm text-slate-600">
                              <p>
                                <span className="font-semibold text-slate-500">Chef:</span>{" "}
                                {requestItem.chef_comment || "Aucun commentaire"}
                              </p>
                              <p>
                                <span className="font-semibold text-slate-500">Décisionnaire :</span>{" "}
                                {requestItem.decided_by?.email || requestItem.decided_by || "-"}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-slate-200/10 pt-5">
                          <div className="text-sm text-slate-500">
                            {canDecide
                              ? "Cette demande attend votre arbitrage."
                              : "Cette demande n'est pas décisionnelle pour votre rôle ou son statut actuel."}
                          </div>

                          {canDecide ? (
                            <div className="flex flex-wrap gap-3">
                              <button
                                className="rounded-full bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
                                disabled={actionId === requestItem.id}
                                onClick={() => openDecisionModal(requestItem, "approve")}
                                type="button"
                              >
                                Valider
                              </button>
                              <button
                                className={`rounded-full border px-5 py-3 text-sm font-semibold transition ${
                                  dark
                                    ? "border-slate-700 bg-slate-900 text-slate-100 hover:border-rose-500 hover:text-rose-300"
                                    : "border-slate-300 bg-white text-slate-700 hover:border-rose-400 hover:text-rose-600"
                                } disabled:cursor-not-allowed disabled:opacity-60`}
                                disabled={actionId === requestItem.id}
                                onClick={() => openDecisionModal(requestItem, "reject")}
                                type="button"
                              >
                                Refuser
                              </button>
                            </div>
                          ) : null}
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
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Vue rapide</p>
                  <h2 className={`mt-2 text-2xl font-black ${dark ? "text-slate-50" : "text-slate-900"}`}>
                    Priorités du jour
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    Résumé des points qui demandent une action immédiate dans le circuit de congés.
                  </p>
                </div>

                <div className="mt-5 grid gap-3">
                  {[
                    {
                      label: "Demandes en attente",
                      value: stats.pending,
                      helper: "Arbitrages encore ouverts",
                    },
                    {
                      label: "Traitements RH",
                      value: pendingRequests.filter((item) => item.can_decide).length,
                      helper: "Actions directement disponibles",
                    },
                    {
                      label: "Période couverte",
                      value: requests.length ? formatDate(requests[0]?.created_at?.slice?.(0, 10)) : "-",
                      helper: "Date de la demande la plus récente visible",
                    },
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

              <section
                className={`rounded-[32px] border p-6 shadow-sm ${
                  dark ? "border-slate-800 bg-slate-900/90 shadow-black/20" : "border-white/80 bg-white/90 shadow-slate-200/70"
                }`}
              >
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Mode d'emploi</p>
                  <h2 className={`mt-2 text-2xl font-black ${dark ? "text-slate-50" : "text-slate-900"}`}>
                    Comment traiter une demande
                  </h2>
                </div>

                <div className="mt-5 grid gap-3">
                  {[
                    "Lisez la période, le type de congé et le motif avant toute décision.",
                    "Vérifiez l'étape courante pour confirmer que la demande est bien dans votre file.",
                    "Ajoutez un commentaire avant validation ou refus pour garder une trace claire.",
                  ].map((item) => (
                    <div
                      key={item}
                      className={`rounded-[22px] px-4 py-4 text-sm leading-6 ${
                        dark ? "bg-slate-950/70 text-slate-300" : "bg-slate-50 text-slate-600"
                      }`}
                    >
                      {item}
                    </div>
                  ))}
                </div>
              </section>
            </aside>
          </div>
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
    </div>
  );
}
