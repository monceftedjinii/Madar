import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import Navbar from "../components/Navbar";
import useDarkModePreference from "../hooks/useDarkModePreference";
import "../styles/profile.css";

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("fr-FR");
}

function getTaskStatus(task) {
  if (task.status === "DONE") return "Terminée";
  if (task.due_date) {
    const dueDate = new Date(`${task.due_date}T00:00:00`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (!Number.isNaN(dueDate.getTime()) && dueDate < today) {
      return "En retard";
    }
  }
  return "En cours";
}

function getStatusClass(label) {
  if (label === "Terminée") return "badge-termine";
  if (label === "En retard") return "badge-refuse";
  return "badge-attente";
}

function getAssignerName(assignedBy) {
  if (!assignedBy) return "Chef de service";
  const fullName = `${assignedBy.first_name || ""} ${assignedBy.last_name || ""}`.trim();
  return fullName || assignedBy.email || "Chef de service";
}

export default function Tasks() {
  const [dark, setDark] = useDarkModePreference();
  const [isNavOpen, setIsNavOpen] = useState(true);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState(null);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const response = await axios.get("/api/tasks/me/");
      setTasks(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error("Erreur chargement taches:", error);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const stats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter((task) => task.status === "DONE").length;
    const late = tasks.filter((task) => getTaskStatus(task) === "En retard").length;
    return {
      total,
      completed,
      inProgress: Math.max(total - completed - late, 0),
      late,
    };
  }, [tasks]);

  const markDone = async (taskId) => {
    try {
      setActionId(taskId);
      await axios.patch(`/api/tasks/${taskId}/done/`);
      await fetchTasks();
    } catch (error) {
      console.error("Erreur cloture tache:", error);
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
        <div className="profile-naaav">
          <div className="yasar">
            <h1 className="monprofile">Mes taches</h1>
            <p className="morinfo">
              Taches recues depuis votre chef de service et suivi de leur avancement.
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

        <div className="infopro-infoper">
          <section className="info-per">
            <div className="top">
              <h2 className="title">Vue rapide</h2>
              <p className="desc">Etat de vos taches recues.</p>
            </div>
            <div>
              <p className="desc">Total</p>
              <h3>{stats.total}</h3>
            </div>
            <div>
              <p className="desc">Terminees</p>
              <h3>{stats.completed}</h3>
            </div>
            <div>
              <p className="desc">En retard</p>
              <h3>{stats.late}</h3>
            </div>
          </section>

          <section className="info-pro">
            <div className="top">
              <h2 className="title">Execution</h2>
              <p className="desc">Suivez les taches encore ouvertes.</p>
            </div>
            <div>
              <p className="desc">A traiter</p>
              <h3>{stats.inProgress}</h3>
            </div>
            <div>
              <p className="desc">Mise a jour</p>
              <button className="modifier" onClick={fetchTasks} type="button">
                Actualiser
              </button>
            </div>
          </section>
        </div>

        <section className="activite-recente" style={{ width: "96%", margin: "24px auto" }}>
          <div className="activite-top">
            <h2 className="activite-title">Taches recues</h2>
            <p className="activite-subtitle">
              Taches affectees par votre chef et disponibles depuis le backend.
            </p>
          </div>

          <div className="activite-table-scroll">
            <table className="activite-table">
              <thead>
                <tr>
                  <th>Tache</th>
                  <th>Description</th>
                  <th>Chef</th>
                  <th>Echeance</th>
                  <th>Statut</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="6">Chargement des taches...</td>
                  </tr>
                ) : tasks.length === 0 ? (
                  <tr>
                    <td colSpan="6">Aucune tache assignee pour le moment.</td>
                  </tr>
                ) : (
                  tasks.map((task) => {
                    const statusLabel = getTaskStatus(task);
                    const isDone = task.status === "DONE";

                    return (
                      <tr key={task.id}>
                        <td>{task.title}</td>
                        <td>{task.description || "-"}</td>
                        <td>{getAssignerName(task.assigned_by)}</td>
                        <td>{formatDate(task.due_date)}</td>
                        <td>
                          <span className={getStatusClass(statusLabel)}>{statusLabel}</span>
                        </td>
                        <td>
                          {isDone ? (
                            <span style={{ color: "#15803d", fontWeight: 700 }}>Cloturee</span>
                          ) : (
                            <button
                              className="modifier"
                              disabled={actionId === task.id}
                              onClick={() => markDone(task.id)}
                              type="button"
                            >
                              {actionId === task.id ? "Traitement..." : "Marquer terminee"}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
