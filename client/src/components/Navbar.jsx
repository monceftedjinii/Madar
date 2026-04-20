import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { NavLink, useNavigate } from "react-router-dom";
import "../styles/navbar.css";
import logo from "../assets/Logo_madar_holding.png";
import { isAuthenticated } from "../app/auth";

const NAVBAR_CACHE_KEY = "madar_navbar_cache";
const NAVBAR_SCROLL_KEY = "madar_navbar_scroll";
const NAVBAR_CACHE_TTL_MS = 60 * 1000;

function readNavbarCache() {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.sessionStorage.getItem(NAVBAR_CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeNavbarCache(payload) {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.setItem(NAVBAR_CACHE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore cache write errors and keep the navbar functional.
  }
}

function getAccountInitials(fullName) {
  const parts = (fullName || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!parts.length) return "U";
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();

  return `${parts[0].slice(0, 1)}${parts[parts.length - 1].slice(0, 1)}`.toUpperCase();
}

export default function Navbar(props) {
  const { fullName, post, image, email } = props;
  const navigate = useNavigate();
  const navMenuRef = useRef(null);
  const [fetchedProfile, setFetchedProfile] = useState({
    fullName: readNavbarCache()?.profile?.fullName || "",
    post: readNavbarCache()?.profile?.post || "",
    image: readNavbarCache()?.profile?.image || "",
    email: readNavbarCache()?.profile?.email || "",
    role: readNavbarCache()?.profile?.role || "",
  });
  const [unreadNotifications, setUnreadNotifications] = useState(
    readNavbarCache()?.unreadNotifications || 0,
  );

  useEffect(() => {
    if (!isAuthenticated()) return;

    const fetchNavbarData = async () => {
      try {
        const [me, notifications] = await Promise.all([
          axios.get("/api/whoami/"),
          axios.get("/api/notifications/"),
        ]);

        const nextProfile = {
          fullName: `${me.data?.first_name || ""} ${me.data?.last_name || ""}`.trim(),
          post: me.data?.position || me.data?.employee_info?.position || "",
          image: me.data?.profile_picture || "",
          email: me.data?.email || "",
          role: me.data?.role || "",
        };

        const items = Array.isArray(notifications.data) ? notifications.data : [];
        const nextUnreadNotifications = items.filter((item) => !item.is_read).length;

        setFetchedProfile(nextProfile);
        setUnreadNotifications(nextUnreadNotifications);
        writeNavbarCache({
          profile: nextProfile,
          unreadNotifications: nextUnreadNotifications,
          timestamp: Date.now(),
        });
      } catch (error) {
        console.error("Erreur chargement navbar:", error);
      }
    };

    const cachedNavbarData = readNavbarCache();
    const cacheAge = cachedNavbarData?.timestamp
      ? Date.now() - cachedNavbarData.timestamp
      : Number.POSITIVE_INFINITY;

    if (!cachedNavbarData || cacheAge > NAVBAR_CACHE_TTL_MS) {
      fetchNavbarData();
    }

    const handleNotificationsUpdated = () => {
      fetchNavbarData();
    };

    window.addEventListener("focus", fetchNavbarData);
    window.addEventListener("notifications-updated", handleNotificationsUpdated);

    return () => {
      window.removeEventListener("focus", fetchNavbarData);
      window.removeEventListener("notifications-updated", handleNotificationsUpdated);
    };
  }, []);

  useEffect(() => {
    const navMenu = navMenuRef.current;
    if (!navMenu || typeof window === "undefined") return;

    const savedScrollTop = Number(window.sessionStorage.getItem(NAVBAR_SCROLL_KEY) || 0);
    navMenu.scrollTop = Number.isFinite(savedScrollTop) ? savedScrollTop : 0;

    const handleScroll = () => {
      window.sessionStorage.setItem(NAVBAR_SCROLL_KEY, String(navMenu.scrollTop));
    };

    navMenu.addEventListener("scroll", handleScroll);

    return () => {
      navMenu.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const resolvedName = fullName || fetchedProfile.fullName || "Utilisateur";
  const resolvedPost = post || fetchedProfile.post || "Poste non renseigné";
  const resolvedImage = image || fetchedProfile.image;
  const resolvedEmail = email || fetchedProfile.email;
  const resolvedRole = fetchedProfile.role || "";
  const initials = getAccountInitials(resolvedName);

  const isChef = resolvedRole === "CHEF";
  const isEmployee = resolvedRole === "EMPLOYEE";
  const isGrh = resolvedRole === "GRH";
  const isRh = ["RH_SIMPLE", "RH_AGENT", "RH_SENIOR", "GRH"].includes(resolvedRole);
  const isRhSeniorManager = resolvedRole === "RH_SENIOR";
  const canManageRhEmployees = resolvedRole === "GRH";
  const canUseRhFormations = ["RH_SIMPLE", "RH_AGENT", "RH_SENIOR", "GRH"].includes(resolvedRole);

  const navSections = [
    {
      title: "Principal",
      items: [
        { to: "/home", label: "Dashboard" },
        { to: "/profile", label: "Mon Profil" },
        { to: "/conge", label: "Congés" },
        { to: "/attendance", label: "Présence" },
        ...(isEmployee ? [{ to: "/documents", label: "Documents" }] : []),
        { to: "/evaluations", label: "Évaluations" },
        { to: "/gpec", label: "GPEC" },
        { to: "/tasks", label: "Mes tâches" },
      ],
    },
    ...(isChef || isRhSeniorManager
      ? [
          {
            title: isRhSeniorManager ? "Équipe RH" : "Espace Chef",
            items: [
              { to: "/team", label: "Mon équipe" },
              { to: "/chef/attendance", label: "Présence équipe" },
              { to: "/chef/tasks", label: "Tâches équipe" },
              ...(isChef
                ? [
                    { to: "/chef/leaves", label: "Validation des congés" },
                    { to: "/chef/evaluations", label: "Évaluer l'équipe" },
                    { to: "/chef/documents", label: "Documents" },
                    { to: "/chef/formations", label: "Formations" },
                    { to: "/chef/reports", label: "Rapports" },
                  ]
                : []),
            ],
          },
        ]
      : []),
    ...(isRh
      ? [
          {
            title: isGrh ? "Espace GRH" : "Espace RH",
            items: [
              { to: "/rh/leaves", label: isGrh ? "Validation finale" : "Validation RH" },
              { to: "/rh/absences", label: isGrh ? "Absences globales" : "Absences RH" },
              { to: "/rh/documents", label: isGrh ? "Documents globaux" : "Documents RH" },
              ...(canUseRhFormations ? [{ to: "/rh/formations", label: isGrh ? "Formations globales" : "Formations RH" }] : []),
              { to: "/rh/evaluations", label: isGrh ? "Évaluations globales" : "Évaluations RH" },
              { to: "/rh/gpec", label: isGrh ? "GPEC global" : "GPEC RH" },
              { to: "/rh/reports", label: isGrh ? "Pilotage et rapports" : "Rapports RH" },
              ...(canManageRhEmployees ? [{ to: "/rh/employees", label: "Gérer les employés" }] : []),
            ],
          },
        ]
      : []),
    {
      title: "Communication",
      items: [
        { to: "/notifications", label: "Notifications" },
        { to: "/messagerie", label: "Messagerie" },
      ],
    },
  ];

  return (
    <div className="container_navbar">
      <div className="grh-navbar">
        <div className="img-container">
          <img src={logo} alt="Logo Madar Holding" className="img" />
        </div>
        <div className="write">
          <h4>MADAR GRH</h4>
          <p className="text-nav">Portail RH</p>
        </div>
      </div>

      <div className="nav-menu" ref={navMenuRef}>
        {navSections.map((section) => (
          <div className="nav-section" key={section.title}>
            <p className="nav-section-title">{section.title}</p>
            <div className="nav-section-links">
              {section.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `pvv nav-link ${isActive ? "active-nav" : ""}`
                  }
                >
                  <span>{item.label}</span>
                  {item.to === "/notifications" && unreadNotifications > 0 && (
                    <span className="nav-badge">{unreadNotifications}</span>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div
        className="profile-navbar"
        role="button"
        tabIndex={0}
        onClick={() => navigate("/profile")}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            navigate("/profile");
          }
        }}
        style={{ cursor: "pointer" }}
      >
        {resolvedImage ? (
          <div
            className="profile-img"
            role="img"
            aria-label="Profile"
            style={{
              width: 48,
              height: 48,
              minWidth: 48,
              borderRadius: "50%",
              backgroundImage: `url(${resolvedImage})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              backgroundRepeat: "no-repeat",
            }}
          />
        ) : (
          <div className="profile-img profile-img-fallback" aria-hidden="true">
            {initials}
          </div>
        )}
        <div className="profile-name">
          <h4>{resolvedName}</h4>
          <p className="text-nav account-role">{resolvedPost}</p>
          {resolvedEmail && (
            <p className="text-nav account-email">{resolvedEmail}</p>
          )}
        </div>
      </div>
    </div>
  );
}
