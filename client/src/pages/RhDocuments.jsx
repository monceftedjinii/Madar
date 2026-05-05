import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import Navbar from "../components/Navbar";
import useDarkModePreference from "../hooks/useDarkModePreference";
import usePersistentNavState from "../hooks/usePersistentNavState";
import { getRoleContext } from "../app/roleAccess";
import { downloadBlob } from "../utils/downloadFile";
import "../styles/profile.css";

const initialForm = {
  title: "",
  type: "",
  category: "RH",
  targetService: "",
  confidentialityLevel: "PUBLIC",
  file: null,
};

const statusLabels = {
  DRAFT: "Brouillon",
  SENT: "Envoye",
  VALIDATED: "Valide",
  REJECTED: "Refuse",
  ARCHIVED: "Archive",
};

const statusThemes = {
  DRAFT: {
    badge: "bg-slate-100 text-slate-700 ring-slate-200",
    dot: "bg-slate-400",
    panel: "from-slate-500/10 to-slate-500/5",
  },
  SENT: {
    badge: "bg-emerald-100 text-emerald-800 ring-emerald-200",
    dot: "bg-emerald-500",
    panel: "from-emerald-500/15 to-green-500/10",
  },
  VALIDATED: {
    badge: "bg-emerald-100 text-emerald-800 ring-emerald-200",
    dot: "bg-emerald-500",
    panel: "from-emerald-500/15 to-lime-500/10",
  },
  REJECTED: {
    badge: "bg-rose-100 text-rose-800 ring-rose-200",
    dot: "bg-rose-500",
    panel: "from-rose-500/15 to-red-500/10",
  },
  ARCHIVED: {
    badge: "bg-sky-100 text-sky-800 ring-sky-200",
    dot: "bg-sky-500",
    panel: "from-sky-500/15 to-cyan-500/10",
  },
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

function getStatusTheme(status, dark) {
  const fallback = dark
    ? {
        badge: "bg-slate-800 text-slate-100 ring-slate-700",
        dot: "bg-slate-400",
        panel: "from-slate-500/15 to-slate-500/5",
      }
    : {
        badge: "bg-slate-100 text-slate-700 ring-slate-200",
        dot: "bg-slate-400",
        panel: "from-slate-500/10 to-slate-500/5",
      };
  return statusThemes[status] || fallback;
}

function MetricCard({ dark, eyebrow, value, helper, accent }) {
  return (
    <div
      className={`rounded-[28px] border p-5 shadow-sm transition ${
        dark ? "border-slate-800 bg-slate-900/90 shadow-black/20" : "border-white/80 bg-white/90 shadow-slate-200/70"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-500">{eyebrow}</p>
          <p className={`mt-4 text-4xl font-black ${dark ? "text-slate-50" : "text-slate-900"}`}>{value}</p>
          <p className="mt-2 text-sm text-slate-500">{helper}</p>
        </div>
        <div className={`h-12 w-12 rounded-2xl bg-gradient-to-br ${accent}`} />
      </div>
    </div>
  );
}

function FieldLabel({ children }) {
  return <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{children}</label>;
}

export default function RhDocuments() {
  const [dark, setDark] = useDarkModePreference();
  const [isNavOpen, setIsNavOpen] = usePersistentNavState();
  const [documents, setDocuments] = useState([]);
  const [services, setServices] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [roleCtx, setRoleCtx] = useState({});
  const [userEmail, setUserEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [actionId, setActionId] = useState(null);
  const [feedback, setFeedback] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState("");
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [showArchives, setShowArchives] = useState(false);
  const [archivedIds, setArchivedIds] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem("rh_archived_docs") || "[]")); }
    catch { return new Set(); }
  });

  const canValidate = roleCtx.canValidateDocuments ?? roleCtx.isDrh ?? false;
  const canUpload = roleCtx.isRh ?? false;
  const isGrh = roleCtx.isDrh ?? false;

  const visibleDocuments = useMemo(
    () => documents.filter((item) => !archivedIds.has(item.id)),
    [documents, archivedIds]
  );
  const archivedDocuments = useMemo(
    () => documents.filter((item) => archivedIds.has(item.id)),
    [documents, archivedIds]
  );

  const saveArchived = (newSet) => {
    localStorage.setItem("rh_archived_docs", JSON.stringify([...newSet]));
    setArchivedIds(newSet);
  };
  const archiveDocLocally = (id) => { const s = new Set(archivedIds); s.add(id); saveArchived(s); setFeedback("Document archivé."); };
  const unarchiveDocLocally = (id) => { const s = new Set(archivedIds); s.delete(id); saveArchived(s); setFeedback("Document restauré."); };

  const fieldClassName = `w-full rounded-2xl border px-4 py-3 text-sm outline-none transition ${
    dark
      ? "border-slate-700 bg-slate-950/80 text-slate-100 placeholder:text-slate-500 focus:border-indigo-400"
      : "border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-indigo-500"
  }`;

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
      setRoleCtx(getRoleContext({ role: meResponse.data?.role, service: meResponse.data?.service, employee_role: meResponse.data?.employee_role }));
      setUserEmail(meResponse.data?.email || "");
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
    const total = visibleDocuments.length;
    const drafts = visibleDocuments.filter((item) => item.status === "DRAFT").length;
    const sent = visibleDocuments.filter((item) => item.status === "SENT").length;
    const validated = visibleDocuments.filter((item) => item.status === "VALIDATED").length;
    return { total, drafts, sent, validated };
  }, [visibleDocuments]);

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

  const downloadDocument = async (doc) => {
    try {
      const response = await axios.get(`/api/documents/${doc.id}/download/`, { responseType: "blob" });
      downloadBlob(response, doc.file_name || `document-${doc.id}`);
    } catch (error) {
      console.error("Erreur téléchargement:", error);
      setErrorMessage(error?.response?.data?.detail || "Impossible de télécharger ce document.");
    }
  };

  const sendDocument = async (documentId) => {
    try {
      setActionId(documentId);
      setFeedback("");
      setErrorMessage("");
      await axios.post(`/api/documents/${documentId}/send/`);
      setFeedback("Document envoye avec succes.");
      await fetchData();
    } catch (error) {
      console.error("Erreur envoi document:", error);
      setErrorMessage(error?.response?.data?.detail || "Impossible d'envoyer ce document.");
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
      setConfirmDialog(null);
    }
  };

  const deleteDocument = async (documentId) => {
    try {
      setActionId(documentId);
      setFeedback("");
      setErrorMessage("");
      await axios.delete(`/api/documents/${documentId}/delete/`);
      setFeedback("Document supprime avec succes.");
      await fetchData();
      if (selectedDocument?.id === documentId) {
        setSelectedDocument(null);
      }
    } catch (error) {
      console.error("Erreur suppression document RH:", error);
      setErrorMessage(error?.response?.data?.detail || "Impossible de supprimer ce document.");
    } finally {
      setActionId(null);
      setConfirmDialog(null);
    }
  };

  const confirmDelete = (documentId) => {
    setConfirmDialog({ type: "delete", documentId });
  };

  const confirmArchive = (documentId) => {
    setConfirmDialog({ type: "archive", documentId });
  };

  const handleConfirm = async () => {
    if (!confirmDialog) return;
    if (confirmDialog.type === "delete") {
      await deleteDocument(confirmDialog.documentId);
    } else if (confirmDialog.type === "archive") {
      await archiveDocument(confirmDialog.documentId);
    }
  };
  return (
    <div className={`profile-page${dark ? " dark" : ""} ${isNavOpen ? "nav-open" : "nav-closed"}`}>
      <div className={`navbar-profile-page ${isNavOpen ? "open" : "closed"}`}>
        <Navbar />
      </div>

      {isNavOpen && <div className="profile-overlay" onClick={() => setIsNavOpen(false)} aria-hidden="true" />}

      <div className={`profile-content min-h-screen !h-auto ${dark ? "bg-slate-950 text-slate-100" : "bg-[#f4f7f1] text-slate-900"}`}>
        <div
          className={`sticky top-0 z-40 border-b backdrop-blur ${
            dark ? "border-slate-800 bg-slate-950/90" : "border-white/70 bg-[#f4f7f1]/92"
          }`}
        >
          <div className="profile-naaav">
            <div className="yasar">
              <h1 className="monprofile">{isGrh ? "Documents globaux" : "Documents RH"}</h1>
              <p className="morinfo">
                {isGrh
                  ? "Supervisez le circuit documentaire global avec une vue plus claire sur les statuts et les arbitrages."
                  : "Créez, suivez et commentez les documents RH depuis une interface plus lisible."}
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

        <div className="mx-auto flex w-[96%] max-w-[1500px] flex-col gap-6 py-6">
          <section
            className={`overflow-hidden rounded-[36px] border p-6 md:p-8 ${
              dark ? "border-slate-800 bg-slate-900/90" : "border-white/80 bg-white/85"
            }`}
          >
            <div className="grid gap-6 lg:grid-cols-[1.3fr_0.9fr]">
              <div className="relative overflow-hidden rounded-[30px] border border-indigo-300/20 bg-[radial-gradient(circle_at_top_left,_rgba(99,102,241,0.18),_transparent_40%),linear-gradient(135deg,#0f172a_0%,#1d2441_45%,#4c3d8f_100%)] p-6 text-white shadow-2xl shadow-indigo-950/20">
                <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
                <div className="absolute bottom-0 right-0 h-28 w-28 rounded-tl-[40px] border-l border-t border-white/10 bg-white/5" />
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-indigo-200/80">
                  {isGrh ? "Circuit global" : "Vue documentaire RH"}
                </p>
                <h2 className="mt-4 max-w-xl text-3xl font-black leading-tight md:text-4xl">
                  Une page documentaire plus nette pour lire les statuts, commenter et arbitrer sans friction.
                </h2>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-200">
                  Les documents sont maintenant presentes comme un flux lisible avec services, statuts et actions clairement separes.
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={fetchData}
                    className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-indigo-50"
                  >
                    Actualiser les documents
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowArchives((prev) => !prev)}
                    className="rounded-full border border-white/30 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/20"
                  >
                    {showArchives ? "Masquer les archives" : `Voir les archives (${archivedDocuments.length})`}
                  </button>
                  <div className="rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-medium text-slate-100">
                    {visibleDocuments.length} document{visibleDocuments.length > 1 ? "s" : ""} visible{visibleDocuments.length > 1 ? "s" : ""}
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <MetricCard dark={dark} eyebrow="Total" value={stats.total} helper="Documents visibles dans votre scope" accent="from-indigo-400 via-indigo-500 to-fuchsia-500" />
                <MetricCard dark={dark} eyebrow="Brouillons" value={stats.drafts} helper="Documents encore non envoyes" accent="from-slate-400 via-slate-500 to-slate-600" />
                <MetricCard dark={dark} eyebrow="Envoyes" value={stats.sent} helper="Documents en attente de traitement" accent="from-amber-400 via-orange-500 to-rose-500" />
                <MetricCard dark={dark} eyebrow="Valides" value={stats.validated} helper="Documents deja approuves" accent="from-emerald-400 via-emerald-500 to-lime-500" />
              </div>
            </div>
          </section>

          {(feedback || errorMessage) && (
            <div
              className={`rounded-[24px] border px-5 py-4 text-sm font-medium shadow-sm ${
                errorMessage
                  ? dark
                    ? "border-rose-800 bg-rose-950/40 text-rose-100"
                    : "border-rose-200 bg-rose-50 text-rose-800"
                  : dark
                    ? "border-emerald-800 bg-emerald-950/40 text-emerald-100"
                    : "border-emerald-200 bg-emerald-50 text-emerald-800"
              }`}
            >
              {errorMessage || feedback}
            </div>
          )}

          <div className="grid gap-6 xl:grid-cols-[1.35fr_0.95fr]">
            <section
              className={`rounded-[32px] border p-6 shadow-sm ${
                dark ? "border-slate-800 bg-slate-900/90 shadow-black/20" : "border-white/80 bg-white/90 shadow-slate-200/70"
              }`}
            >
              <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">Flux documentaire</p>
                  <h2 className={`mt-2 text-2xl font-black ${dark ? "text-slate-50" : "text-slate-900"}`}>
                    Documents visibles
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                    Les documents archives sont retires de cette liste et restent caches jusqu'au clic sur "Voir les archives".
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowArchives((prev) => !prev)}
                  className={`rounded-full px-5 py-3 text-sm font-semibold transition ${
                    dark
                      ? "border border-slate-700 bg-slate-900 text-slate-100 hover:border-slate-500"
                      : "border border-slate-300 bg-white text-slate-700 hover:border-slate-400"
                  }`}
                >
                  {showArchives ? "Masquer les archives" : `Voir les archives (${archivedDocuments.length})`}
                </button>
              </div>

              {loading ? (
                <div className="grid gap-4">
                  {[1, 2, 3].map((item) => (
                    <div key={item} className={`h-44 animate-pulse rounded-[28px] ${dark ? "bg-slate-800/70" : "bg-slate-100"}`} />
                  ))}
                </div>
              ) : visibleDocuments.length === 0 ? (
                <div className={`rounded-[28px] border border-dashed px-6 py-12 text-center ${dark ? "border-slate-700 bg-slate-950/40" : "border-slate-200 bg-slate-50"}`}>
                  <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Aucun document</p>
                  <h3 className={`mt-3 text-2xl font-black ${dark ? "text-slate-50" : "text-slate-900"}`}>
                    Aucun document RH visible pour le moment.
                  </h3>
                </div>
              ) : (
                <div className="grid gap-4">
                  {visibleDocuments.map((doc) => {
                    const theme = getStatusTheme(doc.status, dark);
                    return (
                      <article
                        key={doc.id}
                        className={`rounded-[28px] border p-5 transition ${
                          dark ? "border-slate-800 bg-slate-950/65 hover:border-slate-700" : "border-slate-200 bg-slate-50/70 hover:border-slate-300"
                        }`}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div className="max-w-3xl">
                            <div className="flex flex-wrap items-center gap-3">
                              <span className={`h-3 w-3 rounded-full ${theme.dot}`} />
                              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Document #{doc.id}</p>
                              <span className="text-xs font-semibold text-slate-500">Cree le {formatDateTime(doc.created_at)}</span>
                              <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ${theme.badge}`}>
                                {statusLabels[doc.status] || doc.status}
                              </span>
                            </div>
                            <h3 className={`mt-3 text-xl font-black ${dark ? "text-slate-50" : "text-slate-900"}`}>{doc.title}</h3>
                            <p className="mt-2 text-sm leading-6 text-slate-500">
                              {doc.doc_type} • cree le {formatDateTime(doc.created_at)}
                            </p>
                          </div>
                          <div className={`min-w-[240px] rounded-[24px] bg-gradient-to-br p-4 ${theme.panel} ${dark ? "border border-slate-800" : "border border-white/70"}`}>
                            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Routage</p>
                            <div className="mt-3 space-y-2 text-sm">
                              <div className="flex items-center justify-between gap-4">
                                <span className="text-slate-500">Source</span>
                                <span className={dark ? "text-slate-100" : "text-slate-900"}>{doc.source_service || "-"}</span>
                              </div>
                              <div className="flex items-center justify-between gap-4">
                                <span className="text-slate-500">Cible</span>
                                <span className={dark ? "text-slate-100" : "text-slate-900"}>{doc.target_service || "-"}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200/10 pt-5">
                          <div className="text-sm text-slate-500">
                            Consultez le detail pour lire les commentaires et les pieces de contexte.
                          </div>
                          <div className="flex flex-wrap gap-3">
                            <button className="rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700" onClick={() => openDocument(doc)} type="button">
                              Consulter
                            </button>
                            {doc.status !== "DRAFT" && (
                              <button className={`rounded-full border px-5 py-3 text-sm font-semibold transition ${dark ? "border-slate-700 bg-slate-900 text-slate-100 hover:border-indigo-400 hover:text-indigo-300" : "border-slate-300 bg-white text-slate-700 hover:border-indigo-400 hover:text-indigo-600"}`} onClick={() => downloadDocument(doc)} type="button">
                                Télécharger
                              </button>
                            )}
                                  {confirmDialog && (
                                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                                      <div className={`rounded-[28px] border p-6 max-w-sm ${dark ? "border-slate-700 bg-slate-900" : "border-slate-200 bg-white"}`}>
                                        <h3 className={`text-lg font-black ${dark ? "text-slate-50" : "text-slate-900"}`}>
                                          {confirmDialog.type === "delete" ? "Supprimer le document ?" : "Archiver le document ?"}
                                        </h3>
                                        <p className="mt-3 text-sm text-slate-500">
                                          {confirmDialog.type === "delete"
                                            ? "Cette action supprimera definitivement le document. Etes-vous sur ?"
                                            : "Etes-vous sur de vouloir archiver ce document ?"}
                                        </p>
                                        <div className="mt-6 flex gap-3">
                                          <button
                                            type="button"
                                            onClick={() => setConfirmDialog(null)}
                                            className={`flex-1 rounded-full px-4 py-3 text-sm font-semibold transition ${dark ? "bg-slate-800 text-slate-100 hover:bg-slate-700" : "bg-slate-200 text-slate-900 hover:bg-slate-300"}`}
                                          >
                                            Non
                                          </button>
                                          <button
                                            type="button"
                                            onClick={handleConfirm}
                                            disabled={actionId === confirmDialog.documentId}
                                            className={`flex-1 rounded-full px-4 py-3 text-sm font-semibold text-white transition ${confirmDialog.type === "delete" ? "bg-red-600 hover:bg-red-500" : "bg-sky-600 hover:bg-sky-500"} disabled:opacity-60`}
                                          >
                                            {actionId === confirmDialog.documentId ? "En cours..." : "Oui"}
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                            <button className={`rounded-full border px-5 py-3 text-sm font-semibold transition ${dark ? "border-slate-700 bg-slate-900 text-slate-100 hover:border-sky-500 hover:text-sky-300" : "border-slate-300 bg-white text-slate-700 hover:border-sky-400 hover:text-sky-600"}`} onClick={() => archiveDocLocally(doc.id)} type="button">
                              Archiver
                            </button>
                            {(() => {
                              const canManage = isGrh || doc.created_by === userEmail;
                              if (doc.status === "DRAFT" && canManage) {
                                return (
                                  <>
                                    <button className={`rounded-full px-5 py-3 text-sm font-semibold transition bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-60`} disabled={actionId === doc.id} onClick={() => sendDocument(doc.id)} type="button">
                                      Envoyer
                                    </button>
                                    <button className={`rounded-full border px-5 py-3 text-sm font-semibold transition ${dark ? "border-slate-700 bg-slate-900 text-slate-100 hover:border-red-500 hover:text-red-300" : "border-slate-300 bg-white text-slate-700 hover:border-red-400 hover:text-red-600"}`} disabled={actionId === doc.id} onClick={() => confirmDelete(doc.id)} type="button">
                                      Supprimer
                                    </button>
                                  </>
                                );
                              }
                              return null;
                            })()}
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}

              {showArchives ? (
                <div className="mt-8 border-t border-slate-200/20 pt-8">
                  <div className="mb-5 flex items-end justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Section archive</p>
                      <h3 className={`mt-2 text-xl font-black ${dark ? "text-slate-50" : "text-slate-900"}`}>
                        Documents archives
                      </h3>
                    </div>
                    <span className="text-sm text-slate-500">{archivedDocuments.length} document(s)</span>
                  </div>

                  {archivedDocuments.length === 0 ? (
                    <div className={`rounded-[24px] border border-dashed px-6 py-8 text-center ${dark ? "border-slate-700 bg-slate-950/40" : "border-slate-200 bg-slate-50"}`}>
                      <p className="text-sm text-slate-500">Aucun document archive.</p>
                    </div>
                  ) : (
                    <div className="grid gap-4">
                      {archivedDocuments.map((doc) => {
                        const theme = getStatusTheme(doc.status, dark);
                        return (
                          <article
                            key={`archive-${doc.id}`}
                            className={`rounded-[24px] border p-5 opacity-75 ${
                              dark ? "border-slate-800 bg-slate-950/65" : "border-slate-200 bg-slate-50/70"
                            }`}
                          >
                            <div className="flex flex-wrap items-start justify-between gap-4">
                              <div>
                                <div className="flex flex-wrap items-center gap-3">
                                  <span className={`h-3 w-3 rounded-full ${theme.dot}`} />
                                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Document #{doc.id}</p>
                                  <span className="text-xs font-semibold text-slate-500">Cree le {formatDateTime(doc.created_at)}</span>
                                  <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ${theme.badge}`}>
                                    {statusLabels[doc.status] || doc.status}
                                  </span>
                                </div>
                                <h4 className={`mt-3 text-lg font-black ${dark ? "text-slate-50" : "text-slate-900"}`}>{doc.title}</h4>
                                <p className="mt-2 text-sm leading-6 text-slate-500">{doc.doc_type} • {doc.target_service || "-"}</p>
                              </div>
                              <div className="flex gap-3">
                                <button className="rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700" onClick={() => openDocument(doc)} type="button">Consulter</button>
                                <button className={`rounded-full border px-5 py-3 text-sm font-semibold transition ${dark ? "border-slate-700 bg-slate-900 text-slate-100 hover:border-indigo-400 hover:text-indigo-300" : "border-slate-300 bg-white text-slate-700 hover:border-indigo-400 hover:text-indigo-600"}`} onClick={() => unarchiveDocLocally(doc.id)} type="button">Désarchiver</button>
                              </div>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : null}
            </section>

            <aside className="grid gap-6">
              {canUpload ? (
                <section
                  className={`rounded-[32px] border p-6 shadow-sm ${
                    dark ? "border-slate-800 bg-slate-900/90 shadow-black/20" : "border-white/80 bg-white/90 shadow-slate-200/70"
                  }`}
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Creation</p>
                  <h2 className={`mt-2 text-2xl font-black ${dark ? "text-slate-50" : "text-slate-900"}`}>Nouveau document</h2>

                  <form onSubmit={submitDocument} className="mt-5 grid gap-4">
                    <div>
                      <FieldLabel>Titre</FieldLabel>
                      <input name="title" value={form.title} onChange={onFieldChange} className={fieldClassName} />
                    </div>
                    <div>
                      <FieldLabel>Type</FieldLabel>
                      <input name="type" value={form.type} onChange={onFieldChange} placeholder="Ex: Procedure RH" className={fieldClassName} />
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <FieldLabel>Categorie</FieldLabel>
                        <select name="category" value={form.category} onChange={onFieldChange} className={fieldClassName}>
                          <option value="RH">RH</option>
                          <option value="INTERNAL">Interne</option>
                        </select>
                      </div>
                      <div>
                        <FieldLabel>Confidentialite</FieldLabel>
                        <select name="confidentialityLevel" value={form.confidentialityLevel} onChange={onFieldChange} className={fieldClassName}>
                          <option value="PUBLIC">Public</option>
                          <option value="CONFIDENTIAL">Confidentiel</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <FieldLabel>Service cible</FieldLabel>
                      <select name="targetService" value={form.targetService} onChange={onFieldChange} className={fieldClassName}>
                        <option value="">Aucun service cible</option>
                        {services.map((service) => (
                          <option key={service.code} value={service.code}>
                            {service.nomService || service.code}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <FieldLabel>Fichier</FieldLabel>
                      <label className={`flex min-h-16 cursor-pointer items-center justify-between gap-3 rounded-2xl border px-4 py-3 ${dark ? "border-slate-700 bg-slate-950/80" : "border-slate-200 bg-white"}`}>
                        <input type="file" name="file" onChange={onFieldChange} className="hidden" />
                        <span className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white">Choisir</span>
                        <span className={`flex-1 truncate text-sm ${dark ? "text-slate-300" : "text-slate-600"}`}>{getSelectedFileLabel(form.file)}</span>
                      </label>
                    </div>

                    <button className="mt-2 rounded-full bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60" disabled={submitting} type="submit">
                      {submitting ? "Creation..." : "Creer le document"}
                    </button>
                  </form>
                </section>
              ) : null}

              <section
                className={`rounded-[32px] border p-6 shadow-sm ${
                  dark ? "border-slate-800 bg-slate-900/90 shadow-black/20" : "border-white/80 bg-white/90 shadow-slate-200/70"
                }`}
              >
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Reperes</p>
                <h2 className={`mt-2 text-2xl font-black ${dark ? "text-slate-50" : "text-slate-900"}`}>Bonnes pratiques</h2>
                <div className="mt-5 grid gap-3">
                  {[
                    "Renseignez un titre explicite et un type exploitable par le circuit RH.",
                    "Utilisez le service cible pour clarifier la destination du document.",
                    "Commentez le document pour laisser une trace lisible avant validation ou refus.",
                  ].map((item) => (
                    <div key={item} className={`rounded-[22px] px-4 py-4 text-sm leading-6 ${dark ? "bg-slate-950/70 text-slate-300" : "bg-slate-50 text-slate-600"}`}>
                      {item}
                    </div>
                  ))}
                </div>
              </section>
            </aside>
          </div>
        </div>
      </div>

      {selectedDocument ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/60 px-4 py-6 backdrop-blur-sm" onClick={() => setSelectedDocument(null)}>
          <div
            onClick={(event) => event.stopPropagation()}
            className={`w-full max-w-5xl rounded-[32px] border p-6 shadow-2xl ${dark ? "border-slate-800 bg-slate-900 text-slate-100" : "border-white bg-white text-slate-900"}`}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Detail document</p>
                <h2 className="mt-2 text-2xl font-black">{selectedDocument.title}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  {selectedDocument.doc_type} • {selectedDocument.source_service || "-"} • {statusLabels[selectedDocument.status] || selectedDocument.status}
                </p>
              </div>
              <button className={`rounded-full px-4 py-2 text-sm font-semibold ${dark ? "bg-slate-800 text-slate-100 hover:bg-slate-700" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`} onClick={() => setSelectedDocument(null)} type="button">
                Fermer
              </button>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
              <section className={`rounded-[24px] p-5 ${dark ? "bg-slate-950/70" : "bg-slate-50"}`}>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Commenter</p>
                <form onSubmit={submitComment} className="mt-4">
                  <textarea
                    rows={4}
                    value={commentText}
                    onChange={(event) => setCommentText(event.target.value)}
                    placeholder="Ajouter un commentaire RH."
                    className={`${fieldClassName} resize-y`}
                  />
                  <div className="mt-3 flex justify-end">
                    <button className="rounded-full bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60" disabled={commentSubmitting} type="submit">
                      {commentSubmitting ? "Envoi..." : "Commenter"}
                    </button>
                  </div>
                </form>
              </section>

              <section className={`rounded-[24px] p-5 ${dark ? "bg-slate-950/70" : "bg-slate-50"}`}>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Commentaires</p>
                <div className="mt-4 flex max-h-[420px] flex-col gap-3 overflow-auto">
                  {comments.length ? comments.map((comment) => (
                    <div key={comment.id} className={`rounded-[18px] border p-4 ${dark ? "border-slate-800 bg-slate-900" : "border-slate-200 bg-white"}`}>
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <strong>{comment.by_user_name || comment.by_user || "Utilisateur"}</strong>
                        <span className="text-xs text-slate-500">{formatDateTime(comment.created_at)}</span>
                      </div>
                      <p className="mt-3 text-sm leading-6">{comment.note}</p>
                    </div>
                  )) : (
                    <p className="text-sm text-slate-500">Aucun commentaire pour le moment.</p>
                  )}
                </div>
              </section>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
