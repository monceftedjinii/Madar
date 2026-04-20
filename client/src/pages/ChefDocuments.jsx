import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import Navbar from "../components/Navbar";
import useDarkModePreference from "../hooks/useDarkModePreference";
import usePersistentNavState from "../hooks/usePersistentNavState";
import "../styles/profile.css";
import "../styles/chef-space.css";

const initialForm = {
  title: "",
  type: "",
  category: "INTERNAL",
  targetService: "",
  confidentialityLevel: "INTERNAL",
  file: null,
};

function getSelectedFileLabel(file) {
  if (!file) return "Aucun fichier choisi";
  return file.name || "Fichier sélectionné";
}

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

function getStatusClass(status) {
  if (status === "VALIDATED") return "badge-termine";
  if (status === "ARCHIVED") return "badge-genere";
  if (status === "REJECTED") return "badge-refuse";
  if (status === "SENT") return "badge-attente";
  return "badge-attente";
}

const statusLabels = {
  DRAFT: "Brouillon",
  SENT: "Envoyé",
  VALIDATED: "Validé",
  REJECTED: "Refusé",
  ARCHIVED: "Archivé",
};

function CommentThread({ comments, dark = false }) {
  if (!comments.length) {
    return (
      <p style={{ color: dark ? "#94a3b8" : "#64748b", margin: 0 }}>
        Aucun commentaire pour le moment.
      </p>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {comments.map((comment) => (
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
          {comment.replies?.length > 0 && (
            <div style={{ marginTop: 12, paddingLeft: 14, borderLeft: `2px solid ${dark ? "#334155" : "#cbd5e1"}` }}>
              <CommentThread comments={comment.replies} dark={dark} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default function ChefDocuments() {
  const [dark, setDark] = useDarkModePreference();
  const [isNavOpen, setIsNavOpen] = usePersistentNavState();
  const [documents, setDocuments] = useState([]);
  const [services, setServices] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [actionId, setActionId] = useState(null);
  const [feedback, setFeedback] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState("");
  const [detailLoading, setDetailLoading] = useState(false);
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [versionSubmitting, setVersionSubmitting] = useState(false);
  const [versionFile, setVersionFile] = useState(null);
  const [versionComment, setVersionComment] = useState("");

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
      const [docsResponse, servicesResponse] = await Promise.all([
        axios.get("/api/documents/mine/"),
        axios.get("/api/services/"),
      ]);
      setDocuments(Array.isArray(docsResponse.data) ? docsResponse.data : []);
      setServices(Array.isArray(servicesResponse.data) ? servicesResponse.data : []);
    } catch (error) {
      console.error("Erreur chargement documents chef:", error);
      setDocuments([]);
      setServices([]);
      setErrorMessage("Impossible de charger les documents du chef.");
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

  const resetMessages = () => {
    setFeedback("");
    setErrorMessage("");
  };

  const onFieldChange = (event) => {
    const { name, value, files } = event.target;
    resetMessages();
    setForm((previous) => ({
      ...previous,
      [name]: files ? files[0] || null : value,
    }));
  };

  const openDocument = async (doc) => {
    try {
      setDetailLoading(true);
      resetMessages();
      const [detailResponse, commentsResponse] = await Promise.all([
        axios.get(`/api/documents/${doc.id}/`),
        axios.get(`/api/documents/${doc.id}/comments/`),
      ]);
      setSelectedDocument(detailResponse.data || doc);
      setComments(Array.isArray(commentsResponse.data) ? commentsResponse.data : []);
      setCommentText("");
      setVersionComment("");
      setVersionFile(null);
    } catch (error) {
      console.error("Erreur chargement detail document:", error);
      setErrorMessage(error?.response?.data?.detail || "Impossible de charger ce document.");
    } finally {
      setDetailLoading(false);
    }
  };

  const submitDocument = async (event) => {
    event.preventDefault();
    if (!form.title.trim() || !form.type.trim() || !form.targetService || !form.file) {
      setErrorMessage("Titre, type, service cible et fichier sont obligatoires.");
      return;
    }

    try {
      setSubmitting(true);
      resetMessages();
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
      setFeedback("Document créé en brouillon avec succès.");
      setForm(initialForm);
      await fetchData();
    } catch (error) {
      console.error("Erreur création document :", error);
      setErrorMessage(error?.response?.data?.detail || "Impossible de créer le document.");
    } finally {
      setSubmitting(false);
    }
  };

  const sendDocument = async (documentId) => {
    try {
      setActionId(documentId);
      resetMessages();
      await axios.post(`/api/documents/${documentId}/send/`);
      setFeedback("Document envoyé avec succès.");
      await fetchData();
      if (selectedDocument?.id === documentId) {
        await openDocument({ id: documentId });
      }
    } catch (error) {
      console.error("Erreur envoi document :", error);
      setErrorMessage(error?.response?.data?.detail || "Impossible d'envoyer ce document.");
    } finally {
      setActionId(null);
    }
  };

  const downloadDocument = async (documentId) => {
    try {
      const response = await axios.get(`/api/documents/${documentId}/download/`, {
        responseType: "blob",
      });
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `document-${documentId}`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Erreur téléchargement document :", error);
      setErrorMessage(error?.response?.data?.detail || "Impossible de télécharger ce document.");
    }
  };

  const submitComment = async (event) => {
    event.preventDefault();
    if (!selectedDocument || !commentText.trim()) return;

    try {
      setCommentSubmitting(true);
      resetMessages();
      await axios.post(`/api/documents/${selectedDocument.id}/comment/`, {
        comment: commentText.trim(),
      });
      setCommentText("");
      setFeedback("Commentaire ajouté avec succès.");
      await openDocument(selectedDocument);
      await fetchData();
    } catch (error) {
      console.error("Erreur commentaire document:", error);
      setErrorMessage(error?.response?.data?.detail || "Impossible d'ajouter le commentaire.");
    } finally {
      setCommentSubmitting(false);
    }
  };

  const submitNewVersion = async (event) => {
    event.preventDefault();
    if (!selectedDocument || !versionFile) {
      setErrorMessage("Sélectionnez un fichier pour créer une nouvelle version.");
      return;
    }

    try {
      setVersionSubmitting(true);
      resetMessages();
      const payload = new FormData();
      payload.append("file", versionFile);
      payload.append("comment", versionComment.trim());
      await axios.post(`/api/documents/${selectedDocument.id}/modify/`, payload, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setVersionFile(null);
      setVersionComment("");
      setFeedback("Nouvelle version du document créée avec succès.");
      await openDocument(selectedDocument);
      await fetchData();
    } catch (error) {
      console.error("Erreur nouvelle version document:", error);
      setErrorMessage(error?.response?.data?.detail || "Impossible de modifier ce document.");
    } finally {
      setVersionSubmitting(false);
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
              <h1 className="monprofile">Documents chef</h1>
              <p className="morinfo">Publiez, envoyez, commentez et versionnez les documents de votre service.</p>
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

        <div className="chef-page-stack">
          <section className="chef-hero">
            <div className="chef-hero-copy">
              <span className="chef-eyebrow">Espace chef</span>
              <h2 className="chef-hero-title">Gestion documentaire du service</h2>
              <p className="chef-hero-description">
                Créez, envoyez, commentez et versionnez les documents de votre service dans une
                interface plus claire pour le suivi quotidien.
              </p>
            </div>
            <div className="chef-hero-kpis">
              <article className="chef-kpi-card">
                <span>Total</span>
                <strong>{stats.total}</strong>
                <p>Documents accessibles côté chef.</p>
              </article>
              <article className="chef-kpi-card">
                <span>Brouillons</span>
                <strong>{stats.drafts}</strong>
                <p>Documents encore non envoyés.</p>
              </article>
              <article className="chef-kpi-card">
                <span>Envoyés</span>
                <strong>{stats.sent}</strong>
                <p>Documents transmis dans le circuit.</p>
              </article>
              <article className="chef-kpi-card">
                <span>Valides</span>
                <strong>{stats.validated}</strong>
                <p>Documents déjà approuvés.</p>
              </article>
            </div>
          </section>

          <div className="chef-metrics-grid">
            <article className="chef-metric-card">
              <span>Action rapide</span>
              <p style={{ marginTop: 12 }}>
                <button className="modifier" onClick={fetchData} type="button">
                  Actualiser
                </button>
              </p>
            </article>
          </div>

          {(feedback || errorMessage) && (
            <div className={`page-feedback ${errorMessage ? "error" : ""}`}>
              {errorMessage || feedback}
            </div>
          )}

          <section className="chef-panel">
            <div className="chef-panel-head">
              <div>
                <h2>Nouveau document</h2>
                <p>Préparez le document, son type, son service cible et son niveau de confidentialité.</p>
              </div>
              <div className="chef-action-pill">Publication</div>
            </div>

            <form onSubmit={submitDocument} className="chef-form-grid">
            <div>
              <p className="chef-form-label">Titre</p>
              <input name="title" value={form.title} onChange={onFieldChange} style={fieldStyle} />
            </div>
            <div>
              <p className="chef-form-label">Type</p>
              <input name="type" value={form.type} onChange={onFieldChange} placeholder="Ex: Note de service" style={fieldStyle} />
            </div>
            <div>
              <p className="chef-form-label">Catégorie</p>
              <select name="category" value={form.category} onChange={onFieldChange} style={fieldStyle}>
                <option value="INTERNAL">Interne</option>
                <option value="RH">RH</option>
              </select>
            </div>
            <div>
              <p className="chef-form-label">Service cible</p>
              <select name="targetService" value={form.targetService} onChange={onFieldChange} style={fieldStyle}>
                <option value="">Choisir un service</option>
                {services.map((service) => (
                  <option key={service.code} value={service.code}>
                    {service.nomService || service.code}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <p className="chef-form-label">Confidentialité</p>
              <select name="confidentialityLevel" value={form.confidentialityLevel} onChange={onFieldChange} style={fieldStyle}>
                <option value="INTERNAL">Interne</option>
                <option value="CONFIDENTIAL">Confidentiel</option>
                <option value="PUBLIC">Public</option>
              </select>
            </div>
            <div>
              <p className="chef-form-label">Fichier</p>
              <label style={fileFieldStyle}>
                <input
                  type="file"
                  name="file"
                  onChange={onFieldChange}
                  style={{ display: "none" }}
                />
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
            <div style={{ gridColumn: "1 / -1" }} className="chef-actions">
              <button className="modifier" disabled={submitting} type="submit">
                {submitting ? "Création..." : "Créer le document"}
              </button>
            </div>
          </form>
          </section>

          <section className="chef-panel">
            <div className="chef-panel-head">
              <div>
                <h2>Documents du service</h2>
                <p>Historique backend des documents créés depuis votre service.</p>
              </div>
              <div className="chef-action-pill">Historique</div>
            </div>

            <div className="activite-table-scroll">
              <table className="activite-table">
              <thead>
                <tr>
                  <th>Titre</th>
                  <th>Type</th>
                  <th>Service cible</th>
                  <th>Version</th>
                  <th>Statut</th>
                  <th>Créé le</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="7">Chargement des documents...</td></tr>
                ) : documents.length === 0 ? (
                  <tr><td colSpan="7">Aucun document du service pour le moment.</td></tr>
                ) : (
                  documents.map((doc) => (
                    <tr key={doc.id}>
                      <td>{doc.title}</td>
                      <td>{doc.doc_type}</td>
                      <td>{doc.target_service || "-"}</td>
                      <td>{doc.current_version || "-"}</td>
                      <td><span className={`badge ${getStatusClass(doc.status)}`}>{statusLabels[doc.status] || doc.status}</span></td>
                      <td>{formatDateTime(doc.created_at)}</td>
                      <td>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          <button className="modifier" onClick={() => openDocument(doc)} type="button">Consulter</button>
                          <button className="mode" onClick={() => downloadDocument(doc.id)} type="button">Télécharger</button>
                          {doc.status === "DRAFT" && (
                            <button className="mode" disabled={actionId === doc.id} onClick={() => sendDocument(doc.id)} type="button">
                              {actionId === doc.id ? "Envoi..." : "Envoyer"}
                            </button>
                          )}
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
      </div>

      {selectedDocument && (
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
              width: "min(94vw, 980px)",
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
                  {selectedDocument.doc_type} • {selectedDocument.target_service || "Sans service cible"} • version {selectedDocument.current_version || "-"}
                </p>
              </div>
              <button className="mode" onClick={() => setSelectedDocument(null)} type="button">
                Fermer
              </button>
            </div>

            {detailLoading ? (
              <div style={{ padding: "20px 0" }}>Chargement du détail...</div>
            ) : (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14, marginTop: 20 }}>
                  <div style={{ ...fieldStyle, minHeight: 74 }}>
                    <p className="desc">Statut</p>
                    <strong>{statusLabels[selectedDocument.status] || selectedDocument.status}</strong>
                  </div>
                  <div style={{ ...fieldStyle, minHeight: 74 }}>
                    <p className="desc">Source</p>
                    <strong>{selectedDocument.source_service || "-"}</strong>
                  </div>
                  <div style={{ ...fieldStyle, minHeight: 74 }}>
                    <p className="desc">Créé le</p>
                    <strong>{formatDateTime(selectedDocument.created_at)}</strong>
                  </div>
                </div>

                <div style={{ marginTop: 24, display: "grid", gridTemplateColumns: "1.05fr 0.95fr", gap: 18 }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                    <section>
                      <h3 style={{ marginTop: 0 }}>Commentaires</h3>
                      <form onSubmit={submitComment} style={{ marginBottom: 14 }}>
                        <textarea
                          rows={3}
                          value={commentText}
                          onChange={(event) => setCommentText(event.target.value)}
                          placeholder="Ajouter un commentaire de suivi."
                          style={{ ...fieldStyle, resize: "vertical" }}
                        />
                        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
                          <button className="modifier" disabled={commentSubmitting} type="submit">
                            {commentSubmitting ? "Envoi..." : "Commenter"}
                          </button>
                        </div>
                      </form>
                      <CommentThread comments={comments} dark={dark} />
                    </section>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                    <section>
                      <h3 style={{ marginTop: 0 }}>Nouvelle version</h3>
                      <form onSubmit={submitNewVersion}>
                        <label style={fileFieldStyle}>
                          <input
                            type="file"
                            onChange={(event) => setVersionFile(event.target.files?.[0] || null)}
                            style={{ display: "none" }}
                          />
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
                            {getSelectedFileLabel(versionFile)}
                          </span>
                        </label>
                        <textarea
                          rows={3}
                          value={versionComment}
                          onChange={(event) => setVersionComment(event.target.value)}
                          placeholder="Commentaire de version (optionnel)."
                          style={{ ...fieldStyle, resize: "vertical", marginTop: 12 }}
                        />
                        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 12 }}>
                          <button className="mode" onClick={() => downloadDocument(selectedDocument.id)} type="button">
                            Telecharger
                          </button>
                          <button className="modifier" disabled={versionSubmitting} type="submit">
                            {versionSubmitting ? "Enregistrement..." : "Creer une version"}
                          </button>
                        </div>
                      </form>
                    </section>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
