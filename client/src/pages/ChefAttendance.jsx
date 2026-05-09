import NotificationBell from "../components/NotificationBell";
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

function formatDate(value) {
  if (!value) return "-";
  const d = new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
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
      console.error("Erreur chargement présence équipe :", error);
      setRows([]);
      setErrorMessage("Impossible de charger le suivi de présence de l'équipe.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, []);

  const stats = useMemo(() => {
    const total = rows.length;
    const complete = rows.filter((r) => r.today_check_in && r.today_check_out).length;
    const inProgress = rows.filter((r) => r.today_check_in && !r.today_check_out).length;
    const absent = rows.filter((r) => !r.today_check_in).length;
    const unjustified = rows.reduce((sum, r) => sum + (r.unjustified_absences || 0), 0);
    return { total, complete, inProgress, absent, unjustified };
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
              <h1 className="monprofile">Présence équipe</h1>
              <p className="morinfo">
                Suivi des pointages, absences et journées complètes des employés de votre service.
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
              <NotificationBell dark={dark} />
            </div>
          </div>
        </div>

        <div className="chef-page-stack">
          <section className="chef-hero">
            <div className="chef-hero-copy">
              <span className="chef-eyebrow">Espace chef</span>
              <h2 className="chef-hero-title">Lecture instantanée de la présence du service</h2>
              <p className="chef-hero-description">
                Repérez rapidement les journées complètes, les pointages en cours et les absences
                de votre équipe avant d'entrer dans le détail.
              </p>
            </div>
            <div className="chef-hero-kpis">
              <article className="chef-kpi-card">
                <span>Équipe suivie</span>
                <strong>{stats.total}</strong>
                <p>Collaborateurs inclus dans votre scope chef.</p>
              </article>
              <article className="chef-kpi-card">
                <span>Complet</span>
                <strong>{stats.complete}</strong>
                <p>Journées clôturées avec entrée et sortie.</p>
              </article>
              <article className="chef-kpi-card">
                <span>En cours</span>
                <strong>{stats.inProgress}</strong>
                <p>Pointages encore ouverts aujourd&apos;hui.</p>
              </article>
              <article className="chef-kpi-card">
                <span>Absents</span>
                <strong>{stats.absent}</strong>
                <p>Employés sans présence sur la journée.</p>
              </article>
              <article className="chef-kpi-card">
                <span>Non justifiées</span>
                <strong style={{ color: stats.unjustified > 0 ? "#ef4444" : undefined }}>
                  {stats.unjustified}
                </strong>
                <p>Absences sans justificatif sur la période.</p>
              </article>
            </div>
          </section>

          <div className="chef-metrics-grid">
            <article className="chef-metric-card">
              <span>Actualisation</span>
              <strong>{loading ? "..." : "OK"}</strong>
              <p>Les données de présence peuvent être rechargées à tout moment.</p>
            </article>
            <article className="chef-metric-card">
              <span>Controle</span>
              <strong>{stats.complete + stats.inProgress}</strong>
              <p>Employés avec une présence déjà constatée sur la journée.</p>
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
                <h2>Suivi de présence équipe</h2>
                <p>Données remontées par le backend pour la période en cours.</p>
              </div>
            </div>

            <div className="activite-table-scroll">
              <table className="activite-table">
              <thead>
                <tr>
                  <th>Employé</th>
                  <th>Dernière absence</th>
                  <th>Entrée</th>
                  <th>Sortie</th>
                  <th>Journées complètes</th>
                  <th>Sorties manquantes</th>
                  <th>Absences</th>
                  <th>Abs. non justifiées</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="8">Chargement de la présence équipe...</td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan="8">Aucune donnée de présence disponible.</td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <div>{row.full_name}</div>
                        <div style={{ fontSize: 12, color: "#94a3b8" }}>{row.email}</div>
                      </td>
                      <td>
                        {row.last_absence ? (
                          <span style={{ background: "#fee2e2", color: "#991b1b", border: "1px solid #fca5a5", borderRadius: 20, padding: "2px 10px", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" }}>
                            {formatDate(row.last_absence)}
                          </span>
                        ) : (
                          <span style={{ color: "#94a3b8", fontSize: 12 }}>-</span>
                        )}
                      </td>
                      <td>{formatTime(row.today_check_in)}</td>
                      <td>{formatTime(row.today_check_out)}</td>
                      <td>{row.complete_days}</td>
                      <td>{row.pending_checkout_days}</td>
                      <td>{row.absent_days}</td>
                      <td>
                        {row.unjustified_absences > 0 ? (
                          <span className="badge badge-refuse">{row.unjustified_absences}</span>
                        ) : (
                          <span className="badge badge-termine">0</span>
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
    </div>
  );
}
