import NotificationBell from "../components/NotificationBell";
import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import Navbar from "../components/Navbar";
import useDarkModePreference from "../hooks/useDarkModePreference";
import usePersistentNavState from "../hooks/usePersistentNavState";
import "../styles/profile.css";
import "../styles/chef-space.css";

function formatTime(value) {
  if (!value) return "--:--";
  return value.slice(0, 5);
}

function formatDate(value) {
  if (!value) return "-";
  const d = new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

export default function ChefAttendance() {
  const [dark, setDark] = useDarkModePreference();
  const [isNavOpen, setIsNavOpen] = usePersistentNavState();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [detailEmployee, setDetailEmployee] = useState(null);
  const [detailData, setDetailData] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailFromDate, setDetailFromDate] = useState("");
  const [detailToDate, setDetailToDate] = useState("");
  const [detailStatusFilter, setDetailStatusFilter] = useState("all");

  const fetchAttendance = async () => {
    try {
      setLoading(true);
      setErrorMessage("");
      const response = await axios.get("/api/attendance/team/");
      setRows(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error("Erreur chargement présence équipe :", error);
      setRows([]);
      setErrorMessage("Impossible de charger le suivi de présence de l'équipe.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, []);

  const openDetail = async (row) => {
    setDetailEmployee(row);
    setDetailData(null);
    setDetailFromDate("");
    setDetailToDate("");
    setDetailStatusFilter("all");
    setDetailLoading(true);
    try {
      const res = await axios.get(`/api/attendance/team/${row.id}/`);
      setDetailData(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setDetailLoading(false);
    }
  };

  const stats = useMemo(() => {
    const total = rows.length;
    const complete = rows.filter((r) => r.today_check_in && r.today_check_out).length;
    const inProgress = rows.filter((r) => r.today_check_in && !r.today_check_out).length;
    const absent = rows.filter((r) => !r.today_check_in).length;
    const unjustified = rows.reduce((sum, r) => sum + (r.unjustified_absences || 0), 0);
    return { total, complete, inProgress, absent, unjustified };
  }, [rows]);

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
              <h1 className="monprofile">Présence équipe</h1>
              <p className="morinfo">
                Suivi des pointages, absences et journées complètes des employés de votre service.
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

        <div className="chef-page-stack">
          <section className="chef-hero">
            <div className="chef-hero-copy">
              <span className="chef-eyebrow">Espace chef</span>
              <h2 className="chef-hero-title">Lecture instantanée de la présence du service</h2>
              <p className="chef-hero-description">
                Repérez rapidement les journées complètes, les pointages en cours et les absences
                de votre équipe avant d'entrer dans le détail.
              </p>
            </div>
            <div className="chef-hero-kpis">
              <article className="chef-kpi-card">
                <span>Équipe suivie</span>
                <strong>{stats.total}</strong>
                <p>Collaborateurs inclus dans votre scope chef.</p>
              </article>
              <article className="chef-kpi-card">
                <span>Complet</span>
                <strong>{stats.complete}</strong>
                <p>Journées clôturées avec entrée et sortie.</p>
              </article>
              <article className="chef-kpi-card">
                <span>En cours</span>
                <strong>{stats.inProgress}</strong>
                <p>Pointages encore ouverts aujourd&apos;hui.</p>
              </article>
              <article className="chef-kpi-card">
                <span>Absents</span>
                <strong>{stats.absent}</strong>
                <p>Employés sans présence sur la journée.</p>
              </article>
              <article className="chef-kpi-card">
                <span>Non justifiées</span>
                <strong style={{ color: stats.unjustified > 0 ? "#ef4444" : undefined }}>
                  {stats.unjustified}
                </strong>
                <p>Absences sans justificatif sur la période.</p>
              </article>
            </div>
          </section>

          <div className="chef-metrics-grid">
            <article className="chef-metric-card">
              <span>Actualisation</span>
              <strong>{loading ? "..." : "OK"}</strong>
              <p>Les données de présence peuvent être rechargées à tout moment.</p>
            </article>
            <article className="chef-metric-card">
              <span>Controle</span>
              <strong>{stats.complete + stats.inProgress}</strong>
              <p>Employés avec une présence déjà constatée sur la journée.</p>
            </article>
            <article className="chef-metric-card">
              <span>Action rapide</span>
              <p style={{ marginTop: 12 }}>
                <button className="modifier" onClick={fetchAttendance} type="button">
                  Actualiser
                </button>
              </p>
            </article>
          </div>

          {errorMessage && <div className="page-feedback error">{errorMessage}</div>}

          <section className="chef-panel">
            <div className="chef-panel-head">
              <div>
                <h2>Suivi de présence équipe</h2>
                <p>Données remontées par le backend pour la période en cours.</p>
              </div>
            </div>

            <div className="activite-table-scroll">
              <table className="activite-table">
              <thead>
                <tr>
                  <th>Employé</th>
                  <th>Dernière absence</th>
                  <th>Entrée</th>
                  <th>Sortie</th>
                  <th>Journées complètes</th>
                  <th>Sorties manquantes</th>
                  <th>Absences</th>
                  <th>Abs. non justifiées</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="8">Chargement de la présence équipe...</td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan="8">Aucune donnée de présence disponible.</td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <div>{row.full_name}</div>
                        <div style={{ fontSize: 12, color: "#94a3b8" }}>{row.email}</div>
                      </td>
                      <td>
                        {row.last_absence ? (
                          <span style={{ background: "#fee2e2", color: "#991b1b", border: "1px solid #fca5a5", borderRadius: 20, padding: "2px 10px", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" }}>
                            {formatDate(row.last_absence)}
                          </span>
                        ) : (
                          <span style={{ color: "#94a3b8", fontSize: 12 }}>-</span>
                        )}
                      </td>
                      <td>{formatTime(row.today_check_in)}</td>
                      <td>{formatTime(row.today_check_out)}</td>
                      <td>{row.complete_days}</td>
                      <td>{row.pending_checkout_days}</td>
                      <td>{row.absent_days}</td>
                      <td>
                        {row.unjustified_absences > 0 ? (
                          <span className="badge badge-refuse">{row.unjustified_absences}</span>
                        ) : (
                          <span className="badge badge-termine">0</span>
                        )}
                      </td>
                      <td>
                        <button className="modifier" type="button" onClick={() => openDetail(row)}>
                          Détails
                        </button>
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

      {/* Employee Detail Modal */}
      {detailEmployee && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.6)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
          onClick={() => setDetailEmployee(null)}
        >
          <div
            style={{ background: dark ? "#1e293b" : "#fff", borderRadius: 28, width: "100%", maxWidth: 820, maxHeight: "90vh", display: "flex", flexDirection: "column", boxShadow: "0 24px 64px rgba(0,0,0,0.28)", overflow: "hidden" }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ padding: "20px 24px", borderBottom: `1px solid ${dark ? "#334155" : "#e2e8f0"}`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
              <div>
                <p style={{ margin: 0, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.2em", color: "#64748b" }}>Détails de présence</p>
                <h2 style={{ margin: "4px 0 0", fontSize: 20, fontWeight: 900, color: dark ? "#f1f5f9" : "#0f172a" }}>{detailEmployee.full_name}</h2>
                <p style={{ margin: "2px 0 0", fontSize: 13, color: "#94a3b8" }}>{detailEmployee.email} • {detailEmployee.service}</p>
              </div>
              <button onClick={() => setDetailEmployee(null)} type="button" style={{ border: "none", borderRadius: 12, padding: "8px 16px", fontWeight: 700, cursor: "pointer", background: dark ? "#334155" : "#f1f5f9", color: dark ? "#e2e8f0" : "#0f172a", fontSize: 13 }}>
                Fermer
              </button>
            </div>

            {/* Filters */}
            <div style={{ padding: "14px 24px", borderBottom: `1px solid ${dark ? "#334155" : "#e2e8f0"}`, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#94a3b8", whiteSpace: "nowrap" }}>Du</span>
                <input type="date" lang="fr" value={detailFromDate} onChange={e => setDetailFromDate(e.target.value)}
                  style={{ padding: "7px 12px", borderRadius: 12, border: `1px solid ${dark ? "#334155" : "#cbd5e1"}`, background: dark ? "#0f172a" : "#f8fafc", color: dark ? "#e2e8f0" : "#0f172a", fontSize: 13 }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: "#94a3b8", whiteSpace: "nowrap" }}>Au</span>
                <input type="date" lang="fr" value={detailToDate} onChange={e => setDetailToDate(e.target.value)}
                  style={{ padding: "7px 12px", borderRadius: 12, border: `1px solid ${dark ? "#334155" : "#cbd5e1"}`, background: dark ? "#0f172a" : "#f8fafc", color: dark ? "#e2e8f0" : "#0f172a", fontSize: 13 }} />
                {(detailFromDate || detailToDate) && (
                  <button type="button" onClick={() => { setDetailFromDate(""); setDetailToDate(""); }}
                    style={{ border: "none", borderRadius: 10, padding: "6px 10px", fontSize: 12, cursor: "pointer", background: dark ? "#334155" : "#e2e8f0", color: dark ? "#e2e8f0" : "#64748b", fontWeight: 600 }}>
                    ✕
                  </button>
                )}
              </div>
              {["all", "Complet", "Entrée seule", "Absent"].map(s => (
                <button key={s} type="button"
                  onClick={() => setDetailStatusFilter(s)}
                  style={{ border: "none", borderRadius: 20, padding: "6px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer",
                    background: detailStatusFilter === s ? (dark ? "#3b82f6" : "#0f172a") : (dark ? "#334155" : "#e2e8f0"),
                    color: detailStatusFilter === s ? "#fff" : (dark ? "#cbd5e1" : "#475569") }}>
                  {s === "all" ? "Tous" : s}
                </button>
              ))}
            </div>

            {/* Body */}
            <div style={{ overflowY: "auto", flex: 1 }}>
              {detailLoading ? (
                <div style={{ padding: 40, textAlign: "center", color: "#94a3b8" }}>Chargement...</div>
              ) : detailData ? (() => {
                const filtered = detailData.days.filter(day => {
                  if (day.is_weekend) return false;
                  if (detailStatusFilter !== "all" && day.status !== detailStatusFilter) return false;
                  if (detailFromDate && day.date < detailFromDate) return false;
                  if (detailToDate && day.date > detailToDate) return false;
                  return true;
                });
                const statusColor = s => s === "Complet" ? "#16a34a" : s === "Absent" ? "#dc2626" : "#d97706";
                const statusBg = s => s === "Complet" ? "#dcfce7" : s === "Absent" ? "#fee2e2" : "#fef9c3";
                const justifColor = s => s === "Justifié" ? "#16a34a" : s === "En cours" ? "#d97706" : s === "Non acceptée" ? "#dc2626" : "#64748b";

                return filtered.length === 0 ? (
                  <div style={{ padding: 40, textAlign: "center", color: "#94a3b8" }}>Aucun enregistrement correspondant.</div>
                ) : (
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: dark ? "#0f172a" : "#f8fafc" }}>
                        {["Date", "Entrée", "Sortie", "Statut", "Justification"].map(h => (
                          <th key={h} style={{ padding: "10px 20px", textAlign: "left", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.18em", color: "#64748b", borderBottom: `1px solid ${dark ? "#334155" : "#e2e8f0"}` }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map(day => (
                        <tr key={day.date} style={{ borderBottom: `1px solid ${dark ? "#1e293b" : "#f1f5f9"}` }}>
                          <td style={{ padding: "11px 20px", fontWeight: 600, color: dark ? "#e2e8f0" : "#0f172a" }}>
                            {new Date(`${day.date}T00:00:00`).toLocaleDateString("fr-FR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}
                          </td>
                          <td style={{ padding: "11px 20px", color: day.check_in ? (dark ? "#86efac" : "#16a34a") : "#94a3b8", fontWeight: day.check_in ? 600 : 400 }}>{day.check_in || "--:--"}</td>
                          <td style={{ padding: "11px 20px", color: day.check_out ? (dark ? "#e2e8f0" : "#0f172a") : "#94a3b8" }}>{day.check_out || "--:--"}</td>
                          <td style={{ padding: "11px 20px" }}>
                            <span style={{ background: statusBg(day.status), color: statusColor(day.status), borderRadius: 20, padding: "3px 12px", fontWeight: 700, fontSize: 12 }}>{day.status}</span>
                          </td>
                          <td style={{ padding: "11px 20px" }}>
                            {day.justification_status ? (
                              <span style={{ color: justifColor(day.justification_status), fontWeight: 600, fontSize: 12 }}>{day.justification_status}</span>
                            ) : day.status === "Absent" ? (
                              <span style={{ color: "#94a3b8", fontSize: 12 }}>Non justifié</span>
                            ) : <span style={{ color: "#94a3b8" }}>—</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                );
              })() : null}
            </div>

            {/* Footer stats */}
            {detailData && !detailLoading && (
              <div style={{ padding: "14px 24px", borderTop: `1px solid ${dark ? "#334155" : "#e2e8f0"}`, display: "flex", gap: 24, flexWrap: "wrap" }}>
                {[
                  { label: "Complets", val: detailData.days.filter(d => !d.is_weekend && d.status === "Complet").length, color: "#16a34a" },
                  { label: "Entrée seule", val: detailData.days.filter(d => !d.is_weekend && d.status === "Entrée seule").length, color: "#d97706" },
                  { label: "Absences", val: detailData.days.filter(d => !d.is_weekend && d.status === "Absent").length, color: "#dc2626" },
                  { label: "Justifiés", val: detailData.days.filter(d => d.raw_justif_status === "JUSTIFIE").length, color: "#2563eb" },
                ].map(item => (
                  <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ width: 10, height: 10, borderRadius: "50%", background: item.color, display: "inline-block" }} />
                    <span style={{ fontSize: 13, color: dark ? "#94a3b8" : "#64748b" }}>{item.label}:</span>
                    <span style={{ fontWeight: 800, fontSize: 14, color: item.color }}>{item.val}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
