# Messaging Module - Navigation & Component Structure for Frontend

This guide shows how the messaging module should appear in your React navigation and what pages/components your friend should build.

---

## 📱 Expected Navigation Structure

```
Navigation Bar / Sidebar
├── Dashboard
├── Tasks
├── Leaves
├── Documents
├── Messages  ⭐ NEW
│   ├── Inbox (with unread count badge)
│   ├── Sent
│   ├── Drafts
│   └── [Compose Button]
├── Admin (for GRH/RH users)
│   ├── Reports
│   ├── Announcements
│   ├── Settings
│   │   └── Messaging Settings
└── User Menu
```

---

## 💌 Messages Section Layout

### Main Messages Page (Sidebar + List View Pattern)

```
┌─────────────────────────────────────────────────────────┐
│ Logo          Navigation Menu          User Profile      │
└─────────────────────────────────────────────────────────┘
┌─────────────┬───────────────────────────────────────────┐
│   MESSAGES  │ Inbox (42) - Unread: 5                    │
│             │                                            │
│ 📥 Inbox    │ ┌─────────────────────────────────────┐  │
│   (42)      │ │ John Doe   [•••]                    │  │
│   ●●●●●     │ │ Meeting tomorrow at 2pm             │  │
│             │ │ 10:30 AM                            │  │
│ 📤 Sent     │ ├─────────────────────────────────────┤  │
│   (28)      │ │ Jane Smith [•••]                    │  │
│             │ │ Re: Project Status                  │  │
│ 📝 Drafts   │ │ 9:45 AM                             │  │
│   (3)       │ ├─────────────────────────────────────┤  │
│             │ │ Admin RH   [•••]                    │  │
│ [+ Compose] │ │ System Maintenance Notice           │  │
│             │ │ 9:00 AM                             │  │
│             │ └─────────────────────────────────────┘  │
│ ─────────── │                                            │
│             │ [Page 1] [2] [3] [Next]                   │
│ 🚫 Blocked  │                                            │
│ Users (2)   │                                            │
│             │                                            │
└─────────────┴───────────────────────────────────────────┘
```

### Message Detail View (When Clicking a Message)

```
┌─────────────────────────────────────────────────────────┐
│ < Back    |  [Mark Unread]  [Report]  [Delete]  [...]   │
├─────────────────────────────────────────────────────────┤
│ From: John Doe <john@example.com>                       │
│ To: You                                                  │
│ Subject: Meeting tomorrow at 2pm                        │
│ Date: March 3, 2026 10:30 AM                            │
├─────────────────────────────────────────────────────────┤
│ Hi there,                                               │
│                                                          │
│ I wanted to discuss the project proposal tomorrow.      │
│ Can you meet at 2pm in Conference Room B?              │
│                                                          │
│ Thanks!                                                  │
│ John                                                     │
├─────────────────────────────────────────────────────────┤
│ Attachments:                                            │
│ 📄 proposal.pdf (2.3 MB)  [Download]                   │
├─────────────────────────────────────────────────────────┤
│ [Reply] [Reply All] [Forward]                          │
├─────────────────────────────────────────────────────────┤
│ Replies (2):                                            │
│                                                          │
│ John Doe - 11:45 AM                                    │
│ "Actually, 3pm works better for me"                    │
│                                                          │
│ You - 12:00 PM                                         │
│ "3pm is perfect!"                                       │
└─────────────────────────────────────────────────────────┘
```

### Compose Modal (No page reload)

```
┌────────── NEW MESSAGE ──────────┐
│ [X] Close                       │
├─────────────────────────────────┤
│ To: [____________________v]      │
│    (dropdown of users)           │
│                                  │
│ Subject: [________________]      │
│                                  │
│ Body:                            │
│ ┌──────────────────────────────┐ │
│ │                              │ │
│ │                              │ │
│ │                              │ │
│ └──────────────────────────────┘ │
│                                  │
│ Attachments:                     │
│ [+ Add File]  (Max 10MB)         │
│                                  │
│ [Save Draft] [Send] [Cancel]     │
└─────────────────────────────────┘
```

---

## 🗂️ React Components to Build

