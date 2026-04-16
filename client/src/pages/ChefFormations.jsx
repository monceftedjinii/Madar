import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import Navbar from "../components/Navbar";
import useDarkModePreference from "../hooks/useDarkModePreference";
import usePersistentNavState from "../hooks/usePersistentNavState";
import "../styles/profile.css";
import "../styles/chef-space.css";

const initialForm = {
  nom: "",
  description: "",
  reasons: "",
};

export default function ChefFormations() {
  const [dark, setDark] = useDarkModePreference();
  const [isNavOpen, setIsNavOpen] = usePersistentNavState();
  const [requests, setRequests] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selectedParticipants, setSelectedParticipants] = useState({});
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [actionId, setActionId] = useState(null);
  const [feedback, setFeedback] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const fieldStyle = {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 12,
    border: `1px solid ${dark ? "#334155" : "#cbd5e1"}`,
    background: dark ? "#0f172a" : "#ffffff",
    color: dark ? "#e2e8f0" : "#0f172a",
    boxSizing: "border-box",
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setErrorMessage("");
      const [requestsResponse, employeesResponse] = await Promise.all([
        axios.get("/api/formations/"),
        axios.get("/api/formations/department-employees/"),
      ]);
      setRequests(Array.isArray(requestsResponse.data) ? requestsResponse.data : []);
      setEmployees(Array.isArray(employeesResponse.data) ? employeesResponse.data : []);
    } catch (error) {
      console.error("Erreur chargement formations chef:", error);
      setRequests([]);
      setEmployees([]);
      setErrorMessage("Impossible de charger les formations cote chef.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const stats = useMemo(() => {
    const total = requests.length;
    const pending = requests.filter((item) => item.status === "PENDING").length;
    const waiting = requests.filter((item) => item.status === "WAITING_FOR_PEOPLE").length;
    const approved = requests.filter((item) => item.status === "APPROVED").length;
    return { total, pending, waiting, approved };
  }, [requests]);

  const submitRequest = async (event) => {
    event.preventDefault();
    if (!form.nom.trim() || !form.description.trim()) {
      setErrorMessage("Le nom et la description sont obligatoires.");
      return;
    }

    try {
      setSubmitting(true);
      setFeedback("");
      setErrorMessage("");
      await axios.post("/api/formations/create/", {
        nom: form.nom.trim(),
        description: form.description.trim(),
        reasons: form.reasons.trim(),
      });
      setFeedback("Demande de formation envoyee.");
      setForm(initialForm);
      await fetchData();
    } catch (error) {
      console.error("Erreur creation formation:", error);
      setErrorMessage(error?.response?.data?.detail || "Impossible d'envoyer la demande.");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleParticipant = (requestId, employeeId) => {
    setSelectedParticipants((previous) => {
      const current = previous[requestId] || [];
      const exists = current.includes(employeeId);
      return {
        ...previous,
        [requestId]: exists
          ? current.filter((id) => id !== employeeId)
          : [...current, employeeId],
      };
    });
  };

  const sendParticipants = async (requestId) => {
    const employeeIds = selectedParticipants[requestId] || [];
    if (!employeeIds.length) {
      setErrorMessage("Selectionnez au moins un employe.");
      return;
    }

    try {
      setActionId(requestId);
      setFeedback("");
      setErrorMessage("");
      await axios.post(`/api/formations/${requestId}/add-participants/`, {
        employee_ids: employeeIds,
      });
      setFeedback("Participants ajoutes a la formation.");
      await fetchData();
    } catch (error) {
      console.error("Erreur ajout participants:", error);
      setErrorMessage(error?.response?.data?.detail || "Impossible d'ajouter les participants.");
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

      <div className="profile-content !h-auto min-h-screen bg-transparent">
        <div
          className={`sticky top-0 z-40 backdrop-blur ${
            dark ? "border-b border-slate-800 bg-slate-950/90" : "border-b border-slate-200/80 bg-white/90"
          }`}
        >
          <div className="profile-naaav">
            <div className="yasar">
              <h1 className="monprofile">Formations chef</h1>
              <p className="morinfo">Demandez des formations et affectez les participants de votre service.</p>
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

        <div className="chef-page-stack">
          <section className="chef-hero">
            <div className="chef-hero-copy">
              <span className="chef-eyebrow">Espace chef</span>
              <h2 className="chef-hero-title">Pilotage des besoins de formation du service</h2>
              <p className="chef-hero-description">
                Demandez des formations, suivez leur validation et affectez les participants dans
                une interface plus lisible pour le chef.
              </p>
            </div>
            <div className="chef-hero-kpis">
              <article className="chef-kpi-card">
                <span>Total</span>
                <strong>{stats.total}</strong>
                <p>Demandes de formation suivies cote chef.</p>
              </article>
              <article className="chef-kpi-card">
                <span>En attente</span>
                <strong>{stats.pending}</strong>
                <p>Demandes encore en cours de traitement.</p>
              </article>
              <article className="chef-kpi-card">
                <span>Participants</span>
                <strong>{employees.length}</strong>
                <p>Employes disponibles pour une affectation.</p>
              </article>
              <article className="chef-kpi-card">
                <span>Approuvees</span>
                <strong>{stats.approved}</strong>
                <p>Demandes deja validees dans le flux RH.</p>
              </article>
            </div>
          </section>

          <div className="chef-metrics-grid">
            <article className="chef-metric-card">
              <span>Attente participants</span>
              <strong>{stats.waiting}</strong>
              <p>Demandes a completer avec les employes du service.</p>
            </article>
            <article className="chef-metric-card">
              <span>Action rapide</span>
              <p style={{ marginTop: 12 }}>
                <button className="modifier" onClick={fetchData} type="button">Actualiser</button>
              </p>
            </article>
          </div>

          {(feedback || errorMessage) && (
            <div className={`page-feedback ${errorMessage ? "error" : ""}`}>
              {errorMessage || feedback}
            </div>
          )}

          <section className="chef-panel">
            <div className="chef-panel-head">
              <div>
                <h2>Nouvelle demande de formation</h2>
                <p>Formalisez un besoin, son contexte et les raisons de la demande.</p>
              </div>
              <div className="chef-action-pill">Creation</div>
            </div>

            <form onSubmit={submitRequest} className="chef-form-grid">
              <div className="chef-form-field">
                <p className="chef-form-label">Nom de la formation</p>
                <input name="nom" value={form.nom} onChange={(e) => setForm((p) => ({ ...p, nom: e.target.value }))} style={fieldStyle} />
              </div>
              <div className="chef-form-field chef-form-field-wide">
                <p className="chef-form-label">Description</p>
                <textarea rows={3} value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} style={{ ...fieldStyle, resize: "vertical" }} />
              </div>
              <div className="chef-form-field chef-form-field-wide">
                <p className="chef-form-label">Raisons</p>
                <textarea rows={3} value={form.reasons} onChange={(e) => setForm((p) => ({ ...p, reasons: e.target.value }))} style={{ ...fieldStyle, resize: "vertical" }} />
              </div>
              <div className="chef-form-field chef-form-field-wide">
                <div className="chef-actions">
                  <button className="modifier" disabled={submitting} type="submit">
                    {submitting ? "Envoi..." : "Envoyer la demande"}
                  </button>
                </div>
              </div>
            </form>
          </section>

          <section className="chef-panel">
            <div className="chef-panel-head">
              <div>
                <h2>Demandes de formation</h2>
                <p>Suivi backend des demandes du chef et gestion des participants.</p>
              </div>
              <div className="chef-action-pill">Suivi RH</div>
            </div>

            <div className="activite-table-scroll">
              <table className="activite-table">
              <thead>
                <tr>
                  <th>Formation</th>
                  <th>Statut</th>
                  <th>Catalogue approuve</th>
                  <th>Participants</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="5">Chargement des formations...</td></tr>
                ) : requests.length === 0 ? (
                  <tr><td colSpan="5">Aucune demande de formation pour le moment.</td></tr>
                ) : (
                  requests.map((requestItem) => {
                    const canAddParticipants = requestItem.status === "WAITING_FOR_PEOPLE";
                    const selected = selectedParticipants[requestItem.id] || [];

                    return (
                      <tr key={requestItem.id}>
                        <td>
                          <div>{requestItem.nom}</div>
                          <div style={{ fontSize: 12, color: "#94a3b8" }}>{requestItem.description}</div>
                        </td>
                        <td><span className="badge badge-attente">{requestItem.status_label || requestItem.status}</span></td>
                        <td>
                          {requestItem.approved_formation
                            ? `${requestItem.approved_formation.name} (${requestItem.approved_formation.people_required} pers.)`
                            : "-"}
                        </td>
                        <td>
                          {requestItem.participants?.length ? (
                            requestItem.participants.map((participant) => participant.name).join(", ")
                          ) : canAddParticipants ? (
                            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                              {employees.map((employee) => (
                                <label key={employee.id} style={{ display: "flex", gap: 8, alignItems: "center", color: dark ? "#e2e8f0" : "#0f172a" }}>
                                  <input
                                    type="checkbox"
                                    checked={selected.includes(employee.id)}
                                    onChange={() => toggleParticipant(requestItem.id, employee.id)}
                                  />
                                  <span>{employee.name}</span>
                                </label>
                              ))}
                            </div>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td>
                          {canAddParticipants ? (
                            <button className="modifier" disabled={actionId === requestItem.id} onClick={() => sendParticipants(requestItem.id)} type="button">
                              {actionId === requestItem.id ? "Envoi..." : "Ajouter"}
                            </button>
                          ) : (
                            <span style={{ color: "#64748b", fontWeight: 600 }}>Lecture seule</span>
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
    </div>
  );
}
