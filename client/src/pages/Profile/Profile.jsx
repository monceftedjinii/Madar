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
          <div
            style={{
              borderBottom: "1px solid rgba(0, 0, 0, 0.1)",
            }}
          >
            <div className="profile-naaav">
              <div className="yasar">
                <h3 className="monprofile">Mon Profil</h3>
                <p className="morinfo">
                  Informations personnelles • poste • photo
                </p>
              </div>
              <div className="yamin">
                <button className="mode">mode sombre</button>
                <button className="btn-logout">déconnecter</button>
                <button className="modifier">modifier</button>
              </div>
            </div>
          </div>
          <div className="profile-infos">
          </div>
        </div>
      </div>
    </>
  );
}
