import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import Navbar from "../../components/Navbar";
import useDarkModePreference from "../../hooks/useDarkModePreference";
import "../../styles/profile.css";

const emptyDashboard = {
  profile: {
    fullName: "",
    role: "",
    department: "",
    email: "",
    avatar: "https://cdn-icons-png.flaticon.com/512/149/149071.png",
    attendanceRate: 0,
    overallProgress: 0,
    finalScore: 0,
    topSkill: "",
    statusLabel: "A ameliorer",
  },
  header: {
    department: "Non renseigne",
    monthLabel: "",
  },
  stats: [],
  charts: {
    weeklyPerformance: [],
    monthlyProgress: [],
    taskBreakdown: { completed: 0, pending: 0, late: 0 },
    skills: {
      punctuality: 0,
      productivity: 0,
      teamwork: 0,
      discipline: 0,
      qualityOfWork: 0,
    },
  },
  scoreInsights: {
    achievement: "",
    improvement: "",
  },
  tasks: [],
  panels: {
    planning: [],
    notifications: [],
    hrRequests: [],
    quickMessages: [],
  },
};

const scoreLabelMap = {
  Excellent: "Excellent",
  Bon: "Bon",
  Moyen: "Moyen",
  "A ameliorer": "A ameliorer",
  "À améliorer": "A ameliorer",
};

function formatDate(value) {
  if (!value || value === "-") return "-";
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("fr-FR");
}

function getStatusBadgeClass(status) {
  if (status === "Terminée") return "badge-termine";
  if (status === "En retard") return "badge-refuse";
  return "badge-attente";
}

function getPlanningDotClass(item) {
  if (item?.title?.toLowerCase().includes("pointage")) {
    return "dashboard-planning-dot work";
  }
  if (item?.subtitle?.toLowerCase().includes("priorite haute")) {
    return "dashboard-planning-dot deadline";
  }
  if (item?.title?.toLowerCase().includes("presence")) {
    return "dashboard-planning-dot work";
  }
  return "dashboard-planning-dot task";
}

