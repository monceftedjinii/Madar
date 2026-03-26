import React, { useMemo, useState, useEffect } from "react";
import axios from "axios";
import Navbar from "../../components/Navbar";
import useDarkModePreference from "../../hooks/useDarkModePreference";
import "../../styles/profile.css";

const initialForm = {
  type: "ANNUAL",
  startDate: "",
  endDate: "",
  reason: "",
};

export default function Conge() {
  const [dark, setDark] = useDarkModePreference();
  const [isNavOpen, setIsNavOpen] = useState(true);
  const [form, setForm] = useState(initialForm);
  const [requests, setRequests] = useState([]);
  const [balances, setBalances] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [selectedAttachment, setSelectedAttachment] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState("");

  const fetchData = async () => {
    try {
      const typesRes = await axios.get("/api/leave-types/");
      setLeaveTypes(typesRes.data);

      const balancesRes = await axios.get("/api/leaves/balances/");
      setBalances(balancesRes.data);

      const leavesRes = await axios.get("/api/leaves/me/");
      setRequests(leavesRes.data);
    } catch (err) {
      console.error("Error fetching leave data:", err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    return date.toLocaleDateString("fr-FR");
  };

  const calculateDays = (startDate, endDate) => {
    if (!startDate || !endDate) return "-";
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  const getStatusLabel = (status) => {
    const statusMap = {
      PENDING: "En attente",
      ACCEPTED: "Accepté",
      REFUSED: "Refused",
    };
    return statusMap[status] || status;
  };

  const getStatusClass = (status) => {
    return status === "PENDING"
      ? "badge-attente"
      : status === "ACCEPTED"
        ? "badge-termine"
        : "badge-refuse";
  };

  const onChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    if (!form.startDate || !form.endDate || !form.reason.trim()) return;
    const currentType = leaveTypes.find((item) => item.code === form.type);

    if (currentType?.requires_attachment && !selectedAttachment) {
      alert("Un justificatif est obligatoire pour ce type de congé.");
      return;
    }

    try {
      setIsSubmitting(true);
      setFeedback("");
      const payload = new FormData();
      payload.append("type", form.type);
      payload.append("start_date", form.startDate);
      payload.append("end_date", form.endDate);
      payload.append("reason", form.reason);
      if (selectedAttachment) {
        payload.append("attachment", selectedAttachment);
      }

      await axios.post("/api/leaves/", payload, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      await fetchData();
      setForm({ ...initialForm, type: leaveTypes[0]?.code || "ANNUAL" });
      setSelectedAttachment(null);
      setFeedback("Demande de congé envoyée avec succès.");
    } catch (err) {
      console.error("Error submitting leave request:", err);
      const errorMessage =
        err?.response?.data?.detail || "Erreur lors de l'envoi de la demande";
      alert(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const balancesDisplay = useMemo(() => {
    if (balances.length > 0) {
      return balances.map((item) => ({
        label: item.type_label || item.type_code,
        value: `${item.joursRestants} jours`,
      }));
    }
    return [
      { label: "Solde annuel", value: "0 jours" },
      { label: "Congé maladie", value: "0 jours" },
      { label: "Congé sans solde", value: "0 jours" },
    ];
  }, [balances]);

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

      <div className="profile-content">
        <div style={{ borderBottom: "1px solid rgba(0, 0, 0, 0.1)" }}>
          <div className="profile-naaav">
            <div className="yasar">
              <h3 className="monprofile">Gestion des conges</h3>
              <p className="morinfo">Demande, suivi et historique des conges</p>
            </div>
            <div className="yamin">
              <button
                className="nav-toggle"
                onClick={() => setIsNavOpen((prev) => !prev)}
                type="button"
              >
                {isNavOpen ? "Masquer menu" : "Afficher menu"}
              </button>
              <button
                className="mode"
                onClick={() => setDark((prev) => !prev)}
                type="button"
              >
                {dark ? " mode clair" : " mode sombre"}
              </button>
            </div>
          </div>
        </div>

        <div className="profile-infos">
          <div className="quelques-infos">
            <div className="gauche">
              <div className="infooos">
                <div className="nom-status">
                  <h3>Vue rapide</h3>
                  <div className="status">Actif</div>
                </div>
                <p>
                  Consultez vos soldes et deposez une nouvelle demande de conge.
                </p>
                <div>
                  {balancesDisplay.map((item) => (
                    <div key={item.label}>
                      {item.label}: {item.value}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="infopro-infoper">
            <div className="info-per">
              <div className="top">
                <h3 className="title">Nouvelle demande</h3>
                <p className="desc">
                  Remplissez le formulaire pour envoyer votre demande
                </p>
              </div>
              {feedback && (
                <div
                  style={{
                    padding: "12px 22px 0",
                    color: "#15803d",
                    fontWeight: 600,
                  }}
                >
                  {feedback}
                </div>
              )}

              <form
                className="profile-edit-form"
                style={{ padding: "12px 22px 18px" }}
                onSubmit={onSubmit}
              >
                <div
                  className="profile-edit-grid"
                  style={{ gridTemplateColumns: "1fr 1fr" }}
                >
                  <label>
                    Type de conge
                    <select name="type" value={form.type} onChange={onChange}>
                      {leaveTypes.map((lt) => (
                        <option key={lt.code} value={lt.code}>
                          {lt.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Date de debut
                    <input
                      type="date"
                      name="startDate"
                      value={form.startDate}
                      onChange={onChange}
                      required
                    />
                  </label>
                  <label>
                    Date de fin
                    <input
                      type="date"
                      name="endDate"
                      value={form.endDate}
                      onChange={onChange}
                      required
                    />
                  </label>
                  <label style={{ gridColumn: "1 / -1" }}>
                    Motif
                    <input
                      type="text"
                      name="reason"
                      value={form.reason}
                      onChange={onChange}
                      placeholder="Ex: conge familial"
                      required
                    />
                  </label>
                  <label style={{ gridColumn: "1 / -1" }}>
                    Justificatif
                    <input
                      type="file"
                      name="attachment"
                      onChange={(event) =>
                        setSelectedAttachment(event.target.files?.[0] || null)
                      }
                    />
                    {leaveTypes.find((item) => item.code === form.type)
                      ?.requires_attachment && (
                      <span style={{ fontSize: 12, color: "#b45309" }}>
                        Ce type de congé nécessite un justificatif.
                      </span>
                    )}
                  </label>
                </div>
                <div className="profile-edit-actions">
                  <button
                    className="btn-save"
                    type="submit"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Envoi..." : "Envoyer la demande"}
                  </button>
                </div>
              </form>
            </div>

            <div className="info-pro">
              <div className="top">
                <h3 className="title">Soldes de conges</h3>
                <p className="desc">Etat courant de vos droits</p>
              </div>
              {balancesDisplay.map((item) => (
                <div key={item.label}>
                  <p className="desc">{item.label}</p>
                  <h3>{item.value}</h3>
                </div>
              ))}
            </div>
          </div>

          <div className="activite-recente">
            <div className="activite-top">
              <h3 className="activite-title">Historique des demandes</h3>
              <p className="activite-subtitle">
                Dernieres demandes enregistrees
              </p>
            </div>
            <table className="activite-table">
              <thead>
                <tr>
                  <th>Periode</th>
                  <th>Type</th>
                  <th>Jours</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((item) => (
                  <tr key={item.id}>
                    <td>
                      {formatDate(item.start_date)} -{" "}
                      {formatDate(item.end_date)}
                    </td>
                    <td>{item.type_label || item.type}</td>
                    <td>{calculateDays(item.start_date, item.end_date)}</td>
                    <td>
                      <span className={`badge ${getStatusClass(item.status)}`}>
                        {getStatusLabel(item.status)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
