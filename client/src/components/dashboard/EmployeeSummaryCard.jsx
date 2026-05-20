const badgeConfig = {
  Excellent:      { bg: "rgba(34,197,94,0.15)",  border: "rgba(34,197,94,0.4)",  color: "#22c55e" },
  Bon:            { bg: "rgba(59,130,246,0.15)",  border: "rgba(59,130,246,0.4)", color: "#3b82f6" },
  Moyen:          { bg: "rgba(245,158,11,0.15)",  border: "rgba(245,158,11,0.4)", color: "#f59e0b" },
  "A ameliorer":  { bg: "rgba(239,68,68,0.12)",   border: "rgba(239,68,68,0.35)", color: "#ef4444" },
  "À améliorer":  { bg: "rgba(239,68,68,0.12)",   border: "rgba(239,68,68,0.35)", color: "#ef4444" },
};

function getAccountInitials(fullName) {
  const parts = (fullName || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "U";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export default function EmployeeSummaryCard({ employee, dark = false }) {
  const badge = badgeConfig[employee.statusLabel] || badgeConfig["Moyen"];

  const statItems = [
    { label: "Taux de présence",   value: `${employee.attendanceRate}%`,   color: "#3b82f6" },
    { label: "Progression globale", value: `${employee.overallProgress}%`, color: "#8b5cf6" },
  ];

  return (
    <article style={{
      borderRadius: 20,
      border: `1px solid ${dark ? "#1e293b" : "#e2e8f0"}`,
      background: dark
        ? "linear-gradient(135deg,#0f172a,#1e293b)"
        : "linear-gradient(135deg,#ffffff,#f8fafc)",
      padding: "20px 24px",
      display: "flex",
      alignItems: "center",
      gap: 24,
      flexWrap: "wrap",
      boxShadow: dark ? "0 4px 24px rgba(0,0,0,0.3)" : "0 4px 24px rgba(15,23,42,0.07)",
    }}>

      {/* Avatar */}
      {employee.avatar ? (
        <img alt={employee.fullName}
          style={{ width: 64, height: 64, borderRadius: 16, objectFit: "cover", flexShrink: 0, boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }}
          src={employee.avatar} />
      ) : (
        <div style={{
          width: 64, height: 64, borderRadius: 16, flexShrink: 0,
          background: "linear-gradient(135deg,#059669,#0d9488)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 22, fontWeight: 900, color: "#fff", letterSpacing: "0.05em",
          boxShadow: "0 4px 14px rgba(5,150,105,0.35)",
        }}>
          {getAccountInitials(employee.fullName)}
        </div>
      )}

      {/* Name + info */}
      <div style={{ flex: "1 1 200px", minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 900, color: dark ? "#f1f5f9" : "#0f172a" }}>
            {employee.fullName}
          </h2>
          <span style={{
            padding: "3px 12px", borderRadius: 20, fontSize: 12, fontWeight: 700,
            background: badge.bg, border: `1px solid ${badge.border}`, color: badge.color,
          }}>
            {employee.statusLabel}
          </span>
        </div>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: dark ? "#94a3b8" : "#64748b", fontWeight: 500 }}>
          {employee.role}{employee.role && employee.department ? " · " : ""}{employee.department}
        </p>
        <p style={{ margin: "2px 0 0", fontSize: 12, color: "#94a3b8" }}>{employee.email}</p>
      </div>

      {/* Stats */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", flexShrink: 0 }}>
        {statItems.map(s => (
          <div key={s.label} style={{
            minWidth: 110, padding: "12px 16px", borderRadius: 14,
            background: dark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)",
            border: `1px solid ${dark ? "#1e293b" : "#e2e8f0"}`,
            textAlign: "center",
          }}>
            <p style={{ margin: 0, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "#94a3b8" }}>
              {s.label}
            </p>
            <p style={{ margin: "6px 0 0", fontSize: 22, fontWeight: 900, color: s.color, lineHeight: 1 }}>
              {s.value}
            </p>
          </div>
        ))}
      </div>
    </article>
  );
}
