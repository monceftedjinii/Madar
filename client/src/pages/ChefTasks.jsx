import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import Navbar from "../components/Navbar";
import useDarkModePreference from "../hooks/useDarkModePreference";
import "../styles/profile.css";

const initialForm = {
  title: "",
  description: "",
  dueDate: "",
  assignedTo: "",
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
  if (label === "En retard") return "badge-refuse";
  return "badge-attente";
}

export default function ChefTasks() {
  const [dark, setDark] = useDarkModePreference();
  const [isNavOpen, setIsNavOpen] = useState(true);
  const [employees, setEmployees] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const fetchData = async () => {
    try {
      setLoading(true);
      setErrorMessage("");
      const [employeesResponse, tasksResponse] = await Promise.all([
        axios.get("/api/employees/"),
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
    const late = tasks.filter((task) => getStatusLabel(task) === "En retard").length;
    return {
      total,
      completed,
      inProgress: Math.max(total - completed - late, 0),
      late,
    };
  }, [tasks]);

  const onChange = (event) => {
    const { name, value } = event.target;
    setFeedback("");
    setErrorMessage("");
    setForm((previous) => ({ ...previous, [name]: value }));
  };

  const submitTask = async (event) => {
    event.preventDefault();
    if (!form.title.trim() || !form.assignedTo) {
      setFeedback("");
      setErrorMessage("Le titre et l'employe cible sont obligatoires.");
      return;
    }

    try {
      setSubmitting(true);
      setFeedback("");
      setErrorMessage("");
      await axios.post("/api/tasks/", {
        title: form.title.trim(),
        description: form.description.trim(),
        due_date: form.dueDate || null,
        assigned_to: Number(form.assignedTo),
      });
      setFeedback("Tache assignee avec succes.");
      setForm({
        ...initialForm,
        assignedTo: String(employees[0]?.id || ""),
      });
      await fetchData();
    } catch (requestError) {
      console.error("Erreur creation tache:", requestError);
      setErrorMessage(
        requestError?.response?.data?.detail || "Impossible d'assigner la tache.",
      );
    } finally {
      setSubmitting(false);
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
                Assignez des taches aux employes de votre service et suivez leur avancement.
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
              <p className="desc">Terminees</p>
              <h3>{stats.completed}</h3>
            </div>
            <div>
              <p className="desc">En cours</p>
              <h3>{stats.inProgress}</h3>
            </div>
            <div>
              <p className="desc">En retard</p>
              <h3>{stats.late}</h3>
            </div>
          </section>

          <section className="info-pro">
            <div className="top">
              <h2 className="title">Affectation</h2>
              <p className="desc">Nombre d'employes disponibles pour recevoir une tache.</p>
            </div>
            <div>
              <p className="desc">Employes du service</p>
              <h3>{employees.length}</h3>
            </div>
            <div>
              <p className="desc">Mise a jour</p>
              <button className="modifier" onClick={fetchData} type="button">
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
                style={{ width: "100%", padding: "10px 12px", borderRadius: 12, border: "1px solid #cbd5e1" }}
              />
            </div>
            <div>
              <p className="desc">Employe</p>
              <select
                name="assignedTo"
                value={form.assignedTo}
                onChange={onChange}
                style={{ width: "100%", padding: "10px 12px", borderRadius: 12, border: "1px solid #cbd5e1" }}
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
                style={{ width: "100%", padding: "10px 12px", borderRadius: 12, border: "1px solid #cbd5e1" }}
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
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: "1px solid #cbd5e1",
                  resize: "vertical",
                }}
              />
            </div>
            <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "flex-end" }}>
              <button className="modifier" disabled={submitting} type="submit">
                {submitting ? "Envoi..." : "Assigner la tache"}
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
                  <th>Description</th>
                  <th>Echeance</th>
                  <th>Creee le</th>
                  <th>Terminee le</th>
                  <th>Statut</th>
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
                        <td>{task.title || "-"}</td>
                        <td>{employeeName}</td>
                        <td>{task.description || "-"}</td>
                        <td>{formatDate(task.due_date)}</td>
                        <td>{formatDateTime(task.created_at)}</td>
                        <td>{formatDateTime(task.completed_at)}</td>
                        <td>
                          <span className={`badge ${getStatusClass(statusLabel)}`}>
                            {statusLabel}
                          </span>
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
