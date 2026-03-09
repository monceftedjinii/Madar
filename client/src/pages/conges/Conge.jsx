import React, { useMemo, useState } from "react";
import Navbar from "../../components/Navbar";
import useDarkModePreference from "../../hooks/useDarkModePreference";
import "../../styles/profile.css";

const initialForm = {
  type: "Annuel",
  startDate: "",
  endDate: "",
  reason: "",
};

export default function Conge() {
  const [dark, setDark] = useDarkModePreference();
  const [isNavOpen, setIsNavOpen] = useState(true);
  const [form, setForm] = useState(initialForm);
  const [requests, setRequests] = useState([
    {
      id: 1,
      period: "22/02/2026 - 24/02/2026",
      type: "Annuel",
      days: 3,
      status: "En attente",
    },
    {
      id: 2,
      period: "10/02/2026 - 10/02/2026",
      type: "Maladie",
      days: 1,
      status: "Termine",
    },
  ]);

  const balances = useMemo(
    () => [
      { label: "Solde annuel", value: "14 jours" },
      { label: "Conge maladie", value: "5 jours" },
      { label: "Conge sans solde", value: "2 jours" },
    ],
    [],
  );

  const onChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const onSubmit = (event) => {
    event.preventDefault();
    if (!form.startDate || !form.endDate || !form.reason.trim()) return;

    const newRequest = {
      id: Date.now(),
      period: `${new Date(form.startDate).toLocaleDateString("fr-FR")} - ${new Date(
        form.endDate,
      ).toLocaleDateString("fr-FR")}`,
      type: form.type,
      days: "-",
      status: "En attente",
    };

    setRequests((prev) => [newRequest, ...prev]);
    setForm(initialForm);
  };

  return (
    <div className={`profile-page${dark ? " dark" : ""} ${isNavOpen ? "nav-open" : "nav-closed"}`}>
      <div className={`navbar-profile-page ${isNavOpen ? "open" : "closed"}`}>
        <Navbar />
      </div>
      {isNavOpen && <div className="profile-overlay" onClick={() => setIsNavOpen(false)} aria-hidden="true" />}

      <div className="profile-content">
        <div style={{ borderBottom: "1px solid rgba(0, 0, 0, 0.1)" }}>
          <div className="profile-naaav">
            <div className="yasar">
              <h3 className="monprofile">Gestion des conges</h3>
              <p className="morinfo">Demande, suivi et historique des conges</p>
            </div>
            <div className="yamin">
              <button className="nav-toggle" onClick={() => setIsNavOpen((prev) => !prev)} type="button">
                {isNavOpen ? "Masquer menu" : "Afficher menu"}
              </button>
              <button className="mode" onClick={() => setDark((prev) => !prev)} type="button">
                {dark ? " mode clair" : " mode sombre"}
              </button>
            </div>
          </div>
        </div>

        <div className="profile-infos">
          <div className="quelques-infos">
            <div className="gauche">
              <div className="infooos">
                <div className="nom-status">
                  <h3>Vue rapide</h3>
                  <div className="status">Actif</div>
                </div>
                <p>Consultez vos soldes et deposez une nouvelle demande de conge.</p>
                <div>
                  {balances.map((item) => (
                    <div key={item.label}>
                      {item.label}: {item.value}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="infopro-infoper">
            <div className="info-per">
              <div className="top">
                <h3 className="title">Nouvelle demande</h3>
                <p className="desc">Remplissez le formulaire pour envoyer votre demande</p>
              </div>

              <form className="profile-edit-form" style={{ padding: "12px 22px 18px" }} onSubmit={onSubmit}>
                <div className="profile-edit-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
                  <label>
                    Type de conge
                    <select name="type" value={form.type} onChange={onChange}>
                      <option value="Annuel">Annuel</option>
                      <option value="Maladie">Maladie</option>
                      <option value="Sans solde">Sans solde</option>
                    </select>
                  </label>
                  <label>
                    Date de debut
                    <input type="date" name="startDate" value={form.startDate} onChange={onChange} required />
                  </label>
                  <label>
                    Date de fin
                    <input type="date" name="endDate" value={form.endDate} onChange={onChange} required />
                  </label>
                  <label style={{ gridColumn: "1 / -1" }}>
                    Motif
                    <input
                      type="text"
                      name="reason"
                      value={form.reason}
                      onChange={onChange}
                      placeholder="Ex: conge familial"
                      required
                    />
                  </label>
                </div>
                <div className="profile-edit-actions">
                  <button className="btn-save" type="submit">
                    Envoyer la demande
                  </button>
                </div>
              </form>
            </div>

            <div className="info-pro">
              <div className="top">
                <h3 className="title">Soldes de conges</h3>
                <p className="desc">Etat courant de vos droits</p>
              </div>
              {balances.map((item) => (
                <div key={item.label}>
                  <p className="desc">{item.label}</p>
                  <h3>{item.value}</h3>
                </div>
              ))}
            </div>
          </div>

          <div className="activite-recente">
            <div className="activite-top">
              <h3 className="activite-title">Historique des demandes</h3>
              <p className="activite-subtitle">Dernieres demandes enregistrees</p>
            </div>
            <table className="activite-table">
              <thead>
                <tr>
                  <th>Periode</th>
                  <th>Type</th>
                  <th>Jours</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((item) => (
                  <tr key={item.id}>
                    <td>{item.period}</td>
                    <td>{item.type}</td>
                    <td>{item.days}</td>
                    <td>
                      <span className={`badge ${item.status === "En attente" ? "badge-attente" : "badge-termine"}`}>
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
