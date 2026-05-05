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

  const decideRequest = async (requestId, action) => {
    const comment =
      window.prompt(
        action === "approve"
          ? "Commentaire de validation (optionnel)"
          : "Motif de refus (optionnel)",
        "",
      ) ?? "";

    try {
      setActionId(requestId);
      setFeedback("");
      setErrorMessage("");
      await axios.post(`/api/leaves/${requestId}/${action}/`, { comment });
      setFeedback(
        action === "approve"
          ? "Demande validée avec succès."
          : "Demande refusée avec succès.",
      );
      await fetchRequests();
    } catch (requestError) {
      console.error("Erreur décision congé :", requestError);
      setErrorMessage(
        requestError?.response?.data?.detail || "Impossible de traiter cette demande.",
      );
    } finally {
      setActionId(null);
    }
  };

  return (
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
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="5">Chargement...</td></tr>
                ) : requests.filter((r) => r.status === "PENDING" && r.can_decide).length === 0 ? (
                  <tr><td colSpan="5">Aucune demande en attente de votre décision.</td></tr>
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
                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                            <button className="modifier" disabled={actionId === requestItem.id} onClick={() => decideRequest(requestItem.id, "approve")} type="button">Valider</button>
                            <button className="mode" disabled={actionId === requestItem.id} onClick={() => decideRequest(requestItem.id, "reject")} type="button">Refuser</button>
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
                  <th>Statut final</th>
                  <th>Décision finale par</th>
                  <th>Date décision</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="6">Chargement...</td></tr>
                ) : requests.filter((r) => r.status !== "PENDING").length === 0 ? (
                  <tr><td colSpan="6">Aucun historique pour le moment.</td></tr>
                ) : (
                  requests.filter((r) => r.status !== "PENDING").map((requestItem) => {
                    const fullName = `${requestItem.employee?.first_name || ""} ${requestItem.employee?.last_name || ""}`.trim() || requestItem.employee_email || "-";
                    return (
                      <tr key={requestItem.id}>
                        <td>{fullName}</td>
                        <td>{requestItem.type_label || requestItem.type || "-"}</td>
                        <td>{formatDate(requestItem.start_date)} → {formatDate(requestItem.end_date)}</td>
                        <td>
                          <span className={`badge ${getStatusClass(requestItem.status)}`}>
                            {getStatusLabel(requestItem.status)}
                          </span>
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
  );
}
