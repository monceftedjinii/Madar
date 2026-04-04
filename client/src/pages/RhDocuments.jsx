import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import Navbar from "../components/Navbar";
import useDarkModePreference from "../hooks/useDarkModePreference";
import usePersistentNavState from "../hooks/usePersistentNavState";
import "../styles/profile.css";

const initialForm = {
  title: "",
  type: "",
  category: "RH",
  targetService: "",
  confidentialityLevel: "INTERNAL",
  file: null,
};

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getSelectedFileLabel(file) {
  if (!file) return "Aucun fichier choisi";
  return file.name || "Fichier selectionne";
}

function getStatusClass(status) {
  if (status === "VALIDATED") return "badge-termine";
  if (status === "ARCHIVED") return "badge-genere";
  if (status === "REJECTED") return "badge-refuse";
  if (status === "SENT") return "badge-attente";
  return "badge-attente";
}

const statusLabels = {
  DRAFT: "Brouillon",
  SENT: "Envoye",
  VALIDATED: "Valide",
  REJECTED: "Refuse",
  ARCHIVED: "Archive",
};

export default function RhDocuments() {
  const [dark, setDark] = useDarkModePreference();
  const [isNavOpen, setIsNavOpen] = usePersistentNavState();
  const [documents, setDocuments] = useState([]);
  const [services, setServices] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [actionId, setActionId] = useState(null);
  const [feedback, setFeedback] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState("");
  const [commentSubmitting, setCommentSubmitting] = useState(false);

  const canValidate = role === "RH_SENIOR" || role === "GRH";
  const canUpload = role === "RH_SIMPLE" || role === "RH_SENIOR" || role === "GRH";
  const isGrh = role === "GRH";

  const fieldStyle = {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 12,
    border: `1px solid ${dark ? "#334155" : "#cbd5e1"}`,
    background: dark ? "#0f172a" : "#ffffff",
    color: dark ? "#e2e8f0" : "#0f172a",
    boxSizing: "border-box",
  };

  const fileFieldStyle = {
    width: "100%",
    padding: "12px 14px",
    borderRadius: 12,
    border: `1px solid ${dark ? "#334155" : "#cbd5e1"}`,
    background: dark ? "#0f172a" : "#ffffff",
    color: dark ? "#e2e8f0" : "#0f172a",
    boxSizing: "border-box",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
    minHeight: 56,
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setErrorMessage("");
      const [docsResponse, servicesResponse, meResponse] = await Promise.all([
        axios.get("/api/documents/me/"),
        axios.get("/api/services/"),
        axios.get("/api/whoami/"),
      ]);
      setDocuments(Array.isArray(docsResponse.data) ? docsResponse.data : []);
      setServices(Array.isArray(servicesResponse.data) ? servicesResponse.data : []);
      setRole(meResponse.data?.role || "");
    } catch (error) {
      console.error("Erreur chargement documents RH:", error);
      setDocuments([]);
      setServices([]);
      setErrorMessage("Impossible de charger les documents RH.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const stats = useMemo(() => {
    const total = documents.length;
    const drafts = documents.filter((item) => item.status === "DRAFT").length;
    const sent = documents.filter((item) => item.status === "SENT").length;
    const validated = documents.filter((item) => item.status === "VALIDATED").length;
    return { total, drafts, sent, validated };
  }, [documents]);

  const onFieldChange = (event) => {
    const { name, value, files } = event.target;
    setFeedback("");
    setErrorMessage("");
    setForm((previous) => ({
      ...previous,
      [name]: files ? files[0] || null : value,
    }));
  };

  const openDocument = async (doc) => {
    try {
      setErrorMessage("");
      const [detailResponse, commentsResponse] = await Promise.all([
        axios.get(`/api/documents/${doc.id}/`),
        axios.get(`/api/documents/${doc.id}/comments/`),
      ]);
      setSelectedDocument(detailResponse.data || doc);
      setComments(Array.isArray(commentsResponse.data) ? commentsResponse.data : []);
      setCommentText("");
    } catch (error) {
      console.error("Erreur chargement detail document RH:", error);
      setErrorMessage(error?.response?.data?.detail || "Impossible de charger ce document.");
    }
  };

  const submitDocument = async (event) => {
    event.preventDefault();
    if (!canUpload) return;
    if (!form.title.trim() || !form.type.trim() || !form.file) {
      setErrorMessage("Titre, type et fichier sont obligatoires.");
      return;
    }

    try {
      setSubmitting(true);
      setFeedback("");
      setErrorMessage("");
      const payload = new FormData();
      payload.append("title", form.title.trim());
      payload.append("type", form.type.trim());
      payload.append("category", form.category);
      payload.append("target_service", form.targetService);
      payload.append("confidentiality_level", form.confidentialityLevel);
      payload.append("file", form.file);
      await axios.post("/api/documents/", payload, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setFeedback("Document RH cree avec succes.");
      setForm(initialForm);
      await fetchData();
    } catch (error) {
      console.error("Erreur creation document RH:", error);
      setErrorMessage(error?.response?.data?.detail || "Impossible de creer le document RH.");
    } finally {
      setSubmitting(false);
    }
  };

  const submitComment = async (event) => {
    event.preventDefault();
    if (!selectedDocument || !commentText.trim()) return;
    try {
      setCommentSubmitting(true);
      setFeedback("");
      setErrorMessage("");
      await axios.post(`/api/documents/${selectedDocument.id}/comment/`, {
        comment: commentText.trim(),
      });
      setCommentText("");
      setFeedback("Commentaire ajoute.");
      await openDocument(selectedDocument);
      await fetchData();
    } catch (error) {
      console.error("Erreur commentaire document RH:", error);
      setErrorMessage(error?.response?.data?.detail || "Impossible d'ajouter le commentaire.");
    } finally {
      setCommentSubmitting(false);
    }
  };

  const validateDocument = async (documentId) => {
    const signature = window.prompt("Entrez une signature ou mention de validation RH", "Validation RH");
    if (!signature) return;
    try {
      setActionId(documentId);
      setFeedback("");
      setErrorMessage("");
      await axios.post(`/api/documents/${documentId}/validate/`, { signature });
      setFeedback("Document valide avec succes.");
      await fetchData();
      if (selectedDocument?.id === documentId) {
        await openDocument({ id: documentId });
      }
    } catch (error) {
      console.error("Erreur validation document RH:", error);
      setErrorMessage(error?.response?.data?.detail || "Impossible de valider ce document.");
    } finally {
      setActionId(null);
    }
  };

  const rejectDocument = async (documentId) => {
    const reason = window.prompt("Motif du refus RH", "");
    if (!reason) return;
    try {
      setActionId(documentId);
      setFeedback("");
      setErrorMessage("");
      await axios.post(`/api/documents/${documentId}/validate/reject/`, { reason });
      setFeedback("Document refuse avec succes.");
      await fetchData();
      if (selectedDocument?.id === documentId) {
        await openDocument({ id: documentId });
      }
    } catch (error) {
      console.error("Erreur refus document RH:", error);
      setErrorMessage(error?.response?.data?.detail || "Impossible de refuser ce document.");
    } finally {
      setActionId(null);
    }
  };

  const archiveDocument = async (documentId) => {
    try {
      setActionId(documentId);
      setFeedback("");
      setErrorMessage("");
      await axios.post(`/api/documents/${documentId}/archive/`);
      setFeedback("Document archive avec succes.");
      await fetchData();
    } catch (error) {
      console.error("Erreur archivage document RH:", error);
      setErrorMessage(error?.response?.data?.detail || "Impossible d'archiver ce document.");
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
              <h1 className="monprofile">{isGrh ? "Documents globaux" : "Documents RH"}</h1>
              <p className="morinfo">
                {isGrh
                  ? "Supervisez, arbitrez et archivez les documents sur l'ensemble du circuit."
                  : "Suivez, commentez et validez les documents du circuit RH."}
              </p>
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
              <h2 className="title">{isGrh ? "Pilotage documentaire" : "Vue rapide"}</h2>
              <p className="desc">
                {isGrh
                  ? "Etat global des documents visibles et des arbitrages GRH."
                  : "Etat global des documents RH visibles."}
              </p>
            </div>
            <div><p className="desc">Total</p><h3>{stats.total}</h3></div>
            <div><p className="desc">Brouillons</p><h3>{stats.drafts}</h3></div>
            <div><p className="desc">Envoyes</p><h3>{stats.sent}</h3></div>
            <div><p className="desc">Valides</p><h3>{stats.validated}</h3></div>
          </section>

          <section className="info-pro">
            <div className="top">
              <h2 className="title">Actions</h2>
              <p className="desc">
                {isGrh
                  ? "Actualisez le circuit documentaire global et ses validations finales."
                  : "Actualisez le circuit documentaire RH."}
              </p>
            </div>
            <div>
              <p className="desc">Actualisation</p>
              <button className="modifier" onClick={fetchData} type="button">Actualiser</button>
            </div>
          </section>
        </div>

        {(feedback || errorMessage) && (
          <div className={`page-feedback ${errorMessage ? "error" : ""}`}>{errorMessage || feedback}</div>
        )}

        {canUpload ? (
          <section className="quelques-infos" style={{ width: "96%", marginTop: 0 }}>
            <form
              onSubmit={submitDocument}
              style={{
                width: "100%",
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 14,
              }}
            >
              <div>
                <p className="desc">Titre</p>
                <input name="title" value={form.title} onChange={onFieldChange} style={fieldStyle} />
              </div>
              <div>
                <p className="desc">Type</p>
                <input name="type" value={form.type} onChange={onFieldChange} placeholder="Ex: Procedure RH" style={fieldStyle} />
              </div>
              <div>
                <p className="desc">Categorie</p>
                <select name="category" value={form.category} onChange={onFieldChange} style={fieldStyle}>
                  <option value="RH">RH</option>
                  <option value="INTERNAL">Interne</option>
                </select>
              </div>
              <div>
                <p className="desc">Service cible</p>
                <select name="targetService" value={form.targetService} onChange={onFieldChange} style={fieldStyle}>
                  <option value="">Aucun service cible</option>
                  {services.map((service) => (
                    <option key={service.code} value={service.code}>
                      {service.nomService || service.code}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <p className="desc">Confidentialite</p>
                <select name="confidentialityLevel" value={form.confidentialityLevel} onChange={onFieldChange} style={fieldStyle}>
                  <option value="INTERNAL">Interne</option>
                  <option value="CONFIDENTIAL">Confidentiel</option>
                  <option value="PUBLIC">Public</option>
                </select>
              </div>
              <div>
                <p className="desc">Fichier</p>
                <label style={fileFieldStyle}>
                  <input type="file" name="file" onChange={onFieldChange} style={{ display: "none" }} />
                  <span
                    style={{
                      padding: "8px 14px",
                      borderRadius: 10,
                      background: dark ? "#1d4ed8" : "#2563eb",
                      color: "#ffffff",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Choisir un fichier
                  </span>
                  <span
                    style={{
                      color: dark ? "#cbd5e1" : "#475569",
                      fontSize: 14,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      flex: 1,
                      minWidth: 140,
                    }}
                  >
                    {getSelectedFileLabel(form.file)}
                  </span>
                </label>
              </div>
              <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "flex-end" }}>
                <button className="modifier" disabled={submitting} type="submit">
                  {submitting ? "Creation..." : "Creer le document"}
                </button>
              </div>
            </form>
          </section>
        ) : null}

        <section className="activite-recente" style={{ width: "96%", margin: "24px auto" }}>
          <div className="activite-top">
            <h2 className="activite-title">{isGrh ? "Documents visibles globalement" : "Documents RH visibles"}</h2>
            <p className="activite-subtitle">
              {isGrh
                ? "Liste backend des documents sur le scope global GRH."
                : "Liste backend des documents dans le scope RH."}
            </p>
          </div>

          <div className="activite-table-scroll">
            <table className="activite-table">
              <thead>
                <tr>
                  <th>Titre</th>
                  <th>Type</th>
                  <th>Service source</th>
                  <th>Service cible</th>
                  <th>Statut</th>
                  <th>Cree le</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="7">Chargement des documents...</td></tr>
                ) : documents.length === 0 ? (
                  <tr><td colSpan="7">Aucun document RH visible pour le moment.</td></tr>
                ) : (
                  documents.map((doc) => (
                    <tr key={doc.id}>
                      <td>{doc.title}</td>
                      <td>{doc.doc_type}</td>
                      <td>{doc.source_service || "-"}</td>
                      <td>{doc.target_service || "-"}</td>
                      <td><span className={`badge ${getStatusClass(doc.status)}`}>{statusLabels[doc.status] || doc.status}</span></td>
                      <td>{formatDateTime(doc.created_at)}</td>
                      <td>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          <button className="modifier" onClick={() => openDocument(doc)} type="button">Consulter</button>
                          {canValidate && doc.status === "SENT" ? (
                            <>
                              <button className="modifier" disabled={actionId === doc.id} onClick={() => validateDocument(doc.id)} type="button">
                                Valider
                              </button>
                              <button className="mode" disabled={actionId === doc.id} onClick={() => rejectDocument(doc.id)} type="button">
                                Refuser
                              </button>
                            </>
                          ) : null}
                          {canValidate && doc.status === "VALIDATED" ? (
                            <button className="mode" disabled={actionId === doc.id} onClick={() => archiveDocument(doc.id)} type="button">
                              Archiver
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {selectedDocument ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 500,
            padding: 16,
          }}
          onClick={() => setSelectedDocument(null)}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            style={{
              width: "min(94vw, 940px)",
              maxHeight: "88vh",
              overflow: "auto",
              borderRadius: 18,
              padding: 24,
              background: dark ? "#111827" : "#ffffff",
              color: dark ? "#e2e8f0" : "#111827",
              boxShadow: "0 18px 48px rgba(15, 23, 42, 0.28)",
              border: `1px solid ${dark ? "#334155" : "#e2e8f0"}`,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "start" }}>
              <div>
                <h2 style={{ marginTop: 0, marginBottom: 8 }}>{selectedDocument.title}</h2>
                <p style={{ margin: 0, color: dark ? "#94a3b8" : "#64748b" }}>
                  {selectedDocument.doc_type} • {selectedDocument.source_service || "-"} • {statusLabels[selectedDocument.status] || selectedDocument.status}
                </p>
              </div>
              <button className="mode" onClick={() => setSelectedDocument(null)} type="button">Fermer</button>
            </div>

            <section style={{ marginTop: 24 }}>
              <h3 style={{ marginTop: 0 }}>Commentaires</h3>
              <form onSubmit={submitComment} style={{ marginBottom: 14 }}>
                <textarea
                  rows={3}
                  value={commentText}
                  onChange={(event) => setCommentText(event.target.value)}
                  placeholder="Ajouter un commentaire RH."
                  style={{ ...fieldStyle, resize: "vertical" }}
                />
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
                  <button className="modifier" disabled={commentSubmitting} type="submit">
                    {commentSubmitting ? "Envoi..." : "Commenter"}
                  </button>
                </div>
              </form>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {comments.length ? comments.map((comment) => (
                  <div
                    key={comment.id}
                    style={{
                      padding: 14,
                      borderRadius: 14,
                      background: dark ? "#0f172a" : "#f8fafc",
                      border: `1px solid ${dark ? "#334155" : "#e2e8f0"}`,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                      <strong>{comment.by_user_name || comment.by_user || "Utilisateur"}</strong>
                      <span style={{ fontSize: 12, color: dark ? "#94a3b8" : "#64748b" }}>
                        {formatDateTime(comment.created_at)}
                      </span>
                    </div>
                    <p style={{ margin: "10px 0 0", color: dark ? "#e2e8f0" : "#0f172a" }}>{comment.note}</p>
                  </div>
                )) : (
                  <p style={{ color: dark ? "#94a3b8" : "#64748b", margin: 0 }}>
                    Aucun commentaire pour le moment.
                  </p>
                )}
              </div>
            </section>
          </div>
        </div>
      ) : null}
    </div>
  );
}