### Page Components

1. **MessagesPage.jsx** (Main container)
   - Sidebar navigation (Inbox, Sent, Drafts, Blocked Users)
   - Message list view
   - Compose button

2. **InboxView.jsx**
   - Fetches `/api/messages/inbox/`
   - Shows list with pagination
   - Unread count badge
   - Click to view message detail
   - Bulk actions (mark read, delete)

3. **SentView.jsx**
   - Fetches `/api/messages/sent/`
   - Similar to inbox but for sent messages

4. **DraftsView.jsx**
   - Fetches `/api/messages/drafts/`
   - Edit or delete drafts
   - Continue editing button

5. **MessageDetail.jsx** (Modal or route)
   - Shows full message content
   - Sender/recipient/date info
   - Attachments with download links
   - Buttons: Reply, Forward, Report, Delete
   - Shows reply thread
   - Auto-marks as read

6. **ComposeModal.jsx**
   - Recipient selector (dropdown)
   - Subject input
   - Body textarea
   - File upload
   - Draft saving
   - Send/Cancel buttons
   - Error messages for blocked users

7. **ReplyModal.jsx**
   - Auto-fills "To:" with original sender
   - Auto-fills "Subject:" with "Re: {original_subject}"
   - Quotes original message
   - File upload for new attachments

8. **ForwardModal.jsx**
   - New recipient selector
   - Keeps original message in quote
   - Auto-fills subject with "Fwd: {original}"

9. **BlockedUsersList.jsx**
   - Shows blocked users
   - Unblock button for each
   - Fetches `/api/users/blocked/`

10. **SearchMessages.jsx**
    - Search input (min 2 chars)
    - Results list
    - Fetches `/api/messages/search/?q={query}`

### Admin Components

11. **AdminMessagingDashboard.jsx** (Admin only)
    - Tab view: Reports | Announcements | Settings

12. **AdminReportsView.jsx**
    - List of unresolved reports
    - Filters: Unresolved/All
    - Click report to view → shows original message
    - Resolve button → modal with options
    - Can hide message, block sender
    - Fetches `/api/admin/message-reports/`

13. **AdminAnnouncementsView.jsx**
    - List of announcements
    - Create button → modal
    - Scope selector (Global/Department)
    - Department picker if scope=Department
    - Fetches `/api/announcements/`

14. **AdminSettingsView.jsx**
    - Form with current settings
    - Max attachment size (MB)
    - Allowed file extensions (comma-separated)
    - Checkboxes: Blocking enabled, Announcements global
    - Save button
    - Fetches `/api/admin/messaging-settings/`

---

## 📊 Data Flow Example: Sending a Message

```
User clicks [+ Compose]
    ↓
ComposeModal opens
    ↓
User selects recipient from dropdown
    (Frontend can call /api/employees/ to populate list)
    ↓
User types subject + body
    ↓
User adds file (optional)
    (Frontend validates size client-side before upload)
    ↓
User clicks [Send]
    ↓
Frontend calls POST /api/messages/send/ (multipart)
    ↓
Backend validates:
  - Recipient exists ✓
  - Recipient didn't block sender ✓
  - File size/type OK ✓
    ↓
If error: Backend returns 403 or 400
    ↓
Frontend shows error: "User has blocked you" or "File too large"
    ↓
If success: Backend returns {id, success: true}
    ↓
Frontend closes modal
    ↓
Frontend refreshes Sent view
    ↓
User sees new message in Sent folder
    ↓
Recipient gets:
  - New message in their Inbox
  - Notification badge (unread count +1)
```

---

## 🎨 UI Components Needed

- **Message List Item**
  - Sender name (bold if unread)
  - Subject (bold if unread, with "Re:" or "Fwd:" prefix)
  - Preview of first line of body
  - Date/time
  - Unread indicator (dot or color)
  - Action menu (...)

- **Message Thread View**
  - Show original message
  - Show all replies chronologically
  - Quote styling for forwards

- **User Selector Dropdown**
  - Search/filter by name or email
  - Show department if available
  - Highlight if user is blocked (red or disabled)

