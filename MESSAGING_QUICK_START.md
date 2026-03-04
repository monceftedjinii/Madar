# Module 10: Quick Start Guide for Frontend Integration

## 🚀 Get Started in 5 Minutes

### Prerequisites
- Authentication token from `/api/auth/token/`
- User must exist in database with role (EMPLOYEE, CHEF, RH_SIMPLE, RH_SENIOR, or GRH)

---

## 💬 Basic Message Operations

### 1. Get User's Inbox
```javascript
const fetchInbox = async (token, page = 1) => {
  const response = await fetch(`/api/messages/inbox/?page=${page}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return response.json();
};

// Usage
const inbox = await fetchInbox(token);
console.log(inbox.messages); // [{id, sender, subject, is_read, ...}]
```

### 2. Get a Single Message (auto-marks as read)
```javascript
const fetchMessage = async (token, messageId) => {
  const response = await fetch(`/api/messages/${messageId}/`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return response.json();
};
```

### 3. Send a Message (with optional file)
```javascript
const sendMessage = async (token, recipientId, subject, body, file = null) => {
  const formData = new FormData();
  formData.append('recipient_id', recipientId);
  formData.append('subject', subject);
  formData.append('body', body);
  if (file) {
    formData.append('attachments', file);
  }
  
  const response = await fetch('/api/messages/send/', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: formData
  });
  
  if (response.status === 403) {
    // User has blocked sender
    const data = await response.json();
    console.error('Cannot send:', data.detail);
  }
  
  return response.json();
};

// Usage
const result = await sendMessage(token, 2, 'Meeting', 'Let`s meet...', fileInput.files[0]);
console.log(result.id); // Message ID
```

### 4. Reply to a Message
```javascript
const replyToMessage = async (token, messageId, body) => {
  const response = await fetch(`/api/messages/${messageId}/reply/`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ body })
  });
  return response.json();
};
```

### 5. Forward a Message
```javascript
const forwardMessage = async (token, messageId, recipientId) => {
  const response = await fetch(`/api/messages/${messageId}/forward/`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ recipient_id: recipientId })
  });
  return response.json();
};
```

### 6. Mark Message as Read/Unread
```javascript
const toggleMessageRead = async (token, messageId, isRead) => {
  const response = await fetch(`/api/messages/${messageId}/read-status/`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ is_read: isRead })
  });
  return response.json();
};
```

---

## 📁 Draft Management

### Save a Draft
```javascript
const saveDraft = async (token, recipientId, subject, body, draftId = null) => {
  const response = await fetch('/api/messages/save-draft/', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      id: draftId,  // null for create, id for update
      recipient_id: recipientId,
      subject,
      body
    })
  });
  return response.json();
};
```

### Get All Drafts
```javascript
const fetchDrafts = async (token) => {
  const response = await fetch('/api/messages/drafts/', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return response.json();
};
```

### Delete a Draft
```javascript
const deleteDraft = async (token, draftId) => {
  const response = await fetch(`/api/messages/drafts/${draftId}/delete/`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return response.json();
};
```

---

## 🔍 Search & Filter

### Search Messages
```javascript
const searchMessages = async (token, query) => {
  const response = await fetch(`/api/messages/search/?q=${encodeURIComponent(query)}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return response.json();
};

// Usage: search for "meeting" returns matching messages
const results = await searchMessages(token, 'meeting');
console.log(results.results); // [{messages matching query}]
```

### Get Sent Messages
```javascript
const fetchSent = async (token, page = 1) => {
  const response = await fetch(`/api/messages/sent/?page=${page}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return response.json();
};
```

---

## 🚫 Blocking Users

### Block a User
```javascript
const blockUser = async (token, userId) => {
  const response = await fetch(`/api/users/${userId}/block/`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return response.json();
};
```

### Unblock a User
```javascript
const unblockUser = async (token, userId) => {
  const response = await fetch(`/api/users/${userId}/unblock/`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return response.json();
};
```

### Get Blocked Users List
```javascript
const fetchBlockedUsers = async (token) => {
  const response = await fetch('/api/users/blocked/', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return response.json();
};

// Usage
const { blocked_users } = await fetchBlockedUsers(token);
// [{id, email, name}, ...]
```

---

## 🚨 Report Messages

### Report a Message
```javascript
const reportMessage = async (token, messageId, reason, description = '') => {
  const response = await fetch(`/api/messages/${messageId}/report/`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      reason,  // e.g. "Harassment", "Spam", "Inappropriate"
      description  // Optional detailed explanation
    })
  });
  return response.json();
};

// Usage
const report = await reportMessage(token, 123, 'Harassment', 'Contains insulting language');
console.log(report.id); // Report ID
```

---

## 📢 Announcements (Read for All Users)

### Get All Announcements (User-scoped)
```javascript
const fetchAnnouncements = async (token) => {
  const response = await fetch('/api/announcements/', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return response.json();
};

// Returns:
// - All GLOBAL announcements
// - DEPARTMENT announcements for user's department only
```

---

## 🛠️ Admin-Only Operations

### Get Message Reports (Admin Only)
```javascript
const fetchReports = async (token, unresolvedOnly = true) => {
  const response = await fetch(
    `/api/admin/message-reports/?unresolved=${unresolvedOnly}`,
    { headers: { 'Authorization': `Bearer ${token}` } }
  );
  return response.json();
};

// Response: {reports: [{id, message, reporter, reason, is_resolved, ...}]}
```

### Resolve a Report (Admin Only)
```javascript
const resolveReport = async (token, reportId, options) => {
  const response = await fetch(`/api/admin/message-reports/${reportId}/resolve/`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      resolution_note: options.note || '',
      hide_message: options.hideMessage || false,
      block_sender: options.blockSender || false
    })
  });
  return response.json();
};

// Usage
await resolveReport(token, 100, {
  note: 'Message removed, sender warned',
  hideMessage: true,
  blockSender: true
});
```

### Create Announcement (Admin Only)
```javascript
const createAnnouncement = async (token, title, message, scope = 'GLOBAL', departmentId = null) => {
  const response = await fetch('/api/announcements/create/', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      title,
      message,
      scope,  // 'GLOBAL' or 'DEPARTMENT'
      target_department_id: departmentId  // Required if scope='DEPARTMENT'
    })
  });
  return response.json();
};

