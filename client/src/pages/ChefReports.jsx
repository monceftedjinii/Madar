import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import Navbar from "../components/Navbar";
import useDarkModePreference from "../hooks/useDarkModePreference";
import usePersistentNavState from "../hooks/usePersistentNavState";
import "../styles/profile.css";

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
      { label: "Employes du scope", value: summary.employees_count ?? 0 },
      { label: "Jours de presence", value: summary.attendance_days_count ?? 0 },
      { label: "Absences detectees", value: summary.absences_detected_count ?? 0 },
      { label: "Conges en attente", value: summary.leaves_pending_count ?? 0 },
      { label: "Documents crees", value: summary.documents_created_count ?? 0 },
      { label: "Documents valides", value: summary.documents_validated_count ?? 0 },
      { label: "Avertissements", value: summary.warnings_count ?? 0 },
      { label: "Flags disciplinaires", value: summary.discipline_flags_count ?? 0 },
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

  const summaryCardStyle = {
    borderRadius: 16,
    padding: 18,
    background: dark ? "#1e293b" : "#f8fafc",
    border: `1px solid ${dark ? "#334155" : "#e2e8f0"}`,
  };

  const summaryLabelStyle = {
    margin: 0,
    fontSize: 13,
    fontWeight: 600,
    color: dark ? "#93c5fd" : "#2563eb",
  };

  const summaryValueStyle = {
    marginTop: 10,
    marginBottom: 0,
    fontSize: 30,
    fontWeight: 700,
    color: dark ? "#f8fafc" : "#0f172a",
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
              <p className="morinfo">Vue synthese du service et exports presence, conges et taches.</p>
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
              <h2 className="title">Periode</h2>
              <p className="desc">Filtrez les exports et le resume du service.</p>
            </div>
            <div>
              <p className="desc">Du</p>
              <input type="date" value={filters.from} onChange={(e) => setFilters((p) => ({ ...p, from: e.target.value }))} style={fieldStyle} />
            </div>
            <div>
              <p className="desc">Au</p>
              <input type="date" value={filters.to} onChange={(e) => setFilters((p) => ({ ...p, to: e.target.value }))} style={fieldStyle} />
            </div>
          </section>

          <section className="info-pro">
            <div className="top">
              <h2 className="title">Exports</h2>
              <p className="desc">Telechargez les rapports backend selon votre scope chef.</p>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              <button className="modifier" onClick={() => downloadReport("attendance", "pdf")} type="button">Presence PDF</button>
              <button className="modifier" onClick={() => downloadReport("attendance", "xlsx")} type="button">Presence Excel</button>
              <button className="modifier" onClick={() => downloadReport("leaves", "pdf")} type="button">Conges PDF</button>
              <button className="modifier" onClick={() => downloadReport("tasks", "xlsx")} type="button">Taches Excel</button>
            </div>
          </section>
        </div>

        {errorMessage && (
          <div className="page-feedback error">
            {errorMessage}
          </div>
        )}

        <section className="activite-recente" style={{ width: "96%", margin: "24px auto" }}>
          <div className="activite-top">
            <h2 className="activite-title">Synthese du service</h2>
            <p className="activite-subtitle">Indicateurs backend calcules sur votre scope chef.</p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 16,
            }}
          >
            {loading ? (
              <div style={{ padding: 16 }}>Chargement des indicateurs...</div>
            ) : (
              cards.map((card) => (
                <div
                  key={card.label}
                  style={summaryCardStyle}
                >
                  <p style={summaryLabelStyle}>{card.label}</p>
                  <h3 style={summaryValueStyle}>{card.value}</h3>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
