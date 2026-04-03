import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import Navbar from "../components/Navbar";
import useDarkModePreference from "../hooks/useDarkModePreference";
import usePersistentNavState from "../hooks/usePersistentNavState";
import "../styles/profile.css";

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("fr-FR");
}

function formatMonth(value) {
  if (!value) return "-";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
}

export default function RhAbsences() {
  const [dark, setDark] = useDarkModePreference();
  const [isNavOpen, setIsNavOpen] = usePersistentNavState();
  const [role, setRole] = useState("");
  const [absences, setAbsences] = useState([]);
  const [flags, setFlags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState(null);
  const [feedback, setFeedback] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const canWarn = ["RH_SIMPLE", "RH_AGENT", "RH_SENIOR", "GRH"].includes(role);

  const fetchData = async () => {
    try {
      setLoading(true);
      setErrorMessage("");
      const [meResponse, absencesResponse, flagsResponse] = await Promise.all([
        axios.get("/api/whoami/"),
        axios.get("/api/absences/yesterday/"),
        axios.get("/api/discipline/flags/"),
      ]);
      setRole(meResponse.data?.role || "");
      setAbsences(Array.isArray(absencesResponse.data) ? absencesResponse.data : []);
      setFlags(Array.isArray(flagsResponse.data) ? flagsResponse.data : []);
    } catch (error) {
      console.error("Erreur chargement absences RH:", error);
      setAbsences([]);
      setFlags([]);
      setErrorMessage("Impossible de charger le module absences RH.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const stats = useMemo(() => {
    const totalFlags = flags.length;
    const totalWarnings = flags.reduce((sum, item) => sum + Number(item.warning_count || 0), 0);
    return {
      absences: absences.length,
      flags: totalFlags,
      warnings: totalWarnings,
    };
  }, [absences, flags]);

  const issueWarning = async (employee) => {
    const comment =
      window.prompt(
        `Commentaire d'avertissement pour ${employee.full_name}`,
        "Absence non justifiee",
      ) ?? "";

    try {
      setActionId(employee.id);
      setFeedback("");
      setErrorMessage("");
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const warningDate = yesterday.toISOString().slice(0, 10);
      const response = await axios.post("/api/warnings/", {
        employee_id: employee.id,
        date: warningDate,
        comment,
      });
      const nextCount = response.data?.warning_count;
      setFeedback(
        nextCount
          ? `Avertissement enregistre. Total du mois: ${nextCount}.`
          : "Avertissement enregistre avec succes.",
      );
      await fetchData();
    } catch (error) {
      console.error("Erreur avertissement RH:", error);
      setErrorMessage(error?.response?.data?.detail || "Impossible d'enregistrer cet avertissement.");
    } finally {
      setActionId(null);
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
              <h1 className="monprofile">Absences RH</h1>
              <p className="morinfo">Suivez les absences d'hier et les avertissements disciplinaires du mois.</p>
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
              <h2 className="title">Absences</h2>
              <p className="desc">Vue RH des absences detectees et des alertes du mois.</p>
            </div>
            <div><p className="desc">Absences d'hier</p><h3>{stats.absences}</h3></div>
            <div><p className="desc">Flags disciplinaires</p><h3>{stats.flags}</h3></div>
            <div><p className="desc">Avertissements cumules</p><h3>{stats.warnings}</h3></div>
          </section>

          <section className="info-pro">
            <div className="top">
              <h2 className="title">Actions</h2>
              <p className="desc">Actualisez les donnees et emettez les avertissements necessaires.</p>
            </div>
            <div><p className="desc">Role</p><h3>{role || "-"}</h3></div>
            <div>
              <p className="desc">Actualisation</p>
              <button className="modifier" onClick={fetchData} type="button">Actualiser</button>
            </div>
          </section>
        </div>

        {(feedback || errorMessage) && (
          <div className={`page-feedback ${errorMessage ? "error" : ""}`}>{errorMessage || feedback}</div>
        )}

        <section className="activite-recente" style={{ width: "96%", margin: "24px auto" }}>
          <div className="activite-top">
            <h2 className="activite-title">Employes absents hier</h2>
            <p className="activite-subtitle">Liste backend des employes sans pointage et sans conge approuve hier.</p>
          </div>

          <div className="activite-table-scroll">
            <table className="activite-table">
              <thead>
                <tr>
                  <th>Employe</th>
                  <th>Service</th>
                  <th>Date concernee</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="4">Chargement des absences...</td></tr>
                ) : absences.length === 0 ? (
                  <tr><td colSpan="4">Aucune absence detectee hier.</td></tr>
                ) : (
                  absences.map((employee) => (
                    <tr key={employee.id}>
                      <td>{employee.full_name}</td>
                      <td>{employee.service || "-"}</td>
                      <td>{formatDate(new Date(Date.now() - 86400000).toISOString().slice(0, 10))}</td>
                      <td>
                        <button
                          className="modifier"
                          disabled={!canWarn || actionId === employee.id}
                          onClick={() => issueWarning(employee)}
                          type="button"
                        >
                          {actionId === employee.id ? "Enregistrement..." : "Avertir"}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="activite-recente" style={{ width: "96%", margin: "24px auto" }}>
          <div className="activite-top">
            <h2 className="activite-title">Flags disciplinaires</h2>
            <p className="activite-subtitle">Employes ayant atteint au moins 3 avertissements sur le mois courant.</p>
          </div>

          <div className="activite-table-scroll">
            <table className="activite-table">
              <thead>
                <tr>
                  <th>Employe</th>
                  <th>Email</th>
                  <th>Mois</th>
                  <th>Avertissements</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="4">Chargement des flags...</td></tr>
                ) : flags.length === 0 ? (
                  <tr><td colSpan="4">Aucun flag disciplinaire ce mois-ci.</td></tr>
                ) : (
                  flags.map((flag) => (
                    <tr key={`${flag.employee_id}-${flag.month}`}>
                      <td>{flag.employee_name || "-"}</td>
                      <td>{flag.employee_email}</td>
                      <td>{formatMonth(flag.month)}</td>
                      <td>
                        <span className="badge badge-refuse">{flag.warning_count}</span>
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
  );
}
