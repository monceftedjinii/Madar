# Module 10: Internal Messaging API Documentation

## Overview

Module 10 provides a complete internal messaging system with features for:
- **Employees**: Send/receive messages, compose, drafts, search, block users
- **Admin (GRH/RH)**: Moderate messages, manage reports, send announcements, configure messaging rules

## Database Models

### Message
Main message model for one-to-one communication between users.
- `sender` (FK to User)
- `recipient` (FK to User)
- `subject` (CharField)
- `body` (TextField)
- `is_read` (BooleanField)
- `is_deleted_by_sender` (BooleanField) - soft delete
- `is_deleted_by_recipient` (BooleanField) - soft delete
- `parent_message` (FK to self, nullable) - for reply/forward chains
- `is_reply` (BooleanField)
- `is_forward` (BooleanField)
- `created_at`, `updated_at` (DateTimeField)

### MessageAttachment
File attachments for messages.
- `message` (FK to Message)
- `file` (FileField)
- `file_name` (CharField)
- `file_size` (IntegerField in bytes)
- `uploaded_at` (DateTimeField)

### Draft
Temporary message drafts (only visible to creator).
- `creator` (FK to User)
- `recipient` (FK to User, nullable)
- `subject`, `body` (CharField/TextField, can be empty)
- `created_at`, `updated_at` (DateTimeField)

### BlockedUser
User blocking relationship.
- `blocker` (FK to User)
- `blocked` (FK to User)
- `created_at` (DateTimeField)
- Unique constraint: (blocker, blocked)

### MessageReport
Reports on messages for admin moderation.
- `message` (FK to Message)
- `reporter` (FK to User)
- `reason` (CharField)
- `description` (TextField)
- `is_resolved` (BooleanField)
- `resolved_by` (FK to User, nullable)
- `resolution_note` (TextField)
- `message_hidden` (BooleanField) - if message was hidden
- `sender_blocked` (BooleanField) - if sender was blocked
- `created_at`, `resolved_at` (DateTimeField)
- Unique constraint: (message, reporter)

### Announcement
Admin announcements (broadcasts).
- `creator` (FK to User)
- `title`, `message` (CharField/TextField)
- `scope` (choices: GLOBAL, DEPARTMENT)
- `target_department` (FK to Department, nullable)
- `created_at` (DateTimeField)

### MessagingSettings
Global messaging configuration (singleton).
- `max_attachment_size_mb` (IntegerField, default: 10)
- `allowed_file_extensions` (CharField, comma-separated)
- `blocking_enabled` (BooleanField, default: True)
- `announcements_global_default` (BooleanField, default: True)
- `updated_at` (DateTimeField)

---

## API Endpoints

### Employee: Inbox & Message Management

#### GET /api/messages/inbox/
Get user's received messages (paginated).
```
Query Parameters:
  - page (int, default: 1)

Response:
{
  "total": 42,
  "page_size": 20,
  "page": 1,
  "messages": [
    {
      "id": 123,
      "sender": {
        "id": 1,
        "email": "john@example.com",
        "name": "John Doe"
      },
      "recipient": { ... },
      "subject": "Meeting tomorrow",
      "body": "...",
      "is_read": false,
      "is_reply": false,
      "is_forward": false,
      "parent_message_id": null,
      "has_attachments": true,
      "attachments": [
        {
          "id": 5,
          "file_name": "report.pdf",
          "file_size": 102400,
          "file_url": "/media/message_attachments/..."
        }
      ],
      "created_at": "2026-03-03T10:30:00Z",
      "reported_by_me": false
    }
  ]
}
```

#### GET /api/messages/sent/
Get user's sent messages (same structure as inbox).

#### GET /api/messages/<id>/
Get a single message. Auto-marks as read if user is recipient.

#### PATCH /api/messages/<id>/read-status/
Mark message as read or unread (recipient only).
```
Request:
{
  "is_read": true
}

Response:
{
  "success": true
}
```

#### DELETE /api/messages/<id>/
Delete a message (soft delete for user).

#### GET /api/messages/search/
Search messages by subject, body, or sender.
```
Query Parameters:
  - q (string, min 2 chars)

Response:
{
  "query": "meeting",
  "results": [...]  // Message objects
}
```

---

### Employee: Compose & Send

