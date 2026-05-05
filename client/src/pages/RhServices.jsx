import { useEffect, useState } from "react";
import axios from "axios";
import Navbar from "../components/Navbar";
import useDarkModePreference from "../hooks/useDarkModePreference";
import usePersistentNavState from "../hooks/usePersistentNavState";
import { getRoleContext } from "../app/roleAccess";
import "../styles/profile.css";

const initialForm = { code: "", nomService: "", statut: "ACTIF" };

export default function RhServices() {
  const [dark, setDark] = useDarkModePreference();
  const [isNavOpen, setIsNavOpen] = usePersistentNavState();
  const [roleCtx, setRoleCtx] = useState({});
  const [services, setServices] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const isDrh = roleCtx.isDrh ?? false;

  const fetchData = async () => {
    try {
      setLoading(true);
      setErrorMessage("");
      const [meRes, svcRes] = await Promise.all([
        axios.get("/api/whoami/"),
        axios.get("/api/services/"),
      ]);
      setRoleCtx(getRoleContext({
        role: meRes.data?.role,
        service: meRes.data?.service,
        employee_role: meRes.data?.employee_role,
      }));
      setServices(Array.isArray(svcRes.data) ? svcRes.data : []);
    } catch {
      setErrorMessage("Erreur lors du chargement des données.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.code.trim() || !form.nomService.trim()) {
      setFeedback("Le code et le nom sont obligatoires.");
      return;
    }
    try {
      setSubmitting(true);
      setFeedback("");
      await axios.post("/api/services/create/", form);
      setForm(initialForm);
      setFeedback("Service créé avec succès.");
      await fetchData();
    } catch (err) {
      setFeedback(err.response?.data?.detail || "Erreur lors de la création.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (code) => {
    if (!window.confirm(`Supprimer le service « ${code} » ?`)) return;
    try {
      setFeedback("");
      await axios.delete(`/api/services/${code}/delete/`);
      setFeedback("Service supprimé.");
      await fetchData();
    } catch (err) {
      setFeedback(err.response?.data?.detail || "Erreur lors de la suppression.");
    }
  };

  const cardBg = dark ? "bg-slate-900 border-slate-700" : "bg-white border-slate-200";
  const inputStyle = {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 10,
    border: `1px solid ${dark ? "#334155" : "#cbd5e1"}`,
    background: dark ? "#0f172a" : "#ffffff",
    color: dark ? "#e2e8f0" : "#0f172a",
    boxSizing: "border-box",
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
              <h1 className="monprofile">Gestion des services</h1>
              <p className="morinfo">Créez et supprimez les services de l'organisation.</p>
            </div>
            <div className="yamin">
              <button className="nav-toggle" onClick={() => setIsNavOpen((p) => !p)} type="button">
                {isNavOpen ? "Masquer menu" : "Afficher menu"}
              </button>
              <button className="mode" onClick={() => setDark((p) => !p)} type="button">
                {dark ? "mode clair" : "mode sombre"}
              </button>
            </div>
          </div>
        </div>

        <div className="infopro-infoper">
          {loading ? (
            <p className="desc" style={{ padding: 32 }}>Chargement...</p>
          ) : errorMessage ? (
            <p style={{ color: "#ef4444", padding: 32 }}>{errorMessage}</p>
          ) : (
            <>
              {isDrh && (
                <section className={`info-per border rounded-2xl p-6 mb-6 ${cardBg}`}>
                  <div className="top mb-4">
                    <h2 className="title">Nouveau service</h2>
                    <p className="desc">Remplissez le formulaire pour créer un service.</p>
                  </div>
                  <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                      <div>
                        <label className="desc" style={{ display: "block", marginBottom: 4 }}>Code *</label>
                        <input
                          style={inputStyle}
                          value={form.code}
                          onChange={(e) => setForm((p) => ({ ...p, code: e.target.value.toUpperCase() }))}
                          placeholder="ex: IT"
                          maxLength={20}
                        />
                      </div>
                      <div>
                        <label className="desc" style={{ display: "block", marginBottom: 4 }}>Nom du service *</label>
                        <input
                          style={inputStyle}
                          value={form.nomService}
                          onChange={(e) => setForm((p) => ({ ...p, nomService: e.target.value }))}
                          placeholder="ex: Informatique"
                        />
                      </div>
                      <div>
                        <label className="desc" style={{ display: "block", marginBottom: 4 }}>Statut</label>
                        <select
                          style={inputStyle}
                          value={form.statut}
                          onChange={(e) => setForm((p) => ({ ...p, statut: e.target.value }))}
                        >
                          <option value="ACTIF">ACTIF</option>
                          <option value="INACTIF">INACTIF</option>
                        </select>
                      </div>
                    </div>
                    {feedback && (
                      <p style={{ color: feedback.includes("succès") || feedback.includes("supprimé") ? "#22c55e" : "#ef4444", fontSize: 13 }}>
                        {feedback}
                      </p>
                    )}
                    <button
                      type="submit"
                      disabled={submitting}
                      style={{
                        alignSelf: "flex-start",
                        padding: "10px 24px",
                        borderRadius: 10,
                        background: "#3b82f6",
                        color: "#fff",
                        border: "none",
                        fontWeight: 600,
                        cursor: submitting ? "not-allowed" : "pointer",
                        opacity: submitting ? 0.7 : 1,
                      }}
                    >
                      {submitting ? "Création..." : "Créer le service"}
                    </button>
                  </form>
                </section>
              )}

              <section className={`info-per border rounded-2xl p-6 ${cardBg}`}>
                <div className="top mb-4">
                  <h2 className="title">Services ({services.length})</h2>
                  <p className="desc">Liste de tous les services de l'organisation.</p>
                </div>
                {services.length === 0 ? (
                  <p className="desc">Aucun service enregistré.</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {services.map((s) => (
                      <div
                        key={s.code}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "12px 16px",
                          borderRadius: 10,
                          background: dark ? "#0f172a" : "#f8fafc",
                          border: `1px solid ${dark ? "#334155" : "#e2e8f0"}`,
                        }}
                      >
                        <div>
                          <span style={{ fontWeight: 700, marginRight: 12, color: dark ? "#e2e8f0" : "#0f172a" }}>
                            {s.code}
                          </span>
                          <span className="desc">{s.nomService}</span>
                          <span
                            style={{
                              marginLeft: 12,
                              fontSize: 11,
                              fontWeight: 600,
                              padding: "2px 8px",
                              borderRadius: 6,
                              background: s.statut === "ACTIF" ? "#dcfce7" : "#fee2e2",
                              color: s.statut === "ACTIF" ? "#16a34a" : "#dc2626",
                            }}
                          >
                            {s.statut}
                          </span>
                        </div>
                        {isDrh && (
                          <button
                            onClick={() => handleDelete(s.code)}
                            style={{
                              padding: "6px 14px",
                              borderRadius: 8,
                              background: "#ef4444",
                              color: "#fff",
                              border: "none",
                              fontWeight: 600,
                              cursor: "pointer",
                              fontSize: 13,
                            }}
                          >
                            Supprimer
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
