import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

export default function NotificationBell({ dark = false }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await axios.get("/api/notifications/");
        const items = Array.isArray(res.data) ? res.data : [];
        setNotifications(items.slice(0, 5));
        setUnread(items.filter((n) => !n.is_read).length);
      } catch {
        // silent
      }
    };
    load();
    const id = setInterval(load, 60000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const bg = dark ? "#1e293b" : "#ffffff";
  const border = dark ? "#334155" : "#e2e8f0";
  const text = dark ? "#f1f5f9" : "#0f172a";
  const sub = dark ? "#94a3b8" : "#64748b";
  const rowHover = dark ? "#334155" : "#f8fafc";
  const unreadBg = dark ? "#1e3a5f" : "#f0f9ff";

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-flex", alignItems: "center", alignSelf: "center" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        type="button"
        className="mode"
        style={{ position: "relative", display: "inline-flex", alignItems: "center", gap: 4 }}
        title="Notifications"
      >
        <span style={{ fontSize: 16, lineHeight: 1 }}>🔔</span>
        {unread > 0 && (
          <span style={{
            position: "absolute",
            top: -6, right: -6,
            background: "#ef4444",
            color: "#fff",
            fontSize: 10,
            fontWeight: 700,
            borderRadius: "50%",
            width: 17, height: 17,
            display: "flex", alignItems: "center", justifyContent: "center",
            lineHeight: 1,
          }}>
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div style={{
          position: "absolute",
          top: "calc(100% + 8px)",
          right: 0,
          width: 320,
          background: bg,
          borderRadius: 16,
          boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
          border: `1px solid ${border}`,
          overflow: "hidden",
          zIndex: 9999,
        }}>
          {/* Header */}
          <div style={{ padding: "12px 16px", borderBottom: `1px solid ${border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontWeight: 700, fontSize: 14, color: text }}>Notifications</span>
            {unread > 0 && (
              <span style={{ background: "#ef4444", color: "#fff", fontSize: 11, fontWeight: 700, borderRadius: 20, padding: "2px 8px" }}>
                {unread} non lue{unread > 1 ? "s" : ""}
              </span>
            )}
          </div>

          {/* List */}
          <div style={{ maxHeight: 300, overflowY: "auto" }}>
            {notifications.length === 0 ? (
              <p style={{ padding: 20, textAlign: "center", color: sub, fontSize: 13, margin: 0 }}>Aucune notification</p>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => { setOpen(false); navigate(n.link || "/notifications"); }}
                  style={{
                    padding: "11px 16px",
                    borderBottom: `1px solid ${border}`,
                    cursor: "pointer",
                    background: n.is_read ? bg : unreadBg,
                    display: "flex",
                    gap: 10,
                    alignItems: "flex-start",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = rowHover; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = n.is_read ? bg : unreadBg; }}
                >
                  <span style={{ fontSize: 16, marginTop: 1 }}>{n.is_read ? "🔕" : "🔔"}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: n.is_read ? 400 : 600, color: text, lineHeight: 1.4 }}>
                      {n.title}
                    </p>
                    <p style={{ margin: "3px 0 0", fontSize: 12, color: sub, lineHeight: 1.4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {n.message}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div style={{ padding: "10px 12px", borderTop: `1px solid ${border}` }}>
            <button
              onClick={() => { setOpen(false); navigate("/notifications"); }}
              type="button"
              style={{
                width: "100%", padding: "8px 0",
                background: "#3b82f6", color: "#fff",
                border: "none", borderRadius: 10,
                fontWeight: 600, fontSize: 13, cursor: "pointer",
              }}
            >
              Voir toutes les notifications
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
