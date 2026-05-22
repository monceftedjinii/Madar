import NotificationBell from "../components/NotificationBell";
import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import Navbar from "../components/Navbar";
import useDarkModePreference from "../hooks/useDarkModePreference";
import usePersistentNavState from "../hooks/usePersistentNavState";
import "../styles/profile.css";
import "../styles/chef-space.css";

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("fr-FR");
}

function getStatusLabel(status) {
  const labels = {
    PENDING: "En attente",
    ACCEPTED: "Acceptée",
    REFUSED: "Refusée",
  };
  return labels[status] || status;
}

function getStatusClass(status) {
  if (status === "ACCEPTED") return "badge-termine";
  if (status === "REFUSED") return "badge-refuse";
  return "badge-attente";
}

export default function ChefLeaves() {
  const [dark, setDark] = useDarkModePreference();
  const [isNavOpen, setIsNavOpen] = usePersistentNavState();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState(null);
  const [feedback, setFeedback] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [decisionModal, setDecisionModal] = useState(null); // { request, action }
  const [decisionComment, setDecisionComment] = useState("");

  const fetchRequests = async () => {
    try {
      setLoading(true);
      setErrorMessage("");
      const response = await axios.get("/api/leaves/department/");
      setRequests(Array.isArray(response.data) ? response.data : []);
    } catch (requestError) {
      console.error("Erreur chargement validation congés :", requestError);
      setRequests([]);
      setErrorMessage("Impossible de charger les demandes du service.");
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
    return {
      total: requests.length,
      pending,
      accepted,
      refused,
    };
  }, [requests]);

  const openDecisionModal = (requestItem, action) => {
    setDecisionModal({ request: requestItem, action });
    setDecisionComment("");
    setFeedback("");
    setErrorMessage("");
  };

  const submitDecision = async () => {
    if (!decisionModal) return;
    const { request, action } = decisionModal;
    try {
      setActionId(request.id);
      setFeedback("");
      setErrorMessage("");
      await axios.post(`/api/leaves/${request.id}/${action}/`, { comment: decisionComment });
      setFeedback(action === "approve" ? "Demande validée avec succès." : "Demande refusée avec succès.");
      setDecisionModal(null);
      await fetchRequests();
    } catch (requestError) {
      console.error("Erreur décision congé :", requestError);
      setErrorMessage(requestError?.response?.data?.detail || "Impossible de traiter cette demande.");
      setDecisionModal(null);
    } finally {
      setActionId(null);
    }
  };

  return (
    <>
    <div
      className={`profile-page${dark ? " dark" : ""} ${isNavOpen ? "nav-open" : "nav-closed"}`}
    >
      <div className={`navbar-profile-page ${isNavOpen ? "open" : "closed"}`}>
        <Navbar />
      </div>

      {isNavOpen && (
        <div
          className="profile-overlay"
          onClick={() => setIsNavOpen(false)}
          aria-hidden="true"
        />
      )}

      <div className="profile-content !h-auto min-h-screen bg-transparent">
        <div
          className={`sticky top-0 z-40 backdrop-blur ${
            dark
              ? "border-b border-slate-800 bg-slate-950/90"
              : "border-b border-slate-200/80 bg-white/90"
          }`}
        >
          <div className="profile-naaav">
            <div className="yasar">
              <h1 className="monprofile">Validation des congés</h1>
              <p className="morinfo">
                Consultez et traitez les demandes de congés de votre service.
              </p>
            </div>
            <div className="yamin">
              <button
                className="nav-toggle"
                onClick={() => setIsNavOpen((prev) => !prev)}
                type="button"
              >
                {isNavOpen ? "Masquer menu" : "Afficher menu"}
              </button>
              <button className="mode" onClick={() => setDark((prev) => !prev)} type="button">
                {dark ? "mode clair" : "mode sombre"}
              </button>
              <NotificationBell dark={dark} />
            </div>
          </div>
        </div>

        <div className="chef-page-stack">
          <section className="chef-hero">
            <div className="chef-hero-copy">
              <span className="chef-eyebrow">Espace chef</span>
              <h2 className="chef-hero-title">Validation claire des demandes de congés</h2>
              <p className="chef-hero-description">
                Centralisez les demandes du service, priorisez celles en attente et gardez une
                vision lisible des validations déjà traitées.
              </p>
            </div>
            <div className="chef-hero-kpis">
              <article className="chef-kpi-card">
                <span>Total</span>
                <strong>{stats.total}</strong>
                <p>Demandes visibles dans votre périmètre.</p>
              </article>
              <article className="chef-kpi-card">
                <span>En attente</span>
                <strong>{stats.pending}</strong>
                <p>Demandes qui attendent encore votre decision.</p>
              </article>
              <article className="chef-kpi-card">
                <span>Acceptées</span>
                <strong>{stats.accepted}</strong>
                <p>Demandes déjà validées au niveau chef.</p>
              </article>
              <article className="chef-kpi-card">
                <span>Refusées</span>
                <strong>{stats.refused}</strong>
                <p>Demandes refusées ou non retenues.</p>
              </article>
            </div>
          </section>

          <div className="chef-metrics-grid">
            <article className="chef-metric-card">
              <span>Action rapide</span>
              <p style={{ marginTop: 12 }}>
                <button className="modifier" onClick={fetchRequests} type="button">
                  Actualiser
                </button>
              </p>
            </article>
            <article className="chef-metric-card">
              <span>Lecture</span>
              <strong>{stats.total - stats.pending}</strong>
              <p>Demandes déjà sorties de la file d&apos;attente.</p>
            </article>
          </div>

          {(feedback || errorMessage) && (
            <div className={`page-feedback ${errorMessage ? "error" : ""}`}>
              {errorMessage || feedback}
            </div>
          )}

          {/* Pending requests — need chef action */}
          <section className="chef-panel">
            <div className="chef-panel-head">
              <div>
                <h2>En attente de décision</h2>
                <p>Demandes nécessitant votre validation.</p>
              </div>
              <div className="chef-action-pill">À traiter</div>
            </div>

            <div className="activite-table-scroll">
              <table className="activite-table">
              <thead>
                <tr>
                  <th>Employé</th>
                  <th>Type</th>
                  <th>Période</th>
                  <th>Motif</th>
                  <th>Justificatif</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="6">Chargement...</td></tr>
                ) : requests.filter((r) => r.status === "PENDING" && r.can_decide).length === 0 ? (
                  <tr><td colSpan="6">Aucune demande en attente de votre décision.</td></tr>
                ) : (
                  requests.filter((r) => r.status === "PENDING" && r.can_decide).map((requestItem) => {
                    const fullName = `${requestItem.employee?.first_name || ""} ${requestItem.employee?.last_name || ""}`.trim() || requestItem.employee_email || "-";
                    return (
                      <tr key={requestItem.id}>
                        <td>{fullName}</td>
                        <td>{requestItem.type_label || requestItem.type || "-"}</td>
                        <td>{formatDate(requestItem.start_date)} → {formatDate(requestItem.end_date)}</td>
                        <td>{requestItem.reason || "-"}</td>
                        <td>
                          {requestItem.attachment ? (
                            <a href={requestItem.attachment} target="_blank" rel="noreferrer"
                              style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 20, background: "#eff6ff", border: "1px solid #93c5fd", color: "#2563eb", fontSize: 12, fontWeight: 700, textDecoration: "none", whiteSpace: "nowrap" }}>
                              📎 Voir
                            </a>
                          ) : (
                            <span style={{ fontSize: 12, color: "#94a3b8" }}>—</span>
                          )}
                        </td>
                        <td>
                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                            <button className="modifier" disabled={actionId === requestItem.id} onClick={() => openDecisionModal(requestItem, "approve")} type="button">Valider</button>
                            <button className="mode" disabled={actionId === requestItem.id} onClick={() => openDecisionModal(requestItem, "reject")} type="button">Refuser</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              </table>
            </div>
          </section>

          {/* History — requests already decided (by chef or RH) */}
          <section className="chef-panel">
            <div className="chef-panel-head">
              <div>
                <h2>Historique</h2>
                <p>Toutes les demandes traitées — décisions chef et RH Congé.</p>
              </div>
              <div className="chef-action-pill">Suivi</div>
            </div>

            <div className="activite-table-scroll">
              <table className="activite-table">
              <thead>
                <tr>
                  <th>Employé</th>
                  <th>Type</th>
                  <th>Période</th>
                  <th>Justificatif</th>
                  <th>Statut final</th>
                  <th>Commentaire RH</th>
                  <th>Décision par</th>
                  <th>Date décision</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="8">Chargement...</td></tr>
                ) : requests.filter((r) => r.status !== "PENDING" || !r.can_decide).length === 0 ? (
                  <tr><td colSpan="8">Aucun historique pour le moment.</td></tr>
                ) : (
                  requests.filter((r) => r.status !== "PENDING" || !r.can_decide).map((requestItem) => {
                    const fullName = `${requestItem.employee?.first_name || ""} ${requestItem.employee?.last_name || ""}`.trim() || requestItem.employee_email || "-";
                    return (
                      <tr key={requestItem.id}>
                        <td>{fullName}</td>
                        <td>{requestItem.type_label || requestItem.type || "-"}</td>
                        <td>{formatDate(requestItem.start_date)} → {formatDate(requestItem.end_date)}</td>
                        <td>
                          {requestItem.attachment ? (
                            <a href={requestItem.attachment} target="_blank" rel="noreferrer"
                              style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 20, background: "#eff6ff", border: "1px solid #93c5fd", color: "#2563eb", fontSize: 12, fontWeight: 700, textDecoration: "none", whiteSpace: "nowrap" }}>
                              📎 Voir
                            </a>
                          ) : (
                            <span style={{ fontSize: 12, color: "#94a3b8" }}>—</span>
                          )}
                        </td>
                        <td>
                          {requestItem.status === "PENDING" && !requestItem.can_decide ? (
                            <span className="badge badge-attente">En attente RH</span>
                          ) : (
                            <span className={`badge ${getStatusClass(requestItem.status)}`}>
                              {getStatusLabel(requestItem.status)}
                            </span>
                          )}
                        </td>
                        <td style={{ maxWidth: 200 }}>
                          {requestItem.chef_comment ? (
                            <span style={{ fontSize: 13, color: dark ? "#cbd5e1" : "#374151" }}>{requestItem.chef_comment}</span>
                          ) : (
                            <span style={{ fontSize: 12, color: "#94a3b8" }}>—</span>
                          )}
                        </td>
                        <td>{requestItem.decided_by || "-"}</td>
                        <td>{requestItem.decided_at ? new Date(requestItem.decided_at).toLocaleDateString("fr-FR") : "-"}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </div>

    {/* Decision modal */}
    {decisionModal && (() => {
      const { request, action } = decisionModal;
      const isApprove = action === "approve";
      const fullName = `${request.employee?.first_name || ""} ${request.employee?.last_name || ""}`.trim() || request.employee_email || "-";
      return (
        <div style={{ position: "fixed", inset: 0, zIndex: 700, background: "rgba(15,23,42,0.55)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
          onClick={() => setDecisionModal(null)}>
          <div style={{ background: dark ? "#0f172a" : "#fff", borderRadius: 24, width: "100%", maxWidth: 460, boxShadow: "0 24px 64px rgba(0,0,0,0.28)", border: `1px solid ${dark ? "#1e293b" : "#e2e8f0"}`, overflow: "hidden" }}
            onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div style={{ padding: "22px 24px 0", display: "flex", alignItems: "flex-start", gap: 14 }}>
              <div style={{ width: 44, height: 44, borderRadius: "50%", flexShrink: 0, background: isApprove ? "#dcfce7" : "#fee2e2", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
                {isApprove ? "✅" : "❌"}
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 900, color: dark ? "#f1f5f9" : "#0f172a" }}>
                  {isApprove ? "Valider la demande" : "Refuser la demande"}
                </h3>
                <p style={{ margin: "4px 0 0", fontSize: 13, color: "#94a3b8" }}>
                  Demande de congé de {fullName}
                </p>
              </div>
            </div>

            {/* Info card */}
            <div style={{ padding: "16px 24px" }}>
              <div style={{ borderRadius: 14, padding: "12px 16px", background: dark ? "#1e293b" : "#f8fafc", border: `1px solid ${dark ? "#334155" : "#e2e8f0"}`, marginBottom: 14 }}>
                <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
                  <div>
                    <p style={{ margin: 0, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#94a3b8" }}>Type</p>
                    <p style={{ margin: "3px 0 0", fontSize: 14, fontWeight: 700, color: dark ? "#f1f5f9" : "#0f172a" }}>{request.type_label || request.type}</p>
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#94a3b8" }}>Période</p>
                    <p style={{ margin: "3px 0 0", fontSize: 14, fontWeight: 700, color: dark ? "#f1f5f9" : "#0f172a" }}>{formatDate(request.start_date)} → {formatDate(request.end_date)}</p>
                  </div>
                </div>
                {request.reason && (
                  <div style={{ marginTop: 10 }}>
                    <p style={{ margin: 0, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#94a3b8" }}>Motif</p>
                    <p style={{ margin: "3px 0 0", fontSize: 13, color: dark ? "#cbd5e1" : "#374151" }}>{request.reason}</p>
                  </div>
                )}
              </div>

              {/* Comment field */}
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: dark ? "#94a3b8" : "#64748b", marginBottom: 6 }}>
                {isApprove ? "Commentaire (optionnel)" : "Motif de refus (optionnel)"}
              </label>
              <textarea
                rows={3}
                value={decisionComment}
                onChange={e => setDecisionComment(e.target.value)}
                placeholder={isApprove ? "Bon courage pour ce congé..." : "Expliquer la raison du refus..."}
                style={{ width: "100%", padding: "10px 12px", borderRadius: 12, border: `1.5px solid ${dark ? "#334155" : "#e2e8f0"}`, background: dark ? "#0a0f1a" : "#f8fafc", color: dark ? "#e2e8f0" : "#0f172a", fontSize: 13, outline: "none", resize: "vertical", boxSizing: "border-box" }}
              />
            </div>

            {/* Actions */}
            <div style={{ padding: "12px 24px 20px", display: "flex", gap: 10, justifyContent: "flex-end", borderTop: `1px solid ${dark ? "#1e293b" : "#f1f5f9"}` }}>
              <button type="button" onClick={() => setDecisionModal(null)}
                style={{ padding: "10px 22px", borderRadius: 12, border: `1.5px solid ${dark ? "#334155" : "#e2e8f0"}`, background: "transparent", fontWeight: 700, fontSize: 14, cursor: "pointer", color: dark ? "#94a3b8" : "#64748b" }}>
                Annuler
              </button>
              <button type="button" onClick={submitDecision} disabled={!!actionId}
                style={{ padding: "10px 22px", borderRadius: 12, border: "none", background: isApprove ? "linear-gradient(135deg,#16a34a,#15803d)" : "linear-gradient(135deg,#ef4444,#dc2626)", color: "#fff", fontWeight: 800, fontSize: 14, cursor: actionId ? "not-allowed" : "pointer", opacity: actionId ? 0.7 : 1, boxShadow: isApprove ? "0 4px 14px rgba(22,163,74,0.35)" : "0 4px 14px rgba(239,68,68,0.35)" }}>
                {actionId ? "Traitement..." : isApprove ? "Confirmer la validation" : "Confirmer le refus"}
              </button>
            </div>
          </div>
        </div>
      );
    })()}
    </>
  );
}