#### POST /api/messages/send/
Send a message with optional file attachments.
```
Request (multipart/form-data):
{
  "recipient_id": 2,
  "subject": "Important Meeting",
  "body": "Let's discuss the project...",
  "parent_message_id": null,  // For reply/forward
  "is_reply": false,
  "is_forward": false,
  "attachments": [file1, file2,...]  // Optional
}

Response (201 Created):
{
  "id": 456,
  "success": true,
  "attachment_errors": [
    "large-file.pdf: exceeds max size of 10MB"
  ]
}
```

**Error Cases:**
- 400: recipient_id/subject/body required
- 403: "This user has blocked you. You cannot send them messages."
- 400: File size exceeds max or extension not allowed

#### POST /api/messages/<id>/reply/
Reply to a message.
```
Request:
{
  "body": "I agree with you..."
}

Response (201 Created):
{
  "id": 457
}
```

#### POST /api/messages/<id>/forward/
Forward a message to a new recipient.
```
Request:
{
  "recipient_id": 3
}

Response (201 Created):
{
  "id": 458
}
```

---

### Employee: Drafts

#### GET /api/messages/drafts/
Get all drafts for current user.
```
Response:
{
  "drafts": [
    {
      "id": 1,
      "recipient": {
        "id": 2,
        "email": "jane@example.com",
        "name": "Jane Smith"
      },
      "subject": "Draft subject",
      "body": "Draft body...",
      "created_at": "2026-03-03T10:00:00Z",
      "updated_at": "2026-03-03T10:30:00Z"
    }
  ]
}
```

#### POST /api/messages/save-draft/
Save or update a draft.
```
Request:
{
  "id": 1,  // null for new draft
  "recipient_id": 2,  // optional
  "subject": "My draft",
  "body": "Draft content..."
}

Response (201 Created):
{
  // Draft object
}
```

#### DELETE /api/messages/drafts/<id>/
Delete a draft.

---

### Employee: Reporting & Blocking

#### POST /api/messages/<id>/report/
Report a message for moderation.
```
Request:
{
  "reason": "Harassment",
  "description": "This message contains insulting language..."
}

Response (201 Created):
{
  "id": 100,
  "success": true
}
```

#### POST /api/users/<user_id>/block/
Block a user (they cannot send you messages).
```
Response:
{
  "success": true,
  "blocked": "john@example.com"
}
```

#### POST /api/users/<user_id>/unblock/
Unblock a user.

#### GET /api/users/blocked/
Get list of blocked users.
```
Response:
{
  "blocked_users": [
    {
      "id": 1,
      "email": "blocked@example.com",
      "name": "Blocked User"
    }
  ]
}
```

---

### Admin: View & Moderate Reports

#### GET /api/admin/message-reports/
List all message reports (GRH/RH staff only).
```
Query Parameters:
  - unresolved (bool, default: true) - only show unresolved reports

Response:
{
  "reports": [
    {
      "id": 100,
      "message": { ... },  // Full message object
      "reporter": {
        "id": 5,
        "email": "reporter@example.com",
        "name": "Reporter Name"
      },
      "reason": "Harassment",
      "description": "...",
      "is_resolved": false,
      "message_hidden": false,
      "sender_blocked": false,
      "created_at": "2026-03-03T10:00:00Z"
    }
  ]
}
```

#### PATCH /api/admin/message-reports/<id>/resolve/
Resolve a report with optional moderation actions.
```
Request:
{
  "resolution_note": "Message removed, sender warned.",
  "hide_message": true,      // Hide message from recipient
  "block_sender": true       // Block sender from messaging recipient
}

Response:
{
  "success": true
}
```

---

### Admin: Announcements

#### GET /api/announcements/
Get all announcements visible to user (global + department-specific).
```
Response:
{
  "announcements": [
    {
      "id": 1,
      "creator": {
        "id": 1,
        "email": "admin@example.com",
        "name": "Admin Name"
      },
      "title": "System Maintenance",
      "message": "Scheduled maintenance...",
      "scope": "GLOBAL",
      "target_department": null,
      "created_at": "2026-03-03T10:00:00Z"
    }
  ]
}
```

#### POST /api/announcements/create/
Create a new announcement (GRH/RH staff only).
```
Request:
{
  "title": "System Update",
  "message": "We're updating the system...",
  "scope": "GLOBAL",              // or "DEPARTMENT"
  "target_department_id": null    // Required if scope = "DEPARTMENT"
}

Response (201 Created):
{
  // Announcement object
}
```

---

### Admin: Messaging Settings

