import NotificationBell from "../components/NotificationBell";
import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import Navbar from "../components/Navbar";
import useDarkModePreference from "../hooks/useDarkModePreference";
import usePersistentNavState from "../hooks/usePersistentNavState";
import { getRoleContext } from "../app/roleAccess";
import "../styles/profile.css";

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
  const [positions, setPositions] = useState([]);
  const [expanded, setExpanded] = useState(null);

  // service form
  const [svcForm, setSvcForm] = useState({ code: "", nomService: "", statut: "ACTIF" });
  const [editingCode, setEditingCode] = useState(null);
  const [editForm, setEditForm] = useState({ nomService: "", statut: "ACTIF" });

  // post form per service
  const [newPostName, setNewPostName] = useState("");
  const [postSubmitting, setPostSubmitting] = useState(false);

  const [changingRoleId, setChangingRoleId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState("");

  const isDrh = roleCtx.isDrh ?? false;

  const inp = {
    padding: "9px 12px", borderRadius: 10,
    border: `1px solid ${dark ? "#334155" : "#cbd5e1"}`,
    background: dark ? "#0f172a" : "#fff",
    color: dark ? "#e2e8f0" : "#0f172a",
    fontSize: 13, boxSizing: "border-box",
  };

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [meRes, svcRes, empRes, posRes] = await Promise.all([
        axios.get("/api/whoami/"),
        axios.get("/api/services/"),
        axios.get("/api/employees/"),
        axios.get("/api/positions/"),
      ]);
      setRoleCtx(getRoleContext({ role: meRes.data?.role, service: meRes.data?.service, employee_role: meRes.data?.employee_role }));
      setServices(Array.isArray(svcRes.data) ? svcRes.data : []);
      setEmployees(Array.isArray(empRes.data) ? empRes.data : []);
      setPositions(Array.isArray(posRes.data) ? posRes.data : []);
    } catch { setFeedback("Erreur de chargement."); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, []);

  const empsOf = (code) => employees.filter(e => e.service?.code === code);
  const postsOf = (code) => positions.filter(p => p.service === code);

  const createService = async (e) => {
    e.preventDefault();
    if (!svcForm.code.trim() || !svcForm.nomService.trim()) return;
    try {
      setSubmitting(true);
      await axios.post("/api/services/create/", svcForm);
      setSvcForm({ code: "", nomService: "", statut: "ACTIF" });
      setFeedback("Service créé.");
      await fetchAll();
    } catch (err) { setFeedback(err.response?.data?.detail || "Erreur."); }
    finally { setSubmitting(false); }
  };

  const saveEdit = async (code) => {
    try {
      setSubmitting(true);
      await axios.patch(`/api/services/${code}/update/`, editForm);
      setEditingCode(null);
      setFeedback("Service mis à jour.");
      await fetchAll();
    } catch (err) { setFeedback(err.response?.data?.detail || "Erreur."); }
    finally { setSubmitting(false); }
  };

  const deleteService = async (code) => {
    if (!window.confirm(`Supprimer le service « ${code} » ?`)) return;
    try {
      await axios.delete(`/api/services/${code}/delete/`);
      setFeedback("Service supprimé.");
      await fetchAll();
    } catch (err) { setFeedback(err.response?.data?.detail || "Erreur."); }
  };

  const createPost = async (serviceCode) => {
    if (!newPostName.trim()) return;
    try {
      setPostSubmitting(true);
      await axios.post("/api/positions/create/", { name: newPostName.trim(), service_code: serviceCode });
      setNewPostName("");
      const res = await axios.get("/api/positions/");
      setPositions(Array.isArray(res.data) ? res.data : []);
    } catch (err) { setFeedback(err.response?.data?.detail || "Erreur."); }
    finally { setPostSubmitting(false); }
  };

  const deletePost = async (id) => {
    try {
      await axios.delete(`/api/positions/${id}/delete/`);
      setPositions(prev => prev.filter(p => p.id !== id));
    } catch (err) { setFeedback(err.response?.data?.detail || "Impossible de supprimer."); }
  };

  const changeRole = async (empId, newRole) => {
    try {
      setChangingRoleId(empId);
      await axios.patch(`/api/employees/${empId}/role/`, { employee_role: newRole });
      setFeedback("Rôle mis à jour.");
      await fetchAll();
    } catch (err) { setFeedback(err.response?.data?.detail || "Erreur."); }
    finally { setChangingRoleId(null); }
  };

  const statColor = (s) => s === "ACTIF"
    ? { bg: "#dcfce7", color: "#15803d" }
    : { bg: "#fee2e2", color: "#dc2626" };

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
              <h1 className="monprofile">Services & Postes</h1>
              <p className="morinfo">Organisez les services, leurs postes et les rôles des membres.</p>
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

        <div style={{ width: "96%", margin: "0 auto", paddingBottom: 40 }}>

          {feedback && (
            <p style={{ padding: "10px 16px", marginTop: 16, borderRadius: 10, fontSize: 13, fontWeight: 600,
              background: feedback.includes("Erreur") || feedback.includes("Impossible") ? "#fee2e2" : "#dcfce7",
              color: feedback.includes("Erreur") || feedback.includes("Impossible") ? "#dc2626" : "#15803d" }}>
              {feedback}
            </p>
          )}

          {/* ── Create service ── */}
          {isDrh && (
            <section style={{ marginTop: 24, padding: "20px 24px", borderRadius: 20, border: `1px solid ${dark ? "#334155" : "#e2e8f0"}`, background: dark ? "#0f172a" : "#fff" }}>
              <p style={{ margin: "0 0 14px", fontWeight: 800, fontSize: 15, color: dark ? "#f1f5f9" : "#0f172a" }}>
                + Nouveau service
              </p>
              <form onSubmit={createService} style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
                <div style={{ flex: "0 1 110px" }}>
                  <label style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "#64748b", display: "block", marginBottom: 4 }}>Code</label>
                  <input style={{ ...inp, width: "100%", fontWeight: 700 }} value={svcForm.code}
                    onChange={e => setSvcForm(p => ({ ...p, code: e.target.value.toUpperCase() }))}
                    placeholder="EX: IT" maxLength={10} />
                </div>
                <div style={{ flex: "2 1 200px" }}>
                  <label style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "#64748b", display: "block", marginBottom: 4 }}>Nom du service</label>
                  <input style={{ ...inp, width: "100%" }} value={svcForm.nomService}
                    onChange={e => setSvcForm(p => ({ ...p, nomService: e.target.value }))} placeholder="ex: Informatique" />
                </div>
                <div style={{ flex: "0 1 120px" }}>
                  <label style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "#64748b", display: "block", marginBottom: 4 }}>Statut</label>
                  <select style={{ ...inp, width: "100%" }} value={svcForm.statut}
                    onChange={e => setSvcForm(p => ({ ...p, statut: e.target.value }))}>
                    <option value="ACTIF">Actif</option>
                    <option value="INACTIF">Inactif</option>
                  </select>
                </div>
                <button type="submit" disabled={submitting} style={{ padding: "9px 22px", borderRadius: 10, background: "#3b82f6", color: "#fff", border: "none", fontWeight: 700, cursor: "pointer", fontSize: 13, height: 40 }}>
                  {submitting ? "..." : "Créer"}
                </button>
              </form>
            </section>
          )}

          {/* ── Services list ── */}
          {loading ? (
            <p style={{ padding: 32, color: "#94a3b8" }}>Chargement...</p>
          ) : (
            <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 12 }}>
              {services.map(s => {
                const isHR = s.code === "HR";
                const posts = postsOf(s.code);
                const emps = empsOf(s.code);
                const roles = isHR ? RH_ROLES : OTHER_ROLES;
                const isOpen = expanded === s.code;
                const isEditing = editingCode === s.code;
                const stat = statColor(s.statut);

                return (
                  <div key={s.code} style={{ borderRadius: 18, border: `1.5px solid ${isHR ? "#818cf8" : (dark ? "#334155" : "#e2e8f0")}`, overflow: "hidden", transition: "box-shadow 0.15s", boxShadow: isOpen ? (dark ? "0 4px 24px #0f172a88" : "0 4px 20px #0001") : "none" }}>

                    {/* Header row */}
                    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 20px", background: isHR ? (dark ? "#1e1b4b" : "#eef2ff") : (dark ? "#0f172a" : "#f8fafc"), flexWrap: "wrap" }}>
                      {isEditing ? (
                        <>
                          <span style={{ fontWeight: 800, color: dark ? "#e2e8f0" : "#0f172a", minWidth: 50, fontSize: 14 }}>{s.code}</span>
                          <input style={{ ...inp, flex: 1, minWidth: 140 }} value={editForm.nomService} onChange={e => setEditForm(p => ({ ...p, nomService: e.target.value }))} />
                          <select style={{ ...inp, width: 110 }} value={editForm.statut} onChange={e => setEditForm(p => ({ ...p, statut: e.target.value }))}>
                            <option value="ACTIF">Actif</option>
                            <option value="INACTIF">Inactif</option>
                          </select>
                          <button onClick={() => saveEdit(s.code)} disabled={submitting} style={{ padding: "7px 16px", borderRadius: 9, background: "#22c55e", color: "#fff", border: "none", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>Sauvegarder</button>
                          <button onClick={() => setEditingCode(null)} style={{ padding: "7px 14px", borderRadius: 9, border: `1px solid ${dark ? "#334155" : "#cbd5e1"}`, background: "transparent", color: dark ? "#94a3b8" : "#64748b", fontWeight: 600, cursor: "pointer", fontSize: 13 }}>Annuler</button>
                        </>
                      ) : (
                        <>
                          {/* Code badge */}
                          <span style={{ fontWeight: 900, fontSize: 13, padding: "3px 10px", borderRadius: 8, background: isHR ? "#6366f1" : (dark ? "#1e293b" : "#e2e8f0"), color: isHR ? "#fff" : (dark ? "#e2e8f0" : "#374151") }}>
                            {s.code}
                          </span>
                          <span style={{ fontWeight: 700, fontSize: 15, flex: 1, color: dark ? "#f1f5f9" : "#0f172a" }}>{s.nomService}</span>

                          {/* Tags */}
                          <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 6, background: stat.bg, color: stat.color }}>{s.statut}</span>
                          {isHR && (
                            <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 6, background: "#ede9fe", color: "#7c3aed" }}>
                              {roles.length} rôles RH
                            </span>
                          )}
                          {!isHR && (
                            <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 6, background: dark ? "#1e3a5f" : "#dbeafe", color: dark ? "#93c5fd" : "#1d4ed8" }}>
                              {posts.length} poste{posts.length !== 1 ? "s" : ""}
                            </span>
                          )}
                          <span style={{ fontSize: 12, color: "#94a3b8" }}>{emps.length} membre{emps.length !== 1 ? "s" : ""}</span>

                          {/* Actions */}
                          <button onClick={() => setExpanded(isOpen ? null : s.code)}
                            style={{ padding: "6px 14px", borderRadius: 9, border: `1px solid ${dark ? "#334155" : "#cbd5e1"}`, background: isOpen ? (dark ? "#1e293b" : "#f1f5f9") : "transparent", color: dark ? "#e2e8f0" : "#374151", fontWeight: 600, cursor: "pointer", fontSize: 12 }}>
                            {isOpen ? "Réduire ▲" : "Détails ▼"}
                          </button>
                          {isDrh && (
                            <>
                              <button onClick={() => { setEditingCode(s.code); setEditForm({ nomService: s.nomService, statut: s.statut }); }}
                                style={{ padding: "6px 12px", borderRadius: 9, background: "#3b82f6", color: "#fff", border: "none", fontWeight: 600, cursor: "pointer", fontSize: 12 }}>
                                Modifier
                              </button>
                              {!isHR && (
                                <button onClick={() => deleteService(s.code)}
                                  style={{ padding: "6px 12px", borderRadius: 9, background: "#ef4444", color: "#fff", border: "none", fontWeight: 600, cursor: "pointer", fontSize: 12 }}>
                                  Supprimer
                                </button>
                              )}
                            </>
                          )}
                        </>
                      )}
                    </div>

                    {/* Expanded panel */}
                    {isOpen && (
                      <div style={{ padding: "20px", borderTop: `1px solid ${dark ? "#1e293b" : "#f1f5f9"}`, background: dark ? "#020617" : "#fff", display: "grid", gridTemplateColumns: isHR ? "1fr" : "260px 1fr", gap: 20 }}>

                        {/* Left: Postes (non-HR only) */}
                        {!isHR && (
                          <div style={{ borderRadius: 14, border: `1px solid ${dark ? "#1e293b" : "#e2e8f0"}`, padding: "16px", background: dark ? "#0f172a" : "#f8fafc" }}>
                            <p style={{ margin: "0 0 12px", fontWeight: 800, fontSize: 13, color: dark ? "#e2e8f0" : "#0f172a", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                              Postes
                            </p>

                            {/* Existing posts */}
                            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
                              {posts.length === 0 ? (
                                <p style={{ fontSize: 12, color: "#94a3b8", margin: 0 }}>Aucun poste. Créez-en un ci-dessous.</p>
                              ) : posts.map(p => (
                                <div key={p.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6, padding: "7px 12px", borderRadius: 10, border: `1px solid ${dark ? "#334155" : "#e2e8f0"}`, background: dark ? "#1e293b" : "#fff" }}>
                                  <span style={{ fontSize: 13, fontWeight: 600, color: dark ? "#e2e8f0" : "#0f172a" }}>{p.name}</span>
                                  {isDrh && (
                                    <button onClick={() => deletePost(p.id)} type="button"
                                      style={{ border: "none", background: "none", cursor: "pointer", color: "#ef4444", fontWeight: 800, fontSize: 16, lineHeight: 1, padding: "0 2px" }}
                                      title="Supprimer">×</button>
                                  )}
                                </div>
                              ))}
                            </div>

                            {/* Add post */}
                            {isDrh && (
                              <div style={{ display: "flex", gap: 6 }}>
                                <input
                                  value={newPostName}
                                  onChange={e => setNewPostName(e.target.value)}
                                  onKeyDown={e => e.key === "Enter" && createPost(s.code)}
                                  placeholder="Nouveau poste..."
                                  style={{ ...inp, flex: 1 }}
                                />
                                <button type="button" onClick={() => createPost(s.code)} disabled={postSubmitting || !newPostName.trim()}
                                  style={{ padding: "8px 14px", borderRadius: 10, background: "#22c55e", color: "#fff", border: "none", fontWeight: 700, cursor: "pointer", fontSize: 13, whiteSpace: "nowrap" }}>
                                  {postSubmitting ? "..." : "+ Ajouter"}
                                </button>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Right: Members + roles */}
                        <div>
                          <p style={{ margin: "0 0 12px", fontWeight: 800, fontSize: 13, color: dark ? "#e2e8f0" : "#0f172a", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                            Membres ({emps.length})
                          </p>
                          {emps.length === 0 ? (
                            <p style={{ fontSize: 12, color: "#94a3b8" }}>Aucun employé dans ce service.</p>
                          ) : (
                            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                              {emps.map(emp => (
                                <div key={emp.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 12, border: `1px solid ${dark ? "#1e293b" : "#e2e8f0"}`, background: dark ? "#0f172a" : "#f8fafc", flexWrap: "wrap" }}>
                                  <div style={{ flex: 1, minWidth: 120 }}>
                                    <p style={{ margin: 0, fontWeight: 700, fontSize: 13, color: dark ? "#f1f5f9" : "#0f172a" }}>
                                      {`${emp.first_name || ""} ${emp.last_name || ""}`.trim() || "-"}
                                    </p>
                                    <p style={{ margin: 0, fontSize: 11, color: "#94a3b8" }}>{emp.email}</p>
                                  </div>
                                  {emp.position && (
                                    <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 6, background: dark ? "#1e3a5f" : "#dbeafe", color: dark ? "#93c5fd" : "#1d4ed8" }}>
                                      {emp.position}
                                    </span>
                                  )}
                                  {isDrh ? (
                                    <select value={emp.employee_role || "EMPLOYEE"} disabled={changingRoleId === emp.id}
                                      onChange={e => changeRole(emp.id, e.target.value)}
                                      style={{ ...inp, padding: "5px 8px", fontSize: 12, width: "auto" }}>
                                      {roles.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                                    </select>
                                  ) : (
                                    <span style={{ fontSize: 12, fontWeight: 600, color: dark ? "#94a3b8" : "#64748b" }}>
                                      {roles.find(r => r.value === emp.employee_role)?.label || emp.employee_role || "-"}
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
