import React, { useMemo, useState } from "react";
import SearchIcon from "@mui/icons-material/Search";
import Navbar from "../components/Navbar";
import "../styles/profile.css";
import "../styles/messagrie.css";

const EMAILS = [
  {
    id: 1,
    initials: "RH",
    sender: "Service RH",
    from: "rh@madar.com",
    department: "RH",
    subject: "Demande de conge",
    preview: "Votre demande est en validation. Merci de patienter.",
    body: "Bonjour,\n\nVotre demande de conge est en validation.\nMerci de patienter jusqu'a la reponse finale.\n\nCordialement,\nService RH",
    time: "10:24",
    day: "Aujourd'hui",
    unread: false,
    important: false,
    tag: "RH",
  },
  {
    id: 2,
    initials: "FN",
    sender: "Finance",
    from: "finance@madar.com",
    department: "Finance",
    subject: "Liste employes actifs",
    preview: "Merci d'envoyer la liste des employes actifs avant 14:00.",
    body: "Bonjour,\n\nMerci d'envoyer la liste des employes actifs avant 14:00.\n\nCordialement,\nFinance",
    time: "Hier",
    day: "Hier",
    unread: true,
    important: true,
    tag: "Urgent",
  },
  {
    id: 3,
    initials: "MK",
    sender: "Manager",
    from: "manager@madar.com",
    department: "Manager",
    subject: "Reunion equipe",
    preview: "Point hebdomadaire demain a 09:00, salle B.",
    body: "Bonjour,\n\nPoint hebdomadaire demain a 09:00 en salle B.\nMerci d'etre a l'heure.\n\nCordialement,\nManager",
    time: "Lun",
    day: "Lundi",
    unread: false,
    important: false,
    tag: "Info",
  },
];

export default function Messagrie() {
  const [dark, setDark] = useState(false);
  const [isNavOpen, setIsNavOpen] = useState(true);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [selectedId, setSelectedId] = useState(2);
  const [replyText, setReplyText] = useState("");
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [composeForm, setComposeForm] = useState({
    to: "",
    mailType: "info",
    service: "RH",
    subject: "",
    message: "",
  });

  const filteredEmails = useMemo(() => {
    const term = search.trim().toLowerCase();

    return EMAILS.filter((mail) => {
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
  }, [search, activeFilter]);

  const selectedEmail =
    filteredEmails.find((mail) => mail.id === selectedId) || filteredEmails[0] || null;

  const openCompose = () => setIsComposeOpen(true);
  const closeCompose = () => setIsComposeOpen(false);

  const onComposeFieldChange = (e) => {
    const { name, value } = e.target;
    setComposeForm((prev) => ({ ...prev, [name]: value }));
  };

  const onComposeSubmit = (e) => {
    e.preventDefault();
    setIsComposeOpen(false);
    setComposeForm({
      to: "",
      mailType: "info",
      service: "RH",
      subject: "",
      message: "",
    });
  };

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
                <button className="all_buttons">Boite</button>
                <button className="all_buttons">Importants</button>
                <button className="all_buttons">Envoyes</button>
                <button className="all_buttons">Recus</button>
                <button className="all_buttons">Brouillons</button>
                <button className="all_buttons">Corbeille</button>
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
              </div>
              <hr className="mail-divider" />

              <div className="mail-list">
                {filteredEmails.map((mail) => (
                  <button
                    key={mail.id}
                    className={`mail-item ${selectedEmail?.id === mail.id ? "active" : ""}`}
                    onClick={() => setSelectedId(mail.id)}
                  >
                    <div className="mail-item-head">
                      <div className="mail-avatar">{mail.initials}</div>
                      <div className="mail-head-meta">
                        <div className="mail-subject-line">
                          <h4>
                            {mail.sender} • {mail.subject}
                          </h4>
                          <span>{mail.time}</span>
                        </div>
                        <p>{mail.preview}</p>
                      </div>
                    </div>
                    <span className={`mail-tag ${mail.tag.toLowerCase()}`}>{mail.tag}</span>
                  </button>
                ))}
                {filteredEmails.length === 0 && (
                  <div className="mail-empty">Aucun email trouve pour ce filtre.</div>
                )}
              </div>
            </div>
            <div className="block_three">
              {selectedEmail ? (
                <>
                  <div className="message-header">
                    <div>
                      <h3>
                        {selectedEmail.department} • {selectedEmail.subject}
                      </h3>
                      <p>
                        De: {selectedEmail.department} • A: RH • {selectedEmail.day}
                      </p>
                    </div>
                    <div className="message-actions">
                      <button type="button">Repondre</button>
                      <button type="button">Transferer</button>
                      <button type="button" className="important-btn">
                        Important
                      </button>
                    </div>
                  </div>

                  <div className="message-card">
                    <div className="message-card-title">
                      <div className="mail-avatar">{selectedEmail.initials}</div>
                      <div>
                        <h4>{selectedEmail.sender}</h4>
                        <p>
                          {selectedEmail.from} • {selectedEmail.day}
                        </p>
                      </div>
                    </div>
                    <pre className="message-body">{selectedEmail.body}</pre>
                  </div>

                  <div className="reply-box">
                    <h4>Repondre</h4>
                    <p>Votre reponse sera envoyee a l'expediteur.</p>
                    <div className="reply-field-row">
                      <label htmlFor="reply-to">Pour</label>
                      <input
                        id="reply-to"
                        type="text"
                        value={selectedEmail.from}
                        readOnly
                      />
                    </div>
                    <textarea
                      className="reply-textarea"
                      placeholder="Ecrire votre reponse au client..."
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                    />
                    <div className="reply-actions">
                      <button type="button" className="attach">
                        Joindre
                      </button>
                      <button type="button" className="send">
                        Envoyer
                      </button>
                    </div>
                  </div>
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
                <input
                  type="email"
                  name="to"
                  value={composeForm.to}
                  onChange={onComposeFieldChange}
                  placeholder="client@madar.com"
                  required
                />
              </label>
              <div className="compose-meta-row">
                <label>
                  Type de mail
                  <select
                    name="mailType"
                    value={composeForm.mailType}
                    onChange={onComposeFieldChange}
                  >
                    <option value="info">Info</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </label>
                <label>
                  Service
                  <select
                    name="service"
                    value={composeForm.service}
                    onChange={onComposeFieldChange}
                  >
                    <option value="RH">RH</option>
                    <option value="Finance">Finance</option>
                    <option value="Manager">Manager</option>
                    <option value="IT">IT</option>
                    <option value="Commercial">Commercial</option>
                  </select>
                </label>
              </div>
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

              <div className="compose-actions">
                <button type="button" className="compose-cancel" onClick={closeCompose}>
                  Annuler
                </button>
                <button type="submit" className="compose-send">
                  Envoyer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
