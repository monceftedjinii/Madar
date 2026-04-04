import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import Navbar from "../components/Navbar";
import useDarkModePreference from "../hooks/useDarkModePreference";
import usePersistentNavState from "../hooks/usePersistentNavState";
import "../styles/profile.css";

const initialCompetencyForm = {
  name: "",
  category: "TECHNICAL",
  description: "",
  target_level: 3,
};

const initialEmployeeCompetencyForm = {
  employee_id: "",
  competency_id: "",
  current_level: 1,
  target_level: 3,
  notes: "",
};

const initialObjectiveForm = {
  employee_id: "",
  title: "",
  description: "",
  due_date: "",
};

const initialPlanForm = {
  employee_id: "",
  title: "",
  actions: "",
  target_date: "",
};

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("fr-FR");
}

export default function RhGpec() {
  const [dark, setDark] = useDarkModePreference();
  const [isNavOpen, setIsNavOpen] = usePersistentNavState();
  const [role, setRole] = useState("");
  const [data, setData] = useState({
    employees: [],
    catalog: [],
    employee_competencies: [],
    objectives: [],
    plans: [],
  });
  const [competencyForm, setCompetencyForm] = useState(initialCompetencyForm);
  const [employeeCompetencyForm, setEmployeeCompetencyForm] = useState(initialEmployeeCompetencyForm);
  const [objectiveForm, setObjectiveForm] = useState(initialObjectiveForm);
  const [planForm, setPlanForm] = useState(initialPlanForm);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState("");
  const [feedback, setFeedback] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const fieldStyle = {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 12,
    border: `1px solid ${dark ? "#334155" : "#cbd5e1"}`,
    background: dark ? "#0f172a" : "#ffffff",
    color: dark ? "#e2e8f0" : "#0f172a",
    boxSizing: "border-box",
  };

  const fetchGpec = async () => {
    try {
      setLoading(true);
      setErrorMessage("");
      const [meResponse, response] = await Promise.all([
        axios.get("/api/whoami/"),
        axios.get("/api/gpec/rh/"),
      ]);
      setRole(meResponse.data?.role || "");
      setData({
        employees: Array.isArray(response.data?.employees) ? response.data.employees : [],
        catalog: Array.isArray(response.data?.catalog) ? response.data.catalog : [],
        employee_competencies: Array.isArray(response.data?.employee_competencies) ? response.data.employee_competencies : [],
        objectives: Array.isArray(response.data?.objectives) ? response.data.objectives : [],
        plans: Array.isArray(response.data?.plans) ? response.data.plans : [],
      });
    } catch (error) {
      console.error("Erreur chargement GPEC RH:", error);
      setData({ employees: [], catalog: [], employee_competencies: [], objectives: [], plans: [] });
      setErrorMessage("Impossible de charger le pilotage GPEC.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGpec();
  }, []);

  const isGrh = role === "GRH";

  const stats = useMemo(() => {
    const objectivesOpen = data.objectives.filter((item) => item.status !== "DONE").length;
    const plansActive = data.plans.filter((item) => item.status !== "COMPLETED").length;
    return {
      employees: data.employees.length,
      catalog: data.catalog.length,
      assignments: data.employee_competencies.length,
      objectivesOpen,
      plansActive,
    };
  }, [data]);

  const submitCatalog = async (event) => {
    event.preventDefault();
    try {
      setSubmitting("catalog");
      setFeedback("");
      setErrorMessage("");
      await axios.post("/api/gpec/competencies/", competencyForm);
      setCompetencyForm(initialCompetencyForm);
      setFeedback("Competence enregistree.");
      await fetchGpec();
    } catch (error) {
      console.error("Erreur creation competence:", error);
      setErrorMessage(error?.response?.data?.detail || "Impossible d'enregistrer cette competence.");
    } finally {
      setSubmitting("");
    }
  };

  const submitEmployeeCompetency = async (event) => {
    event.preventDefault();
    try {
      setSubmitting("assignment");
      setFeedback("");
      setErrorMessage("");
      await axios.post("/api/gpec/employee-competencies/", employeeCompetencyForm);
      setEmployeeCompetencyForm(initialEmployeeCompetencyForm);
      setFeedback("Competence employee mise a jour.");
      await fetchGpec();
    } catch (error) {
      console.error("Erreur affectation competence:", error);
      setErrorMessage(error?.response?.data?.detail || "Impossible de mettre a jour cette competence employee.");
    } finally {
      setSubmitting("");
    }
  };

  const submitObjective = async (event) => {
    event.preventDefault();
    try {
      setSubmitting("objective");
      setFeedback("");
      setErrorMessage("");
      await axios.post("/api/gpec/objectives/", objectiveForm);
      setObjectiveForm(initialObjectiveForm);
      setFeedback("Objectif ajoute.");
      await fetchGpec();
    } catch (error) {
      console.error("Erreur creation objectif:", error);
      setErrorMessage(error?.response?.data?.detail || "Impossible d'ajouter cet objectif.");
    } finally {
      setSubmitting("");
    }
  };

  const submitPlan = async (event) => {
    event.preventDefault();
    try {
      setSubmitting("plan");
      setFeedback("");
      setErrorMessage("");
      await axios.post("/api/gpec/plans/", planForm);
      setPlanForm(initialPlanForm);
      setFeedback("Plan de developpement ajoute.");
      await fetchGpec();
    } catch (error) {
      console.error("Erreur creation plan:", error);
      setErrorMessage(error?.response?.data?.detail || "Impossible d'ajouter ce plan.");
    } finally {
      setSubmitting("");
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
              <h1 className="monprofile">{isGrh ? "Pilotage GPEC global" : "GPEC RH"}</h1>
              <p className="morinfo">
                {isGrh
                  ? "Pilotez les competences, objectifs et plans de developpement sur le perimetre global."
                  : "Pilotez le suivi GPEC des employes et les actions de developpement."}
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
              <h2 className="title">Synthese</h2>
              <p className="desc">Indicateurs de couverture du module GPEC.</p>
            </div>
            <div><p className="desc">Employes</p><h3>{stats.employees}</h3></div>
            <div><p className="desc">Competences</p><h3>{stats.catalog}</h3></div>
            <div><p className="desc">Affectations</p><h3>{stats.assignments}</h3></div>
            <div><p className="desc">Objectifs ouverts</p><h3>{stats.objectivesOpen}</h3></div>
          </section>

          <section className="info-pro">
            <div className="top">
              <h2 className="title">Pilotage</h2>
              <p className="desc">Ajoutez les briques GPEC qui manquaient au projet.</p>
            </div>
            <div><p className="desc">Plans actifs</p><h3>{stats.plansActive}</h3></div>
            <div><button className="modifier" onClick={fetchGpec} type="button">Actualiser</button></div>
          </section>
        </div>

        {(feedback || errorMessage) && (
          <div className={`page-feedback ${errorMessage ? "error" : ""}`}>{errorMessage || feedback}</div>
        )}

        <section className="quelques-infos" style={{ width: "96%", marginTop: 0 }}>
          <div style={{ width: "100%", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
            <form onSubmit={submitCatalog} style={{ display: "grid", gap: 10 }}>
              <h3 className="title">Catalogue des competences</h3>
              <input placeholder="Nom de la competence" style={fieldStyle} value={competencyForm.name} onChange={(event) => setCompetencyForm((prev) => ({ ...prev, name: event.target.value }))} />
              <select style={fieldStyle} value={competencyForm.category} onChange={(event) => setCompetencyForm((prev) => ({ ...prev, category: event.target.value }))}>
                <option value="TECHNICAL">Technique</option>
                <option value="BEHAVIORAL">Comportementale</option>
                <option value="MANAGEMENT">Management</option>
                <option value="RH">RH</option>
              </select>
              <input type="number" min="1" max="5" style={fieldStyle} value={competencyForm.target_level} onChange={(event) => setCompetencyForm((prev) => ({ ...prev, target_level: event.target.value }))} />
              <textarea placeholder="Description" rows="3" style={fieldStyle} value={competencyForm.description} onChange={(event) => setCompetencyForm((prev) => ({ ...prev, description: event.target.value }))} />
              <button className="modifier" disabled={submitting === "catalog"} type="submit">
                {submitting === "catalog" ? "Enregistrement..." : "Enregistrer"}
              </button>
            </form>

            <form onSubmit={submitEmployeeCompetency} style={{ display: "grid", gap: 10 }}>
              <h3 className="title">Affecter une competence</h3>
              <select style={fieldStyle} value={employeeCompetencyForm.employee_id} onChange={(event) => setEmployeeCompetencyForm((prev) => ({ ...prev, employee_id: event.target.value }))}>
                <option value="">Choisir un employe</option>
                {data.employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>{employee.full_name}</option>
                ))}
              </select>
              <select style={fieldStyle} value={employeeCompetencyForm.competency_id} onChange={(event) => setEmployeeCompetencyForm((prev) => ({ ...prev, competency_id: event.target.value }))}>
                <option value="">Choisir une competence</option>
                {data.catalog.map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </select>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <input type="number" min="0" max="5" placeholder="Niveau actuel" style={fieldStyle} value={employeeCompetencyForm.current_level} onChange={(event) => setEmployeeCompetencyForm((prev) => ({ ...prev, current_level: event.target.value }))} />
                <input type="number" min="1" max="5" placeholder="Niveau cible" style={fieldStyle} value={employeeCompetencyForm.target_level} onChange={(event) => setEmployeeCompetencyForm((prev) => ({ ...prev, target_level: event.target.value }))} />
              </div>
              <textarea placeholder="Notes" rows="3" style={fieldStyle} value={employeeCompetencyForm.notes} onChange={(event) => setEmployeeCompetencyForm((prev) => ({ ...prev, notes: event.target.value }))} />
              <button className="modifier" disabled={submitting === "assignment"} type="submit">
                {submitting === "assignment" ? "Enregistrement..." : "Affecter"}
              </button>
            </form>

            <form onSubmit={submitObjective} style={{ display: "grid", gap: 10 }}>
              <h3 className="title">Nouvel objectif</h3>
              <select style={fieldStyle} value={objectiveForm.employee_id} onChange={(event) => setObjectiveForm((prev) => ({ ...prev, employee_id: event.target.value }))}>
                <option value="">Choisir un employe</option>
                {data.employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>{employee.full_name}</option>
                ))}
              </select>
              <input placeholder="Titre de l'objectif" style={fieldStyle} value={objectiveForm.title} onChange={(event) => setObjectiveForm((prev) => ({ ...prev, title: event.target.value }))} />
              <input type="date" style={fieldStyle} value={objectiveForm.due_date} onChange={(event) => setObjectiveForm((prev) => ({ ...prev, due_date: event.target.value }))} />
              <textarea placeholder="Description" rows="3" style={fieldStyle} value={objectiveForm.description} onChange={(event) => setObjectiveForm((prev) => ({ ...prev, description: event.target.value }))} />
              <button className="modifier" disabled={submitting === "objective"} type="submit">
                {submitting === "objective" ? "Enregistrement..." : "Ajouter"}
              </button>
            </form>

            <form onSubmit={submitPlan} style={{ display: "grid", gap: 10 }}>
              <h3 className="title">Plan de developpement</h3>
              <select style={fieldStyle} value={planForm.employee_id} onChange={(event) => setPlanForm((prev) => ({ ...prev, employee_id: event.target.value }))}>
                <option value="">Choisir un employe</option>
                {data.employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>{employee.full_name}</option>
                ))}
              </select>
              <input placeholder="Titre du plan" style={fieldStyle} value={planForm.title} onChange={(event) => setPlanForm((prev) => ({ ...prev, title: event.target.value }))} />
              <input type="date" style={fieldStyle} value={planForm.target_date} onChange={(event) => setPlanForm((prev) => ({ ...prev, target_date: event.target.value }))} />
              <textarea placeholder="Actions a mener" rows="3" style={fieldStyle} value={planForm.actions} onChange={(event) => setPlanForm((prev) => ({ ...prev, actions: event.target.value }))} />
              <button className="modifier" disabled={submitting === "plan"} type="submit">
                {submitting === "plan" ? "Enregistrement..." : "Ajouter"}
              </button>
            </form>
          </div>
        </section>

        <section className="activite-recente" style={{ width: "96%", margin: "24px auto" }}>
          <div className="activite-top">
            <h2 className="activite-title">Competences employees</h2>
            <p className="activite-subtitle">Suivi des niveaux et des ecarts de progression.</p>
          </div>
          <div className="activite-table-scroll">
            <table className="activite-table">
              <thead>
                <tr>
                  <th>Employe</th>
                  <th>Competence</th>
                  <th>Actuel</th>
                  <th>Cible</th>
                  <th>Ecart</th>
                  <th>Evaluation</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="6">Chargement des affectations...</td></tr>
                ) : data.employee_competencies.length === 0 ? (
                  <tr><td colSpan="6">Aucune affectation de competence disponible.</td></tr>
                ) : (
                  data.employee_competencies.map((item) => (
                    <tr key={item.id}>
                      <td>{item.employee_name}</td>
                      <td>{item.competency_name}</td>
                      <td>{item.current_level}/5</td>
                      <td>{item.target_level}/5</td>
                      <td><span className={`badge ${item.gap > 0 ? "badge-attente" : "badge-termine"}`}>{item.gap}</span></td>
                      <td>{formatDate(item.assessed_at)}</td>
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
