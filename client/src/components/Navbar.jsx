import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { NavLink, useNavigate } from "react-router-dom";
import "../styles/navbar.css";
import logo from "../assets/Logo_madar_holding.png";
import { AUTH_SESSION_CHANGED_EVENT, isAuthenticated } from "../app/auth";
import { getRoleContext, getRoleLabel } from "../app/roleAccess";

const NAVBAR_CACHE_KEY = "madar_navbar_cache";
const NAVBAR_SCROLL_KEY = "madar_navbar_scroll";

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
    fullName: "",
    post: "",
    image: "",
    email: "",
    role: "",
    service: "",
    employeeRole: "",
  });
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [recentNotifications, setRecentNotifications] = useState([]);
  const [bellOpen, setBellOpen] = useState(false);
  const bellRef = useRef(null);

  useEffect(() => {
    let isMounted = true;

    const fetchNavbarData = async () => {
      if (!isAuthenticated()) {
        if (isMounted) {
          setFetchedProfile({ fullName: "", post: "", image: "", email: "", role: "", service: "", employeeRole: "" });
          setUnreadNotifications(0);
        }
        return;
      }

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
          service: me.data?.service || "",
          employeeRole: me.data?.employee_role || "",
        };

        const items = Array.isArray(notifications.data) ? notifications.data : [];
        const nextUnreadNotifications = items.filter((item) => !item.is_read).length;

        if (!isMounted) return;

        setFetchedProfile(nextProfile);
        setUnreadNotifications(nextUnreadNotifications);
        setRecentNotifications(items.slice(0, 5));
        writeNavbarCache({
          profile: nextProfile,
          unreadNotifications: nextUnreadNotifications,
          timestamp: Date.now(),
        });
      } catch (error) {
        console.error("Erreur chargement navbar:", error);
      }
    };

    fetchNavbarData();

    const handleNotificationsUpdated = () => {
      fetchNavbarData();
    };

    window.addEventListener("focus", fetchNavbarData);
    window.addEventListener(AUTH_SESSION_CHANGED_EVENT, fetchNavbarData);
    window.addEventListener("notifications-updated", handleNotificationsUpdated);

    return () => {
      isMounted = false;
      window.removeEventListener("focus", fetchNavbarData);
      window.removeEventListener(AUTH_SESSION_CHANGED_EVENT, fetchNavbarData);
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

  useEffect(() => {
    if (!bellOpen) return;
    const handleOutside = (e) => {
      if (bellRef.current && !bellRef.current.contains(e.target)) setBellOpen(false);
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [bellOpen]);

  const resolvedName = fullName || fetchedProfile.fullName || "Utilisateur";
  const resolvedPost = post || fetchedProfile.post || "Poste non renseigné";
  const resolvedImage = image || fetchedProfile.image;
  const resolvedEmail = email || fetchedProfile.email;
  const resolvedRoleContext = getRoleContext({
    role: fetchedProfile.role,
    service: fetchedProfile.service,
    employee_role: fetchedProfile.employeeRole,
  });
  const resolvedRole = getRoleLabel({
    role: fetchedProfile.role,
    service: fetchedProfile.service,
    employee_role: fetchedProfile.employeeRole,
  });
  const initials = getAccountInitials(resolvedName);

  const isChef = resolvedRoleContext.isChef;
  const isEmployee = resolvedRoleContext.isEmployee;
  const isDrh = resolvedRoleContext.isDrh;
  const isRh = resolvedRoleContext.isRh;
  const isRhFormation = resolvedRoleContext.isRhFormation;
  const isRhConges = resolvedRoleContext.isRhConges;

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
        ...(!isChef && !isDrh ? [{ to: "/tasks", label: "Mes tâches" }] : []),
      ],
    },
    // DRH: single unified section with everything
    ...(isDrh
      ? [
          {
            title: "Espace DRH",
            items: [
              { to: "/rh/reports", label: "Pilotage et rapports" },
              { to: "/chef/tasks", label: "Tâches équipe" },
              { to: "/rh/evaluations", label: "Évaluations globales" },
              { to: "/rh/documents", label: "Documents globaux" },
              { to: "/rh/leaves", label: "Congés (Approbations)" },
              { to: "/rh/absences", label: "Absences globales" },
              { to: "/rh/formations", label: "Formations globales" },
              { to: "/rh/employees", label: "Gérer les employés" },
              { to: "/rh/services", label: "Gérer les services" },
              { to: "/rh/archive", label: "Archives RH" },
            ],
          },
        ]
      : []),
    // Chef (non-DRH)
    ...(isChef
      ? [
          {
            title: "Espace Chef",
            items: [
              { to: "/team", label: "Mon équipe" },
              { to: "/chef/attendance", label: "Présence équipe" },
              { to: "/chef/tasks", label: "Tâches équipe" },
              { to: "/chef/leaves", label: "Validation des congés" },
              { to: "/chef/evaluations", label: "Évaluer l'équipe" },
              { to: "/chef/documents", label: "Documents" },
              { to: "/chef/formations", label: "Formations" },
              { to: "/chef/reports", label: "Rapports" },
            ],
          },
        ]
      : []),
    // Other RH roles (not DRH)
    ...(isRh && !isDrh
      ? [
          {
            title: isRhFormation ? "Espace RH Formation" : isRhConges ? "Espace RH Congé" : "Espace RH",
            items: [
              { to: "/rh/reports", label: "Pilotage et rapports" },
              { to: "/rh/evaluations", label: "Évaluations globales" },
              { to: "/rh/documents", label: "Documents globaux" },
              ...(isRhConges ? [
                { to: "/rh/leaves", label: "Congés (Approbations)" },
                { to: "/rh/absences", label: "Absences globales" },
              ] : []),
              ...(isRhFormation ? [{ to: "/rh/formations", label: "Formations globales" }] : []),
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
          <p className="text-nav account-role">{resolvedRole}</p>
          {resolvedEmail && (
            <p className="text-nav account-email">{resolvedEmail}</p>
          )}
        </div>
      </div>
    </div>
  );
}
