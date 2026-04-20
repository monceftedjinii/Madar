import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import axios from "axios";
import Navbar from "../components/Navbar";
import useDarkModePreference from "../hooks/useDarkModePreference";
import usePersistentNavState from "../hooks/usePersistentNavState";
import "../styles/profile.css";
import "../styles/main-space.css";

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

function getPreviewType(fileUrl) {
  const normalized = String(fileUrl || "").toLowerCase();
  if (normalized.endsWith(".pdf")) return "pdf";
  if (/\.(png|jpg|jpeg|gif|webp|bmp|svg)$/.test(normalized)) return "image";
  return "other";
}

const statusLabels = {
  DRAFT: "Brouillon",
  SENT: "Envoyé",
  VALIDATED: "Validé",
  REJECTED: "Refusé",
  ARCHIVED: "Archivé",
};

const confidentialityLabels = {
  PUBLIC: "Public",
  INTERNAL: "Interne",
  CONFIDENTIAL: "Confidentiel",
};

export default function Documents() {
  const [dark, setDark] = useDarkModePreference();
  const [isNavOpen, setIsNavOpen] = usePersistentNavState();
  const location = useLocation();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isPreviewVisible, setIsPreviewVisible] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const requestedDocId = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const value = Number(params.get("docId"));
    return Number.isFinite(value) ? value : null;
  }, [location.search]);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      setErrorMessage("");
      const response = await axios.get("/api/documents/feed/");
      const nextDocuments = Array.isArray(response.data) ? response.data : [];
      setDocuments(nextDocuments);
      if (nextDocuments.length === 0) {
        setSelectedDocument(null);
        setSelectedId(null);
      }
    } catch (error) {
      console.error("Erreur chargement documents employé :", error);
      setDocuments([]);
      setSelectedDocument(null);
      setSelectedId(null);
      setErrorMessage("Impossible de charger vos documents publics.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  useEffect(() => {
    if (!isPreviewOpen || typeof window === "undefined") return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const frame = window.requestAnimationFrame(() => {
      setIsPreviewVisible(true);
    });

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        closePreview();
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isPreviewOpen]);

  const openDocument = async (documentId) => {
    try {
      setDetailLoading(true);
      setErrorMessage("");
      setFeedback("");
      const response = await axios.get(`/api/documents/${documentId}/`);
      setSelectedDocument(response.data || null);
      setSelectedId(documentId);
    } catch (error) {
      console.error("Erreur détail document employé :", error);
      setSelectedDocument(null);
      setSelectedId(null);
      setErrorMessage(error?.response?.data?.detail || "Impossible d'afficher ce document.");
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    if (!documents.length) return;

    const preferredId = requestedDocId || selectedId || documents[0]?.id;
    const exists = documents.some((document) => document.id === preferredId);
    if (!exists) {
      openDocument(documents[0].id);
      return;
    }
    if (preferredId !== selectedId) {
      openDocument(preferredId);
    }
  }, [documents, requestedDocId]);

  const downloadDocument = async (documentId) => {
    try {
      setFeedback("");
      setErrorMessage("");
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
      setFeedback("Téléchargement lancé.");
    } catch (error) {
      console.error("Erreur téléchargement document employé :", error);
      setErrorMessage(error?.response?.data?.detail || "Impossible de télécharger ce document.");
    }
  };

  const stats = useMemo(() => {
    const total = documents.length;
    const sent = documents.filter((item) => item.status === "SENT").length;
    const validated = documents.filter((item) => item.status === "VALIDATED").length;
    const archived = documents.filter((item) => item.status === "ARCHIVED").length;
    return { total, sent, validated, archived };
  }, [documents]);

  const previewType = getPreviewType(selectedDocument?.file_url);
  const canOpenPreview = Boolean(
    selectedDocument?.file_url && (previewType === "pdf" || previewType === "image"),
  );

  const openPreview = () => {
    if (!canOpenPreview) return;
    setIsPreviewOpen(true);
    setIsPreviewVisible(false);
  };

  const closePreview = () => {
    setIsPreviewVisible(false);
    window.setTimeout(() => {
      setIsPreviewOpen(false);
    }, 220);
  };

  return (
    <div className={`profile-page${dark ? " dark" : ""} ${isNavOpen ? "nav-open" : "nav-closed"}`}>
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

      <div className="profile-content !h-auto min-h-screen bg-transparent">
        <div
          className={`sticky top-0 z-40 backdrop-blur ${
            dark
              ? "border-b border-slate-800 bg-slate-950/90"
              : "border-b border-slate-200/80 bg-white/90"
          }`}
        >
          <div className="profile-naaav">
            <div className="yasar">
              <h1 className="monprofile">Mes documents</h1>
              <p className="morinfo">
                Consultez les documents publics envoyés à votre service. Les documents privés ou confidentiels sont masqués.
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
              <button className="mode" onClick={() => setDark((prev) => !prev)} type="button">
                {dark ? "mode clair" : "mode sombre"}
              </button>
            </div>
          </div>
        </div>

        <div className="main-page-stack">
          <section className="main-hero">
            <div className="main-hero-copy">
              <span className="main-eyebrow">Espace principal</span>
              <h2 className="main-hero-title">Réception claire des documents du service</h2>
              <p className="main-hero-description">
                Consultez les documents publics envoyés à votre service et accédez rapidement aux détails et à la prévisualisation.
              </p>
            </div>
            <div className="main-hero-kpis">
              <article className="main-kpi-card">
                <span>Total</span>
                <strong>{stats.total}</strong>
                <p>Documents visibles dans votre fil de reception.</p>
              </article>
              <article className="main-kpi-card">
                <span>Envoyés</span>
                <strong>{stats.sent}</strong>
                <p>Documents déjà envoyés à votre service.</p>
              </article>
              <article className="main-kpi-card">
                <span>Valides</span>
                <strong>{stats.validated}</strong>
                <p>Documents validés dans le circuit.</p>
              </article>
              <article className="main-kpi-card">
                <span>Sélection</span>
                <strong>{selectedDocument ? "1" : "0"}</strong>
                <p>{selectedDocument?.title || "Aucun document ouvert"}</p>
              </article>
            </div>
          </section>

          <div className="main-metrics-grid">
            <article className="main-metric-card">
              <span>Actualisation</span>
              <p style={{ marginTop: 12 }}>
                <button className="modifier" onClick={fetchDocuments} type="button">
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

          <section className="main-panel">
            <div className="main-panel-head">
              <div>
                <h2>Documents reçus</h2>
                <p>Seuls les documents publics envoyés à votre service sont affichés.</p>
              </div>
              <div className="main-action-pill">Réception</div>
            </div>

            <div className="activite-table-scroll">
              <table className="activite-table">
              <thead>
                <tr>
                  <th>Titre</th>
                  <th>Type</th>
                  <th>Service source</th>
                  <th>Statut</th>
                  <th>Date d'envoi</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="6">Chargement des documents...</td>
                  </tr>
                ) : documents.length === 0 ? (
                  <tr>
                    <td colSpan="6">Aucun document public n'a été envoyé à votre service.</td>
                  </tr>
                ) : (
                  documents.map((document) => (
                    <tr key={document.id}>
                      <td>{document.title}</td>
                      <td>{document.doc_type || "-"}</td>
                      <td>{document.source_service || "-"}</td>
                      <td>
                        <span className={`badge ${getStatusClass(document.status)}`}>
                          {statusLabels[document.status] || document.status}
                        </span>
                      </td>
                      <td>{formatDateTime(document.sent_at || document.created_at)}</td>
                      <td>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          <button
                            className="modifier"
                            onClick={() => openDocument(document.id)}
                            type="button"
                          >
                            Détails
                          </button>
                          <button
                            className="mode"
                            onClick={() => downloadDocument(document.id)}
                            type="button"
                          >
                            Télécharger
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              </table>
            </div>
          </section>

          <section className="main-panel">
            <div className="main-panel-head">
              <div>
                <h2>Détail du document</h2>
                <p>Visualisation du document sélectionné et de ses informations principales.</p>
              </div>
              <div className="main-action-pill">Détail</div>
            </div>

            {detailLoading ? (
              <div className="main-empty">Chargement du détail du document...</div>
            ) : !selectedDocument ? (
              <div className="main-empty">Sélectionnez un document public pour afficher ses détails.</div>
            ) : (
              <>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                    gap: 14,
                  }}
                >
                  <div>
                    <p className="desc">Titre</p>
                    <h3>{selectedDocument.title}</h3>
                  </div>
                  <div>
                    <p className="desc">Type</p>
                    <h3>{selectedDocument.doc_type || "-"}</h3>
                  </div>
                  <div>
                    <p className="desc">Confidentialité</p>
                    <h3>{confidentialityLabels[selectedDocument.confidentiality_level] || selectedDocument.confidentiality_level || "-"}</h3>
                  </div>
                  <div>
                    <p className="desc">Statut</p>
                    <h3>{statusLabels[selectedDocument.status] || selectedDocument.status}</h3>
                  </div>
                  <div>
                    <p className="desc">Service source</p>
                    <h3>{selectedDocument.source_service || "-"}</h3>
                  </div>
                  <div>
                    <p className="desc">Service cible</p>
                    <h3>{selectedDocument.target_service || "-"}</h3>
                  </div>
                  <div>
                    <p className="desc">Créé par</p>
                    <h3>{selectedDocument.created_by_name || selectedDocument.created_by || "-"}</h3>
                  </div>
                  <div>
                    <p className="desc">Date de création</p>
                    <h3>{formatDateTime(selectedDocument.created_at)}</h3>
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <button
                    className="modifier"
                    onClick={() => downloadDocument(selectedDocument.id)}
                    type="button"
                  >
                    Télécharger le document
                  </button>
                </div>

                <div
                  style={{
                    borderRadius: 18,
                    border: `1px solid ${dark ? "#334155" : "#e2e8f0"}`,
                    background: dark ? "#020617" : "#ffffff",
                    padding: 16,
                    minHeight: 420,
                  }}
                >
                  {canOpenPreview && (
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 12,
                        flexWrap: "wrap",
                        marginBottom: 14,
                      }}
                    >
                      <p className="desc" style={{ margin: 0 }}>
                        Cliquez sur l'aperçu pour afficher le document en grand avec animation.
                      </p>
                      <button className="modifier" onClick={openPreview} type="button">
                        Voir en grand
                      </button>
                    </div>
                  )}

                  {selectedDocument.file_url && previewType === "pdf" && (
                    <button
                      type="button"
                      onClick={openPreview}
                      style={{
                        width: "100%",
                        padding: 0,
                        border: "none",
                        background: "transparent",
                        cursor: "zoom-in",
                        borderRadius: 12,
                        overflow: "hidden",
                        transition: "transform 220ms ease, box-shadow 220ms ease",
                        boxShadow: dark
                          ? "0 18px 45px rgba(15, 23, 42, 0.45)"
                          : "0 18px 45px rgba(148, 163, 184, 0.25)",
                      }}
                    >
                      <iframe
                        src={selectedDocument.file_url}
                        title={selectedDocument.title}
                        style={{
                          width: "100%",
                          minHeight: 620,
                          border: "none",
                          borderRadius: 12,
                          pointerEvents: "none",
                        }}
                      />
                    </button>
                  )}

                  {selectedDocument.file_url && previewType === "image" && (
                    <button
                      type="button"
                      onClick={openPreview}
                      style={{
                        width: "100%",
                        padding: 0,
                        border: "none",
                        background: "transparent",
                        cursor: "zoom-in",
                        borderRadius: 12,
                        overflow: "hidden",
                        transition: "transform 220ms ease, box-shadow 220ms ease",
                        boxShadow: dark
                          ? "0 18px 45px rgba(15, 23, 42, 0.45)"
                          : "0 18px 45px rgba(148, 163, 184, 0.25)",
                      }}
                    >
                      <img
                        src={selectedDocument.file_url}
                        alt={selectedDocument.title}
                        style={{ width: "100%", maxHeight: 620, objectFit: "contain", borderRadius: 12 }}
                      />
                    </button>
                  )}

                  {(!selectedDocument.file_url || previewType === "other") && (
                    <div
                      style={{
                        minHeight: 360,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 12,
                        textAlign: "center",
                      }}
                    >
                      <h3 style={{ margin: 0 }}>Aperçu indisponible</h3>
                      <p className="desc" style={{ maxWidth: 480 }}>
                        Ce type de fichier ne peut pas être prévisualisé directement dans la page. Utilisez le bouton de téléchargement pour le consulter.
                      </p>
                    </div>
                  )}
                </div>
              </>
            )}
          </section>
        </div>
      </div>

      {isPreviewOpen && selectedDocument?.file_url && (
        <div
          aria-hidden="true"
          onClick={closePreview}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 200,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
            background: dark ? "rgba(2, 6, 23, 0.72)" : "rgba(15, 23, 42, 0.55)",
            backdropFilter: "blur(10px)",
            opacity: isPreviewVisible ? 1 : 0,
            transition: "opacity 220ms ease",
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`Aperçu complet de ${selectedDocument.title}`}
            onClick={(event) => event.stopPropagation()}
            style={{
              width: "min(1200px, 100%)",
              height: "min(90vh, 920px)",
              borderRadius: 24,
              overflow: "hidden",
              border: `1px solid ${dark ? "rgba(148, 163, 184, 0.24)" : "rgba(148, 163, 184, 0.28)"}`,
              background: dark
                ? "linear-gradient(180deg, rgba(15,23,42,0.96), rgba(2,6,23,0.98))"
                : "linear-gradient(180deg, rgba(255,255,255,0.98), rgba(248,250,252,0.98))",
              boxShadow: dark
                ? "0 40px 120px rgba(0, 0, 0, 0.5)"
                : "0 40px 120px rgba(15, 23, 42, 0.22)",
              transform: isPreviewVisible
                ? "translateY(0) scale(1)"
                : "translateY(26px) scale(0.96)",
              opacity: isPreviewVisible ? 1 : 0,
              transition: "transform 260ms cubic-bezier(0.22, 1, 0.36, 1), opacity 220ms ease",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 16,
                padding: "16px 18px",
                borderBottom: `1px solid ${dark ? "#1e293b" : "#e2e8f0"}`,
                background: dark ? "rgba(15, 23, 42, 0.75)" : "rgba(255, 255, 255, 0.75)",
                backdropFilter: "blur(14px)",
              }}
            >
              <div style={{ minWidth: 0 }}>
                <h3
                  style={{
                    margin: 0,
                    color: dark ? "#f8fafc" : "#0f172a",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {selectedDocument.title}
                </h3>
                <p className="desc" style={{ margin: "4px 0 0" }}>
                  Visualisation complète du document
                </p>
              </div>

              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <button className="modifier" onClick={() => downloadDocument(selectedDocument.id)} type="button">
                  Télécharger
                </button>
                <button
                  type="button"
                  onClick={closePreview}
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 999,
                    border: `1px solid ${dark ? "#334155" : "#cbd5e1"}`,
                    background: dark ? "#0f172a" : "#ffffff",
                    color: dark ? "#e2e8f0" : "#0f172a",
                    cursor: "pointer",
                    fontSize: 24,
                    lineHeight: 1,
                  }}
                >
                  ×
                </button>
              </div>
            </div>

            <div
              style={{
                flex: 1,
                padding: 18,
                background: dark ? "rgba(2, 6, 23, 0.75)" : "rgba(241, 245, 249, 0.7)",
              }}
            >
              {previewType === "pdf" ? (
                <iframe
                  src={selectedDocument.file_url}
                  title={`${selectedDocument.title} preview`}
                  style={{ width: "100%", height: "100%", border: "none", borderRadius: 18, background: "#ffffff" }}
                />
              ) : (
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    borderRadius: 18,
                    overflow: "auto",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: dark ? "#020617" : "#ffffff",
                  }}
                >
                  <img
                    src={selectedDocument.file_url}
                    alt={selectedDocument.title}
                    style={{
                      maxWidth: "100%",
                      maxHeight: "100%",
                      objectFit: "contain",
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
