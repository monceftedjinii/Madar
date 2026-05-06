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
  service: "",
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
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editingEmployeeId, setEditingEmployeeId] = useState(null);
  const [actionId, setActionId] = useState(null);
  const [feedback, setFeedback] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

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
      const [meResponse, employeesResponse, servicesResponse] = await Promise.all([
        axios.get("/api/whoami/"),
        axios.get("/api/employees/"),
        axios.get("/api/services/"),
      ]);
      setRoleCtx(getRoleContext({ role: meResponse.data?.role, service: meResponse.data?.service, employee_role: meResponse.data?.employee_role }));
      setEmployees(Array.isArray(employeesResponse.data) ? employeesResponse.data : []);
      setServices(Array.isArray(servicesResponse.data) ? servicesResponse.data : []);
    } catch (error) {
      console.error("Erreur chargement gestion employes RH:", error);
      setEmployees([]);
      setErrorMessage("Impossible de charger les employes RH.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const stats = useMemo(() => {
    const online = employees.filter((item) => item.is_online).length;
    const cdi = employees.filter((item) => item.contract_type === "CDI").length;
    const cdd = employees.filter((item) => item.contract_type === "CDD").length;
    return { total: employees.length, online, cdi, cdd };
  }, [employees]);

  const resetForm = () => {
    setForm(initialForm);
    setEditingEmployeeId(null);
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
        setFeedback("Employe mis a jour avec succes.");
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
      service: employee.service?.code || "",
      phone_number: employee.phone_number || "",
      address: employee.address || "",
      contract_type: employee.contract_type || "CDI",
      salary: employee.salary || "",
      attendance_pin: employee.attendance_pin || "",
      employee_role: employee.employee_role || "EMPLOYEE",
    });
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

        <div className="infopro-infoper">
          <section className="info-per">
            <div className="top">
              <h2 className="title">{isGrh ? "Effectif global" : "Effectif"}</h2>
              <p className="desc">{isGrh ? "Vue d'ensemble des employes sur le scope GRH." : "Vue d'ensemble des employes visibles."}</p>
            </div>
            <div><p className="desc">Total</p><h3>{stats.total}</h3></div>
            <div><p className="desc">En ligne</p><h3>{stats.online}</h3></div>
            <div><p className="desc">CDI</p><h3>{stats.cdi}</h3></div>
            <div><p className="desc">CDD</p><h3>{stats.cdd}</h3></div>
          </section>

          <section className="info-pro">
            <div className="top">
              <h2 className="title">{isGrh ? "Role de gouvernance" : "Role RH"}</h2>
              <p className="desc">{isGrh ? "Niveau d'action global sur les fiches employees." : "Niveau d'action sur les fiches employees."}</p>
            </div>
            <div><p className="desc">Role</p><h3>{roleCtx.effectiveRole || "-"}</h3></div>
            <div>
              <p className="desc">Actualisation</p>
              <button className="modifier" onClick={fetchData} type="button">Actualiser</button>
            </div>
          </section>
        </div>

        {(feedback || errorMessage) && (
          <div className={`page-feedback ${errorMessage ? "error" : ""}`}>{errorMessage || feedback}</div>
        )}

        {canManageEmployees ? (
          <section className="quelques-infos" style={{ width: "96%", marginTop: 0 }}>
            <form
              onSubmit={submitEmployee}
              style={{
                width: "100%",
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 14,
              }}
            >
              {[
                ["first_name", "Prenom"],
                ["last_name", "Nom"],
                ["email", "Email"],
                ["phone_number", "Telephone"],
                ["address", "Adresse"],
                ["salary", "Salaire"],
                ["attendance_pin", "PIN presence"],
              ].map(([key, label]) => (
                <div key={key}>
                  <p className="desc">{label}</p>
                  <input
                    name={key}
                    value={form[key]}
                    onChange={(event) => setForm((prev) => ({ ...prev, [key]: event.target.value }))}
                    style={fieldStyle}
                  />
                </div>
              ))}
              <div>
                <p className="desc">Sexe</p>
                <select
                  value={form.sexe}
                  onChange={(event) => setForm((prev) => ({ ...prev, sexe: event.target.value }))}
                  style={fieldStyle}
                >
                  <option value="HOMME">Homme</option>
                  <option value="FEMME">Femme</option>
                </select>
              </div>
              <div>
                <p className="desc">Service</p>
                <select
                  value={form.service}
                  onChange={(event) => {
                    const newService = event.target.value;
                    const wasRh = services.find((s) => s.code === form.service)?.is_rh_service ?? false;
                    const isRh = services.find((s) => s.code === newService)?.is_rh_service ?? false;
                    setForm((prev) => ({
                      ...prev,
                      service: newService,
                      employee_role: wasRh !== isRh ? (isRh ? "RH" : "EMPLOYEE") : prev.employee_role,
                    }));
                  }}
                  style={fieldStyle}
                >
                  <option value="">Choisir un service</option>
                  {services.map((service) => (
                    <option key={service.code} value={service.code}>
                      {service.nomService}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <p className="desc">Contrat</p>
                <select
                  value={form.contract_type}
                  onChange={(event) => setForm((prev) => ({ ...prev, contract_type: event.target.value }))}
                  style={fieldStyle}
                >
                  <option value="CDI">CDI</option>
                  <option value="CDD">CDD</option>
                  <option value="STAGE">STAGE</option>
                </select>
              </div>
              <div>
                <p className="desc">Rôle</p>
                <select
                  value={form.employee_role}
                  onChange={(event) => setForm((prev) => ({ ...prev, employee_role: event.target.value }))}
                  style={fieldStyle}
                >
                  {((services.find((s) => s.code === form.service)?.is_rh_service) ? RH_SERVICE_ROLES : OTHER_ROLES).map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>
              <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "flex-end", gap: 8 }}>
                {editingEmployeeId ? (
                  <button className="mode" onClick={resetForm} type="button">Annuler</button>
                ) : null}
                <button className="modifier" disabled={submitting} type="submit">
                  {submitting ? "Enregistrement..." : editingEmployeeId ? "Mettre a jour" : "Creer l'employe"}
                </button>
              </div>
            </form>
          </section>
        ) : (
          <div className="page-feedback info">Consultation autorisee. La creation et la suppression sont reservees au GRH.</div>
        )}

        <section className="activite-recente" style={{ width: "96%", margin: "24px auto" }}>
          <div className="activite-top">
            <h2 className="activite-title">Liste des employes</h2>
            <p className="activite-subtitle">Donnees visibles depuis le backend RH.</p>
          </div>

          <div className="activite-table-scroll">
            <table className="activite-table">
              <thead>
                <tr>
                  <th>Employe</th>
                  <th>Sexe</th>
                  <th>Service</th>
                  <th>Rôle</th>
                  <th>Contrat</th>
                  <th>En ligne</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="6">Chargement des employes...</td></tr>
                ) : employees.length === 0 ? (
                  <tr><td colSpan="6">Aucun employe visible pour le moment.</td></tr>
                ) : (
                  employees.map((employee) => (
                    <tr key={employee.id}>
                      <td>
                        <div>{`${employee.first_name || ""} ${employee.last_name || ""}`.trim() || employee.email}</div>
                        <div style={{ fontSize: 12, color: "#94a3b8" }}>{employee.email}</div>
                      </td>
                      <td>{employee.sexe === "FEMME" ? "Femme" : "Homme"}</td>
                      <td>{employee.service?.nomService || "-"}</td>
                      <td>
                        <span style={{ fontWeight: 600 }}>{employee.employee_role || employee.role || "-"}</span>
                      </td>
                      <td>{employee.contract_type || "-"}</td>
                      <td>
                        <span className={`badge ${employee.is_online ? "badge-termine" : "badge-refuse"}`}>
                          {employee.is_online ? "En ligne" : "Hors ligne"}
                        </span>
                      </td>
                      <td>
                        {canManageEmployees ? (
                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                            <button className="modifier" onClick={() => startEdit(employee)} type="button">Modifier</button>
                            <button className="mode" disabled={actionId === employee.id} onClick={() => resetPassword(employee.id)} type="button">Reset mdp</button>
                            <button className="mode" disabled={actionId === employee.id} onClick={() => deleteEmployee(employee.id)} type="button">Supprimer</button>
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
