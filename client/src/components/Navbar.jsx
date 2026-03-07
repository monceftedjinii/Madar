import { useEffect, useState } from "react";
import axios from "axios";
import "../styles/navbar.css";
import logo from "../assets/Logo_madar_holding.png";
export default function Navbar(props) {
  const { fullName, post, image } = props;
  const [fetchedProfile, setFetchedProfile] = useState({
    fullName: "",
    post: "",
    image: "",
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
        });
      } catch (error) {
        console.error("Erreur chargement profil navbar:", error);
      }
    };

    fetchNavbarProfile();
  }, []);

  const resolvedName = fullName || fetchedProfile.fullName || "Utilisateur";
  const resolvedPost = post || fetchedProfile.post || "-";
  const resolvedImage = image || fetchedProfile.image;

  const avatarSrc = resolvedImage
    ? resolvedImage
    : "https://cdn-icons-png.flaticon.com/512/149/149071.png";
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
        <div className="pv pvv">Dashboard</div>
        <div className="pvv">Notifs</div>
        <div className="pvv">Congés</div>
        <div className="pvv">Vos Taches</div>
        <div className="pvv">Présence</div>
        <div className="pvv">Votre assistant IA</div>
        <div className="pvv">Messagerie</div>
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
          <p className="text-nav">{resolvedPost} </p>
        </div>
      </div>
    </div>
  );
}
