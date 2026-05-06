import NotificationBell from "../components/NotificationBell";
import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import Navbar from "../components/Navbar";
import useDarkModePreference from "../hooks/useDarkModePreference";
import usePersistentNavState from "../hooks/usePersistentNavState";
import { getRoleContext } from "../app/roleAccess";
import "../styles/profile.css";

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatMonth(value) {
  if (!value) return "-";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
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

export default function RhAbsences() {
  const [dark, setDark] = useDarkModePreference();
  const [isNavOpen, setIsNavOpen] = usePersistentNavState();
  const [roleCtx, setRoleCtx] = useState({});
  const [absences, setAbsences] = useState([]);
  const [flags, setFlags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState(null);
  const [feedback, setFeedback] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [warningTarget, setWarningTarget] = useState(null);
  const [warningComment, setWarningComment] = useState("Absence non justifiee");

  const canWarn = roleCtx.canViewRhAbsences ?? (roleCtx.isRhConges || roleCtx.isDrh) ?? false;
  const isGrh = roleCtx.isDrh ?? false;
  const yesterday = useMemo(() => {
    const value = new Date();
    value.setDate(value.getDate() - 1);
    return value.toISOString().slice(0, 10);
  }, []);

  const fieldClassName = `w-full rounded-2xl border px-4 py-3 text-sm outline-none transition ${
    dark
      ? "border-slate-700 bg-slate-950/80 text-slate-100 placeholder:text-slate-500 focus:border-amber-400"
      : "border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-amber-500"
  }`;

  const fetchData = async () => {
    try {
      setLoading(true);
      setErrorMessage("");
      const [meResponse, absencesResponse, flagsResponse] = await Promise.all([
        axios.get("/api/whoami/"),
        axios.get("/api/absences/yesterday/"),
        axios.get("/api/discipline/flags/"),
      ]);
      setRoleCtx(getRoleContext({ role: meResponse.data?.role, service: meResponse.data?.service, employee_role: meResponse.data?.employee_role }));
      setAbsences(Array.isArray(absencesResponse.data) ? absencesResponse.data : []);
      setFlags(Array.isArray(flagsResponse.data) ? flagsResponse.data : []);
    } catch (error) {
      console.error("Erreur chargement absences RH:", error);
      setAbsences([]);
      setFlags([]);
      setErrorMessage("Impossible de charger le module absences RH.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const stats = useMemo(() => {
    const totalFlags = flags.length;
    const totalWarnings = flags.reduce((sum, item) => sum + Number(item.warning_count || 0), 0);
    const highRisk = flags.filter((item) => Number(item.warning_count || 0) >= 5).length;
    return {
      absences: absences.length,
      flags: totalFlags,
      warnings: totalWarnings,
      highRisk,
    };
  }, [absences, flags]);

  const openWarningModal = (employee) => {
    setWarningTarget(employee);
    setWarningComment("Absence non justifiee");
    setFeedback("");
    setErrorMessage("");
  };

  const closeWarningModal = () => {
    if (actionId) return;
    setWarningTarget(null);
  };

  const issueWarning = async () => {
    if (!warningTarget) return;

    try {
      setActionId(warningTarget.id);
      setFeedback("");
      setErrorMessage("");
      const response = await axios.post("/api/warnings/", {
        employee_id: warningTarget.id,
        date: yesterday,
        comment: warningComment,
      });

      const nextCount = response.data?.warning_count;
      if (response.data?.detail === "warning for this employee and date already exists") {
        setFeedback(
          response.data?.notification_synced
            ? "Avertissement deja enregistre. La notification employe a ete resynchronisee."
            : "Avertissement deja enregistre pour cette date.",
        );
      } else {
        setFeedback(
          nextCount
            ? `Avertissement enregistre. Total du mois: ${nextCount}.`
            : "Avertissement enregistre avec succes.",
        );
      }

      closeWarningModal();
      await fetchData();
    } catch (error) {
      console.error("Erreur avertissement RH:", error);
      setErrorMessage(error?.response?.data?.detail || "Impossible d'enregistrer cet avertissement.");
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

      <div className={`profile-content min-h-screen !h-auto ${dark ? "bg-slate-950 text-slate-100" : "bg-[#f4f7f1] text-slate-900"}`}>
        <div
          className={`sticky top-0 z-40 border-b backdrop-blur ${
            dark ? "border-slate-800 bg-slate-950/90" : "border-white/70 bg-[#f4f7f1]/92"
          }`}
        >
          <div className="profile-naaav">
            <div className="yasar">
              <h1 className="monprofile">{isGrh ? "Absences globales" : "Absences RH"}</h1>
              <p className="morinfo">
                {isGrh
                  ? "Surveillez les absences detectees, les flags disciplinaires et les risques cumules a l'echelle globale."
                  : "Suivez les absences d'hier, emettez les avertissements utiles et reperez vite les situations sensibles."}
              </p>
            </div>
            <div className="yamin">
              <button className="nav-toggle" onClick={() => setIsNavOpen((prev) => !prev)} type="button">
                {isNavOpen ? "Masquer menu" : "Afficher menu"}
              </button>
              <button className="mode" onClick={() => setDark((prev) => !prev)} type="button">
                {dark ? "mode clair" : "mode sombre"}
              </button>
              <NotificationBell dark={dark} />
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
              <div className="relative overflow-hidden rounded-[30px] border border-amber-300/20 bg-[radial-gradient(circle_at_top_left,_rgba(245,158,11,0.22),_transparent_42%),linear-gradient(135deg,#111827_0%,#3d2511_45%,#7c3f18_100%)] p-6 text-white shadow-2xl shadow-amber-950/20">
                <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
                <div className="absolute bottom-0 right-0 h-28 w-28 rounded-tl-[40px] border-l border-t border-white/10 bg-white/5" />
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-200/80">
                  {isGrh ? "Discipline globale" : "Surveillance RH"}
                </p>
                <h2 className="mt-4 max-w-xl text-3xl font-black leading-tight md:text-4xl">
                  Une vue plus claire pour detecter l'absence, avertir vite et suivre les risques du mois.
                </h2>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-200">
                  Les absences detectees et les flags disciplinaires sont maintenant separes en deux zones lisibles,
                  avec un panneau d'avertissement plus propre que l'ancien prompt navigateur.
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={fetchData}
                    className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-amber-50"
                  >
                    Actualiser les donnees
                  </button>
                  <div className="rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-medium text-slate-100">
                    Date de controle: {formatDate(yesterday)}
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <MetricCard
                  dark={dark}
                  eyebrow="Absences"
                  value={stats.absences}
                  helper="Employes detectes sans pointage"
                  accent="from-amber-400 via-orange-500 to-red-500"
                />
                <MetricCard
                  dark={dark}
                  eyebrow="Flags"
                  value={stats.flags}
                  helper="Employes au-dessus du seuil disciplinaire"
                  accent="from-rose-400 via-rose-500 to-red-500"
                />
                <MetricCard
                  dark={dark}
                  eyebrow="Avertissements"
                  value={stats.warnings}
                  helper="Volume cumule sur les flags du mois"
                  accent="from-sky-400 via-cyan-500 to-blue-500"
                />
                <MetricCard
                  dark={dark}
                  eyebrow="Risque eleve"
                  value={stats.highRisk}
                  helper="Flags avec 5 avertissements ou plus"
                  accent="from-fuchsia-400 via-rose-500 to-orange-500"
                />
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

          <div className="grid gap-6 xl:grid-cols-[1.45fr_0.92fr]">
            <section
              className={`rounded-[32px] border p-6 shadow-sm ${
                dark ? "border-slate-800 bg-slate-900/90 shadow-black/20" : "border-white/80 bg-white/90 shadow-slate-200/70"
              }`}
            >
              <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">Absences detectees</p>
                  <h2 className={`mt-2 text-2xl font-black ${dark ? "text-slate-50" : "text-slate-900"}`}>
                    Employes a traiter
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                    Liste des employes sans pointage et sans conge approuve pour la derniere date de controle.
                  </p>
                </div>
                <div
                  className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] ${
                    dark ? "bg-slate-800 text-slate-200" : "bg-slate-100 text-slate-700"
                  }`}
                >
                  {loading ? "Chargement..." : `${absences.length} employe${absences.length > 1 ? "s" : ""}`}
                </div>
              </div>

              {loading ? (
                <div className="grid gap-4">
                  {[1, 2, 3].map((item) => (
                    <div
                      key={item}
                      className={`h-36 animate-pulse rounded-[28px] ${
                        dark ? "bg-slate-800/70" : "bg-slate-100"
                      }`}
                    />
                  ))}
                </div>
              ) : absences.length === 0 ? (
                <div
                  className={`rounded-[28px] border border-dashed px-6 py-12 text-center ${
                    dark ? "border-slate-700 bg-slate-950/40" : "border-slate-200 bg-slate-50"
                  }`}
                >
                  <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Aucune absence</p>
                  <h3 className={`mt-3 text-2xl font-black ${dark ? "text-slate-50" : "text-slate-900"}`}>
                    Aucune absence detectee pour la date du {formatDate(yesterday)}.
                  </h3>
                  <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-500">
                    Quand le systeme detectera un employe sans pointage ni conge approuve, il apparaitra ici avec son service.
                  </p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {absences.map((employee) => (
                    <article
                      key={employee.id}
                      className={`rounded-[28px] border p-5 transition ${
                        dark ? "border-slate-800 bg-slate-950/65 hover:border-slate-700" : "border-slate-200 bg-slate-50/70 hover:border-slate-300"
                      }`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="max-w-3xl">
                          <div className="flex flex-wrap items-center gap-3">
                            <span className="h-3 w-3 rounded-full bg-amber-500" />
                            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                              Controle absence
                            </p>
                            <span className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800 ring-1 ring-amber-200">
                              A verifier
                            </span>
                          </div>
                          <h3 className={`mt-3 text-xl font-black ${dark ? "text-slate-50" : "text-slate-900"}`}>
                            {employee.full_name}
                          </h3>
                          <p className="mt-2 text-sm leading-6 text-slate-500">
                            {employee.service || "Service non renseigne"} • Date concernee: {formatDate(yesterday)}
                          </p>
                        </div>

                        <div className={`min-w-[220px] rounded-[24px] border p-4 ${dark ? "border-slate-800 bg-slate-900" : "border-slate-200 bg-white"}`}>
                          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Action RH</p>
                          <p className="mt-3 text-sm text-slate-500">
                            Enregistrez un avertissement si l'absence reste injustifiee apres verification.
                          </p>
                          <button
                            className="mt-4 rounded-full bg-amber-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
                            disabled={!canWarn || actionId === employee.id}
                            onClick={() => openWarningModal(employee)}
                            type="button"
                          >
                            {actionId === employee.id ? "Enregistrement..." : "Avertir l'employe"}
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <aside className="grid gap-6">
              <section
                className={`rounded-[32px] border p-6 shadow-sm ${
                  dark ? "border-slate-800 bg-slate-900/90 shadow-black/20" : "border-white/80 bg-white/90 shadow-slate-200/70"
                }`}
              >
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Discipline du mois</p>
                  <h2 className={`mt-2 text-2xl font-black ${dark ? "text-slate-50" : "text-slate-900"}`}>
                    Flags disciplinaires
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    Employes ayant atteint au moins 3 avertissements sur le mois courant.
                  </p>
                </div>

                <div className="mt-5 grid gap-3">
                  {loading ? (
                    [1, 2].map((item) => (
                      <div
                        key={item}
                        className={`h-28 animate-pulse rounded-[24px] ${
                          dark ? "bg-slate-800/70" : "bg-slate-100"
                        }`}
                      />
                    ))
                  ) : flags.length === 0 ? (
                    <div
                      className={`rounded-[24px] border border-dashed px-5 py-8 text-center ${
                        dark ? "border-slate-700 bg-slate-950/40" : "border-slate-200 bg-slate-50"
                      }`}
                    >
                      <p className="text-sm text-slate-500">Aucun flag disciplinaire ce mois-ci.</p>
                    </div>
                  ) : (
                    flags.map((flag) => (
                      <div
                        key={`${flag.employee_id}-${flag.month}`}
                        className={`rounded-[24px] border p-4 ${
                          dark ? "border-slate-800 bg-slate-950/70" : "border-slate-200 bg-slate-50"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className={`text-base font-bold ${dark ? "text-slate-50" : "text-slate-900"}`}>
                              {flag.employee_name || "-"}
                            </h3>
                            <p className="mt-1 text-sm text-slate-500">{flag.employee_email}</p>
                          </div>
                          <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-800 ring-1 ring-rose-200">
                            {flag.warning_count} avert.
                          </span>
                        </div>
                        <div className="mt-4 flex items-center justify-between gap-4 text-sm">
                          <span className="text-slate-500">Mois</span>
                          <span className={dark ? "text-slate-100" : "text-slate-900"}>{formatMonth(flag.month)}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>

              <section
                className={`rounded-[32px] border p-6 shadow-sm ${
                  dark ? "border-slate-800 bg-slate-900/90 shadow-black/20" : "border-white/80 bg-white/90 shadow-slate-200/70"
                }`}
              >
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Mode d'emploi</p>
                  <h2 className={`mt-2 text-2xl font-black ${dark ? "text-slate-50" : "text-slate-900"}`}>
                    Bon usage des avertissements
                  </h2>
                </div>

                <div className="mt-5 grid gap-3">
                  {[
                    "Confirmez d'abord l'absence reelle et l'absence de conge approuve.",
                    "Ajoutez un commentaire clair pour conserver une trace exploitable.",
                    "Surveillez les flags du mois pour reperer rapidement les situations recurrentes.",
                  ].map((item) => (
                    <div
                      key={item}
                      className={`rounded-[22px] px-4 py-4 text-sm leading-6 ${
                        dark ? "bg-slate-950/70 text-slate-300" : "bg-slate-50 text-slate-600"
                      }`}
                    >
                      {item}
                    </div>
                  ))}
                </div>
              </section>
            </aside>
          </div>
        </div>
      </div>

      {warningTarget ? (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/60 px-4 py-6 backdrop-blur-sm"
          onClick={closeWarningModal}
        >
          <div
            className={`w-full max-w-2xl rounded-[32px] border p-6 shadow-2xl ${
              dark ? "border-slate-800 bg-slate-900 text-slate-100" : "border-white bg-white text-slate-900"
            }`}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Avertissement d'absence</p>
                <h3 className="mt-2 text-2xl font-black">{warningTarget.full_name}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  {warningTarget.service || "Service non renseigne"} • Date concernee: {formatDate(yesterday)}
                </p>
              </div>

              <button
                type="button"
                onClick={closeWarningModal}
                className={`rounded-full px-4 py-2 text-sm font-semibold ${
                  dark ? "bg-slate-800 text-slate-100 hover:bg-slate-700" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                Fermer
              </button>
            </div>

            <div className={`mt-6 rounded-[24px] p-4 ${dark ? "bg-slate-950/70" : "bg-slate-50"}`}>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Commentaire RH</p>
              <textarea
                rows={5}
                value={warningComment}
                onChange={(event) => setWarningComment(event.target.value)}
                className={`${fieldClassName} mt-3 resize-y`}
                placeholder="Precisez le contexte de l'absence ou les elements de verification..."
              />
            </div>

            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={closeWarningModal}
                disabled={!!actionId}
                className={`rounded-full border px-5 py-3 text-sm font-semibold ${
                  dark ? "border-slate-700 bg-slate-900 text-slate-100" : "border-slate-300 bg-white text-slate-700"
                } disabled:cursor-not-allowed disabled:opacity-60`}
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={issueWarning}
                disabled={!!actionId}
                className="rounded-full bg-amber-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {actionId ? "Enregistrement..." : "Confirmer l'avertissement"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
