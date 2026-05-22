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

function getTaskStatus(task) {
  if (task.status === "DONE") return "Terminée";
  if (task.status === "SUBMITTED") return "Travail remis";
  if (task.status === "REVISION") return "Correction demandée";
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
  if (label === "Travail remis") return "badge-soumis";
  if (label === "Correction demandée") return "badge-attente";
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
  const [isNavOpen, setIsNavOpen] = usePersistentNavState();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [feedback, setFeedback] = useState("");
  const [submissionTask, setSubmissionTask] = useState(null);
  const [submissionNote, setSubmissionNote] = useState("");
  const [submissionFile, setSubmissionFile] = useState(null);

  const fieldStyle = {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 12,
    border: `1px solid ${dark ? "#334155" : "#cbd5e1"}`,
    background: dark ? "#0f172a" : "#ffffff",
    color: dark ? "#e2e8f0" : "#0f172a",
    boxSizing: "border-box",
  };

  const fetchTasks = async () => {
    try {
      setLoading(true);
      setErrorMessage("");
      const response = await axios.get("/api/tasks/me/");
      setTasks(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error("Erreur chargement tâches :", error);
      setTasks([]);
      setErrorMessage("Impossible de charger vos tâches.");
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
    const submitted = tasks.filter((task) => task.status === "SUBMITTED").length;
    const revision = tasks.filter((task) => task.status === "REVISION").length;
    return {
      total,
      completed,
      submitted,
      revision,
    };
  }, [tasks]);

  const openSubmission = (task) => {
    setSubmissionTask(task);
    setSubmissionNote(task.submission_note || "");
    setSubmissionFile(null);
    setFeedback("");
    setErrorMessage("");
  };

  const submitWork = async (event) => {
    event.preventDefault();
    if (!submissionTask) return;

    try {
      setActionId(submissionTask.id);
      setErrorMessage("");
      setFeedback("");

      const payload = new FormData();
      payload.append("submission_note", submissionNote.trim());
      if (submissionFile) {
        payload.append("submission_attachment", submissionFile);
      }

      await axios.post(`/api/tasks/${submissionTask.id}/submit/`, payload, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setFeedback("Travail remis au chef avec succès.");
      setSubmissionTask(null);
      setSubmissionNote("");
      setSubmissionFile(null);
      await fetchTasks();
    } catch (error) {
      console.error("Erreur remise travail :", error);
      setErrorMessage(error?.response?.data?.detail || "Impossible de remettre le travail.");
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
              <h1 className="monprofile">Mes tâches</h1>
              <p className="morinfo">
                Consultez les tâches reçues, remettez votre travail et suivez les retours du chef.
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

        <div className="main-page-stack">
          <section className="main-hero">
            <div className="main-hero-copy">
              <span className="main-eyebrow">Espace principal</span>
              <h2 className="main-hero-title">Suivi propre de vos tâches reçues</h2>
              <p className="main-hero-description">
                Consultez les missions affectées par votre chef, envoyez vos remises et gardez une lecture claire des retours.
              </p>
            </div>
            <div className="main-hero-kpis">
              <article className="main-kpi-card">
                <span>Total</span>
                <strong>{stats.total}</strong>
                <p>Tâches actuellement visibles dans votre espace.</p>
              </article>
              <article className="main-kpi-card">
                <span>Terminées</span>
                <strong>{stats.completed}</strong>
                <p>Tâches déjà validées comme terminées.</p>
              </article>
              <article className="main-kpi-card">
                <span>Travaux remis</span>
                <strong>{stats.submitted}</strong>
                <p>Remises envoyées au chef pour validation.</p>
              </article>
              <article className="main-kpi-card">
                <span>Corrections</span>
                <strong>{stats.revision}</strong>
                <p>Tâches repassées en correction.</p>
              </article>
            </div>
          </section>

          <div className="main-metrics-grid">
            <article className="main-metric-card">
              <span>Mise à jour</span>
              <p style={{ marginTop: 12 }}>
                <button className="modifier" onClick={fetchTasks} type="button">
                  Actualiser
                </button>
              </p>
            </article>
          </div>

          {(feedback || errorMessage) && (
            <div className={`page-feedback ${errorMessage ? "error" : ""}`}>
              {errorMessage || feedback}
            </div>
          )}

          <section className="main-panel">
            <div className="main-panel-head">
              <div>
                <h2>Tâches reçues</h2>
                <p>Tâches affectées par votre chef et disponibles depuis le backend.</p>
              </div>
              <div className="main-action-pill">Exécution</div>
            </div>

            <div className="activite-table-scroll">
              <table className="activite-table">
              <thead>
                <tr>
                  <th>Tâche</th>
                  <th>Chef</th>
                  <th>Échéance</th>
                  <th>Statut</th>
                  <th>Remise</th>
                  <th>Retour chef</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="7">Chargement des tâches...</td>
                  </tr>
                ) : tasks.length === 0 ? (
                  <tr>
                    <td colSpan="7">Aucune tâche assignée pour le moment.</td>
                  </tr>
                ) : (
                  tasks.map((task) => {
                    const statusLabel = getTaskStatus(task);
                    const canSubmit = Boolean(task.can_submit);

                    return (
                      <tr key={task.id}>
                        <td>
                          <div>{task.title}</div>
                          <div style={{ fontSize: 12, color: "#94a3b8" }}>{task.description || "-"}</div>
                        </td>
                        <td>{getAssignerName(task.assigned_by)}</td>
                        <td>{formatDate(task.due_date)}</td>
                        <td>
                          <span className={`badge ${getStatusClass(statusLabel)}`}>{statusLabel}</span>
                        </td>
                        <td>
                          <div>{task.submission_note || "-"}</div>
                          <div style={{ fontSize: 12, color: "#94a3b8" }}>{formatDateTime(task.submitted_at)}</div>
                        </td>
                        <td>
                          {task.review_comment ? (
                            <span style={{ fontSize: 13, color: dark ? "#e2e8f0" : "#374151" }}>{task.review_comment}</span>
                          ) : (
                            <span style={{ fontSize: 12, color: "#94a3b8" }}>—</span>
                          )}
                        </td>
                        <td>
                          {task.status === "DONE" ? (
                            <span className="badge badge-termine">Validée</span>
                          ) : canSubmit ? (
                            <button
                              className="modifier"
                              disabled={actionId === task.id}
                              onClick={() => openSubmission(task)}
                              type="button"
                            >
                              {task.status === "REVISION" ? "Corriger" : "Remettre"}
                            </button>
                          ) : (
                            <span className="badge badge-soumis">En attente de revue</span>
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

      {submissionTask && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 500,
            padding: 16,
          }}
          onClick={() => setSubmissionTask(null)}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            style={{
              width: "min(92vw, 720px)",
              borderRadius: 18,
              padding: 24,
              background: dark ? "#111827" : "#ffffff",
              color: dark ? "#e2e8f0" : "#111827",
              boxShadow: "0 18px 48px rgba(15, 23, 42, 0.28)",
              border: `1px solid ${dark ? "#334155" : "#e2e8f0"}`,
            }}
          >
            <h2 style={{ marginTop: 0 }}>Remettre le travail</h2>
            <p style={{ color: dark ? "#94a3b8" : "#64748b" }}>
              Ajoutez un commentaire ou un fichier pour informer votre chef de service.
            </p>

            <form onSubmit={submitWork}>
              <div style={{ marginTop: 16 }}>
                <p className="desc">Commentaire</p>
                <textarea
                  rows={4}
                  value={submissionNote}
                  onChange={(event) => setSubmissionNote(event.target.value)}
                  placeholder="Décrivez ce qui a été fait ou les points à vérifier."
                  style={{
                    ...fieldStyle,
                    resize: "vertical",
                  }}
                />
              </div>

              {submissionTask.requires_submission_file ? (
                <div style={{ marginTop: 16 }}>
                  <p className="desc">Fichier de remise</p>
                  <input
                    type="file"
                    onChange={(event) => setSubmissionFile(event.target.files?.[0] || null)}
                  />
                  <p className="desc" style={{ marginTop: 8 }}>
                    Cette tâche exige un fichier de retour.
                  </p>
                </div>
              ) : (
                <div style={{ marginTop: 16 }}>
                  <p className="desc">Fichier de remise</p>
                  <p style={{ color: dark ? "#94a3b8" : "#64748b" }}>
                    Aucun fichier n'est obligatoire pour cette tâche. Vous pouvez envoyer la remise sans pièce jointe.
                  </p>
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 20 }}>
                <button className="mode" onClick={() => setSubmissionTask(null)} type="button">
                  Annuler
                </button>
                <button className="modifier" disabled={actionId === submissionTask.id} type="submit">
                  {actionId === submissionTask.id ? "Envoi..." : "Envoyer au chef"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
