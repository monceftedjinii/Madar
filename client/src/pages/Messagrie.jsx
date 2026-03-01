import React from "react";
import Navbar from "../components/Navbar";
import { useState } from "react";
export default function Messagrie() {
  const [dark, setDark] = useState(false);
  const [isNavOpen, setIsNavOpen] = useState(true);
  return (
    <>
      <div
        className={`profile-page${dark ? " dark" : ""} ${
          isNavOpen ? "nav-open" : "nav-closed"
        }`}
      >
        <div className={`navbar-profile-page ${isNavOpen ? "open" : "closed"}`}>
          <Navbar />
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
                <h3 className="monprofile">Mail</h3>
                <p className="morinfo">Plateforme interne • style boîte mail</p>
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

                <button className="modifier" type="button"
                
                >
                  nouveau message
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
