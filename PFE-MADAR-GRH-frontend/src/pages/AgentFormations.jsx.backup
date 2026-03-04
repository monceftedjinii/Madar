import { useEffect, useState } from 'react'
import api from '../api'

export default function AgentFormations() {
  const [activeTab, setActiveTab] = useState('requests')
  const [requests, setRequests] = useState([])
  const [formations, setFormations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  const [formData, setFormData] = useState({
    name: '',
    company_name: '',
    duration_hours: '',
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
      })
      setShowCreateModal(false)
      setFormData({
        name: '',
        company_name: '',
        duration_hours: '',
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
                <p style={styles.cardText}><strong>Email:</strong> {formation.company_email}</p>
                <p style={styles.cardText}><strong>Phone:</strong> {formation.company_phone}</p>
                <p style={styles.cardText}><strong>Address:</strong> {formation.company_address}</p>
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
}
