import NotificationBell from "../components/NotificationBell";
import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import Navbar from "../components/Navbar";
import useDarkModePreference from "../hooks/useDarkModePreference";
import usePersistentNavState from "../hooks/usePersistentNavState";
import "../styles/profile.css";
import "../styles/chef-space.css";

function getMonthInfo() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const lastDay = new Date(year, month + 1, 0).getDate();
  const today = now.getDate();
  const daysLeft = lastDay - today;
  const isUnlocked = true; // always open
  const monthLabel = now.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  const monthDisplay = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);
  return { daysLeft, isUnlocked, monthDisplay, lastDay, today };
}

export default function ChefEvaluations() {
  const [dark, setDark] = useDarkModePreference();
  const [isNavOpen, setIsNavOpen] = usePersistentNavState();
  const [employees, setEmployees] = useState([]);
  const [criteria, setCriteria] = useState([]);
  const [evaluations, setEvaluations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const { daysLeft, isUnlocked, monthDisplay } = useMemo(() => getMonthInfo(), []);
  const [historySearch, setHistorySearch] = useState("");
  const [historyMonth, setHistoryMonth] = useState("");
  const [historyYear, setHistoryYear] = useState("");

  const [form, setForm] = useState({
    employeeId: "",
    campaignTitle: "",
    overallComment: "",
    scores: {},
    comments: {},
  });

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
      console.error("Erreur chargement évaluations chef :", error);
      setEmployees([]);
      setCriteria([]);
      setEvaluations([]);
      setErrorMessage("Impossible de charger le module d'évaluation chef.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const stats = useMemo(() => {
    const average =
      evaluations.length > 0
        ? (
            evaluations.reduce((total, item) => total + Number(item.global_score || 0), 0) /
            evaluations.length
          ).toFixed(1)
        : "0.0";

    return {
      employees: employees.length,
      criteria: criteria.length,
      evaluations: evaluations.length,
      average,
    };
  }, [employees, criteria, evaluations]);

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
    if (!isUnlocked) {
      setErrorMessage(`Les évaluations s'ouvrent dans ${daysLeft} jour(s).`);
      return;
    }
    if (!form.employeeId) {
      setErrorMessage("Choisissez un employé à évaluer.");
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
        period: monthDisplay,
        campaign_title: form.campaignTitle,
        overall_comment: form.overallComment,
        scores: scoresPayload,
      });
      setFeedback("Évaluation enregistrée avec succès.");
      setForm((previous) => ({
        ...previous,
        overallComment: "",
        scores: {},
        comments: {},
      }));
      await fetchData();
    } catch (error) {
      console.error("Erreur création évaluation :", error);
      setErrorMessage(error?.response?.data?.detail || "Impossible d'enregistrer l'évaluation.");
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
              <h1 className="monprofile">Évaluations équipe</h1>
              <p className="morinfo">Attribuez des notes aux employés de votre service selon les critères du système.</p>
            </div>
            <div className="yamin">
              <button className="nav-toggle" onClick={() => setIsNavOpen((prev) => !prev)} type="button">
                {isNavOpen ? "Masquer menu" : "Afficher menu"}
              </button>
              <button className="mode" onClick={() => setDark((prev) => !prev)} type="button">
                {dark ? "mode clair" : "mode sombre"}
              </button>
              <NotificationBell dark={dark} />
            </div>
          </div>
        </div>

        <div style={{ width: "96%", margin: "12px auto 0" }}>

          {/* Compact stats bar */}
          <div style={{ borderRadius: 20, background: "linear-gradient(135deg,#0f172a 0%,#1e3a5f 60%,#1e40af 100%)", padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap", boxShadow: "0 6px 28px rgba(15,23,42,0.35)", marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
              <div>
                <span style={{ fontSize: 42, fontWeight: 900, color: "#fff", lineHeight: 1 }}>{stats.evaluations}</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.5)", marginLeft: 10 }}>évaluations</span>
              </div>
              <div style={{ width: 1, height: 40, background: "rgba(255,255,255,0.15)" }} />
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {[
                  { label: `${stats.employees} employés`, color: "#7dd3fc", bg: "rgba(125,211,252,0.15)", border: "rgba(125,211,252,0.35)" },
                  { label: `${stats.criteria} critères`, color: "#d8b4fe", bg: "rgba(216,180,254,0.15)", border: "rgba(216,180,254,0.35)" },
                  { label: `moy. ${stats.average} / 10`, color: "#fcd34d", bg: "rgba(252,211,77,0.18)", border: "rgba(252,211,77,0.4)" },
                ].map(p => (
                  <span key={p.label} style={{ padding: "6px 14px", borderRadius: 20, background: p.bg, border: `1px solid ${p.border}`, fontSize: 13, fontWeight: 800, color: p.color, whiteSpace: "nowrap" }}>{p.label}</span>
                ))}
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {isUnlocked ? (
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 18px", borderRadius: 14, background: "rgba(34,197,94,0.2)", border: "1px solid rgba(34,197,94,0.45)" }}>
                  <span style={{ fontSize: 18 }}>✅</span>
                  <div>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 900, color: "#4ade80" }}>Formulaire ouvert</p>
                    <p style={{ margin: 0, fontSize: 11, color: "rgba(74,222,128,0.7)" }}>{monthDisplay}</p>
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 18px", borderRadius: 14, background: "rgba(251,191,36,0.15)", border: "1px solid rgba(251,191,36,0.45)" }}>
                  <span style={{ fontSize: 20 }}>🔒</span>
                  <div>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 900, color: "#fbbf24" }}>Ouverture dans {daysLeft} jours</p>
                    <p style={{ margin: 0, fontSize: 11, color: "rgba(251,191,36,0.7)" }}>{monthDisplay}</p>
                  </div>
                </div>
              )}
              <button type="button" onClick={fetchData} style={{ padding: "8px 14px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.08)", fontSize: 14, fontWeight: 700, cursor: "pointer", color: "#fff" }}>↺</button>
            </div>
          </div>

          {(feedback || errorMessage) && (
            <div style={{ marginBottom: 10, padding: "10px 16px", borderRadius: 12, fontSize: 13, fontWeight: 600, background: errorMessage ? "#fee2e2" : "#f0fdf4", color: errorMessage ? "#dc2626" : "#15803d", border: `1px solid ${errorMessage ? "#fca5a5" : "#86efac"}` }}>
              {errorMessage || feedback}
            </div>
          )}

          {/* Two-column layout */}
          <div style={{ display: "grid", gridTemplateColumns: "400px 1fr", gap: 14, alignItems: "start" }}>

            {/* Left: evaluation form */}
            <section style={{ borderRadius: 20, border: `1px solid ${dark ? "#1e293b" : "#e2e8f0"}`, background: dark ? "#0f172a" : "#fff", overflow: "hidden", position: "sticky", top: 80, maxHeight: "calc(100vh - 180px)", overflowY: "auto" }}>
              <div style={{ padding: "12px 16px", borderBottom: `1px solid ${dark ? "#1e293b" : "#f1f5f9"}`, background: dark ? "#0a0f1a" : "#f8fafc", position: "sticky", top: 0, zIndex: 2 }}>
                <h2 style={{ margin: 0, fontSize: 14, fontWeight: 900, color: dark ? "#f1f5f9" : "#0f172a" }}>Nouvelle évaluation</h2>
                <p style={{ margin: "3px 0 0", fontSize: 12, fontWeight: 700, color: isUnlocked ? "#22c55e" : "#f59e0b" }}>
                  {isUnlocked ? `✓ ${monthDisplay} — formulaire ouvert` : `🔒 ${monthDisplay} — ouverture dans ${daysLeft} jour${daysLeft > 1 ? "s" : ""}`}
                </p>
              </div>

              {(() => {
                const now = new Date();
                const currentMonth = now.getMonth();
                const currentYear = now.getFullYear();
                const evaluatedThisMonth = new Set(
                  evaluations
                    .filter(e => {
                      const d = new Date(e.evaluation_date);
                      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
                    })
                    .map(e => String(e.employee?.id))
                );
                const selectedAlreadyEvaluated = form.employeeId && evaluatedThisMonth.has(String(form.employeeId));

                return (
              <form onSubmit={submitEvaluation} style={{ padding: "10px 14px", display: "grid", gap: 10, opacity: isUnlocked ? 1 : 0.5, pointerEvents: isUnlocked ? "auto" : "none" }}>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: dark ? "#94a3b8" : "#64748b", marginBottom: 3 }}>Employé</label>
                  <select value={form.employeeId} onChange={(e) => setForm((p) => ({ ...p, employeeId: e.target.value }))}
                    style={{ width: "100%", padding: "7px 10px", borderRadius: 9, border: `1.5px solid ${dark ? "#1e293b" : "#e2e8f0"}`, background: dark ? "#0a0f1a" : "#f8fafc", color: dark ? "#e2e8f0" : "#0f172a", fontSize: 12, outline: "none", boxSizing: "border-box" }}>
                    <option value="">Choisir un employé</option>
                    {employees.map(emp => {
                      const alreadyDone = evaluatedThisMonth.has(String(emp.id));
                      const name = emp.full_name || `${emp.first_name} ${emp.last_name}`.trim();
                      return (
                        <option key={emp.id} value={emp.id} disabled={alreadyDone}>
                          {alreadyDone ? `✓ ${name} (déjà évalué ce mois)` : name}
                        </option>
                      );
                    })}
                  </select>
                  {selectedAlreadyEvaluated && (
                    <div style={{ marginTop: 6, padding: "7px 12px", borderRadius: 9, background: dark ? "rgba(251,191,36,0.12)" : "#fffbeb", border: "1px solid #fde047", fontSize: 11, fontWeight: 700, color: "#92400e" }}>
                      ⚠️ Cet employé a déjà été évalué ce mois. Sélectionnez un autre employé.
                    </div>
                  )}
                </div>

                {criteria.map((criterion, idx) => {
                  const accents = ["#3b82f6","#8b5cf6","#10b981","#f59e0b","#ef4444","#06b6d4"];
                  const accent = accents[idx % accents.length];
                  return (
                  <div key={criterion.id} style={{ border: `1px solid ${dark ? "#1e293b" : "#e2e8f0"}`, background: dark ? "#0a0f1a" : "#fff", borderRadius: 10, padding: "8px 12px", borderLeft: `3px solid ${accent}` }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                      <p style={{ margin: 0, fontWeight: 800, fontSize: 12, color: accent }}>{criterion.label}</p>
                      <span style={{ fontSize: 10, color: "#94a3b8" }}>{criterion.note_min}–{criterion.note_max}</span>
                    </div>
                    <input type="number" min={criterion.note_min} max={criterion.note_max} step="0.1"
                      value={form.scores[criterion.id] || ""} onChange={(e) => updateScore(criterion.id, e.target.value)}
                      placeholder={`Note sur ${criterion.note_max}`}
                      style={{ width: "100%", padding: "7px 10px", borderRadius: 8, border: `1.5px solid ${dark ? "#1e293b" : "#e2e8f0"}`, background: dark ? "#0f172a" : "#f8fafc", color: dark ? "#e2e8f0" : "#0f172a", fontSize: 13, fontWeight: 700, outline: "none", boxSizing: "border-box" }} />
                  </div>
                  );
                })}

                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: dark ? "#94a3b8" : "#64748b", marginBottom: 3 }}>Commentaire global</label>
                  <textarea rows={3} value={form.overallComment} onChange={(e) => setForm((p) => ({ ...p, overallComment: e.target.value }))}
                    style={{ width: "100%", padding: "7px 10px", borderRadius: 9, border: `1.5px solid ${dark ? "#1e293b" : "#e2e8f0"}`, background: dark ? "#0a0f1a" : "#f8fafc", color: dark ? "#e2e8f0" : "#0f172a", fontSize: 12, outline: "none", boxSizing: "border-box", resize: "vertical" }} />
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <button type="submit" disabled={submitting || selectedAlreadyEvaluated}
                    style={{ padding: "9px 22px", borderRadius: 10, border: "none", background: (submitting || selectedAlreadyEvaluated) ? "#94a3b8" : "linear-gradient(135deg,#3b82f6,#2563eb)", color: "#fff", fontWeight: 800, fontSize: 13, cursor: (submitting || selectedAlreadyEvaluated) ? "not-allowed" : "pointer", boxShadow: (submitting || selectedAlreadyEvaluated) ? "none" : "0 4px 14px rgba(59,130,246,0.35)" }}>
                    {submitting ? "Enregistrement..." : "Enregistrer"}
                  </button>
                </div>
              </form>
                );
              })()}
            </section>

            {/* Right: history */}
            <section style={{ borderRadius: 20, border: `1px solid ${dark ? "#1e293b" : "#e2e8f0"}`, background: dark ? "#0f172a" : "#fff", overflow: "hidden", display: "flex", flexDirection: "column", maxHeight: "calc(100vh - 180px)" }}>
              <div style={{ padding: "12px 16px", borderBottom: `1px solid ${dark ? "#1e293b" : "#f1f5f9"}`, background: dark ? "#0a0f1a" : "#f8fafc", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: 14, fontWeight: 900, color: dark ? "#f1f5f9" : "#0f172a" }}>Historique des évaluations</h2>
                  <p style={{ margin: "2px 0 0", fontSize: 12, color: "#94a3b8" }}>{evaluations.length} évaluation{evaluations.length > 1 ? "s" : ""} enregistrée{evaluations.length > 1 ? "s" : ""}</p>
                </div>
                <span style={{ padding: "5px 14px", borderRadius: 20, background: dark ? "rgba(253,230,138,0.12)" : "rgba(253,230,138,0.25)", border: "1px solid rgba(253,230,138,0.4)", fontSize: 13, fontWeight: 800, color: "#d97706" }}>
                  moy. {stats.average} / 10
                </span>
              </div>
              <div style={{ padding: "10px 14px", borderBottom: `1px solid ${dark ? "#1e293b" : "#f1f5f9"}`, flexShrink: 0, display: "flex", gap: 8, flexWrap: "wrap" }}>
                <input type="text" value={historySearch} onChange={e => setHistorySearch(e.target.value)} placeholder="Rechercher par nom..."
                  style={{ flex: "1 1 140px", padding: "6px 12px", borderRadius: 9, border: `1.5px solid ${dark ? "#334155" : "#e2e8f0"}`, background: dark ? "#0f172a" : "#fff", color: dark ? "#e2e8f0" : "#0f172a", fontSize: 12, outline: "none", boxSizing: "border-box" }} />
                <select value={historyMonth} onChange={e => setHistoryMonth(e.target.value)}
                  style={{ padding: "6px 10px", borderRadius: 9, border: `1.5px solid ${dark ? "#334155" : "#e2e8f0"}`, background: dark ? "#0f172a" : "#fff", color: dark ? "#e2e8f0" : "#0f172a", fontSize: 12, outline: "none" }}>
                  <option value="">Tous mois</option>
                  {["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"].map((m, i) => (
                    <option key={m} value={String(i + 1).padStart(2, "0")}>{m}</option>
                  ))}
                </select>
                <select value={historyYear} onChange={e => setHistoryYear(e.target.value)}
                  style={{ padding: "6px 10px", borderRadius: 9, border: `1.5px solid ${dark ? "#334155" : "#e2e8f0"}`, background: dark ? "#0f172a" : "#fff", color: dark ? "#e2e8f0" : "#0f172a", fontSize: 12, outline: "none" }}>
                  <option value="">Toutes années</option>
                  {[...new Set(evaluations.map(e => e.year))].sort((a, b) => b - a).map(y => (
                    <option key={y} value={String(y)}>{y}</option>
                  ))}
                </select>
              </div>
              <div style={{ flex: 1, overflowY: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead style={{ position: "sticky", top: 0, zIndex: 1 }}>
                    <tr style={{ background: dark ? "#0a0f1a" : "#f8fafc" }}>
                      {["Employé", "Période", "Date", "Note", "Recommandation"].map(h => (
                        <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#94a3b8", borderBottom: `1px solid ${dark ? "#1e293b" : "#e2e8f0"}`, whiteSpace: "nowrap" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan="5" style={{ padding: 20, textAlign: "center", color: "#94a3b8" }}>Chargement...</td></tr>
                    ) : (() => {
                      const q = historySearch.trim().toLowerCase();
                      const MONTHS = ["janvier","février","mars","avril","mai","juin","juillet","août","septembre","octobre","novembre","décembre"];
                      const filtered = evaluations.filter(item => {
                        const name = (item.employee?.full_name || "").toLowerCase();
                        const matchName = !q || name.split(" ").some(p => p.startsWith(q)) || name.includes(q);
                        const matchMonth = !historyMonth || (() => { const idx = MONTHS.findIndex(m => (item.period || "").toLowerCase().includes(m)); return idx !== -1 && String(idx + 1).padStart(2, "0") === historyMonth; })();
                        const matchYear = !historyYear || String(item.year) === historyYear;
                        return matchName && matchMonth && matchYear;
                      });
                      if (!filtered.length) return <tr><td colSpan="5" style={{ padding: 20, textAlign: "center", color: "#94a3b8" }}>Aucun résultat.</td></tr>;
                      return filtered.map((item, idx) => (
                        <tr key={item.id} style={{ background: idx % 2 === 0 ? "transparent" : (dark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.015)"), borderBottom: `1px solid ${dark ? "#1e293b" : "#f1f5f9"}` }}>
                          <td style={{ padding: "8px 12px", fontWeight: 600, color: dark ? "#e2e8f0" : "#0f172a", whiteSpace: "nowrap" }}>{item.employee?.full_name || "-"}</td>
                          <td style={{ padding: "8px 12px", color: "#94a3b8" }}>{item.period}</td>
                          <td style={{ padding: "8px 12px", color: "#94a3b8", whiteSpace: "nowrap" }}>{item.evaluation_date}</td>
                          <td style={{ padding: "8px 12px" }}>
                            <span style={{ fontWeight: 900, fontSize: 15, color: Number(item.global_score) >= 8 ? "#22c55e" : Number(item.global_score) >= 6 ? "#f59e0b" : "#ef4444" }}>
                              {Number(item.global_score).toFixed(1)}<span style={{ fontSize: 11, fontWeight: 600, opacity: 0.7 }}>/10</span>
                            </span>
                          </td>
                          <td style={{ padding: "8px 12px", color: dark ? "#94a3b8" : "#64748b" }}>{item.recommendation || "—"}</td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