#### GET /api/admin/messaging-settings/
Get current messaging configuration (GRH/RH staff only).
```
Response:
{
  "max_attachment_size_mb": 10,
  "allowed_file_extensions": "pdf,txt,doc,docx,xls,xlsx,jpg,jpeg,png,gif",
  "blocking_enabled": true,
  "announcements_global_default": true
}
```

#### PATCH /api/admin/messaging-settings/update/
Update messaging settings (GRH/RH staff only).
```
Request:
{
  "max_attachment_size_mb": 25,
  "allowed_file_extensions": "pdf,txt,jpg,png",
  "blocking_enabled": true,
  "announcements_global_default": false
}

Response:
{
  "success": true
}
```

---

## Business Logic Rules

### Blocking
- If user A blocks user B, user B **cannot** send messages to user A
- Attempting to send returns: `403 Forbidden` - "This user has blocked you. You cannot send them messages."
- Blocking can be disabled globally via `MessagingSettings.blocking_enabled`

### Attachments
- File size validated against `MessagingSettings.max_attachment_size_mb`
- File extensions validated against `MessagingSettings.allowed_file_extensions`
- Validation errors returned in `attachment_errors` array but don't block message send
- Files stored in `/media/message_attachments/`

### Soft Delete
- Messages marked `is_deleted_by_sender` or `is_deleted_by_recipient` (not physically deleted)
- Deleted messages excluded from inbox/sent listings
- Messages can be "physically" deleted via admin if needed

### Reports & Moderation
- Users can report messages with reason + description
- Reports are unique per (message, reporter) tuple
- Admins can view all reports, mark resolved, hide message, block sender
- When message is hidden, `is_deleted_by_recipient` is set

### Announcements
- Scope `GLOBAL`: visible to all users
- Scope `DEPARTMENT`: only visible to users in that department
- Department determined by Employee record matching email

---

## Authentication & Permissions

All endpoints require `IsAuthenticated`.

Additional permissions:
- **Admin endpoints** (`/api/admin/*`): Require role in `['GRH', 'RH_SIMPLE']`
- **Message ownership**: Users can only access/delete their own messages
- **Draft ownership**: Users can only manage their own drafts
- **Report moderation**: Only admins can resolve reports

---

## Frontend Integration Notes

### For React Implementation
1. **Inbox View**: Use pagination, load 20 messages at a time
2. **Message Details**: Click and auto-marks as read
3. **Compose Modal**: Support file uploads (multipart form data)
4. **Reply/Forward**: Pass parent_message_id
5. **Search**: Debounce input, require min 2 chars
6. **Block Status**: Check blocked_users_list before composing
7. **Announcements**: Display in banner/sidebar, auto-refresh periodically

### Error Handling
```javascript
// Example: Check if recipient blocked sender
if (response.status === 403 && response.data.detail.includes('blocked')) {
  showModal('Cannot send message - user has blocked you');
}
```

---

## Example Usage Flow

### User sends a message with attachment
```
1. POST /api/messages/send/ (multipart)
   - recipient_id: 2
   - subject: "Meeting"
   - body: "..."
   - attachments: [file]

2. Response: {id: 456, success: true}

3. Recipient receives notification
   - GET /api/messages/inbox/
   - See new message with is_read=false

4. Click message
   - GET /api/messages/456/
   - Auto-marks as read
   - See attachments with URLs
```

### User replies to message
```
1. POST /api/messages/456/reply/
   - body: "Thanks!"

2. Response: {id: 457}

3. Original sender sees reply
   - In their inbox
   - parent_message_id = 456
   - is_reply = true
```

### Admin moderates a report
```
1. GET /api/admin/message-reports/?unresolved=true
   - See list of unresolved reports

2. Select report #100
   - View original message
   - View reporter + reason

3. PATCH /api/admin/message-reports/100/resolve/
   - resolution_note: "Removed"
   - hide_message: true
   - block_sender: true

4. Report marked resolved
   - Message hidden from recipient
   - Sender blocked by recipient
```

---

## Default Configuration

When first created, MessagingSettings defaults to:
- **max_attachment_size_mb**: 10 MB
- **allowed_file_extensions**: pdf, txt, doc, docx, xls, xlsx, jpg, jpeg, png, gif
- **blocking_enabled**: True
- **announcements_global_default**: True

Admins can modify these via:
- `/api/admin/messaging-settings/` (GET/PATCH)
- Django admin interface
