export default function Form({
  open,
  onClose,
  onSubmit,
  formData,
  onChange,
  onPhotoChange,
  isSaving = false,
}) {
  if (!open) return null;

  return (
    <div
      className="profile-edit-backdrop"
      onClick={() => {
        if (!isSaving) onClose();
      }}
    >
      <div
        className="profile-edit-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Modifier mon profil"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="profile-edit-head">
          <h2>Modifier mon profil</h2>
          <button
            type="button"
            className="close-edit-btn"
            onClick={onClose}
            disabled={isSaving}
          >
            Fermer
          </button>
        </div>

        <form className="profile-edit-form" onSubmit={onSubmit}>
          <div className="profile-edit-grid">
            <label>
              Nom complet
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={onChange}
                disabled={isSaving}
                required
              />
            </label>
            <label>
              E-mail
              <input type="email" name="email" value={formData.email} readOnly />
            </label>
            <label>
              Téléphone
              <input
                type="text"
                name="phone"
                value={formData.phone}
                onChange={onChange}
                disabled={isSaving}
              />
            </label>
            <label>
              Adresse
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={onChange}
                disabled={isSaving}
              />
            </label>
            <label>
              Rôle
              <input
                type="text"
                name="role"
                value={formData.role || ""}
                readOnly
              />
            </label>
            <label>
              Département
              <input
                type="text"
                name="department"
                value={formData.department || ""}
                readOnly
              />
            </label>
            <label>
              Mot de passe actuel
              <input
                type="password"
                name="current_password"
                value={formData.current_password || ""}
                onChange={onChange}
                disabled={isSaving}
                autoComplete="current-password"
              />
            </label>
            <label>
              Nouveau mot de passe
              <input
                type="password"
                name="new_password"
                value={formData.new_password || ""}
                onChange={onChange}
                disabled={isSaving}
                autoComplete="new-password"
                minLength={8}
              />
            </label>
            <label>
              Confirmer le nouveau mot de passe
              <input
                type="password"
                name="confirm_password"
                value={formData.confirm_password || ""}
                onChange={onChange}
                disabled={isSaving}
                autoComplete="new-password"
                minLength={8}
              />
            </label>
          </div>

          <div className="profile-file-row">
            <label className="profile-file-input">
              Photo de profil
              <input
                type="file"
                accept="image/*"
                onChange={onPhotoChange}
                disabled={isSaving}
              />
            </label>
          </div>

          <div className="profile-edit-actions">
            <button
              type="button"
              className="btn-cancel"
              onClick={onClose}
              disabled={isSaving}
            >
              Annuler
            </button>
            <button type="submit" className="btn-save" disabled={isSaving}>
              {isSaving ? "Enregistrement..." : "Enregistrer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
