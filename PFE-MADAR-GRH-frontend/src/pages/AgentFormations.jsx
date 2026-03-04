import { useEffect, useState } from 'react'
import api from '../api'

export default function AgentFormations() {
  const [activeTab, setActiveTab] = useState('requests')
  const [requests, setRequests] = useState([])
  const [formations, setFormations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showFormationSelectModal, setShowFormationSelectModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedFormationId, setSelectedFormationId] = useState(null)
  const [savedFormationId, setSavedFormationId] = useState(null)
  const [selectStep, setSelectStep] = useState('select')
  const [editingFormation, setEditingFormation] = useState(null)

  const [formData, setFormData] = useState({
    name: '',
    company_name: '',
    duration_hours: '',
    people_required: '1',
    company_email: '',
    company_phone: '',
    company_address: '',
  })

  useEffect(() => {
    loadRequests()
    loadFormations('')
  }, [])

  const loadRequests = async () => {
    try {
      const response = await api.get('/api/agent/formations/requests/')
      setRequests(response.data)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load requests')
    }
  }

  const loadFormations = async (search = '') => {
    try {
      setLoading(true)
      const response = await api.get('/api/agent/formations/catalog/', {
        params: search ? { search } : {},
      })
      setFormations(response.data)
      setError('')
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load formations')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = () => {
    loadFormations(searchTerm.trim())
  }

  const handleCreateFormation = async (e) => {
    e.preventDefault()
    setError('')

    if (
      !formData.name.trim() ||
      !formData.company_name.trim() ||
      !formData.duration_hours ||
      !formData.people_required ||
      !formData.company_email.trim() ||
      !formData.company_phone.trim() ||
      !formData.company_address.trim()
    ) {
      setError('Please fill all fields')
      return
    }

    try {
      setSubmitting(true)
      await api.post('/api/agent/formations/catalog/', {
        ...formData,
        duration_hours: Number(formData.duration_hours),
        people_required: Number(formData.people_required),
      })
      setShowCreateModal(false)
      setFormData({
        name: '',
        company_name: '',
        duration_hours: '',
        people_required: '1',
        company_email: '',
        company_phone: '',
        company_address: '',
      })
      await loadFormations(searchTerm.trim())
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create formation')
    } finally {
      setSubmitting(false)
    }
  }

  const handleReject = async (requestId) => {
    if (!confirm('Are you sure you want to reject this request?')) {
      return
    }

    try {
      setSubmitting(true)
      await api.post(`/api/agent/formations/requests/${requestId}/reject/`)
      await loadRequests()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to reject request')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSelectFormation = (request) => {
    setSelectedRequest(request)
    setSelectedFormationId(null)
    setSavedFormationId(null)
    setSelectStep('select')
    setShowFormationSelectModal(true)
  }

  const handleSaveFormationSelection = () => {
    if (selectedFormationId === null) {
      setError('Please select a formation')
      return
    }
    setSavedFormationId(selectedFormationId)
    setSelectStep('confirm')
    setError('')
  }

  const handleEditFormationSelection = () => {
    setSelectStep('select')
  }

  const handleApproveWithFormation = async () => {
    try {
      setSubmitting(true)
      await api.post(`/api/agent/formations/requests/${selectedRequest.id}/approve/`, {
        formation_id: savedFormationId
      })
      setShowFormationSelectModal(false)
      setSelectedRequest(null)
      setSelectedFormationId(null)
      setSavedFormationId(null)
      await loadRequests()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to approve request')
    } finally {
      setSubmitting(false)
    }
  }

  const handleEditFormation = (formation) => {
    setEditingFormation(formation)
    setFormData({
      name: formation.name,
      company_name: formation.company_name,
      duration_hours: formation.duration_hours.toString(),
      people_required: formation.people_required.toString(),
      company_email: formation.company_email,
      company_phone: formation.company_phone,
      company_address: formation.company_address,
    })
    setShowEditModal(true)
  }

  const handleUpdateFormation = async (e) => {
    e.preventDefault()
    setError('')

    if (
      !formData.name.trim() ||
      !formData.company_name.trim() ||
      !formData.duration_hours ||
      !formData.people_required ||
      !formData.company_email.trim() ||
      !formData.company_phone.trim() ||
      !formData.company_address.trim()
    ) {
      setError('Please fill all fields')
      return
    }

    try {
      setSubmitting(true)
      await api.put(`/api/agent/formations/catalog/${editingFormation.id}/`, {
        ...formData,
        duration_hours: Number(formData.duration_hours),
        people_required: Number(formData.people_required),
      })
      setShowEditModal(false)
      setEditingFormation(null)
      setFormData({
        name: '',
        company_name: '',
        duration_hours: '',
        people_required: '1',
        company_email: '',
        company_phone: '',
        company_address: '',
      })
      await loadFormations(searchTerm.trim())
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update formation')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteFormation = async (formationId) => {
    if (!confirm('Are you sure you want to delete this formation?')) {
      return
    }

    try {
      setSubmitting(true)
      await api.delete(`/api/agent/formations/catalog/${formationId}/`)
      await loadFormations(searchTerm.trim())
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to delete formation')
    } finally {
      setSubmitting(false)
    }
  }

  const renderRequests = () => {
    if (requests.length === 0) {
      return <div style={styles.emptyState}>No requests found</div>
    }

    return (
      <div style={styles.cardsGrid}>
        {requests.map((req) => (
          <div key={req.id} style={styles.card}>
            <div style={styles.cardTopRow}>
              <h3 style={styles.cardTitle}>{req.nom}</h3>
              <span style={styles.statusBadge}>{req.status_label}</span>
            </div>
            <p style={styles.cardText}><strong>From:</strong> {req.requested_by_email}</p>
            {req.department && (
              <p style={styles.cardText}><strong>Department:</strong> {req.department}</p>
            )}
            <p style={styles.cardText}><strong>Description:</strong> {req.description}</p>
            <p style={styles.cardText}><strong>Reasons:</strong> {req.reasons || '-'}</p>
            
            {req.approved_formation && (
              <div style={{...styles.cardText, background: '#f0f9ff', padding: '8px', borderRadius: '4px', marginTop: '8px'}}>
                <p style={{margin: '4px 0', fontSize: '13px', fontWeight: '600', color: '#0c4a6e'}}>
                  <strong>Formation:</strong> #{req.approved_formation.id} - {req.approved_formation.name}
                </p>
                <p style={{margin: '4px 0', fontSize: '13px', color: '#0c4a6e'}}>
                  <strong>People Needed:</strong> {req.approved_formation.people_required}
                </p>
              </div>
            )}

            {req.participants && req.participants.length > 0 && (
              <div style={{...styles.cardText, background: '#f0fdf4', padding: '8px', borderRadius: '4px', marginTop: '8px'}}>
                <p style={{margin: '4px 0', fontSize: '13px', fontWeight: '600', color: '#15803d'}}>
                  <strong>Participants ({req.participants.length}):</strong>
                </p>
                <ul style={{margin: '4px 0 0 0', paddingLeft: '20px'}}>
                  {req.participants.map((p, idx) => (
                    <li key={idx} style={{fontSize: '12px', color: '#166534'}}>
                      {p.name || 'Unknown'} ({p.email})
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {req.status === 'PENDING' && (
              <div style={styles.cardActions}>
                <button 
                  style={styles.rejectBtn} 
                  onClick={() => handleReject(req.id)}
                  disabled={submitting}
                >
                  Reject
                </button>
                <button 
                  style={styles.selectFormationBtn} 
                  onClick={() => handleSelectFormation(req)}
                  disabled={submitting}
                >
                  Select Formation
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    )
  }

  const renderFormations = () => {
    return (
      <>
        <div style={styles.toolbar}>
          <div style={styles.searchWrap}>
            <input
              style={styles.input}
              placeholder="Search formation"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <button style={styles.searchBtn} onClick={handleSearch}>
              Search
            </button>
          </div>
          <button style={styles.createBtn} onClick={() => setShowCreateModal(true)}>
            + Create Formation
          </button>
        </div>

        {formations.length === 0 ? (
          <div style={styles.emptyState}>No formations found</div>
        ) : (
          <div style={styles.cardsGrid}>
            {formations.map((formation) => (
              <div key={formation.id} style={styles.card}>
                <h3 style={styles.cardTitle}>{formation.name}</h3>
                <p style={styles.cardText}><strong>Company:</strong> {formation.company_name}</p>
                <p style={styles.cardText}><strong>Duration:</strong> {formation.duration_hours} hours</p>
                <p style={styles.cardText}><strong>People Required:</strong> {formation.people_required}</p>
                <p style={styles.cardText}><strong>Email:</strong> {formation.company_email}</p>
                <p style={styles.cardText}><strong>Phone:</strong> {formation.company_phone}</p>
                <p style={styles.cardText}><strong>Address:</strong> {formation.company_address}</p>
                
                <div style={styles.cardActions}>
                  <button 
                    style={styles.editBtn} 
                    onClick={() => handleEditFormation(formation)}
                    disabled={submitting}
                  >
                    Edit
                  </button>
                  <button 
                    style={styles.deleteBtn} 
                    onClick={() => handleDeleteFormation(formation.id)}
                    disabled={submitting}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </>
    )
  }

  return (
    <div style={styles.page}>
      <div style={styles.layout}>
        <aside style={styles.leftMenu}>
          <h2 style={styles.leftTitle}>Formations</h2>
          <button
            style={activeTab === 'requests' ? styles.leftBtnActive : styles.leftBtn}
            onClick={() => setActiveTab('requests')}
          >
            Requests
          </button>
          <button
            style={activeTab === 'formations' ? styles.leftBtnActive : styles.leftBtn}
            onClick={() => setActiveTab('formations')}
          >
            Formations
          </button>
        </aside>

        <main style={styles.content}>
          {error && <div style={styles.error}>{error}</div>}
          {loading ? (
            <div style={styles.emptyState}>Loading...</div>
          ) : activeTab === 'requests' ? (
            renderRequests()
          ) : (
            renderFormations()
          )}
        </main>
      </div>

      {showCreateModal && (
        <div style={styles.modalOverlay} onClick={() => !submitting && setShowCreateModal(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>Create Formation</h3>
            <form onSubmit={handleCreateFormation}>
              <input
                style={styles.inputFull}
                placeholder="Formation Name"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              />
              <input
                style={styles.inputFull}
                placeholder="Company Name"
                value={formData.company_name}
                onChange={(e) => setFormData((prev) => ({ ...prev, company_name: e.target.value }))}
              />
              <input
                style={styles.inputFull}
                type="number"
                min="1"
                placeholder="Duration (hours)"
                value={formData.duration_hours}
                onChange={(e) => setFormData((prev) => ({ ...prev, duration_hours: e.target.value }))}
              />
              <input
                style={styles.inputFull}
                type="number"
                min="1"
                placeholder="People Required"
                value={formData.people_required}
                onChange={(e) => setFormData((prev) => ({ ...prev, people_required: e.target.value }))}
              />
              <input
                style={styles.inputFull}
                type="email"
                placeholder="Company Email"
                value={formData.company_email}
                onChange={(e) => setFormData((prev) => ({ ...prev, company_email: e.target.value }))}
              />
              <input
                style={styles.inputFull}
                placeholder="Company Phone"
                value={formData.company_phone}
                onChange={(e) => setFormData((prev) => ({ ...prev, company_phone: e.target.value }))}
              />
              <input
                style={styles.inputFull}
                placeholder="Company Address"
                value={formData.company_address}
                onChange={(e) => setFormData((prev) => ({ ...prev, company_address: e.target.value }))}
              />

              <div style={styles.modalActions}>
                <button type="button" style={styles.cancelBtn} onClick={() => setShowCreateModal(false)}>
                  Cancel
                </button>
                <button type="submit" style={styles.createBtn} disabled={submitting}>
                  {submitting ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditModal && (
        <div style={styles.modalOverlay} onClick={() => !submitting && setShowEditModal(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>Edit Formation - #{editingFormation?.id}</h3>
            <form onSubmit={handleUpdateFormation}>
              <input
                style={styles.inputFull}
                placeholder="Formation Name"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              />
              <input
                style={styles.inputFull}
                placeholder="Company Name"
                value={formData.company_name}
                onChange={(e) => setFormData((prev) => ({ ...prev, company_name: e.target.value }))}
              />
              <input
                style={styles.inputFull}
                type="number"
                min="1"
                placeholder="Duration (hours)"
                value={formData.duration_hours}
                onChange={(e) => setFormData((prev) => ({ ...prev, duration_hours: e.target.value }))}
              />
              <input
                style={styles.inputFull}
                type="number"
                min="1"
                placeholder="People Required"
                value={formData.people_required}
                onChange={(e) => setFormData((prev) => ({ ...prev, people_required: e.target.value }))}
              />
              <input
                style={styles.inputFull}
                type="email"
                placeholder="Company Email"
                value={formData.company_email}
                onChange={(e) => setFormData((prev) => ({ ...prev, company_email: e.target.value }))}
              />
              <input
                style={styles.inputFull}
                placeholder="Company Phone"
                value={formData.company_phone}
                onChange={(e) => setFormData((prev) => ({ ...prev, company_phone: e.target.value }))}
              />
              <input
                style={styles.inputFull}
                placeholder="Company Address"
                value={formData.company_address}
                onChange={(e) => setFormData((prev) => ({ ...prev, company_address: e.target.value }))}
              />

              <div style={styles.modalActions}>
                <button type="button" style={styles.cancelBtn} onClick={() => setShowEditModal(false)}>
                  Cancel
                </button>
                <button type="submit" style={styles.createBtn} disabled={submitting}>
                  {submitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showFormationSelectModal && (
        <div style={styles.modalOverlay} onClick={() => !submitting && setShowFormationSelectModal(false)}>
          <div style={{...styles.modal, maxHeight: '80vh', overflowY: 'auto'}} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>Select Formation for "{selectedRequest?.nom}"</h3>
            
            {error && <div style={styles.error}>{error}</div>}

            {selectStep === 'select' ? (
              <>
                <div style={{marginBottom: '20px'}}>
                  <label style={{fontSize: '14px', fontWeight: '600', color: '#333', marginBottom: '12px', display: 'block'}}>
                    Choose a Formation (by ID):
                  </label>
                  
                  {formations.length === 0 ? (
                    <div style={styles.emptyState}>No formations available</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '400px', overflowY: 'auto' }}>
                      {formations.map((formation) => (
                        <label 
                          key={formation.id} 
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            padding: '12px',
                            border: '1px solid #e2e8f0',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            backgroundColor: selectedFormationId === formation.id ? '#eff6ff' : '#fff',
                            transition: 'background-color 0.2s',
                          }}
                        >
                          <input
                            type="radio"
                            name="formation"
                            checked={selectedFormationId === formation.id}
                            onChange={() => setSelectedFormationId(formation.id)}
                            style={{marginRight: '12px', cursor: 'pointer'}}
                          />
                          <div>
                            <div style={{fontSize: '16px', fontWeight: '600', color: '#111827'}}>
                              Formation #{formation.id}
                            </div>
                            <div style={{fontSize: '13px', color: '#6b7280', marginTop: '4px'}}>
                              {formation.name} • {formation.people_required} people required
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                <div style={styles.modalActions}>
                  <button 
                    type="button" 
                    style={styles.cancelBtn} 
                    onClick={() => setShowFormationSelectModal(false)}
                    disabled={submitting}
                  >
                    Cancel
                  </button>
                  <button 
                    type="button" 
                    style={styles.createBtn} 
                    onClick={handleSaveFormationSelection}
                    disabled={submitting || selectedFormationId === null}
                  >
                    Save Selection
                  </button>
                </div>
              </>
            ) : (
              <>
                <div style={{background: '#f9fafb', padding: '16px', borderRadius: '8px', marginBottom: '20px'}}>
                  <h4 style={{margin: '0 0 12px 0', color: '#333'}}>Confirmation</h4>
                  {formations.find(f => f.id === savedFormationId) && (
                    <div>
                      <p style={{margin: '8px 0', fontSize: '14px', color: '#374151'}}>
                        <strong>Selected Formation:</strong> Formation #{savedFormationId}
                      </p>
                      <p style={{margin: '8px 0', fontSize: '14px', color: '#374151'}}>
                        <strong>Name:</strong> {formations.find(f => f.id === savedFormationId)?.name}
                      </p>
                      <p style={{margin: '8px 0', fontSize: '14px', color: '#374151'}}>
                        <strong>Company:</strong> {formations.find(f => f.id === savedFormationId)?.company_name}
                      </p>
                      <p style={{margin: '8px 0', fontSize: '14px', color: '#374151'}}>
                        <strong>People Required:</strong> {formations.find(f => f.id === savedFormationId)?.people_required}
                      </p>
                    </div>
                  )}
                </div>

                <div style={styles.modalActions}>
                  <button 
                    type="button" 
                    style={styles.cancelBtn} 
                    onClick={handleEditFormationSelection}
                    disabled={submitting}
                  >
                    Edit
                  </button>
                  <button 
                    type="button" 
                    style={styles.approveBtn} 
                    onClick={handleApproveWithFormation}
                    disabled={submitting}
                  >
                    {submitting ? 'Submitting...' : 'Submit'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

const styles = {
  page: {
    minHeight: '100vh',
    backgroundColor: '#f5f5f5',
    padding: '20px',
  },
  layout: {
    maxWidth: '1200px',
    margin: '0 auto',
    display: 'flex',
    gap: '20px',
  },
  leftMenu: {
    width: '220px',
    backgroundColor: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    padding: '16px',
    height: 'fit-content',
  },
  leftTitle: {
    margin: '0 0 12px',
    fontSize: '18px',
  },
  leftBtn: {
    width: '100%',
    marginBottom: '10px',
    textAlign: 'left',
    padding: '10px',
    border: '1px solid #cbd5e1',
    background: '#fff',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  leftBtnActive: {
    width: '100%',
    marginBottom: '10px',
    textAlign: 'left',
    padding: '10px',
    border: '1px solid #2f86e7',
    background: '#eaf3ff',
    borderRadius: '6px',
    cursor: 'pointer',
    color: '#2f86e7',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    backgroundColor: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    padding: '16px',
  },
  toolbar: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '12px',
    marginBottom: '16px',
  },
  searchWrap: {
    display: 'flex',
    gap: '8px',
    flex: 1,
  },
  input: {
    flex: 1,
    border: '1px solid #cbd5e1',
    borderRadius: '6px',
    padding: '10px 12px',
    fontSize: '14px',
  },
  inputFull: {
    width: '100%',
    border: '1px solid #cbd5e1',
    borderRadius: '6px',
    padding: '10px 12px',
    fontSize: '14px',
    marginBottom: '10px',
    boxSizing: 'border-box',
  },
  searchBtn: {
    border: 'none',
    background: '#334155',
    color: '#fff',
    borderRadius: '6px',
    padding: '10px 14px',
    cursor: 'pointer',
  },
  createBtn: {
    border: 'none',
    background: '#2f86e7',
    color: '#fff',
    borderRadius: '6px',
    padding: '10px 14px',
    cursor: 'pointer',
  },
  cancelBtn: {
    border: '1px solid #cbd5e1',
    background: '#fff',
    color: '#111827',
    borderRadius: '6px',
    padding: '10px 14px',
    cursor: 'pointer',
  },
  cardsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '12px',
  },
  card: {
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    padding: '12px',
  },
  cardTopRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '8px',
  },
  cardTitle: {
    margin: '0 0 8px',
    fontSize: '16px',
  },
  cardText: {
    margin: '6px 0',
    fontSize: '14px',
    color: '#374151',
  },
  statusBadge: {
    background: '#fff3cd',
    color: '#856404',
    borderRadius: '999px',
    padding: '4px 10px',
    fontSize: '12px',
    whiteSpace: 'nowrap',
  },
  emptyState: {
    textAlign: 'center',
    color: '#6b7280',
    padding: '24px',
  },
  error: {
    marginBottom: '12px',
    padding: '10px 12px',
    border: '1px solid #fecaca',
    borderRadius: '6px',
    background: '#fef2f2',
    color: '#991b1b',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.35)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    width: '560px',
    maxWidth: '95vw',
    background: '#fff',
    borderRadius: '10px',
    padding: '16px',
    border: '1px solid #e2e8f0',
  },
  modalActions: {
    marginTop: '8px',
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '8px',
  },
  cardActions: {
    display: 'flex',
    gap: '8px',
    marginTop: '12px',
  },
  rejectBtn: {
    border: 'none',
    background: '#dc2626',
    color: '#fff',
    borderRadius: '6px',
    padding: '8px 16px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  selectFormationBtn: {
    border: 'none',
    background: '#2563eb',
    color: '#fff',
    borderRadius: '6px',
    padding: '8px 16px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  approveBtn: {
    border: 'none',
    background: '#16a34a',
    color: '#fff',
    borderRadius: '6px',
    padding: '8px 16px',
    cursor: 'pointer',
    fontSize: '14px',
    whiteSpace: 'nowrap',
  },
  formationSelectCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '12px',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    background: '#f9fafb',
  },
  editBtn: {
    border: 'none',
    background: '#f59e0b',
    color: '#fff',
    borderRadius: '6px',
    padding: '8px 16px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
  },
  deleteBtn: {
    border: 'none',
    background: '#ef4444',
    color: '#fff',
    borderRadius: '6px',
    padding: '8px 16px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
  },
}
