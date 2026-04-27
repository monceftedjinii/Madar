import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import Navbar from "../components/Navbar";
import useDarkModePreference from "../hooks/useDarkModePreference";
import usePersistentNavState from "../hooks/usePersistentNavState";
import "../styles/profile.css";

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

function getNotificationTone(item) {
  const text = `${item?.title || ""} ${item?.message || ""}`.toLowerCase();
  if (isLeaveNotification(item)) {
    return {
      badge: "Congé",
      dot: "bg-emerald-500",
      accentBorder: "border-l-emerald-500",
      softLight: "border-emerald-200 bg-emerald-50 text-emerald-900",
      softDark: "border-emerald-500/30 bg-emerald-500/10 text-emerald-100",
    };
  }
  if (text.includes("avertissement") || text.includes("absence")) {
    return {
      badge: "Alerte RH",
      dot: "bg-amber-500",
      accentBorder: "border-l-amber-500",
      softLight: "border-amber-200 bg-amber-50 text-amber-900",
      softDark: "border-amber-500/30 bg-amber-500/10 text-amber-100",
    };
  }
  if (text.includes("formation") || text.includes("evaluation")) {
    return {
      badge: "Suivi RH",
      dot: "bg-emerald-500",
      accentBorder: "border-l-emerald-500",
      softLight: "border-emerald-200 bg-emerald-50 text-emerald-900",
      softDark: "border-emerald-500/30 bg-emerald-500/10 text-emerald-100",
    };
  }
  return {
    badge: "Info",
    dot: "bg-sky-500",
    accentBorder: "border-l-sky-500",
    softLight: "border-sky-200 bg-sky-50 text-sky-900",
    softDark: "border-sky-500/30 bg-sky-500/10 text-sky-100",
  };
}

function isLeaveNotification(item) {
  const text = `${item?.title || ""} ${item?.message || ""}`.toLowerCase();
  return text.includes("conge") || text.includes("congé") || item?.link === "/rh/leaves" || item?.link === "/chef/leaves";
}

