import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import "../styles/home.css";
import logo from "../assets/Logo_madar_holding.png";
import useDarkModePreference from "../hooks/useDarkModePreference";
import { isAuthenticated } from "../app/auth";

const formatNumber = (value) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "--";
  }

  return new Intl.NumberFormat("fr-FR").format(Number(value));
};

const formatDateTime = (value) => {
  if (!value) return "-";

  return new Date(value).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getWidgetUnitLabel = (widget) => {
  if (widget?.kpi?.unit === "employees") return "employés";
  return widget?.kpi?.unit || "";
};

export default function Home() {
  const [dark] = useDarkModePreference();
  const loggedIn = isAuthenticated();
  const [dashboard, setDashboard] = useState(null);
  const [announcements, setAnnouncements] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(loggedIn);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loggedIn) return;

    const loadDashboard = async () => {
      try {
        setLoading(true);
        setError("");
        const [dashboardRes, announcementsRes, notificationsRes] =
          await Promise.all([
            axios.get("/api/dashboard/"),
            axios.get("/api/announcements/"),
            axios.get("/api/notifications/"),
          ]);

        setDashboard(dashboardRes.data);
        setAnnouncements(announcementsRes.data?.announcements || []);
        setNotifications(notificationsRes.data || []);
      } catch (requestError) {
        console.error("Erreur chargement dashboard:", requestError);
        setError(
          requestError?.response?.data?.detail ||
            requestError?.response?.data?.error ||
            "Impossible de charger le dashboard depuis le backend.",
        );
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, [loggedIn]);

  const unreadNotifications = useMemo(
    () => notifications.filter((item) => !item.is_read),
    [notifications],
  );

  if (!loggedIn) {
    return (
      <main className={`home-simple${dark ? " dark" : ""}`}>
        <div className="home-card">
          <img src={logo} alt="Madar Holding" className="home-logo" />
          <h1>Plateforme de gestion Madar</h1>
          <p>
            Une solution simple pour suivre vos ressources, organiser vos projets
            et gagner du temps au quotidien.
          </p>
          <Link className="home-button" to="/login">
            Aller à la connexion
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className={`home-dashboard${dark ? " dark" : ""}`}>
      <section className="dashboard-hero">
        <div>
          <p className="dashboard-kicker">Connecté au backend Django</p>
          <h1>Tableau de bord RH</h1>
          <p className="dashboard-subtitle">
            Vue centralisée des indicateurs, annonces internes et notifications
            utilisateur.
          </p>
        </div>
        <div className="dashboard-meta">
          <div>
            <span>Dernière mise à jour</span>
            <strong>{formatDateTime(dashboard?.last_updated)}</strong>
          </div>
          <div>
            <span>Notifications non lues</span>
            <strong>{unreadNotifications.length}</strong>
          </div>
        </div>
      </section>

      {error && <div className="dashboard-alert error">{error}</div>}
      {loading && <div className="dashboard-alert">Chargement du dashboard...</div>}

      {!loading && !error && (
        <>
          <section className="dashboard-grid">
            {(dashboard?.widgets || []).map((widget) => (
              <article key={widget.type} className="dashboard-card">
                <div className="dashboard-card-head">
                  <span>{widget.title}</span>
                  <strong>{widget.chart?.type || "widget"}</strong>
                </div>
                {widget.error ? (
                  <p className="dashboard-widget-error">{widget.error}</p>
                ) : (
                  <>
                    <h2>
                      {formatNumber(widget.kpi?.value)}{" "}
                      <small>{getWidgetUnitLabel(widget)}</small>
                    </h2>
                    <p>
                      Tendance: <strong>{widget.kpi?.trend || "stable"}</strong>
                    </p>
                    <div className="dashboard-bars">
                      {(widget.chart?.values || []).slice(0, 6).map((value, index) => (
                        <div key={`${widget.type}-${index}`} className="dashboard-bar-row">
                          <span>{widget.chart?.labels?.[index] || `Valeur ${index + 1}`}</span>
                          <div>
                            <i
                              style={{
                                width: `${Math.max(10, Math.min(Number(value) || 0, 100))}%`,
                              }}
                            />
                          </div>
                          <strong>{formatNumber(value)}</strong>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </article>
            ))}
          </section>

          <section className="dashboard-secondary">
            <article className="dashboard-panel">
              <div className="dashboard-panel-head">
                <h3>Annonces internes</h3>
                <span>{announcements.length}</span>
              </div>
              {announcements.length === 0 ? (
                <p className="dashboard-empty">Aucune annonce disponible.</p>
              ) : (
                announcements.slice(0, 5).map((announcement) => (
                  <div key={announcement.id} className="dashboard-feed-item">
                    <strong>{announcement.title}</strong>
                    <p>{announcement.message}</p>
                    <span>{formatDateTime(announcement.created_at)}</span>
                  </div>
                ))
              )}
            </article>

            <article className="dashboard-panel">
              <div className="dashboard-panel-head">
                <h3>Notifications</h3>
                <span>{notifications.length}</span>
              </div>
              {notifications.length === 0 ? (
                <p className="dashboard-empty">Aucune notification reçue.</p>
              ) : (
                notifications.slice(0, 6).map((notification) => (
                  <div key={notification.id} className="dashboard-feed-item">
                    <strong>{notification.title}</strong>
                    <p>{notification.message}</p>
                    <span>
                      {notification.is_read ? "Lu" : "Non lu"} •{" "}
                      {formatDateTime(notification.created_at)}
                    </span>
                  </div>
                ))
              )}
            </article>

            <article className="dashboard-panel">
              <div className="dashboard-panel-head">
                <h3>Accès rapides</h3>
                <span>Modules</span>
              </div>
              <div className="dashboard-links">
                <Link to="/profile">Mon profil</Link>
                <Link to="/conge">Congés</Link>
                <Link to="/attendance">Présence</Link>
                <Link to="/messagerie">Messagerie</Link>
              </div>
            </article>
          </section>
        </>
      )}
    </main>
  );
}
