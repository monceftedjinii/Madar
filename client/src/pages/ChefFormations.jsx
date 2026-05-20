import NotificationBell from "../components/NotificationBell";
import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import Navbar from "../components/Navbar";
import useDarkModePreference from "../hooks/useDarkModePreference";
import usePersistentNavState from "../hooks/usePersistentNavState";
import "../styles/profile.css";
import "../styles/chef-space.css";

const STATUS_LABELS = {
  PENDING: "En cours",
  WAITING_FOR_PEOPLE: "En cours",
  APPROVED: "Validée",
  REJECTED: "Refusée",
};

const STATUS_COLORS = {
  PENDING: "badge-attente",
  WAITING_FOR_PEOPLE: "badge-attente",
  APPROVED: "badge-termine",
  REJECTED: "badge-absent",
};

export default function ChefFormations() {
  const [dark, setDark] = useDarkModePreference();
  const [isNavOpen, setIsNavOpen] = usePersistentNavState();

  const [requests, setRequests] = useState([]);
  const [teamEmployees, setTeamEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // Form state
  const [form, setForm] = useState({ nom: "", description: "", reasons: "", people_count: "" });

  // Participant selector modal
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);

  const fieldStyle = {
    width: "100%", padding: "10px 12px", borderRadius: 12, boxSizing: "border-box",
    border: `1px solid ${dark ? "#334155" : "#cbd5e1"}`,
    background: dark ? "#0f172a" : "#ffffff",
    color: dark ? "#e2e8f0" : "#0f172a",
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setErrorMessage("");
      const [reqRes, empRes] = await Promise.all([
        axios.get("/api/formations/"),
        axios.get("/api/formations/department-employees/"),
      ]);
      setRequests(Array.isArray(reqRes.data) ? reqRes.data : []);
      setTeamEmployees(Array.isArray(empRes.data) ? empRes.data : []);
    } catch (err) {
      setRequests([]);
      setTeamEmployees([]);
      setErrorMessage("Impossible de charger les formations.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const stats = useMemo(() => ({
    total: requests.length,
    pending: requests.filter(r => ["PENDING", "WAITING_FOR_PEOPLE"].includes(r.status)).length,
    approved: requests.filter(r => r.status === "APPROVED").length,
    refused: requests.filter(r => r.status === "REJECTED").length,
  }), [requests]);

  const peopleCount = parseInt(form.people_count, 10);
  const validCount = !isNaN(peopleCount) && peopleCount >= 1 && peopleCount <= teamEmployees.length;

  const toggleEmployee = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const openSelector = () => {
    setSelectedIds([]);
    setSelectorOpen(true);
  };

  const submitRequest = async () => {
    if (!form.nom.trim() || !form.description.trim()) {
      setErrorMessage("Le nom et la description sont obligatoires.");
      return;
    }
    if (!validCount) {
      setErrorMessage(`Le nombre de personnes doit être entre 1 et ${teamEmployees.length}.`);
      return;
    }
    if (selectedIds.length !== peopleCount) {
      setErrorMessage(`Sélectionnez exactement ${peopleCount} employé(s).`);
      return;
    }
    try {
      setSubmitting(true);
      setFeedback(""); setErrorMessage("");
      await axios.post("/api/formations/create/", {
        nom: form.nom.trim(),
        description: form.description.trim(),
        reasons: form.reasons.trim(),
        people_count: peopleCount,
        employee_ids: selectedIds,
      });
      setFeedback("Demande envoyée avec succès.");
      setForm({ nom: "", description: "", reasons: "", people_count: "" });
      setSelectedIds([]);
      setSelectorOpen(false);
      await fetchData();
    } catch (err) {
      setErrorMessage(err?.response?.data?.detail || "Impossible d'envoyer la demande.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={`profile-page${dark ? " dark" : ""} ${isNavOpen ? "nav-open" : "nav-closed"}`}>
      <div className={`navbar-profile-page ${isNavOpen ? "open" : "closed"}`}>
        <Navbar />
      </div>
      {isNavOpen && <div className="profile-overlay" onClick={() => setIsNavOpen(false)} aria-hidden="true" />}

      <div className="profile-content !h-auto min-h-screen bg-transparent">
        <div className={`sticky top-0 z-40 backdrop-blur ${dark ? "border-b border-slate-800 bg-slate-950/90" : "border-b border-slate-200/80 bg-white/90"}`}>
          <div className="profile-naaav">
            <div className="yasar">
              <h1 className="monprofile">Formations</h1>
              <p className="morinfo">Demandez des formations pour votre équipe.</p>
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

        <div className="chef-page-stack">
          {/* KPI cards */}
          <section className="chef-hero">
            <div className="chef-hero-copy">
              <span className="chef-eyebrow">Espace chef</span>
              <h2 className="chef-hero-title">Gestion des formations équipe</h2>
              <p className="chef-hero-description">
                Soumettez une demande de formation, sélectionnez les participants et suivez la validation RH.
              </p>
            </div>
            <div className="chef-hero-kpis">
              <article className="chef-kpi-card">
                <span>Total demandes</span><strong>{stats.total}</strong>
                <p>Demandes soumises au service RH.</p>
              </article>
              <article className="chef-kpi-card">
                <span>En cours</span><strong>{stats.pending}</strong>
                <p>En attente de validation RH Formation.</p>
              </article>
              <article className="chef-kpi-card">
                <span>Validées</span><strong>{stats.approved}</strong>
                <p>Formation assignée et confirmée.</p>
              </article>
              <article className="chef-kpi-card">
                <span>Refusées</span><strong>{stats.refused}</strong>
                <p>Demandes non retenues par RH.</p>
              </article>
              <article className="chef-kpi-card">
                <span>Équipe</span><strong>{teamEmployees.length}</strong>
                <p>Employés disponibles pour participation.</p>
              </article>
            </div>
          </section>

          {(feedback || errorMessage) && (
            <div className={`page-feedback ${errorMessage ? "error" : ""}`}>
              {errorMessage || feedback}
            </div>
          )}

          {/* Request form */}
          <section className="chef-panel">
            <div className="chef-panel-head">
              <div>
                <h2>Nouvelle demande de formation</h2>
                <p>Renseignez le besoin, choisissez le nombre de participants, puis sélectionnez-les.</p>
              </div>
              <div className="chef-action-pill">Demande</div>
            </div>

            <div style={{ display: "grid", gap: 14 }}>
              <div className="chef-form-grid">
                <div>
                  <p className="chef-form-label">Nom de la formation *</p>
                  <input value={form.nom} onChange={e => setForm(p => ({ ...p, nom: e.target.value }))} placeholder="Ex: Excel avancé pour RH" style={fieldStyle} />
                </div>
                <div>
                  <p className="chef-form-label">Nombre de personnes * (max {teamEmployees.length})</p>
                  <input
                    type="number" min={1} max={teamEmployees.length}
                    value={form.people_count}
                    onChange={e => { setForm(p => ({ ...p, people_count: e.target.value })); setSelectedIds([]); }}
                    placeholder={`1 – ${teamEmployees.length}`}
                    style={{ ...fieldStyle, borderColor: form.people_count && !validCount ? "#ef4444" : (dark ? "#334155" : "#cbd5e1") }}
                  />
                  {form.people_count && !validCount && (
                    <p style={{ color: "#ef4444", fontSize: 12, marginTop: 4 }}>Doit être entre 1 et {teamEmployees.length}.</p>
                  )}
                </div>
              </div>

              <div>
                <p className="chef-form-label">Description *</p>
                <textarea rows={3} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Décrivez le contenu de la formation..." style={{ ...fieldStyle, resize: "vertical" }} />
              </div>


              {/* Participant list preview */}
              {selectedIds.length > 0 && (
                <div style={{ padding: "12px 16px", borderRadius: 12, background: dark ? "#052e16" : "#f0fdf4", border: `1px solid ${dark ? "#166534" : "#86efac"}` }}>
                  <p style={{ margin: "0 0 8px", fontSize: 12, fontWeight: 700, color: "#16a34a" }}>
                    {selectedIds.length} / {peopleCount} participant{selectedIds.length > 1 ? "s" : ""} sélectionné{selectedIds.length > 1 ? "s" : ""}
                  </p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {selectedIds.map(id => {
                      const emp = teamEmployees.find(e => e.id === id);
                      return emp ? (
                        <span key={id} style={{ padding: "3px 10px", borderRadius: 20, background: "#dcfce7", color: "#15803d", fontSize: 12, fontWeight: 600 }}>
                          {emp.name}
                        </span>
                      ) : null;
                    })}
                  </div>
                </div>
              )}

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {/* Ajouter la liste button — only when count is valid */}
                {validCount && (
                  <button
                    type="button"
                    onClick={openSelector}
                    style={{
                      padding: "10px 20px", borderRadius: 12,
                      border: `1.5px solid ${dark ? "#334155" : "#e2e8f0"}`,
                      background: dark ? "#1e293b" : "#f8fafc",
                      color: dark ? "#e2e8f0" : "#374151",
                      fontWeight: 700, fontSize: 14, cursor: "pointer",
                    }}
                  >
                    {selectedIds.length > 0 ? `Modifier la liste (${selectedIds.length}/${peopleCount})` : `Ajouter la liste (${peopleCount} personne${peopleCount > 1 ? "s" : ""})`}
                  </button>
                )}

                {/* Send button — only when list is complete */}
                {validCount && selectedIds.length === peopleCount && (
                  <button
                    type="button"
                    onClick={submitRequest}
                    disabled={submitting}
                    className="modifier"
                  >
                    {submitting ? "Envoi..." : "Envoyer la demande"}
                  </button>
                )}
              </div>
            </div>
          </section>

          {/* History table */}
          <section className="chef-panel">
            <div className="chef-panel-head">
              <div>
                <h2>Historique des demandes</h2>
                <p>Suivi de toutes vos demandes de formation.</p>
              </div>
              <button type="button" onClick={fetchData} className="chef-action-pill" style={{ cursor: "pointer", border: "none" }}>
                Actualiser
              </button>
            </div>

            <div className="activite-table-scroll">
              <table className="activite-table">
                <thead>
                  <tr>
                    <th>Formation</th>
                    <th>Participants</th>
                    <th>Statut</th>
                    <th>Formation assignée</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan="5">Chargement...</td></tr>
                  ) : requests.length === 0 ? (
                    <tr><td colSpan="5">Aucune demande pour le moment.</td></tr>
                  ) : requests.map(r => (
                    <tr key={r.id}>
                      <td>
                        <div style={{ fontWeight: 700 }}>{r.nom}</div>
                        <div style={{ fontSize: 12, color: "#94a3b8" }}>{r.description?.slice(0, 60)}...</div>
                      </td>
                      <td>
                        <div style={{ fontSize: 12 }}>
                          {r.participants?.length > 0
                            ? r.participants.map(p => p.name).join(", ")
                            : `${r.people_count} personne(s) demandées`}
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${STATUS_COLORS[r.status] || "badge-attente"}`}>
                          {STATUS_LABELS[r.status] || r.status_label}
                        </span>
                      </td>
                      <td style={{ fontSize: 13 }}>
                        {r.approved_formation
                          ? <><strong>{r.approved_formation.name}</strong><br /><span style={{ color: "#94a3b8", fontSize: 11 }}>{r.approved_formation.company_name} · {r.approved_formation.duration_hours}h</span></>
                          : <span style={{ color: "#94a3b8" }}>—</span>}
                      </td>
                      <td style={{ fontSize: 12, color: "#94a3b8" }}>
                        {new Date(r.created_at).toLocaleDateString("fr-FR")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>

      {/* Employee selector modal */}
      {selectorOpen && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 600,
          background: "rgba(15,23,42,0.7)",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: 16,
        }}>
          <div style={{
            background: dark ? "#0f172a" : "#fff",
            borderRadius: 24, width: "min(600px, 96vw)",
            maxHeight: "85vh", display: "flex", flexDirection: "column",
            boxShadow: "0 32px 80px rgba(0,0,0,0.3)",
            overflow: "hidden",
          }}>
            {/* Header */}
            <div style={{ padding: "20px 24px", borderBottom: `1px solid ${dark ? "#1e293b" : "#f1f5f9"}`, flexShrink: 0 }}>
              <h3 style={{ margin: 0, fontWeight: 900, color: dark ? "#f1f5f9" : "#0f172a" }}>
                Sélectionner les participants
              </h3>
              <p style={{ margin: "4px 0 0", fontSize: 13, color: "#94a3b8" }}>
                Sélectionnez <strong>{peopleCount}</strong> employé{peopleCount > 1 ? "s" : ""} — {selectedIds.length} sélectionné{selectedIds.length > 1 ? "s" : ""}
              </p>
            </div>

            {/* Employee grid */}
            <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px", display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fill, minmax(220px,1fr))" }}>
              {teamEmployees.map(emp => {
                const selected = selectedIds.includes(emp.id);
                const disabled = !selected && selectedIds.length >= peopleCount;
                return (
                  <button
                    key={emp.id}
                    type="button"
                    onClick={() => !disabled && toggleEmployee(emp.id)}
                    style={{
                      padding: "12px 16px", borderRadius: 14, textAlign: "left",
                      border: `2px solid ${selected ? "#4ade80" : (dark ? "#1e293b" : "#e2e8f0")}`,
                      background: selected ? (dark ? "#052e16" : "#f0fdf4") : (dark ? "#0a0f1a" : "#f8fafc"),
                      cursor: disabled ? "not-allowed" : "pointer",
                      opacity: disabled ? 0.45 : 1,
                      transition: "border-color 0.15s, background 0.15s",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
                        background: selected ? "#4ade80" : "#64748b",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        color: selected ? "#052e16" : "#fff", fontWeight: 800, fontSize: 14,
                      }}>
                        {emp.name?.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p style={{ margin: 0, fontWeight: 700, fontSize: 13, color: selected ? "#16a34a" : (dark ? "#e2e8f0" : "#0f172a") }}>
                          {emp.name}
                        </p>
                        {emp.position && <p style={{ margin: 0, fontSize: 11, color: "#94a3b8" }}>{emp.position}</p>}
                      </div>
                      {selected && <span style={{ marginLeft: "auto", color: "#4ade80", fontWeight: 900, fontSize: 16 }}>✓</span>}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Footer */}
            <div style={{ padding: "16px 24px", borderTop: `1px solid ${dark ? "#1e293b" : "#f1f5f9"}`, display: "flex", gap: 10, justifyContent: "flex-end", flexShrink: 0 }}>
              <button type="button" onClick={() => setSelectorOpen(false)}
                style={{ padding: "10px 20px", borderRadius: 12, border: `1px solid ${dark ? "#334155" : "#e2e8f0"}`, background: "transparent", fontWeight: 600, fontSize: 13, cursor: "pointer", color: dark ? "#94a3b8" : "#64748b" }}>
                Annuler
              </button>
              <button type="button"
                onClick={() => setSelectorOpen(false)}
                disabled={selectedIds.length !== peopleCount}
                style={{ padding: "10px 24px", borderRadius: 12, border: "none", background: selectedIds.length === peopleCount ? "#4ade80" : "#e2e8f0", color: selectedIds.length === peopleCount ? "#052e16" : "#94a3b8", fontWeight: 700, fontSize: 13, cursor: selectedIds.length === peopleCount ? "pointer" : "not-allowed" }}>
                Confirmer ({selectedIds.length}/{peopleCount})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
