import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { logout as logoutRequest } from "../../api/auth.api";
import "../../styles/profile.css";
import Navbar from "../../components/Navbar";
import Form from "../../components/Form";
import useDarkModePreference from "../../hooks/useDarkModePreference";

export default function Profile() {
  const [dark, setDark] = useDarkModePreference();
  const [isNavOpen, setIsNavOpen] = useState(true);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [profileData, setProfileData] = useState({
    fullName: "",
    email: "",
    phone: "",
    address: "",
    position: "",
    department: "",
    contract: "",
    contractType: "",
    hireDate: "",
    photoName: "",
    is_online: "",
    current_password: "",
    new_password: "",
    confirm_password: "",
  });
  const [formData, setFormData] = useState(profileData);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [activitiesData, setActivitiesData] = useState({
    leaves: [],
    tasks: [],
    notifications: [],
    attendance: [],
  });

  const getProfileActivityStorageKey = (email = "") =>
    `madar_profile_activity_${email}`;

  const splitFullName = (value = "") => {
    const clean = value.trim().replace(/\s+/g, " ");
    if (!clean) {
      return { firstName: "", lastName: "" };
    }

    const [firstName, ...rest] = clean.split(" ");
    return { firstName, lastName: rest.join(" ") };
  };

  const formatHireDate = (value = "") => {
    if (!value) return "";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toLocaleDateString("fr-FR");
  };

  const formatDate = (value = "") => {
    if (!value) return "-";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      const dateOnly = new Date(`${value}T00:00:00`);
      return Number.isNaN(dateOnly.getTime())
        ? value
        : dateOnly.toLocaleDateString("fr-FR");
    }
    return parsed.toLocaleDateString("fr-FR");
  };

  const isSameDay = (value, targetDate = new Date()) => {
    if (!value) return false;
    const parsed = new Date(value);
    const date = Number.isNaN(parsed.getTime())
      ? new Date(`${value}T00:00:00`)
      : parsed;

    if (Number.isNaN(date.getTime())) return false;

    return (
      date.getFullYear() === targetDate.getFullYear() &&
      date.getMonth() === targetDate.getMonth() &&
      date.getDate() === targetDate.getDate()
    );
  };

  const saveProfileActivity = (email, activity) => {
    if (!email) return;
    try {
      window.localStorage.setItem(
        getProfileActivityStorageKey(email),
        JSON.stringify(activity),
      );
    } catch {
      // Ignore storage issues and keep the page functional.
    }
  };

  const getLeaveStatusLabel = (status) => {
    if (status === "PENDING") return "En attente";
    if (status === "ACCEPTED") return "Accepté";
    if (status === "REFUSED") return "Refusé";
    return status;
  };

  const getLeaveStatusClass = (status) => {
    if (status === "PENDING") return "badge-attente";
    if (status === "ACCEPTED") return "badge-termine";
    return "badge-refuse";
  };

  const fetchProfile = async () => {
    const [me, leaves, tasks, notifications, attendance] = await Promise.all([
      axios.get("/api/whoami/"),
      axios.get("/api/leaves/me/"),
      axios.get("/api/tasks/me/"),
      axios.get("/api/notifications/"),
      axios.get("/api/attendance/me/"),
    ]);

    setProfileData({
      fullName: `${me.data.first_name || ""} ${me.data.last_name || ""}`.trim(),
      email: me.data.email,
      phone: me.data.phone_number || me.data.employee_info?.phone_number || "",
      address: me.data.address || me.data.employee_info?.address || "",
      position: me.data.position || me.data.employee_info?.position || "",
      department:
        me.data.service ||
        me.data.department ||
        me.data.employee_info?.department?.name ||
        "",
      contract:
        me.data.contract ||
        me.data.employee_info?.contract ||
        me.data.employee_info?.contract_name ||
        "",
      contractType:
        me.data.contract_type ||
        me.data.employee_info?.contract_type ||
        me.data.employee_info?.contractType ||
        "",
      hireDate:
        me.data.hired_at ||
        me.data.employee_info?.hire_date ||
        me.data.employee_info?.start_date ||
        "",
      photoName: me.data.profile_picture,
      is_online: me.data.is_online,
    });

    setActivitiesData({
      leaves: Array.isArray(leaves.data) ? leaves.data : [],
      tasks: Array.isArray(tasks.data) ? tasks.data : [],
      notifications: Array.isArray(notifications.data) ? notifications.data : [],
      attendance: Array.isArray(attendance.data) ? attendance.data : [],
    });
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const todayActivities = useMemo(() => {
    let profileActivity = null;
    if (profileData.email) {
      try {
        const raw = window.localStorage.getItem(
          getProfileActivityStorageKey(profileData.email),
        );
        profileActivity = raw ? JSON.parse(raw) : null;
      } catch {
        profileActivity = null;
      }
    }
    const leaveActivities = activitiesData.leaves
      .filter((leave) => isSameDay(leave.created_at) || isSameDay(leave.decided_at))
      .map((leave) => ({
        id: `leave-${leave.id}`,
        date: leave.decided_at || leave.created_at || leave.start_date,
        action: "Demande de congé",
        details: `${leave.type_label || leave.type} (${formatDate(leave.start_date)} - ${formatDate(leave.end_date)})`,
        status: getLeaveStatusLabel(leave.status),
        statusClass: getLeaveStatusClass(leave.status),
      }));

    const taskActivities = activitiesData.tasks
      .filter((task) => isSameDay(task.completed_at) || isSameDay(task.created_at))
      .map((task) => {
        const isCompletedToday = isSameDay(task.completed_at);
        return {
          id: `task-${task.id}`,
          date: task.completed_at || task.created_at,
          action: isCompletedToday ? "Tâche terminée" : "Nouvelle tâche",
          details: task.title,
          status: isCompletedToday ? "Terminé" : "Assignée",
          statusClass: isCompletedToday ? "badge-termine" : "badge-attente",
        };
      });

    const notificationActivities = activitiesData.notifications
      .filter((notification) => isSameDay(notification.created_at))
      .map((notification) => ({
        id: `notification-${notification.id}`,
        date: notification.created_at,
        action: "Notification",
        details: notification.title,
        status: notification.is_read ? "Lue" : "Nouvelle",
        statusClass: notification.is_read ? "badge-termine" : "badge-genere",
      }));

    const attendanceActivities = activitiesData.attendance
      .filter((item) => isSameDay(item.date))
      .flatMap((item) => {
        const result = [];
        if (item.check_in_time) {
          result.push({
            id: `attendance-in-${item.date}`,
            date: item.date,
            action: "Pointage",
            details: `Entrée à ${item.check_in_time.slice(0, 5)}`,
            status: "Validé",
            statusClass: "badge-termine",
          });
        }
        if (item.check_out_time) {
          result.push({
            id: `attendance-out-${item.date}`,
            date: item.date,
            action: "Pointage",
            details: `Sortie à ${item.check_out_time.slice(0, 5)}`,
            status: "Validé",
            statusClass: "badge-termine",
          });
        }
        return result;
      });

    const profileActivities =
      profileActivity && isSameDay(profileActivity.date)
        ? [
            {
              id: `profile-${profileActivity.date}`,
              date: profileActivity.date,
              action: "Profil mis à jour",
              details: profileActivity.details || "Informations personnelles modifiées",
              status: "Terminé",
              statusClass: "badge-termine",
            },
          ]
        : [];

    return [
      ...profileActivities,
      ...leaveActivities,
      ...taskActivities,
      ...notificationActivities,
      ...attendanceActivities,
    ]
      .sort((left, right) => new Date(right.date) - new Date(left.date))
      .slice(0, 10);
  }, [activitiesData, profileData.email]);

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
          "Content-Type": "multipart/form-data",
        },
      });

      if (hasPasswordInput) {
        await axios.post("/api/profile/change-password/", {
          current_password: formData.current_password,
          new_password: formData.new_password,
          confirm_password: formData.confirm_password,
        });
      }

      const changedFields = [];
      if (formData.fullName !== profileData.fullName) changedFields.push("nom");
      if (formData.phone !== profileData.phone) changedFields.push("téléphone");
      if (formData.address !== profileData.address) changedFields.push("adresse");
      if (selectedPhoto) changedFields.push("photo");
      if (hasPasswordInput) changedFields.push("mot de passe");

      saveProfileActivity(profileData.email || formData.email, {
        date: new Date().toISOString(),
        details:
          changedFields.length > 0
            ? `Champs modifiés : ${changedFields.join(", ")}`
            : "Informations personnelles modifiées",
      });

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

  const logout = async () => {
    await logoutRequest();
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
            email={profileData.email}
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
                  style={{
                    width: 50,
                    height: 50,
                    minWidth: 50,
                    borderRadius: "50%",
                    objectFit: "cover",
                    display: "block",
                  }}
                />
                <div className="infooos">
                  <div className="nom-status">
                    <h3>{profileData.fullName}</h3>
                    <div className="status">
                      {profileData.is_online === true ? "actif" : "Inactif"}
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
                  <p className="desc">Données visibles par l'utilisateur</p>
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
                  <p className="desc">Type de contrat</p>
                  <h3>{profileData.contractType || "-"}</h3>
                </div>
                <div>
                  <p className="desc">Date d’embauche</p>
                  <h3>{formatHireDate(profileData.hireDate) || "-"}</h3>
                </div>
              </div>
            </div>

            <div className="activite-recente">
              <div className="activite-top">
                <h3 className="activite-title">Activité récente</h3>
                <p className="activite-subtitle">Activités du jour</p>
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
                  {todayActivities.length > 0 ? (
                    todayActivities.map((activity) => (
                      <tr key={activity.id}>
                        <td>{formatDate(activity.date)}</td>
                        <td>{activity.action}</td>
                        <td>{activity.details}</td>
                        <td>
                          <span className={`badge ${activity.statusClass}`}>
                            {activity.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4">Aucune activité pour aujourd&apos;hui.</td>
                    </tr>
                  )}
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
