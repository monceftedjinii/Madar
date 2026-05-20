import NotificationBell from "../components/NotificationBell";
import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import Navbar from "../components/Navbar";
import useDarkModePreference from "../hooks/useDarkModePreference";
import usePersistentNavState from "../hooks/usePersistentNavState";
import "../styles/profile.css";
import "../styles/chef-space.css";

function getCurrentMonthRange() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const firstDay = `${year}-${month}-01`;
  const lastDate = new Date(year, now.getMonth() + 1, 0).getDate();
  return { from: firstDay, to: `${year}-${month}-${String(lastDate).padStart(2, "0")}` };
}

export default function ChefReports() {
  const [dark, setDark] = useDarkModePreference();
  const [isNavOpen, setIsNavOpen] = usePersistentNavState();
  const [filters, setFilters] = useState(getCurrentMonthRange);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
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

  const fetchSummary = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMessage("");
      const response = await axios.get("/api/reports/summary/", {
        params: filters,
      });
      setSummary(response.data || null);
    } catch (error) {
      console.error("Erreur chargement rapports chef:", error);
      setSummary(null);
      setErrorMessage("Impossible de charger le tableau des rapports chef.");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  const cards = useMemo(() => {
    if (!summary) return [];
    return [
      { label: "Employés du scope", value: summary.employees_count ?? 0 },
      { label: "Absences détectées", value: summary.absences_detected_count ?? 0 },
    ];
  }, [summary]);

  const downloadReport = async (type, format) => {
    try {
      const response = await axios.get(`/api/reports/${type}/export/`, {
        params: {
          ...filters,
          file_format: format,
        },
        responseType: "blob",
      });
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${type}-report.${format === "xlsx" ? "xlsx" : "pdf"}`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error(`Erreur export ${type}:`, error);
      setErrorMessage(error?.response?.data?.detail || `Impossible d'exporter le rapport ${type}.`);
    }
  };

  return (
    <div className={`profile-page${dark ? " dark" : ""} ${isNavOpen ? "nav-open" : "nav-closed"}`}>
      <div className={`navbar-profile-page ${isNavOpen ? "open" : "closed"}`}>
        <Navbar />
      </div>

      {isNavOpen && <div className="profile-overlay" onClick={() => setIsNavOpen(false)} aria-hidden="true" />}

      <div className="profile-content !h-auto min-h-screen bg-transparent">
        <div
          className={`sticky top-0 z-40 backdrop-blur ${
            dark ? "border-b border-slate-800 bg-slate-950/90" : "border-b border-slate-200/80 bg-white/90"
          }`}
        >
          <div className="profile-naaav">
            <div className="yasar">
              <h1 className="monprofile">Rapports chef</h1>
              <p className="morinfo">Vue synthèse du service et exports présence, congés et tâches.</p>
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

        <div className="chef-page-stack">
          <section className="chef-hero">
            <div className="chef-hero-copy">
              <span className="chef-eyebrow">Espace chef</span>
              <h2 className="chef-hero-title">Rapports et lecture synthétique du service</h2>
              <p className="chef-hero-description">
                Filtrez une période, consultez les indicateurs du scope chef et exportez rapidement
                les rapports utiles au pilotage.
              </p>
            </div>
            <div className="chef-hero-kpis">
              <article className="chef-kpi-card">
                <span>Période</span>
                <strong>{filters.from}</strong>
                <p>Date de début de l'analyse sélectionnée.</p>
              </article>
              <article className="chef-kpi-card">
                <span>Jusqu&apos;a</span>
                <strong>{filters.to}</strong>
                <p>Date de fin appliquee aux exports et indicateurs.</p>
              </article>
              <article className="chef-kpi-card">
                <span>Indicateurs</span>
                <strong>{cards.length}</strong>
                <p>Mesures de synthese disponibles pour votre service.</p>
              </article>
              <article className="chef-kpi-card">
                <span>Etat</span>
                <strong>{loading ? "..." : "À jour"}</strong>
                <p>Résumé backend chargé pour la période courante.</p>
              </article>
            </div>
          </section>

          <section className="chef-panel">
            <div className="chef-panel-head">
              <div>
                <h2>Filtres et exports</h2>
                <p>Choisissez la période d'analyse et lancez les exportations utiles.</p>
              </div>
              <div className="chef-action-pill">Reporting</div>
            </div>

            <div className="chef-inline-grid">
              <div className="chef-note-card">
                <h4>Période du rapport</h4>
                <div className="chef-form-grid">
                  <div className="chef-form-field">
                    <p className="chef-form-label">Du</p>
                    <input type="date" value={filters.from} onChange={(e) => setFilters((p) => ({ ...p, from: e.target.value }))} style={fieldStyle} />
                  </div>
                  <div className="chef-form-field">
                    <p className="chef-form-label">Au</p>
                    <input type="date" value={filters.to} onChange={(e) => setFilters((p) => ({ ...p, to: e.target.value }))} style={fieldStyle} />
                  </div>
                </div>
              </div>
              <div className="chef-note-card">
                <h4>Exports disponibles</h4>
                <div className="chef-action-row">
                  <button className="modifier" onClick={() => downloadReport("attendance", "pdf")} type="button">Présence PDF</button>
                  <button className="modifier" onClick={() => downloadReport("attendance", "pdf")} type="button">Présence PDF</button>
                </div>
              </div>
            </div>
          </section>

          {errorMessage && <div className="page-feedback error">{errorMessage}</div>}

          <section className="chef-panel">
            <div className="chef-panel-head">
              <div>
                <h2>Synthèse du service</h2>
                <p>Indicateurs backend calculés sur votre scope chef.</p>
              </div>
              <div className="chef-action-pill">Résumé</div>
            </div>

            <div className="chef-metrics-grid">
              {loading ? (
                <div className="chef-note-card">
                  <p>Chargement des indicateurs...</p>
                </div>
              ) : (
                cards.map((card) => (
                  <article key={card.label} className="chef-metric-card">
                    <span>{card.label}</span>
                    <strong>{card.value}</strong>
                    <p>Valeur calculée sur la plage de dates sélectionnée.</p>
                  </article>
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
