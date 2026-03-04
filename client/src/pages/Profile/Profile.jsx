import { useEffect } from "react";
import axios from "axios";
import { useState } from "react";
import "../../styles/profile.css";
import Navbar from "../../components/Navbar";
import Form from "../../components/Form";
export default function Profile() {
  const [dark, setDark] = useState(false);
  const [isNavOpen, setIsNavOpen] = useState(true);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [profileData, setProfileData] = useState({
    fullName: "",
    email: "",
    phone: "",
    address: "",
    position: "",
    department: "",
    photoName: "",
  });
  const [formData, setFormData] = useState(profileData);
  let access = localStorage.getItem("access_token");
  const fetchProfile = async () => {
    var me = await axios.get("/api/whoami/", {
      headers: { Authorization: `Bearer ${access}` },
    });
    console.log(me.data);
    setProfileData({
      fullName: me.data.first_name + " " + me.data.last_name,
      email: me.data.email,
      phone: me.data.phone,
      address: me.data.address,
      position: me.data.position,
      department: me.data.department,
      photoName: me.data.profile_picture,
    });
  };
  useEffect(() => {
    fetchProfile();
  }, []);

  const openEditModal = () => {
    setFormData(profileData);
    setIsEditOpen(true);
  };

  const closeEditModal = () => {
    setIsEditOpen(false);
  };

  const handleFormChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePhotoChange = (event) => {
    const file = event.target.files?.[0];
    setFormData((prev) => ({
      ...prev,
      photoName: file ? file.name : "",
    }));
  };

  const handleFormSubmit = (event) => {
    event.preventDefault();
    setProfileData(formData);
    closeEditModal();
  };

  return (
    <>
      <div
        className={`profile-page${dark ? " dark" : ""} ${
          isNavOpen ? "nav-open" : "nav-closed"
        }`}
      >
        <div className={`navbar-profile-page ${isNavOpen ? "open" : "closed"}`}>
          <Navbar
            fullName={profileData.fullName}
            post={profileData.position}
            image={profileData.photoName}
          />
        </div>
        {isNavOpen && (
          <div
            className="profile-overlay"
            onClick={() => setIsNavOpen(false)}
            aria-hidden="true"
          />
        )}
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
                <button
                  className="nav-toggle"
                  onClick={() => setIsNavOpen((prev) => !prev)}
                  type="button"
                >
                  {isNavOpen ? "Masquer menu" : "Afficher menu"}
                </button>
                <button className="mode" onClick={() => setDark(!dark)}>
                  {dark ? " mode clair" : " mode sombre"}
                </button>
                <button className="btn-logout">déconnecter</button>
                <button
                  className="modifier"
                  type="button"
                  onClick={openEditModal}
                >
                  modifier
                </button>
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
                    <h3>{profileData.fullName}</h3>
                    <div className="status">actif</div>
                  </div>
                  <p>
                    Poste : {profileData.position} • Département :{" "}
                    {profileData.department}
                  </p>
                  <div>
                    <div>{profileData.email}</div>
                    <div>{profileData.phone}</div>
                    <div>{profileData.address}</div>
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
                  <h3>{profileData.fullName}</h3>
                </div>
                <div>
                  <p className="desc">Email</p>
                  <h3>{profileData.email}</h3>
                </div>
                <div>
                  <p className="desc">Téléphone</p>
                  <h3>{profileData.phone}</h3>
                </div>
                <div>
                  <p className="desc">Adresse</p>
                  <h3>{profileData.address}</h3>
                </div>
              </div>
              <div className="info-pro">
                <div className="top">
                  <h3 className="title">Informations professionnelles</h3>
                  <p className="desc">Données visibles par l’utilisateur</p>
                </div>
                <div>
                  <p className="desc">Poste</p>
                  <h3>{profileData.position}</h3>
                </div>
                <div>
                  <p className="desc">Département</p>
                  <h3>{profileData.department}</h3>
                </div>
                <div>
                  <p className="desc">Téléphone</p>
                  <h3>{profileData.phone}</h3>
                </div>
                <div>
                  <p className="desc">Adresse</p>
                  <h3>{profileData.address}</h3>
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
        <Form
          open={isEditOpen}
          onClose={closeEditModal}
          onSubmit={handleFormSubmit}
          formData={formData}
          onChange={handleFormChange}
          onPhotoChange={handlePhotoChange}
        />
      </div>
    </>
  );
}
