// import { useEffect } from "react";
// import axios from "axios";
import "../../styles/profile.css";
import Navbar from "../../components/Navbar";
export default function Profile() {
  // let access = localStorage.getItem("access_token");
  // const fetchProfile = async () => {
  //   const me = await axios.get("/api/whoami/", {
  //     headers: { Authorization: `Bearer ${access}` },
  //   });
  //   console.log(me.data);
  // };
  // useEffect(() => {
  //   fetchProfile();
  // }, []);

  return (
    <>
      <div className="profile-page">
        <div className="navbar-profile-page">
          <Navbar />
        </div>
        <div className="profile-content">
          <div className="profile-naaav">
            <div className="yasar">
              <h3>Mon Profil</h3>
              <p>Informations personnelles • poste • photo</p>
            </div>
            <div className="yamin">
              <button className="mode">mode sombre</button>
              <button className="deconnecter">déconnecter</button>
              <button className="modifier">modifier</button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
