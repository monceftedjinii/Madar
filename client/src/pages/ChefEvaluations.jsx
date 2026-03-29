import { useEffect, useState } from "react";
import axios from "axios";
import Navbar from "../components/Navbar";
import useDarkModePreference from "../hooks/useDarkModePreference";
import "../styles/profile.css";

export default function ChefEvaluations() {
  const [dark, setDark] = useDarkModePreference();
  const [isNavOpen, setIsNavOpen] = useState(true);
  const [employees, setEmployees] = useState([]);
  const [criteria, setCriteria] = useState([]);
  const [evaluations, setEvaluations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [form, setForm] = useState({
    employeeId: "",
    period: "Semestre 1",
    campaignTitle: "",
    overallComment: "",
    scores: {},
    comments: {},
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      setErrorMessage("");
      const [employeesResponse, criteriaResponse, evaluationsResponse] = await Promise.all([
        axios.get("/api/employees/"),
        axios.get("/api/evaluation/criteria/"),
        axios.get("/api/evaluations/chef/"),
      ]);
      const employeesData = Array.isArray(employeesResponse.data) ? employeesResponse.data : [];
      const criteriaData = Array.isArray(criteriaResponse.data) ? criteriaResponse.data : [];
      const evaluationsData = Array.isArray(evaluationsResponse.data) ? evaluationsResponse.data : [];
      setEmployees(employeesData);
      setCriteria(criteriaData);
      setEvaluations(evaluationsData);
      setForm((previous) => ({
        ...previous,
        employeeId: previous.employeeId || String(employeesData[0]?.id || ""),
      }));
    } catch (error) {
      console.error("Erreur chargement evaluations chef:", error);
      setEmployees([]);
      setCriteria([]);
      setEvaluations([]);
      setErrorMessage("Impossible de charger le module d'evaluation chef.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const updateScore = (criterionId, value) => {
    setForm((previous) => ({
      ...previous,
      scores: { ...previous.scores, [criterionId]: value },
    }));
  };

  const updateComment = (criterionId, value) => {
    setForm((previous) => ({
      ...previous,
      comments: { ...previous.comments, [criterionId]: value },
    }));
  };

  const submitEvaluation = async (event) => {
    event.preventDefault();
    if (!form.employeeId) {
      setErrorMessage("Choisissez un employe a evaluer.");
      return;
    }

    const scoresPayload = criteria
      .filter((criterion) => form.scores[criterion.id] !== undefined && form.scores[criterion.id] !== "")
      .map((criterion) => ({
        criterion_id: criterion.id,
        score: Number(form.scores[criterion.id]),
        comment: form.comments[criterion.id] || "",
      }));

    if (!scoresPayload.length) {
      setErrorMessage("Ajoutez au moins une note.");
      return;
    }

    try {
      setSubmitting(true);
      setFeedback("");
      setErrorMessage("");
      await axios.post("/api/evaluations/chef/", {
        employee_id: Number(form.employeeId),
        period: form.period,
        campaign_title: form.campaignTitle,
        overall_comment: form.overallComment,
        scores: scoresPayload,
      });
      setFeedback("Evaluation enregistree avec succes.");
      setForm((previous) => ({
        ...previous,
        overallComment: "",
        scores: {},
        comments: {},
      }));
      await fetchData();
    } catch (error) {
      console.error("Erreur creation evaluation:", error);
      setErrorMessage(error?.response?.data?.detail || "Impossible d'enregistrer l'evaluation.");
    } finally {
      setSubmitting(false);
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
              <h1 className="monprofile">Evaluations equipe</h1>
              <p className="morinfo">Attribuez des notes aux employes de votre service selon les criteres du systeme.</p>
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

        {(feedback || errorMessage) && (
          <div style={{ width: "96%", margin: "16px auto", padding: "12px 16px", borderRadius: 12, background: errorMessage ? "#ffe6e6" : "#e6f7e6", color: errorMessage ? "#b91c1c" : "#166534", border: `1px solid ${errorMessage ? "#fecaca" : "#bbf7d0"}` }}>
            {errorMessage || feedback}
          </div>
        )}

        <section className="quelques-infos" style={{ width: "96%", marginTop: 16 }}>
          <form onSubmit={submitEvaluation} style={{ width: "100%", display: "grid", gap: 14 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
              <div>
                <p className="desc">Employe</p>
                <select value={form.employeeId} onChange={(e) => setForm((p) => ({ ...p, employeeId: e.target.value }))} style={{ width: "100%", padding: "10px 12px", borderRadius: 12, border: "1px solid #cbd5e1" }}>
                  <option value="">Choisir un employe</option>
                  {employees.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.full_name || `${employee.first_name} ${employee.last_name}`.trim() || employee.email}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <p className="desc">Periode</p>
                <input value={form.period} onChange={(e) => setForm((p) => ({ ...p, period: e.target.value }))} style={{ width: "100%", padding: "10px 12px", borderRadius: 12, border: "1px solid #cbd5e1" }} />
              </div>
              <div>
                <p className="desc">Campagne</p>
                <input value={form.campaignTitle} onChange={(e) => setForm((p) => ({ ...p, campaignTitle: e.target.value }))} placeholder="Ex: Campagne 2026" style={{ width: "100%", padding: "10px 12px", borderRadius: 12, border: "1px solid #cbd5e1" }} />
              </div>
            </div>

            {criteria.map((criterion) => (
              <div key={criterion.id} style={{ border: "1px solid #cbd5e1", borderRadius: 14, padding: 14 }}>
                <p style={{ fontWeight: 700, marginBottom: 8 }}>{criterion.label}</p>
                <div style={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: 12 }}>
                  <input
                    type="number"
                    min={criterion.note_min}
                    max={criterion.note_max}
                    step="0.1"
                    value={form.scores[criterion.id] || ""}
                    onChange={(e) => updateScore(criterion.id, e.target.value)}
                    placeholder={`Note / ${criterion.note_max}`}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: 12, border: "1px solid #cbd5e1" }}
                  />
                  <input
                    value={form.comments[criterion.id] || ""}
                    onChange={(e) => updateComment(criterion.id, e.target.value)}
                    placeholder="Commentaire sur ce critere"
                    style={{ width: "100%", padding: "10px 12px", borderRadius: 12, border: "1px solid #cbd5e1" }}
                  />
                </div>
              </div>
            ))}

            <div>
              <p className="desc">Commentaire global</p>
              <textarea rows={4} value={form.overallComment} onChange={(e) => setForm((p) => ({ ...p, overallComment: e.target.value }))} style={{ width: "100%", padding: "10px 12px", borderRadius: 12, border: "1px solid #cbd5e1", resize: "vertical" }} />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button className="modifier" disabled={submitting} type="submit">
                {submitting ? "Enregistrement..." : "Enregistrer l'evaluation"}
              </button>
            </div>
          </form>
        </section>

        <section className="activite-recente" style={{ width: "96%", margin: "24px auto" }}>
          <div className="activite-top">
            <h2 className="activite-title">Historique des evaluations equipe</h2>
            <p className="activite-subtitle">Evaluations deja remontees pour les employes de votre service.</p>
          </div>
          <div className="activite-table-scroll">
            <table className="activite-table">
              <thead>
                <tr>
                  <th>Employe</th>
                  <th>Periode</th>
                  <th>Date</th>
                  <th>Note</th>
                  <th>Recommendation</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="5">Chargement des evaluations...</td></tr>
                ) : evaluations.length === 0 ? (
                  <tr><td colSpan="5">Aucune evaluation enregistree pour l'instant.</td></tr>
                ) : (
                  evaluations.map((item) => (
                    <tr key={item.id}>
                      <td>{item.employee?.full_name || "-"}</td>
                      <td>{item.period}</td>
                      <td>{item.evaluation_date}</td>
                      <td>{Number(item.global_score).toFixed(2)}/5</td>
                      <td>{item.recommendation}</td>
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
