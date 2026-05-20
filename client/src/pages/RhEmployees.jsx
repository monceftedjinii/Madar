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
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [filterService, setFilterService] = useState("");
  const [filterPoste, setFilterPoste] = useState("");
  const [services, setServices] = useState([]);
  const [positions, setPositions] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editingEmployeeId, setEditingEmployeeId] = useState(null);
  const [contractFile, setContractFile] = useState(null);
  const [actionId, setActionId] = useState(null);
  const [feedback, setFeedback] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [detailEmployee, setDetailEmployee] = useState(null);
  const [editModal, setEditModal] = useState(false);
  const [terminateModal, setTerminateModal] = useState(null); // employee to terminate
  const [terminatePin, setTerminatePin] = useState("");
  const [terminateError, setTerminateError] = useState("");
  const [terminateLoading, setTerminateLoading] = useState(false);
  const [formerEmployees, setFormerEmployees] = useState([]);
  const [formerSearch, setFormerSearch] = useState("");
  const [formerFilterService, setFormerFilterService] = useState("");
  const [formerFilterPoste, setFormerFilterPoste] = useState("");
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
      const [meResponse, employeesResponse, servicesResponse, positionsResponse, formerResponse] = await Promise.all([
        axios.get("/api/whoami/"),
        axios.get("/api/employees/"),
        axios.get("/api/services/"),
        axios.get("/api/positions/"),
        axios.get("/api/employees/?include_inactive=true"),
      ]);
      setRoleCtx(getRoleContext({ role: meResponse.data?.role, service: meResponse.data?.service, employee_role: meResponse.data?.employee_role }));
      setEmployees(Array.isArray(employeesResponse.data) ? employeesResponse.data : []);
      setServices(Array.isArray(servicesResponse.data) ? servicesResponse.data : []);
      setPositions(Array.isArray(positionsResponse.data) ? positionsResponse.data : []);
      setFormerEmployees(Array.isArray(formerResponse.data) ? formerResponse.data : []);
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
    const active = employees.filter(e => e.is_active !== false);
    const online = active.filter((item) => item.is_online).length;
    const cdi = active.filter((item) => item.contract_type === "CDI").length;
    const cdd = active.filter((item) => item.contract_type === "CDD").length;
    const stage = active.filter((item) => item.contract_type === "STAGE").length;
    return { total: active.length, online, cdi, cdd, stage };
  }, [employees]);

  const resetForm = () => {
    setForm(initialForm);
    setEditingEmployeeId(null);
    setEditModal(false);
    setContractFile(null);
  };

  const submitEmployee = async (event) => {
    event.preventDefault();
    if (!canManageEmployees) return;
    try {
      setSubmitting(true);
      setFeedback("");
      setErrorMessage("");
      const payload = new FormData();
      Object.entries(form).forEach(([k, v]) => { if (v !== null && v !== undefined) payload.append(k, v); });
      if (contractFile) payload.append("contract_file", contractFile);

      if (editingEmployeeId) {
        await axios.patch(`/api/employees/${editingEmployeeId}/update/`, payload, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        setFeedback("Employé mis à jour avec succès.");
        setEditModal(false);
      } else {
        const response = await axios.post("/api/employees/create/", payload, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        const credentials = response.data?.credentials;
        setFeedback(
          credentials
            ? `Employé créé. Email: ${credentials.email} / MDP: ${credentials.temporary_password}`
            : "Employé créé avec succès.",
        );
      }
      setContractFile(null);
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

  const openTerminateModal = (emp) => {
    setTerminateModal(emp);
    setTerminatePin("");
    setTerminateError("");
  };

  const confirmTerminate = async () => {
    if (!terminateModal) return;
    setTerminateLoading(true);
    setTerminateError("");
    try {
      await axios.post(`/api/employees/${terminateModal.id}/terminate/`, { pin: terminatePin });
      setTerminateModal(null);
      setDetailEmployee(null);
      setFeedback(`${terminateModal.first_name} ${terminateModal.last_name} a été marqué comme ancien employé.`);
      await fetchData();
    } catch (err) {
      setTerminateError(err?.response?.data?.detail || "Erreur lors de la fin de contrat.");
    } finally {
      setTerminateLoading(false);
    }
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

        {/* Compact stats bar */}
        <div style={{ width: "96%", margin: "16px auto 0", borderRadius: 20, background: dark ? "linear-gradient(135deg,#0f172a,#1e3a5f)" : "linear-gradient(135deg,#1e40af,#2563eb)", padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap", boxShadow: "0 4px 20px rgba(37,99,235,0.2)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div>
              <span style={{ fontSize: 38, fontWeight: 900, color: "#fff", lineHeight: 1 }}>{stats.total}</span>
              <span style={{ fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.6)", marginLeft: 8 }}>employés actifs</span>
            </div>
            <div style={{ width: 1, height: 36, background: "rgba(255,255,255,0.15)" }} />
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px 3px 7px", borderRadius: 20, background: "rgba(34,197,94,0.18)", border: "1px solid rgba(34,197,94,0.35)" }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 8px #22c55e88", flexShrink: 0, display: "inline-block" }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: "#4ade80" }}>{stats.online} en ligne</span>
              </span>
              <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.55)", padding: "3px 9px", borderRadius: 20, background: "rgba(255,255,255,0.1)", letterSpacing: "0.07em", textTransform: "uppercase" }}>{roleCtx.effectiveRole || "DRH"}</span>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {[
              { label: "CDI", value: stats.cdi, color: "#a5f3fc" },
              { label: "CDD", value: stats.cdd, color: "#fde68a" },
              { label: "Stagiaires", value: stats.stage, color: "#c4b5fd" },
            ].map(s => (
              <div key={s.label} style={{ padding: "8px 16px", borderRadius: 12, background: "rgba(255,255,255,0.08)", border: `1px solid ${s.color}44`, display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 20, fontWeight: 900, color: s.color }}>{s.value}</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.5)", textTransform: "uppercase" }}>{s.label}</span>
              </div>
            ))}
              <button type="button" onClick={fetchData}
                style={{ alignSelf: "center", padding: "10px 18px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.08)", fontSize: 13, fontWeight: 700, cursor: "pointer", color: "rgba(255,255,255,0.7)", whiteSpace: "nowrap", backdropFilter: "blur(4px)" }}>
                ↺ Sync
              </button>
            </div>
          </div>

        {(feedback || errorMessage) && (
          <div style={{ width: "96%", margin: "8px auto 0", padding: "10px 18px", borderRadius: 12, fontSize: 13, fontWeight: 600, background: errorMessage ? "#fee2e2" : "#f0fdf4", color: errorMessage ? "#dc2626" : "#15803d", border: `1px solid ${errorMessage ? "#fca5a5" : "#86efac"}` }}>
            {errorMessage || feedback}
          </div>
        )}

        {/* Two-column layout: form left, list right */}
        <div style={{ width: "96%", margin: "12px auto 0", display: "grid", gridTemplateColumns: canManageEmployees && !editingEmployeeId ? "420px 1fr" : "1fr", gap: 16, alignItems: "start" }}>

        {canManageEmployees && !editingEmployeeId ? (
          <section style={{ borderRadius: 20, border: `1px solid ${dark ? "#1e293b" : "#e2e8f0"}`, background: dark ? "#0f172a" : "#fff", position: "sticky", top: 80, maxHeight: "calc(100vh - 200px)", overflowY: "auto" }}>
            <div style={{ padding: "10px 16px", borderBottom: `1px solid ${dark ? "#1e293b" : "#f1f5f9"}`, background: dark ? "#0a0f1a" : "#f8fafc", position: "sticky", top: 0, zIndex: 2 }}>
              <h2 style={{ margin: 0, fontSize: 13, fontWeight: 900, color: dark ? "#f1f5f9" : "#0f172a" }}>Nouvel employé</h2>
              <p style={{ margin: "1px 0 0", fontSize: 11, color: "#94a3b8" }}>Créer un nouveau compte employé</p>
            </div>
            <form onSubmit={submitEmployee}>

              {/* ── Identité ── */}
              <div style={{ padding: "8px 12px 0" }}>
                <p style={{ margin: "0 0 5px", fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.18em", color: "#94a3b8" }}>Identité</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                  {[["first_name","Prénom"],["last_name","Nom"],["email","Email"],["phone_number","Téléphone"]].map(([k, lbl]) => (
                    <div key={k}>
                      <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: dark ? "#94a3b8" : "#64748b", marginBottom: 3 }}>{lbl}</label>
                      <input name={k} value={form[k]} onChange={e => setForm(p => ({ ...p, [k]: e.target.value }))}
                        style={{ width: "100%", padding: "7px 10px", borderRadius: 9, border: `1.5px solid ${dark ? "#1e293b" : "#e2e8f0"}`, background: dark ? "#0a0f1a" : "#f8fafc", color: dark ? "#e2e8f0" : "#0f172a", fontSize: 12, outline: "none", boxSizing: "border-box", transition: "border-color 0.15s" }}
                        onFocus={e => e.target.style.borderColor = "#3b82f6"}
                        onBlur={e => e.target.style.borderColor = dark ? "#1e293b" : "#e2e8f0"}
                      />
                    </div>
                  ))}
                  <div>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: dark ? "#94a3b8" : "#64748b", marginBottom: 3 }}>Sexe</label>
                    <select value={form.sexe} onChange={e => setForm(p => ({ ...p, sexe: e.target.value }))}
                      style={{ width: "100%", padding: "7px 10px", borderRadius: 9, border: `1.5px solid ${dark ? "#1e293b" : "#e2e8f0"}`, background: dark ? "#0a0f1a" : "#f8fafc", color: dark ? "#e2e8f0" : "#0f172a", fontSize: 12, outline: "none", boxSizing: "border-box" }}>
                      <option value="HOMME">Homme</option>
                      <option value="FEMME">Femme</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: dark ? "#94a3b8" : "#64748b", marginBottom: 3 }}>Date de naissance</label>
                    <input type="date" lang="fr" value={form.birth_date} onChange={e => setForm(p => ({ ...p, birth_date: e.target.value }))}
                      style={{ width: "100%", padding: "7px 10px", borderRadius: 9, border: `1.5px solid ${dark ? "#1e293b" : "#e2e8f0"}`, background: dark ? "#0a0f1a" : "#f8fafc", color: dark ? "#e2e8f0" : "#0f172a", fontSize: 12, outline: "none", boxSizing: "border-box" }} />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: dark ? "#94a3b8" : "#64748b", marginBottom: 3 }}>Adresse</label>
                    <input name="address" value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))}
                      style={{ width: "100%", padding: "7px 10px", borderRadius: 9, border: `1.5px solid ${dark ? "#1e293b" : "#e2e8f0"}`, background: dark ? "#0a0f1a" : "#f8fafc", color: dark ? "#e2e8f0" : "#0f172a", fontSize: 12, outline: "none", boxSizing: "border-box" }}
                      onFocus={e => e.target.style.borderColor = "#3b82f6"}
                      onBlur={e => e.target.style.borderColor = dark ? "#1e293b" : "#e2e8f0"} />
                  </div>
                </div>
              </div>

              {/* ── Poste & Contrat ── */}
              <div style={{ padding: "8px 12px 0" }}>
                <p style={{ margin: "0 0 5px", fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.18em", color: "#94a3b8" }}>Poste & Contrat</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: dark ? "#94a3b8" : "#64748b", marginBottom: 3 }}>Service</label>
                    <select value={form.service} onChange={e => {
                        const ns = e.target.value;
                        const wasRh = services.find(s => s.code === form.service)?.is_rh_service ?? false;
                        const isRh = services.find(s => s.code === ns)?.is_rh_service ?? false;
                        setForm(p => ({ ...p, service: ns, position: "", employee_role: wasRh !== isRh ? (isRh ? "RH" : "EMPLOYEE") : p.employee_role }));
                      }}
                      style={{ width: "100%", padding: "7px 10px", borderRadius: 9, border: `1.5px solid ${dark ? "#1e293b" : "#e2e8f0"}`, background: dark ? "#0a0f1a" : "#f8fafc", color: form.service ? (dark ? "#e2e8f0" : "#0f172a") : "#94a3b8", fontSize: 12, outline: "none", boxSizing: "border-box" }}>
                      <option value="">Choisir un service</option>
                      {services.map(s => <option key={s.code} value={s.code}>{s.nomService}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: dark ? "#94a3b8" : "#64748b", marginBottom: 3 }}>Rôle</label>
                    <select value={form.employee_role} onChange={e => { const r = e.target.value; setForm(p => ({ ...p, employee_role: r, position: r === "CHEF" ? "" : p.position })); }}
                      style={{ width: "100%", padding: "7px 10px", borderRadius: 9, border: `1.5px solid ${dark ? "#1e293b" : "#e2e8f0"}`, background: dark ? "#0a0f1a" : "#f8fafc", color: dark ? "#e2e8f0" : "#0f172a", fontSize: 12, outline: "none", boxSizing: "border-box" }}>
                      {(services.find(s => s.code === form.service)?.is_rh_service ? RH_SERVICE_ROLES : OTHER_ROLES).map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </select>
                  </div>
                  {!services.find(s => s.code === form.service)?.is_rh_service && (
                    <div>
                      <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: dark ? "#94a3b8" : "#64748b", marginBottom: 3 }}>Poste</label>
                      {form.employee_role === "CHEF" ? (
                        <div style={{ padding: "7px 10px", borderRadius: 9, border: `1.5px solid ${dark ? "#1e293b" : "#e2e8f0"}`, background: dark ? "#0a0f1a" : "#f8fafc", fontSize: 12, color: "#94a3b8", opacity: 0.6 }}>Chef — aucun poste</div>
                      ) : (
                        <select value={form.position} disabled={!form.service} onChange={e => setForm(p => ({ ...p, position: e.target.value }))}
                          style={{ width: "100%", padding: "7px 10px", borderRadius: 9, border: `1.5px solid ${dark ? "#1e293b" : "#e2e8f0"}`, background: dark ? "#0a0f1a" : "#f8fafc", color: form.position ? (dark ? "#e2e8f0" : "#0f172a") : "#94a3b8", fontSize: 12, outline: "none", boxSizing: "border-box", opacity: form.service ? 1 : 0.5 }}>
                          <option value="">{form.service ? "Choisir un poste" : "Service d'abord"}</option>
                          {positions.filter(p => p.service === form.service).map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                        </select>
                      )}
                    </div>
                  )}
                  <div>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: dark ? "#94a3b8" : "#64748b", marginBottom: 3 }}>Contrat</label>
                    <select value={form.contract_type} onChange={e => { if (e.target.value === "STAGE") setContractFile(null); setForm(p => ({ ...p, contract_type: e.target.value })); }}
                      style={{ width: "100%", padding: "7px 10px", borderRadius: 9, border: `1.5px solid ${dark ? "#1e293b" : "#e2e8f0"}`, background: dark ? "#0a0f1a" : "#f8fafc", color: dark ? "#e2e8f0" : "#0f172a", fontSize: 12, outline: "none", boxSizing: "border-box" }}>
                      <option value="CDI">CDI</option>
                      <option value="CDD">CDD</option>
                      <option value="STAGE">Stage</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* ── RH info ── */}
              <div style={{ padding: "8px 12px 0" }}>
                <p style={{ margin: "0 0 5px", fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.18em", color: "#94a3b8" }}>Informations RH</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                  {[["salary","Salaire (DA)"],["attendance_pin","PIN (4 chiffres)"]].map(([k, lbl]) => (
                    <div key={k}>
                      <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: dark ? "#94a3b8" : "#64748b", marginBottom: 3 }}>{lbl}</label>
                      <input name={k} value={form[k]} onChange={e => setForm(p => ({ ...p, [k]: e.target.value }))} maxLength={k === "attendance_pin" ? 4 : undefined}
                        style={{ width: "100%", padding: "7px 10px", borderRadius: 9, border: `1.5px solid ${dark ? "#1e293b" : "#e2e8f0"}`, background: dark ? "#0a0f1a" : "#f8fafc", color: dark ? "#e2e8f0" : "#0f172a", fontSize: 12, outline: "none", boxSizing: "border-box" }}
                        onFocus={e => e.target.style.borderColor = "#3b82f6"}
                        onBlur={e => e.target.style.borderColor = dark ? "#1e293b" : "#e2e8f0"} />
                    </div>
                  ))}
                  {form.contract_type !== "STAGE" && (
                    <div style={{ gridColumn: "1/-1" }}>
                      <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: dark ? "#94a3b8" : "#64748b", marginBottom: 3 }}>
                        Contrat <span style={{ color: "#94a3b8", fontWeight: 400 }}>— PDF / doc, optionnel</span>
                      </label>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <label style={{ flex: 1, padding: "7px 10px", borderRadius: 9, border: `1.5px dashed ${contractFile ? "#22c55e" : (dark ? "#334155" : "#cbd5e1")}`, background: contractFile ? (dark ? "#052e16" : "#f0fdf4") : (dark ? "#0a0f1a" : "#f8fafc"), cursor: "pointer", fontSize: 12, color: contractFile ? "#16a34a" : "#94a3b8", display: "flex", alignItems: "center", gap: 6 }}>
                          <span>{contractFile ? `📎 ${contractFile.name}` : "Joindre le contrat..."}</span>
                          <input type="file" accept=".pdf,.doc,.docx" style={{ display: "none" }} onChange={e => setContractFile(e.target.files[0] || null)} />
                        </label>
                        {contractFile && (
                          <button type="button" onClick={() => setContractFile(null)}
                            style={{ padding: "7px 10px", borderRadius: 9, border: `1px solid ${dark ? "#334155" : "#e2e8f0"}`, background: "transparent", cursor: "pointer", fontSize: 13, color: "#ef4444", fontWeight: 700 }}>✕</button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* ── Actions ── */}
              <div style={{ padding: "10px 12px", display: "flex", justifyContent: "flex-end", gap: 8, borderTop: `1px solid ${dark ? "#0f172a" : "#f1f5f9"}`, marginTop: 8 }}>
                {editingEmployeeId && (
                  <button type="button" onClick={resetForm}
                    style={{ padding: "8px 18px", borderRadius: 10, border: `1.5px solid ${dark ? "#334155" : "#e2e8f0"}`, background: "transparent", fontWeight: 700, fontSize: 12, cursor: "pointer", color: dark ? "#94a3b8" : "#64748b" }}>
                    Annuler
                  </button>
                )}
                <button type="submit" disabled={submitting}
                  style={{ padding: "9px 22px", borderRadius: 10, border: "none", background: submitting ? "#94a3b8" : "linear-gradient(135deg,#3b82f6,#2563eb)", color: "#fff", fontWeight: 800, fontSize: 13, cursor: submitting ? "not-allowed" : "pointer", boxShadow: submitting ? "none" : "0 4px 14px rgba(59,130,246,0.35)" }}>
                  {submitting ? "Enregistrement..." : editingEmployeeId ? "Mettre à jour" : "Créer l'employé"}
                </button>
              </div>
            </form>
          </section>
        ) : !canManageEmployees ? (
          <div style={{ padding: "12px 16px", borderRadius: 14, fontSize: 13, color: "#64748b", background: dark ? "#1e293b" : "#f8fafc", border: `1px solid ${dark ? "#334155" : "#e2e8f0"}` }}>
            Consultation autorisée. La création est réservée au GRH.
          </div>
        ) : null}

        {/* Right column: employee list */}
        <section style={{ margin: 0, borderRadius: 20, border: `1px solid ${dark ? "#1e293b" : "#e2e8f0"}`, background: dark ? "#0f172a" : "#fff", overflow: "hidden", display: "flex", flexDirection: "column", maxHeight: 660 }}>

          {/* Sticky list header */}
          <div style={{ padding: "10px 14px", borderBottom: `1px solid ${dark ? "#1e293b" : "#f1f5f9"}`, background: dark ? "#0a0f1a" : "#f8fafc", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 13, fontWeight: 900, color: dark ? "#f1f5f9" : "#0f172a" }}>Liste des employés</h2>
                <p style={{ margin: "1px 0 0", fontSize: 11, color: "#94a3b8" }}>
                  <span style={{ color: "#22c55e", fontWeight: 700 }}>{employees.filter(e => e.is_active !== false).length} actifs</span>
                  {formerEmployees.filter(e => e.is_active === false).length > 0 && (
                    <> · <span style={{ color: "#f97316", fontWeight: 700 }}>{formerEmployees.filter(e => e.is_active === false).length} anciens</span></>
                  )}
                </p>
              </div>
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <input type="text" value={employeeSearch} onChange={e => setEmployeeSearch(e.target.value)} placeholder="Rechercher par nom ou prénom..."
                style={{ flex: "1 1 140px", padding: "6px 12px", borderRadius: 9, border: `1.5px solid ${dark ? "#334155" : "#e2e8f0"}`, background: dark ? "#0f172a" : "#fff", color: dark ? "#e2e8f0" : "#0f172a", fontSize: 12, outline: "none", boxSizing: "border-box" }} />
              <select value={filterService} onChange={e => { setFilterService(e.target.value); setFilterPoste(""); }}
                style={{ padding: "6px 10px", borderRadius: 9, border: `1.5px solid ${dark ? "#334155" : "#e2e8f0"}`, background: dark ? "#0f172a" : "#fff", color: dark ? "#e2e8f0" : "#0f172a", fontSize: 12, outline: "none" }}>
                <option value="">Tous les services</option>
                {services.map(s => <option key={s.code} value={s.code}>{s.nomService}</option>)}
              </select>
              {!services.find(s => s.code === filterService)?.is_rh_service && (
                <select value={filterPoste} onChange={e => setFilterPoste(e.target.value)} disabled={!filterService}
                  style={{ padding: "6px 10px", borderRadius: 9, border: `1.5px solid ${dark ? "#334155" : "#e2e8f0"}`, background: dark ? "#0f172a" : "#fff", color: filterService ? (dark ? "#e2e8f0" : "#0f172a") : "#94a3b8", fontSize: 12, outline: "none", opacity: filterService ? 1 : 0.6 }}>
                  <option value="">{filterService ? "Tous postes" : "Service d'abord"}</option>
                  {positions.filter(p => p.service === filterService).map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                </select>
              )}
            </div>
          </div>

          {/* Scrollable body */}
          <div style={{ flex: 1, overflowY: "auto", padding: "10px 12px" }}>
            {loading ? (
              <div style={{ padding: 24, textAlign: "center", color: "#94a3b8", fontSize: 12 }}>Chargement...</div>
            ) : (() => {
              const q = employeeSearch.trim().toLowerCase();
              const roleLabels = { EMPLOYEE: "Employé", CHEF: "Chef", RH_SIMPLE: "RH Congé", RH_AGENT: "RH Agent", GRH: "DRH", RH: "RH", RH_CONGE: "RH Congé", RH_FORMATION: "RH Formation", DRH: "DRH" };
              const activeEmps = employees.filter(emp => {
                if (emp.is_active === false) return false;
                const name = `${emp.first_name || ""} ${emp.last_name || ""}`.toLowerCase();
                const matchName = !q || name.split(" ").some(p => p.startsWith(q)) || name.includes(q);
                const matchService = !filterService || (emp.service?.code || emp.service) === filterService;
                const matchPoste = !filterPoste || (emp.position || "") === filterPoste;
                return matchName && matchService && matchPoste;
              });
              const terminated = formerEmployees.filter(e => e.is_active === false);

              const renderCard = (emp, isTerminated) => {
                const fullName = `${emp.first_name || ""} ${emp.last_name || ""}`.trim() || emp.email;
                const initials = `${emp.first_name?.[0] || ""}${emp.last_name?.[0] || ""}`.toUpperCase() || "?";
                const hiredDate = emp.hired_at ? new Date(`${emp.hired_at}T00:00:00`).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }) : null;
                const terminatedDate = emp.terminated_at ? new Date(`${emp.terminated_at}T00:00:00`).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }) : null;
                return (
                  <div key={emp.id} style={{
                    display: "flex", alignItems: "center", gap: 10, padding: "9px 12px",
                    borderRadius: 13, border: `1px solid ${isTerminated ? (dark ? "#431407" : "#fed7aa") : (dark ? "#1e293b" : "#e2e8f0")}`,
                    background: isTerminated ? (dark ? "#1c0a00" : "#fff7ed") : (dark ? "#0f172a" : "#fff"),
                  }}>
                    <div style={{ width: 34, height: 34, borderRadius: "50%", flexShrink: 0, background: isTerminated ? (dark ? "#431407" : "#fed7aa") : (emp.is_online ? "#dcfce7" : (dark ? "#1e293b" : "#f1f5f9")), border: `2px solid ${isTerminated ? "#f97316" : (emp.is_online ? "#22c55e" : (dark ? "#334155" : "#e2e8f0"))}`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 11, color: isTerminated ? "#f97316" : (emp.is_online ? "#15803d" : (dark ? "#94a3b8" : "#64748b")) }}>
                      {initials}
                    </div>
                    <div style={{ flex: "2 1 110px", minWidth: 90, overflow: "hidden" }}>
                      <p style={{ margin: 0, fontWeight: 700, fontSize: 12, color: dark ? "#f1f5f9" : "#0f172a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{fullName}</p>
                      <p style={{ margin: 0, fontSize: 11, color: "#94a3b8", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{emp.email}</p>
                    </div>
                    <div style={{ flex: "1 1 80px", minWidth: 70 }}>
                      <p style={{ margin: 0, fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", color: "#94a3b8" }}>Service</p>
                      <p style={{ margin: "1px 0 0", fontSize: 11, fontWeight: 600, color: dark ? "#e2e8f0" : "#374151", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{emp.service?.nomService || "—"}</p>
                    </div>
                    <div style={{ flex: "1 1 70px", minWidth: 60 }}>
                      {emp.position ? (
                        <>
                          <p style={{ margin: 0, fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", color: "#94a3b8" }}>Poste</p>
                          <p style={{ margin: "1px 0 0", fontSize: 11, color: dark ? "#e2e8f0" : "#374151", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{emp.position}</p>
                        </>
                      ) : (
                        <>
                          <p style={{ margin: 0, fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", color: "#94a3b8" }}>Rôle</p>
                          <p style={{ margin: "1px 0 0", fontSize: 11, fontWeight: 700, color: dark ? "#e2e8f0" : "#374151" }}>{roleLabels[emp.employee_role || emp.role] || "—"}</p>
                        </>
                      )}
                    </div>
                    <div style={{ flex: "1 1 70px", minWidth: 60 }}>
                      {isTerminated ? (
                        <>
                          <p style={{ margin: 0, fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", color: "#f97316" }}>Fin contrat</p>
                          <p style={{ margin: "1px 0 0", fontSize: 11, color: "#f97316", whiteSpace: "nowrap" }}>{terminatedDate || "—"}</p>
                        </>
                      ) : (
                        <>
                          <p style={{ margin: 0, fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", color: "#94a3b8" }}>Recruté</p>
                          <p style={{ margin: "1px 0 0", fontSize: 11, color: dark ? "#e2e8f0" : "#374151", whiteSpace: "nowrap" }}>{hiredDate || "—"}</p>
                        </>
                      )}
                    </div>
                    {isTerminated ? (
                      <span style={{ padding: "3px 8px", borderRadius: 20, fontSize: 10, fontWeight: 700, whiteSpace: "nowrap", background: "#fff7ed", color: "#f97316", border: "1px solid #fed7aa", flexShrink: 0 }}>Fin contrat</span>
                    ) : (
                      <span style={{ padding: "3px 8px", borderRadius: 20, fontSize: 10, fontWeight: 700, whiteSpace: "nowrap", flexShrink: 0, background: emp.is_online ? "#dcfce7" : (dark ? "#1e293b" : "#f1f5f9"), color: emp.is_online ? "#15803d" : "#94a3b8", border: `1px solid ${emp.is_online ? "#86efac" : (dark ? "#334155" : "#e2e8f0")}` }}>
                        {emp.is_online ? "En ligne" : "Hors ligne"}
                      </span>
                    )}
                    <div style={{ display: "flex", gap: 5, marginLeft: "auto", flexShrink: 0 }}>
                      <button type="button" onClick={() => setDetailEmployee(emp)}
                        style={{ padding: "4px 10px", borderRadius: 7, border: `1px solid ${dark ? "#334155" : "#e2e8f0"}`, background: "transparent", fontWeight: 600, fontSize: 11, cursor: "pointer", color: dark ? "#e2e8f0" : "#374151" }}>
                        Détails
                      </button>
                      {!isTerminated && canManageEmployees && (
                        <button type="button" onClick={() => startEdit(emp)}
                          style={{ padding: "4px 10px", borderRadius: 7, border: "none", background: "#3b82f6", color: "#fff", fontWeight: 600, fontSize: 11, cursor: "pointer" }}>
                          Modifier
                        </button>
                      )}
                    </div>
                  </div>
                );
              };

              return (
                <div style={{ display: "grid", gap: 6 }}>
                  {activeEmps.length === 0 && (
                    <div style={{ padding: 20, textAlign: "center", color: "#94a3b8", fontSize: 12 }}>
                      {q ? `Aucun résultat pour "${employeeSearch}".` : "Aucun employé visible."}
                    </div>
                  )}
                  {activeEmps.map(emp => renderCard(emp, false))}
                </div>
              );
            })()}
          </div>
        </section>

        </div>

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
                    ["Contrat", emp.contract_type || "—", emp.contract_file_url],
                    ["Sexe", emp.sexe === "FEMME" ? "Femme" : "Homme"],
                    ["Date de naissance", birthDate],
                    ["Date de recrutement", hiredDate],
                    ["Téléphone", emp.phone_number || "—"],
                  ].map(([label, val, fileUrl]) => (
                    <div key={label}>
                      <p style={{ margin: 0, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#94a3b8" }}>{label}</p>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 3 }}>
                        <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: dark ? "#e2e8f0" : "#0f172a" }}>{val}</p>
                        {fileUrl && (
                          <a href={fileUrl} download target="_blank" rel="noreferrer"
                            style={{ padding: "3px 10px", borderRadius: 8, background: dark ? "#1e3a5f" : "#eff6ff", color: "#3b82f6", fontSize: 12, fontWeight: 700, textDecoration: "none", border: "1px solid #93c5fd", whiteSpace: "nowrap" }}>
                            ↓ Contrat
                          </a>
                        )}
                      </div>
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
                      <button type="button"
                        onClick={() => { openTerminateModal(emp); setDetailEmployee(null); }}
                        style={{ padding: "8px 18px", borderRadius: 10, border: "1px solid #f97316", background: "#fff7ed", color: "#c2410c", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
                        Fin de contrat
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

        {/* Terminate PIN modal */}
        {terminateModal && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.6)", zIndex: 600, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
            <div style={{ background: dark ? "#0f172a" : "#fff", borderRadius: 20, padding: 32, width: "min(420px,96vw)", boxShadow: "0 24px 64px rgba(0,0,0,0.25)" }}>
              <h3 style={{ margin: "0 0 8px", color: "#c2410c", fontWeight: 900 }}>Fin de contrat</h3>
              <p style={{ margin: "0 0 20px", fontSize: 14, color: dark ? "#94a3b8" : "#64748b" }}>
                Confirmez la fin de contrat de <strong>{terminateModal.first_name} {terminateModal.last_name}</strong>.<br/>
                Cette personne sera déplacée dans la liste des anciens employés.
              </p>
              <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: dark ? "#e2e8f0" : "#374151", marginBottom: 6 }}>
                Entrez votre PIN pour confirmer
              </label>
              <input
                type="password"
                maxLength={4}
                value={terminatePin}
                onChange={e => setTerminatePin(e.target.value)}
                placeholder="••••"
                style={{ width: "100%", padding: "10px 14px", borderRadius: 12, border: `1.5px solid ${terminateError ? "#ef4444" : (dark ? "#334155" : "#e2e8f0")}`, background: dark ? "#1e293b" : "#f8fafc", color: dark ? "#e2e8f0" : "#0f172a", fontSize: 18, letterSpacing: "0.3em", outline: "none", boxSizing: "border-box", textAlign: "center" }}
                autoFocus
              />
              {terminateError && <p style={{ color: "#ef4444", fontSize: 13, marginTop: 6 }}>{terminateError}</p>}
              <div style={{ display: "flex", gap: 10, marginTop: 20, justifyContent: "flex-end" }}>
                <button type="button" onClick={() => setTerminateModal(null)}
                  style={{ padding: "9px 20px", borderRadius: 10, border: `1px solid ${dark ? "#334155" : "#e2e8f0"}`, background: "transparent", fontWeight: 600, fontSize: 13, cursor: "pointer", color: dark ? "#94a3b8" : "#64748b" }}>
                  Annuler
                </button>
                <button type="button" onClick={confirmTerminate} disabled={terminateLoading || !terminatePin}
                  style={{ padding: "9px 20px", borderRadius: 10, border: "none", background: "#c2410c", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer", opacity: terminateLoading || !terminatePin ? 0.6 : 1 }}>
                  {terminateLoading ? "Traitement..." : "Confirmer la fin de contrat"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Former employees section */}
        {isGrh && (() => {
          const terminated = formerEmployees.filter(e => e.is_active === false);
          if (terminated.length === 0) return null;
          const q = formerSearch.trim().toLowerCase();
          const filtered = terminated.filter(emp => {
            const name = `${emp.first_name || ""} ${emp.last_name || ""}`.toLowerCase();
            const matchName = !q || name.split(" ").some(p => p.startsWith(q)) || name.includes(q);
            const matchService = !formerFilterService || (emp.service?.code || emp.service) === formerFilterService;
            const matchPoste = !formerFilterPoste || (emp.position || "") === formerFilterPoste;
            return matchName && matchService && matchPoste;
          });
          return (
            <section style={{ width: "96%", margin: "8px auto 24px", borderRadius: 20, border: `1px solid ${dark ? "#431407" : "#fed7aa"}`, background: dark ? "#0f172a" : "#fff", overflow: "hidden" }}>
              {/* Header */}
              <div style={{ padding: "12px 18px", borderBottom: `1px solid ${dark ? "#431407" : "#ffedd5"}`, background: dark ? "#1c0a00" : "#fff7ed", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ width: 28, height: 28, borderRadius: "50%", background: "#f97316", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>📋</span>
                  <div>
                    <h2 style={{ margin: 0, fontSize: 14, fontWeight: 900, color: dark ? "#fed7aa" : "#9a3412" }}>Anciens employés</h2>
                    <p style={{ margin: 0, fontSize: 11, color: "#f97316" }}>{terminated.length} contrat{terminated.length > 1 ? "s" : ""} terminé{terminated.length > 1 ? "s" : ""}</p>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <input type="text" value={formerSearch} onChange={e => setFormerSearch(e.target.value)} placeholder="Rechercher..."
                    style={{ padding: "6px 12px", borderRadius: 9, border: `1.5px solid ${dark ? "#431407" : "#fed7aa"}`, background: dark ? "#0f172a" : "#fff", color: dark ? "#e2e8f0" : "#0f172a", fontSize: 12, outline: "none", width: 160, boxSizing: "border-box" }} />
                  <select value={formerFilterService} onChange={e => { setFormerFilterService(e.target.value); setFormerFilterPoste(""); }}
                    style={{ padding: "6px 10px", borderRadius: 9, border: `1.5px solid ${dark ? "#431407" : "#fed7aa"}`, background: dark ? "#0f172a" : "#fff", color: dark ? "#e2e8f0" : "#0f172a", fontSize: 12, outline: "none" }}>
                    <option value="">Tous les services</option>
                    {services.map(s => <option key={s.code} value={s.code}>{s.nomService}</option>)}
                  </select>
                </div>
              </div>
              {/* Cards */}
              <div style={{ padding: "12px 16px", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 10 }}>
                {filtered.length === 0 ? (
                  <div style={{ padding: "16px", textAlign: "center", color: "#94a3b8", fontSize: 12, gridColumn: "1/-1" }}>Aucun résultat.</div>
                ) : filtered.map(emp => {
                  const fullName = `${emp.first_name || ""} ${emp.last_name || ""}`.trim() || emp.email;
                  const initials = `${emp.first_name?.[0] || ""}${emp.last_name?.[0] || ""}`.toUpperCase() || "?";
                  const terminatedDate = emp.terminated_at ? new Date(`${emp.terminated_at}T00:00:00`).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }) : "—";
                  return (
                    <div key={emp.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 13, border: `1px solid ${dark ? "#431407" : "#ffedd5"}`, background: dark ? "#1c0a00" : "#fff7ed" }}>
                      <div style={{ width: 36, height: 36, borderRadius: "50%", background: dark ? "#431407" : "#fed7aa", border: "2px solid #f97316", display: "flex", alignItems: "center", justifyContent: "center", color: "#f97316", fontWeight: 800, fontSize: 12, flexShrink: 0 }}>{initials}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontWeight: 700, fontSize: 12, color: dark ? "#fed7aa" : "#9a3412", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{fullName}</p>
                        <p style={{ margin: "1px 0 0", fontSize: 11, color: "#f97316", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{emp.service?.nomService || "—"}{emp.position ? ` · ${emp.position}` : ""}</p>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <p style={{ margin: 0, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#f97316" }}>Fin contrat</p>
                        <p style={{ margin: "1px 0 0", fontSize: 11, fontWeight: 700, color: dark ? "#fed7aa" : "#9a3412", whiteSpace: "nowrap" }}>{terminatedDate}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
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
                    <select value={form.contract_type} onChange={e => { if (e.target.value === "STAGE") setContractFile(null); setForm(p => ({ ...p, contract_type: e.target.value })); }}
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

