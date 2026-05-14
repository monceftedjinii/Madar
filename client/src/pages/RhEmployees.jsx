import NotificationBell from "../components/NotificationBell";
import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import Navbar from "../components/Navbar";
import useDarkModePreference from "../hooks/useDarkModePreference";
import usePersistentNavState from "../hooks/usePersistentNavState";
import { getRoleContext } from "../app/roleAccess";
import "../styles/profile.css";

const RH_SERVICE_ROLES = [
  { value: "RH", label: "RH" },
  { value: "RH_FORMATION", label: "RH Formation" },
  { value: "RH_CONGE", label: "RH Congé" },
];
const OTHER_ROLES = [
  { value: "EMPLOYEE", label: "Employé" },
  { value: "CHEF", label: "Chef de service" },
];

const initialForm = {
  first_name: "",
  last_name: "",
  email: "",
  sexe: "HOMME",
  birth_date: "",
  service: "",
  position: "",
  phone_number: "",
  address: "",
  contract_type: "CDI",
  salary: "",
  attendance_pin: "",
  employee_role: "EMPLOYEE",
};

export default function RhEmployees() {
  const [dark, setDark] = useDarkModePreference();
  const [isNavOpen, setIsNavOpen] = usePersistentNavState();
  const [roleCtx, setRoleCtx] = useState({});
  const [employees, setEmployees] = useState([]);
  const [services, setServices] = useState([]);
  const [positions, setPositions] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editingEmployeeId, setEditingEmployeeId] = useState(null);
  const [actionId, setActionId] = useState(null);
  const [feedback, setFeedback] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [detailEmployee, setDetailEmployee] = useState(null);
  const [editModal, setEditModal] = useState(false);
  // Postes management
  const [newPosteName, setNewPosteName] = useState("");
  const [newPosteService, setNewPosteService] = useState("");
  const [posteSubmitting, setPosteSubmitting] = useState(false);
  const [posteFeedback, setPosteFeedback] = useState("");

  const canManageEmployees = roleCtx.canManageEmployees ?? roleCtx.isDrh ?? false;
  const isGrh = roleCtx.isDrh ?? false;

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
      const [meResponse, employeesResponse, servicesResponse, positionsResponse] = await Promise.all([
        axios.get("/api/whoami/"),
        axios.get("/api/employees/"),
        axios.get("/api/services/"),
        axios.get("/api/positions/"),
      ]);
      setRoleCtx(getRoleContext({ role: meResponse.data?.role, service: meResponse.data?.service, employee_role: meResponse.data?.employee_role }));
      setEmployees(Array.isArray(employeesResponse.data) ? employeesResponse.data : []);
      setServices(Array.isArray(servicesResponse.data) ? servicesResponse.data : []);
      setPositions(Array.isArray(positionsResponse.data) ? positionsResponse.data : []);
    } catch (error) {
      console.error("Erreur chargement gestion employes RH:", error);
      setEmployees([]);
      setErrorMessage("Impossible de charger les employes RH.");
    } finally {
      setLoading(false);
    }
  };

  const createPoste = async () => {
    if (!newPosteName.trim() || !newPosteService) return;
    try {
      setPosteSubmitting(true);
      setPosteFeedback("");
      await axios.post("/api/positions/create/", { name: newPosteName.trim(), service_code: newPosteService });
      setPosteFeedback("Poste créé avec succès.");
      setNewPosteName("");
      const res = await axios.get("/api/positions/");
      setPositions(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setPosteFeedback(err?.response?.data?.detail || "Erreur lors de la création.");
    } finally {
      setPosteSubmitting(false);
    }
  };

  const deletePoste = async (id) => {
    try {
      await axios.delete(`/api/positions/${id}/delete/`);
      setPositions(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      setPosteFeedback(err?.response?.data?.detail || "Impossible de supprimer ce poste.");
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const stats = useMemo(() => {
    const online = employees.filter((item) => item.is_online).length;
    const cdi = employees.filter((item) => item.contract_type === "CDI").length;
    const cdd = employees.filter((item) => item.contract_type === "CDD").length;
    const stage = employees.filter((item) => item.contract_type === "STAGE").length;
    return { total: employees.length, online, cdi, cdd, stage };
  }, [employees]);

  const resetForm = () => {
    setForm(initialForm);
    setEditingEmployeeId(null);
    setEditModal(false);
  };

  const submitEmployee = async (event) => {
    event.preventDefault();
    if (!canManageEmployees) return;
    try {
      setSubmitting(true);
      setFeedback("");
      setErrorMessage("");
      if (editingEmployeeId) {
        await axios.patch(`/api/employees/${editingEmployeeId}/update/`, form);
        setFeedback("Employé mis à jour avec succès.");
        setEditModal(false);
      } else {
        const response = await axios.post("/api/employees/create/", form);
        const credentials = response.data?.credentials;
        setFeedback(
          credentials
            ? `Employe cree. Identifiant: ${credentials.email} / Mot de passe temporaire: ${credentials.temporary_password}`
            : "Employe cree avec succes.",
        );
      }
      resetForm();
      await fetchData();
    } catch (error) {
      console.error("Erreur enregistrement employe RH:", error);
      setErrorMessage(error?.response?.data?.detail || "Impossible d'enregistrer cet employe.");
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = (employee) => {
    setEditingEmployeeId(employee.id);
    setForm({
      first_name: employee.first_name || "",
      last_name: employee.last_name || "",
      email: employee.email || "",
      sexe: employee.sexe || "HOMME",
      birth_date: employee.birth_date || "",
      service: employee.service?.code || "",
      position: (employee.employee_role === "CHEF" ? "" : employee.position) || "",
      phone_number: employee.phone_number || "",
      address: employee.address || "",
      contract_type: employee.contract_type || "CDI",
      salary: employee.salary || "",
      attendance_pin: employee.attendance_pin || "",
      employee_role: employee.employee_role || "EMPLOYEE",
    });
    setEditModal(true);
    setFeedback("");
    setErrorMessage("");
  };

  const deleteEmployee = async (employeeId) => {
    if (!window.confirm("Supprimer cet employe ?")) return;
    try {
      setActionId(employeeId);
      setFeedback("");
      setErrorMessage("");
      await axios.delete(`/api/employees/${employeeId}/delete/`);
      setFeedback("Employe supprime avec succes.");
      await fetchData();
    } catch (error) {
      console.error("Erreur suppression employe RH:", error);
      setErrorMessage(error?.response?.data?.detail || "Impossible de supprimer cet employe.");
    } finally {
      setActionId(null);
    }
  };

  const resetPassword = async (employeeId) => {
    try {
      setActionId(employeeId);
      setFeedback("");
      setErrorMessage("");
      const response = await axios.post(`/api/employees/${employeeId}/reset-password/`);
      const credentials = response.data?.credentials;
      setFeedback(
        credentials
          ? `Mot de passe reinitialise: ${credentials.temporary_password}`
          : "Mot de passe reinitialise.",
      );
    } catch (error) {
      console.error("Erreur reset password RH:", error);
      setErrorMessage(error?.response?.data?.detail || "Impossible de reinitialiser le mot de passe.");
    } finally {
      setActionId(null);
    }
  };

  const changeRole = async (employeeId, newRole) => {
    try {
      setActionId(employeeId);
      setFeedback("");
      setErrorMessage("");
      await axios.patch(`/api/employees/${employeeId}/role/`, { employee_role: newRole });
      setFeedback(`Rôle mis à jour avec succès : ${newRole}`);
      await fetchData();
    } catch (error) {
      console.error("Erreur modification role:", error);
      setErrorMessage(error?.response?.data?.detail || "Impossible de modifier le rôle.");
    } finally {
      setActionId(null);
    }
  };

  return (
    <>
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
              <h1 className="monprofile">{isGrh ? "Gestion globale des employes" : "Gestion des employes RH"}</h1>
              <p className="morinfo">
                {isGrh
                  ? "Consultez l'effectif global et pilotez les comptes employes a l'echelle GRH."
                  : "Consultez l'effectif et gerez les comptes employes selon votre role RH."}
              </p>
            </div>
            <div className="yamin">
              <button className="nav-toggle" onClick={() => setIsNavOpen((prev) => !prev)} type="button">
                {isNavOpen ? "Masquer menu" : "Afficher menu"}
              </button>
              <button className="mode" onClick={() => setDark((prev) => !prev)} type="button">
                {dark ? "mode clair" : "mode sombre"}
              </button>
              <NotificationBell dark={dark} />
            </div>
          </div>
        </div>

        {/* Stats bar */}
        <div style={{ width: "96%", margin: "24px auto 0" }}>
          {/* Big hero card */}
          <div style={{
            borderRadius: 24, padding: "28px 32px",
            background: dark
              ? "linear-gradient(135deg,#0f172a 0%,#1e3a5f 60%,#0f172a 100%)"
              : "linear-gradient(135deg,#1e3a5f 0%,#2563eb 55%,#1d4ed8 100%)",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            flexWrap: "wrap", gap: 24, marginBottom: 14,
            boxShadow: "0 8px 32px rgba(37,99,235,0.25)",
          }}>
            <div>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.22em", color: "rgba(255,255,255,0.55)" }}>Effectif MADAR</p>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 12, marginTop: 8 }}>
                <span style={{ fontSize: 56, fontWeight: 900, color: "#fff", lineHeight: 1 }}>{stats.total}</span>
                <span style={{ fontSize: 18, fontWeight: 600, color: "rgba(255,255,255,0.7)", marginBottom: 6 }}>employés</span>
              </div>
              <p style={{ margin: "8px 0 0", fontSize: 13, color: "rgba(255,255,255,0.5)" }}>
                {stats.online} en ligne maintenant · {roleCtx.effectiveRole || "DRH"}
              </p>
            </div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              {[
                { label: "CDI", value: stats.cdi, color: "#a5f3fc", bg: "rgba(165,243,252,0.12)" },
                { label: "CDD", value: stats.cdd, color: "#fde68a", bg: "rgba(253,230,138,0.12)" },
                { label: "Stagiaires", value: stats.stage, color: "#c4b5fd", bg: "rgba(196,181,253,0.12)" },
              ].map(s => (
                <div key={s.label} style={{ textAlign: "center", padding: "14px 22px", borderRadius: 16, background: s.bg, border: `1px solid ${s.color}33` }}>
                  <p style={{ margin: 0, fontSize: 28, fontWeight: 900, color: s.color }}>{s.value}</p>
                  <p style={{ margin: "4px 0 0", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.14em", color: "rgba(255,255,255,0.55)" }}>{s.label}</p>
                </div>
              ))}
              <button type="button" onClick={fetchData}
                style={{ alignSelf: "center", padding: "10px 18px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.08)", fontSize: 13, fontWeight: 700, cursor: "pointer", color: "rgba(255,255,255,0.7)", whiteSpace: "nowrap", backdropFilter: "blur(4px)" }}>
                ↺ Sync
              </button>
            </div>
          </div>

          {/* Mini stat row */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10 }}>
            {[
              { label: "Permanents", value: stats.cdi, sub: `${Math.round(stats.cdi/stats.total*100)}% de l'effectif`, accent: "#3b82f6", icon: "🏢" },
              { label: "Contrats CDD", value: stats.cdd, sub: `${Math.round(stats.cdd/stats.total*100)}% de l'effectif`, accent: "#f59e0b", icon: "📋" },
              { label: "Stagiaires", value: stats.stage, sub: "En formation", accent: "#8b5cf6", icon: "🎓" },
              { label: "En ligne", value: stats.online, sub: "Connectés maintenant", accent: "#22c55e", icon: "🟢" },
            ].map(s => (
              <div key={s.label} style={{ borderRadius: 18, border: `1.5px solid ${dark ? "#1e293b" : "#e2e8f0"}`, background: dark ? "#0f172a" : "#fff", padding: "16px 20px", display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: dark ? "#1e293b" : "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>
                  {s.icon}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                    <span style={{ fontSize: 22, fontWeight: 900, color: s.accent }}>{s.value}</span>
                  </div>
                  <p style={{ margin: "1px 0 0", fontSize: 11, fontWeight: 700, color: dark ? "#94a3b8" : "#64748b", textTransform: "uppercase", letterSpacing: "0.1em" }}>{s.label}</p>
                  <p style={{ margin: "1px 0 0", fontSize: 11, color: "#94a3b8" }}>{s.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {(feedback || errorMessage) && (
          <div style={{ width: "96%", margin: "12px auto 0", padding: "12px 20px", borderRadius: 14, fontSize: 13, fontWeight: 600, background: errorMessage ? "#fee2e2" : "#f0fdf4", color: errorMessage ? "#dc2626" : "#15803d", border: `1px solid ${errorMessage ? "#fca5a5" : "#86efac"}` }}>
            {errorMessage || feedback}
          </div>
        )}

        {canManageEmployees && !editingEmployeeId ? (
          <section style={{ width: "96%", margin: "20px auto 0", borderRadius: 20, border: `1px solid ${dark ? "#1e293b" : "#e2e8f0"}`, background: dark ? "#0f172a" : "#fff", overflow: "hidden" }}>
            <div style={{ padding: "18px 24px", borderBottom: `1px solid ${dark ? "#1e293b" : "#f1f5f9"}` }}>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 900, color: dark ? "#f1f5f9" : "#0f172a" }}>
                Nouvel employé
              </h2>
              <p style={{ margin: "3px 0 0", fontSize: 13, color: "#94a3b8" }}>
                Remplissez les champs pour créer un compte employé.
              </p>
            </div>
            <form onSubmit={submitEmployee}>

              {/* ── Identité ── */}
              <div style={{ padding: "20px 24px 0" }}>
                <p style={{ margin: "0 0 12px", fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.18em", color: "#94a3b8" }}>Identité</p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
                  {[["first_name","Prénom"],["last_name","Nom"],["email","Adresse email"],["phone_number","Téléphone"]].map(([k, lbl]) => (
                    <div key={k}>
                      <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: dark ? "#94a3b8" : "#64748b", marginBottom: 5 }}>{lbl}</label>
                      <input name={k} value={form[k]} onChange={e => setForm(p => ({ ...p, [k]: e.target.value }))}
                        style={{ width: "100%", padding: "10px 13px", borderRadius: 11, border: `1.5px solid ${dark ? "#1e293b" : "#e2e8f0"}`, background: dark ? "#0a0f1a" : "#f8fafc", color: dark ? "#e2e8f0" : "#0f172a", fontSize: 13, outline: "none", boxSizing: "border-box", transition: "border-color 0.15s" }}
                        onFocus={e => e.target.style.borderColor = "#3b82f6"}
                        onBlur={e => e.target.style.borderColor = dark ? "#1e293b" : "#e2e8f0"}
                      />
                    </div>
                  ))}
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: dark ? "#94a3b8" : "#64748b", marginBottom: 5 }}>Sexe</label>
                    <select value={form.sexe} onChange={e => setForm(p => ({ ...p, sexe: e.target.value }))}
                      style={{ width: "100%", padding: "10px 13px", borderRadius: 11, border: `1.5px solid ${dark ? "#1e293b" : "#e2e8f0"}`, background: dark ? "#0a0f1a" : "#f8fafc", color: dark ? "#e2e8f0" : "#0f172a", fontSize: 13, outline: "none", boxSizing: "border-box" }}>
                      <option value="HOMME">Homme</option>
                      <option value="FEMME">Femme</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: dark ? "#94a3b8" : "#64748b", marginBottom: 5 }}>Date de naissance</label>
                    <input type="date" lang="fr" value={form.birth_date} onChange={e => setForm(p => ({ ...p, birth_date: e.target.value }))}
                      style={{ width: "100%", padding: "10px 13px", borderRadius: 11, border: `1.5px solid ${dark ? "#1e293b" : "#e2e8f0"}`, background: dark ? "#0a0f1a" : "#f8fafc", color: dark ? "#e2e8f0" : "#0f172a", fontSize: 13, outline: "none", boxSizing: "border-box" }} />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: dark ? "#94a3b8" : "#64748b", marginBottom: 5 }}>Adresse</label>
                    <input name="address" value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))}
                      style={{ width: "100%", padding: "10px 13px", borderRadius: 11, border: `1.5px solid ${dark ? "#1e293b" : "#e2e8f0"}`, background: dark ? "#0a0f1a" : "#f8fafc", color: dark ? "#e2e8f0" : "#0f172a", fontSize: 13, outline: "none", boxSizing: "border-box" }}
                      onFocus={e => e.target.style.borderColor = "#3b82f6"}
                      onBlur={e => e.target.style.borderColor = dark ? "#1e293b" : "#e2e8f0"} />
                  </div>
                </div>
              </div>

              {/* ── Poste & Contrat ── */}
              <div style={{ padding: "20px 24px 0" }}>
                <p style={{ margin: "0 0 12px", fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.18em", color: "#94a3b8" }}>Poste & Contrat</p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
                  {/* Service */}
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: dark ? "#94a3b8" : "#64748b", marginBottom: 5 }}>Service</label>
                    <select value={form.service} onChange={e => {
                        const ns = e.target.value;
                        const wasRh = services.find(s => s.code === form.service)?.is_rh_service ?? false;
                        const isRh = services.find(s => s.code === ns)?.is_rh_service ?? false;
                        setForm(p => ({ ...p, service: ns, position: "", employee_role: wasRh !== isRh ? (isRh ? "RH" : "EMPLOYEE") : p.employee_role }));
                      }}
                      style={{ width: "100%", padding: "10px 13px", borderRadius: 11, border: `1.5px solid ${dark ? "#1e293b" : "#e2e8f0"}`, background: dark ? "#0a0f1a" : "#f8fafc", color: form.service ? (dark ? "#e2e8f0" : "#0f172a") : "#94a3b8", fontSize: 13, outline: "none", boxSizing: "border-box" }}>
                      <option value="">Choisir un service</option>
                      {services.map(s => <option key={s.code} value={s.code}>{s.nomService}</option>)}
                    </select>
                  </div>
                  {/* Rôle */}
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: dark ? "#94a3b8" : "#64748b", marginBottom: 5 }}>Rôle</label>
                    <select value={form.employee_role} onChange={e => { const r = e.target.value; setForm(p => ({ ...p, employee_role: r, position: r === "CHEF" ? "" : p.position })); }}
                      style={{ width: "100%", padding: "10px 13px", borderRadius: 11, border: `1.5px solid ${dark ? "#1e293b" : "#e2e8f0"}`, background: dark ? "#0a0f1a" : "#f8fafc", color: dark ? "#e2e8f0" : "#0f172a", fontSize: 13, outline: "none", boxSizing: "border-box" }}>
                      {(services.find(s => s.code === form.service)?.is_rh_service ? RH_SERVICE_ROLES : OTHER_ROLES).map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </select>
                  </div>
                  {/* Poste */}
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: dark ? "#94a3b8" : "#64748b", marginBottom: 5 }}>Poste</label>
                    {form.employee_role === "CHEF" ? (
                      <div style={{ padding: "10px 13px", borderRadius: 11, border: `1.5px solid ${dark ? "#1e293b" : "#e2e8f0"}`, background: dark ? "#0a0f1a" : "#f8fafc", fontSize: 13, color: "#94a3b8", opacity: 0.6 }}>
                        Chef — aucun poste
                      </div>
                    ) : (
                      <select value={form.position} disabled={!form.service} onChange={e => setForm(p => ({ ...p, position: e.target.value }))}
                        style={{ width: "100%", padding: "10px 13px", borderRadius: 11, border: `1.5px solid ${dark ? "#1e293b" : "#e2e8f0"}`, background: dark ? "#0a0f1a" : "#f8fafc", color: form.position ? (dark ? "#e2e8f0" : "#0f172a") : "#94a3b8", fontSize: 13, outline: "none", boxSizing: "border-box", opacity: form.service ? 1 : 0.5 }}>
                        <option value="">{form.service ? "Choisir un poste" : "Service d'abord"}</option>
                        {positions.filter(p => p.service === form.service).map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                      </select>
                    )}
                  </div>
                  {/* Contrat */}
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: dark ? "#94a3b8" : "#64748b", marginBottom: 5 }}>Contrat</label>
                    <select value={form.contract_type} onChange={e => setForm(p => ({ ...p, contract_type: e.target.value }))}
                      style={{ width: "100%", padding: "10px 13px", borderRadius: 11, border: `1.5px solid ${dark ? "#1e293b" : "#e2e8f0"}`, background: dark ? "#0a0f1a" : "#f8fafc", color: dark ? "#e2e8f0" : "#0f172a", fontSize: 13, outline: "none", boxSizing: "border-box" }}>
                      <option value="CDI">CDI</option>
                      <option value="CDD">CDD</option>
                      <option value="STAGE">Stage</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* ── RH info ── */}
              <div style={{ padding: "20px 24px 0" }}>
                <p style={{ margin: "0 0 12px", fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.18em", color: "#94a3b8" }}>Informations RH</p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
                  {[["salary","Salaire (DA)"],["attendance_pin","PIN pointage (4 chiffres)"]].map(([k, lbl]) => (
                    <div key={k}>
                      <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: dark ? "#94a3b8" : "#64748b", marginBottom: 5 }}>{lbl}</label>
                      <input name={k} value={form[k]} onChange={e => setForm(p => ({ ...p, [k]: e.target.value }))} maxLength={k === "attendance_pin" ? 4 : undefined}
                        style={{ width: "100%", padding: "10px 13px", borderRadius: 11, border: `1.5px solid ${dark ? "#1e293b" : "#e2e8f0"}`, background: dark ? "#0a0f1a" : "#f8fafc", color: dark ? "#e2e8f0" : "#0f172a", fontSize: 13, outline: "none", boxSizing: "border-box" }}
                        onFocus={e => e.target.style.borderColor = "#3b82f6"}
                        onBlur={e => e.target.style.borderColor = dark ? "#1e293b" : "#e2e8f0"} />
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Actions ── */}
              <div style={{ padding: "20px 24px", display: "flex", justifyContent: "flex-end", gap: 10, borderTop: `1px solid ${dark ? "#0f172a" : "#f1f5f9"}`, marginTop: 20 }}>
                {editingEmployeeId && (
                  <button type="button" onClick={resetForm}
                    style={{ padding: "11px 24px", borderRadius: 12, border: `1.5px solid ${dark ? "#334155" : "#e2e8f0"}`, background: "transparent", fontWeight: 700, fontSize: 14, cursor: "pointer", color: dark ? "#94a3b8" : "#64748b" }}>
                    Annuler
                  </button>
                )}
                <button type="submit" disabled={submitting}
                  style={{ padding: "11px 32px", borderRadius: 12, border: "none", background: submitting ? "#94a3b8" : "linear-gradient(135deg,#3b82f6,#2563eb)", color: "#fff", fontWeight: 800, fontSize: 14, cursor: submitting ? "not-allowed" : "pointer", boxShadow: submitting ? "none" : "0 4px 14px rgba(59,130,246,0.35)" }}>
                  {submitting ? "Enregistrement..." : editingEmployeeId ? "Mettre à jour" : "Créer l'employé"}
                </button>
              </div>
            </form>
          </section>
        ) : !canManageEmployees ? (
          <div style={{ width: "96%", margin: "16px auto 0", padding: "12px 20px", borderRadius: 14, fontSize: 13, color: "#64748b", background: dark ? "#1e293b" : "#f8fafc", border: `1px solid ${dark ? "#334155" : "#e2e8f0"}` }}>
            Consultation autorisée. La création et la suppression sont réservées au GRH.
          </div>
        ) : null}

        <section className="activite-recente" style={{ width: "96%", margin: "24px auto" }}>
          <div className="activite-top">
            <h2 className="activite-title">Liste des employés</h2>
            <p className="activite-subtitle">{employees.length} employé{employees.length > 1 ? "s" : ""} enregistré{employees.length > 1 ? "s" : ""}.</p>
          </div>

          {loading ? (
            <div style={{ padding: 32, textAlign: "center", color: "#94a3b8" }}>Chargement...</div>
          ) : employees.length === 0 ? (
            <div style={{ padding: 32, textAlign: "center", color: "#94a3b8" }}>Aucun employé visible.</div>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {employees.map((emp) => {
                const fullName = `${emp.first_name || ""} ${emp.last_name || ""}`.trim() || emp.email;
                const initials = `${emp.first_name?.[0] || ""}${emp.last_name?.[0] || ""}`.toUpperCase() || "?";
                const hiredDate = emp.hired_at
                  ? new Date(`${emp.hired_at}T00:00:00`).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })
                  : null;
                const roleLabels = { EMPLOYEE: "Employé", CHEF: "Chef", RH_SIMPLE: "RH Congé", RH_AGENT: "RH Agent", GRH: "DRH", RH: "RH", RH_CONGE: "RH Congé", RH_FORMATION: "RH Formation", DRH: "DRH" };

                return (
                  <div key={emp.id} style={{
                    display: "flex", alignItems: "center", gap: 16, padding: "14px 20px",
                    borderRadius: 16, border: `1px solid ${dark ? "#1e293b" : "#e2e8f0"}`,
                    background: dark ? "#0f172a" : "#fff",
                    flexWrap: "wrap",
                  }}>
                    {/* Avatar */}
                    <div style={{
                      width: 44, height: 44, borderRadius: "50%", flexShrink: 0,
                      background: emp.is_online ? "#dcfce7" : (dark ? "#1e293b" : "#f1f5f9"),
                      border: `2px solid ${emp.is_online ? "#22c55e" : (dark ? "#334155" : "#e2e8f0")}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontWeight: 800, fontSize: 14,
                      color: emp.is_online ? "#15803d" : (dark ? "#94a3b8" : "#64748b"),
                    }}>{initials}</div>

                    {/* Name + email */}
                    <div style={{ flex: "2 1 160px", minWidth: 140 }}>
                      <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: dark ? "#f1f5f9" : "#0f172a" }}>{fullName}</p>
                      <p style={{ margin: 0, fontSize: 12, color: "#94a3b8" }}>{emp.email}</p>
                    </div>

                    {/* Service */}
                    <div style={{ flex: "2 1 150px", minWidth: 120 }}>
                      <p style={{ margin: 0, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "#94a3b8" }}>Service</p>
                      <p style={{ margin: "2px 0 0", fontSize: 13, fontWeight: 600, color: dark ? "#e2e8f0" : "#374151" }}>{emp.service?.nomService || <span style={{ color: "#94a3b8" }}>—</span>}</p>
                    </div>

                    {/* Poste or Rôle */}
                    <div style={{ flex: "2 1 140px", minWidth: 110 }}>
                      {emp.position ? (
                        <>
                          <p style={{ margin: 0, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "#94a3b8" }}>Poste</p>
                          <p style={{ margin: "2px 0 0", fontSize: 13, color: dark ? "#e2e8f0" : "#374151" }}>{emp.position}</p>
                        </>
                      ) : (
                        <>
                          <p style={{ margin: 0, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "#94a3b8" }}>Rôle</p>
                          <p style={{ margin: "2px 0 0", fontSize: 13, fontWeight: 700, color: dark ? "#e2e8f0" : "#374151" }}>
                            {roleLabels[emp.employee_role || emp.role] || emp.employee_role || emp.role || "—"}
                          </p>
                        </>
                      )}
                    </div>

                    {/* Recrutement */}
                    <div style={{ flex: "1 1 110px", minWidth: 100 }}>
                      <p style={{ margin: 0, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "#94a3b8" }}>Recrutement</p>
                      <p style={{ margin: "2px 0 0", fontSize: 13, color: dark ? "#e2e8f0" : "#374151", whiteSpace: "nowrap" }}>{hiredDate || "—"}</p>
                    </div>

                    {/* Status pill */}
                    <span style={{
                      padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 700, whiteSpace: "nowrap",
                      background: emp.is_online ? "#dcfce7" : (dark ? "#1e293b" : "#f1f5f9"),
                      color: emp.is_online ? "#15803d" : "#94a3b8",
                      border: `1px solid ${emp.is_online ? "#86efac" : (dark ? "#334155" : "#e2e8f0")}`,
                    }}>
                      {emp.is_online ? "En ligne" : "Hors ligne"}
                    </span>

                    {/* Actions */}
                    <div style={{ display: "flex", gap: 8, marginLeft: "auto", flexShrink: 0 }}>
                      <button type="button" onClick={() => setDetailEmployee(emp)}
                        style={{ padding: "7px 16px", borderRadius: 10, border: `1px solid ${dark ? "#334155" : "#e2e8f0"}`, background: "transparent", fontWeight: 600, fontSize: 13, cursor: "pointer", color: dark ? "#e2e8f0" : "#374151" }}>
                        Détails
                      </button>
                      {canManageEmployees && (
                        <button type="button" onClick={() => startEdit(emp)}
                          style={{ padding: "7px 16px", borderRadius: 10, border: "none", background: "#3b82f6", color: "#fff", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
                          Modifier
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Employee Detail Modal */}
        {detailEmployee && (() => {
          const emp = detailEmployee;
          const fullName = `${emp.first_name || ""} ${emp.last_name || ""}`.trim() || emp.email;
          const initials = `${emp.first_name?.[0] || ""}${emp.last_name?.[0] || ""}`.toUpperCase() || "?";
          const hiredDate = emp.hired_at
            ? new Date(`${emp.hired_at}T00:00:00`).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })
            : "—";
          const birthDate = emp.birth_date
            ? new Date(`${emp.birth_date}T00:00:00`).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })
            : "—";

          return (
            <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.6)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
              onClick={() => setDetailEmployee(null)}>
              <div style={{ background: dark ? "#0f172a" : "#fff", borderRadius: 24, width: "100%", maxWidth: 540, boxShadow: "0 24px 64px rgba(0,0,0,0.24)", overflow: "hidden" }}
                onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div style={{ background: dark ? "#1e293b" : "#f8fafc", padding: "24px 28px", display: "flex", alignItems: "center", gap: 16 }}>
                  <div style={{ width: 56, height: 56, borderRadius: "50%", background: emp.is_online ? "#dcfce7" : (dark ? "#334155" : "#e2e8f0"), display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 18, color: emp.is_online ? "#15803d" : (dark ? "#94a3b8" : "#64748b"), flexShrink: 0 }}>
                    {initials}
                  </div>
                  <div style={{ flex: 1 }}>
                    <h2 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: dark ? "#f1f5f9" : "#0f172a" }}>{fullName}</h2>
                    <p style={{ margin: "2px 0 0", fontSize: 13, color: "#94a3b8" }}>{emp.email}</p>
                  </div>
                  <span style={{ padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 700, background: emp.is_online ? "#dcfce7" : (dark ? "#1e293b" : "#f1f5f9"), color: emp.is_online ? "#15803d" : "#94a3b8", border: `1px solid ${emp.is_online ? "#86efac" : (dark ? "#334155" : "#e2e8f0")}` }}>
                    {emp.is_online ? "En ligne" : "Hors ligne"}
                  </span>
                </div>

                {/* Info grid */}
                <div style={{ padding: "20px 28px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px 24px" }}>
                  {[
                    ["Service", emp.service?.nomService || "—"],
                    ...(emp.position ? [["Poste", emp.position]] : []),
                    ["Rôle", emp.employee_role || emp.role || "—"],
                    ["Contrat", emp.contract_type || "—"],
                    ["Sexe", emp.sexe === "FEMME" ? "Femme" : "Homme"],
                    ["Date de naissance", birthDate],
                    ["Date de recrutement", hiredDate],
                    ["Téléphone", emp.phone_number || "—"],
                  ].map(([label, val]) => (
                    <div key={label}>
                      <p style={{ margin: 0, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#94a3b8" }}>{label}</p>
                      <p style={{ margin: "3px 0 0", fontSize: 14, fontWeight: 600, color: dark ? "#e2e8f0" : "#0f172a" }}>{val}</p>
                    </div>
                  ))}
                </div>

                {/* Footer actions */}
                <div style={{ padding: "16px 28px", borderTop: `1px solid ${dark ? "#1e293b" : "#f1f5f9"}`, display: "flex", gap: 10, justifyContent: "flex-end" }}>
                  {canManageEmployees && (
                    <>
                      <button type="button" disabled={actionId === emp.id}
                        onClick={() => { resetPassword(emp.id); setDetailEmployee(null); }}
                        style={{ padding: "8px 18px", borderRadius: 10, border: `1px solid ${dark ? "#334155" : "#e2e8f0"}`, background: "transparent", fontWeight: 600, fontSize: 13, cursor: "pointer", color: dark ? "#e2e8f0" : "#374151" }}>
                        Reset MDP
                      </button>
                      <button type="button" disabled={actionId === emp.id}
                        onClick={() => { deleteEmployee(emp.id); setDetailEmployee(null); }}
                        style={{ padding: "8px 18px", borderRadius: 10, border: "none", background: "#ef4444", color: "#fff", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
                        Supprimer
                      </button>
                      <button type="button"
                        onClick={() => { startEdit(emp); setDetailEmployee(null); }}
                        style={{ padding: "8px 18px", borderRadius: 10, border: "none", background: "#3b82f6", color: "#fff", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
                        Modifier
                      </button>
                    </>
                  )}
                  <button type="button" onClick={() => setDetailEmployee(null)}
                    style={{ padding: "8px 18px", borderRadius: 10, border: `1px solid ${dark ? "#334155" : "#e2e8f0"}`, background: "transparent", fontWeight: 600, fontSize: 13, cursor: "pointer", color: dark ? "#94a3b8" : "#64748b" }}>
                    Fermer
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Postes management — GRH only */}
        {isGrh && (
          <section style={{ width: "96%", margin: "24px auto 40px", borderRadius: 20, border: `1px solid ${dark ? "#1e293b" : "#e2e8f0"}`, background: dark ? "#0f172a" : "#fff", overflow: "hidden" }}>

            {/* Section header */}
            <div style={{ padding: "20px 28px", borderBottom: `1px solid ${dark ? "#1e293b" : "#f1f5f9"}`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 17, fontWeight: 900, color: dark ? "#f1f5f9" : "#0f172a" }}>Gestion des postes</h2>
                <p style={{ margin: "3px 0 0", fontSize: 13, color: "#94a3b8" }}>{positions.length} poste{positions.length !== 1 ? "s" : ""} répartis sur {services.filter(s => positions.some(p => p.service === s.code)).length} service{services.filter(s => positions.some(p => p.service === s.code)).length !== 1 ? "s" : ""}</p>
              </div>

              {/* Inline create form */}
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <input
                  value={newPosteName}
                  onChange={e => setNewPosteName(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && createPoste()}
                  placeholder="Nom du poste..."
                  style={{ padding: "9px 14px", borderRadius: 12, border: `1.5px solid ${dark ? "#334155" : "#e2e8f0"}`, background: dark ? "#1e293b" : "#f8fafc", color: dark ? "#e2e8f0" : "#0f172a", fontSize: 13, width: 200, outline: "none" }}
                />
                <select
                  value={newPosteService}
                  onChange={e => setNewPosteService(e.target.value)}
                  style={{ padding: "9px 14px", borderRadius: 12, border: `1.5px solid ${dark ? "#334155" : "#e2e8f0"}`, background: dark ? "#1e293b" : "#f8fafc", color: dark ? "#e2e8f0" : "#94a3b8", fontSize: 13, outline: "none" }}
                >
                  <option value="">Service...</option>
                  {services.map(s => <option key={s.code} value={s.code}>{s.nomService}</option>)}
                </select>
                <button type="button" onClick={createPoste}
                  disabled={posteSubmitting || !newPosteName.trim() || !newPosteService}
                  style={{ padding: "9px 20px", borderRadius: 12, border: "none", background: newPosteName.trim() && newPosteService ? "#22c55e" : (dark ? "#1e293b" : "#e2e8f0"), color: newPosteName.trim() && newPosteService ? "#fff" : "#94a3b8", fontWeight: 700, fontSize: 13, cursor: newPosteName.trim() && newPosteService ? "pointer" : "not-allowed", whiteSpace: "nowrap", transition: "all 0.15s" }}>
                  {posteSubmitting ? "..." : "+ Ajouter"}
                </button>
              </div>
            </div>

            {posteFeedback && (
              <div style={{ padding: "10px 28px", fontSize: 13, fontWeight: 600, background: posteFeedback.includes("succès") ? "#f0fdf4" : "#fff1f2", color: posteFeedback.includes("succès") ? "#15803d" : "#dc2626", borderBottom: `1px solid ${posteFeedback.includes("succès") ? "#bbf7d0" : "#fecaca"}` }}>
                {posteFeedback}
              </div>
            )}

            {/* Services grid */}
            <div style={{ padding: "20px 28px", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
              {services.filter(s => positions.some(p => p.service === s.code)).map(s => {
                const svcPosts = positions.filter(p => p.service === s.code);
                return (
                  <div key={s.code} style={{ borderRadius: 16, border: `1.5px solid ${dark ? "#1e293b" : "#f1f5f9"}`, background: dark ? "#0a0f1a" : "#fafafa", overflow: "hidden" }}>
                    {/* Service name bar */}
                    <div style={{ padding: "10px 16px", background: dark ? "#1e293b" : "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ fontWeight: 800, fontSize: 13, color: dark ? "#e2e8f0" : "#0f172a" }}>{s.nomService}</span>
                      <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 10, background: dark ? "#0f172a" : "#e2e8f0", color: dark ? "#94a3b8" : "#64748b" }}>
                        {svcPosts.length} poste{svcPosts.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                    {/* Posts list */}
                    <div style={{ padding: "12px 16px", display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {svcPosts.map(p => (
                        <div key={p.id} style={{ display: "inline-flex", alignItems: "center", gap: 5, background: dark ? "#1e293b" : "#fff", border: `1px solid ${dark ? "#334155" : "#e2e8f0"}`, borderRadius: 20, padding: "5px 12px 5px 14px", transition: "border-color 0.1s" }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: dark ? "#e2e8f0" : "#374151" }}>{p.name}</span>
                          <button type="button" onClick={() => deletePoste(p.id)}
                            style={{ border: "none", background: "none", cursor: "pointer", color: "#94a3b8", fontWeight: 700, fontSize: 14, lineHeight: 1, padding: "0 1px", marginLeft: 2, transition: "color 0.1s" }}
                            onMouseEnter={e => e.currentTarget.style.color = "#ef4444"}
                            onMouseLeave={e => e.currentTarget.style.color = "#94a3b8"}
                            title="Supprimer">×</button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
              {positions.length === 0 && (
                <div style={{ gridColumn: "1/-1", textAlign: "center", padding: 32, color: "#94a3b8", fontSize: 14 }}>
                  Aucun poste créé. Utilisez le formulaire ci-dessus pour commencer.
                </div>
              )}
            </div>
          </section>
        )}
      </div>
    </div>

    {/* ── Edit Modal ── */}
    {editModal && editingEmployeeId && (
      <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.6)", zIndex: 600, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
        onClick={() => { if (!submitting) resetForm(); }}>
        <div style={{ background: dark ? "#0f172a" : "#fff", borderRadius: 24, width: "100%", maxWidth: 680, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 24px 64px rgba(0,0,0,0.28)" }}
          onClick={e => e.stopPropagation()}>

          {/* Header */}
          <div style={{ padding: "20px 28px", borderBottom: `1px solid ${dark ? "#1e293b" : "#f1f5f9"}`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
            <div>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.16em", color: "#94a3b8" }}>Modification</p>
              <h2 style={{ margin: "4px 0 0", fontSize: 18, fontWeight: 900, color: dark ? "#f1f5f9" : "#0f172a" }}>
                {form.first_name} {form.last_name}
              </h2>
            </div>
            <button type="button" onClick={resetForm} disabled={submitting}
              style={{ padding: "8px 16px", borderRadius: 10, border: `1px solid ${dark ? "#334155" : "#e2e8f0"}`, background: "transparent", fontSize: 13, fontWeight: 700, cursor: "pointer", color: dark ? "#94a3b8" : "#64748b" }}>
              Fermer
            </button>
          </div>

          {/* Form body */}
          <form onSubmit={submitEmployee}>
            {[
              { title: "Identité", fields: (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  {[["first_name","Prénom"],["last_name","Nom"],["email","Email"],["phone_number","Téléphone"],["address","Adresse"]].map(([k,lbl]) => (
                    <div key={k} style={k === "email" || k === "address" ? { gridColumn: "1/-1" } : {}}>
                      <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: dark ? "#94a3b8" : "#64748b", marginBottom: 5 }}>{lbl}</label>
                      <input name={k} value={form[k]} onChange={e => setForm(p => ({ ...p, [k]: e.target.value }))}
                        style={{ width: "100%", padding: "10px 13px", borderRadius: 11, border: `1.5px solid ${dark ? "#1e293b" : "#e2e8f0"}`, background: dark ? "#0a0f1a" : "#f8fafc", color: dark ? "#e2e8f0" : "#0f172a", fontSize: 13, outline: "none", boxSizing: "border-box" }}
                        onFocus={e => e.target.style.borderColor = "#3b82f6"} onBlur={e => e.target.style.borderColor = dark ? "#1e293b" : "#e2e8f0"} />
                    </div>
                  ))}
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: dark ? "#94a3b8" : "#64748b", marginBottom: 5 }}>Sexe</label>
                    <select value={form.sexe} onChange={e => setForm(p => ({ ...p, sexe: e.target.value }))}
                      style={{ width: "100%", padding: "10px 13px", borderRadius: 11, border: `1.5px solid ${dark ? "#1e293b" : "#e2e8f0"}`, background: dark ? "#0a0f1a" : "#f8fafc", color: dark ? "#e2e8f0" : "#0f172a", fontSize: 13, outline: "none", boxSizing: "border-box" }}>
                      <option value="HOMME">Homme</option><option value="FEMME">Femme</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: dark ? "#94a3b8" : "#64748b", marginBottom: 5 }}>Date de naissance</label>
                    <input type="date" lang="fr" value={form.birth_date} onChange={e => setForm(p => ({ ...p, birth_date: e.target.value }))}
                      style={{ width: "100%", padding: "10px 13px", borderRadius: 11, border: `1.5px solid ${dark ? "#1e293b" : "#e2e8f0"}`, background: dark ? "#0a0f1a" : "#f8fafc", color: dark ? "#e2e8f0" : "#0f172a", fontSize: 13, outline: "none", boxSizing: "border-box" }} />
                  </div>
                </div>
              )},
              { title: "Poste & Contrat", fields: (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: dark ? "#94a3b8" : "#64748b", marginBottom: 5 }}>Service</label>
                    <select value={form.service} onChange={e => { const ns = e.target.value; const wasRh = services.find(s => s.code === form.service)?.is_rh_service ?? false; const isRh = services.find(s => s.code === ns)?.is_rh_service ?? false; setForm(p => ({ ...p, service: ns, position: "", employee_role: wasRh !== isRh ? (isRh ? "RH" : "EMPLOYEE") : p.employee_role })); }}
                      style={{ width: "100%", padding: "10px 13px", borderRadius: 11, border: `1.5px solid ${dark ? "#1e293b" : "#e2e8f0"}`, background: dark ? "#0a0f1a" : "#f8fafc", color: dark ? "#e2e8f0" : "#0f172a", fontSize: 13, outline: "none", boxSizing: "border-box" }}>
                      <option value="">Choisir un service</option>
                      {services.map(s => <option key={s.code} value={s.code}>{s.nomService}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: dark ? "#94a3b8" : "#64748b", marginBottom: 5 }}>Rôle</label>
                    <select value={form.employee_role} onChange={e => { const r = e.target.value; setForm(p => ({ ...p, employee_role: r, position: r === "CHEF" ? "" : p.position })); }}
                      style={{ width: "100%", padding: "10px 13px", borderRadius: 11, border: `1.5px solid ${dark ? "#1e293b" : "#e2e8f0"}`, background: dark ? "#0a0f1a" : "#f8fafc", color: dark ? "#e2e8f0" : "#0f172a", fontSize: 13, outline: "none", boxSizing: "border-box" }}>
                      {(services.find(s => s.code === form.service)?.is_rh_service ? RH_SERVICE_ROLES : OTHER_ROLES).map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: dark ? "#94a3b8" : "#64748b", marginBottom: 5 }}>Poste</label>
                    {form.employee_role === "CHEF" ? (
                      <div style={{ padding: "10px 13px", borderRadius: 11, border: `1.5px solid ${dark ? "#1e293b" : "#e2e8f0"}`, background: dark ? "#0a0f1a" : "#f8fafc", fontSize: 13, color: "#94a3b8", opacity: 0.6 }}>Chef — aucun poste</div>
                    ) : (
                      <select value={form.position} disabled={!form.service} onChange={e => setForm(p => ({ ...p, position: e.target.value }))}
                        style={{ width: "100%", padding: "10px 13px", borderRadius: 11, border: `1.5px solid ${dark ? "#1e293b" : "#e2e8f0"}`, background: dark ? "#0a0f1a" : "#f8fafc", color: dark ? "#e2e8f0" : "#0f172a", fontSize: 13, outline: "none", boxSizing: "border-box" }}>
                        <option value="">{form.service ? "Choisir un poste" : "Service d'abord"}</option>
                        {positions.filter(p => p.service === form.service).map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                      </select>
                    )}
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: dark ? "#94a3b8" : "#64748b", marginBottom: 5 }}>Contrat</label>
                    <select value={form.contract_type} onChange={e => setForm(p => ({ ...p, contract_type: e.target.value }))}
                      style={{ width: "100%", padding: "10px 13px", borderRadius: 11, border: `1.5px solid ${dark ? "#1e293b" : "#e2e8f0"}`, background: dark ? "#0a0f1a" : "#f8fafc", color: dark ? "#e2e8f0" : "#0f172a", fontSize: 13, outline: "none", boxSizing: "border-box" }}>
                      <option value="CDI">CDI</option><option value="CDD">CDD</option><option value="STAGE">Stage</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: dark ? "#94a3b8" : "#64748b", marginBottom: 5 }}>Salaire (DA)</label>
                    <input value={form.salary} onChange={e => setForm(p => ({ ...p, salary: e.target.value }))}
                      style={{ width: "100%", padding: "10px 13px", borderRadius: 11, border: `1.5px solid ${dark ? "#1e293b" : "#e2e8f0"}`, background: dark ? "#0a0f1a" : "#f8fafc", color: dark ? "#e2e8f0" : "#0f172a", fontSize: 13, outline: "none", boxSizing: "border-box" }}
                      onFocus={e => e.target.style.borderColor = "#3b82f6"} onBlur={e => e.target.style.borderColor = dark ? "#1e293b" : "#e2e8f0"} />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: dark ? "#94a3b8" : "#64748b", marginBottom: 5 }}>PIN pointage</label>
                    <input value={form.attendance_pin} maxLength={4} onChange={e => setForm(p => ({ ...p, attendance_pin: e.target.value }))}
                      style={{ width: "100%", padding: "10px 13px", borderRadius: 11, border: `1.5px solid ${dark ? "#1e293b" : "#e2e8f0"}`, background: dark ? "#0a0f1a" : "#f8fafc", color: dark ? "#e2e8f0" : "#0f172a", fontSize: 13, outline: "none", boxSizing: "border-box" }}
                      onFocus={e => e.target.style.borderColor = "#3b82f6"} onBlur={e => e.target.style.borderColor = dark ? "#1e293b" : "#e2e8f0"} />
                  </div>
                </div>
              )},
            ].map(({ title, fields }) => (
              <div key={title} style={{ padding: "18px 28px 0" }}>
                <p style={{ margin: "0 0 12px", fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.18em", color: "#94a3b8" }}>{title}</p>
                {fields}
              </div>
            ))}

            {/* Error/feedback inside modal */}
            {(errorMessage || feedback) && (
              <div style={{ margin: "14px 28px 0", padding: "10px 16px", borderRadius: 12, fontSize: 13, fontWeight: 600, background: errorMessage ? "#fee2e2" : "#f0fdf4", color: errorMessage ? "#dc2626" : "#15803d" }}>
                {errorMessage || feedback}
              </div>
            )}

            {/* Footer */}
            <div style={{ padding: "18px 28px 24px", display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 8 }}>
              <button type="button" onClick={resetForm} disabled={submitting}
                style={{ padding: "11px 24px", borderRadius: 12, border: `1.5px solid ${dark ? "#334155" : "#e2e8f0"}`, background: "transparent", fontWeight: 700, fontSize: 14, cursor: "pointer", color: dark ? "#94a3b8" : "#64748b" }}>
                Annuler
              </button>
              <button type="submit" disabled={submitting}
                style={{ padding: "11px 32px", borderRadius: 12, border: "none", background: submitting ? "#94a3b8" : "linear-gradient(135deg,#3b82f6,#2563eb)", color: "#fff", fontWeight: 800, fontSize: 14, cursor: submitting ? "not-allowed" : "pointer", boxShadow: submitting ? "none" : "0 4px 14px rgba(59,130,246,0.35)" }}>
                {submitting ? "Enregistrement..." : "Mettre à jour"}
              </button>
            </div>
          </form>
        </div>
      </div>
    )}
    </>
  );
}

