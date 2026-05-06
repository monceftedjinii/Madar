import NotificationBell from "../../components/NotificationBell";
import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import Navbar from "../../components/Navbar";
import useDarkModePreference from "../../hooks/useDarkModePreference";
import usePersistentNavState from "../../hooks/usePersistentNavState";
import "../../styles/profile.css";
import "../../styles/main-space.css";

const initialForm = {
  type: "ANNUAL",
  startDate: "",
  endDate: "",
  reason: "",
};

export default function Conge() {
  const [dark, setDark] = useDarkModePreference();
  const [isNavOpen, setIsNavOpen] = usePersistentNavState();
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

  const formatBalanceValue = (item) => {
    if (item.nbrJoursDroit === 0) return "Selon besoin";
    const days = Number(item.joursRestants);
    if (item.nbrJoursDroit >= 365) {
      const years = Math.round(item.nbrJoursDroit / 365);
      return `${years} an${years > 1 ? "s" : ""}`;
    }
    return `${formatDaysValue(days)} jours`;
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
        value: formatBalanceValue(item),
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
        <div
          className={`sticky top-0 z-40 backdrop-blur ${
            dark
              ? "border-b border-slate-800 bg-slate-950/90"
              : "border-b border-slate-200/80 bg-white/90"
          }`}
        >
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
                  {dark ? "mode clair" : "mode sombre"}
                </button>
              <NotificationBell dark={dark} />
            </div>
          </div>
        </div>

        <div className="main-page-stack">
          <section className="main-hero">
            <div className="main-hero-copy">
              <span className="main-eyebrow">Espace principal</span>
              <h2 className="main-hero-title">Gestion plus claire de vos conges</h2>
              <p className="main-hero-description">
                Consultez vos soldes, deposez une nouvelle demande et suivez l'historique des validations sur une seule page.
              </p>
            </div>
            <div className="main-hero-kpis">
              {balancesDisplay.slice(0, 4).map((item) => (
                <article key={item.label} className="main-kpi-card">
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </article>
              ))}
            </div>
          </section>

          {(feedback || errorMessage) && (
            <div className={`page-feedback ${errorMessage ? "error" : ""}`}>
              {errorMessage || feedback}
            </div>
          )}

          <section className="main-panel">
            <div className="main-panel-head">
              <div>
                <h2>{editingRequestId ? "Modifier la demande" : "Nouvelle demande"}</h2>
                <p>
                  {editingRequestId
                    ? "Mettez a jour votre demande en attente."
                    : "Remplissez le formulaire pour envoyer votre demande."}
                </p>
              </div>
              <div className="main-action-pill">Demande</div>
            </div>

            <form onSubmit={onSubmit}>
              <div className="main-form-grid">
                  <label className="main-field">
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

                  <label className="main-field">
                    Date de début
                    <input
                      type="date"
                      name="startDate"
                      value={form.startDate}
                      onChange={onChange}
                      required
                    />
                  </label>

                  <label className="main-field">
                    Date de fin
                    <input
                      type="date"
                      name="endDate"
                      value={form.endDate}
                      onChange={onChange}
                      required
                    />
                  </label>

                  <label className="main-field main-field-wide">
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

                  <label className="main-field main-field-wide">
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

              <div className="main-actions" style={{ marginTop: 18 }}>
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
          </section>

          <div className="main-metrics-grid">
            {balancesDisplay.map((item) => (
              <article key={item.label} className="main-metric-card">
                <span>{item.label}</span>
                <strong>{item.value.replace(" jours", "")}</strong>
                <p>{item.value}</p>
              </article>
            ))}
          </div>

          <section className="main-panel">
            <div className="main-panel-head">
              <div>
                <h2>Historique des demandes</h2>
                <p>Dernieres demandes enregistrees dans le systeme.</p>
              </div>
              <div className="main-action-pill">Historique</div>
            </div>
            <div className="activite-table-scroll">
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
          </section>
        </div>
      </div>
    </div>
  );
}
