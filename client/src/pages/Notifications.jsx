import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import Navbar from "../components/Navbar";
import useDarkModePreference from "../hooks/useDarkModePreference";
import "../styles/profile.css";

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function Notifications() {
  const [dark, setDark] = useDarkModePreference();
  const [isNavOpen, setIsNavOpen] = useState(true);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState(null);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await axios.get("/api/notifications/");
      const data = Array.isArray(response.data) ? response.data : [];
      setItems(data);
      window.dispatchEvent(new Event("notifications-updated"));
    } catch (error) {
      console.error("Erreur chargement notifications:", error);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const unreadCount = useMemo(
    () => items.filter((item) => !item.is_read).length,
    [items],
  );

  const markAsRead = async (notificationId, link) => {
    try {
      setActionId(notificationId);
      await axios.post(`/api/notifications/${notificationId}/read/`);
      setItems((previous) =>
        previous.map((item) =>
          item.id === notificationId ? { ...item, is_read: true } : item,
        ),
      );
      window.dispatchEvent(new Event("notifications-updated"));
      if (link) {
        window.location.assign(link);
      }
    } catch (error) {
      console.error("Erreur mise a jour notification:", error);
    } finally {
      setActionId(null);
    }
  };

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
              <h1 className="monprofile">Notifications</h1>
              <p className="morinfo">
                Consultez vos alertes et les informations envoyees par la plateforme.
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
              <p className="desc">Statut actuel de vos notifications.</p>
            </div>
            <div>
              <p className="desc">Total</p>
              <h3>{items.length}</h3>
            </div>
            <div>
              <p className="desc">Non lues</p>
              <h3>{unreadCount}</h3>
            </div>
            <div>
              <p className="desc">Derniere actualisation</p>
              <h3>{loading ? "Chargement..." : "A jour"}</h3>
            </div>
          </section>

          <section className="info-pro">
            <div className="top">
              <h2 className="title">Actions</h2>
              <p className="desc">Mettez rapidement vos notifications a jour.</p>
            </div>
            <div>
              <p className="desc">Recharger</p>
              <button className="modifier" onClick={fetchNotifications} type="button">
                Actualiser
              </button>
            </div>
            <div>
              <p className="desc">Etat</p>
              <h3>{unreadCount > 0 ? "Attention requise" : "Tout est lu"}</h3>
            </div>
          </section>
        </div>

        <section className="activite-recente" style={{ width: "96%", margin: "24px auto" }}>
          <div className="activite-top">
            <h2 className="activite-title">Liste des notifications</h2>
            <p className="activite-subtitle">
              Notifications personnelles recues depuis le backend.
            </p>
          </div>

          <div className="activite-table-scroll">
            <table className="activite-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Titre</th>
                  <th>Message</th>
                  <th>Statut</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="5">Chargement des notifications...</td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan="5">Aucune notification disponible.</td>
                  </tr>
                ) : (
                  items.map((item) => (
                    <tr key={item.id}>
                      <td>{formatDateTime(item.created_at)}</td>
                      <td>{item.title || "Notification"}</td>
                      <td>{item.message || "-"}</td>
                      <td>
                        <span
                          className={`badge ${item.is_read ? "badge-termine" : "badge-attente"}`}
                        >
                          {item.is_read ? "Lue" : "Non lue"}
                        </span>
                      </td>
                      <td>
                        {item.is_read ? (
                          <span className="badge badge-genere">Deja traitee</span>
                        ) : (
                          <button
                            className="modifier"
                            disabled={actionId === item.id}
                            onClick={() => markAsRead(item.id, item.link)}
                            type="button"
                          >
                            {actionId === item.id ? "Traitement..." : "Marquer lue"}
                          </button>
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
  );
}