// Usage
await createAnnouncement(token, 'System Update', 'Maintenance tomorrow 2-4 PM', 'GLOBAL');
```

### Get/Update Messaging Settings (Admin Only)
```javascript
const fetchMessagingSettings = async (token) => {
  const response = await fetch('/api/admin/messaging-settings/', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return response.json();
};

// Response: {
//   max_attachment_size_mb: 10,
//   allowed_file_extensions: 'pdf,txt,doc,...',
//   blocking_enabled: true,
//   announcements_global_default: true
// }

const updateMessagingSettings = async (token, settings) => {
  const response = await fetch('/api/admin/messaging-settings/update/', {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(settings)
  });
  return response.json();
};

// Usage: increase max attachment size to 25MB
await updateMessagingSettings(token, {
  max_attachment_size_mb: 25
});
```

---

## 🎨 Component Ideas for React

### Inbox Component
```jsx
function InboxComponent({ token }) {
  const [messages, setMessages] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetchInbox(token).then(data => {
      setMessages(data.messages);
      setUnreadCount(data.messages.filter(m => !m.is_read).length);
    });
  }, [token]);

  return (
    <div>
      <h2>Inbox ({unreadCount} unread)</h2>
      {messages.map(msg => (
        <div key={msg.id} className={msg.is_read ? '' : 'unread'}>
          <strong>{msg.sender.name}</strong>
          <p>{msg.subject}</p>
          <small>{new Date(msg.created_at).toLocaleString()}</small>
          <button onClick={() => openMessage(msg.id)}>Open</button>
        </div>
      ))}
    </div>
  );
}
```

### Compose Modal
```jsx
function ComposeModal({ token, onClose }) {
  const [recipientId, setRecipientId] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');

  const handleSend = async () => {
    try {
      const result = await sendMessage(token, recipientId, subject, body, file);
      if (result.success) {
        alert('Message sent!');
        onClose();
      }
    } catch (err) {
      setError(err.message || 'Error sending message');
    }
  };

  return (
    <dialog>
      <h3>New Message</h3>
      {error && <p className="error">{error}</p>}
      <input placeholder="Recipient" onChange={e => setRecipientId(e.target.value)} />
      <input placeholder="Subject" value={subject} onChange={e => setSubject(e.target.value)} />
      <textarea placeholder="Message" value={body} onChange={e => setBody(e.target.value)} />
      <input type="file" onChange={e => setFile(e.target.files[0])} />
      <button onClick={handleSend}>Send</button>
      <button onClick={onClose}>Cancel</button>
    </dialog>
  );
}
```

### Admin Report Dashboard
```jsx
function AdminReports({ token }) {
  const [reports, setReports] = useState([]);

  useEffect(() => {
    fetchReports(token, true).then(data => setReports(data.reports));
  }, [token]);

  const handleResolve = async (reportId) => {
    await resolveReport(token, reportId, {
      note: 'Removed',
      hideMessage: true,
      blockSender: false
    });
    // Refresh reports
    fetchReports(token, true).then(data => setReports(data.reports));
  };

  return (
    <div>
      <h2>Reports ({reports.length})</h2>
      {reports.map(report => (
        <div key={report.id} className="report">
          <p><strong>From:</strong> {report.reporter.name}</p>
          <p><strong>Reason:</strong> {report.reason}</p>
          <p><strong>Message:</strong> "{report.message.subject}"</p>
          <button onClick={() => handleResolve(report.id)}>Resolve</button>
        </div>
      ))}
    </div>
  );
}
```

---

## ⚠️ Error Handling

### Common Error Cases

**User is blocked:**
```javascript
if (response.status === 403) {
  const data = await response.json();
  console.error('Cannot send:', data.detail);
  // "This user has blocked you. You cannot send them messages."
}
```

**Invalid recipient:**
```javascript
if (response.status === 400) {
  const data = await response.json();
  console.error('Invalid recipient:', data.detail);
}
```

**File too large:**
```javascript
const result = await sendMessage(token, recipientId, subject, body, largeFile);
if (result.attachment_errors) {
  console.warn('Some files failed:', result.attachment_errors);
  // ["file.pdf: exceeds max size of 10MB"]
}
```

---

## 🔐 Security Reminders

1. **Always include Authorization header** with JWT token
2. **Validate on frontend** before sending large files (network efficiency)
3. **Show clear error messages** from API responses to users
4. **Honor blocking status** - check `/api/users/blocked/` before showing compose form
5. **Pagination** - always use page parameter for listings to avoid huge data dumps
6. **User ownership** - make sure users can only access their own messages/drafts

---

## 📊 Data Flow Example

```
User opens Compose Modal
    ↓
