import { useEffect, useState } from "react";
import axios from "axios";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import "../styles/navbar.css";
import logo from "../assets/Logo_madar_holding.png";
import { isAuthenticated } from "../app/auth";

export default function Navbar(props) {
  const { fullName, post, image, email } = props;
  const navigate = useNavigate();
  const location = useLocation();
  const [fetchedProfile, setFetchedProfile] = useState({
    fullName: "",
    post: "",
    image: "",
    email: "",
    role: "",
  });
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  useEffect(() => {
    if (!isAuthenticated()) return;

    const fetchNavbarData = async () => {
      try {
        const [me, notifications] = await Promise.all([
          axios.get("/api/whoami/"),
          axios.get("/api/notifications/"),
        ]);

        setFetchedProfile({
          fullName: `${me.data?.first_name || ""} ${me.data?.last_name || ""}`.trim(),
          post: me.data?.position || me.data?.employee_info?.position || "",
          image: me.data?.profile_picture || "",
          email: me.data?.email || "",
          role: me.data?.role || "",
        });

        const items = Array.isArray(notifications.data) ? notifications.data : [];
        setUnreadNotifications(items.filter((item) => !item.is_read).length);
      } catch (error) {
        console.error("Erreur chargement navbar:", error);
      }
    };

    fetchNavbarData();

    const handleNotificationsUpdated = () => {
      fetchNavbarData();
    };

    window.addEventListener("focus", fetchNavbarData);
    window.addEventListener("notifications-updated", handleNotificationsUpdated);

    return () => {
      window.removeEventListener("focus", fetchNavbarData);
      window.removeEventListener("notifications-updated", handleNotificationsUpdated);
    };
  }, [location.pathname]);

  const resolvedName = fullName || fetchedProfile.fullName || "Utilisateur";
  const resolvedPost = post || fetchedProfile.post || "Poste non renseigne";
  const resolvedImage = image || fetchedProfile.image;
  const resolvedEmail = email || fetchedProfile.email;
  const resolvedRole = fetchedProfile.role || "";

  const avatarSrc = resolvedImage
    ? resolvedImage
    : "https://cdn-icons-png.flaticon.com/512/149/149071.png";

  const navItems = [
    { to: "/home", label: "Dashboard" },
    { to: "/profile", label: "Mon Profil" },
    { to: "/conge", label: "Conges" },
    { to: "/attendance", label: "Presence" },
    ...(resolvedRole === "CHEF" ? [{ to: "/team", label: "Mon equipe" }] : []),
    { to: "/tasks", label: "Mes taches" },
    { to: "/notifications", label: "Notifications" },
    { to: "/messagerie", label: "Messagerie" },
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

      <div className="nav-menu">
        {navItems.map((item) => (
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
        <div
          className="profile-img"
          role="img"
          aria-label="Profile"
          style={{
            width: 48,
            height: 48,
            minWidth: 48,
            borderRadius: "50%",
            backgroundImage: `url(${avatarSrc})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
          }}
        />
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
