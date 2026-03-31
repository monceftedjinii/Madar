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
      console.error("Erreur chargement evaluations:", error);
      setItems([]);
      setErrorMessage("Impossible de charger vos evaluations.");
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
              <h1 className="monprofile">Mes evaluations</h1>
              <p className="morinfo">Consultez vos notes, recommandations et commentaires d'evaluation.</p>
            </div>
            <div className="yamin">
              <button className="nav-toggle" onClick={() => setIsNavOpen((prev) => !prev)} type="button">
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
              <h2 className="title">Historique</h2>
              <p className="desc">Synthese de vos evaluations disponibles.</p>
            </div>
            <div><p className="desc">Nombre</p><h3>{stats.total}</h3></div>
            <div><p className="desc">Moyenne</p><h3>{stats.average}/5</h3></div>
          </section>

          <section className="info-pro">
            <div className="top">
              <h2 className="title">Actions</h2>
              <p className="desc">Rechargez les evaluations depuis le backend.</p>
            </div>
            <div><button className="modifier" onClick={fetchEvaluations} type="button">Actualiser</button></div>
          </section>
        </div>

        {errorMessage && (
          <div className="page-feedback error">
            {errorMessage}
          </div>
        )}

        <section className="activite-recente" style={{ width: "96%", margin: "24px auto" }}>
          <div className="activite-top">
            <h2 className="activite-title">Evaluations enregistrees</h2>
            <p className="activite-subtitle">Donnees remontees par le module d'evaluation.</p>
          </div>
          <div className="activite-table-scroll">
            <table className="activite-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Periode</th>
                  <th>Evaluateur</th>
                  <th>Note globale</th>
                  <th>Recommendation</th>
                  <th>Commentaire</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="6">Chargement des evaluations...</td></tr>
                ) : items.length === 0 ? (
                  <tr><td colSpan="6">Aucune evaluation disponible pour le moment.</td></tr>
                ) : (
                  items.map((item) => (
                    <tr key={item.id}>
                      <td>{formatDate(item.evaluation_date)}</td>
                      <td>{item.period}</td>
                      <td>{item.evaluator?.full_name || "-"}</td>
                      <td>{Number(item.global_score).toFixed(2)}/5</td>
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
  );
}