Select recipient from list (should check blocked_users first)
    ↓
Type subject + body
    ↓
Select file (optional, validated on backend)
    ↓
Click Send
    ↓
POST /api/messages/send/ with multipart form data
    ↓
Backend validates:
  - recipient exists ✓
  - recipient didn't block sender ✓ (or return 403)
  - file size OK ✓
  - file extension OK ✓
    ↓
Message created in database
    ↓
Return message ID + success:true
    ↓
Frontend shows confirmation
    ↓
Recipient sees new message in inbox
```

---

## 🎯 Implementation Checklist

- [ ] Inbox view showing all received messages
- [ ] Click message to view full content (auto-mark read)
- [ ] Compose modal with recipient selection
- [ ] Send message with subject/body
- [ ] File upload with validation feedback
- [ ] Reply/Forward buttons on messages
- [ ] Search functionality  
- [ ] Draft saving
- [ ] Block user feature
- [ ] Report message feature
- [ ] Admin report dashboard
- [ ] Admin announcements create/manage
- [ ] Admin settings panel
- [ ] Error messages for blocked users
- [ ] Pagination for inbox/sent

---

## 📞 Quick Reference

| Operation | Endpoint | Method | Auth Required |
|-----------|----------|--------|----------------|
| Get inbox | `/api/messages/inbox/` | GET | Yes |
| Send message | `/api/messages/send/` | POST | Yes |
| Reply | `/api/messages/{id}/reply/` | POST | Yes |
| Block user | `/api/users/{id}/block/` | POST | Yes |
| Get reports | `/api/admin/message-reports/` | GET | Yes (Admin) |
| Resolve report | `/api/admin/message-reports/{id}/resolve/` | PATCH | Yes (Admin) |
| Create announcement | `/api/announcements/create/` | POST | Yes (Admin) |

---

**Ready to build the UI! 🚀**
