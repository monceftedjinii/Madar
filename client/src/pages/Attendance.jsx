import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import Navbar from "../components/Navbar";
import useDarkModePreference from "../hooks/useDarkModePreference";
import "../styles/profile.css";

const parseISODate = (value) => {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
};

const toISODate = (value) => {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getTodayISO = () => toISODate(new Date());

const getDatesInRange = (from, to) => {
  if (!from || !to || from > to) return [];

  const dates = [];
  const current = parseISODate(from);
  const end = parseISODate(to);

  while (current <= end) {
    dates.push(toISODate(current));
    current.setDate(current.getDate() + 1);
  }

  return dates;
};

const getDefaultRange = () => {
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  return {
    from: toISODate(firstDay),
    to: toISODate(today),
  };
};

const formatTime = (value) => (value ? value.slice(0, 5) : "--:--");

const formatDate = (value) => {
  try {
    return parseISODate(value).toLocaleDateString("fr-FR", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return value;
  }
};

const mapAttendanceError = (requestError, role) => {
  const detail =
    requestError?.response?.data?.detail ||
    requestError?.response?.data?.error ||
    "";

  if (detail === "You do not have permission to perform this action.") {
    return role && !["EMPLOYEE", "CHEF"].includes(role)
      ? "Le pointage est reserve aux comptes employe et chef de service."
      : "Vous n'avez pas la permission d'effectuer cette action.";
  }

  if (detail === "pin is required") return "Le code PIN est obligatoire.";
  if (detail === "pin must be exactly 4 digits") {
    return "Le code PIN doit contenir exactement 4 chiffres.";
  }
  if (detail === "employee record not found") {
    return "Aucun dossier employe n'est lie a ce compte.";
  }
  if (detail === "pin not set") {
    return "Aucun code PIN n'est configure pour ce compte.";
  }
  if (detail === "Invalid PIN") return "Code PIN invalide.";
  if (detail === "already checked in") {
    return "L'entree a deja ete enregistree aujourd'hui.";
  }
  if (detail === "already checked out") {
    return "La sortie a deja ete enregistree aujourd'hui.";
  }
  if (detail === "no check-in found for today") {
    return "Aucune entree n'a ete enregistree pour aujourd'hui.";
  }

  return detail || "Erreur lors du pointage.";
};

export default function Attendance() {
  const [dark, setDark] = useDarkModePreference();
  const [isNavOpen, setIsNavOpen] = useState(true);
  const [records, setRecords] = useState([]);
  const [todayRecord, setTodayRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [actionMessage, setActionMessage] = useState(null);
  const [actionInProgress, setActionInProgress] = useState(null);
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState("");
  const [pinValue, setPinValue] = useState("");
  const [pinError, setPinError] = useState("");
  const [currentUserRole, setCurrentUserRole] = useState("");

  const defaultRange = useMemo(() => getDefaultRange(), []);
  const [fromDate, setFromDate] = useState(defaultRange.from);
  const [toDate, setToDate] = useState(defaultRange.to);
  const [appliedRange, setAppliedRange] = useState(defaultRange);

  const accessToken = localStorage.getItem("access_token");
  const authConfig = useMemo(
    () => ({
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }),
    [accessToken],
  );

  const fetchAttendance = useCallback(
    async (from, to) => {
      try {
        setLoading(true);
        setError("");
        const response = await axios.get("/api/attendance/me/", {
          ...authConfig,
          params: { from, to },
        });
        setRecords(response.data || []);
        setAppliedRange({ from, to });
        setHistoryLoaded(true);
      } catch (requestError) {
        setError(
          requestError?.response?.data?.detail ||
            requestError?.response?.data?.error ||
            "Impossible de charger l'historique de présence.",
        );
      } finally {
        setLoading(false);
      }
    },
    [authConfig],
  );

  const fetchTodayAttendance = useCallback(async () => {
    try {
      const today = getTodayISO();
      const response = await axios.get("/api/attendance/me/", {
        ...authConfig,
        params: { from: today, to: today },
      });
      setTodayRecord(response.data?.[0] || null);
    } catch {
      setTodayRecord(null);
    }
  }, [authConfig]);

  useEffect(() => {
    fetchAttendance(defaultRange.from, defaultRange.to);
    fetchTodayAttendance();
  }, [defaultRange, fetchAttendance, fetchTodayAttendance]);

  useEffect(() => {
    let isMounted = true;

    const fetchCurrentUser = async () => {
      try {
        const response = await axios.get("/api/whoami/", authConfig);
        if (isMounted) {
          setCurrentUserRole(response.data?.role || "");
        }
      } catch {
        if (isMounted) {
          setCurrentUserRole("");
        }
      }
    };

    fetchCurrentUser();

    return () => {
      isMounted = false;
    };
  }, [authConfig]);

  useEffect(() => {
    const onEscape = (event) => {
      if (event.key === "Escape" && pinModalOpen && !actionInProgress) {
        setPinModalOpen(false);
        setPendingAction("");
        setPinValue("");
        setPinError("");
      }
    };

    window.addEventListener("keydown", onEscape);
    return () => window.removeEventListener("keydown", onEscape);
  }, [pinModalOpen, actionInProgress]);

  const displayedRecords = useMemo(() => {
    const sortedRecords = [...records].sort((left, right) =>
      right.date.localeCompare(left.date),
    );

    if (!historyLoaded) {
      return sortedRecords;
    }

    const cappedToDate =
      appliedRange.to > getTodayISO() ? getTodayISO() : appliedRange.to;

    if (
      !appliedRange.from ||
      !cappedToDate ||
      appliedRange.from > cappedToDate
    ) {
      return sortedRecords;
    }

    const recordsMap = new Map(records.map((item) => [item.date, item]));

    return getDatesInRange(appliedRange.from, cappedToDate)
      .map(
        (date) =>
          recordsMap.get(date) || {
            date,
            check_in_time: null,
            check_out_time: null,
          },
      )
      .reverse();
  }, [records, historyLoaded, appliedRange]);

  const completedDays = displayedRecords.filter(
    (item) => item.check_in_time && item.check_out_time,
  ).length;
  const pendingCheckoutDays = displayedRecords.filter(
    (item) => item.check_in_time && !item.check_out_time,
  ).length;
  const absentDays = displayedRecords.filter(
    (item) => !item.check_in_time,
  ).length;

  const todayStatus = todayRecord?.check_out_time
    ? "Journée terminée"
    : todayRecord?.check_in_time
      ? "Présence en cours"
      : "Pas encore pointé";

  const canUseAttendance =
    !currentUserRole || ["EMPLOYEE", "CHEF"].includes(currentUserRole);

  const canCheckIn =
    canUseAttendance && !todayRecord?.check_in_time && !actionInProgress;
  const canCheckOut =
    canUseAttendance &&
    !!todayRecord?.check_in_time &&
    !todayRecord?.check_out_time &&
    !actionInProgress;

  const actionButtonStyle = (variant, disabled) => ({
    border: "none",
    borderRadius: 12,
    padding: "12px 18px",
    fontWeight: 700,
    cursor: disabled ? "not-allowed" : "pointer",
    background: disabled
      ? dark
        ? "#334155"
        : "#d1d5db"
      : variant === "success"
        ? "#16a34a"
        : "#dc2626",
    color: "#fff",
    opacity: disabled ? 0.7 : 1,
  });

  const fieldStyle = {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 10,
    border: `1px solid ${dark ? "#334155" : "#d1d5db"}`,
    background: dark ? "#0f172a" : "#ffffff",
    color: dark ? "#e2e8f0" : "#0f172a",
    boxSizing: "border-box",
  };

  const modalCardStyle = {
    width: "min(92vw, 360px)",
    borderRadius: 18,
    padding: 22,
    background: dark ? "#111827" : "#ffffff",
    color: dark ? "#e2e8f0" : "#111827",
    boxShadow: "0 18px 48px rgba(15, 23, 42, 0.28)",
  };

  const closePinModal = () => {
    if (actionInProgress) return;
    setPinModalOpen(false);
    setPendingAction("");
    setPinValue("");
    setPinError("");
  };

  const forceClosePinModal = () => {
    setPinModalOpen(false);
    setPendingAction("");
    setPinValue("");
    setPinError("");
  };

  const openPinModal = (action) => {
    setActionMessage(null);
    setPendingAction(action);
    setPinValue("");
    setPinError("");
    setPinModalOpen(true);
  };

  const handleApplyFilters = async () => {
    if (fromDate && toDate && fromDate > toDate) {
      setError("La date de début doit être avant la date de fin.");
      return;
    }
    await fetchAttendance(fromDate, toDate);
  };

  const handlePinConfirm = async () => {
    if (currentUserRole && !["EMPLOYEE", "CHEF"].includes(currentUserRole)) {
      setPinError(
        "Le pointage est reserve aux comptes employe et chef de service.",
      );
      return;
    }

    if (pinValue.length !== 4) {
      setPinError("Le code PIN doit contenir 4 chiffres.");
      return;
    }

    try {
      setActionInProgress(pendingAction);
      setPinError("");
      setError("");
      const endpoint =
        pendingAction === "check-in"
          ? "/api/attendance/check-in/"
          : "/api/attendance/check-out/";

      const response = await axios.post(
        endpoint,
        { pin: pinValue },
        authConfig,
      );

      const today = getTodayISO();
      const existingRecord = records.find((record) => record.date === today);

      if (pendingAction === "check-in") {
        const updatedRecord = {
          date: today,
          check_in_time:
            response.data?.check_in_time ||
            existingRecord?.check_in_time ||
            todayRecord?.check_in_time ||
            null,
          check_out_time:
            existingRecord?.check_out_time ||
            todayRecord?.check_out_time ||
            null,
        };

        setTodayRecord(updatedRecord);
        setRecords((previousRecords) => {
          const filteredRecords = previousRecords.filter(
            (record) => record.date !== today,
          );
          return [...filteredRecords, updatedRecord];
        });
      } else {
        const updatedRecord = {
          date: today,
          check_in_time:
            existingRecord?.check_in_time || todayRecord?.check_in_time || null,
          check_out_time:
            response.data?.check_out_time ||
            existingRecord?.check_out_time ||
            todayRecord?.check_out_time ||
            null,
        };

        setTodayRecord(updatedRecord);
        setRecords((previousRecords) => {
          const filteredRecords = previousRecords.filter(
            (record) => record.date !== today,
          );
          return [...filteredRecords, updatedRecord];
        });
      }

      setActionMessage({
        type: "success",
        text:
          pendingAction === "check-in"
            ? "Pointage d'entrée enregistré avec succès."
            : "Pointage de sortie enregistré avec succès.",
      });

      forceClosePinModal();
      await Promise.all([
        fetchAttendance(appliedRange.from, appliedRange.to),
        fetchTodayAttendance(),
      ]);
    } catch (requestError) {
      setPinError(mapAttendanceError(requestError, currentUserRole));
    } finally {
      setActionInProgress(null);
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

      <div className="profile-content">
        <div style={{ borderBottom: "1px solid rgba(0, 0, 0, 0.1)" }}>
          <div className="profile-naaav">
            <div className="yasar">
              <h3 className="monprofile">Gestion de présence</h3>
              <p className="morinfo">
                Pointage d'entrée/sortie et historique personnel
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
              <button
                className="mode"
                onClick={() => setDark((prev) => !prev)}
                type="button"
              >
                {dark ? " mode clair" : " mode sombre"}
              </button>
            </div>
          </div>
        </div>

        <div className="profile-infos">
          <div className="quelques-infos">
            <div
              className="gauche"
              style={{
                width: "100%",
                justifyContent: "space-between",
                flexWrap: "wrap",
              }}
            >
              <div className="infooos">
                <div className="nom-status">
                  <h3>Statut du jour</h3>
                  <div className="status">{todayStatus}</div>
                </div>
                <p>
                  Utilisez votre PIN à 4 chiffres pour enregistrer votre
                  présence.
                </p>
                {!canUseAttendance && (
                  <p style={{ color: "#dc2626", fontWeight: 600 }}>
                    Ce compte n'a pas acces au pointage. Utilisez un compte
                    employe ou chef de service pour pointer l'entree et la sortie.
                  </p>
                )}
                <div>
                  <div>Entrée: {formatTime(todayRecord?.check_in_time)}</div>
                  <div>Sortie: {formatTime(todayRecord?.check_out_time)}</div>
                  <div>
                    Période: {appliedRange.from} → {appliedRange.to}
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button
                  type="button"
                  style={actionButtonStyle("success", !canCheckIn)}
                  disabled={!canCheckIn}
                  onClick={() => openPinModal("check-in")}
                >
                  {actionInProgress === "check-in"
                    ? "Pointage..."
                    : "Pointer l'entrée"}
                </button>
                <button
                  type="button"
                  style={actionButtonStyle("danger", !canCheckOut)}
                  disabled={!canCheckOut}
                  onClick={() => openPinModal("check-out")}
                >
                  {actionInProgress === "check-out"
                    ? "Pointage..."
                    : "Pointer la sortie"}
                </button>
              </div>
            </div>
          </div>

          {(error || actionMessage) && (
            <div
              style={{
                width: "calc(100% - 40px)",
                margin: "14px auto 0",
                padding: "12px 16px",
                borderRadius: 12,
                border: `1px solid ${error ? "#f5a9a9" : "#a9d8a9"}`,
                background: error ? "#ffe6e6" : "#e6f7e6",
                color: error ? "#b91c1c" : "#166534",
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                alignItems: "center",
              }}
            >
              <span>{error || actionMessage?.text}</span>
              <button
                type="button"
                onClick={() => {
                  setError("");
                  setActionMessage(null);
                }}
                style={{
                  background: "none",
                  border: "none",
                  color: "inherit",
                  cursor: "pointer",
                  fontSize: 18,
                }}
              >
                ×
              </button>
            </div>
          )}

          <div className="infopro-infoper">
            <div className="info-per">
              <div className="top">
                <h3 className="title">Résumé</h3>
                <p className="desc">Aperçu rapide de votre présence</p>
              </div>
              <div>
                <p className="desc">Jours sur la période</p>
                <h3>{displayedRecords.length}</h3>
              </div>
              <div>
                <p className="desc">Journées complètes</p>
                <h3>{completedDays}</h3>
              </div>
              <div>
                <p className="desc">Sorties manquantes</p>
                <h3>{pendingCheckoutDays}</h3>
              </div>
              <div>
                <p className="desc">Absences</p>
                <h3>{absentDays}</h3>
              </div>
            </div>

            <div className="info-pro">
              <div className="top">
                <h3 className="title">Filtres</h3>
                <p className="desc">Choisissez la période à afficher</p>
              </div>
              <div>
                <p className="desc">Date de début</p>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(event) => setFromDate(event.target.value)}
                  style={fieldStyle}
                />
              </div>
              <div>
                <p className="desc">Date de fin</p>
                <input
                  type="date"
                  value={toDate}
                  onChange={(event) => setToDate(event.target.value)}
                  style={fieldStyle}
                />
              </div>
              <div>
                <button
                  type="button"
                  onClick={handleApplyFilters}
                  disabled={loading}
                  style={{
                    ...actionButtonStyle("success", loading),
                    background: loading
                      ? actionButtonStyle("success", true).background
                      : "#2563eb",
                  }}
                >
                  {loading ? "Chargement..." : "Appliquer les filtres"}
                </button>
              </div>
            </div>
          </div>

          <div className="activite-recente">
            <div className="activite-top">
              <h3 className="activite-title">Historique de présence</h3>
              <p className="activite-subtitle">
                {displayedRecords.length} enregistrement(s) trouvés
              </p>
            </div>

            {loading ? (
              <div style={{ padding: 24, color: dark ? "#cbd5e1" : "#475569" }}>
                Chargement des données...
              </div>
            ) : displayedRecords.length === 0 ? (
              <div style={{ padding: 24, color: dark ? "#cbd5e1" : "#475569" }}>
                Aucun enregistrement de présence sur cette période.
              </div>
            ) : (
              <div className="activite-table-scroll">
                <table className="activite-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Entrée</th>
                      <th>Sortie</th>
                      <th>Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedRecords.map((record) => {
                      const isComplete =
                        record.check_in_time && record.check_out_time;
                      const statusLabel = isComplete
                        ? "Complet"
                        : record.check_in_time
                          ? "En cours"
                          : "Absent";
                      const statusClass = isComplete
                        ? "badge-termine"
                        : record.check_in_time
                          ? "badge-attente"
                          : "badge-absent";

                      return (
                        <tr
                          key={`${record.date}-${record.check_in_time || "none"}`}
                        >
                          <td>{formatDate(record.date)}</td>
                          <td>{formatTime(record.check_in_time)}</td>
                          <td>{formatTime(record.check_out_time)}</td>
                          <td>
                            <span className={`badge ${statusClass}`}>
                              {statusLabel}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {pinModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 500,
            padding: 16,
          }}
        >
          <div style={modalCardStyle}>
            <h3 style={{ marginTop: 0, marginBottom: 8 }}>
              {pendingAction === "check-in"
                ? "Confirmer l'entrée"
                : "Confirmer la sortie"}
            </h3>
            <p style={{ marginTop: 0, color: dark ? "#94a3b8" : "#64748b" }}>
              Saisissez votre code PIN à 4 chiffres.
            </p>
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              placeholder="••••"
              value={pinValue}
              onChange={(event) => {
                setPinValue(event.target.value.replace(/\D/g, "").slice(0, 4));
                setPinError("");
              }}
              style={{
                ...fieldStyle,
                textAlign: "center",
                letterSpacing: 8,
                fontSize: 20,
                marginTop: 8,
              }}
            />
            {pinError && (
              <p style={{ color: "#dc2626", fontSize: 13, marginBottom: 0 }}>
                {pinError}
              </p>
            )}
            <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
              <button
                type="button"
                onClick={handlePinConfirm}
                disabled={pinValue.length !== 4 || !!actionInProgress}
                style={{
                  ...actionButtonStyle(
                    "success",
                    pinValue.length !== 4 || !!actionInProgress,
                  ),
                  flex: 1,
                }}
              >
                Confirmer
              </button>
              <button
                type="button"
                onClick={closePinModal}
                disabled={!!actionInProgress}
                style={{
                  flex: 1,
                  border: `1px solid ${dark ? "#475569" : "#cbd5e1"}`,
                  borderRadius: 12,
                  padding: "12px 18px",
                  cursor: actionInProgress ? "not-allowed" : "pointer",
                  background: dark ? "#0f172a" : "#ffffff",
                  color: dark ? "#e2e8f0" : "#0f172a",
                }}
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
