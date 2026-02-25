// import { useEffect } from "react";
// import axios from "axios";
import { useState } from "react";
import "../../styles/profile.css";
import Navbar from "../../components/Navbar";
export default function Profile() {
  const [dark, setDark] = useState(false);
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
      <div className={`profile-page${dark ? " dark" : ""}`}>
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
                <button className="mode" onClick={() => setDark(!dark)}>
                  {dark ? "☀️ mode clair" : "🌙 mode sombre"}
                </button>
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
            <div className="infopro-infoper">
              <div className="info-per">
                <div className="top">
                  <h3 className="title">Informations personnelles</h3>
                  <p className="desc">Données visibles par l’utilisateur</p>
                </div>
                <div>
                  <p className="desc">Nom complet</p>
                  <h3>Boudaoud Mohamed Reda</h3>
                </div>
                <div>
                  <p className="desc">Email</p>
                  <h3>reda@madar.com</h3>
                </div>
                <div>
                  <p className="desc">Téléphone</p>
                  <h3>+213551860590</h3>
                </div>
                <div>
                  <p className="desc">Adresse</p>
                  <h3>Alger</h3>
                </div>
              </div>
              <div className="info-pro">
                <div className="top">
                  <h3 className="title">Informations professionnelles</h3>
                  <p className="desc">Données visibles par l’utilisateur</p>
                </div>
                <div>
                  <p className="desc">Nom complet</p>
                  <h3>Boudaoud Mohamed Reda</h3>
                </div>
                <div>
                  <p className="desc">Email</p>
                  <h3>reda@madar.com</h3>
                </div>
                <div>
                  <p className="desc">Téléphone</p>
                  <h3>+213551860590</h3>
                </div>
                <div>
                  <p className="desc">Adresse</p>
                  <h3>Alger</h3>
                </div>
              </div>
            </div>

            {/* Activité récente */}
            <div className="activite-recente">
              <div className="activite-top">
                <h3 className="activite-title">Activité récente</h3>
                <p className="activite-subtitle">Historique (exemple)</p>
              </div>
              <table className="activite-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Action</th>
                    <th>Détails</th>
                    <th>Statut</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>22/02/2026</td>
                    <td>Demande de congé</td>
                    <td>Annuel (3 jours)</td>
                    <td>
                      <span className="badge badge-attente">En attente</span>
                    </td>
                  </tr>
                  <tr>
                    <td>10/02/2026</td>
                    <td>Profil mis à jour</td>
                    <td>Téléphone modifié</td>
                    <td>
                      <span className="badge badge-termine">Terminé</span>
                    </td>
                  </tr>
                  <tr>
                    <td>05/02/2026</td>
                    <td>Bulletin paie</td>
                    <td>Février 2026</td>
                    <td>
                      <span className="badge badge-genere">Généré</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
