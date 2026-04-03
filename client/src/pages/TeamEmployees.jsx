import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import Navbar from "../components/Navbar";
import useDarkModePreference from "../hooks/useDarkModePreference";
import usePersistentNavState from "../hooks/usePersistentNavState";
import "../styles/profile.css";

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("fr-FR");
}

export default function TeamEmployees() {
  const [dark, setDark] = useDarkModePreference();
  const [isNavOpen, setIsNavOpen] = usePersistentNavState();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [serviceName, setServiceName] = useState("");
  const [error, setError] = useState("");
  const [currentRole, setCurrentRole] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      setError("");

      const [meResponse, employeesResponse] = await Promise.all([
        axios.get("/api/whoami/"),
        axios.get("/api/employees/", { params: { scope: "team" } }),
      ]);
      const role = meResponse.data?.role || "";
      const data = Array.isArray(employeesResponse.data) ? employeesResponse.data : [];

      setCurrentRole(role);
      setEmployees(data);
      setServiceName(data[0]?.service?.nomService || "");
    } catch (requestError) {
      console.error("Erreur chargement equipe:", requestError);
      setEmployees([]);
      setServiceName("");
      setCurrentRole("");
      setError("Impossible de charger la liste des employes du service.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const stats = useMemo(() => {
    const total = employees.length;
    const online = employees.filter((employee) => employee.is_online).length;
    const offline = Math.max(total - online, 0);
    return { total, online, offline };
  }, [employees]);

  const modalCardStyle = {
    width: "min(92vw, 760px)",
    maxHeight: "88vh",
    overflowY: "auto",
    borderRadius: 18,
    padding: 24,
    background: dark ? "#111827" : "#ffffff",
    color: dark ? "#e2e8f0" : "#111827",
    boxShadow: "0 18px 48px rgba(15, 23, 42, 0.28)",
    border: `1px solid ${dark ? "#334155" : "#e2e8f0"}`,
  };

  return (
    <div
      className={`profile-page${dark ? " dark" : ""} ${isNavOpen ? "nav-open" : "nav-closed"}`}
    >
      <div className={`navbar-profile-page ${isNavOpen ? "open" : "closed"}`}>
        <Navbar />
      </div>

      {isNavOpen && (
        <div
          className="profile-overlay"
          onClick={() => setIsNavOpen(false)}
          aria-hidden="true"
        />
      )}

      <div className="profile-content !h-auto min-h-screen bg-transparent">
        <div
          className={`sticky top-0 z-40 backdrop-blur ${
            dark
              ? "border-b border-slate-800 bg-slate-950/90"
              : "border-b border-slate-200/80 bg-white/90"
          }`}
        >
          <div className="profile-naaav">
            <div className="yasar">
              <h1 className="monprofile">Mon equipe</h1>
              <p className="morinfo">
                Visualisez les employes de votre service et leur statut de presence en ligne.
              </p>
            </div>
            <div className="yamin">
              <button
                className="nav-toggle"
                onClick={() => setIsNavOpen((prev) => !prev)}
                type="button"
              >
                {isNavOpen ? "Masquer menu" : "Afficher menu"}
              </button>
              <button
                className="mode"
                onClick={() => setDark((prev) => !prev)}
                type="button"
              >
                {dark ? "mode clair" : "mode sombre"}
              </button>
            </div>
          </div>
        </div>

        <div className="infopro-infoper">
          <section className="info-per">
            <div className="top">
              <h2 className="title">Service</h2>
              <p className="desc">Equipe actuellement rattachee a votre compte.</p>
            </div>
            <div>
              <p className="desc">Nom du service</p>
              <h3>{serviceName || "Non renseigne"}</h3>
            </div>
            <div>
              <p className="desc">Employes visibles</p>
              <h3>{stats.total}</h3>
            </div>
          </section>

          <section className="info-pro">
            <div className="top">
              <h2 className="title">Presence en ligne</h2>
              <p className="desc">Suivi rapide de la disponibilite actuelle.</p>
            </div>
            <div>
              <p className="desc">En ligne</p>
              <h3>{stats.online}</h3>
            </div>
            <div>
              <p className="desc">Hors ligne</p>
              <h3>{stats.offline}</h3>
            </div>
            <div>
              <button className="modifier" onClick={fetchEmployees} type="button">
                Actualiser
              </button>
            </div>
          </section>
        </div>

        <section className="activite-recente" style={{ width: "96%", margin: "24px auto" }}>
          <div className="activite-top">
            <h2 className="activite-title">Employes du service</h2>
            <p className="activite-subtitle">
              Statut en ligne des employes remontes par le backend.
            </p>
          </div>

          {currentRole && !["CHEF", "RH_SENIOR"].includes(currentRole) && (
            <div
              className="page-feedback info"
              style={{ margin: "0 0 16px" }}
            >
              Cette page est principalement destinee au chef de service et au RH senior pour suivre leur equipe.
            </div>
          )}

          {error && (
            <div
              className="page-feedback error"
              style={{ margin: "0 0 16px" }}
            >
              {error}
            </div>
          )}

          <div className="activite-table-scroll">
            <table className="activite-table">
              <thead>
                <tr>
                  <th>Employe</th>
                  <th>Poste</th>
                  <th>Email</th>
                  <th>Telephone</th>
                  <th>Contrat</th>
                  <th>Entree entreprise</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="7">Chargement de l'equipe...</td>
                  </tr>
                ) : employees.length === 0 ? (
                  <tr>
                    <td colSpan="7">Aucun employe n'est visible pour ce service.</td>
                  </tr>
                ) : (
                  employees.map((employee) => {
                    const fullName = `${employee.first_name || ""} ${employee.last_name || ""}`.trim();

                    return (
                      <tr
                        key={employee.id}
                        onClick={() => setSelectedEmployee(employee)}
                        style={{ cursor: "pointer" }}
                      >
                        <td>{fullName || employee.email || "-"}</td>
                        <td>{employee.position || "-"}</td>
                        <td>{employee.email || "-"}</td>
                        <td>{employee.phone_number || "-"}</td>
                        <td>{employee.contract_type || "-"}</td>
                        <td>{formatDate(employee.hired_at)}</td>
                        <td>
                          <span
                            className={`badge ${employee.is_online ? "badge-termine" : "badge-refuse"}`}
                          >
                            {employee.is_online ? "En ligne" : "Hors ligne"}
                          </span>
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

      {selectedEmployee && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 500,
            padding: 16,
          }}
          onClick={() => setSelectedEmployee(null)}
        >
          <div style={modalCardStyle} onClick={(event) => event.stopPropagation()}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: 16,
                marginBottom: 18,
              }}
            >
              <div>
                <h2 style={{ margin: 0 }}>
                  {`${selectedEmployee.first_name || ""} ${selectedEmployee.last_name || ""}`.trim() ||
                    selectedEmployee.email ||
                    "Employe"}
                </h2>
                <p
                  style={{
                    margin: "8px 0 0",
                    color: dark ? "#94a3b8" : "#64748b",
                  }}
                >
                  Consultation des informations personnelles et professionnelles.
                </p>
              </div>
              <button
                type="button"
                className="mode"
                onClick={() => setSelectedEmployee(null)}
              >
                Fermer
              </button>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                gap: 18,
              }}
            >
              <section
                style={{
                  borderRadius: 16,
                  padding: 18,
                  background: dark ? "#0f172a" : "#f8fafc",
                  border: `1px solid ${dark ? "#334155" : "#e2e8f0"}`,
                }}
              >
                <h3 style={{ marginTop: 0 }}>Informations personnelles</h3>
                <p><strong>Nom:</strong> {selectedEmployee.last_name || "-"}</p>
                <p><strong>Prenom:</strong> {selectedEmployee.first_name || "-"}</p>
                <p><strong>Email:</strong> {selectedEmployee.email || "-"}</p>
                <p><strong>Telephone:</strong> {selectedEmployee.phone_number || "-"}</p>
                <p><strong>Adresse:</strong> {selectedEmployee.address || "-"}</p>
              </section>

              <section
                style={{
                  borderRadius: 16,
                  padding: 18,
                  background: dark ? "#0f172a" : "#f8fafc",
                  border: `1px solid ${dark ? "#334155" : "#e2e8f0"}`,
                }}
              >
                <h3 style={{ marginTop: 0 }}>Informations professionnelles</h3>
                <p><strong>Poste:</strong> {selectedEmployee.position || "-"}</p>
                <p><strong>Service:</strong> {selectedEmployee.service?.nomService || "-"}</p>
                <p><strong>Code service:</strong> {selectedEmployee.service?.code || "-"}</p>
                <p><strong>Contrat:</strong> {selectedEmployee.contract_type || "-"}</p>
                <p><strong>Date d'entree:</strong> {formatDate(selectedEmployee.hired_at)}</p>
                <p>
                  <strong>Statut en ligne:</strong>{" "}
                  <span
                    className={`badge ${selectedEmployee.is_online ? "badge-termine" : "badge-refuse"}`}
                  >
                    {selectedEmployee.is_online ? "En ligne" : "Hors ligne"}
                  </span>
                </p>
              </section>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
