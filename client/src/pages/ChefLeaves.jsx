import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import Navbar from "../components/Navbar";
import useDarkModePreference from "../hooks/useDarkModePreference";
import "../styles/profile.css";

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("fr-FR");
}

function getStatusLabel(status) {
  const labels = {
    PENDING: "En attente",
    ACCEPTED: "Acceptee",
    REFUSED: "Refusee",
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
  const [isNavOpen, setIsNavOpen] = useState(true);
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
      console.error("Erreur chargement validation conges:", requestError);
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
          ? "Demande validee avec succes."
          : "Demande refusee avec succes.",
      );
      await fetchRequests();
    } catch (requestError) {
      console.error("Erreur decision conge:", requestError);
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
              <h1 className="monprofile">Validation conges</h1>
              <p className="morinfo">
                Consultez et traitez les demandes de conges de votre service.
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

        <div className="infopro-infoper">
          <section className="info-per">
            <div className="top">
              <h2 className="title">Demandes</h2>
              <p className="desc">Vue d'ensemble des conges visibles par le chef.</p>
            </div>
            <div>
              <p className="desc">Total</p>
              <h3>{stats.total}</h3>
            </div>
            <div>
              <p className="desc">En attente</p>
              <h3>{stats.pending}</h3>
            </div>
            <div>
              <p className="desc">Acceptees</p>
              <h3>{stats.accepted}</h3>
            </div>
            <div>
              <p className="desc">Refusees</p>
              <h3>{stats.refused}</h3>
            </div>
          </section>

          <section className="info-pro">
            <div className="top">
              <h2 className="title">Actions</h2>
              <p className="desc">Rechargez les demandes et traitez les validations.</p>
            </div>
            <div>
              <p className="desc">Actualisation</p>
              <button className="modifier" onClick={fetchRequests} type="button">
                Actualiser
              </button>
            </div>
          </section>
        </div>

        {(feedback || errorMessage) && (
          <div
            style={{
              width: "96%",
              margin: "0 auto 16px",
              padding: "12px 16px",
              borderRadius: 12,
              background: errorMessage ? "#ffe6e6" : "#e6f7e6",
              color: errorMessage ? "#b91c1c" : "#166534",
              border: `1px solid ${errorMessage ? "#fecaca" : "#bbf7d0"}`,
            }}
          >
            {errorMessage || feedback}
          </div>
        )}

        <section className="activite-recente" style={{ width: "96%", margin: "24px auto" }}>
          <div className="activite-top">
            <h2 className="activite-title">Demandes du service</h2>
            <p className="activite-subtitle">
              Liste backend des demandes accessibles a la validation du chef.
            </p>
          </div>

          <div className="activite-table-scroll">
            <table className="activite-table">
              <thead>
                <tr>
                  <th>Employe</th>
                  <th>Type</th>
                  <th>Periode</th>
                  <th>Motif</th>
                  <th>Etape</th>
                  <th>Statut</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="7">Chargement des demandes...</td>
                  </tr>
                ) : requests.length === 0 ? (
                  <tr>
                    <td colSpan="7">Aucune demande de conge visible pour le moment.</td>
                  </tr>
                ) : (
                  requests.map((requestItem) => {
                    const fullName =
                      `${requestItem.employee?.first_name || ""} ${requestItem.employee?.last_name || ""}`.trim() ||
                      requestItem.employee_email ||
                      "-";
                    const canDecide = !!requestItem.can_decide && requestItem.status === "PENDING";

                    return (
                      <tr key={requestItem.id}>
                        <td>{fullName}</td>
                        <td>{requestItem.type_label || requestItem.type || "-"}</td>
                        <td>
                          {formatDate(requestItem.start_date)} - {formatDate(requestItem.end_date)}
                        </td>
                        <td>{requestItem.reason || "-"}</td>
                        <td>
                          {requestItem.current_step
                            ? `Etape ${requestItem.current_step.validation_order} - ${requestItem.current_step.validator_role}`
                            : "-"}
                        </td>
                        <td>
                          <span className={`badge ${getStatusClass(requestItem.status)}`}>
                            {getStatusLabel(requestItem.status)}
                          </span>
                        </td>
                        <td>
                          {canDecide ? (
                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                              <button
                                className="modifier"
                                disabled={actionId === requestItem.id}
                                onClick={() => decideRequest(requestItem.id, "approve")}
                                type="button"
                              >
                                Valider
                              </button>
                              <button
                                className="mode"
                                disabled={actionId === requestItem.id}
                                onClick={() => decideRequest(requestItem.id, "reject")}
                                type="button"
                              >
                                Refuser
                              </button>
                            </div>
                          ) : (
                            <span style={{ color: "#64748b", fontWeight: 600 }}>
                              Lecture seule
                            </span>
                          )}
                        </td>
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
  );
}
