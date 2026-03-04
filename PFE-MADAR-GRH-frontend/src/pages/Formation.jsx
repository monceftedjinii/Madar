import { useState, useEffect } from 'react';
import api from '../api';

export default function Formation() {
  const [formations, setFormations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showPeopleModal, setShowPeopleModal] = useState(false);
  const [selectedFormation, setSelectedFormation] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [peopleStep, setPeopleStep] = useState('select') // 'select' or 'review'
  const [formData, setFormData] = useState({
    nom: '',
    description: '',
    reasons: '',
  });

  useEffect(() => {
    fetchFormations();
  }, []);

  const fetchFormations = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/formations/');
      setFormations(response.data);
      setError('');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load formations');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.nom.trim() || !formData.description.trim()) {
      setError('Name and description are required');
      return;
    }

    try {
      setSubmitting(true);
      const response = await api.post('/api/formations/create/', formData);
      setSuccess('Formation request submitted successfully!');
      setFormData({ nom: '', description: '', reasons: '' });
      setShowModal(false);
      setError('');
      setSuccess('');
      await fetchFormations();
    } catch (err) {
      console.error('Formation submission error:', err);
      console.error('Response data:', err.response?.data);
      console.error('Status:', err.response?.status);
      setError(err.response?.data?.detail || err.message || 'Failed to submit formation request');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddPeople = async (formation) => {
    setSelectedFormation(formation);
    setSelectedEmployees([]);
    setPeopleStep('select');
    setError('');
    
    try {
      const response = await api.get('/api/formations/department-employees/');
      setEmployees(response.data);
      setShowPeopleModal(true);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load employees');
    }
  };

  const toggleEmployeeSelection = (employeeId) => {
    setSelectedEmployees((prev) => {
      if (prev.includes(employeeId)) {
        return prev.filter((id) => id !== employeeId);
      } else {
        return [...prev, employeeId];
      }
    });
  };

  const handleReviewParticipants = () => {
    const peopleRequired = selectedFormation?.approved_formation?.people_required || 0;
    if (selectedEmployees.length === 0) {
      setError('Please select at least one employee');
      return;
    }
    if (selectedEmployees.length > peopleRequired) {
      setError(`You selected ${selectedEmployees.length} but only need ${peopleRequired}. Please adjust your selection.`);
      return;
    }
    setError('');
    setPeopleStep('review');
  };

  const handleRemoveParticipant = (employeeId) => {
    setSelectedEmployees((prev) => prev.filter((id) => id !== employeeId));
  };

  const handleBackToSelect = () => {
    setError('');
    setPeopleStep('select');
  };

  const handleSubmitParticipants = async () => {
    try {
      setSubmitting(true);
      await api.post(`/api/formations/${selectedFormation.id}/add-participants/`, {
        employee_ids: selectedEmployees
      });
      setShowPeopleModal(false);
      setSelectedFormation(null);
      setSelectedEmployees([]);
      setPeopleStep('select');
      setError('');
      await fetchFormations();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to add participants');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadgeStyle = (status) => {
    switch (status) {
      case 'PENDING':
        return { ...styles.badge, backgroundColor: '#fff3cd', color: '#856404' };
      case 'APPROVED':
        return { ...styles.badge, backgroundColor: '#d4edda', color: '#155724' };
      case 'REJECTED':
        return { ...styles.badge, backgroundColor: '#f8d7da', color: '#721c24' };
      default:
        return styles.badge;
    }
  };

  if (loading) {
    return <div style={styles.loading}>Loading formations...</div>;
  }

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h1 style={styles.title}>Formations</h1>
        <button
          style={styles.demandButton}
          onClick={() => {
            setShowModal(true);
            setError('');
            setSuccess('');
          }}
        >
          + Demand Formation
        </button>
      </div>

      {error && <div style={styles.error}>{error}</div>}
      {success && <div style={styles.success}>{success}</div>}

      <div style={styles.container}>
        {formations.length === 0 ? (
          <div style={styles.empty}>No formations requested yet</div>
        ) : (
          <div style={styles.listContainer}>
            {formations.map((formation) => (
              <div key={formation.id} style={styles.card}>
                <div style={styles.cardHeader}>
                  <h3 style={styles.cardTitle}>{formation.nom}</h3>
                  <span style={getStatusBadgeStyle(formation.status)}>
                    {formation.status_label}
                  </span>
                </div>
                <p style={styles.description}>{formation.description}</p>
                <div style={styles.reasonsSection}>
                  <strong style={styles.reasonsLabel}>Reasons:</strong>
                  <p style={styles.reasons}>{formation.reasons}</p>
                </div>
                {formation.approved_formation && (
                  <div style={styles.reasonsSection}>
                    <strong style={styles.reasonsLabel}>Approved Formation:</strong>
                    <p style={styles.reasons}>{formation.approved_formation.name}</p>
                    <p style={{...styles.reasons, fontSize: '13px', color: '#666'}}>
                      People Required: {formation.approved_formation.people_required}
                    </p>
                  </div>
                )}
                {formation.participants && formation.participants.length > 0 && (
                  <div style={styles.reasonsSection}>
                    <strong style={styles.reasonsLabel}>Participants ({formation.participants.length}):</strong>
                    <ul style={{margin: '4px 0', paddingLeft: '20px'}}>
                      {formation.participants.map((p, idx) => (
                        <li key={idx} style={{fontSize: '14px', color: '#374151'}}>
                          {p.name || `${p.first_name} ${p.last_name}` || p.employee_name || 'Unknown'}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <div style={styles.cardFooter}>
                  <small style={styles.date}>
                    Requested: {new Date(formation.created_at).toLocaleDateString()}
                  </small>
                  {(formation.status === 'WAITING_FOR_PEOPLE' || formation.status === 'APPROVED') && (
                    <button
                      style={styles.addPeopleBtn}
                      onClick={() => handleAddPeople(formation)}
                    >
                      {formation.status === 'APPROVED' ? 'Add More Participants' : 'Add Participants'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div style={styles.overlay} onClick={() => !submitting && setShowModal(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2>Request New Formation</h2>
              <button
                style={styles.closeBtn}
                onClick={() => !submitting && setShowModal(false)}
                disabled={submitting}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} style={styles.form}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Formation Name *</label>
                <input
                  type="text"
                  name="nom"
                  value={formData.nom}
                  onChange={handleInputChange}
                  placeholder="e.g., Advanced Management"
                  style={styles.input}
                  disabled={submitting}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Description *</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Describe the formation content and objectives..."
                  style={styles.textarea}
                  rows={4}
                  disabled={submitting}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Reasons (Optional)</label>
                <textarea
                  name="reasons"
                  value={formData.reasons}
                  onChange={handleInputChange}
                  placeholder="Explain why this formation is needed..."
                  style={styles.textarea}
                  rows={4}
                  disabled={submitting}
                />
              </div>

              <div style={styles.formActions}>
                <button
                  type="button"
                  style={styles.cancelBtn}
                  onClick={() => setShowModal(false)}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={styles.submitBtn}
                  disabled={submitting}
                >
                  {submitting ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showPeopleModal && (
        <div style={styles.overlay} onClick={() => !submitting && setShowPeopleModal(false)}>
          <div style={{...styles.modal, maxHeight: '80vh', overflowY: 'auto'}} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2>Add Participants to "{selectedFormation?.nom}"</h2>
              <button
                style={styles.closeBtn}
                onClick={() => !submitting && setShowPeopleModal(false)}
                disabled={submitting}
              >
                ×
              </button>
            </div>

            {selectedFormation?.approved_formation && (
              <div style={{padding: '12px', borderBottom: '1px solid #e2e8f0', marginBottom: '16px', background: '#f0f9ff', borderRadius: '6px'}}>
                <p style={{margin: '8px 0', fontSize: '14px', color: '#0c4a6e', fontWeight: '600'}}>
                  <strong>Formation:</strong> {selectedFormation.approved_formation.name}
                </p>
                <p style={{margin: '8px 0', fontSize: '14px', color: '#0c4a6e'}}>
                  <strong>People Required:</strong> {selectedFormation.approved_formation.people_required}
                </p>
                <p style={{margin: '8px 0', fontSize: '15px', fontWeight: '600', color: '#059669'}}>
                  <strong>Step {peopleStep === 'select' ? '1' : '2'} - Currently Selected: {selectedEmployees.length}/{selectedFormation.approved_formation.people_required}</strong>
                </p>
              </div>
            )}

            {error && <div style={styles.error}>{error}</div>}

            {peopleStep === 'select' ? (
              <>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Select Employees (from your department)</label>
                  {employees.length === 0 ? (
                    <div style={{padding: '20px', textAlign: 'center', color: '#666'}}>
                      No employees available
                    </div>
                  ) : (
                    <div style={{display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '400px', overflowY: 'auto'}}>
                      {employees
                        .filter(emp => !selectedFormation?.participants?.some(p => p.employee_id === emp.id))
                        .map((emp) => (
                          <label 
                            key={emp.id} 
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              padding: '12px',
                              border: '1px solid #e2e8f0',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              backgroundColor: selectedEmployees.includes(emp.id) ? '#eff6ff' : '#fff',
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={selectedEmployees.includes(emp.id)}
                              onChange={() => toggleEmployeeSelection(emp.id)}
                              style={{marginRight: '12px', cursor: 'pointer'}}
                            />
                            <div>
                              <div style={{fontSize: '15px', fontWeight: '500', color: '#111827'}}>
                                {emp.first_name} {emp.last_name}
                              </div>
                              <div style={{fontSize: '13px', color: '#6b7280'}}>
                                {emp.email}
                              </div>
                            </div>
                          </label>
                        ))}
                    </div>
                  )}
                </div>

                <div style={styles.formActions}>
                  <button
                    type="button"
                    style={styles.cancelBtn}
                    onClick={() => setShowPeopleModal(false)}
                    disabled={submitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    style={styles.submitBtn}
                    onClick={handleReviewParticipants}
                    disabled={submitting || selectedEmployees.length === 0}
                  >
                    Next - Review Selection ({selectedEmployees.length})
                  </button>
                </div>
              </>
            ) : (
              <>
                <div style={{...styles.formGroup, background: '#fafafa', padding: '16px', borderRadius: '8px'}}>
                  <label style={styles.label}>Review Selected Participants</label>
                  {selectedEmployees.length === 0 ? (
                    <div style={{padding: '20px', textAlign: 'center', color: '#666'}}>
                      No participants selected
                    </div>
                  ) : (
                    <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                      {selectedEmployees.map((empId) => {
                        const emp = employees.find(e => e.id === empId);
                        return emp ? (
                          <div 
                            key={empId}
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '12px',
                              background: '#fff',
                              border: '1px solid #e2e8f0',
                              borderRadius: '6px'
                            }}
                          >
                            <div>
                              <div style={{fontSize: '15px', fontWeight: '500', color: '#111827'}}>
                                {emp.first_name} {emp.last_name}
                              </div>
                              <div style={{fontSize: '13px', color: '#6b7280'}}>
                                {emp.email}
                              </div>
                            </div>
                            <button
                              type="button"
                              style={{
                                background: '#ef4444',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '4px',
                                padding: '6px 12px',
                                cursor: 'pointer',
                                fontSize: '12px',
                                fontWeight: '600'
                              }}
                              onClick={() => handleRemoveParticipant(empId)}
                              disabled={submitting}
                            >
                              Remove
                            </button>
                          </div>
                        ) : null;
                      })}
                    </div>
                  )}
                </div>

                <div style={styles.formActions}>
                  <button
                    type="button"
                    style={styles.cancelBtn}
                    onClick={handleBackToSelect}
                    disabled={submitting}
                  >
                    ← Back to Edit
                  </button>
                  <button
                    type="button"
                    style={styles.submitBtn}
                    onClick={handleSubmitParticipants}
                    disabled={submitting}
                  >
                    {submitting ? 'Submitting...' : 'Confirm & Submit'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    backgroundColor: '#f5f5f5',
    padding: '20px',
    fontFamily: 'Arial, sans-serif',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '30px',
    maxWidth: '1200px',
    margin: '0 auto 30px',
  },
  title: {
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#333',
    margin: 0,
  },
  demandButton: {
    backgroundColor: '#2f86e7',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    padding: '12px 24px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
  },
  empty: {
    textAlign: 'center',
    padding: '40px 20px',
    color: '#666',
    fontSize: '16px',
    backgroundColor: 'white',
    borderRadius: '8px',
    border: '1px solid #e0e0e0',
  },
  listContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
    gap: '20px',
  },
  card: {
    backgroundColor: 'white',
    border: '1px solid #e0e0e0',
    borderRadius: '8px',
    padding: '20px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'start',
    gap: '10px',
    marginBottom: '12px',
  },
  cardTitle: {
    margin: 0,
    fontSize: '18px',
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  badge: {
    display: 'inline-block',
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600',
    whiteSpace: 'nowrap',
  },
  description: {
    margin: '10px 0',
    fontSize: '14px',
    color: '#555',
    lineHeight: '1.5',
  },
  reasonsSection: {
    marginTop: '15px',
    paddingTop: '15px',
    borderTop: '1px solid #f0f0f0',
  },
  reasonsLabel: {
    display: 'block',
    fontSize: '14px',
    color: '#333',
    marginBottom: '8px',
  },
  reasons: {
    margin: 0,
    fontSize: '13px',
    color: '#666',
    lineHeight: '1.5',
  },
  cardFooter: {
    marginTop: '12px',
    paddingTop: '12px',
    borderTop: '1px solid #f0f0f0',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  date: {
    color: '#999',
    fontSize: '12px',
  },
  addPeopleBtn: {
    backgroundColor: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    padding: '8px 16px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  loading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '400px',
    fontSize: '16px',
    color: '#666',
  },
  error: {
    maxWidth: '1200px',
    margin: '0 auto 20px',
    padding: '12px 16px',
    backgroundColor: '#f8d7da',
    color: '#721c24',
    border: '1px solid #f5c6cb',
    borderRadius: '6px',
  },
  success: {
    maxWidth: '1200px',
    margin: '0 auto 20px',
    padding: '12px 16px',
    backgroundColor: '#d4edda',
    color: '#155724',
    border: '1px solid #c3e6cb',
    borderRadius: '6px',
  },
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
    width: '90%',
    maxWidth: '500px',
    maxHeight: '90vh',
    overflow: 'auto',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px',
    borderBottom: '1px solid #e0e0e0',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    color: '#999',
    cursor: 'pointer',
    padding: 0,
    width: '30px',
    height: '30px',
  },
  form: {
    padding: '20px',
  },
  formGroup: {
    marginBottom: '20px',
  },
  label: {
    display: 'block',
    marginBottom: '8px',
    fontSize: '14px',
    fontWeight: '600',
    color: '#333',
  },
  input: {
    width: '100%',
    boxSizing: 'border-box',
    border: '1px solid #bfc7ce',
    borderRadius: '6px',
    padding: '10px 12px',
    fontSize: '14px',
    fontFamily: 'Arial, sans-serif',
  },
  textarea: {
    width: '100%',
    boxSizing: 'border-box',
    border: '1px solid #bfc7ce',
    borderRadius: '6px',
    padding: '10px 12px',
    fontSize: '14px',
    fontFamily: 'Arial, sans-serif',
    resize: 'vertical',
  },
  formActions: {
    display: 'flex',
    gap: '10px',
    justifyContent: 'flex-end',
    marginTop: '25px',
  },
  cancelBtn: {
    backgroundColor: '#6c757d',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  submitBtn: {
    backgroundColor: '#2f86e7',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
  },
};
