import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import Navbar from "../components/Navbar";
import useDarkModePreference from "../hooks/useDarkModePreference";
import usePersistentNavState from "../hooks/usePersistentNavState";
import "../styles/profile.css";

const initialForm = {
  title: "",
  description: "",
  dueDate: "",
  assignedTo: "",
  requiresSubmissionFile: false,
};

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

function getStatusLabel(task) {
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

export default function ChefTasks() {
  const [dark, setDark] = useDarkModePreference();
  const [isNavOpen, setIsNavOpen] = usePersistentNavState();
  const [employees, setEmployees] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [reviewTask, setReviewTask] = useState(null);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewAction, setReviewAction] = useState("approve");
  const [actionId, setActionId] = useState(null);

  const fieldStyle = {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 12,
    border: `1px solid ${dark ? "#334155" : "#cbd5e1"}`,
    background: dark ? "#0f172a" : "#ffffff",
    color: dark ? "#e2e8f0" : "#0f172a",
    boxSizing: "border-box",
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setErrorMessage("");
      const [employeesResponse, tasksResponse] = await Promise.all([
        axios.get("/api/employees/", { params: { scope: "team" } }),
        axios.get("/api/tasks/chef/"),
      ]);

      const employeesData = Array.isArray(employeesResponse.data) ? employeesResponse.data : [];
      const tasksData = Array.isArray(tasksResponse.data) ? tasksResponse.data : [];

      setEmployees(employeesData);
      setTasks(tasksData);
      setForm((previous) => ({
        ...previous,
        assignedTo: previous.assignedTo || String(employeesData[0]?.id || ""),
      }));
    } catch (requestError) {
      console.error("Erreur chargement taches chef:", requestError);
      setEmployees([]);
      setTasks([]);
      setErrorMessage("Impossible de charger les donnees du chef.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const stats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter((task) => task.status === "DONE").length;
    const submitted = tasks.filter((task) => task.status === "SUBMITTED").length;
    const revision = tasks.filter((task) => task.status === "REVISION").length;
    const late = tasks.filter((task) => getStatusLabel(task) === "En retard").length;
    return {
      total,
      completed,
      submitted,
      revision,
      late,
    };
  }, [tasks]);

  const resetMessages = () => {
    setFeedback("");
    setErrorMessage("");
  };

  const resetForm = (nextAssignedTo = "") => {
    setEditingTaskId(null);
    setForm({
      ...initialForm,
      assignedTo: nextAssignedTo || String(employees[0]?.id || ""),
    });
  };

  const onChange = (event) => {
    const { name, value } = event.target;
    resetMessages();
    setForm((previous) => ({ ...previous, [name]: value }));
  };

  const openEditTask = (task) => {
    setEditingTaskId(task.id);
    setForm({
      title: task.title || "",
      description: task.description || "",
      dueDate: task.due_date || "",
      assignedTo: String(task.employee?.id || ""),
      requiresSubmissionFile: !!task.requires_submission_file,
    });
    resetMessages();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const submitTask = async (event) => {
    event.preventDefault();
    if (!form.title.trim() || !form.assignedTo) {
      setFeedback("");
      setErrorMessage("Le titre et l'employe cible sont obligatoires.");
      return;
    }

    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      due_date: form.dueDate || null,
      assigned_to: Number(form.assignedTo),
      requires_submission_file: form.requiresSubmissionFile,
    };

    try {
      setSubmitting(true);
      resetMessages();

      if (editingTaskId) {
        await axios.patch(`/api/tasks/${editingTaskId}/update/`, payload);
        setFeedback("Tache modifiee avec succes.");
      } else {
        await axios.post("/api/tasks/", payload);
        setFeedback("Tache assignee avec succes.");
      }

      resetForm(String(employees[0]?.id || ""));
      await fetchData();
    } catch (requestError) {
      console.error("Erreur sauvegarde tache:", requestError);
      setErrorMessage(
        requestError?.response?.data?.detail || "Impossible d'enregistrer la tache.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const deleteTask = async (task) => {
    const shouldDelete = window.confirm(
      `Supprimer la tache "${task.title}" ?`,
    );
    if (!shouldDelete) return;

    try {
      setActionId(task.id);
      resetMessages();
      await axios.delete(`/api/tasks/${task.id}/delete/`);
      if (editingTaskId === task.id) {
        resetForm(String(employees[0]?.id || ""));
      }
      setFeedback("Tache supprimee avec succes.");
      await fetchData();
    } catch (requestError) {
      console.error("Erreur suppression tache:", requestError);
      setErrorMessage(
        requestError?.response?.data?.detail || "Impossible de supprimer cette tache.",
      );
    } finally {
      setActionId(null);
    }
  };

  const openReview = (task) => {
    setReviewTask(task);
    setReviewComment(task.review_comment || "");
    setReviewAction("approve");
    resetMessages();
  };

  const submitReview = async (event) => {
    event.preventDefault();
    if (!reviewTask) return;

    try {
      setActionId(reviewTask.id);
      resetMessages();
      await axios.post(`/api/tasks/${reviewTask.id}/review/`, {
        action: reviewAction,
        comment: reviewComment.trim(),
      });
      setFeedback(
        reviewAction === "approve"
          ? "Travail valide avec succes."
          : "Retour de correction envoye a l'employe.",
      );
      setReviewTask(null);
      setReviewComment("");
      await fetchData();
    } catch (requestError) {
      console.error("Erreur revue tache:", requestError);
      setErrorMessage(
        requestError?.response?.data?.detail || "Impossible de traiter cette remise.",
      );
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
              <h1 className="monprofile">Taches equipe</h1>
              <p className="morinfo">
                Assignez des taches, ajustez les demandes et validez les livrables.
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
              <p className="desc">Suivi global des taches distribuees.</p>
            </div>
            <div>
              <p className="desc">Total</p>
              <h3>{stats.total}</h3>
            </div>
            <div>
              <p className="desc">Travaux remis</p>
              <h3>{stats.submitted}</h3>
            </div>
            <div>
              <p className="desc">Corrections</p>
              <h3>{stats.revision}</h3>
            </div>
          </section>

          <section className="info-pro">
            <div className="top">
              <h2 className="title">Execution</h2>
              <p className="desc">Validation des travaux et controle des delais.</p>
            </div>
            <div>
              <p className="desc">Terminees</p>
              <h3>{stats.completed}</h3>
            </div>
            <div>
              <p className="desc">En retard</p>
              <h3>{stats.late}</h3>
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button className="modifier" onClick={fetchData} type="button">
                Actualiser
              </button>
              {editingTaskId && (
                <button className="mode" onClick={() => resetForm()} type="button">
                  Annuler edition
                </button>
              )}
            </div>
          </section>
        </div>

        {(feedback || errorMessage) && (
          <div className={`page-feedback ${errorMessage ? "error" : ""}`}>
            {errorMessage || feedback}
          </div>
        )}

        <section className="quelques-infos" style={{ width: "96%", marginTop: 0 }}>
          <form
            onSubmit={submitTask}
            style={{
              width: "100%",
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 14,
            }}
          >
            <div>
              <p className="desc">Titre</p>
              <input
                name="title"
                value={form.title}
                onChange={onChange}
                placeholder="Ex: Mettre a jour le rapport"
                style={fieldStyle}
              />
            </div>
            <div>
              <p className="desc">Employe</p>
              <select
                name="assignedTo"
                value={form.assignedTo}
                onChange={onChange}
                style={fieldStyle}
              >
                <option value="">Choisir un employe</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {`${employee.first_name || ""} ${employee.last_name || ""}`.trim() || employee.email}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <p className="desc">Echeance</p>
              <input
                type="date"
                name="dueDate"
                value={form.dueDate}
                onChange={onChange}
                style={fieldStyle}
              />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <p className="desc">Description</p>
              <textarea
                name="description"
                value={form.description}
                onChange={onChange}
                rows={3}
                placeholder="Precisez ce que l'employe doit faire."
                style={{
                  ...fieldStyle,
                  resize: "vertical",
                }}
              />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  fontWeight: 600,
                  color: dark ? "#e2e8f0" : "#0f172a",
                }}
              >
                <input
                  type="checkbox"
                  checked={form.requiresSubmissionFile}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      requiresSubmissionFile: event.target.checked,
                    }))
                  }
                />
                Cette tache demande un fichier de remise
              </label>
              <p className="desc" style={{ marginTop: 8 }}>
                Cochez cette option seulement si l'employe doit renvoyer un document, une capture ou un livrable.
              </p>
            </div>
            <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "flex-end", gap: 10 }}>
              {editingTaskId && (
                <button className="mode" onClick={() => resetForm()} type="button">
                  Annuler
                </button>
              )}
              <button className="modifier" disabled={submitting} type="submit">
                {submitting
                  ? "Enregistrement..."
                  : editingTaskId
                    ? "Mettre a jour la tache"
                    : "Assigner la tache"}
              </button>
            </div>
          </form>
        </section>

        <section className="activite-recente" style={{ width: "96%", margin: "24px auto" }}>
          <div className="activite-top">
            <h2 className="activite-title">Historique des taches d'equipe</h2>
            <p className="activite-subtitle">
              Taches envoyees par le chef et suivies depuis le backend.
            </p>
          </div>

          <div className="activite-table-scroll">
            <table className="activite-table">
              <thead>
                <tr>
                  <th>Tache</th>
                  <th>Employe</th>
                  <th>Echeance</th>
                  <th>Statut</th>
                  <th>Remise employe</th>
                  <th>Fichier</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="7">Chargement des taches...</td>
                  </tr>
                ) : tasks.length === 0 ? (
                  <tr>
                    <td colSpan="7">Aucune tache d'equipe pour le moment.</td>
                  </tr>
                ) : (
                  tasks.map((task) => {
                    const employeeName =
                      `${task.employee?.first_name || ""} ${task.employee?.last_name || ""}`.trim() ||
                      task.employee?.email ||
                      "-";
                    const statusLabel = getStatusLabel(task);

                    return (
                      <tr key={task.id}>
                        <td>
                          <div>{task.title || "-"}</div>
                          <div style={{ fontSize: 12, color: "#94a3b8" }}>{task.description || "-"}</div>
                        </td>
                        <td>{employeeName}</td>
                        <td>{formatDate(task.due_date)}</td>
                        <td>
                          <span className={`badge ${getStatusClass(statusLabel)}`}>
                            {statusLabel}
                          </span>
                        </td>
                        <td>
                          <div>{task.submission_note || "-"}</div>
                          <div style={{ fontSize: 12, color: "#94a3b8" }}>{formatDateTime(task.submitted_at)}</div>
                          {task.review_comment && (
                            <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 6 }}>
                              Retour: {task.review_comment}
                            </div>
                          )}
                        </td>
                        <td>
                          {task.submission_attachment ? (
                            <a
                              href={task.submission_attachment}
                              target="_blank"
                              rel="noreferrer"
                              style={{ color: "#2563eb", fontWeight: 600 }}
                            >
                              Ouvrir
                            </a>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td>
                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                            {task.can_review ? (
                              <button className="modifier" onClick={() => openReview(task)} type="button">
                                Traiter
                              </button>
                            ) : task.status === "DONE" ? (
                              <span className="badge badge-termine">Validee</span>
                            ) : (
                              <span className="badge badge-genere">Suivi en cours</span>
                            )}

                            {task.status !== "DONE" && (
                              <>
                                <button className="mode" onClick={() => openEditTask(task)} type="button">
                                  Modifier
                                </button>
                                <button
                                  className="mode"
                                  disabled={actionId === task.id}
                                  onClick={() => deleteTask(task)}
                                  type="button"
                                >
                                  {actionId === task.id ? "Suppression..." : "Supprimer"}
                                </button>
                              </>
                            )}
                          </div>
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

      {reviewTask && (
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
          onClick={() => setReviewTask(null)}
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
            <h2 style={{ marginTop: 0 }}>Traiter la remise</h2>
            <p style={{ color: dark ? "#94a3b8" : "#64748b" }}>
              Validez le travail ou renvoyez-le en correction avec un commentaire.
            </p>

            <form onSubmit={submitReview}>
              <div style={{ marginTop: 16 }}>
                <p className="desc">Decision</p>
                <select
                  value={reviewAction}
                  onChange={(event) => setReviewAction(event.target.value)}
                  style={fieldStyle}
                >
                  <option value="approve">Valider</option>
                  <option value="reject">Demander une correction</option>
                </select>
              </div>

              <div style={{ marginTop: 16 }}>
                <p className="desc">Commentaire chef</p>
                <textarea
                  rows={4}
                  value={reviewComment}
                  onChange={(event) => setReviewComment(event.target.value)}
                  placeholder="Expliquez la validation ou les corrections attendues."
                  style={{
                    ...fieldStyle,
                    resize: "vertical",
                  }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 20 }}>
                <button className="mode" onClick={() => setReviewTask(null)} type="button">
                  Annuler
                </button>
                <button className="modifier" disabled={actionId === reviewTask.id} type="submit">
                  {actionId === reviewTask.id ? "Traitement..." : "Confirmer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
