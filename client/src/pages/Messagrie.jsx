import NotificationBell from "../components/NotificationBell";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import SearchIcon from "@mui/icons-material/Search";
import Navbar from "../components/Navbar";
import useDarkModePreference from "../hooks/useDarkModePreference";
import usePersistentNavState from "../hooks/usePersistentNavState";
import "../styles/profile.css";
import "../styles/messagrie.css";

const INITIAL_COMPOSE_FORM = {
  draftId: null,
  recipientId: "",
  subject: "",
  message: "",
  forwardMessageId: null,
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
    attachments: Array.isArray(mail.attachments) ? mail.attachments : [],
  };
};

export default function Messagrie() {
  const [dark, setDark] = useDarkModePreference();
  const [isNavOpen, setIsNavOpen] = usePersistentNavState();
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [boxType, setBoxType] = useState("inbox");
  const [selectedId, setSelectedId] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [composeForm, setComposeForm] = useState(INITIAL_COMPOSE_FORM);
  const [composeFiles, setComposeFiles] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = React.useRef(null);
  const [recipientSearch, setRecipientSearch] = useState("");
  const [showRecipientDropdown, setShowRecipientDropdown] = useState(false);
  const [recipients, setRecipients] = useState([]);
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pageError, setPageError] = useState("");
  const [composeError, setComposeError] = useState("");
  const [feedbackMessage, setFeedbackMessage] = useState("");

  const loadRecipients = useCallback(async () => {
    try {
      const response = await axios.get("/api/employees/?for_messaging=true");
      const validRecipients = (response.data || []).filter(
        (recipient) => recipient.user_id !== undefined && recipient.user_id !== null,
      );
      setRecipients(validRecipients);
    } catch (error) {
      console.error("Erreur chargement destinataires:", error);
    }
  }, []);

  const loadBox = useCallback(async (targetBox = boxType) => {
    try {
      setLoading(true);
      setPageError("");

      if (targetBox === "sent") {
        const response = await axios.get("/api/messages/sent/?page=1");
        const data = (response.data?.messages || []).map((mail) => toUiMail(mail, "sent"));
        setEmails(data);
      } else if (targetBox === "trash") {
        const response = await axios.get("/api/messages/trash/?page=1");
        const data = (response.data?.messages || []).map((mail) => toUiMail(mail, "trash"));
        setEmails(data);
      } else if (targetBox === "drafts") {
        const response = await axios.get("/api/messages/drafts/");
        const data = (response.data?.drafts || []).map((mail) => toUiMail(mail, "drafts"));
        setEmails(data);
      } else {
        const response = await axios.get("/api/messages/inbox/?page=1");
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
  }, [boxType]);

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

  const boxLabel = useMemo(
    () =>
      ({
        inbox: "Boite de reception",
        sent: "Messages envoyes",
        drafts: "Brouillons",
        trash: "Corbeille",
      })[boxType] || "Messagerie",
    [boxType],
  );

  const boxDescription = useMemo(
    () =>
      ({
        inbox: "Suivez les messages recus et traitez les reponses en attente.",
        sent: "Retrouvez l'historique complet des messages expedies.",
        drafts: "Reprenez vos brouillons avant envoi.",
        trash: "Consultez les messages retires de la boite active.",
      })[boxType] || "Suivi des echanges internes.",
    [boxType],
  );

  const currentUnreadCount = useMemo(
    () => filteredEmails.filter((mail) => mail.unread).length,
    [filteredEmails],
  );

  const currentImportantCount = useMemo(
    () => filteredEmails.filter((mail) => mail.important).length,
    [filteredEmails],
  );

  const selectedSummary = selectedEmail
    ? selectedEmail.subject || "(Sans objet)"
    : "Aucune conversation ouverte";

  const openCompose = () => {
    setComposeError("");
    setComposeForm(INITIAL_COMPOSE_FORM);
    setIsComposeOpen(true);
  };

  const openForwardCompose = () => {
    if (!selectedEmail || selectedEmail.isDraft) return;

    setComposeError("");
    setComposeForm({
      draftId: null,
      recipientId: "",
      subject: selectedEmail.subject ? `TR: ${selectedEmail.subject}` : "",
      message: selectedEmail.body || "",
      forwardMessageId: selectedEmail.id,
    });
    setIsComposeOpen(true);
  };

  const closeCompose = () => {
    setIsComposeOpen(false);
    setComposeError("");
    setComposeFiles([]);
    setDragOver(false);
    setRecipientSearch("");
    setShowRecipientDropdown(false);
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
      if (composeForm.forwardMessageId) {
        await axios.post(`/api/messages/${composeForm.forwardMessageId}/forward/`, {
          recipient_id: composeForm.recipientId,
        });
      } else {
        const formData = new FormData();
        formData.append("recipient_id", composeForm.recipientId);
        formData.append("subject", composeForm.subject.trim());
        formData.append("body", composeForm.message.trim());
        composeFiles.forEach(f => formData.append("attachments", f));
        await axios.post("/api/messages/send/", formData);
      }
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
      const response = await axios.get(`/api/messages/${mailId}/`);
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
      await axios.post(`/api/messages/${selectedEmail.id}/reply/`, formData);
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
        await axios.delete(`/api/messages/drafts/${selectedEmail.id}/delete/`);
      } else {
        await axios.delete(`/api/messages/${selectedEmail.id}/delete/`);
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
      forwardMessageId: null,
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
            className={`sticky top-0 z-40 backdrop-blur ${
              dark
                ? "border-b border-slate-800 bg-slate-950/90"
                : "border-b border-slate-200/80 bg-white/90"
            }`}
          >
            <div className="profile-naaav">
              <div className="yasar">
                <h3 className="monprofile">Messagerie</h3>
                <p className="morinfo">
                  Messagerie interne, suivi des echanges et reponse rapide par service.
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
              <button className="mode" onClick={() => setDark(!dark)}>
                  {dark ? "mode clair" : "mode sombre"}
                </button>
              <NotificationBell dark={dark} />

                <button className="modifier" type="button" onClick={openCompose}>
                  Nouveau message
                </button>
              </div>
            </div>
          </div>
          {/* Compact stats bar */}
          <div style={{ width: "96%", margin: "10px auto 0", borderRadius: 16, background: dark ? "linear-gradient(135deg,#0f172a,#1e3a5f)" : "linear-gradient(135deg,#0b6a3b,#159957)", padding: "11px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, flexWrap: "wrap", boxShadow: "0 4px 20px rgba(11,106,59,0.22)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div>
                <span style={{ fontSize: 30, fontWeight: 900, color: "#fff", lineHeight: 1 }}>{filteredEmails.length}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.6)", marginLeft: 8 }}>{boxLabel}</span>
              </div>
              <div style={{ width: 1, height: 30, background: "rgba(255,255,255,0.15)" }} />
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 14px 6px 10px", borderRadius: 20, background: "rgba(251,191,36,0.2)", border: "1px solid rgba(251,191,36,0.45)" }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#fbbf24", display: "inline-block", flexShrink: 0 }} />
                  <span style={{ fontSize: 14, fontWeight: 800, color: "#fbbf24" }}>{currentUnreadCount} non lu{currentUnreadCount !== 1 ? "s" : ""}</span>
                </span>
                <span style={{ padding: "6px 14px", borderRadius: 20, background: "rgba(239,68,68,0.18)", border: "1px solid rgba(239,68,68,0.4)", fontSize: 14, fontWeight: 800, color: "#f87171" }}>
                  {currentImportantCount} important{currentImportantCount !== 1 ? "s" : ""}
                </span>
                <span style={{ padding: "6px 14px", borderRadius: 20, background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.25)", fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.75)", maxWidth: 320, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {selectedEmail ? selectedEmail.subject?.slice(0, 40) || "(Sans objet)" : "Aucune sélection"}
                </span>
              </div>
            </div>
            <button type="button" onClick={openCompose} style={{ padding: "8px 18px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.25)", background: "rgba(255,255,255,0.12)", fontSize: 13, fontWeight: 700, cursor: "pointer", color: "#fff", backdropFilter: "blur(4px)", whiteSpace: "nowrap" }}>
              + Nouveau message
            </button>
          </div>
          <div className="contenu-page-mail" style={{ margin: "10px auto 0", paddingBottom: 0, height: "calc(100vh - 168px)", alignItems: "stretch" }}>
            <div className="block_one" style={{ minHeight: 0, overflowY: "auto" }}>
              <div className="titles_block_one">
                <h3 className="title_mail">Dossiers</h3>
                <p className="morinfo size">Navigation rapide entre les differentes boites.</p>
              </div>
              <div className="botton_mail">
                <button className="composer" type="button" onClick={openCompose}>
                  Composer un message
                </button>
                <button
                  className={`all_buttons ${boxType === "inbox" ? "active-folder" : ""}`}
                  type="button"
                  onClick={() => switchBox("inbox")}
                >
                  <span className="folder-button-label">Reception</span>
                  <span className="folder-button-hint">Messages recus</span>
                </button>
                <button
                  className={`all_buttons ${
                    activeFilter === "important" ? "active-folder" : ""
                  }`}
                  type="button"
                  onClick={() => setActiveFilter("important")}
                >
                  <span className="folder-button-label">Importants</span>
                  <span className="folder-button-hint">Priorites marquees</span>
                </button>
                <button
                  className={`all_buttons ${boxType === "sent" ? "active-folder" : ""}`}
                  type="button"
                  onClick={() => switchBox("sent")}
                >
                  <span className="folder-button-label">Envoyes</span>
                  <span className="folder-button-hint">Historique sortant</span>
                </button>
                <button
                  className={`all_buttons ${boxType === "drafts" ? "active-folder" : ""}`}
                  type="button"
                  onClick={() => switchBox("drafts")}
                >
                  <span className="folder-button-label">Brouillons</span>
                  <span className="folder-button-hint">Messages non finalises</span>
                </button>
                <button
                  className={`all_buttons ${boxType === "trash" ? "active-folder" : ""}`}
                  type="button"
                  onClick={handleTrashClick}
                >
                  <span className="folder-button-label">Corbeille</span>
                  <span className="folder-button-hint">Elements supprimes</span>
                </button>
              </div>
            </div>
            <div className="block_two" style={{ minHeight: 0 }}>
              <div className="top_block_two" style={{ flexShrink: 0 }}>
                <div className="mail-list-header">
                  <div>
                    <span className="folder-eyebrow">Vue active</span>
                    <h3>{boxLabel}</h3>
                    <p>{filteredEmails.length} message(s) correspondent a la recherche courante.</p>
                  </div>
                  <div className="mail-list-stats">
                    <span>{activeFilter === "all" ? "Tous" : activeFilter === "unread" ? "Non lus" : "Importants"}</span>
                  </div>
                </div>
                <div className="search-field">
                  <SearchIcon className="rr" />
                  <input
                    type="text"
                    className="input"
                    placeholder="Rechercher (objet, expediteur, contenu)..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <div className="button-block-two">
                  <button
                    className={`rc ${activeFilter === "all" ? "c" : ""}`}
                    type="button"
                    onClick={() => setActiveFilter("all")}
                  >
                    Tous
                  </button>
                  <button
                    className={`rc ${activeFilter === "unread" ? "c" : ""}`}
                    type="button"
                    onClick={() => setActiveFilter("unread")}
                  >
                    Non lus
                  </button>
                  <button
                    className={`rc ${activeFilter === "important" ? "c" : ""}`}
                    type="button"
                    onClick={() => setActiveFilter("important")}
                  >
                    Importants
                  </button>
                </div>
                {feedbackMessage && <div className="mail-feedback">{feedbackMessage}</div>}
              </div>
              <hr className="mail-divider" />

              <div className="mail-list" style={{ flex: 1, maxHeight: "none" }}>
                {loading && <div className="mail-empty">Chargement...</div>}
                {!loading &&
                  filteredEmails.map((mail) => (
                    <button
                      key={mail.id}
                      className={`mail-item ${selectedEmail?.id === mail.id ? "active" : ""}`}
                      type="button"
                      onClick={() => handleSelectMessage(mail.id)}
                    >
                      <div className="mail-item-head">
                        <div className="mail-avatar">{mail.initials}</div>
                        <div className="mail-head-meta">
                          <div className="mail-subject-line">
                            <h4>{mail.subject}</h4>
                            <span>{mail.time}</span>
                          </div>
                          <strong className="mail-sender-line">{mail.sender}</strong>
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
            <div className="block_three" style={{ minHeight: 0, overflowY: "auto" }}>
              {selectedEmail ? (
                <>
                  <div className="message-header">
                    <div>
                      <span className="folder-eyebrow">Conversation ouverte</span>
                      <h3>
                        {selectedEmail.department} - {selectedEmail.subject}
                      </h3>
                      <p className="message-meta-line">
                        De: {selectedEmail.from || selectedEmail.sender} - A:{" "}
                        {selectedEmail.to || "Vous"}
                      </p>
                      <p>{selectedEmail.day}</p>
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
                            onClick={openForwardCompose}
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
                    {selectedEmail.attachments?.length > 0 && (
                      <div style={{ marginTop: 14, borderTop: "1px solid #e2e8f0", paddingTop: 12 }}>
                        <p style={{ margin: "0 0 8px", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "#94a3b8" }}>
                          📎 Pièces jointes ({selectedEmail.attachments.length})
                        </p>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                          {selectedEmail.attachments.map(att => (
                            <a
                              key={att.id}
                              href={att.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              download={att.file_name}
                              style={{
                                display: "flex", alignItems: "center", gap: 6,
                                background: dark ? "#1e293b" : "#f1f5f9",
                                border: `1px solid ${dark ? "#334155" : "#e2e8f0"}`,
                                borderRadius: 10, padding: "6px 12px",
                                fontSize: 12, color: dark ? "#e2e8f0" : "#374151",
                                textDecoration: "none", fontWeight: 500,
                              }}
                            >
                              📄 {att.file_name}
                              <span style={{ color: "#94a3b8", fontSize: 11 }}>
                                ({att.file_size ? `${(att.file_size / 1024).toFixed(0)} ko` : ""})
                              </span>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {boxType === "inbox" && (
                    <div className="reply-box">
                      <h4>Repondre</h4>
                      <p className="reply-note">
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
              <label style={{ position: "relative" }}>
                À
                <input
                  type="text"
                  placeholder="Rechercher par nom ou prénom..."
                  value={recipientSearch}
                  autoComplete="off"
                  onChange={e => {
                    setRecipientSearch(e.target.value);
                    setShowRecipientDropdown(true);
                    if (!e.target.value) setComposeForm(p => ({ ...p, recipientId: "" }));
                  }}
                  onFocus={() => setShowRecipientDropdown(true)}
                  onBlur={() => setTimeout(() => setShowRecipientDropdown(false), 150)}
                />
                {showRecipientDropdown && recipientSearch.trim() && (() => {
                  const q = recipientSearch.trim().toLowerCase();
                  const filtered = recipients.filter(r => {
                    const name = (r.full_name || `${r.first_name} ${r.last_name}`).toLowerCase();
                    return name.split(" ").some(p => p.startsWith(q)) || name.includes(q);
                  });
                  if (!filtered.length) return (
                    <div style={{
                      position: "absolute", top: "100%", left: 0, right: 0, zIndex: 999,
                      background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 10,
                      padding: "8px 0", boxShadow: "0 8px 24px rgba(0,0,0,0.1)",
                    }}>
                      <p style={{ padding: "8px 14px", margin: 0, fontSize: 13, color: "#94a3b8" }}>Aucun résultat</p>
                    </div>
                  );
                  return (
                    <div style={{
                      position: "absolute", top: "100%", left: 0, right: 0, zIndex: 999,
                      background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 10,
                      maxHeight: 220, overflowY: "auto", boxShadow: "0 8px 24px rgba(0,0,0,0.1)",
                    }}>
                      {filtered.map(r => {
                        const name = r.full_name || `${r.first_name} ${r.last_name}`;
                        return (
                          <button
                            key={r.user_id}
                            type="button"
                            onMouseDown={() => {
                              setComposeForm(p => ({ ...p, recipientId: String(r.user_id) }));
                              setRecipientSearch(name);
                              setShowRecipientDropdown(false);
                            }}
                            style={{
                              display: "flex", flexDirection: "column", width: "100%",
                              padding: "9px 14px", border: "none", background: "none",
                              cursor: "pointer", textAlign: "left",
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = "#f1f5f9"}
                            onMouseLeave={e => e.currentTarget.style.background = "none"}
                          >
                            <span style={{ fontWeight: 600, fontSize: 13, color: "#0f172a" }}>{name}</span>
                            <span style={{ fontSize: 11, color: "#94a3b8" }}>{r.email}</span>
                          </button>
                        );
                      })}
                    </div>
                  );
                })()}
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
              {/* File drop zone */}
              <input
                id="compose-file-input"
                ref={fileInputRef}
                type="file"
                multiple
                style={{ display: "none" }}
                onChange={e => {
                  const files = Array.from(e.target.files);
                  if (files.length) setComposeFiles(prev => [...prev, ...files]);
                  e.target.value = "";
                }}
              />
              <label
                htmlFor="compose-file-input"
                onDragEnter={e => { e.preventDefault(); e.stopPropagation(); setDragOver(true); }}
                onDragOver={e => { e.preventDefault(); e.stopPropagation(); setDragOver(true); }}
                onDragLeave={e => {
                  e.preventDefault(); e.stopPropagation();
                  if (!e.currentTarget.contains(e.relatedTarget)) setDragOver(false);
                }}
                onDrop={e => {
                  e.preventDefault(); e.stopPropagation();
                  setDragOver(false);
                  const dropped = Array.from(e.dataTransfer.files);
                  if (dropped.length) setComposeFiles(prev => [...prev, ...dropped]);
                }}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center",
                  border: `2px dashed ${dragOver ? "#4ade80" : "#cbd5e1"}`,
                  borderRadius: 12,
                  padding: "18px 16px",
                  textAlign: "center",
                  cursor: "pointer",
                  background: dragOver ? "rgba(74,222,128,0.07)" : "transparent",
                  transition: "border-color 0.2s, background 0.2s",
                  marginTop: 4,
                  userSelect: "none",
                  fontWeight: "normal",
                  fontSize: 13,
                  color: dragOver ? "#16a34a" : "#94a3b8",
                  flexDirection: "column",
                  gap: 0,
                }}
              >
                📎 {dragOver ? "Déposer ici..." : "Glisser-déposer des fichiers ici, ou cliquer pour choisir"}
              </label>

              {/* Attached files list */}
              {composeFiles.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 6 }}>
                  {composeFiles.map((f, i) => (
                    <div key={i} style={{
                      display: "flex", alignItems: "center", gap: 6,
                      background: "#f1f5f9", borderRadius: 8,
                      padding: "4px 10px", fontSize: 12, color: "#374151",
                    }}>
                      <span>{f.name}</span>
                      <span style={{ color: "#94a3b8" }}>({(f.size / 1024).toFixed(0)} ko)</span>
                      <button
                        type="button"
                        onClick={e => { e.stopPropagation(); setComposeFiles(prev => prev.filter((_, j) => j !== i)); }}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", fontWeight: 700, fontSize: 14, lineHeight: 1 }}
                      >×</button>
                    </div>
                  ))}
                </div>
              )}

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
