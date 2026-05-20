import NotificationBell from "../components/NotificationBell";
import { useEffect, useState } from "react";
import axios from "axios";
import Navbar from "../components/Navbar";
import useDarkModePreference from "../hooks/useDarkModePreference";
import usePersistentNavState from "../hooks/usePersistentNavState";
import { getRoleContext } from "../app/roleAccess";
import "../styles/profile.css";

const initialCatalogForm = {
  name: "",
  company_name: "",
  duration_hours: "",
  people_required: "",
  company_email: "",
  company_phone: "",
  company_address: "",
};

const statusThemes = {
  PENDING: {
    badge: "bg-amber-100 text-amber-800 ring-amber-200",
    dot: "bg-amber-500",
    panel: "from-amber-500/15 to-orange-500/10",
  },
  WAITING_FOR_PEOPLE: {
    badge: "bg-sky-100 text-sky-800 ring-sky-200",
    dot: "bg-sky-500",
    panel: "from-sky-500/15 to-cyan-500/10",
  },
  APPROVED: {
    badge: "bg-emerald-100 text-emerald-800 ring-emerald-200",
    dot: "bg-emerald-500",
    panel: "from-emerald-500/15 to-lime-500/10",
  },
  REJECTED: {
    badge: "bg-rose-100 text-rose-800 ring-rose-200",
    dot: "bg-rose-500",
    panel: "from-rose-500/15 to-red-500/10",
  },
};

function formatDate(value) {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return value;
  }
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

