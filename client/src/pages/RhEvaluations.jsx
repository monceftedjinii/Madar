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

export default function RhEvaluations() {
  const [dark, setDark] = useDarkModePreference();
  const [isNavOpen, setIsNavOpen] = usePersistentNavState();
  const [role, setRole] = useState("");
  const [evaluations, setEvaluations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const fetchEvaluations = async () => {
    try {
      setLoading(true);
      setErrorMessage("");
      const [meResponse, response] = await Promise.all([
        axios.get("/api/whoami/"),
        axios.get("/api/evaluations/rh/"),
      ]);
      setRole(meResponse.data?.role || "");
      setEvaluations(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error("Erreur chargement evaluations RH:", error);
      setEvaluations([]);
      setErrorMessage("Impossible de charger les evaluations RH.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvaluations();
  }, []);

  const stats = useMemo(() => {
    const excellent = evaluations.filter((item) => item.recommendation === "Excellent").length;
    const good = evaluations.filter((item) => item.recommendation === "Bon").length;
    const average = evaluations.filter((item) => item.recommendation === "Moyen").length;
    return { total: evaluations.length, excellent, good, average };
  }, [evaluations]);

  const isGrh = role === "GRH";

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
              <h1 className="monprofile">{isGrh ? "Evaluations globales" : "Evaluations RH"}</h1>
              <p className="morinfo">
                {isGrh
                  ? "Suivez les evaluations employees sur l'ensemble du perimetre GRH."
                  : "Suivez l'historique des evaluations employees cote RH."}
              </p>
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
              <h2 className="title">{isGrh ? "Synthese globale" : "Synthese"}</h2>
              <p className="desc">
                {isGrh
                  ? "Vision globale des evaluations sur le perimetre GRH."
                  : "Vision globale des evaluations cote RH."}
              </p>
            </div>
            <div><p className="desc">Total</p><h3>{stats.total}</h3></div>
            <div><p className="desc">Excellent</p><h3>{stats.excellent}</h3></div>
            <div><p className="desc">Bon</p><h3>{stats.good}</h3></div>
            <div><p className="desc">Moyen</p><h3>{stats.average}</h3></div>
          </section>

          <section className="info-pro">
            <div className="top">
              <h2 className="title">Actions</h2>
              <p className="desc">
                {isGrh
                  ? "Rechargez les evaluations depuis le backend global GRH."
                  : "Rechargez les evaluations depuis le backend RH."}
              </p>
            </div>
            <div>
              <p className="desc">Actualisation</p>
              <button className="modifier" onClick={fetchEvaluations} type="button">Actualiser</button>
            </div>
          </section>
        </div>

        {errorMessage ? <div className="page-feedback error">{errorMessage}</div> : null}

        <section className="activite-recente" style={{ width: "96%", margin: "24px auto" }}>
          <div className="activite-top">
            <h2 className="activite-title">{isGrh ? "Historique global des evaluations" : "Historique des evaluations"}</h2>
            <p className="activite-subtitle">
              {isGrh
                ? "Evaluation, score global et recommandation sur l'ensemble du perimetre GRH."
                : "Evaluation, score global et recommandation RH."}
            </p>
          </div>

          <div className="activite-table-scroll">
            <table className="activite-table">
              <thead>
                <tr>
                  <th>Employe</th>
                  <th>Service</th>
                  <th>Evaluateur</th>
                  <th>Periode</th>
                  <th>Note</th>
                  <th>Recommendation</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="6">Chargement des evaluations...</td></tr>
                ) : evaluations.length === 0 ? (
                  <tr><td colSpan="6">Aucune evaluation RH disponible.</td></tr>
                ) : (
                  evaluations.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <div>{item.employee?.full_name || "-"}</div>
                        <div style={{ fontSize: 12, color: "#94a3b8" }}>{item.employee?.email || ""}</div>
                      </td>
                      <td>{item.employee?.service || "-"}</td>
                      <td>{item.evaluator?.full_name || "-"}</td>
                      <td>{item.period} • {formatDate(item.evaluation_date)}</td>
                      <td><strong>{item.global_score}/5</strong></td>
                      <td><span className="badge badge-genere">{item.recommendation}</span></td>
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
