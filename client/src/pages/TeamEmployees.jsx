import NotificationBell from "../components/NotificationBell";
import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import Navbar from "../components/Navbar";
import useDarkModePreference from "../hooks/useDarkModePreference";
import usePersistentNavState from "../hooks/usePersistentNavState";
import "../styles/profile.css";

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("fr-FR");
}

function getInitials(firstName, lastName) {
  const f = (firstName || "").trim();
  const l = (lastName || "").trim();
  if (!f && !l) return "?";
  if (!l) return f.slice(0, 2).toUpperCase();
  return `${f[0]}${l[0]}`.toUpperCase();
}

const roleLabels = {
  EMPLOYEE: "Employé",
  CHEF: "Chef de service",
  RH_SIMPLE: "RH Congé",
  RH_AGENT: "RH Agent",
  GRH: "DRH",
};

export default function TeamEmployees() {
  const [dark, setDark] = useDarkModePreference();
  const [isNavOpen, setIsNavOpen] = usePersistentNavState();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [serviceName, setServiceName] = useState("");
  const [error, setError] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [search, setSearch] = useState("");

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      setError("");
      const [, employeesResponse] = await Promise.all([
        axios.get("/api/whoami/"),
        axios.get("/api/employees/", { params: { scope: "team" } }),
      ]);
      const data = Array.isArray(employeesResponse.data) ? employeesResponse.data : [];
      setEmployees(data);
      setServiceName(data[0]?.service?.nomService || "");
    } catch {
      setEmployees([]);
      setServiceName("");
      setError("Impossible de charger la liste des employés du service.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchEmployees(); }, []);

  const stats = useMemo(() => {
    const total = employees.length;
    const online = employees.filter((e) => e.is_online).length;
    return { total, online, offline: Math.max(total - online, 0) };
  }, [employees]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return employees;
    return employees.filter((emp) => {
      const name = `${emp.first_name || ""} ${emp.last_name || ""}`.toLowerCase();
      return (
        name.includes(q) ||
        (emp.email || "").toLowerCase().includes(q) ||
        (emp.role || "").toLowerCase().includes(q) ||
        (emp.contract_type || "").toLowerCase().includes(q) ||
        (emp.service?.nomService || "").toLowerCase().includes(q)
      );
    });
  }, [employees, search]);

  const card = dark
    ? "rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-sm"
    : "rounded-2xl border border-slate-200 bg-white p-6 shadow-sm";

  const stickyHeader = dark
    ? "border-b border-slate-800 bg-slate-950/90"
    : "border-b border-slate-200/80 bg-white/90";

  const btnClass = dark
    ? "border border-slate-700 bg-slate-900 text-slate-100"
    : "border border-slate-200 bg-white text-slate-700";

  return (
    <div className={`profile-page${dark ? " dark" : ""} ${isNavOpen ? "nav-open" : "nav-closed"}`}>
      <div className={`navbar-profile-page ${isNavOpen ? "open" : "closed"}`}>
        <Navbar />
      </div>

      {isNavOpen && (
        <div className="profile-overlay" onClick={() => setIsNavOpen(false)} aria-hidden="true" />
      )}

      <div className="profile-content !h-auto min-h-screen bg-transparent">
        {/* Sticky header */}
        <div className={`sticky top-0 z-40 backdrop-blur ${stickyHeader}`}>
          <div className="mx-auto flex w-[96%] flex-wrap items-center justify-between gap-4 py-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">Espace chef</p>
              <h2 className={`text-xl font-bold ${dark ? "text-slate-50" : "text-slate-900"}`}>Mon équipe</h2>
            </div>
            <div className="flex flex-wrap gap-3">
              <button className={`rounded-2xl px-4 py-2 text-sm font-semibold shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${btnClass}`}
                onClick={() => setIsNavOpen((p) => !p)} type="button">
                {isNavOpen ? "Masquer menu" : "Afficher menu"}
              </button>
              <button className={`rounded-2xl px-4 py-2 text-sm font-semibold shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${btnClass}`}
                onClick={() => setDark((p) => !p)} type="button">
                {dark ? "Mode clair" : "Mode sombre"}
              </button>
              <NotificationBell dark={dark} />
            </div>
          </div>
        </div>

        <main className="mx-auto w-[96%] space-y-6 py-6">
          {/* Stat cards */}
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { label: "Membres", value: stats.total, color: "bg-blue-50 text-blue-600", darkColor: "bg-blue-500/15 text-blue-300" },
              { label: "En ligne", value: stats.online, color: "bg-emerald-50 text-emerald-600", darkColor: "bg-emerald-500/15 text-emerald-300" },
              { label: "Hors ligne", value: stats.offline, color: "bg-slate-100 text-slate-500", darkColor: "bg-slate-700 text-slate-300" },
            ].map(({ label, value, color, darkColor }) => (
              <article key={label} className={card}>
                <p className={`text-xs font-semibold uppercase tracking-wider ${dark ? "text-slate-400" : "text-slate-500"}`}>{label}</p>
                <p className={`mt-2 text-3xl font-black ${dark ? "text-slate-50" : "text-slate-900"}`}>{value}</p>
                <span className={`mt-3 inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${dark ? darkColor : color}`}>
                  {serviceName || "Service"}
                </span>
              </article>
            ))}
          </div>

          {/* Employee list */}
          <article className={card}>
            {/* Header + search */}
            <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className={`text-lg font-bold ${dark ? "text-slate-50" : "text-slate-900"}`}>
                  Employés du service
                </h3>
                <p className={`mt-1 text-sm ${dark ? "text-slate-400" : "text-slate-500"}`}>
                  {filtered.length} membre{filtered.length !== 1 ? "s" : ""} affiché{filtered.length !== 1 ? "s" : ""}
                  {search ? ` · "${search}"` : ""}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className={`flex items-center gap-2 rounded-2xl border px-4 py-2.5 ${dark ? "border-slate-700 bg-slate-800" : "border-slate-200 bg-slate-50"}`}>
                  <svg className="h-4 w-4 flex-shrink-0 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
                  </svg>
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Rechercher..."
                    className={`w-48 bg-transparent text-sm outline-none ${dark ? "text-slate-100 placeholder:text-slate-500" : "text-slate-800 placeholder:text-slate-400"}`}
                  />
                  {search && (
                    <button type="button" onClick={() => setSearch("")}
                      className="text-slate-400 hover:text-slate-600">✕</button>
                  )}
                </div>
                <button type="button" onClick={fetchEmployees}
                  className={`rounded-2xl px-4 py-2.5 text-sm font-semibold shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${btnClass}`}>
                  Actualiser
                </button>
              </div>
            </div>

            {error && (
              <div className="mb-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 ring-1 ring-rose-200">
                {error}
              </div>
            )}

            {loading ? (
              <div className={`rounded-2xl p-8 text-center text-sm ${dark ? "bg-slate-800 text-slate-400" : "bg-slate-50 text-slate-400"}`}>
                Chargement de l'équipe...
              </div>
            ) : filtered.length === 0 ? (
              <div className={`rounded-2xl p-8 text-center text-sm ${dark ? "bg-slate-800 text-slate-400" : "bg-slate-50 text-slate-400"}`}>
                {search ? `Aucun résultat pour "${search}".` : "Aucun employé dans ce service."}
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filtered.map((emp) => {
                  const fullName = `${emp.first_name || ""} ${emp.last_name || ""}`.trim();
                  return (
                    <button
                      key={emp.id}
                      type="button"
                      onClick={() => setSelectedEmployee(emp)}
                      className={`group relative flex flex-col items-start gap-3 rounded-2xl p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md ${dark ? "border border-slate-700 bg-slate-800 hover:border-slate-600" : "border border-slate-100 bg-slate-50 hover:border-slate-200 hover:bg-white"}`}
                    >
                      {/* Online dot */}
                      <span className={`absolute right-4 top-4 h-2.5 w-2.5 rounded-full ring-2 ${emp.is_online ? "bg-emerald-400 ring-emerald-100" : "bg-slate-300 ring-slate-100"} ${dark ? "ring-slate-800" : ""}`} />

                      {/* Avatar */}
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 text-sm font-extrabold text-white shadow-sm">
                        {getInitials(emp.first_name, emp.last_name)}
                      </div>

                      {/* Info */}
                      <div className="min-w-0 w-full">
                        <p className={`truncate text-sm font-semibold ${dark ? "text-slate-100" : "text-slate-800"}`}>
                          {fullName || emp.email || "—"}
                        </p>
                        <p className={`mt-0.5 truncate text-xs ${dark ? "text-slate-400" : "text-slate-500"}`}>
                          {roleLabels[emp.role] || emp.role || "—"}
                        </p>
                        {emp.contract_type && (
                          <p className={`mt-0.5 truncate text-xs ${dark ? "text-slate-500" : "text-slate-400"}`}>
                            {emp.contract_type}
                          </p>
                        )}
                      </div>

                      {/* Status */}
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${emp.is_online ? (dark ? "bg-emerald-500/15 text-emerald-300" : "bg-emerald-50 text-emerald-700") : (dark ? "bg-slate-700 text-slate-400" : "bg-slate-100 text-slate-500")}`}>
                        {emp.is_online ? "En ligne" : "Hors ligne"}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </article>
        </main>
      </div>

      {/* Detail modal */}
      {selectedEmployee && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center bg-slate-950/55 px-4 backdrop-blur-sm"
          onClick={() => setSelectedEmployee(null)}>
          <div className={`w-full max-w-2xl rounded-3xl border p-6 shadow-2xl ${dark ? "border-slate-800 bg-slate-900 text-slate-100" : "border-slate-200 bg-white text-slate-900"}`}
            onClick={(e) => e.stopPropagation()}>

            {/* Modal header */}
            <div className="mb-6 flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 text-lg font-extrabold text-white shadow-md">
                  {getInitials(selectedEmployee.first_name, selectedEmployee.last_name)}
                </div>
                <div>
                  <h2 className={`text-xl font-black ${dark ? "text-slate-50" : "text-slate-900"}`}>
                    {`${selectedEmployee.first_name || ""} ${selectedEmployee.last_name || ""}`.trim() || selectedEmployee.email || "Employé"}
                  </h2>
                  <p className={`mt-1 text-sm ${dark ? "text-slate-400" : "text-slate-500"}`}>
                    {roleLabels[selectedEmployee.role] || selectedEmployee.role || "—"} · {selectedEmployee.service?.nomService || "—"}
                  </p>
                </div>
              </div>
              <button type="button" onClick={() => setSelectedEmployee(null)}
                className={`rounded-2xl px-4 py-2 text-sm font-semibold ${dark ? "bg-slate-800 text-slate-300 hover:bg-slate-700" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                Fermer
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <section className={`rounded-2xl p-4 ${dark ? "bg-slate-800" : "bg-slate-50"}`}>
                <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">Informations personnelles</p>
                {[
                  ["Nom", selectedEmployee.last_name],
                  ["Prénom", selectedEmployee.first_name],
                  ["E-mail", selectedEmployee.email],
                  ["Téléphone", selectedEmployee.phone_number],
                  ["Adresse", selectedEmployee.address],
                ].map(([label, val]) => (
                  <div key={label} className="flex justify-between py-1.5 border-b border-slate-200/30 last:border-0">
                    <span className={`text-xs ${dark ? "text-slate-400" : "text-slate-500"}`}>{label}</span>
                    <span className={`text-xs font-semibold ${dark ? "text-slate-200" : "text-slate-700"}`}>{val || "—"}</span>
                  </div>
                ))}
              </section>

              <section className={`rounded-2xl p-4 ${dark ? "bg-slate-800" : "bg-slate-50"}`}>
                <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">Informations professionnelles</p>
                {[
                  ["Poste", selectedEmployee.position],
                  ["Service", selectedEmployee.service?.nomService],
                  ["Contrat", selectedEmployee.contract_type],
                  ["Date d'entrée", formatDate(selectedEmployee.hired_at)],
                  ["Dernière absence", formatDate(selectedEmployee.last_absence)],
                ].map(([label, val]) => (
                  <div key={label} className="flex justify-between py-1.5 border-b border-slate-200/30 last:border-0">
                    <span className={`text-xs ${dark ? "text-slate-400" : "text-slate-500"}`}>{label}</span>
                    <span className={`text-xs font-semibold ${dark ? "text-slate-200" : "text-slate-700"}`}>{val || "—"}</span>
                  </div>
                ))}
                <div className="mt-3">
                  <span className={`rounded-full px-3 py-1 text-xs font-bold ${selectedEmployee.is_online ? (dark ? "bg-emerald-500/15 text-emerald-300" : "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200") : (dark ? "bg-slate-700 text-slate-400" : "bg-slate-100 text-slate-500")}`}>
                    {selectedEmployee.is_online ? "● En ligne" : "○ Hors ligne"}
                  </span>
                </div>
              </section>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