export default function Notifications() {
  const [dark, setDark] = useDarkModePreference();
  const [isNavOpen, setIsNavOpen] = usePersistentNavState();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState(null);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await axios.get("/api/notifications/");
      const data = Array.isArray(response.data) ? response.data : [];
      setItems(data);
      window.dispatchEvent(new Event("notifications-updated"));
    } catch (error) {
      console.error("Erreur chargement notifications:", error);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const unreadCount = useMemo(
    () => items.filter((item) => !item.is_read).length,
    [items],
  );

  const notificationsWithLinks = useMemo(
    () => items.filter((item) => Boolean(item.link) && !isLeaveNotification(item)).length,
    [items],
  );

  const orderedItems = useMemo(
    () =>
      [...items].sort(
        (left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime(),
      ),
    [items],
  );

  const latestNotification = orderedItems[0] || null;

  const markAsRead = async (notificationId, link, shouldOpenLink = true) => {
    try {
      setActionId(notificationId);
      await axios.post(`/api/notifications/${notificationId}/read/`);
      setItems((previous) =>
        previous.map((item) =>
          item.id === notificationId ? { ...item, is_read: true } : item,
        ),
      );
      window.dispatchEvent(new Event("notifications-updated"));
      if (link && shouldOpenLink) {
        window.location.assign(link);
      }
    } catch (error) {
      console.error("Erreur mise a jour notification:", error);
    } finally {
      setActionId(null);
    }
  };

  return (
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
              <h1 className="monprofile">Notifications</h1>
              <p className="morinfo">
                Centre d&apos;alertes, suivi RH et rappels envoyes par la plateforme.
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

        <div className="mx-auto flex w-[96%] flex-col gap-6 py-6">
          <section
            className={`relative overflow-hidden rounded-[30px] border px-6 py-6 shadow-[0_24px_60px_rgba(15,23,42,0.08)] md:px-8 ${
              dark
                ? "border-slate-800 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.18),_transparent_35%),linear-gradient(135deg,_rgba(15,23,42,0.96),_rgba(30,41,59,0.92))]"
                : "border-white/70 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.18),_transparent_32%),linear-gradient(135deg,_rgba(248,250,252,0.98),_rgba(255,255,255,0.96))]"
            }`}
          >
            <div className="absolute inset-y-0 right-0 hidden w-1/3 bg-[radial-gradient(circle_at_center,_rgba(14,165,233,0.14),_transparent_58%)] lg:block" />
            <div className="relative grid gap-6 lg:grid-cols-[1.35fr_0.85fr]">
              <div className="space-y-5">
                <div className="inline-flex items-center rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-emerald-700 dark:text-emerald-200">
                  Espace communication
                </div>
                <div className="max-w-2xl space-y-3">
                  <h2
                    className={`text-3xl font-semibold tracking-tight md:text-4xl ${
                      dark ? "text-white" : "text-slate-900"
                    }`}
                  >
                    Vos alertes importantes restent visibles, lisibles et actionnables.
                  </h2>
                  <p className={`max-w-xl text-sm md:text-base ${dark ? "text-slate-300" : "text-slate-600"}`}>
                    Retrouvez les informations recentes, ouvrez rapidement les notifications utiles
                    et gardez un suivi clair des elements non lus.
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div
                    className={`rounded-2xl border px-4 py-4 ${
                      dark
                        ? "border-white/10 bg-white/5 text-slate-100"
                        : "border-slate-200 bg-white/85 text-slate-900"
                    }`}
                  >
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                      Total
                    </p>
                    <p className="mt-3 text-3xl font-semibold">{items.length}</p>
                  </div>
                  <div
                    className={`rounded-2xl border px-4 py-4 ${
                      dark
                        ? "border-amber-500/20 bg-amber-500/10 text-amber-100"
                        : "border-amber-200 bg-amber-50/90 text-amber-950"
                    }`}
                  >
                    <p className="text-xs uppercase tracking-[0.2em] text-amber-700/80 dark:text-amber-200/70">
                      Non lues
                    </p>
                    <p className="mt-3 text-3xl font-semibold">{unreadCount}</p>
                  </div>
                  <div
                    className={`rounded-2xl border px-4 py-4 ${
                      dark
                        ? "border-sky-500/20 bg-sky-500/10 text-sky-100"
                        : "border-sky-200 bg-sky-50/90 text-sky-950"
                    }`}
                  >
                    <p className="text-xs uppercase tracking-[0.2em] text-sky-700/80 dark:text-sky-200/70">
                      Liens utiles
                    </p>
                    <p className="mt-3 text-3xl font-semibold">{notificationsWithLinks}</p>
                  </div>
                </div>
              </div>

              <div
                className={`rounded-[28px] border p-5 ${
                  dark
                    ? "border-white/10 bg-slate-900/70 text-slate-100"
                    : "border-slate-200 bg-white/90 text-slate-900"
                }`}
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                      Dernier signal
                    </p>
                    <h3 className="mt-2 text-xl font-semibold">
                      {latestNotification?.title || "Aucune notification"}
                    </h3>
                  </div>
                  <button className="modifier" onClick={fetchNotifications} type="button">
                    Actualiser
                  </button>
                </div>
                <div
                  className={`mt-5 rounded-2xl border p-4 ${
                    latestNotification
                      ? dark
                        ? getNotificationTone(latestNotification).softDark
                        : getNotificationTone(latestNotification).softLight
                      : dark
                        ? "border-white/10 bg-white/5 text-slate-300"
                        : "border-slate-200 bg-slate-50 text-slate-600"
                  }`}
                >
                  {latestNotification ? (
                    <>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs font-semibold uppercase tracking-[0.18em]">
                          {getNotificationTone(latestNotification).badge}
                        </span>
                        <span className="text-xs">{formatDateTime(latestNotification.created_at)}</span>
                      </div>
                      <p className="mt-3 text-sm leading-6">
                        {latestNotification.message || "Aucun message detaille disponible."}
                      </p>
                    </>
                  ) : (
                    <p className="text-sm">Aucune activite recente pour le moment.</p>
                  )}
                </div>
              </div>
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-3">
            <article
              className={`rounded-[26px] border p-5 ${
                dark ? "border-slate-800 bg-slate-900/80 text-white" : "border-slate-200 bg-white text-slate-900"
              }`}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                Etat de lecture
              </p>
              <p className="mt-3 text-2xl font-semibold">
                {unreadCount > 0 ? "Attention requise" : "Tout est lu"}
              </p>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                Les notifications non lues restent mises en avant en tete de liste.
              </p>
            </article>
            <article
              className={`rounded-[26px] border p-5 ${
                dark ? "border-slate-800 bg-slate-900/80 text-white" : "border-slate-200 bg-white text-slate-900"
              }`}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                Derniere mise a jour
              </p>
              <p className="mt-3 text-2xl font-semibold">
                {loading ? "Synchronisation..." : "A jour"}
              </p>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                Rechargez a tout moment pour recuperer les nouvelles alertes backend.
              </p>
            </article>
            <article
              className={`rounded-[26px] border p-5 ${
                dark ? "border-slate-800 bg-slate-900/80 text-white" : "border-slate-200 bg-white text-slate-900"
              }`}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                Navigation
              </p>
              <p className="mt-3 text-2xl font-semibold">
                {latestNotification?.link && !isLeaveNotification(latestNotification) ? "Notification cliquable" : "Consultation locale"}
              </p>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                Les notifications avec lien peuvent ouvrir directement la page associee.
              </p>
            </article>
          </section>

          <section
            className={`rounded-[30px] border p-5 shadow-[0_20px_50px_rgba(15,23,42,0.06)] md:p-6 ${
              dark ? "border-slate-800 bg-slate-950/75" : "border-slate-200 bg-white/95"
            }`}
          >
            <div className="flex flex-col gap-3 border-b border-slate-200 pb-5 dark:border-slate-800 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-700 dark:text-emerald-300">
                  Flux de notifications
                </p>
                <h2 className={`mt-2 text-2xl font-semibold ${dark ? "text-white" : "text-slate-900"}`}>
                  Toutes les notifications recues
                </h2>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  Les notifications peuvent etre marquees comme traitees. Les demandes de conge affichent uniquement leur etat de traitement.
                </p>
              </div>
              <div
                className={`rounded-2xl border px-4 py-3 text-sm ${
                  dark ? "border-white/10 bg-white/5 text-slate-300" : "border-slate-200 bg-slate-50 text-slate-600"
                }`}
              >
                {loading
                  ? "Chargement en cours..."
                  : `${orderedItems.length} notification${orderedItems.length > 1 ? "s" : ""} affichee${orderedItems.length > 1 ? "s" : ""}`}
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-4">
              {loading && (
                <div
                  className={`rounded-[24px] border border-dashed px-5 py-10 text-center text-sm ${
                    dark ? "border-slate-700 bg-slate-900/70 text-slate-300" : "border-slate-300 bg-slate-50 text-slate-600"
                  }`}
                >
                  Chargement des notifications...
                </div>
              )}

              {!loading && orderedItems.length === 0 && (
                <div
                  className={`rounded-[24px] border border-dashed px-5 py-10 text-center text-sm ${
                    dark ? "border-slate-700 bg-slate-900/70 text-slate-300" : "border-slate-300 bg-slate-50 text-slate-600"
                  }`}
                >
                  Aucune notification disponible.
                </div>
              )}

              {!loading &&
                orderedItems.map((item) => {
                  const tone = getNotificationTone(item);
                  const isLeave = isLeaveNotification(item);

                  return (
                    <article
                      key={item.id}
                      className={`rounded-[26px] border border-l-4 p-5 transition-transform duration-200 hover:-translate-y-0.5 ${
                        tone.accentBorder
                      } ${
                        item.is_read
                          ? dark
                            ? "border-slate-800 bg-slate-900/90"
                            : "border-slate-200 bg-white"
                          : dark
                            ? "border-slate-700 bg-slate-900"
                            : "border-slate-200 bg-slate-50/80"
                      }`}
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="flex min-w-0 gap-4">
                          <div className="pt-1">
                            <span
                              className={`block h-3.5 w-3.5 rounded-full shadow-[0_0_0_8px_rgba(15,23,42,0.02)] ${tone.dot}`}
                            />
                          </div>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-3">
                              <span
                                className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${
                                  dark ? tone.softDark : tone.softLight
                                }`}
                              >
                                {tone.badge}
                              </span>
                              <span
                                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                  item.is_read
                                    ? dark
                                      ? "bg-white/5 text-slate-300"
                                      : "bg-slate-100 text-slate-600"
                                    : dark
                                      ? "bg-emerald-500/15 text-emerald-200"
                                      : "bg-emerald-100 text-emerald-800"
                                }`}
                              >
                                {item.is_read ? "Lue" : "Non lue"}
                              </span>
                            </div>
                            <h3
                              className={`mt-4 text-xl font-semibold ${
                                dark ? "text-slate-100" : "text-slate-900"
                              }`}
                            >
                              {item.title || "Notification"}
                            </h3>
                            <p
                              className={`mt-3 max-w-3xl text-sm leading-6 ${
                                dark ? "text-slate-300" : "text-slate-700"
                              }`}
                            >
                              {item.message || "Aucun message detaille disponible."}
                            </p>
                            <div
                              className={`mt-4 flex flex-wrap items-center gap-3 text-xs font-medium ${
                                dark ? "text-slate-400" : "text-slate-500"
                              }`}
                            >
                              <span>{formatDateTime(item.created_at)}</span>
                              {item.link && !isLeave && <span>Destination disponible</span>}
                            </div>
                          </div>
                        </div>

                        <div className="flex shrink-0 flex-wrap gap-3 lg:justify-end">
                          {!item.is_read ? (
                            <button
                              className="modifier"
                              disabled={actionId === item.id}
                              onClick={() => markAsRead(item.id, item.link, !isLeave)}
                              type="button"
                            >
                              {actionId === item.id
                                ? "Traitement..."
                                : isLeave
                                  ? "Pas traitee"
                                  : item.link
                                  ? "Lire et ouvrir"
                                  : "Marquer lue"}
                            </button>
                          ) : (
                            <span
                              className={`inline-flex items-center rounded-full border px-4 py-2 text-sm font-semibold ${
                                dark
                                  ? "border-white/10 bg-white/5 text-slate-200"
                                  : "border-slate-200 bg-slate-50 text-slate-600"
                              }`}
                            >
                              Deja traitee
                            </span>
                          )}

                          {item.is_read && item.link && !isLeave && (
                            <button
                              className={`rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                                dark
                                  ? "border-slate-700 bg-slate-900 text-slate-100 hover:border-emerald-500/40"
                                  : "border-slate-300 bg-white text-slate-900 hover:border-emerald-300"
                              }`}
                              onClick={() => window.location.assign(item.link)}
                              type="button"
                            >
                              Ouvrir
                            </button>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