- **File Upload Zone**
  - Drag & drop support
  - Shows selected files
  - File size validation
  - Error messages
  - Delete file button

- **Unread Badge**
  - Shows count (e.g., "Inbox (5)")
  - Red background
  - Only on unread messages

- **Buttons with Icons**
  - 📥 Inbox
  - 📤 Sent
  - 📝 Drafts
  - ➕ Compose
  - 🔙 Reply
  - ↩️ Forward
  - 🚫 Block
  - ⚠️ Report
  - 🗑️ Delete

---

## 🔄 API Calls Needed

### Regular User (Employee)
```javascript
// Inbox
GET /api/messages/inbox/?page=1

// Send message
POST /api/messages/send/ (with file)

// View message (auto-marks read)
GET /api/messages/{id}/

// Reply
POST /api/messages/{id}/reply/

// Forward
POST /api/messages/{id}/forward/

// Mark read/unread
PATCH /api/messages/{id}/read-status/

// Block/Unblock
POST /api/users/{id}/block/
POST /api/users/{id}/unblock/
GET /api/users/blocked/

// Search
GET /api/messages/search/?q=query

// Drafts
GET /api/messages/drafts/
POST /api/messages/save-draft/
DELETE /api/messages/drafts/{id}/

// Report
POST /api/messages/{id}/report/
```

### Admin Only
```javascript
// Reports
GET /api/admin/message-reports/?unresolved=true
PATCH /api/admin/message-reports/{id}/resolve/

// Announcements
GET /api/announcements/
POST /api/announcements/create/

// Settings
GET /api/admin/messaging-settings/
PATCH /api/admin/messaging-settings/update/
```

---

## 🎯 Implementation Phases

### Phase 1: Basic Messaging
- [x] Inbox view (paginated list)
- [x] View single message (detail)
- [x] Compose modal (send message)
- [x] Mark as read/unread
- [x] Search

### Phase 2: Advanced Messaging
- [x] Reply/Forward
- [x] Drafts (save/edit/delete)
- [x] Block/Unblock users
- [x] Report message

### Phase 3: Admin Features
- [x] Reports dashboard
- [x] Announcements
- [x] Settings panel

---

## 🧪 Testing in Browser

### 1. Open DevTools → Network Tab
Watch API calls as you:
- Open inbox
- Click message (should call GET /api/messages/{id}/)
- Send message (should call POST /api/messages/send/)
- Reply (should call POST /api/messages/{id}/reply/)

### 2. Check Error Handling
- Try to send to blocked user → should show error
- Try to upload large file → should show error
- Try to reply to nonexistent message → should show error

### 3. Verify Persistence
- Send message from account A
- Logout
- Login as account B
- Should see new message in inbox

---

## 📋 Checklist for Frontend Dev

- [ ] MessagesPage.jsx main container
- [ ] InboxView with list + pagination
- [ ] SentView
- [ ] DraftsView
- [ ] MessageDetail view/modal
- [ ] ComposeModal
- [ ] ReplyModal
- [ ] ForwardModal
- [ ] ReportMessageModal
- [ ] BlockUserFeature
- [ ] BlockedUsersList
- [ ] SearchMessages
- [ ] Admin ReportsView
- [ ] Admin AnnouncementsView
- [ ] Admin SettingsView
- [ ] Error handling (blocked user, file size, etc.)
- [ ] Loading states
- [ ] Empty states
- [ ] Unread badges/indicators
- [ ] Draft auto-save feature
- [ ] File upload with progress

---

## 🎨 Styling Tips

Keep it similar to existing modules:
- Use same color scheme as Documents/Tasks
- Icons for actions (reply, forward, block, etc.)
- Hover effects on message list items
- Modal overlay with close button
- Toast/Alert for success messages
- Red text for errors (blocked user, etc.)

---

## 🚀 Ready to Build!

All 22 backend API endpoints are implemented and tested. Your frontend friend can now:
1. Start with InboxView
2. Add ComposeModal
3. Build MessageDetail
4. Add Reply/Forward
5. Build Admin features last

The backend will handle all the business logic - the frontend just needs to call the APIs and display the data! 💪