export default function Dashboard() {
  const [dark, setDark] = useDarkModePreference();
  const [isNavOpen, setIsNavOpen] = useState(true);
  const [dashboardData, setDashboardData] = useState(emptyDashboard);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError("");
        const response = await axios.get("/api/dashboard/employee/");
        setDashboardData({ ...emptyDashboard, ...response.data });
      } catch (requestError) {
        console.error("Erreur chargement dashboard employe:", requestError);
        setError(
          requestError?.response?.data?.detail ||
            requestError?.response?.data?.error ||
            "Impossible de charger le dashboard depuis le backend.",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const scoreRingStyle = useMemo(() => {
    const ratio = Math.max(0, Math.min(100, (dashboardData.profile.finalScore / 20) * 100));
    return {
      background: `conic-gradient(#2563eb 0 ${ratio}%, #dbe5f2 ${ratio}% 100%)`,
    };
  }, [dashboardData.profile.finalScore]);

  const scoreLabel = scoreLabelMap[dashboardData.profile.statusLabel] || "A ameliorer";

  return (
    <div
      className={`profile-page${dark ? " dark" : ""} ${isNavOpen ? "nav-open" : "nav-closed"}`}
    >
      <div className={`navbar-profile-page ${isNavOpen ? "open" : "closed"}`}>
        <Navbar
          fullName={dashboardData.profile.fullName}
          post={dashboardData.profile.role}
          image={dashboardData.profile.avatar}
          email={dashboardData.profile.email}
        />
      </div>

      {isNavOpen && (
        <div
          className="profile-overlay"
          onClick={() => setIsNavOpen(false)}
          aria-hidden="true"
        />
      )}

      <div className="profile-content">
        <div style={{ borderBottom: "1px solid rgba(0, 0, 0, 0.1)" }}>
          <div className="profile-naaav">
            <div className="yasar">
              <h3 className="monprofile">Dashboard</h3>
              <p className="morinfo">
                Tableau de bord employe relie au backend Django
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
                {dark ? " mode clair" : " mode sombre"}
              </button>
            </div>
          </div>
        </div>

        <div className="profile-infos dashboard-shell">
          <div className="quelques-infos">
            <div className="gauche">
              <img
                src={dashboardData.profile.avatar}
                alt="Profile"
                className="profile-pic"
              />
              <div className="infooos">
                <div className="nom-status">
                  <h3>{dashboardData.profile.fullName || "Employe"}</h3>
                  <div className="status">{scoreLabel}</div>
                </div>
                <p>
                  Poste : {dashboardData.profile.role || "-"} • Departement :{" "}
                  {dashboardData.profile.department || "-"}
                </p>
                <div>
                  <div>{dashboardData.profile.email || "-"}</div>
                  <div>{dashboardData.header.monthLabel || "-"}</div>
                  <div>Top skill : {dashboardData.profile.topSkill || "-"}</div>
                </div>
              </div>
            </div>
          </div>

          {error && <div className="dashboard-inline-alert">{error}</div>}

          <section className="dashboard-hero-saas">
            <div className="dashboard-hero-copy">
              <div className="dashboard-chip">Connecte au backend</div>
              <h1>Suivi personnel, performance et activite RH</h1>
              <p>
                Cette page utilise directement les donnees du backend pour vos
                taches, votre presence, vos demandes RH, vos notifications et
                votre score mensuel.
              </p>
              <div className="dashboard-hero-actions">
                <div className="dashboard-soft-stat">
                  <span>Mois</span>
                  <strong>{dashboardData.header.monthLabel || "-"}</strong>
                </div>
                <div className="dashboard-soft-stat">
                  <span>Departement</span>
                  <strong>{dashboardData.header.department || "-"}</strong>
                </div>
                <div className="dashboard-soft-stat">
                  <span>Taches</span>
                  <strong>{dashboardData.tasks.length}</strong>
                </div>
              </div>
            </div>

            <div className="dashboard-score-card">
              <div className="dashboard-score-ring modern" style={scoreRingStyle}>
                <div className="dashboard-score-ring-inner">
                  <strong>{dashboardData.profile.finalScore.toFixed(1)}</strong>
                  <span>/20</span>
                </div>
              </div>
              <div className="dashboard-score-text">
                <h4>Note mensuelle</h4>
                <p>{scoreLabel}</p>
              </div>
            </div>
          </section>

          <section className="dashboard-kpi-grid modern">
            {dashboardData.stats.map((item) => (
              <article key={item.id} className="dashboard-kpi-card modern">
                <span>{item.label}</span>
                <strong>{item.value}</strong>
                <small>{item.helper}</small>
              </article>
            ))}
          </section>

          <section className="dashboard-main-grid">
            <div className="dashboard-main-column">
              <article className="dashboard-panel modern">
                <div className="dashboard-panel-header">
                  <div>
                    <h3>Progression hebdomadaire</h3>
                    <p>Evolution de vos performances sur les semaines du mois.</p>
                  </div>
                </div>
                <div className="dashboard-progress-chart">
                  {(dashboardData.charts.weeklyPerformance || []).map((value, index) => (
                    <div key={`weekly-${index}`} className="dashboard-progress-row">
                      <div className="dashboard-progress-head">
                        <span>Semaine {index + 1}</span>
                        <span>{value}%</span>
                      </div>
                      <div className="dashboard-progress-track">
                        <div
                          className="dashboard-progress-fill"
                          style={{ width: `${value}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </article>

              <article className="dashboard-panel modern">
                <div className="dashboard-panel-header">
                  <div>
                    <h3>Taches assignees</h3>
                    <p>Ancienne vue dashboard, maintenant alimentee par le backend.</p>
                  </div>
                </div>
                <div className="dashboard-task-list">
                  {loading ? (
                    <p className="dashboard-empty-text">Chargement des taches...</p>
                  ) : dashboardData.tasks.length === 0 ? (
                    <p className="dashboard-empty-text">Aucune tache disponible.</p>
                  ) : (
                    dashboardData.tasks.slice(0, 5).map((task) => (
                      <div key={task.id} className="dashboard-task-item">
                        <div className="dashboard-task-top">
                          <div>
                            <h4>{task.name}</h4>
                            <p>Echeance : {formatDate(task.deadline)}</p>
                          </div>
                          <span className={`badge ${getStatusBadgeClass(task.status)}`}>
                            {task.status}
                          </span>
                        </div>
                        <div className="dashboard-task-meta">
                          <span>Priorite : {task.priority}</span>
                          <span>Progression : {task.progress}%</span>
                        </div>
                        <div className="dashboard-progress-track slim">
                          <div
                            className="dashboard-progress-fill"
                            style={{ width: `${task.progress}%` }}
                          />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </article>

              <article className="dashboard-panel modern">
                <div className="dashboard-panel-header">
                  <div>
                    <h3>Repartition des taches</h3>
                    <p>Synthese backend des taches terminees, en attente et en retard.</p>
                  </div>
                </div>
                <div className="dashboard-mini-stats">
                  <div>
                    <span>Terminees</span>
                    <strong>{dashboardData.charts.taskBreakdown.completed}</strong>
                  </div>
                  <div>
                    <span>En attente</span>
                    <strong>{dashboardData.charts.taskBreakdown.pending}</strong>
                  </div>
                  <div>
                    <span>En retard</span>
                    <strong>{dashboardData.charts.taskBreakdown.late}</strong>
                  </div>
                </div>
              </article>
            </div>

            <div className="dashboard-side-column">
              <article className="dashboard-panel modern">
                <div className="dashboard-panel-header">
                  <div>
                    <h3>Planning</h3>
                    <p>Elements du jour remontes par le backend.</p>
                  </div>
                </div>
                <div className="dashboard-planning-list">
                  {dashboardData.panels.planning.length === 0 ? (
                    <p className="dashboard-empty-text">Aucun planning disponible.</p>
                  ) : (
                    dashboardData.panels.planning.map((item) => (
                      <div key={item.id} className="dashboard-planning-item">
                        <i className={getPlanningDotClass(item)} />
                        <div>
                          <strong>{item.title}</strong>
                          <p>{item.subtitle}</p>
                        </div>
                        <span>{item.time}</span>
                      </div>
                    ))
                  )}
                </div>
              </article>

              <article className="dashboard-panel modern">
                <div className="dashboard-panel-header">
                  <div>
                    <h3>Demandes RH</h3>
                    <p>Suivi direct des demandes de conge cote backend.</p>
                  </div>
                </div>
                <div className="dashboard-rh-list">
                  {dashboardData.panels.hrRequests.length === 0 ? (
                    <p className="dashboard-empty-text">Aucune demande RH.</p>
                  ) : (
                    dashboardData.panels.hrRequests.map((item) => (
                      <div key={item.id} className="dashboard-rh-item">
                        <i className="dashboard-planning-dot hr" />
                        <div>
                          <strong>{item.label}</strong>
                          <p>Suivi personnel</p>
                        </div>
                        <span className="badge badge-attente">{item.status}</span>
                      </div>
                    ))
                  )}
                </div>
              </article>

              <article className="dashboard-panel modern">
                <div className="dashboard-panel-header">
                  <div>
                    <h3>Notifications et messages</h3>
                    <p>Resume backend de votre communication interne.</p>
                  </div>
                </div>
                <div className="dashboard-feed-list compact">
                  {dashboardData.panels.notifications.map((item) => (
                    <div key={item.id} className="dashboard-feed-item modern">
                      <strong>{item.title}</strong>
                      <p>{item.message}</p>
                      <span>{item.level}</span>
                    </div>
                  ))}
                  {dashboardData.panels.quickMessages.map((item) => (
                    <div key={item.id} className="dashboard-message-item">
                      <strong>{item.sender}</strong>
                      <p>{item.subject}</p>
                    </div>
                  ))}
                  {dashboardData.panels.notifications.length === 0 &&
                    dashboardData.panels.quickMessages.length === 0 && (
                      <p className="dashboard-empty-text">
                        Aucune notification ni message.
                      </p>
                    )}
                </div>
              </article>

              <article className="dashboard-panel modern">
                <div className="dashboard-panel-header">
                  <div>
                    <h3>Note et axes d'amelioration</h3>
                    <p>Commentaires calcules cote backend.</p>
                  </div>
                </div>
                <div className="dashboard-feed-list">
                  <div className="dashboard-feed-item modern">
                    <strong>Point fort</strong>
                    <p>{dashboardData.scoreInsights.achievement || "-"}</p>
                  </div>
                  <div className="dashboard-feed-item modern">
                    <strong>Point a ameliorer</strong>
                    <p>{dashboardData.scoreInsights.improvement || "-"}</p>
                  </div>
                </div>
              </article>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
