import { useEffect, useState } from "react";
import axios from "axios";
import { NavLink } from "react-router-dom";
import "../styles/navbar.css";
import logo from "../assets/Logo_madar_holding.png";

export default function Navbar(props) {
  const { fullName, post, image, email } = props;
  const [fetchedProfile, setFetchedProfile] = useState({
    fullName: "",
    post: "",
    image: "",
    email: "",
  });

  useEffect(() => {
    const accessToken = localStorage.getItem("access_token");
    if (!accessToken) return;

    const fetchNavbarProfile = async () => {
      try {
        const me = await axios.get("/api/whoami/", {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        setFetchedProfile({
          fullName: `${me.data?.first_name || ""} ${me.data?.last_name || ""}`.trim(),
          post: me.data?.position || me.data?.employee_info?.position || "",
          image: me.data?.profile_picture || "",
          email: me.data?.email || "",
        });
      } catch (error) {
        console.error("Erreur chargement profil navbar:", error);
      }
    };

    fetchNavbarProfile();
  }, []);

  const resolvedName = fullName || fetchedProfile.fullName || "Utilisateur";
  const resolvedPost = post || fetchedProfile.post || "Poste non renseigne";
  const resolvedImage = image || fetchedProfile.image;
  const resolvedEmail = email || fetchedProfile.email;

  const avatarSrc = resolvedImage
    ? resolvedImage
    : "https://cdn-icons-png.flaticon.com/512/149/149071.png";

  const navItems = [
    { to: "/home", label: "Dashboard" },
    { to: "/profile", label: "Mon Profil" },
    { to: "/conge", label: "Conges" },
    { to: "/attendance", label: "Presence" },
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
            className={({ isActive }) => `pvv nav-link ${isActive ? "active-nav" : ""}`}
          >
            {item.label}
          </NavLink>
        ))}
      </div>

      <div className="profile-navbar">
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
          {resolvedEmail && <p className="text-nav account-email">{resolvedEmail}</p>}
        </div>
      </div>
    </div>
  );
}
