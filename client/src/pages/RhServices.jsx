import NotificationBell from "../components/NotificationBell";
import { useEffect, useState } from "react";
import axios from "axios";
import Navbar from "../components/Navbar";
import useDarkModePreference from "../hooks/useDarkModePreference";
import usePersistentNavState from "../hooks/usePersistentNavState";
import { getRoleContext } from "../app/roleAccess";
import "../styles/profile.css";

const initialForm = { code: "", nomService: "", statut: "ACTIF" };

const RH_ROLES = [
  { value: "RH", label: "RH" },
  { value: "RH_CONGE", label: "RH Congé" },
  { value: "RH_FORMATION", label: "RH Formation" },
  { value: "DRH", label: "DRH" },
];
const OTHER_ROLES = [
  { value: "EMPLOYEE", label: "Employé" },
  { value: "CHEF", label: "Chef de service" },
];

export default function RhServices() {
  const [dark, setDark] = useDarkModePreference();
  const [isNavOpen, setIsNavOpen] = usePersistentNavState();
  const [roleCtx, setRoleCtx] = useState({});
  const [services, setServices] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editingCode, setEditingCode] = useState(null);
  const [editForm, setEditForm] = useState({ nomService: "", statut: "ACTIF" });
  const [expandedService, setExpandedService] = useState(null);
  const [changingRoleId, setChangingRoleId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const isDrh = roleCtx.isDrh ?? false;

  const fetchData = async () => {
    try {
      setLoading(true);
      setErrorMessage("");
      const [meRes, svcRes, empRes] = await Promise.all([
        axios.get("/api/whoami/"),
        axios.get("/api/services/"),
        axios.get("/api/employees/"),
      ]);
      setRoleCtx(getRoleContext({
        role: meRes.data?.role,
        service: meRes.data?.service,
        employee_role: meRes.data?.employee_role,
      }));
      setServices(Array.isArray(svcRes.data) ? svcRes.data : []);
      setEmployees(Array.isArray(empRes.data) ? empRes.data : []);
    } catch {
      setErrorMessage("Erreur lors du chargement des données.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const employeesByService = (serviceCode) =>
    employees.filter((e) => e.service?.code === serviceCode);

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

  const startEdit = (s) => {
    setEditingCode(s.code);
    setEditForm({ nomService: s.nomService, statut: s.statut });
    setFeedback("");
  };

  const cancelEdit = () => { setEditingCode(null); };

  const handleSaveEdit = async (code) => {
    if (!editForm.nomService.trim()) { setFeedback("Le nom est obligatoire."); return; }
    try {
      setSubmitting(true);
      setFeedback("");
      await axios.patch(`/api/services/${code}/update/`, editForm);
      setEditingCode(null);
      setFeedback("Service mis à jour.");
      await fetchData();
    } catch (err) {
      setFeedback(err.response?.data?.detail || "Erreur lors de la mise à jour.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleChangeRole = async (employeeId, newRole) => {
    try {
      setChangingRoleId(employeeId);
      await axios.patch(`/api/employees/${employeeId}/role/`, { employee_role: newRole });
      setFeedback("Rôle mis à jour.");
      await fetchData();
    } catch (err) {
      setFeedback(err.response?.data?.detail || "Erreur lors du changement de rôle.");
    } finally {
      setChangingRoleId(null);
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
  const inp = {
    padding: "10px 12px", borderRadius: 10,
    border: `1px solid ${dark ? "#334155" : "#cbd5e1"}`,
    background: dark ? "#0f172a" : "#ffffff",
    color: dark ? "#e2e8f0" : "#0f172a",
    boxSizing: "border-box",
  };

  const isRhService = (code) => code === "HR";
  const rolesForService = (code) => isRhService(code) ? RH_ROLES : OTHER_ROLES;

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
              <p className="morinfo">Gérez les services et les rôles de chaque membre.</p>
            </div>
            <div className="yamin">
              <button className="nav-toggle" onClick={() => setIsNavOpen((p) => !p)} type="button">
                {isNavOpen ? "Masquer menu" : "Afficher menu"}
              </button>
              <button className="mode" onClick={() => setDark((p) => !p)} type="button">
                {dark ? "mode clair" : "mode sombre"}
              </button>
              <NotificationBell dark={dark} />
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
              {feedback && (
                <p style={{ color: feedback.includes("Erreur") ? "#ef4444" : "#22c55e", fontSize: 13, marginBottom: 12 }}>
                  {feedback}
                </p>
              )}

              {/* Create service form */}
              {isDrh && (
                <section className={`info-per border rounded-2xl p-6 mb-6 ${cardBg}`}>
                  <div className="top mb-4">
                    <h2 className="title">Nouveau service</h2>
                  </div>
                  <form onSubmit={handleCreate} style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
                    <div style={{ flex: "1 1 120px" }}>
                      <label className="desc" style={{ display: "block", marginBottom: 4 }}>Code *</label>
                      <input style={{ ...inp, width: "100%" }} value={form.code} onChange={(e) => setForm((p) => ({ ...p, code: e.target.value.toUpperCase() }))} placeholder="ex: IT" maxLength={20} />
                    </div>
                    <div style={{ flex: "2 1 200px" }}>
                      <label className="desc" style={{ display: "block", marginBottom: 4 }}>Nom *</label>
                      <input style={{ ...inp, width: "100%" }} value={form.nomService} onChange={(e) => setForm((p) => ({ ...p, nomService: e.target.value }))} placeholder="ex: Informatique" />
                    </div>
                    <div style={{ flex: "1 1 120px" }}>
                      <label className="desc" style={{ display: "block", marginBottom: 4 }}>Statut</label>
                      <select style={{ ...inp, width: "100%" }} value={form.statut} onChange={(e) => setForm((p) => ({ ...p, statut: e.target.value }))}>
                        <option value="ACTIF">ACTIF</option>
                        <option value="INACTIF">INACTIF</option>
                      </select>
                    </div>
                    <button type="submit" disabled={submitting} style={{ padding: "10px 24px", borderRadius: 10, background: "#3b82f6", color: "#fff", border: "none", fontWeight: 600, cursor: "pointer", height: 44 }}>
                      {submitting ? "..." : "Créer"}
                    </button>
                  </form>
                </section>
              )}

              {/* Services list */}
              <section className={`info-per border rounded-2xl p-6 ${cardBg}`}>
                <div className="top mb-4">
                  <h2 className="title">Services ({services.length})</h2>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {services.map((s) => {
                    const serviceEmps = employeesByService(s.code);
                    const isExpanded = expandedService === s.code;
                    const isEditing = editingCode === s.code;
                    const availableRoles = rolesForService(s.code);
                    const isHR = s.code === "HR";

                    return (
                      <div key={s.code} style={{ borderRadius: 12, border: `2px solid ${isHR ? (dark ? "#6366f1" : "#818cf8") : (dark ? "#334155" : "#e2e8f0")}`, overflow: "hidden" }}>
                        {/* Service header */}
                        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: isHR ? (dark ? "#1e1b4b" : "#eef2ff") : (dark ? "#0f172a" : "#f8fafc"), flexWrap: "wrap" }}>
                          {isEditing ? (
                            <>
                              <span style={{ fontWeight: 700, color: dark ? "#e2e8f0" : "#0f172a", minWidth: 60 }}>{s.code}</span>
                              <input style={{ ...inp, flex: 1, minWidth: 140 }} value={editForm.nomService} onChange={(e) => setEditForm((p) => ({ ...p, nomService: e.target.value }))} />
                              <select style={{ ...inp, width: 110 }} value={editForm.statut} onChange={(e) => setEditForm((p) => ({ ...p, statut: e.target.value }))}>
                                <option value="ACTIF">ACTIF</option>
                                <option value="INACTIF">INACTIF</option>
                              </select>
                              <button onClick={() => handleSaveEdit(s.code)} disabled={submitting} style={{ padding: "6px 14px", borderRadius: 8, background: "#22c55e", color: "#fff", border: "none", fontWeight: 600, cursor: "pointer", fontSize: 13 }}>Sauvegarder</button>
                              <button onClick={cancelEdit} style={{ padding: "6px 14px", borderRadius: 8, background: "transparent", color: dark ? "#94a3b8" : "#64748b", border: `1px solid ${dark ? "#334155" : "#cbd5e1"}`, fontWeight: 600, cursor: "pointer", fontSize: 13 }}>Annuler</button>
                            </>
                          ) : (
                            <>
                              <span style={{ fontWeight: 700, color: dark ? "#e2e8f0" : "#0f172a", minWidth: 50 }}>{s.code}</span>
                              <span className="desc" style={{ flex: 1 }}>{s.nomService}</span>
                              {isHR && (
                                <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 10px", borderRadius: 6, background: "#6366f1", color: "#fff" }}>
                                  Service par défaut · 4 rôles RH
                                </span>
                              )}
                              {!isHR && (
                                <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 6, background: "#dbeafe", color: "#1d4ed8" }}>
                                  2 rôles (Employé, Chef)
                                </span>
                              )}
                              <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 6, background: s.statut === "ACTIF" ? "#dcfce7" : "#fee2e2", color: s.statut === "ACTIF" ? "#16a34a" : "#dc2626" }}>{s.statut}</span>
                              <span className="desc" style={{ fontSize: 12 }}>{serviceEmps.length} membre(s)</span>
                              <button onClick={() => setExpandedService(isExpanded ? null : s.code)} style={{ padding: "5px 12px", borderRadius: 8, background: "transparent", border: `1px solid ${dark ? "#334155" : "#cbd5e1"}`, color: dark ? "#e2e8f0" : "#0f172a", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
                                {isExpanded ? "Masquer" : "Voir rôles"}
                              </button>
                              {isDrh && (
                                <>
                                  <button onClick={() => startEdit(s)} style={{ padding: "5px 12px", borderRadius: 8, background: "#3b82f6", color: "#fff", border: "none", fontWeight: 600, cursor: "pointer", fontSize: 12 }}>Modifier</button>
                                  {!isHR && (
                                    <button onClick={() => handleDelete(s.code)} style={{ padding: "5px 12px", borderRadius: 8, background: "#ef4444", color: "#fff", border: "none", fontWeight: 600, cursor: "pointer", fontSize: 12 }}>Supprimer</button>
                                  )}
                                </>
                              )}
                            </>
                          )}
                        </div>

                        {/* Employees + roles panel */}
                        {isExpanded && (
                          <div style={{ padding: "12px 16px", borderTop: `1px solid ${dark ? "#334155" : "#e2e8f0"}`, background: dark ? "#020617" : "#ffffff" }}>
                            {serviceEmps.length === 0 ? (
                              <p className="desc" style={{ fontSize: 13 }}>Aucun employé dans ce service.</p>
                            ) : (
                              <table className="activite-table">
                                <thead>
                                  <tr>
                                    <th>Nom</th>
                                    <th>Email</th>
                                    <th>Rôle actuel</th>
                                    {isDrh && <th>Changer le rôle</th>}
                                  </tr>
                                </thead>
                                <tbody>
                                  {serviceEmps.map((emp) => (
                                    <tr key={emp.id}>
                                      <td>{`${emp.first_name || ""} ${emp.last_name || ""}`.trim() || "-"}</td>
                                      <td style={{ fontSize: 12 }}>{emp.email}</td>
                                      <td>
                                        <span style={{ fontWeight: 600 }}>
                                          {availableRoles.find((r) => r.value === emp.employee_role)?.label || emp.employee_role || "-"}
                                        </span>
                                      </td>
                                      {isDrh && (
                                        <td>
                                          <select
                                            value={emp.employee_role || "EMPLOYEE"}
                                            disabled={changingRoleId === emp.id}
                                            onChange={(e) => handleChangeRole(emp.id, e.target.value)}
                                            style={{ ...inp, width: "auto", padding: "4px 8px", fontSize: 13 }}
                                          >
                                            {availableRoles.map((r) => (
                                              <option key={r.value} value={r.value}>{r.label}</option>
                                            ))}
                                          </select>
                                        </td>
                                      )}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
