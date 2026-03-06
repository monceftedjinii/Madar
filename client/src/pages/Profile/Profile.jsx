import { useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
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
    is_online: "",
    current_password: "",
    new_password: "",
    confirm_password: "",
  });
  const [formData, setFormData] = useState(profileData);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  let access = localStorage.getItem("access_token");
  const splitFullName = (value = "") => {
    const clean = value.trim().replace(/\s+/g, " ");
    if (!clean) {
      return { firstName: "", lastName: "" };
    }

    const [firstName, ...rest] = clean.split(" ");
    return { firstName, lastName: rest.join(" ") };
  };
  const fetchProfile = async () => {
    var me = await axios.get("/api/whoami/", {
      headers: { Authorization: `Bearer ${access}` },
    });
    console.log(me.data);
    setProfileData({
      fullName: `${me.data.first_name || ""} ${me.data.last_name || ""}`.trim(),
      email: me.data.email,
      phone: me.data.phone_number || me.data.employee_info?.phone_number || "",
      address: me.data.address || me.data.employee_info?.address || "",
      position: me.data.position || me.data.employee_info?.position || "",
      department:
        me.data.department || me.data.employee_info?.department?.name || "",
      photoName: me.data.profile_picture,
      is_online: me.data.is_online,
    });
  };
  useEffect(() => {
    fetchProfile();
  }, []);

  const openEditModal = () => {
    setFormData({
      ...profileData,
      current_password: "",
      new_password: "",
      confirm_password: "",
    });
    setSelectedPhoto(null);
    setIsEditOpen(true);
  };

  const closeEditModal = () => {
    setIsEditOpen(false);
    setSelectedPhoto(null);
    setFormData((prev) => ({
      ...prev,
      current_password: "",
      new_password: "",
      confirm_password: "",
    }));
  };

  const handleFormChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePhotoChange = (event) => {
    const file = event.target.files?.[0];
    setSelectedPhoto(file || null);
    setFormData((prev) => ({
      ...prev,
      photoName: file ? file.name : "",
    }));
  };

  const handleFormSubmit = async (event) => {
    event.preventDefault();
    const hasPasswordInput =
      formData.current_password ||
      formData.new_password ||
      formData.confirm_password;
    if (hasPasswordInput) {
      if (
        !formData.current_password ||
        !formData.new_password ||
        !formData.confirm_password
      ) {
        alert("Veuillez remplir tous les champs de mot de passe.");
        return;
      }

      if (formData.new_password !== formData.confirm_password) {
        alert(
          "Le nouveau mot de passe et sa confirmation ne correspondent pas.",
        );
        return;
      }
    }

    try {
      setIsSaving(true);
      const { firstName, lastName } = splitFullName(formData.fullName);
      const body = new FormData();

      body.append("first_name", firstName);
      body.append("last_name", lastName);
      body.append("phone_number", formData.phone || "");
      body.append("address", formData.address || "");

      if (selectedPhoto) {
        body.append("profile_picture", selectedPhoto);
      }

      await axios.put("/api/profile/update/", body, {
        headers: {
          Authorization: `Bearer ${access}`,
          "Content-Type": "multipart/form-data",
        },
      });

      if (hasPasswordInput) {
        await axios.post(
          "/api/profile/change-password/",
          {
            current_password: formData.current_password,
            new_password: formData.new_password,
            confirm_password: formData.confirm_password,
          },
          {
            headers: {
              Authorization: `Bearer ${access}`,
            },
          },
        );
      }

      await fetchProfile();
      closeEditModal();
    } catch (error) {
      console.error("Erreur de mise a jour du profil:", error);
      alert(
        error?.response?.data?.detail ||
          error?.response?.data?.error ||
          "Echec de la mise a jour du profil.",
      );
    } finally {
      setIsSaving(false);
    }
  };
  const navigate = useNavigate();

  const logout = () => {
    localStorage.removeItem("access_token");
    navigate("/login");
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
                <button className="btn-logout" onClick={logout}>
                  déconnecter
                </button>
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
                  src={
                    profileData.photoName
                      ? profileData.photoName
                      : "https://cdn-icons-png.flaticon.com/512/149/149071.png"
                  }
                  alt="Profile-pic"
                  className="profile-pic"
                />
                <div className="infooos">
                  <div className="nom-status">
                    <h3>{profileData.fullName}</h3>
                    <div className="status">
                      {profileData.is_online === true ? "actif" : " Inactif"}
                    </div>
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
                  <p className="desc">Poste, contrat, manager </p>
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
          isSaving={isSaving}
        />
      </div>
    </>
  );
}
