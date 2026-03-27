import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import Navbar from "../components/Navbar";
import useDarkModePreference from "../hooks/useDarkModePreference";
import "../styles/profile.css";

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("fr-FR");
}

export default function TeamEmployees() {
  const [dark, setDark] = useDarkModePreference();
  const [isNavOpen, setIsNavOpen] = useState(true);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [serviceName, setServiceName] = useState("");
  const [error, setError] = useState("");
  const [currentRole, setCurrentRole] = useState("");

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      setError("");

      const [meResponse, employeesResponse] = await Promise.all([
        axios.get("/api/whoami/"),
        axios.get("/api/employees/"),
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

          {currentRole && currentRole !== "CHEF" && (
            <div
              style={{
                margin: "0 0 16px",
                padding: "12px 16px",
                borderRadius: 12,
                background: dark ? "#1e293b" : "#eef2ff",
                color: dark ? "#cbd5e1" : "#1e3a8a",
                border: `1px solid ${dark ? "#334155" : "#c7d2fe"}`,
              }}
            >
              Cette page est principalement destinee au chef de service pour suivre son equipe.
            </div>
          )}

          {error && (
            <div
              style={{
                margin: "0 0 16px",
                padding: "12px 16px",
                borderRadius: 12,
                background: dark ? "#3f1d1d" : "#ffe6e6",
                color: dark ? "#fecaca" : "#b91c1c",
                border: `1px solid ${dark ? "#7f1d1d" : "#fecaca"}`,
              }}
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
                      <tr key={employee.id}>
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
    </div>
  );
}
