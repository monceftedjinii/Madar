import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import Navbar from "../components/Navbar";
import useDarkModePreference from "../hooks/useDarkModePreference";
import usePersistentNavState from "../hooks/usePersistentNavState";
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

export default function RhFormations() {
  const [dark, setDark] = useDarkModePreference();
  const [isNavOpen, setIsNavOpen] = usePersistentNavState();
  const [requests, setRequests] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [catalogForm, setCatalogForm] = useState(initialCatalogForm);
  const [selectedCatalogByRequest, setSelectedCatalogByRequest] = useState({});
  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [actionId, setActionId] = useState(null);
  const [feedback, setFeedback] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const canManageFormations = role === "RH_AGENT" || role === "GRH";

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
      const [meResponse, requestsResponse, catalogResponse] = await Promise.all([
        axios.get("/api/whoami/"),
        axios.get("/api/agent/formations/requests/"),
        axios.get("/api/agent/formations/catalog/"),
      ]);
      setRole(meResponse.data?.role || "");
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

  const stats = useMemo(() => {
    const pending = requests.filter((item) => item.status === "PENDING").length;
    const waiting = requests.filter((item) => item.status === "WAITING_FOR_PEOPLE").length;
    const approved = requests.filter((item) => item.status === "APPROVED").length;
    return { total: requests.length, pending, waiting, approved };
  }, [requests]);

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

      <div className="profile-content !h-auto min-h-screen bg-transparent">
        <div
          className={`sticky top-0 z-40 backdrop-blur ${
            dark ? "border-b border-slate-800 bg-slate-950/90" : "border-b border-slate-200/80 bg-white/90"
          }`}
        >
          <div className="profile-naaav">
            <div className="yasar">
              <h1 className="monprofile">Formations RH</h1>
              <p className="morinfo">Validez les demandes de formation et maintenez le catalogue RH.</p>
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
              <p className="desc">Etat du flux de formation cote RH.</p>
            </div>
            <div><p className="desc">Total</p><h3>{stats.total}</h3></div>
            <div><p className="desc">En attente</p><h3>{stats.pending}</h3></div>
            <div><p className="desc">Attente liste</p><h3>{stats.waiting}</h3></div>
            <div><p className="desc">Approuvees</p><h3>{stats.approved}</h3></div>
          </section>

          <section className="info-pro">
            <div className="top">
              <h2 className="title">Catalogue</h2>
              <p className="desc">Formations disponibles cote RH.</p>
            </div>
            <div><p className="desc">Formations</p><h3>{catalog.length}</h3></div>
            <div>
              <p className="desc">Actualisation</p>
              <button className="modifier" onClick={fetchData} type="button">Actualiser</button>
            </div>
          </section>
        </div>

        {(feedback || errorMessage) && (
          <div className={`page-feedback ${errorMessage ? "error" : ""}`}>{errorMessage || feedback}</div>
        )}

        {canManageFormations ? (
          <section className="quelques-infos" style={{ width: "96%", marginTop: 0 }}>
            <form
              onSubmit={createCatalogItem}
              style={{
                width: "100%",
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 14,
              }}
            >
              {Object.entries({
                name: "Nom",
                company_name: "Organisme",
                duration_hours: "Duree (h)",
                people_required: "Participants requis",
                company_email: "Email organisme",
                company_phone: "Telephone organisme",
                company_address: "Adresse organisme",
              }).map(([key, label]) => (
                <div key={key} style={key === "company_address" ? { gridColumn: "1 / -1" } : undefined}>
                  <p className="desc">{label}</p>
                  <input
                    name={key}
                    value={catalogForm[key]}
                    onChange={(event) =>
                      setCatalogForm((previous) => ({ ...previous, [key]: event.target.value }))
                    }
                    style={fieldStyle}
                  />
                </div>
              ))}
              <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "flex-end" }}>
                <button className="modifier" disabled={submitting} type="submit">
                  {submitting ? "Enregistrement..." : "Ajouter au catalogue"}
                </button>
              </div>
            </form>
          </section>
        ) : (
          <div className="page-feedback info">Ce module est reserve a l'agent RH ou au GRH.</div>
        )}

        <section className="activite-recente" style={{ width: "96%", margin: "24px auto" }}>
          <div className="activite-top">
            <h2 className="activite-title">Demandes de formation</h2>
            <p className="activite-subtitle">Pilotage RH des demandes en attente et du catalogue.</p>
          </div>

          <div className="activite-table-scroll">
            <table className="activite-table">
              <thead>
                <tr>
                  <th>Demande</th>
                  <th>Chef</th>
                  <th>Service</th>
                  <th>Catalogue</th>
                  <th>Statut</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="6">Chargement des demandes...</td></tr>
                ) : requests.length === 0 ? (
                  <tr><td colSpan="6">Aucune demande de formation pour le moment.</td></tr>
                ) : (
                  requests.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <div>{item.nom}</div>
                        <div style={{ fontSize: 12, color: "#94a3b8" }}>{item.description}</div>
                      </td>
                      <td>{item.requested_by_email || "-"}</td>
                      <td>{item.service || "-"}</td>
                      <td>
                        {item.status === "PENDING" ? (
                          <select
                            value={selectedCatalogByRequest[item.id] || ""}
                            onChange={(event) =>
                              setSelectedCatalogByRequest((previous) => ({
                                ...previous,
                                [item.id]: event.target.value,
                              }))
                            }
                            style={fieldStyle}
                          >
                            <option value="">Choisir une formation</option>
                            {catalog.map((catalogItem) => (
                              <option key={catalogItem.id} value={catalogItem.id}>
                                {catalogItem.name} ({catalogItem.people_required} pers.)
                              </option>
                            ))}
                          </select>
                        ) : item.approved_formation ? (
                          `${item.approved_formation.name} (${item.approved_formation.people_required} pers.)`
                        ) : (
                          "-"
                        )}
                      </td>
                      <td><span className="badge badge-attente">{item.status_label || item.status}</span></td>
                      <td>
                        {canManageFormations && item.status === "PENDING" ? (
                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                            <button className="modifier" disabled={actionId === item.id} onClick={() => decideRequest(item.id, "approve")} type="button">
                              Valider
                            </button>
                            <button className="mode" disabled={actionId === item.id} onClick={() => decideRequest(item.id, "reject")} type="button">
                              Refuser
                            </button>
                          </div>
                        ) : (
                          <span style={{ color: "#64748b", fontWeight: 600 }}>Lecture seule</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
