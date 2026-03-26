import React, { useEffect, useMemo, useState } from "react";
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
  const [errorMessage, setErrorMessage] = useState("");
  const [editingRequestId, setEditingRequestId] = useState(null);

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

  const selectedLeaveType = useMemo(
    () => leaveTypes.find((item) => item.code === form.type),
    [form.type, leaveTypes],
  );

  const resetFormState = () => {
    setForm({ ...initialForm, type: leaveTypes[0]?.code || "ANNUAL" });
    setSelectedAttachment(null);
    setEditingRequestId(null);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    const date = new Date(`${dateStr}T00:00:00`);
    return date.toLocaleDateString("fr-FR");
  };

  const formatIsoDateLabel = (dateStr) => {
    if (!dateStr) return "";
    const date = new Date(`${dateStr}T00:00:00`);
    if (Number.isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString("fr-FR");
  };

  const formatDaysValue = (value) => {
    const numericValue = Number(value);
    if (Number.isNaN(numericValue)) return value;
    return Number.isInteger(numericValue) ? String(numericValue) : String(value);
  };

  const calculateDays = (startDate, endDate) => {
    if (!startDate || !endDate) return "-";
    const start = new Date(`${startDate}T00:00:00`);
    const end = new Date(`${endDate}T00:00:00`);
    const diffTime = Math.abs(end - start);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  };

  const getStatusLabel = (status) => {
    const statusMap = {
      PENDING: "En attente",
      ACCEPTED: "Accepté",
      REFUSED: "Refusé",
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
    setErrorMessage("");
    setFeedback("");
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const validateForm = () => {
    if (selectedLeaveType?.requires_attachment && !selectedAttachment) {
      setFeedback("");
      setErrorMessage("Un justificatif est obligatoire pour ce type de congé.");
      return false;
    }

    if (selectedLeaveType?.notice_days && form.startDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const startDate = new Date(`${form.startDate}T00:00:00`);
      const diffTime = startDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays < selectedLeaveType.notice_days) {
        const earliestDate = new Date(today);
        earliestDate.setDate(today.getDate() + selectedLeaveType.notice_days);
        setFeedback("");
        setErrorMessage(
          `Ce type de congé demande un préavis de ${selectedLeaveType.notice_days} jour(s). La première date possible est le ${earliestDate.toLocaleDateString("fr-FR")}.`,
        );
        return false;
      }
    }

    if (form.endDate < form.startDate) {
      setFeedback("");
      setErrorMessage(
        "La date de fin doit être supérieure ou égale à la date de début.",
      );
      return false;
    }

    return true;
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    if (!form.startDate || !form.endDate || !form.reason.trim()) return;
    if (!validateForm()) return;

    try {
      setIsSubmitting(true);
      setFeedback("");
      setErrorMessage("");

      const payload = new FormData();
      payload.append("type", form.type);
      payload.append("start_date", form.startDate);
      payload.append("end_date", form.endDate);
      payload.append("reason", form.reason);

      if (selectedAttachment) {
        payload.append("attachment", selectedAttachment);
      }

      if (editingRequestId) {
        await axios.patch(`/api/leaves/${editingRequestId}/update/`, payload, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        setFeedback("Demande de congé modifiée avec succès.");
      } else {
        await axios.post("/api/leaves/", payload, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        setFeedback("Demande de congé envoyée avec succès.");
      }

      await fetchData();
      resetFormState();
    } catch (err) {
      console.error("Error submitting leave request:", err);
      const errorData = err?.response?.data;

      if (errorData?.code === "NOTICE_PERIOD_NOT_RESPECTED") {
        const earliestDate = formatIsoDateLabel(errorData.earliest_start_date);
        setErrorMessage(
          `Préavis non respecté: ${errorData.required_notice_days} jour(s) requis.${earliestDate ? ` Première date possible: ${earliestDate}.` : ""}`,
        );
      } else {
        setErrorMessage(
          errorData?.detail || "Erreur lors de l'envoi de la demande.",
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const startEditingRequest = (requestItem) => {
    setFeedback("");
    setErrorMessage("");
    setEditingRequestId(requestItem.id);
    setSelectedAttachment(null);
    setForm({
      type: requestItem.type,
      startDate: requestItem.start_date,
      endDate: requestItem.end_date,
      reason: requestItem.reason || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelEditing = () => {
    setFeedback("");
    setErrorMessage("");
    resetFormState();
  };

  const cancelPendingRequest = async (requestId) => {
    const confirmed = window.confirm(
      "Voulez-vous vraiment annuler cette demande de congé ?",
    );
    if (!confirmed) return;

    try {
      setFeedback("");
      setErrorMessage("");
      await axios.post(`/api/leaves/${requestId}/cancel/`);
      if (editingRequestId === requestId) {
        resetFormState();
      }
      await fetchData();
      setFeedback("Demande de congé annulée avec succès.");
    } catch (err) {
      console.error("Error canceling leave request:", err);
      setErrorMessage(
        err?.response?.data?.detail ||
          "Erreur lors de l'annulation de la demande.",
      );
    }
  };

  const balancesDisplay = useMemo(() => {
    if (balances.length > 0) {
      return balances.map((item) => ({
        label: item.type_label || item.type_code,
        value: `${formatDaysValue(item.joursRestants)} jours`,
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
              <h3 className="monprofile">Gestion des congés</h3>
              <p className="morinfo">
                Demande, suivi et historique des congés
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
                  Consultez vos soldes et déposez une nouvelle demande de congé.
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
                <h3 className="title">
                  {editingRequestId
                    ? "Modifier la demande"
                    : "Nouvelle demande"}
                </h3>
                <p className="desc">
                  {editingRequestId
                    ? "Mettez à jour votre demande en attente."
                    : "Remplissez le formulaire pour envoyer votre demande"}
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

              {errorMessage && (
                <div
                  style={{
                    padding: "12px 22px 0",
                    color: "#b91c1c",
                    fontWeight: 600,
                  }}
                >
                  {errorMessage}
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
                    Type de congé
                    <select name="type" value={form.type} onChange={onChange}>
                      {leaveTypes.map((lt) => (
                        <option key={lt.code} value={lt.code}>
                          {lt.label}
                        </option>
                      ))}
                    </select>
                    {selectedLeaveType?.notice_days > 0 && (
                      <span style={{ fontSize: 12, color: "#1d4ed8" }}>
                        Préavis requis: {selectedLeaveType.notice_days} jour(s).
                      </span>
                    )}
                  </label>

                  <label>
                    Date de début
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
                      placeholder="Ex: congé familial"
                      required
                    />
                  </label>

                  <label style={{ gridColumn: "1 / -1" }}>
                    Justificatif
                    <input
                      type="file"
                      name="attachment"
                      onChange={(event) => {
                        setErrorMessage("");
                        setFeedback("");
                        setSelectedAttachment(event.target.files?.[0] || null);
                      }}
                    />
                    {selectedLeaveType?.requires_attachment && (
                      <span style={{ fontSize: 12, color: "#b45309" }}>
                        Ce type de congé nécessite un justificatif.
                      </span>
                    )}
                  </label>
                </div>

                <div
                  className="profile-edit-actions"
                  style={{ display: "flex", gap: 12, flexWrap: "wrap" }}
                >
                  <button
                    className="btn-save"
                    type="submit"
                    disabled={isSubmitting}
                  >
                    {isSubmitting
                      ? "Envoi..."
                      : editingRequestId
                        ? "Enregistrer les modifications"
                        : "Envoyer la demande"}
                  </button>
                  {editingRequestId && (
                    <button
                      type="button"
                      className="btn-save"
                      onClick={cancelEditing}
                      style={{ background: "#475569" }}
                    >
                      Annuler la modification
                    </button>
                  )}
                </div>
              </form>
            </div>

            <div className="info-pro">
              <div className="top">
                <h3 className="title">Soldes de congés</h3>
                <p className="desc">État courant de vos droits</p>
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
                Dernières demandes enregistrées
              </p>
            </div>
            <table className="activite-table">
              <thead>
                <tr>
                  <th>Période</th>
                  <th>Type</th>
                  <th>Jours</th>
                  <th>Statut</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((item) => (
                  <tr key={item.id}>
                    <td>
                      {formatDate(item.start_date)} - {formatDate(item.end_date)}
                    </td>
                    <td>{item.type_label || item.type}</td>
                    <td>{calculateDays(item.start_date, item.end_date)}</td>
                    <td>
                      <span className={`badge ${getStatusClass(item.status)}`}>
                        {getStatusLabel(item.status)}
                      </span>
                    </td>
                    <td>
                      {item.status === "PENDING" ? (
                        <div
                          style={{
                            display: "flex",
                            gap: 8,
                            flexWrap: "wrap",
                          }}
                        >
                          <button
                            type="button"
                            className="btn-save"
                            style={{
                              padding: "8px 12px",
                              fontSize: 13,
                              background: "#2563eb",
                            }}
                            onClick={() => startEditingRequest(item)}
                          >
                            Modifier
                          </button>
                          <button
                            type="button"
                            className="btn-save"
                            style={{
                              padding: "8px 12px",
                              fontSize: 13,
                              background: "#dc2626",
                            }}
                            onClick={() => cancelPendingRequest(item.id)}
                          >
                            Annuler
                          </button>
                        </div>
                      ) : (
                        <span style={{ color: "#64748b", fontSize: 13 }}>
                          Aucune action
                        </span>
                      )}
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
