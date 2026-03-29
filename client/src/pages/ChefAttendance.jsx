import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import Navbar from "../components/Navbar";
import useDarkModePreference from "../hooks/useDarkModePreference";
import "../styles/profile.css";

function formatTime(value) {
  if (!value) return "--:--";
  return value.slice(0, 5);
}

export default function ChefAttendance() {
  const [dark, setDark] = useDarkModePreference();
  const [isNavOpen, setIsNavOpen] = useState(true);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const fetchAttendance = async () => {
    try {
      setLoading(true);
      setErrorMessage("");
      const response = await axios.get("/api/attendance/team/");
      setRows(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error("Erreur chargement presence equipe:", error);
      setRows([]);
      setErrorMessage("Impossible de charger le suivi de presence de l'equipe.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, []);

  const stats = useMemo(() => {
    const total = rows.length;
    const complete = rows.filter((row) => row.status_today === "Complet").length;
    const inProgress = rows.filter((row) => row.status_today === "En cours").length;
    const absent = rows.filter((row) => row.status_today === "Absent").length;
    return { total, complete, inProgress, absent };
  }, [rows]);

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
              <h1 className="monprofile">Presence equipe</h1>
              <p className="morinfo">
                Suivi des pointages, absences et journees completes des employes de votre service.
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
              <p className="desc">Etat global de la presence du jour.</p>
            </div>
            <div>
              <p className="desc">Employes suivis</p>
              <h3>{stats.total}</h3>
            </div>
            <div>
              <p className="desc">Journees completes</p>
              <h3>{stats.complete}</h3>
            </div>
          </section>

          <section className="info-pro">
            <div className="top">
              <h2 className="title">Pointages du jour</h2>
              <p className="desc">Repartition des pointages d'aujourd'hui.</p>
            </div>
            <div>
              <p className="desc">En cours</p>
              <h3>{stats.inProgress}</h3>
            </div>
            <div>
              <p className="desc">Absents</p>
              <h3>{stats.absent}</h3>
            </div>
            <div>
              <button className="modifier" onClick={fetchAttendance} type="button">
                Actualiser
              </button>
            </div>
          </section>
        </div>

        {errorMessage && (
          <div
            style={{
              width: "96%",
              margin: "0 auto 16px",
              padding: "12px 16px",
              borderRadius: 12,
              background: dark ? "#3f1d1d" : "#ffe6e6",
              color: dark ? "#fecaca" : "#b91c1c",
              border: `1px solid ${dark ? "#7f1d1d" : "#fecaca"}`,
            }}
          >
            {errorMessage}
          </div>
        )}

        <section className="activite-recente" style={{ width: "96%", margin: "24px auto" }}>
          <div className="activite-top">
            <h2 className="activite-title">Suivi de presence equipe</h2>
            <p className="activite-subtitle">
              Donnees remontees par le backend pour la periode en cours.
            </p>
          </div>

          <div className="activite-table-scroll">
            <table className="activite-table">
              <thead>
                <tr>
                  <th>Employe</th>
                  <th>Poste</th>
                  <th>Entree</th>
                  <th>Sortie</th>
                  <th>Journees completes</th>
                  <th>Sorties manquantes</th>
                  <th>Absences</th>
                  <th>Statut du jour</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="8">Chargement de la presence equipe...</td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan="8">Aucune donnee de presence disponible.</td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <div>{row.full_name}</div>
                        <div style={{ fontSize: 12, color: "#94a3b8" }}>{row.email}</div>
                      </td>
                      <td>{row.position || "-"}</td>
                      <td>{formatTime(row.today_check_in)}</td>
                      <td>{formatTime(row.today_check_out)}</td>
                      <td>{row.complete_days}</td>
                      <td>{row.pending_checkout_days}</td>
                      <td>{row.absent_days}</td>
                      <td>
                        <span
                          className={`badge ${
                            row.status_today === "Complet"
                              ? "badge-termine"
                              : row.status_today === "En cours"
                                ? "badge-attente"
                                : "badge-refuse"
                          }`}
                        >
                          {row.status_today}
                        </span>
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
