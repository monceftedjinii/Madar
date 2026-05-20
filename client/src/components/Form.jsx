import { useState, useEffect, useCallback } from "react";
import Cropper from "react-easy-crop";

export default function Form({
  open,
  onClose,
  onSubmit,
  formData,
  onChange,
  onPhotoChange,
  onDeletePhoto,
  deletePhoto = false,
  onCancelDeletePhoto,
  isSaving = false,
}) {
  const [previewUrl, setPreviewUrl] = useState(null);
  const [photoValid, setPhotoValid] = useState(false);

  // Cropper state
  const [cropSrc, setCropSrc] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  useEffect(() => {
    if (!open) {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      setCropSrc(null);
    }
    setPhotoValid(false);
  }, [open, formData.photoName]);

  const onCropComplete = useCallback((_, pixels) => {
    setCroppedAreaPixels(pixels);
  }, []);

  const applyCrop = useCallback(async () => {
    if (!cropSrc || !croppedAreaPixels) return;
    const img = new Image();
    img.src = cropSrc;
    await new Promise(r => { img.onload = r; });
    const canvas = document.createElement("canvas");
    const size = 400;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(
      img,
      croppedAreaPixels.x, croppedAreaPixels.y,
      croppedAreaPixels.width, croppedAreaPixels.height,
      0, 0, size, size
    );
    canvas.toBlob(blob => {
      if (!blob) return;
      const file = new File([blob], "profile.jpg", { type: "image/jpeg" });
      const url = URL.createObjectURL(blob);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(url);
      setCropSrc(null);
      // Notify parent with the cropped file
      const dt = new DataTransfer();
      dt.items.add(file);
      const fakeEvent = { target: { files: dt.files } };
      onPhotoChange(fakeEvent);
    }, "image/jpeg", 0.92);
  }, [cropSrc, croppedAreaPixels, previewUrl, onPhotoChange]);
  if (!open) return null;

  return (
    <>
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
            {/* Current photo preview + delete — only shown when image actually loads */}
            {formData.photoName && !deletePhoto && (
              <div style={{ display: photoValid ? "flex" : "none", alignItems: "center", gap: 12, marginBottom: 10 }}>
                <img
                  src={formData.photoName}
                  alt="Photo actuelle"
                  style={{ width: 56, height: 56, borderRadius: "50%", objectFit: "cover", border: "2px solid #e2e8f0" }}
                  onLoad={() => setPhotoValid(true)}
                  onError={() => setPhotoValid(false)}
                />
                <div>
                  <p style={{ margin: 0, fontSize: 12, color: "#64748b", fontWeight: 600 }}>Photo actuelle</p>
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={onDeletePhoto}
                    style={{
                      marginTop: 4, padding: "4px 12px", borderRadius: 8,
                      border: "1px solid #fca5a5", background: "#fff1f2",
                      color: "#dc2626", fontSize: 12, fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    Supprimer la photo
                  </button>
                </div>
              </div>
            )}

            {/* Pending delete indicator */}
            {deletePhoto && (
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10, padding: "10px 14px", borderRadius: 12, background: "#fff1f2", border: "1px solid #fca5a5" }}>
                <span style={{ fontSize: 22 }}>🗑️</span>
                <div>
                  <p style={{ margin: 0, fontSize: 12, color: "#dc2626", fontWeight: 700 }}>Photo supprimée après enregistrement</p>
                  <button
                    type="button"
                    onClick={onCancelDeletePhoto}
                    style={{ marginTop: 4, padding: "3px 10px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", color: "#64748b", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
                  >
                    Annuler
                  </button>
                </div>
              </div>
            )}
            {previewUrl && (
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                <img
                  src={previewUrl}
                  alt="Aperçu"
                  style={{ width: 56, height: 56, borderRadius: "50%", objectFit: "cover", border: "2px solid #4ade80" }}
                />
                <div>
                  <p style={{ margin: 0, fontSize: 12, color: "#16a34a", fontWeight: 600 }}>Aperçu — sera enregistré</p>
                  <button
                    type="button"
                    onClick={() => { setPreviewUrl(null); }}
                    style={{ marginTop: 4, padding: "3px 10px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#f8fafc", color: "#64748b", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
                  >
                    Annuler la sélection
                  </button>
                </div>
              </div>
            )}
            <label className="profile-file-input">
              {formData.photoName ? "Changer la photo" : "Photo de profil"}
              <input
                type="file"
                accept="image/*"
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = ev => {
                      setCrop({ x: 0, y: 0 });
                      setZoom(1);
                      setCropSrc(ev.target.result);
                    };
                    reader.readAsDataURL(file);
                  }
                  e.target.value = "";
                }}
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

    {/* Cropper overlay */}

    {cropSrc && (
      <div style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "rgba(0,0,0,0.85)",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
      }}>
        {/* Cropper area */}
        <div style={{ position: "relative", width: "min(500px, 90vw)", height: "min(500px, 90vw)", borderRadius: 16, overflow: "hidden" }}>
          <Cropper
            image={cropSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>

        {/* Zoom slider */}
        <div style={{ marginTop: 20, display: "flex", alignItems: "center", gap: 14, width: "min(500px, 90vw)" }}>
          <span style={{ color: "#94a3b8", fontSize: 13 }}>🔍-</span>
          <input
            type="range"
            min={1} max={3} step={0.01}
            value={zoom}
            onChange={e => setZoom(Number(e.target.value))}
            style={{ flex: 1, accentColor: "#4ade80" }}
          />
          <span style={{ color: "#94a3b8", fontSize: 13 }}>🔍+</span>
        </div>

        {/* Actions */}
        <div style={{ marginTop: 20, display: "flex", gap: 12 }}>
          <button
            type="button"
            onClick={() => setCropSrc(null)}
            style={{ padding: "10px 24px", borderRadius: 12, border: "1px solid #475569", background: "transparent", color: "#e2e8f0", fontWeight: 600, fontSize: 14, cursor: "pointer" }}
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={applyCrop}
            style={{ padding: "10px 28px", borderRadius: 12, border: "none", background: "#4ade80", color: "#0f172a", fontWeight: 700, fontSize: 14, cursor: "pointer" }}
          >
            Confirmer le recadrage
          </button>
        </div>
      </div>
    )}
    </>
  );
}
