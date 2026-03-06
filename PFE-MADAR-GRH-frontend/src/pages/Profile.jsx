import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

export default function Profile() {
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    phone_number: '',
    address: '',
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [activeSection, setActiveSection] = useState('account');
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/profile/');
      setProfile(response.data);
      setFormData({
        first_name: response.data.first_name || '',
        last_name: response.data.last_name || '',
        phone_number: response.data.employee_info?.phone_number || '',
        address: response.data.employee_info?.address || '',
      });
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('first_name', formData.first_name);
      formDataToSend.append('last_name', formData.last_name);

      if (formData.phone_number) formDataToSend.append('phone_number', formData.phone_number);
      if (formData.address) formDataToSend.append('address', formData.address);
      if (selectedFile) formDataToSend.append('profile_picture', selectedFile);

      await api.put('/api/profile/update/', formDataToSend, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setSuccess('Profile updated successfully.');
      setIsEditing(false);
      setSelectedFile(null);
      setPreviewUrl(null);
      await fetchProfile();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update profile');
    }
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setSelectedFile(null);
    setPreviewUrl(null);
    setFormData({
      first_name: profile?.first_name || '',
      last_name: profile?.last_name || '',
      phone_number: profile?.employee_info?.phone_number || '',
      address: profile?.employee_info?.address || '',
    });
    setError('');
  };

  const handleLogout = async () => {
    try {
      await api.post('/api/auth/logout/');
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
      navigate('/login');
    }
  };

  const handlePasswordInputChange = (e) => {
    const { name, value } = e.target;
    setPasswordForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!passwordForm.current_password || !passwordForm.new_password || !passwordForm.confirm_password) {
      setError('Please fill all password fields');
      return;
    }

    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setError('New password and confirmation do not match');
      return;
    }

    try {
      setChangingPassword(true);
      const response = await api.post('/api/profile/change-password/', passwordForm);
      setSuccess(response.data?.detail || 'Password changed successfully');
      setPasswordForm({
        current_password: '',
        new_password: '',
        confirm_password: '',
      });
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to change password');
    } finally {
      setChangingPassword(false);
    }
  };

  if (loading) {
    return <div style={styles.loading}>Loading profile...</div>;
  }

  const imageSrc =
    previewUrl ||
    profile?.profile_picture ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(`${profile?.first_name || ''} ${profile?.last_name || ''}`)}&size=180&background=d9d9d9&color=555555`;

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <aside style={styles.sidebarWrap}>
          <img src={imageSrc} alt="Profile" style={styles.avatar} />

          <div style={styles.menuBox}>
            <button style={styles.menuItem} onClick={() => navigate('/dashboard')}>
              Dashboard
            </button>
            <button
              style={{ ...styles.menuItem, ...(activeSection === 'account' ? styles.menuItemActive : {}) }}
              type="button"
              onClick={() => {
                setActiveSection('account');
                setError('');
                setSuccess('');
              }}
            >
              Account Details
            </button>
            <button
              style={{ ...styles.menuItem, ...(activeSection === 'password' ? styles.menuItemActive : {}) }}
              type="button"
              onClick={() => {
                setActiveSection('password');
                setError('');
                setSuccess('');
                setIsEditing(false);
              }}
            >
              Change Password
            </button>
            <button style={styles.menuItem} type="button" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </aside>

        <main style={styles.main}>
          <h1 style={styles.title}>Account Settings</h1>

          {error && <div style={styles.error}>{error}</div>}
          {success && <div style={styles.success}>{success}</div>}

          {activeSection === 'account' ? (
          <form onSubmit={handleSubmit}>
            <div style={styles.fieldGroup}>
              <label style={styles.label}>Email address</label>
              <input type="email" value={profile?.email || ''} disabled style={styles.inputDisabled} />
            </div>

            <div style={styles.fieldGroup}>
              <label style={styles.label}>First name</label>
              <input
                type="text"
                name="first_name"
                value={formData.first_name}
                onChange={handleInputChange}
                disabled={!isEditing}
                style={isEditing ? styles.input : styles.inputDisabled}
              />
            </div>

            <div style={styles.fieldGroup}>
              <label style={styles.label}>Last name</label>
              <input
                type="text"
                name="last_name"
                value={formData.last_name}
                onChange={handleInputChange}
                disabled={!isEditing}
                style={isEditing ? styles.input : styles.inputDisabled}
              />
            </div>

            <div style={styles.fieldGroup}>
              <label style={styles.label}>Role</label>
              <input type="text" value={profile?.role || ''} disabled style={styles.inputDisabled} />
            </div>

            {profile?.employee_info && (
              <>
                <div style={styles.fieldGroup}>
                  <label style={styles.label}>Phone number</label>
                  <input
                    type="text"
                    name="phone_number"
                    value={formData.phone_number}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    style={isEditing ? styles.input : styles.inputDisabled}
                  />
                </div>

                <div style={styles.fieldGroup}>
                  <label style={styles.label}>Address</label>
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    style={isEditing ? styles.input : styles.inputDisabled}
                  />
                </div>

                <div style={styles.fieldGroup}>
                  <label style={styles.label}>Type de Contrat</label>
                  <input
                    type="text"
                    value={profile?.employee_info?.contract_type || '-'}
                    disabled
                    style={styles.inputDisabled}
                  />
                </div>

                <div style={styles.fieldGroup}>
                  <label style={styles.label}>Date d'embauche</label>
                  <input
                    type="text"
                    value={profile?.employee_info?.hire_date ? new Date(profile.employee_info.hire_date).toLocaleDateString() : '-'}
                    disabled
                    style={styles.inputDisabled}
                  />
                </div>
              </>
            )}

            {isEditing && (
              <div style={styles.fieldGroup}>
                <label style={styles.label}>Profile picture</label>
                <input type="file" accept="image/*" onChange={handleFileSelect} />
              </div>
            )}

            <div style={styles.actions}>
              {!isEditing ? (
                <button type="button" style={styles.primaryButton} onClick={() => setIsEditing(true)}>
                  Edit Profile
                </button>
              ) : (
                <>
                  <button type="button" style={styles.secondaryButton} onClick={cancelEdit}>
                    Cancel
                  </button>
                  <button type="submit" style={styles.primaryButton}>
                    Save
                  </button>
                </>
              )}
            </div>
          </form>
          ) : (
          <form onSubmit={handleChangePassword}>
            <div style={styles.fieldGroup}>
              <label style={styles.label}>Current password</label>
              <input
                type="password"
                name="current_password"
                value={passwordForm.current_password}
                onChange={handlePasswordInputChange}
                style={styles.input}
              />
            </div>

            <div style={styles.fieldGroup}>
              <label style={styles.label}>New password</label>
              <input
                type="password"
                name="new_password"
                value={passwordForm.new_password}
                onChange={handlePasswordInputChange}
                style={styles.input}
              />
            </div>

            <div style={styles.fieldGroup}>
              <label style={styles.label}>Confirm new password</label>
              <input
                type="password"
                name="confirm_password"
                value={passwordForm.confirm_password}
                onChange={handlePasswordInputChange}
                style={styles.input}
              />
            </div>

            <div style={styles.actions}>
              <button type="submit" style={styles.primaryButton} disabled={changingPassword}>
                {changingPassword ? 'Changing...' : 'Change Password'}
              </button>
            </div>
          </form>
          )}
        </main>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    backgroundColor: '#e9e9e9',
    padding: '28px 0',
    fontFamily: 'Arial, sans-serif',
  },
  container: {
    width: '95%',
    maxWidth: '1180px',
    margin: '0 auto',
    display: 'grid',
    gridTemplateColumns: '260px 1fr',
    gap: '36px',
    alignItems: 'start',
  },
  sidebarWrap: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  avatar: {
    width: '150px',
    height: '150px',
    borderRadius: '50%',
    objectFit: 'cover',
    marginBottom: '22px',
    border: '1px solid #d0d0d0',
  },
  menuBox: {
    width: '100%',
    backgroundColor: '#fff',
    border: '1px solid #d0d0d0',
    borderRadius: '6px',
    overflow: 'hidden',
  },
  menuItem: {
    width: '100%',
    textAlign: 'left',
    padding: '18px 24px',
    border: 'none',
    borderBottom: '1px solid #e6e6e6',
    backgroundColor: '#fff',
    color: '#1f6fb2',
    fontSize: '32px',
    cursor: 'pointer',
  },
  menuItemActive: {
    backgroundColor: '#2f86e7',
    color: '#fff',
  },
  main: {
    width: '100%',
  },
  title: {
    margin: '6px 0 28px 0',
    fontSize: '56px',
    color: '#3a3a3a',
    fontWeight: 700,
  },
  fieldGroup: {
    marginBottom: '22px',
  },
  label: {
    display: 'block',
    marginBottom: '8px',
    fontSize: '40px',
    fontWeight: 600,
    color: '#3b3b3b',
  },
  input: {
    width: '100%',
    boxSizing: 'border-box',
    border: '1px solid #bfc7ce',
    borderRadius: '6px',
    padding: '15px 16px',
    fontSize: '34px',
    color: '#414141',
    backgroundColor: '#fff',
  },
  inputDisabled: {
    width: '100%',
    boxSizing: 'border-box',
    border: '1px solid #bfc7ce',
    borderRadius: '6px',
    padding: '15px 16px',
    fontSize: '34px',
    color: '#666',
    backgroundColor: '#f4f4f4',
  },
  actions: {
    marginTop: '26px',
    display: 'flex',
    gap: '10px',
  },
  primaryButton: {
    backgroundColor: '#2f86e7',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    padding: '10px 16px',
    cursor: 'pointer',
    fontSize: '28px',
    fontWeight: 600,
  },
  secondaryButton: {
    backgroundColor: '#7f8c8d',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    padding: '10px 16px',
    cursor: 'pointer',
    fontSize: '28px',
    fontWeight: 600,
  },
  error: {
    marginBottom: '16px',
    padding: '12px',
    borderRadius: '6px',
    border: '1px solid #f5c6cb',
    backgroundColor: '#f8d7da',
    color: '#721c24',
    fontSize: '26px',
  },
  success: {
    marginBottom: '16px',
    padding: '12px',
    borderRadius: '6px',
    border: '1px solid #c3e6cb',
    backgroundColor: '#d4edda',
    color: '#155724',
    fontSize: '26px',
  },
  loading: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '28px',
    backgroundColor: '#e9e9e9',
  },
};
