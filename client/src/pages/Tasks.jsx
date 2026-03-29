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
  if (task.status === "DONE") return "Terminee";
  if (task.status === "SUBMITTED") return "Travail remis";
  if (task.status === "REVISION") return "Correction demandee";
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
  if (label === "Terminee") return "badge-termine";
  if (label === "Travail remis") return "badge-genere";
  if (label === "Correction demandee") return "badge-attente";
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
  const [errorMessage, setErrorMessage] = useState("");
  const [feedback, setFeedback] = useState("");
  const [submissionTask, setSubmissionTask] = useState(null);
  const [submissionNote, setSubmissionNote] = useState("");
  const [submissionFile, setSubmissionFile] = useState(null);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      setErrorMessage("");
      const response = await axios.get("/api/tasks/me/");
      setTasks(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error("Erreur chargement taches:", error);
      setTasks([]);
      setErrorMessage("Impossible de charger vos taches.");
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
      setFeedback("Travail remis au chef avec succes.");
      setSubmissionTask(null);
      setSubmissionNote("");
      setSubmissionFile(null);
      await fetchTasks();
    } catch (error) {
      console.error("Erreur remise travail:", error);
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
              <h1 className="monprofile">Mes taches</h1>
              <p className="morinfo">
                Consultez les taches recues, remettez votre travail et suivez les retours du chef.
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
              <p className="desc">Travaux remis</p>
              <h3>{stats.submitted}</h3>
            </div>
          </section>

          <section className="info-pro">
            <div className="top">
              <h2 className="title">Suivi</h2>
              <p className="desc">Mettez a jour votre chef des travaux termines.</p>
            </div>
            <div>
              <p className="desc">Corrections demandees</p>
              <h3>{stats.revision}</h3>
            </div>
            <div>
              <p className="desc">Mise a jour</p>
              <button className="modifier" onClick={fetchTasks} type="button">
                Actualiser
              </button>
            </div>
          </section>
        </div>

        {(feedback || errorMessage) && (
          <div
            style={{
              width: "96%",
              margin: "0 auto 16px",
              padding: "12px 16px",
              borderRadius: 12,
              background: errorMessage ? "#ffe6e6" : "#e6f7e6",
              color: errorMessage ? "#b91c1c" : "#166534",
              border: `1px solid ${errorMessage ? "#fecaca" : "#bbf7d0"}`,
            }}
          >
            {errorMessage || feedback}
          </div>
        )}

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
                  <th>Chef</th>
                  <th>Echeance</th>
                  <th>Statut</th>
                  <th>Remise</th>
                  <th>Retour chef</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="7">Chargement des taches...</td>
                  </tr>
                ) : tasks.length === 0 ? (
                  <tr>
                    <td colSpan="7">Aucune tache assignee pour le moment.</td>
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
                        <td>{task.review_comment || "-"}</td>
                        <td>
                          {task.status === "DONE" ? (
                            <span className="badge badge-termine">Validee</span>
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
                            <span className="badge badge-genere">En attente de revue</span>
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
                  placeholder="Decrivez ce qui a ete fait ou les points a verifier."
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 12,
                    border: "1px solid #cbd5e1",
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
                    style={{ width: "100%" }}
                  />
                  <p className="desc" style={{ marginTop: 8 }}>
                    Cette tache exige un fichier de retour.
                  </p>
                </div>
              ) : (
                <div style={{ marginTop: 16 }}>
                  <p className="desc">Fichier de remise</p>
                  <p style={{ color: dark ? "#94a3b8" : "#64748b" }}>
                    Aucun fichier n'est obligatoire pour cette tache. Vous pouvez envoyer la remise sans piece jointe.
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
