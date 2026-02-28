import React from "react";

export default function Messagrie() {
  return (
    <>
      <div>
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
                //   onClick={() => setIsNavOpen((prev) => !prev)}
                  type="button"
                >
                  {/* {isNavOpen ? "Masquer menu" : "Afficher menu"} */}
                </button>
                <button className="mode" >
                    {/* onClick={() => setDark(!dark)} */}
                  {/* {dark ? " mode clair" : " mode sombre"} */} sdfsdfsdf
                </button>
                <button className="btn-logout">déconnecter</button>
                <button className="modifier" type="button" >
                    {/* onClick={openEditModal} */}
                  modifier
                </button>
              </div>
            </div>
      </div>
    </>
  );
}
