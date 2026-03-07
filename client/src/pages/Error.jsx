import React from "react";
import { Link, useNavigate } from "react-router-dom";
import "../styles/error.css";
import logo from "../Assets/Logo_madar_holding.png";

export default function Error() {
  const navigate = useNavigate();

  return (
    <main className="error-page">
      <div className="error-card">
        <img src={logo} alt="Madar Holding" className="error-logo" />
        <span className="error-code">404</span>
        <h1>Page introuvable</h1>
        <p>
          Le lien demande n&apos;existe pas ou a ete deplace. Vous pouvez revenir
          a l&apos;accueil pour continuer votre navigation.
        </p>
        <div className="error-actions">
          <Link className="error-button primary" to="/home">
            Retour a l&apos;accueil
          </Link>
          <button
            className="error-button ghost"
            type="button"
            onClick={() => navigate(-1)}
          >
            Retour a la page precedente
          </button>
          <Link className="error-button ghost" to="/login">
            Aller a la connexion
          </Link>
        </div>
      </div>
    </main>
  );
}
