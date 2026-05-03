import { useState, useEffect } from 'react';
import api from '../api';

export default function AddEmployee() {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone_number: '',
    address: '',
    position: '',
    contract_type: 'CDI',
    department: '',
    salary: '',
    attendance_pin: ''
  });
  
  const [departments, setDepartments] = useState([]);
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [createdEmployee, setCreatedEmployee] = useState(null);

  useEffect(() => {
    fetchDepartments();
    fetchPositions();
  }, []);

  const fetchDepartments = async () => {
    try {
      const response = await api.get('/api/departments/');
      setDepartments(response.data || []);
    } catch (err) {
      console.error('Failed to fetch departments:', err);
      setError('Failed to load departments');
    }
  };

  const fetchPositions = async () => {
    try {
      const response = await api.get('/api/positions/');
      setPositions(response.data || []);
    } catch (err) {
      console.error('Failed to fetch positions:', err);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.first_name.trim() || !formData.last_name.trim() || !formData.email.trim() || !formData.department) {
      setError('Le prénom, le nom, l’e-mail et le département sont obligatoires');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      
      const response = await api.post('/api/employees/create/', formData);
      
      if (response.data.success) {
        setCreatedEmployee(response.data);
        setSuccess('Employé créé avec succès !');
        
        // Reset form
        setFormData({
          first_name: '',
          last_name: '',
          email: '',
          phone_number: '',
          address: '',
          position: '',
          contract_type: 'CDI',
          department: '',
          salary: '',
          attendance_pin: ''
        });
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Impossible de créer l’employé');
      console.error('Erreur lors de la création de l’employé :', err);
    } finally {
      setLoading(false);
    }
  };

  const styles = {
    container: {
      maxWidth: '600px',
      margin: '0 auto',
      padding: '20px'
    },
    header: {
      fontSize: '24px',
      fontWeight: 'bold',
      marginBottom: '20px',
      color: '#333'
    },
    form: {
      backgroundColor: '#f9f9f9',
      padding: '20px',
      borderRadius: '8px',
      border: '1px solid #e0e0e0'
    },
    formGroup: {
      marginBottom: '15px'
    },
    label: {
      display: 'block',
      fontWeight: 500,
      marginBottom: '5px',
      color: '#333',
      fontSize: '14px'
    },
    input: {
      width: '100%',
      padding: '10px',
      border: '1px solid #ddd',
      borderRadius: '4px',
      fontFamily: 'inherit',
      fontSize: '14px',
      boxSizing: 'border-box'
    },
    select: {
      width: '100%',
      padding: '10px',
      border: '1px solid #ddd',
      borderRadius: '4px',
      fontFamily: 'inherit',
      fontSize: '14px',
      boxSizing: 'border-box'
    },
    buttonGroup: {
      display: 'flex',
      gap: '10px',
      marginTop: '20px'
    },
    btn: {
      padding: '10px 20px',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      fontWeight: 500,
      fontSize: '14px',
      transition: 'all 0.2s'
    },
    primaryBtn: {
      backgroundColor: '#007bff',
      color: 'white',
      flex: 1
    },
    resetBtn: {
      backgroundColor: '#6c757d',
      color: 'white',
      flex: 1
    },
    errorMsg: {
      padding: '12px',
      backgroundColor: '#f8d7da',
      color: '#721c24',
      border: '1px solid #f5c6cb',
      borderRadius: '4px',
      marginBottom: '15px',
      fontSize: '13px'
    },
    successMsg: {
      padding: '12px',
      backgroundColor: '#d4edda',
      color: '#155724',
      border: '1px solid #c3e6cb',
      borderRadius: '4px',
      marginBottom: '15px',
      fontSize: '13px'
    },
    credentialsBox: {
      backgroundColor: '#e8f4f8',
      padding: '15px',
      borderRadius: '4px',
      border: '1px solid #b3d9ff',
      marginTop: '20px'
    },
    credentialRow: {
      marginBottom: '10px',
      fontSize: '14px'
    },
    credentialLabel: {
      fontWeight: 600,
      color: '#333'
    },
    credentialValue: {
      fontFamily: 'monospace',
      backgroundColor: '#fff',
      padding: '8px',
      borderRadius: '3px',
      marginTop: '5px',
      wordBreak: 'break-all'
    },
    copyBtn: {
      marginLeft: '10px',
      padding: '4px 8px',
      backgroundColor: '#007bff',
      color: 'white',
      border: 'none',
      borderRadius: '3px',
      cursor: 'pointer',
      fontSize: '12px'
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.header}>➕ Ajouter un employé</h1>

      {error && <div style={styles.errorMsg}>⚠️ {error}</div>}
      {success && <div style={styles.successMsg}>✓ {success}</div>}

      {!createdEmployee ? (
        <form style={styles.form} onSubmit={handleSubmit}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Prénom :</label>
            <input
              type="text"
              name="first_name"
              style={styles.input}
              value={formData.first_name}
              onChange={handleChange}
              placeholder="Mohamed"
              required
              disabled={loading}
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Nom :</label>
            <input
              type="text"
              name="last_name"
              style={styles.input}
              value={formData.last_name}
              onChange={handleChange}
              placeholder="Benali"
              required
              disabled={loading}
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Adresse e-mail :</label>
            <input
              type="email"
              name="email"
              style={styles.input}
              value={formData.email}
              onChange={handleChange}
              placeholder="john@example.com"
              required
              disabled={loading}
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Numéro de téléphone :</label>
            <input
              type="text"
              name="phone_number"
              style={styles.input}
              value={formData.phone_number}
              onChange={handleChange}
              placeholder="+213..."
              disabled={loading}
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Adresse :</label>
            <input
              type="text"
              name="address"
              style={styles.input}
              value={formData.address}
              onChange={handleChange}
              placeholder="Street, City"
              disabled={loading}
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Poste / Position:</label>
            <select
              name="position"
              style={styles.select}
              value={formData.position}
              onChange={handleChange}
              disabled={loading}
            >
              <option value="">-- Sélectionner un poste --</option>
              {positions.map((position) => (
                <option key={position.id} value={position.id}>{position.name}</option>
              ))}
            </select>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Département :</label>
            <select
              name="department"
              style={styles.select}
              value={formData.department}
              onChange={handleChange}
              required
              disabled={loading}
            >
              <option value="">-- Sélectionner un département --</option>
              {departments.map(dept => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Type de Contrat:</label>
            <select
              name="contract_type"
              style={styles.select}
              value={formData.contract_type}
              onChange={handleChange}
              required
              disabled={loading}
            >
              <option value="CDI">CDI</option>
              <option value="CDD">CDD</option>
              <option value="STAGE">Stage</option>
            </select>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Salaire :</label>
            <input
              type="number"
              name="salary"
              style={styles.input}
              value={formData.salary}
              onChange={handleChange}
              placeholder="0.00"
              step="0.01"
              disabled={loading}
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Code PIN de présence (optionnel) :</label>
            <input
              type="text"
              name="attendance_pin"
              style={styles.input}
              value={formData.attendance_pin}
              onChange={handleChange}
              placeholder="Code PIN à 4 chiffres"
              disabled={loading}
            />
          </div>

          <div style={styles.buttonGroup}>
            <button
              type="reset"
              style={{ ...styles.btn, ...styles.resetBtn }}
              onClick={() => setFormData({
                first_name: '',
                last_name: '',
                email: '',
                phone_number: '',
                address: '',
                position: '',
                contract_type: 'CDI',
                department: '',
                salary: '',
                attendance_pin: ''
              })}
              disabled={loading}
            >
              Effacer
            </button>
            <button
              type="submit"
              style={{ ...styles.btn, ...styles.primaryBtn }}
              disabled={loading}
            >
              {loading ? '⏳ Création...' : '✨ Créer l’employé'}
            </button>
          </div>
        </form>
      ) : (
        <div>
          <div style={styles.credentialsBox}>
            <h3 style={{ marginTop: 0, color: '#007bff' }}>🎉 Employé créé avec succès !</h3>
            
            <div style={styles.credentialRow}>
              <span style={styles.credentialLabel}>Nom :</span>
              <div style={styles.credentialValue}>
                {createdEmployee.employee.first_name} {createdEmployee.employee.last_name}
              </div>
            </div>

            <div style={styles.credentialRow}>
              <span style={styles.credentialLabel}>Poste :</span>
              <div style={styles.credentialValue}>
                {createdEmployee.employee.position || '-'}
              </div>
            </div>

            <div style={styles.credentialRow}>
              <span style={styles.credentialLabel}>E-mail :</span>
              <div style={styles.credentialValue}>
                {createdEmployee.credentials.email}
              </div>
            </div>

            <div style={styles.credentialRow}>
              <span style={styles.credentialLabel}>Mot de passe temporaire :</span>
              <div style={styles.credentialValue}>
                {createdEmployee.credentials.temporary_password}
                <button 
                  style={styles.copyBtn}
                  onClick={() => copyToClipboard(createdEmployee.credentials.temporary_password)}
                >
                  📋 Copier
                </button>
              </div>
            </div>

            <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px solid #b3d9ff', fontSize: '13px', color: '#333' }}>
              <strong>⚠️ Important :</strong> Partagez ces identifiants avec le nouvel employé. Il peut se connecter avec l’e-mail et le mot de passe temporaire, et devra changer son mot de passe après la première connexion.
            </div>
          </div>

          <div style={styles.buttonGroup}>
            <button
              style={{ ...styles.btn, ...styles.primaryBtn }}
              onClick={() => setCreatedEmployee(null)}
            >
              ➕ Ajouter un autre employé
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
