import React from "react";
import { Link } from "react-router-dom";
import "../styles/home.css";
import logo from "../assets/Logo_madar_holding.png";

export default function Home() {
  return (
    <main className="home-simple">
      <div className="home-card">
        <img src={logo} alt="Madar Holding" className="home-logo" />
        <h1>Plateforme de gestion Madar</h1>
        <p>
          Une solution simple pour suivre vos ressources, organiser vos projets
          et gagner du temps au quotidien.
        </p>
        <Link className="home-button" to="/login">
          Aller à la connexion
        </Link>
      </div>
    </main>
  );
}
