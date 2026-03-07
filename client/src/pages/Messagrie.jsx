import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import SearchIcon from "@mui/icons-material/Search";
import Navbar from "../components/Navbar";
import "../styles/profile.css";
import "../styles/messagrie.css";

const INITIAL_COMPOSE_FORM = {
  draftId: null,
  recipientId: "",
  subject: "",
  message: "",
};

const getInitials = (value = "") => {
  const words = value.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[1][0]}`.toUpperCase();
};

const getTag = (subject = "", body = "") => {
  const text = `${subject} ${body}`.toLowerCase();
  if (text.includes("urgent") || text.includes("important")) return "Urgent";
  if (text.includes("rh")) return "RH";
  return "Info";
};

const formatTime = (createdAt) => {
  if (!createdAt) return "-";
  const date = new Date(createdAt);
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  if (date.toDateString() === yesterday.toDateString()) {
    return "Hier";
  }
  return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
};

const formatDay = (createdAt) => {
  if (!createdAt) return "";
  return new Date(createdAt).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
};

const toUiMail = (mail, boxType) => {
  if (boxType === "drafts") {
    const recipientName = mail.recipient?.name || mail.recipient?.email || "Sans destinataire";
    return {
      id: mail.id,
      initials: getInitials(recipientName),
      sender: "Brouillon",
      from: "Vous",
      to: recipientName,
      department: "Brouillon",
      subject: mail.subject || "(Sans objet)",
      preview: (mail.body || "").slice(0, 90),
      body: mail.body || "",
      time: formatTime(mail.updated_at || mail.created_at),
      day: formatDay(mail.updated_at || mail.created_at),
      unread: false,
      important: false,
      tag: "Info",
      is_read: true,
      created_at: mail.updated_at || mail.created_at,
      isDraft: true,
      recipientId: mail.recipient?.id || "",
      hasRepliedByMe: false,
      isImportantForMe: false,
    };
  }

  return {
    id: mail.id,
    initials: getInitials(mail.sender?.name || mail.sender?.email || ""),
    sender: mail.sender?.name || mail.sender?.email || "Inconnu",
    from: mail.sender?.email || "",
    to: mail.recipient?.email || "",
    department: mail.sender?.name || "Service",
    subject: mail.subject || "(Sans objet)",
    preview: (mail.body || "").slice(0, 90),
    body: mail.body || "",
    time: formatTime(mail.created_at),
    day: formatDay(mail.created_at),
    unread: !mail.is_read && boxType === "inbox",
    important: Boolean(mail.is_important_for_me),
    tag: getTag(mail.subject, mail.body),
    is_read: Boolean(mail.is_read),
    created_at: mail.created_at,
    isDraft: false,
    recipientId: mail.recipient?.id || "",
    hasRepliedByMe: Boolean(mail.has_replied_by_me),
    isImportantForMe: Boolean(mail.is_important_for_me),
  };
};

export default function Messagrie() {
  const [dark, setDark] = useState(false);
  const [isNavOpen, setIsNavOpen] = useState(true);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [boxType, setBoxType] = useState("inbox");
  const [selectedId, setSelectedId] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [composeForm, setComposeForm] = useState(INITIAL_COMPOSE_FORM);
  const [recipients, setRecipients] = useState([]);
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pageError, setPageError] = useState("");
  const [composeError, setComposeError] = useState("");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const access = localStorage.getItem("access_token");

  const authHeaders = useMemo(
    () => ({
      headers: {
        Authorization: `Bearer ${access}`,
      },
    }),
    [access],
  );

  const loadRecipients = useCallback(async () => {
    try {
      const response = await axios.get("/api/employees/?for_messaging=true", authHeaders);
      const validRecipients = (response.data || []).filter(
        (recipient) => recipient.user_id !== undefined && recipient.user_id !== null,
      );
      setRecipients(validRecipients);
    } catch (error) {
      console.error("Erreur chargement destinataires:", error);
    }
  }, [authHeaders]);

  const loadBox = useCallback(async (targetBox = boxType) => {
    try {
      setLoading(true);
      setPageError("");

      if (targetBox === "sent") {
        const response = await axios.get("/api/messages/sent/?page=1", authHeaders);
        const data = (response.data?.messages || []).map((mail) => toUiMail(mail, "sent"));
        setEmails(data);
      } else if (targetBox === "trash") {
        const response = await axios.get("/api/messages/trash/?page=1", authHeaders);
        const data = (response.data?.messages || []).map((mail) => toUiMail(mail, "trash"));
        setEmails(data);
      } else if (targetBox === "drafts") {
        const response = await axios.get("/api/messages/drafts/", authHeaders);
        const data = (response.data?.drafts || []).map((mail) => toUiMail(mail, "drafts"));
        setEmails(data);
      } else {
        const response = await axios.get("/api/messages/inbox/?page=1", authHeaders);
        const data = (response.data?.messages || []).map((mail) => toUiMail(mail, "inbox"));
        setEmails(data);
      }
    } catch (error) {
      console.error("Erreur chargement messagerie:", error);
      setEmails([]);
      const statusCode = error?.response?.status;
      const backendDetail =
        error?.response?.data?.detail ||
        error?.response?.data?.error ||
        (typeof error?.response?.data === "string" ? error.response.data : "");
      setPageError(
        backendDetail || `Impossible de charger les messages depuis le serveur (HTTP ${statusCode || "?"}).`,
      );
    } finally {
      setLoading(false);
    }
  }, [authHeaders, boxType]);

  useEffect(() => {
    loadRecipients();
  }, [loadRecipients]);

  useEffect(() => {
    loadBox(boxType);
    setSelectedId(null);
    setReplyText("");
  }, [boxType, loadBox]);

  const filteredEmails = useMemo(() => {
    const term = search.trim().toLowerCase();

    return emails.filter((mail) => {
      const byFilter =
        activeFilter === "all" ||
        (activeFilter === "unread" && mail.unread) ||
        (activeFilter === "important" && mail.important);

      const bySearch =
        term.length === 0 ||
        mail.subject.toLowerCase().includes(term) ||
        mail.sender.toLowerCase().includes(term) ||
        mail.preview.toLowerCase().includes(term);

      return byFilter && bySearch;
    });
  }, [emails, search, activeFilter]);

  useEffect(() => {
    if (!selectedId && filteredEmails[0]) {
      setSelectedId(filteredEmails[0].id);
      return;
    }
    if (selectedId && !filteredEmails.some((mail) => mail.id === selectedId)) {
      setSelectedId(filteredEmails[0]?.id || null);
    }
  }, [filteredEmails, selectedId]);

  const selectedEmail =
    filteredEmails.find((mail) => mail.id === selectedId) || filteredEmails[0] || null;

  const openCompose = () => {
    setComposeError("");
    setComposeForm(INITIAL_COMPOSE_FORM);
    setIsComposeOpen(true);
  };

  const closeCompose = () => {
    setIsComposeOpen(false);
    setComposeError("");
  };

  const switchBox = (nextBox) => {
    setActiveFilter("all");
    setSearch("");
    setBoxType(nextBox);
  };

  const onComposeFieldChange = (e) => {
    const { name, value } = e.target;
    setComposeForm((prev) => ({ ...prev, [name]: value }));
  };

  const onComposeSubmit = async (e) => {
    e.preventDefault();
    setComposeError("");

    if (!composeForm.recipientId) {
      setComposeError("Selectionnez un destinataire.");
      return;
    }

    try {
      setSaving(true);
      const formData = new FormData();
      formData.append("recipient_id", composeForm.recipientId);
      formData.append("subject", composeForm.subject.trim());
      formData.append("body", composeForm.message.trim());

      await axios.post("/api/messages/send/", formData, authHeaders);
      closeCompose();
      setComposeForm(INITIAL_COMPOSE_FORM);
      if (boxType !== "sent") {
        setBoxType("sent");
      } else {
        loadBox("sent");
      }
    } catch (error) {
      console.error("Erreur envoi message:", error);
      setComposeError(error?.response?.data?.detail || "Echec de l'envoi du message.");
    } finally {
      setSaving(false);
    }
  };

  const onSaveDraft = async () => {
    setComposeError("");
    const hasContent = composeForm.subject.trim() || composeForm.message.trim();
    if (!hasContent) {
      setComposeError("Ajoutez un objet ou un message pour enregistrer le brouillon.");
      return;
    }

    try {
      setSaving(true);
      await axios.post(
        "/api/messages/save-draft/",
        {
          id: composeForm.draftId || undefined,
          recipient_id: composeForm.recipientId || null,
          subject: composeForm.subject.trim(),
          body: composeForm.message.trim(),
        },
        authHeaders,
      );
      closeCompose();
      setComposeForm(INITIAL_COMPOSE_FORM);
      setFeedbackMessage("Brouillon enregistre.");
      if (boxType !== "drafts") {
        switchBox("drafts");
      } else {
        loadBox("drafts");
      }
    } catch (error) {
      console.error("Erreur enregistrement brouillon:", error);
      setComposeError(error?.response?.data?.detail || "Impossible d'enregistrer le brouillon.");
    } finally {
      setSaving(false);
    }
  };

  const handleSelectMessage = async (mailId) => {
    setSelectedId(mailId);

    if (boxType !== "inbox") return;
    const current = emails.find((item) => item.id === mailId);
    if (!current || current.is_read) return;

    try {
      const response = await axios.get(`/api/messages/${mailId}/`, authHeaders);
      const refreshed = toUiMail(response.data, "inbox");
      setEmails((prev) => prev.map((item) => (item.id === mailId ? refreshed : item)));
    } catch (error) {
      console.error("Erreur ouverture message:", error);
    }
  };

  const handleReply = async () => {
    if (!selectedEmail || !replyText.trim()) return;

    try {
      setSaving(true);
      const formData = new FormData();
      formData.append("body", replyText.trim());
      await axios.post(`/api/messages/${selectedEmail.id}/reply/`, formData, authHeaders);
      setReplyText("");
      if (boxType !== "sent") {
        setBoxType("sent");
      } else {
        loadBox("sent");
      }
    } catch (error) {
      console.error("Erreur reponse message:", error);
      alert(error?.response?.data?.detail || "Impossible d'envoyer la reponse.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleImportant = async () => {
    if (!selectedEmail || boxType === "drafts") return;
    const nextValue = !selectedEmail.isImportantForMe;

    try {
      setEmails((prev) =>
        prev.map((item) =>
          item.id === selectedEmail.id
            ? {
                ...item,
                isImportantForMe: nextValue,
                important: nextValue,
                tag: nextValue ? "Urgent" : getTag(item.subject, item.body),
              }
            : item,
        ),
      );
    } catch (error) {
      console.error("Erreur important:", error);
      alert(error?.response?.data?.detail || "Impossible de modifier l'etat Important.");
    }
  };

  const handleDeleteSelected = async () => {
    if (!selectedEmail) return;
    const confirmMsg =
      boxType === "drafts"
        ? "Supprimer ce brouillon ?"
        : "Supprimer ce message (il sera retire de cette boite) ?";
    if (!window.confirm(confirmMsg)) return;

    try {
      setSaving(true);
      if (boxType === "drafts") {
        await axios.delete(`/api/messages/drafts/${selectedEmail.id}/delete/`, authHeaders);
      } else {
        await axios.delete(`/api/messages/${selectedEmail.id}/delete/`, authHeaders);
      }
      setFeedbackMessage(boxType === "drafts" ? "Brouillon supprime." : "Message supprime.");
      setSelectedId(null);
      loadBox(boxType);
    } catch (error) {
      console.error("Erreur suppression:", error);
      alert(error?.response?.data?.detail || "Suppression impossible.");
    } finally {
      setSaving(false);
    }
  };

  const handleEditDraft = () => {
    if (!selectedEmail || boxType !== "drafts") return;
    setComposeForm({
      draftId: selectedEmail.id,
      recipientId: selectedEmail.recipientId ? String(selectedEmail.recipientId) : "",
      subject: selectedEmail.subject || "",
      message: selectedEmail.body || "",
    });
    setComposeError("");
    setIsComposeOpen(true);
  };

  const handleTrashClick = () => {
    switchBox("trash");
  };

  useEffect(() => {
    if (!feedbackMessage) return undefined;
    const timer = setTimeout(() => setFeedbackMessage(""), 2200);
    return () => clearTimeout(timer);
  }, [feedbackMessage]);

  return (
    <>
      <div
        className={`profile-page${dark ? " dark" : ""} ${
          isNavOpen ? "nav-open" : "nav-closed"
        }`}
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
            style={{
              borderBottom: "1px solid rgba(0, 0, 0, 0.1)",
            }}
          >
            <div className="profile-naaav">
              <div className="yasar">
                <h3 className="monprofile">Mail</h3>
                <p className="morinfo">Plateforme interne - style boite mail</p>
              </div>
              <div className="yamin">
                <button
                  className="nav-toggle"
                  onClick={() => setIsNavOpen((prev) => !prev)}
                  type="button"
                >
                  {isNavOpen ? "Masquer menu" : "Afficher menu"}
                </button>
                <button className="mode" onClick={() => setDark(!dark)}>
                  {dark ? " mode clair" : " mode sombre"}
                </button>

                <button className="modifier" type="button" onClick={openCompose}>
                  nouveau message
                </button>
              </div>
            </div>
          </div>
          <div className="contenu-page-mail">
            <div className="block_one">
              <div className="titles_block_one">
                <h3 className="title_mail">Dossiers</h3>
                <p className="morinfo size">Organisation des emails</p>
              </div>
              <div className="botton_mail">
                <button className="composer" type="button" onClick={openCompose}>
                  Composer
                </button>
                <button
                  className={`all_buttons ${boxType === "inbox" ? "active-folder" : ""}`}
                  onClick={() => switchBox("inbox")}
                >
                  Boite
                </button>
                <button
                  className={`all_buttons ${
                    activeFilter === "important" ? "active-folder" : ""
                  }`}
                  onClick={() => setActiveFilter("important")}
                >
                  Importants
                </button>
                <button
                  className={`all_buttons ${boxType === "sent" ? "active-folder" : ""}`}
                  onClick={() => switchBox("sent")}
                >
                  Envoyes
                </button>
                <button
                  className={`all_buttons ${boxType === "inbox" ? "active-folder" : ""}`}
                  onClick={() => switchBox("inbox")}
                >
                  Recus
                </button>
                <button
                  className={`all_buttons ${boxType === "drafts" ? "active-folder" : ""}`}
                  onClick={() => switchBox("drafts")}
                >
                  Brouillons
                </button>
                <button
                  className={`all_buttons ${boxType === "trash" ? "active-folder" : ""}`}
                  type="button"
                  onClick={handleTrashClick}
                >
                  Corbeille
                </button>
              </div>
            </div>
            <div className="block_two">
              <div className="top_block_two">
                <SearchIcon className="rr" />
                <input
                  type="text"
                  className="input"
                  placeholder="Rechercher (objet, expediteur, contenu)..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <div className="button-block-two">
                  <button
                    className={`rc ${activeFilter === "all" ? "c" : ""}`}
                    onClick={() => setActiveFilter("all")}
                  >
                    Tous
                  </button>
                  <button
                    className={`rc ${activeFilter === "unread" ? "c" : ""}`}
                    onClick={() => setActiveFilter("unread")}
                  >
                    Non lus
                  </button>
                  <button
                    className={`rc ${activeFilter === "important" ? "c" : ""}`}
                    onClick={() => setActiveFilter("important")}
                  >
                    Importants
                  </button>
                </div>
                {feedbackMessage && <div className="mail-feedback">{feedbackMessage}</div>}
              </div>
              <hr className="mail-divider" />

              <div className="mail-list">
                {loading && <div className="mail-empty">Chargement...</div>}
                {!loading &&
                  filteredEmails.map((mail) => (
                    <button
                      key={mail.id}
                      className={`mail-item ${selectedEmail?.id === mail.id ? "active" : ""}`}
                      onClick={() => handleSelectMessage(mail.id)}
                    >
                      <div className="mail-item-head">
                        <div className="mail-avatar">{mail.initials}</div>
                        <div className="mail-head-meta">
                          <div className="mail-subject-line">
                            <h4>
                              {mail.sender} - {mail.subject}
                            </h4>
                            <span>{mail.time}</span>
                          </div>
                          <p>{mail.preview}</p>
                        </div>
                      </div>
                      <span className={`mail-tag ${mail.tag.toLowerCase()}`}>{mail.tag}</span>
                    </button>
                  ))}
                {!loading && filteredEmails.length === 0 && !pageError && (
                  <div className="mail-empty">Aucun email trouve pour ce filtre.</div>
                )}
                {!loading && pageError && <div className="mail-empty">{pageError}</div>}
              </div>
            </div>
            <div className="block_three">
              {selectedEmail ? (
                <>
                  <div className="message-header">
                    <div>
                      <h3>
                        {selectedEmail.department} - {selectedEmail.subject}
                      </h3>
                      <p>
                        De: {selectedEmail.from || selectedEmail.sender} - A:{" "}
                        {selectedEmail.to || "Vous"} - {selectedEmail.day}
                      </p>
                    </div>
                    <div className="message-actions">
                      {boxType === "inbox" && (
                        <>
                          <button
                            type="button"
                            className="action-btn action-reply"
                            onClick={() => setReplyText("")}
                          >
                            Repondre
                          </button>
                          <button
                            type="button"
                            className="action-btn action-forward"
                            onClick={openCompose}
                          >
                            Transferer
                          </button>
                          <button
                            type="button"
                            className={`action-btn important-btn ${
                              selectedEmail.isImportantForMe ? "is-active" : ""
                            }`}
                            onClick={handleToggleImportant}
                            disabled={saving}
                          >
                            {selectedEmail.isImportantForMe ? "Important (ON)" : "Important"}
                          </button>
                        </>
                      )}
                      {boxType === "drafts" && (
                        <button type="button" className="action-btn action-edit" onClick={handleEditDraft}>
                          Modifier
                        </button>
                      )}
                      <button
                        type="button"
                        className="action-btn action-delete"
                        onClick={handleDeleteSelected}
                        disabled={saving}
                      >
                        {boxType === "drafts" ? "Supprimer brouillon" : "Supprimer"}
                      </button>
                    </div>
                  </div>

                  <div className="message-card">
                    <div className="message-card-title">
                      <div className="mail-avatar">{selectedEmail.initials}</div>
                      <div>
                        <h4>{selectedEmail.sender}</h4>
                        <p>
                          {selectedEmail.from || selectedEmail.sender} - {selectedEmail.day}
                        </p>
                      </div>
                    </div>
                    <pre className="message-body">{selectedEmail.body}</pre>
                  </div>

                  {boxType === "inbox" && (
                    <div className="reply-box">
                      <h4>Repondre</h4>
                      <p>
                        {selectedEmail.hasRepliedByMe
                          ? "Vous avez deja repondu a ce message."
                          : "Votre reponse sera envoyee a l'expediteur."}
                      </p>
                      <div className="reply-field-row">
                        <label htmlFor="reply-to">Pour</label>
                        <input id="reply-to" type="text" value={selectedEmail.from} readOnly />
                      </div>
                      <textarea
                        className="reply-textarea"
                        placeholder="Ecrire votre reponse..."
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        disabled={selectedEmail.hasRepliedByMe}
                      />
                      <div className="reply-actions">
                        <button type="button" className="attach" disabled>
                          Joindre
                        </button>
                        <button
                          type="button"
                          className="send"
                          onClick={handleReply}
                          disabled={
                            saving ||
                            !replyText.trim() ||
                            boxType === "sent" ||
                            selectedEmail.hasRepliedByMe
                          }
                        >
                          {saving ? "Envoi..." : "Envoyer"}
                        </button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="mail-empty-state">
                  Selectionnez un email a gauche pour afficher son contenu.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      {isComposeOpen && (
        <div className="compose-overlay" onClick={closeCompose} aria-hidden="true">
          <div
            className="compose-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Nouveau message"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="compose-header">
              <h3>Nouveau message</h3>
              <button type="button" className="compose-close" onClick={closeCompose}>
                X
              </button>
            </div>

            <form className="compose-form" onSubmit={onComposeSubmit}>
              <label>
                A
                <select
                  name="recipientId"
                  value={composeForm.recipientId}
                  onChange={onComposeFieldChange}
                  required
                >
                  <option value="">-- Selectionner --</option>
                  {recipients.map((recipient) => (
                    <option key={recipient.user_id} value={recipient.user_id}>
                      {recipient.full_name || `${recipient.first_name} ${recipient.last_name}`} (
                      {recipient.email})
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Objet
                <input
                  type="text"
                  name="subject"
                  value={composeForm.subject}
                  onChange={onComposeFieldChange}
                  placeholder="Sujet de votre email"
                  required
                />
              </label>
              <label>
                Message
                <textarea
                  name="message"
                  value={composeForm.message}
                  onChange={onComposeFieldChange}
                  placeholder="Ecrire votre message..."
                  required
                />
              </label>
              {composeError && <p className="mail-empty">{composeError}</p>}

              <div className="compose-actions">
                <button type="button" className="compose-cancel" onClick={closeCompose}>
                  Annuler
                </button>
                <button
                  type="button"
                  className="compose-draft"
                  disabled={saving}
                  onClick={onSaveDraft}
                >
                  {saving ? "..." : "Enregistrer brouillon"}
                </button>
                <button type="submit" className="compose-send" disabled={saving}>
                  {saving ? "Envoi..." : "Envoyer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
