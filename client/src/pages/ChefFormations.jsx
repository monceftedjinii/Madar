import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import Navbar from "../components/Navbar";
import useDarkModePreference from "../hooks/useDarkModePreference";
import "../styles/profile.css";

const initialForm = {
  nom: "",
  description: "",
  reasons: "",
};

export default function ChefFormations() {
  const [dark, setDark] = useDarkModePreference();
  const [isNavOpen, setIsNavOpen] = useState(true);
  const [requests, setRequests] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selectedParticipants, setSelectedParticipants] = useState({});
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [actionId, setActionId] = useState(null);
  const [feedback, setFeedback] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

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

        <div className="infopro-infoper">
          <section className="info-per">
            <div className="top">
              <h2 className="title">Vue rapide</h2>
              <p className="desc">Etat des demandes de formation du service.</p>
            </div>
            <div><p className="desc">Total</p><h3>{stats.total}</h3></div>
            <div><p className="desc">En attente</p><h3>{stats.pending}</h3></div>
            <div><p className="desc">Attente participants</p><h3>{stats.waiting}</h3></div>
            <div><p className="desc">Approuvees</p><h3>{stats.approved}</h3></div>
          </section>

          <section className="info-pro">
            <div className="top">
              <h2 className="title">Equipe</h2>
              <p className="desc">Employes disponibles pour participer.</p>
            </div>
            <div><p className="desc">Employes</p><h3>{employees.length}</h3></div>
            <div>
              <p className="desc">Actualisation</p>
              <button className="modifier" onClick={fetchData} type="button">Actualiser</button>
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

        <section className="quelques-infos" style={{ width: "96%", marginTop: 0 }}>
          <form
            onSubmit={submitRequest}
            style={{
              width: "100%",
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 14,
            }}
          >
            <div>
              <p className="desc">Nom de la formation</p>
              <input name="nom" value={form.nom} onChange={(e) => setForm((p) => ({ ...p, nom: e.target.value }))} style={{ width: "100%", padding: "10px 12px", borderRadius: 12, border: "1px solid #cbd5e1" }} />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <p className="desc">Description</p>
              <textarea rows={3} value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} style={{ width: "100%", padding: "10px 12px", borderRadius: 12, border: "1px solid #cbd5e1", resize: "vertical" }} />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <p className="desc">Raisons</p>
              <textarea rows={3} value={form.reasons} onChange={(e) => setForm((p) => ({ ...p, reasons: e.target.value }))} style={{ width: "100%", padding: "10px 12px", borderRadius: 12, border: "1px solid #cbd5e1", resize: "vertical" }} />
            </div>
            <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "flex-end" }}>
              <button className="modifier" disabled={submitting} type="submit">
                {submitting ? "Envoi..." : "Envoyer la demande"}
              </button>
            </div>
          </form>
        </section>

        <section className="activite-recente" style={{ width: "96%", margin: "24px auto" }}>
          <div className="activite-top">
            <h2 className="activite-title">Demandes de formation</h2>
            <p className="activite-subtitle">Suivi backend des demandes du chef et gestion des participants.</p>
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
                                <label key={employee.id} style={{ display: "flex", gap: 8, alignItems: "center" }}>
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
  );
}
