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

function objectiveBadge(status) {
  if (status === "DONE") return "badge-termine";
  if (status === "IN_PROGRESS") return "badge-genere";
  if (status === "BLOCKED") return "badge-refuse";
  return "badge-attente";
}

export default function Gpec() {
  const [dark, setDark] = useDarkModePreference();
  const [isNavOpen, setIsNavOpen] = usePersistentNavState();
  const [data, setData] = useState({ employee: null, competencies: [], objectives: [], plans: [] });
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [feedback, setFeedback] = useState("");
  const [actionId, setActionId] = useState(null);

  const fetchGpec = async () => {
    try {
      setLoading(true);
      setErrorMessage("");
      const response = await axios.get("/api/gpec/me/");
      setData(response.data || { employee: null, competencies: [], objectives: [], plans: [] });
    } catch (error) {
      console.error("Erreur chargement GPEC:", error);
      setErrorMessage("Impossible de charger votre espace GPEC.");
      setData({ employee: null, competencies: [], objectives: [], plans: [] });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGpec();
  }, []);

  const stats = useMemo(() => {
    const gaps = data.competencies.filter((item) => item.gap > 0).length;
    const inProgress = data.objectives.filter((item) => item.status === "IN_PROGRESS").length;
    const activePlans = data.plans.filter((item) => item.status !== "COMPLETED").length;
    return {
      competencies: data.competencies.length,
      gaps,
      inProgress,
      activePlans,
    };
  }, [data]);

  const updateObjective = async (objective, nextProgress) => {
    try {
      setActionId(objective.id);
      setFeedback("");
      setErrorMessage("");
      const status = Number(nextProgress) >= 100 ? "DONE" : Number(nextProgress) > 0 ? "IN_PROGRESS" : objective.status;
      await axios.patch(`/api/gpec/objectives/${objective.id}/progress/`, {
        progress: Number(nextProgress),
        status,
      });
      setFeedback("Progression mise a jour.");
      await fetchGpec();
    } catch (error) {
      console.error("Erreur mise a jour objectif:", error);
      setErrorMessage(error?.response?.data?.detail || "Impossible de mettre a jour cet objectif.");
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
        <div className={`sticky top-0 z-40 backdrop-blur ${dark ? "border-b border-slate-800 bg-slate-950/90" : "border-b border-slate-200/80 bg-white/90"}`}>
          <div className="profile-naaav">
            <div className="yasar">
              <h1 className="monprofile">Mon espace GPEC</h1>
              <p className="morinfo">Consultez vos competences, objectifs et plans de developpement.</p>
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

        <div className="main-page-stack">
          <section className="main-hero">
            <div className="main-hero-copy">
              <span className="main-eyebrow">Espace principal</span>
              <h2 className="main-hero-title">Vision personnelle de votre progression GPEC</h2>
              <p className="main-hero-description">
                Suivez vos competences, vos objectifs et les plans de developpement proposes dans une interface plus nette.
              </p>
            </div>
            <div className="main-hero-kpis">
              <article className="main-kpi-card">
                <span>Competences</span>
                <strong>{stats.competencies}</strong>
                <p>Competences actuellement suivies dans votre profil.</p>
              </article>
              <article className="main-kpi-card">
                <span>Ecarts</span>
                <strong>{stats.gaps}</strong>
                <p>Competences dont le niveau cible n'est pas encore atteint.</p>
              </article>
              <article className="main-kpi-card">
                <span>Objectifs</span>
                <strong>{stats.inProgress}</strong>
                <p>Objectifs actuellement en progression.</p>
              </article>
              <article className="main-kpi-card">
                <span>Plans ouverts</span>
                <strong>{stats.activePlans}</strong>
                <p>Plans de developpement encore actifs.</p>
              </article>
            </div>
          </section>

          <div className="main-metrics-grid">
            <article className="main-metric-card">
              <span>Action rapide</span>
              <p style={{ marginTop: 12 }}>
                <button className="modifier" onClick={fetchGpec} type="button">Actualiser</button>
              </p>
            </article>
          </div>

          {(feedback || errorMessage) && (
            <div className={`page-feedback ${errorMessage ? "error" : ""}`}>{errorMessage || feedback}</div>
          )}

          <section className="main-panel">
            <div className="main-panel-head">
              <div>
                <h2>Competences</h2>
                <p>Niveaux actuels et cibles definis dans le plan GPEC.</p>
              </div>
              <div className="main-action-pill">Competences</div>
            </div>
            <div className="activite-table-scroll">
              <table className="activite-table">
              <thead>
                <tr>
                  <th>Competence</th>
                  <th>Categorie</th>
                  <th>Niveau actuel</th>
                  <th>Niveau cible</th>
                  <th>Ecart</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="5">Chargement des competences...</td></tr>
                ) : data.competencies.length === 0 ? (
                  <tr><td colSpan="5">Aucune competence renseignee pour le moment.</td></tr>
                ) : (
                  data.competencies.map((item) => (
                    <tr key={item.id}>
                      <td>{item.competency_name}</td>
                      <td>{item.category}</td>
                      <td>{item.current_level}/5</td>
                      <td>{item.target_level}/5</td>
                      <td><span className={`badge ${item.gap > 0 ? "badge-attente" : "badge-termine"}`}>{item.gap}</span></td>
                    </tr>
                  ))
                )}
              </tbody>
              </table>
            </div>
          </section>

          <section className="main-panel">
            <div className="main-panel-head">
              <div>
                <h2>Objectifs</h2>
                <p>Suivez les objectifs qui structurent votre progression.</p>
              </div>
              <div className="main-action-pill">Objectifs</div>
            </div>
            <div className="activite-table-scroll">
              <table className="activite-table">
              <thead>
                <tr>
                  <th>Objectif</th>
                  <th>Echeance</th>
                  <th>Statut</th>
                  <th>Progression</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="5">Chargement des objectifs...</td></tr>
                ) : data.objectives.length === 0 ? (
                  <tr><td colSpan="5">Aucun objectif defini pour le moment.</td></tr>
                ) : (
                  data.objectives.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <div>{item.title}</div>
                        <div style={{ fontSize: 12, color: "#94a3b8" }}>{item.description || "-"}</div>
                      </td>
                      <td>{formatDate(item.due_date)}</td>
                      <td><span className={`badge ${objectiveBadge(item.status)}`}>{item.status_label}</span></td>
                      <td style={{ minWidth: 170 }}>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={item.progress}
                          onChange={(event) => updateObjective(item, event.target.value)}
                          disabled={actionId === item.id}
                          style={{ width: "100%" }}
                        />
                        <div style={{ fontSize: 12, color: dark ? "#cbd5e1" : "#475569" }}>{item.progress}%</div>
                      </td>
                      <td>
                        <button
                          className="modifier"
                          disabled={actionId === item.id}
                          onClick={() => updateObjective(item, Math.min(item.progress + 10, 100))}
                          type="button"
                        >
                          +10%
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              </table>
            </div>
          </section>

          <section className="main-panel">
            <div className="main-panel-head">
              <div>
                <h2>Plans de developpement</h2>
                <p>Actions recommandees pour accelerer votre progression.</p>
              </div>
              <div className="main-action-pill">Developpement</div>
            </div>
            <div className="activite-table-scroll">
              <table className="activite-table">
              <thead>
                <tr>
                  <th>Plan</th>
                  <th>Actions</th>
                  <th>Cible</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="4">Chargement des plans...</td></tr>
                ) : data.plans.length === 0 ? (
                  <tr><td colSpan="4">Aucun plan de developpement disponible.</td></tr>
                ) : (
                  data.plans.map((item) => (
                    <tr key={item.id}>
                      <td>{item.title}</td>
                      <td>{item.actions}</td>
                      <td>{formatDate(item.target_date)}</td>
                      <td><span className={`badge ${item.status === "COMPLETED" ? "badge-termine" : item.status === "ONGOING" ? "badge-genere" : "badge-attente"}`}>{item.status_label}</span></td>
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
