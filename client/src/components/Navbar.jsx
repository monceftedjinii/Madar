import React from "react";
import "../styles/navbar.css";
import logo from "../assets/Logo_madar_holding.png";
export default function Navbar() {
  return (
    <div className="container_navbar">
      <div className="grh-navbar">
        <div className="img-container">
          <img src={logo} alt="Logo Madar Holding" className="img" />
        </div>
        <div className="write">
          <h4>MADAR GRH</h4>
          <p>Portail RH</p>
        </div>
      </div>
    </div>
  );
}
