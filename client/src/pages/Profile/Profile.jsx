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
            <div className="quelques-infos">
              <div className="gauche">
                <img
                  src="https://cdn-icons-png.flaticon.com/512/149/149071.png"
                  alt="Profile-pic"
                  className="profile-pic"
                />
                <div className="infooos">
                  <div className="nom-status">
                    <h3> Boudaoud Mohamed Reda</h3>
                    <div className="status">actif</div>
                  </div>
                  <p>
                    Poste : Assistant RH • Département : Ressources Humaines
                  </p>
                  <div>
                    <div className="">reda@madar.com </div>
                    <div>+213...</div>
                    <div>Alger</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
