import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import Navbar from "../components/Navbar";
import useDarkModePreference from "../hooks/useDarkModePreference";
import usePersistentNavState from "../hooks/usePersistentNavState";
import "../styles/profile.css";
import "../styles/chef-space.css";

function formatTime(value) {
  if (!value) return "--:--";
  return value.slice(0, 5);
}

export default function ChefAttendance() {
  const [dark, setDark] = useDarkModePreference();
  const [isNavOpen, setIsNavOpen] = usePersistentNavState();
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

        <div className="chef-page-stack">
          <section className="chef-hero">
            <div className="chef-hero-copy">
              <span className="chef-eyebrow">Espace chef</span>
              <h2 className="chef-hero-title">Lecture instantanee de la presence du service</h2>
              <p className="chef-hero-description">
                Reperez rapidement les journees completes, les pointages en cours et les absences
                de votre equipe avant d'entrer dans le detail.
              </p>
            </div>
            <div className="chef-hero-kpis">
              <article className="chef-kpi-card">
                <span>Equipe suivie</span>
                <strong>{stats.total}</strong>
                <p>Collaborateurs inclus dans votre scope chef.</p>
              </article>
              <article className="chef-kpi-card">
                <span>Complet</span>
                <strong>{stats.complete}</strong>
                <p>Journees cloturees avec entree et sortie.</p>
              </article>
              <article className="chef-kpi-card">
                <span>En cours</span>
                <strong>{stats.inProgress}</strong>
                <p>Pointages encore ouverts aujourd&apos;hui.</p>
              </article>
              <article className="chef-kpi-card">
                <span>Absents</span>
                <strong>{stats.absent}</strong>
                <p>Employes sans presence sur la journee.</p>
              </article>
            </div>
          </section>

          <div className="chef-metrics-grid">
            <article className="chef-metric-card">
              <span>Actualisation</span>
              <strong>{loading ? "..." : "OK"}</strong>
              <p>Les donnees de presence peuvent etre rechargees a tout moment.</p>
            </article>
            <article className="chef-metric-card">
              <span>Controle</span>
              <strong>{stats.complete + stats.inProgress}</strong>
              <p>Employes avec une presence deja constatee sur la journee.</p>
            </article>
            <article className="chef-metric-card">
              <span>Action rapide</span>
              <p style={{ marginTop: 12 }}>
                <button className="modifier" onClick={fetchAttendance} type="button">
                  Actualiser
                </button>
              </p>
            </article>
          </div>

          {errorMessage && <div className="page-feedback error">{errorMessage}</div>}

          <section className="chef-panel">
            <div className="chef-panel-head">
              <div>
                <h2>Suivi de presence equipe</h2>
                <p>Donnees remontees par le backend pour la periode en cours.</p>
              </div>
              <div className="chef-action-pill">Pointages du jour</div>
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
    </div>
  );
}
