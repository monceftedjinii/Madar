import NotificationBell from "../components/NotificationBell";
import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import Navbar from "../components/Navbar";
import useDarkModePreference from "../hooks/useDarkModePreference";
import usePersistentNavState from "../hooks/usePersistentNavState";
import "../styles/profile.css";
import "../styles/main-space.css";

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("fr-FR");
}

function getBadgeClass(label) {
  if (label === "Excellent") return "badge-termine";
  if (label === "Bon") return "badge-genere";
  if (label === "Moyen") return "badge-attente";
  return "badge-refuse";
}

export default function Evaluations() {
  const [dark, setDark] = useDarkModePreference();
  const [isNavOpen, setIsNavOpen] = usePersistentNavState();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const fetchEvaluations = async () => {
    try {
      setLoading(true);
      setErrorMessage("");
      const response = await axios.get("/api/evaluations/me/");
      setItems(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error("Erreur chargement évaluations :", error);
      setItems([]);
      setErrorMessage("Impossible de charger vos évaluations.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvaluations();
  }, []);

  const stats = useMemo(() => {
    const total = items.length;
    const average = total
      ? (items.reduce((sum, item) => sum + Number(item.global_score || 0), 0) / total).toFixed(2)
      : "0.00";
    return { total, average };
  }, [items]);

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
              <h1 className="monprofile">Mes évaluations</h1>
              <p className="morinfo">Consultez vos notes, recommandations et commentaires d'évaluation.</p>
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

        <div className="main-page-stack">
          <section className="main-hero">
            <div className="main-hero-copy">
              <span className="main-eyebrow">Espace principal</span>
              <h2 className="main-hero-title">Suivi lisible de vos évaluations</h2>
              <p className="main-hero-description">
                Consultez vos notes, vos recommandations et l'historique des campagnes
                d'évaluation dans une vue plus claire.
              </p>
            </div>
            <div className="main-hero-kpis">
              <article className="main-kpi-card">
                <span>Nombre</span>
                <strong>{stats.total}</strong>
                <p>Évaluations disponibles dans votre historique.</p>
              </article>
              <article className="main-kpi-card">
                <span>Moyenne</span>
                <strong>{stats.average}</strong>
                <p>Note globale moyenne sur l'ensemble des campagnes.</p>
              </article>
            </div>
          </section>

          <div className="main-metrics-grid">
            <article className="main-metric-card">
              <span>Action rapide</span>
              <p style={{ marginTop: 12 }}>
                <button className="modifier" onClick={fetchEvaluations} type="button">Actualiser</button>
              </p>
            </article>
          </div>

          {errorMessage && <div className="page-feedback error">{errorMessage}</div>}

          <section className="main-panel">
            <div className="main-panel-head">
              <div>
                <h2>Évaluations enregistrées</h2>
                <p>Données remontées par le module d'évaluation.</p>
              </div>
              <div className="main-action-pill">Historique</div>
            </div>
            <div className="activite-table-scroll">
              <table className="activite-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Période</th>
                  <th>Évaluateur</th>
                  <th>Note globale</th>
                  <th>Recommandation</th>
                  <th>Commentaire</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="6">Chargement des évaluations...</td></tr>
                ) : items.length === 0 ? (
                  <tr><td colSpan="6">Aucune évaluation disponible pour le moment.</td></tr>
                ) : (
                  items.map((item) => (
                    <tr key={item.id}>
                      <td>{formatDate(item.evaluation_date)}</td>
                      <td>{item.period}</td>
                      <td>{item.evaluator?.full_name || "-"}</td>
                      <td>{Number(item.global_score).toFixed(2)}/10</td>
                      <td><span className={`badge ${getBadgeClass(item.recommendation)}`}>{item.recommendation}</span></td>
                      <td>{item.overall_comment || "-"}</td>
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
