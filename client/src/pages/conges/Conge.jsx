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
  const [cancelModal, setCancelModal] = useState(null); // holds the request to cancel

  const fetchData = async () => {
    try {
      const t = Date.now();
      const [typesRes, balancesRes, leavesRes] = await Promise.all([
        axios.get("/api/leave-types/", { params: { _t: t } }),
        axios.get("/api/leaves/balances/", { params: { _t: t } }),
        axios.get("/api/leaves/me/", { params: { _t: t } }),
      ]);
      setLeaveTypes(typesRes.data);
      setBalances(balancesRes.data);
      setRequests(Array.isArray(leavesRes.data) ? leavesRes.data : []);
    } catch (err) {
      console.error("Error fetching leave data:", err);
    }
  };

  useEffect(() => {
    fetchData();
    const onVisible = () => { if (document.visibilityState === "visible") fetchData(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
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

  // Annual leave balance info derived from balances
  const annualBalance = useMemo(
    () => balances.find((b) => b.type_code === "CA"),
    [balances],
  );

  // Active accepted annual leave (ongoing vacation — employee is currently on leave)
  const activeAcceptedAnnual = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return requests.find((r) => {
      if (r.type !== "CA" && r.type_code !== "CA") return false;
      if (r.status !== "ACCEPTED") return false;
      const end = new Date(`${r.end_date}T00:00:00`);
      return end >= today;
    }) || null;
  }, [requests]);

  const validateForm = () => {
    // Block new annual leave if employee is currently on an accepted annual leave
    if (form.type === "CA" && activeAcceptedAnnual) {
      const returnDate = new Date(`${activeAcceptedAnnual.end_date}T00:00:00`);
      returnDate.setDate(returnDate.getDate() + 1);
      setFeedback("");
      setErrorMessage(
        `Vous êtes en congé annuel jusqu'au ${formatIsoDateLabel(activeAcceptedAnnual.end_date)}. Vous pourrez soumettre une nouvelle demande à partir du ${returnDate.toLocaleDateString("fr-FR")}.`
      );
      return false;
    }

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

    // Annual leave 2-split rule (front-end guard)
    if (form.type === "CA" && annualBalance && form.startDate && form.endDate) {
      const fractionsUsed = annualBalance.annual_fractions_used ?? 0;
      const daysRemaining = annualBalance.annual_days_remaining ?? 30;
      const requested =
        Math.round(
          Math.abs(new Date(`${form.endDate}T00:00:00`) - new Date(`${form.startDate}T00:00:00`)) /
            86400000,
        ) + 1;

      if (fractionsUsed >= 2) {
        setErrorMessage("Vous avez déjà utilisé vos 2 fractions de congé annuel pour cette année.");
        return false;
      }
      if (fractionsUsed === 1 && requested !== daysRemaining) {
        setErrorMessage(
          `2ème fraction : vous devez demander exactement ${daysRemaining} jour(s) restant(s) (ni plus, ni moins).`,
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
      } else if (errorData?.code === "ANNUAL_EXACT_REMAINING") {
        setErrorMessage(
          `2ème fraction : vous devez demander exactement ${errorData.days_remaining} jour(s) restant(s).`,
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

  const cancelPendingRequest = (requestId) => {
    const req = requests.find(r => r.id === requestId);
    setCancelModal(req || { id: requestId });
  };

  const confirmCancel = async () => {
    if (!cancelModal) return;
    try {
      setFeedback("");
      setErrorMessage("");
      await axios.post(`/api/leaves/${cancelModal.id}/cancel/`);
      if (editingRequestId === cancelModal.id) resetFormState();
      setCancelModal(null);
      await fetchData();
      setFeedback("Demande de congé annulée avec succès.");
    } catch (err) {
      console.error("Error canceling leave request:", err);
      setCancelModal(null);
      setErrorMessage(err?.response?.data?.detail || "Erreur lors de l'annulation de la demande.");
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
    <>
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

            {activeAcceptedAnnual && form.type === "CA" && (() => {
              const returnDate = new Date(`${activeAcceptedAnnual.end_date}T00:00:00`);
              returnDate.setDate(returnDate.getDate() + 1);
              return (
                <div style={{ margin: "0 0 14px", padding: "14px 18px", borderRadius: 14, background: "#fffbeb", border: "1px solid #fde047", display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <span style={{ fontSize: 20, flexShrink: 0 }}>🏖️</span>
                  <div>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: "#92400e" }}>Congé annuel en cours</p>
                    <p style={{ margin: "3px 0 0", fontSize: 12, color: "#78350f" }}>
                      Votre congé se termine le <strong>{formatIsoDateLabel(activeAcceptedAnnual.end_date)}</strong>. Vous pourrez soumettre une nouvelle demande à partir du <strong>{returnDate.toLocaleDateString("fr-FR")}</strong>.
                    </p>
                  </div>
                </div>
              );
            })()}

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

                  {form.type === "CA" && annualBalance && (() => {
                    const used = annualBalance.annual_fractions_used ?? 0;
                    const remaining = annualBalance.annual_days_remaining ?? 30;
                    const total = annualBalance.nbrJoursDroit ?? 30;
                    if (used >= 2) return (
                      <div style={{ gridColumn: "1/-1", background: "#fee2e2", border: "1px solid #fca5a5", borderRadius: 12, padding: "10px 14px", fontSize: 13, color: "#991b1b", fontWeight: 600 }}>
                        Vous avez déjà utilisé vos 2 fractions de congé annuel pour cette année. Aucune nouvelle demande possible.
                      </div>
                    );
                    if (used === 1) return (
                      <div style={{ gridColumn: "1/-1", background: "#fef9c3", border: "1px solid #fde047", borderRadius: 12, padding: "10px 14px", fontSize: 13, color: "#713f12", fontWeight: 600 }}>
                        2ème fraction : vous devez demander exactement <strong>{remaining} jour(s)</strong> (solde restant sur {total} jours).
                      </div>
                    );
                    return (
                      <div style={{ gridColumn: "1/-1", background: "#eff6ff", border: "1px solid #93c5fd", borderRadius: 12, padding: "10px 14px", fontSize: 13, color: "#1e40af" }}>
                        Congé annuel : vous pouvez prendre tout ou une partie ({total} jours). Maximum <strong>2 fractions</strong> par an. La 2ème fraction devra couvrir exactement le solde restant.
                      </div>
                    );
                  })()}

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
                  <th>Commentaire RH</th>
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
                      {item.chef_comment ? (
                        <div style={{ display: "flex", alignItems: "flex-start", gap: 6 }}>
                          <span style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }}>💬</span>
                          <span style={{ fontSize: 12, color: item.status === "REFUSED" ? "#dc2626" : "#16a34a", fontWeight: 600, fontStyle: "italic" }}>
                            {item.chef_comment}
                          </span>
                        </div>
                      ) : (
                        <span style={{ fontSize: 12, color: "#94a3b8" }}>—</span>
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

    {/* Cancel confirmation modal */}
    {cancelModal && (
      <div style={{
        position: "fixed", inset: 0, zIndex: 700,
        background: "rgba(15,23,42,0.55)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
      }} onClick={() => setCancelModal(null)}>
        <div style={{
          background: dark ? "#0f172a" : "#fff",
          borderRadius: 24, width: "100%", maxWidth: 440,
          boxShadow: "0 24px 64px rgba(0,0,0,0.28)",
          border: `1px solid ${dark ? "#1e293b" : "#e2e8f0"}`,
          overflow: "hidden",
        }} onClick={e => e.stopPropagation()}>

          {/* Header */}
          <div style={{
            padding: "22px 24px 0",
            display: "flex", alignItems: "flex-start", gap: 14,
          }}>
            <div style={{
              width: 44, height: 44, borderRadius: "50%", flexShrink: 0,
              background: "#fee2e2", display: "flex", alignItems: "center",
              justifyContent: "center", fontSize: 20,
            }}>🗑️</div>
            <div>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 900, color: dark ? "#f1f5f9" : "#0f172a" }}>
                Annuler la demande
              </h3>
              <p style={{ margin: "4px 0 0", fontSize: 13, color: "#94a3b8" }}>
                Cette action est irréversible.
              </p>
            </div>
          </div>

          {/* Body */}
          <div style={{ padding: "18px 24px" }}>
            <div style={{
              borderRadius: 14, padding: "12px 16px",
              background: dark ? "#1e293b" : "#f8fafc",
              border: `1px solid ${dark ? "#334155" : "#e2e8f0"}`,
            }}>
              <p style={{ margin: 0, fontSize: 13, color: dark ? "#94a3b8" : "#64748b" }}>Type de congé</p>
              <p style={{ margin: "3px 0 0", fontSize: 14, fontWeight: 700, color: dark ? "#f1f5f9" : "#0f172a" }}>
                {cancelModal.type_label || cancelModal.type || "Congé"}
              </p>
              {cancelModal.start_date && (
                <>
                  <p style={{ margin: "8px 0 0", fontSize: 13, color: dark ? "#94a3b8" : "#64748b" }}>Période</p>
                  <p style={{ margin: "3px 0 0", fontSize: 14, fontWeight: 700, color: dark ? "#f1f5f9" : "#0f172a" }}>
                    {formatDate(cancelModal.start_date)} → {formatDate(cancelModal.end_date)}
                  </p>
                </>
              )}
            </div>
            <p style={{ margin: "14px 0 0", fontSize: 13, color: dark ? "#94a3b8" : "#64748b" }}>
              Voulez-vous vraiment annuler cette demande ? Elle sera supprimée définitivement.
            </p>
          </div>

          {/* Actions */}
          <div style={{
            padding: "12px 24px 20px",
            display: "flex", gap: 10, justifyContent: "flex-end",
            borderTop: `1px solid ${dark ? "#1e293b" : "#f1f5f9"}`,
          }}>
            <button type="button" onClick={() => setCancelModal(null)}
              style={{ padding: "10px 22px", borderRadius: 12, border: `1.5px solid ${dark ? "#334155" : "#e2e8f0"}`, background: "transparent", fontWeight: 700, fontSize: 14, cursor: "pointer", color: dark ? "#94a3b8" : "#64748b" }}>
              Garder
            </button>
            <button type="button" onClick={confirmCancel}
              style={{ padding: "10px 22px", borderRadius: 12, border: "none", background: "linear-gradient(135deg,#ef4444,#dc2626)", color: "#fff", fontWeight: 800, fontSize: 14, cursor: "pointer", boxShadow: "0 4px 14px rgba(239,68,68,0.35)" }}>
              Oui, annuler
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