function FieldLabel({ children }) {
  return <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{children}</label>;
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

export default function RhFormations() {
  const [dark, setDark] = useDarkModePreference();
  const [isNavOpen, setIsNavOpen] = usePersistentNavState();
  const [requests, setRequests] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [catalogSearch, setCatalogSearch] = useState("");
  const [catalogForm, setCatalogForm] = useState(initialCatalogForm);
  const [selectedCatalogByRequest, setSelectedCatalogByRequest] = useState({});
  const [roleCtx, setRoleCtx] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [actionId, setActionId] = useState(null);
  const [feedback, setFeedback] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const canManageFormations = roleCtx.canViewRhFormations ?? (roleCtx.isRhFormation || roleCtx.isDrh) ?? false;
  const isGrh = roleCtx.isDrh ?? false;
  const pendingRequests = requests.filter((item) => item.status === "PENDING");
  const waitingRequests = requests.filter((item) => item.status === "WAITING_FOR_PEOPLE");
  const approvedRequests = requests.filter((item) => item.status === "APPROVED");

  const fieldClassName = `w-full rounded-2xl border px-4 py-3 text-sm outline-none transition ${
    dark
      ? "border-slate-700 bg-slate-950/80 text-slate-100 placeholder:text-slate-500 focus:border-emerald-400"
      : "border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-emerald-500"
  }`;

  const fetchData = async () => {
    try {
      setLoading(true);
      setErrorMessage("");
      const [meResponse, requestsResponse, catalogResponse] = await Promise.all([
        axios.get("/api/whoami/"),
        axios.get("/api/agent/formations/requests/"),
        axios.get("/api/agent/formations/catalog/"),
      ]);
      setRoleCtx(getRoleContext({ role: meResponse.data?.role, service: meResponse.data?.service, employee_role: meResponse.data?.employee_role }));
      setRequests(Array.isArray(requestsResponse.data) ? requestsResponse.data : []);
      setCatalog(Array.isArray(catalogResponse.data) ? catalogResponse.data : []);
    } catch (error) {
      console.error("Erreur chargement formations RH:", error);
      setRequests([]);
      setCatalog([]);
      setErrorMessage("Impossible de charger le module formations RH.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const createCatalogItem = async (event) => {
    event.preventDefault();
    if (!canManageFormations) return;

    try {
      setSubmitting(true);
      setFeedback("");
      setErrorMessage("");
      await axios.post("/api/agent/formations/catalog/", {
        ...catalogForm,
        duration_hours: Number(catalogForm.duration_hours),
        people_required: Number(catalogForm.people_required),
      });
      setFeedback("Formation catalogue creee avec succes.");
      setCatalogForm(initialCatalogForm);
      await fetchData();
    } catch (error) {
      console.error("Erreur creation catalogue RH:", error);
      setErrorMessage(error?.response?.data?.detail || "Impossible de creer cette formation.");
    } finally {
      setSubmitting(false);
    }
  };

  const decideRequest = async (requestId, action) => {
    try {
      setActionId(requestId);
      setFeedback("");
      setErrorMessage("");

      if (action === "approve") {
        const formationId = selectedCatalogByRequest[requestId];
        if (!formationId) {
          setErrorMessage("Selectionnez une formation du catalogue.");
          return;
        }
        await axios.post(`/api/agent/formations/requests/${requestId}/approve/`, {
          formation_id: formationId,
        });
        setFeedback("Demande de formation approuvee.");
      } else {
        await axios.post(`/api/agent/formations/requests/${requestId}/reject/`);
        setFeedback("Demande de formation refusee.");
      }

      await fetchData();
    } catch (error) {
      console.error("Erreur decision formation RH:", error);
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
              <h1 className="monprofile">{isGrh ? "Formations globales" : "Formations RH"}</h1>
              <p className="morinfo">
                {isGrh
                  ? "Supervisez les demandes, le catalogue et les arbitrages formation sur tout le perimetre."
                  : "Centralisez les demandes, associez le bon catalogue et gardez une vue nette du flux formation."}
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
              <div className="relative overflow-hidden rounded-[30px] border border-emerald-300/20 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.22),_transparent_42%),linear-gradient(135deg,#0f172a_0%,#122c2c_46%,#1f5f4a_100%)] p-6 text-white shadow-2xl shadow-emerald-950/20">
                <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
                <div className="absolute bottom-0 right-0 h-28 w-28 rounded-tl-[40px] border-l border-t border-white/10 bg-white/5" />
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-200/80">
                  {isGrh ? "Pilotage global" : "Hub formation RH"}
                </p>
                <h2 className="mt-4 max-w-xl text-3xl font-black leading-tight md:text-4xl">
                  Une page plus claire pour valider vite, choisir juste et suivre chaque demande.
                </h2>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-200">
                  Les demandes en attente, les catalogues disponibles et les arbitrages RH sont maintenant regroupes
                  dans une interface plus lisible, avec des zones distinctes pour l'analyse et l'action.
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={fetchData}
                    className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-emerald-50"
                  >
                    Actualiser les donnees
                  </button>
                  <div className="rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-medium text-slate-100">
                    {pendingRequests.length} demande{pendingRequests.length > 1 ? "s" : ""} a traiter
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <MetricCard
                  dark={dark}
                  eyebrow="Demandes"
                  value={requests.length}
                  helper="Volume total suivi par le module"
                  accent="from-emerald-400 via-emerald-500 to-teal-500"
                />
                <MetricCard
                  dark={dark}
                  eyebrow="Catalogue"
                  value={catalog.length}
                  helper="Formations disponibles pour affectation"
                  accent="from-sky-400 via-cyan-500 to-blue-500"
                />
                <MetricCard
                  dark={dark}
                  eyebrow="En attente"
                  value={pendingRequests.length}
                  helper="Demandes qui attendent une decision RH"
                  accent="from-amber-400 via-orange-500 to-rose-500"
                />
                <MetricCard
                  dark={dark}
                  eyebrow="Participants"
                  value={waitingRequests.length + approvedRequests.length}
                  helper="Parcours deja engages ou valides"
                  accent="from-lime-400 via-emerald-500 to-green-500"
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

          <div className="grid gap-6 xl:grid-cols-[1.4fr_0.95fr]">
            <section
              className={`rounded-[32px] border p-6 shadow-sm ${
                dark ? "border-slate-800 bg-slate-900/90 shadow-black/20" : "border-white/80 bg-white/90 shadow-slate-200/70"
              }`}
            >
              <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">Demandes RH</p>
                  <h2 className={`mt-2 text-2xl font-black ${dark ? "text-slate-50" : "text-slate-900"}`}>
                    File de traitement
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                    Chaque demande regroupe son contexte, le choix du catalogue, les participants deja associes et
                    l'action RH attendue.
                  </p>
                </div>
                <div
                  className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] ${
                    dark ? "bg-slate-800 text-slate-200" : "bg-slate-100 text-slate-700"
                  }`}
                >
                  {loading ? "Chargement..." : `${requests.length} demande${requests.length > 1 ? "s" : ""}`}
                </div>
              </div>

              {loading ? (
                <div className="grid gap-4">
                  {[1, 2, 3].map((item) => (
                    <div
                      key={item}
                      className={`h-40 animate-pulse rounded-[28px] ${
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
                    Le flux formation est vide pour le moment.
                  </h3>
                  <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-500">
                    Quand un chef soumettra une demande, elle apparaitra ici avec son service, son statut et les
                    actions RH disponibles.
                  </p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {requests.map((item) => {
                    const theme = getStatusTheme(item.status, dark);
                    const participants = Array.isArray(item.participants) ? item.participants : [];
                    const isPending = item.status === "PENDING";

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
                                Demande #{item.id}
                              </p>
                              <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ${theme.badge}`}>
                                {item.status_label || item.status}
                              </span>
                            </div>
                            <h3 className={`mt-3 text-xl font-black ${dark ? "text-slate-50" : "text-slate-900"}`}>{item.nom}</h3>
                            <p className="mt-2 text-sm leading-6 text-slate-500">{item.description || "Aucune description fournie."}</p>
                          </div>
                          <div className={`min-w-[220px] rounded-[24px] bg-gradient-to-br p-4 ${theme.panel} ${dark ? "border border-slate-800" : "border border-white/70"}`}>
                            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Contexte</p>
                            <div className="mt-3 space-y-2 text-sm">
                              <div className="flex items-center justify-between gap-4">
                                <span className="text-slate-500">Chef</span>
                                <span className={dark ? "text-slate-100" : "text-slate-900"}>{item.requested_by_email || "-"}</span>
                              </div>
                              <div className="flex items-center justify-between gap-4">
                                <span className="text-slate-500">Service</span>
                                <span className={dark ? "text-slate-100" : "text-slate-900"}>{item.service || "-"}</span>
                              </div>
                              <div className="flex items-center justify-between gap-4">
                                <span className="text-slate-500">Creee le</span>
                                <span className={dark ? "text-slate-100" : "text-slate-900"}>{formatDate(item.created_at)}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {item.reasons ? (
                          <div className={`mt-5 rounded-[22px] px-4 py-4 ${dark ? "bg-slate-900" : "bg-white"}`}>
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Motif</p>
                            <p className="mt-2 text-sm leading-6 text-slate-600">{item.reasons}</p>
                          </div>
                        ) : null}

                        <div className="mt-5 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                          <div className={`rounded-[22px] p-4 ${dark ? "bg-slate-900" : "bg-white"}`}>
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Catalogue associe</p>
                            {isPending ? (
                              <div className="mt-3 space-y-3">
                                {/* Search formation */}
                                {(() => {
                                  const reqSearch = (selectedCatalogByRequest[`search_${item.id}`] || "").toLowerCase();
                                  const filteredCatalog = reqSearch
                                    ? catalog.filter(c => c.name.toLowerCase().includes(reqSearch) || c.company_name.toLowerCase().includes(reqSearch))
                                    : catalog;
                                  const selectedFormation = catalog.find(c => String(c.id) === String(selectedCatalogByRequest[item.id]));
                                  return (
                                    <>
                                      <input
                                        type="text"
                                        value={selectedCatalogByRequest[`search_${item.id}`] || ""}
                                        onChange={e => setSelectedCatalogByRequest(p => ({ ...p, [`search_${item.id}`]: e.target.value }))}
                                        placeholder="Rechercher une formation..."
                                        className={fieldClassName}
                                      />
                                      {selectedFormation && (
                                        <div className={`rounded-xl px-4 py-3 flex items-center justify-between gap-3 ${dark ? "bg-emerald-950/40 border border-emerald-800" : "bg-emerald-50 border border-emerald-200"}`}>
                                          <div>
                                            <p className="text-sm font-semibold text-emerald-700">{selectedFormation.name}</p>
                                            <p className="text-xs text-slate-500">{selectedFormation.company_name} · {selectedFormation.duration_hours}h</p>
                                          </div>
                                          <button type="button" onClick={() => setSelectedCatalogByRequest(p => ({ ...p, [item.id]: "" }))}
                                            style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: 16, fontWeight: 700 }}>×</button>
                                        </div>
                                      )}
                                      {!selectedFormation && filteredCatalog.length > 0 && (
                                        <div className={`rounded-xl border overflow-hidden ${dark ? "border-slate-700" : "border-slate-200"}`} style={{ maxHeight: 200, overflowY: "auto" }}>
                                          {filteredCatalog.map(c => (
                                            <button key={c.id} type="button"
                                              onClick={() => setSelectedCatalogByRequest(p => ({ ...p, [item.id]: String(c.id), [`search_${item.id}`]: "" }))}
                                              className={`w-full text-left px-4 py-3 text-sm transition ${dark ? "hover:bg-slate-800 text-slate-100" : "hover:bg-slate-50 text-slate-900"}`}
                                              style={{ borderBottom: `1px solid ${dark ? "#1e293b" : "#f1f5f9"}`, display: "block" }}
                                            >
                                              <span className="font-semibold">{c.name}</span>
                                              <span className="text-slate-500 ml-2">· {c.company_name} · {c.duration_hours}h</span>
                                            </button>
                                          ))}
                                        </div>
                                      )}
                                      {!selectedFormation && reqSearch && filteredCatalog.length === 0 && (
                                        <p className="text-xs text-slate-400 px-1">Aucune formation trouvée pour "{reqSearch}".</p>
                                      )}
                                    </>
                                  );
                                })()}
                                <p className="text-xs text-slate-500">
                                  Recherchez et sélectionnez une formation avant de valider.
                                </p>
                              </div>
                            ) : item.approved_formation ? (
                              <div className={`mt-3 rounded-[20px] border px-4 py-4 ${dark ? "border-slate-800 bg-slate-950/80" : "border-slate-200 bg-slate-50"}`}>
                                <p className={`font-semibold ${dark ? "text-slate-100" : "text-slate-900"}`}>
                                  {item.approved_formation.name}
                                </p>
                                <p className="mt-1 text-sm text-slate-500">
                                  {item.approved_formation.people_required} participant
                                  {item.approved_formation.people_required > 1 ? "s" : ""} requis
                                </p>
                              </div>
                            ) : (
                              <p className="mt-3 text-sm text-slate-500">Aucune formation du catalogue n'a encore ete associee.</p>
                            )}
                          </div>

                          <div className={`rounded-[22px] p-4 ${dark ? "bg-slate-900" : "bg-white"}`}>
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Participants</p>
                            {participants.length ? (
                              <div className="mt-3 flex flex-wrap gap-2">
                                {participants.map((participant) => (
                                  <span
                                    key={participant.id}
                                    className={`rounded-full px-3 py-1 text-sm ${
                                      dark ? "bg-slate-800 text-slate-100" : "bg-slate-100 text-slate-700"
                                    }`}
                                  >
                                    {participant.name}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <p className="mt-3 text-sm text-slate-500">Aucun participant ajoute pour l'instant.</p>
                            )}
                          </div>
                        </div>

                        <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-slate-200/10 pt-5">
                          <div className="text-sm text-slate-500">
                            {canManageFormations && isPending
                              ? "Cette demande attend une validation RH."
                              : "Cette carte est en lecture seule pour votre role."}
                          </div>

                          {canManageFormations && isPending ? (
                            <div className="flex flex-wrap gap-3">
                              <button
                                className="rounded-full bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
                                disabled={actionId === item.id}
                                onClick={() => decideRequest(item.id, "approve")}
                                type="button"
                              >
                                {actionId === item.id ? "Validation..." : "Valider la demande"}
                              </button>
                              <button
                                className={`rounded-full border px-5 py-3 text-sm font-semibold transition ${
                                  dark
                                    ? "border-slate-700 bg-slate-900 text-slate-100 hover:border-rose-500 hover:text-rose-300"
                                    : "border-slate-300 bg-white text-slate-700 hover:border-rose-400 hover:text-rose-600"
                                } disabled:cursor-not-allowed disabled:opacity-60`}
                                disabled={actionId === item.id}
                                onClick={() => decideRequest(item.id, "reject")}
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
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Catalogue RH</p>
                    <h2 className={`mt-2 text-2xl font-black ${dark ? "text-slate-50" : "text-slate-900"}`}>
                      Formations disponibles
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      Une lecture rapide des organismes, des durees et du nombre de participants attendus.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={fetchData}
                    className={`rounded-full px-4 py-2 text-sm font-semibold ${
                      dark ? "bg-slate-800 text-slate-100 hover:bg-slate-700" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    Actualiser
                  </button>
                </div>

                <input
                  type="text"
                  value={catalogSearch}
                  onChange={e => setCatalogSearch(e.target.value)}
                  placeholder="Rechercher une formation..."
                  className={`mt-4 w-full rounded-2xl border px-4 py-3 text-sm outline-none transition ${
                    dark
                      ? "border-slate-700 bg-slate-950/80 text-slate-100 placeholder:text-slate-500 focus:border-cyan-400"
                      : "border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-cyan-500"
                  }`}
                />

                <div className="mt-4 grid gap-3">
                  {(() => {
                    const q = catalogSearch.trim().toLowerCase();
                    const filtered = q
                      ? catalog.filter(item =>
                          item.name.toLowerCase().includes(q) ||
                          item.company_name.toLowerCase().includes(q)
                        )
                      : catalog;
                    if (catalog.length === 0) return (
                    <div
                      className={`rounded-[24px] border border-dashed px-5 py-8 text-center ${
                        dark ? "border-slate-700 bg-slate-950/40" : "border-slate-200 bg-slate-50"
                      }`}
                    >
                      <p className="text-sm text-slate-500">Le catalogue est vide pour l'instant.</p>
                    </div>
                    );
                    if (filtered.length === 0) return (
                      <div className={`rounded-[24px] border border-dashed px-5 py-8 text-center ${dark ? "border-slate-700 bg-slate-950/40" : "border-slate-200 bg-slate-50"}`}>
                        <p className="text-sm text-slate-500">Aucun résultat pour &quot;{catalogSearch}&quot;.</p>
                      </div>
                    );
                    return filtered.map((item) => (
                      <div
                        key={item.id}
                        className={`rounded-[24px] border p-4 ${
                          dark ? "border-slate-800 bg-slate-950/70" : "border-slate-200 bg-slate-50"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className={`text-base font-bold ${dark ? "text-slate-50" : "text-slate-900"}`}>{item.name}</h3>
                            <p className="mt-1 text-sm text-slate-500">{item.company_name}</p>
                          </div>
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${
                              dark ? "bg-slate-800 text-slate-200" : "bg-white text-slate-700"
                            }`}
                          >
                            {item.duration_hours}h
                          </span>
                        </div>
                        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <p className="text-slate-500">Participants</p>
                            <p className={dark ? "text-slate-100" : "text-slate-900"}>{item.people_required}</p>
                          </div>
                          <div>
                            <p className="text-slate-500">Contact</p>
                            <p className={`truncate ${dark ? "text-slate-100" : "text-slate-900"}`}>{item.company_email}</p>
                          </div>
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </section>

              <section
                className={`rounded-[32px] border p-6 shadow-sm ${
                  dark ? "border-slate-800 bg-slate-900/90 shadow-black/20" : "border-white/80 bg-white/90 shadow-slate-200/70"
                }`}
              >
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Administration</p>
                  <h2 className={`mt-2 text-2xl font-black ${dark ? "text-slate-50" : "text-slate-900"}`}>
                    Ajouter une formation
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    Gardez un catalogue propre avec les organismes, la duree et la capacite attendue.
                  </p>
                </div>

                {canManageFormations ? (
                  <form onSubmit={createCatalogItem} className="mt-5 grid gap-4">
                    <div>
                      <FieldLabel>Nom de la formation</FieldLabel>
                      <input
                        className={fieldClassName}
                        name="name"
                        value={catalogForm.name}
                        onChange={(event) =>
                          setCatalogForm((previous) => ({ ...previous, name: event.target.value }))
                        }
                      />
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <FieldLabel>Organisme</FieldLabel>
                        <input
                          className={fieldClassName}
                          name="company_name"
                          value={catalogForm.company_name}
                          onChange={(event) =>
                            setCatalogForm((previous) => ({ ...previous, company_name: event.target.value }))
                          }
                        />
                      </div>
                      <div>
                        <FieldLabel>Adresse</FieldLabel>
                        <input
                          className={fieldClassName}
                          name="company_address"
                          value={catalogForm.company_address}
                          onChange={(event) =>
                            setCatalogForm((previous) => ({ ...previous, company_address: event.target.value }))
                          }
                        />
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <FieldLabel>Duree en heures</FieldLabel>
                        <input
                          className={fieldClassName}
                          name="duration_hours"
                          type="number"
                          min="1"
                          value={catalogForm.duration_hours}
                          onChange={(event) =>
                            setCatalogForm((previous) => ({ ...previous, duration_hours: event.target.value }))
                          }
                        />
                      </div>
                      <div>
                        <FieldLabel>Participants requis</FieldLabel>
                        <input
                          className={fieldClassName}
                          name="people_required"
                          type="number"
                          min="1"
                          value={catalogForm.people_required}
                          onChange={(event) =>
                            setCatalogForm((previous) => ({ ...previous, people_required: event.target.value }))
                          }
                        />
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <FieldLabel>Email organisme</FieldLabel>
                        <input
                          className={fieldClassName}
                          name="company_email"
                          type="email"
                          value={catalogForm.company_email}
                          onChange={(event) =>
                            setCatalogForm((previous) => ({ ...previous, company_email: event.target.value }))
                          }
                        />
                      </div>
                      <div>
                        <FieldLabel>Telephone organisme</FieldLabel>
                        <input
                          className={fieldClassName}
                          name="company_phone"
                          value={catalogForm.company_phone}
                          onChange={(event) =>
                            setCatalogForm((previous) => ({ ...previous, company_phone: event.target.value }))
                          }
                        />
                      </div>
                    </div>

                    <button
                      className="mt-2 rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={submitting}
                      type="submit"
                    >
                      {submitting ? "Enregistrement..." : "Ajouter au catalogue"}
                    </button>
                  </form>
                ) : (
                  <div
                    className={`mt-5 rounded-[24px] border px-5 py-6 ${
                      dark ? "border-slate-700 bg-slate-950/40 text-slate-300" : "border-slate-200 bg-slate-50 text-slate-600"
                    }`}
                  >
                    Vous pouvez consulter les demandes et le catalogue, mais la creation reste reservee a l'agent RH ou
                    au GRH.
                  </div>
                )}
              </section>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}
