import { useState, useEffect } from 'react';
import api from '../api';

export default function Documents() {
  const [documents, setDocuments] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [uploadError, setUploadError] = useState(null);
  const [uploadSuccess, setUploadSuccess] = useState(null);
  const [uploading, setUploading] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    type: '',
    category: 'INTERNAL',
    source_department: '',
    target_department: '',
    file: null
  });

  // Row action states
  const [actionInProgress, setActionInProgress] = useState({}); // { docId: 'send' | 'validate' | 'archive' }
  const [commentInputs, setCommentInputs] = useState({}); // { docId: comment text }
  const [expandedComments, setExpandedComments] = useState({}); // { docId: true/false }
  const [rowMessages, setRowMessages] = useState({}); // { docId: { type, text } }
  const [commentsByDoc, setCommentsByDoc] = useState({}); // { docId: comments[] }
  const [commentsLoading, setCommentsLoading] = useState({}); // { docId: boolean }

  // User info
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isRHSeniorOrGRH = user.role === 'RH_SENIOR' || user.role === 'GRH';
  const isChef = user.role === 'CHEF';
  const isEmployee = user.role === 'EMPLOYEE';

  useEffect(() => {
    fetchDocuments();
    fetchDepartments();
  }, []);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      setError(null);
      const endpoint = isEmployee
        ? '/api/documents/feed/'
        : isChef
          ? '/api/documents/mine/'
          : '/api/documents/me/';
      const response = await api.get(endpoint);
      setDocuments(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await api.get('/api/departments/');
      setDepartments(response.data || []);
    } catch (err) {
      setDepartments([]);
    }
  };

  const handleFormChange = (e) => {
    const { name, value, type, files } = e.target;
    if (type === 'file') {
      setFormData(prev => ({ ...prev, file: files?.[0] || null }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
    if (uploadError) setUploadError(null);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    setUploadError(null);
    setUploadSuccess(null);

    if (!formData.title || !formData.type || !formData.file) {
      setUploadError('Please fill in title, type, and select a file');
      return;
    }
    if (isChef && !formData.target_department) {
      setUploadError('Please select a target department');
      return;
    }

    try {
      setUploading(true);
      const data = new FormData();
      data.append('title', formData.title);
      data.append('type', formData.type);
      data.append('category', formData.category);
      if (formData.source_department) data.append('source_department', formData.source_department);
      if (formData.target_department) data.append('target_department', formData.target_department);
      data.append('file', formData.file);

      await api.post('/api/documents/', data);
      setUploadSuccess('Document uploaded successfully');
      setFormData({
        title: '',
        type: '',
        category: 'INTERNAL',
        source_department: '',
        target_department: '',
        file: null
      });

      setTimeout(() => {
        fetchDocuments();
        setUploadSuccess(null);
      }, 1500);
    } catch (err) {
      const detail = err.response?.data?.detail || err.response?.data?.error;
      const payload = typeof err.response?.data === 'object'
        ? JSON.stringify(err.response?.data)
        : err.response?.data;
      setUploadError(detail || payload || 'Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  const handleSend = async (doc) => {
    if (!doc?.target_department) {
      setRowMessages(prev => ({
        ...prev,
        [doc.id]: { type: 'error', text: 'Target department is required to send' }
      }));
      return;
    }

    try {
      setActionInProgress(prev => ({ ...prev, [doc.id]: 'send' }));
      const response = await api.post(`/api/documents/${doc.id}/send/`, {});
      setDocuments(docs =>
        docs.map(item => item.id === doc.id ? { ...item, status: 'SENT', sent_at: response.data?.sent_at } : item)
      );
      setRowMessages(prev => ({
        ...prev,
        [doc.id]: { type: 'success', text: 'Document sent successfully' }
      }));
      setTimeout(() => setRowMessages(prev => ({ ...prev, [doc.id]: null })), 3000);
    } catch (err) {
      setRowMessages(prev => ({
        ...prev,
        [doc.id]: { type: 'error', text: err.response?.data?.detail || err.response?.data?.error || 'Failed to send' }
      }));
    } finally {
      setActionInProgress(prev => ({ ...prev, [doc.id]: null }));
    }
  };

  const handleComment = async (docId) => {
    const comment = commentInputs[docId] || '';
    if (!comment.trim()) {
      setRowMessages(prev => ({
        ...prev,
        [docId]: { type: 'error', text: 'Comment cannot be empty' }
      }));
      return;
    }

    try {
      setActionInProgress(prev => ({ ...prev, [docId]: 'comment' }));
      await api.post(`/api/documents/${docId}/comment/`, { comment });
      await fetchComments(docId);
      setRowMessages(prev => ({
        ...prev,
        [docId]: { type: 'success', text: 'Comment added' }
      }));
      setCommentInputs(prev => ({ ...prev, [docId]: '' }));
      setExpandedComments(prev => ({ ...prev, [docId]: false }));
      setTimeout(() => setRowMessages(prev => ({ ...prev, [docId]: null })), 3000);
    } catch (err) {
      setRowMessages(prev => ({
        ...prev,
        [docId]: { type: 'error', text: err.response?.data?.detail || err.response?.data?.error || 'Failed to add comment' }
      }));
    } finally {
      setActionInProgress(prev => ({ ...prev, [docId]: null }));
    }
  };

  const fetchComments = async (docId) => {
    try {
      setCommentsLoading(prev => ({ ...prev, [docId]: true }));
      const response = await api.get(`/api/documents/${docId}/comments/`);
      setCommentsByDoc(prev => ({ ...prev, [docId]: response.data || [] }));
    } catch (err) {
      setCommentsByDoc(prev => ({ ...prev, [docId]: [] }));
    } finally {
      setCommentsLoading(prev => ({ ...prev, [docId]: false }));
    }
  };

  const toggleComments = (docId) => {
    setExpandedComments(prev => {
      const next = !prev[docId];
      if (next && commentsByDoc[docId] === undefined) {
        fetchComments(docId);
      }
      return { ...prev, [docId]: next };
    });
  };

  const handleValidate = async (docId) => {
    try {
      setActionInProgress(prev => ({ ...prev, [docId]: 'validate' }));
      await api.post(`/api/documents/${docId}/validate/`, {});
      setDocuments(docs =>
        docs.map(doc => doc.id === docId ? { ...doc, status: 'VALIDATED' } : doc)
      );
      setRowMessages(prev => ({
        ...prev,
        [docId]: { type: 'success', text: 'Document validated' }
      }));
      setTimeout(() => setRowMessages(prev => ({ ...prev, [docId]: null })), 3000);
    } catch (err) {
      setRowMessages(prev => ({
        ...prev,
        [docId]: { type: 'error', text: err.response?.data?.error || 'Failed to validate' }
      }));
    } finally {
      setActionInProgress(prev => ({ ...prev, [docId]: null }));
    }
  };

  const handleArchive = async (docId) => {
    try {
      setActionInProgress(prev => ({ ...prev, [docId]: 'archive' }));
      await api.post(`/api/documents/${docId}/archive/`, {});
      setDocuments(docs =>
        docs.map(doc => doc.id === docId ? { ...doc, status: 'ARCHIVED' } : doc)
      );
      setRowMessages(prev => ({
        ...prev,
        [docId]: { type: 'success', text: 'Document archived' }
      }));
      setTimeout(() => setRowMessages(prev => ({ ...prev, [docId]: null })), 3000);
    } catch (err) {
      setRowMessages(prev => ({
        ...prev,
        [docId]: { type: 'error', text: err.response?.data?.error || 'Failed to archive' }
      }));
    } finally {
      setActionInProgress(prev => ({ ...prev, [docId]: null }));
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      DRAFT: { bg: '#f5f5f5', text: '#666', label: 'Draft' },
      SENT: { bg: '#fff3cd', text: '#856404', label: 'Sent' },
      VALIDATED: { bg: '#d4edda', text: '#155724', label: 'Validated' },
      ARCHIVED: { bg: '#e2e3e5', text: '#383d41', label: 'Archived' }
    };
    return colors[status] || colors.DRAFT;
  };

  const formatDate = (value) => {
    if (!value) return '-';
    return new Date(value).toLocaleDateString();
  };

  const styles = {
    container: {
      maxWidth: '1200px',
      margin: '0 auto',
      padding: '20px',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    },
    header: {
      marginBottom: '30px'
    },
    title: {
      fontSize: '28px',
      fontWeight: 'bold',
      color: '#333',
      margin: '0 0 10px 0'
    },
    subtitle: {
      fontSize: '14px',
      color: '#666'
    },
    section: {
      backgroundColor: 'white',
      border: '1px solid #ddd',
      borderRadius: '6px',
      padding: '20px',
      marginBottom: '20px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
    },
    sectionTitle: {
      fontSize: '18px',
      fontWeight: 'bold',
      color: '#333',
      margin: '0 0 15px 0'
    },
    alertBanner: {
      padding: '12px 16px',
      borderRadius: '4px',
      marginBottom: '15px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    },
    errorBanner: {
      backgroundColor: '#ffe6e6',
      color: '#c33',
      border: '1px solid #f5a9a9'
    },
    successBanner: {
      backgroundColor: '#e6f7e6',
      color: '#065706',
      border: '1px solid #a9d8a9'
    },
    closeButton: {
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      fontSize: '18px',
      color: 'inherit',
      padding: '0'
    },
    form: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '15px'
    },
    formGroup: {
      display: 'flex',
      flexDirection: 'column'
    },
    label: {
      fontSize: '13px',
      fontWeight: '600',
      color: '#333',
      marginBottom: '6px'
    },
    input: {
      padding: '8px 12px',
      fontSize: '13px',
      border: '1px solid #ddd',
      borderRadius: '4px',
      fontFamily: 'inherit'
    },
    select: {
      padding: '8px 12px',
      fontSize: '13px',
      border: '1px solid #ddd',
      borderRadius: '4px',
      fontFamily: 'inherit'
    },
    fileInput: {
      padding: '6px',
      fontSize: '13px',
      border: '1px solid #ddd',
      borderRadius: '4px'
    },
    buttonGroup: {
      display: 'flex',
      gap: '8px',
      marginTop: '15px',
      gridColumn: '1 / -1'
    },
    submitButton: {
      backgroundColor: '#007bff',
      color: 'white',
      border: 'none',
      padding: '10px 16px',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: '13px',
      fontWeight: 'bold'
    },
    submitButtonDisabled: {
      backgroundColor: '#ccc',
      cursor: 'not-allowed'
    },
    resetButton: {
      backgroundColor: '#6c757d',
      color: 'white',
      border: 'none',
      padding: '10px 16px',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: '13px'
    },
    tableWrapper: {
      overflowX: 'auto'
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse'
    },
    tableHeader: {
      backgroundColor: '#f5f5f5',
      borderBottom: '2px solid #ddd'
    },
    tableHeaderCell: {
      padding: '12px',
      textAlign: 'left',
      fontSize: '12px',
      fontWeight: 'bold',
      color: '#333'
    },
    tableRow: {
      borderBottom: '1px solid #ddd'
    },
    tableCell: {
      padding: '12px',
      fontSize: '12px',
      color: '#666',
      verticalAlign: 'top'
    },
    statusBadge: {
      display: 'inline-block',
      padding: '4px 8px',
      borderRadius: '3px',
      fontSize: '11px',
      fontWeight: 'bold'
    },
    button: {
      padding: '6px 10px',
      fontSize: '11px',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      fontWeight: 'bold',
      whiteSpace: 'nowrap',
      marginRight: '4px'
    },
    sendButton: {
      backgroundColor: '#17a2b8',
      color: 'white'
    },
    validateButton: {
      backgroundColor: '#28a745',
      color: 'white'
    },
    archiveButton: {
      backgroundColor: '#6c757d',
      color: 'white'
    },
    buttonDisabled: {
      backgroundColor: '#ccc',
      cursor: 'not-allowed'
    },
    commentButton: {
      backgroundColor: '#ffc107',
      color: '#333'
    },
    expandedRow: {
      display: 'grid',
      gridTemplateColumns: '1fr 120px',
      gap: '8px',
      padding: '8px 0',
      paddingRight: '12px'
    },
    commentInput: {
      padding: '6px 8px',
      fontSize: '12px',
      border: '1px solid #ddd',
      borderRadius: '4px',
      fontFamily: 'inherit'
    },
    commentsList: {
      marginBottom: '8px'
    },
    commentItem: {
      padding: '6px 8px',
      backgroundColor: '#f8f9fa',
      border: '1px solid #eee',
      borderRadius: '4px',
      marginBottom: '6px'
    },
    commentMeta: {
      fontSize: '11px',
      color: '#666',
      marginBottom: '4px'
    },
    commentBody: {
      fontSize: '12px',
      color: '#333'
    },
    commentEmpty: {
      fontSize: '12px',
      color: '#888',
      marginBottom: '6px'
    },
    rowMessage: {
      fontSize: '11px',
      marginTop: '6px',
      padding: '4px 6px',
      borderRadius: '3px',
      display: 'block'
    },
    rowMessageSuccess: {
      backgroundColor: '#e6f7e6',
      color: '#065706',
      border: '1px solid #a9d8a9'
    },
    rowMessageError: {
      backgroundColor: '#ffe6e6',
      color: '#c33',
      border: '1px solid #f5a9a9'
    },
    loadingMessage: {
      textAlign: 'center',
      padding: '40px 20px',
      color: '#666'
    },
    emptyMessage: {
      textAlign: 'center',
      padding: '40px 20px',
      color: '#999',
      fontSize: '14px',
      backgroundColor: '#f9f9f9',
      borderRadius: '4px'
    }
  };

  if (loading) {
    return <div style={styles.container}><div style={styles.loadingMessage}>Loading documents...</div></div>;
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Documents</h1>
        <p style={styles.subtitle}>Upload, manage, and track document workflows</p>
      </div>

      {/* Upload Section */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Upload Document</h2>

        {uploadError && (
          <div style={{...styles.alertBanner, ...styles.errorBanner}}>
            <span>{uploadError}</span>
            <button style={styles.closeButton} onClick={() => setUploadError(null)}>×</button>
          </div>
        )}

        {uploadSuccess && (
          <div style={{...styles.alertBanner, ...styles.successBanner}}>
            <span>{uploadSuccess}</span>
            <button style={styles.closeButton} onClick={() => setUploadSuccess(null)}>×</button>
          </div>
        )}

        <form style={styles.form} onSubmit={handleUpload}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Title *</label>
            <input
              style={styles.input}
              type="text"
              name="title"
              value={formData.title}
              onChange={handleFormChange}
              placeholder="Document title"
              required
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Type *</label>
            <input
              style={styles.input}
              type="text"
              name="type"
              value={formData.type}
              onChange={handleFormChange}
              placeholder="e.g., Contract, Invoice, Report"
              required
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Category</label>
            <select
              style={styles.select}
              name="category"
              value={formData.category}
              onChange={handleFormChange}
            >
              <option value="INTERNAL">Internal</option>
              <option value="RH">RH</option>
              <option value="FINANCE">Finance</option>
            </select>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Source Department</label>
            <select
              style={styles.select}
              name="source_department"
              value={formData.source_department}
              onChange={handleFormChange}
            >
              <option value="">Optional</option>
              {departments.map(dept => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Target Department {isChef ? '*' : ''}</label>
            <select
              style={styles.select}
              name="target_department"
              value={formData.target_department}
              onChange={handleFormChange}
            >
              <option value="">Optional</option>
              {departments.map(dept => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>File *</label>
            <input
              style={styles.fileInput}
              type="file"
              name="file"
              onChange={handleFormChange}
              required
            />
          </div>

          <div style={styles.buttonGroup}>
            <button
              style={{...styles.submitButton, ...(uploading ? styles.submitButtonDisabled : {})}}
              type="submit"
              disabled={uploading}
            >
              {uploading ? 'Uploading...' : 'Upload Document'}
            </button>
            <button
              style={styles.resetButton}
              type="reset"
              onClick={() => {
                setFormData({
                  title: '',
                  type: '',
                  category: 'INTERNAL',
                  source_department: '',
                  target_department: '',
                  file: null
                });
              }}
            >
              Clear
            </button>
          </div>
        </form>
      </div>

      {/* Documents List Section */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>{isEmployee ? 'Documents Feed' : 'My Documents'}</h2>

        {error && (
          <div style={{...styles.alertBanner, ...styles.errorBanner}}>
            <span>{error}</span>
            <button style={styles.closeButton} onClick={() => setError(null)}>×</button>
          </div>
        )}

        {documents.length === 0 ? (
          <div style={styles.emptyMessage}>No documents yet. Upload one to get started!</div>
        ) : (
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead style={styles.tableHeader}>
                <tr>
                  <th style={styles.tableHeaderCell}>Title</th>
                  <th style={styles.tableHeaderCell}>Type</th>
                  <th style={styles.tableHeaderCell}>Category</th>
                  {!isEmployee && <th style={styles.tableHeaderCell}>Status</th>}
                  {!isEmployee && <th style={styles.tableHeaderCell}>Source</th>}
                  {!isEmployee && <th style={styles.tableHeaderCell}>Target</th>}
                  {isEmployee && <th style={styles.tableHeaderCell}>Uploaded By</th>}
                  {isEmployee && <th style={styles.tableHeaderCell}>Sent At</th>}
                  {!isEmployee && <th style={styles.tableHeaderCell}>Created</th>}
                  <th style={styles.tableHeaderCell}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {documents.map(doc => {
                  const statusInfo = getStatusColor(doc.status);
                  const canSend = doc.status === 'DRAFT' && !!doc.target_department;
                  const canValidate = isRHSeniorOrGRH && doc.status === 'SENT';
                  const canArchive = isRHSeniorOrGRH && doc.status === 'VALIDATED';
                  const isBusy = Boolean(actionInProgress[doc.id]);

                  return (
                    <tr key={doc.id} style={styles.tableRow}>
                      <td style={styles.tableCell}><strong>{doc.title}</strong></td>
                      <td style={styles.tableCell}>{doc.doc_type}</td>
                      <td style={styles.tableCell}>{doc.doc_type_category || '-'}</td>
                      {!isEmployee && (
                        <td style={styles.tableCell}>
                          <span style={{...styles.statusBadge, backgroundColor: statusInfo.bg, color: statusInfo.text}}>
                            {statusInfo.label}
                          </span>
                        </td>
                      )}
                      {!isEmployee && <td style={styles.tableCell}>{doc.source_department || '-'}</td>}
                      {!isEmployee && <td style={styles.tableCell}>{doc.target_department || '-'}</td>}
                      {isEmployee && <td style={styles.tableCell}>{doc.created_by_name || doc.created_by || '-'}</td>}
                      {isEmployee && <td style={styles.tableCell}>{formatDate(doc.sent_at)}</td>}
                      {!isEmployee && <td style={styles.tableCell}>{formatDate(doc.created_at)}</td>}
                      <td style={styles.tableCell}>
                        <div>
                          {doc.file_url && (
                            <a
                              href={doc.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{...styles.button, ...styles.sendButton, textDecoration: 'none'}}
                            >
                              View
                            </a>
                          )}
                          {canSend && (
                            <button
                              style={{...styles.button, ...styles.sendButton, ...(isBusy ? styles.buttonDisabled : {})}}
                              onClick={() => handleSend(doc)}
                              disabled={isBusy}
                              title="Send document"
                            >
                              {actionInProgress[doc.id] === 'send' ? '...' : 'Send'}
                            </button>
                          )}
                          {canValidate && (
                            <button
                              style={{...styles.button, ...styles.validateButton, ...(isBusy ? styles.buttonDisabled : {})}}
                              onClick={() => handleValidate(doc.id)}
                              disabled={isBusy}
                              title="Validate document"
                            >
                              {actionInProgress[doc.id] === 'validate' ? '...' : 'Validate'}
                            </button>
                          )}
                          {canArchive && (
                            <button
                              style={{...styles.button, ...styles.archiveButton, ...(isBusy ? styles.buttonDisabled : {})}}
                              onClick={() => handleArchive(doc.id)}
                              disabled={isBusy}
                              title="Archive document"
                            >
                              {actionInProgress[doc.id] === 'archive' ? '...' : 'Archive'}
                            </button>
                          )}
                          <button
                            style={{...styles.button, ...styles.commentButton}}
                            onClick={() => toggleComments(doc.id)}
                            title="Add comment"
                          >
                            💬
                          </button>
                        </div>

                        {expandedComments[doc.id] && (
                          <div>
                            <div style={styles.commentsList}>
                              {commentsLoading[doc.id] && (
                                <div style={styles.commentEmpty}>Loading comments...</div>
                              )}
                              {!commentsLoading[doc.id] && (commentsByDoc[doc.id] || []).length === 0 && (
                                <div style={styles.commentEmpty}>No comments yet.</div>
                              )}
                              {!commentsLoading[doc.id] && (commentsByDoc[doc.id] || []).map(comment => (
                                <div key={comment.id} style={styles.commentItem}>
                                  <div style={styles.commentMeta}>
                                    {comment.by_user_name || comment.by_user || 'Unknown'} · {formatDate(comment.created_at)}
                                  </div>
                                  <div style={styles.commentBody}>{comment.note}</div>
                                </div>
                              ))}
                            </div>
                            <div style={styles.expandedRow}>
                              <textarea
                                style={styles.commentInput}
                                placeholder="Add a comment..."
                                value={commentInputs[doc.id] || ''}
                                onChange={(e) => setCommentInputs(prev => ({ ...prev, [doc.id]: e.target.value }))}
                              />
                              <button
                                style={{...styles.button, ...styles.commentButton, ...(isBusy ? styles.buttonDisabled : {})}}
                                onClick={() => handleComment(doc.id)}
                                disabled={isBusy}
                              >
                                {actionInProgress[doc.id] === 'comment' ? '...' : 'Post'}
                              </button>
                            </div>
                          </div>
                        )}

                        {rowMessages[doc.id] && (
                          <span style={{...styles.rowMessage, ...(rowMessages[doc.id].type === 'success' ? styles.rowMessageSuccess : styles.rowMessageError)}}>
                            {rowMessages[doc.id].text}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {documents.length > 0 && (
          <div style={{ marginTop: '15px', fontSize: '12px', color: '#999' }}>
            Total documents: {documents.length}
          </div>
        )}
      </div>
    </div>
  );
}
