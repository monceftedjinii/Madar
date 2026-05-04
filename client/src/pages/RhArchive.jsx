import { useEffect, useState } from "react";
import axios from "axios";
import Navbar from "../components/Navbar";
import useDarkModePreference from "../hooks/useDarkModePreference";
import usePersistentNavState from "../hooks/usePersistentNavState";
import "../styles/profile.css";

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
    badge: "bg-amber-100 text-amber-800 ring-amber-200",
    dot: "bg-amber-500",
    panel: "from-amber-500/15 to-orange-500/10",
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

function formatDateTime(isoString) {
  if (!isoString) return "";
  return new Date(isoString).toLocaleString("fr-FR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getStatusTheme(status, dark) {
  return statusThemes[status] || statusThemes.DRAFT;
}

export default function RhArchive() {
  const [dark, setDark] = useDarkModePreference();
  const [isNavOpen, setIsNavOpen] = usePersistentNavState();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDocument, setSelectedDocument] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await axios.get("/api/documents/archived/");
      setDocuments(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error("Erreur chargement documents archives RH:", error);
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openDocument = (doc) => {
    setSelectedDocument(doc);
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
            <div className="flex items-center justify-between px-6 py-5">
              <h1 className={`text-2xl font-black ${dark ? "text-slate-50" : "text-slate-900"}`}>
                Archive RH
              </h1>
            </div>
          </div>
        </div>

        <div className="profile-body">
          <div className="space-y-12 px-6 pb-12 pt-8">
            <div>
              <h2 className={`text-2xl font-black ${dark ? "text-slate-50" : "text-slate-900"}`}>
                Documents Archives
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                Tous vos documents archives sont affiches ici. Vous pouvez les consulter ou les restaurer.
              </p>
            </div>

            {loading ? (
              <div className="grid gap-4">
                {[1, 2, 3].map((item) => (
                  <div key={item} className={`h-44 animate-pulse rounded-[28px] ${dark ? "bg-slate-800/70" : "bg-slate-100"}`} />
                ))}
              </div>
            ) : documents.length === 0 ? (
              <div className={`rounded-[28px] border border-dashed px-6 py-12 text-center ${dark ? "border-slate-700 bg-slate-950/40" : "border-slate-200 bg-slate-50"}`}>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Aucun document</p>
                <h3 className={`mt-3 text-2xl font-black ${dark ? "text-slate-50" : "text-slate-900"}`}>
                  Aucun document archive pour le moment.
                </h3>
              </div>
            ) : (
              <div className="grid gap-4">
                {documents.map((doc) => {
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
                          Document archive le {formatDateTime(doc.archived_at || doc.updated_at)}
                        </div>
                        <div className="flex flex-wrap gap-3">
                          <button className="rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700" onClick={() => openDocument(doc)} type="button">
                            Consulter
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {selectedDocument ? (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50" onClick={() => setSelectedDocument(null)}>
            <div className="flex min-h-screen items-center justify-center p-4">
              <div
                className={`max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[28px] p-6 ${dark ? "bg-slate-900" : "bg-white"}`}
                onClick={(e) => e.stopPropagation()}
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
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
