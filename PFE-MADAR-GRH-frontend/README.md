# MADAR React Frontend

## Setup and Run

### Prerequisites
- Node.js 16+ and npm

### Installation

```bash
cd PFE-MADAR-GRH-frontend
npm install
```

### Development

```bash
npm run dev
```

The app will be available at http://localhost:5173

### Production Build

```bash
npm run build
npm run preview
```

## Features

- **Login Page** (`/login`): Email + password authentication against Django backend
- **Dashboard** (`/dashboard`): Role-based navigation menu
- **Auth Guard**: Protected routes that redirect to login if no token
- **Axios Interceptor**: Automatically attaches JWT bearer token to all requests

## Login Credentials (Demo)

- Email: `emp@example.com`
- Password: `emppass123`

Other test users:
- `chef@example.com` / `chefpass123`
- `rh_simple@example.com` / `rhpass123`
- `rh_senior@example.com` / `rhspass123`
- `grh@example.com` / `grhpass123`

## Environment

The API URL is configured in `.env`:
```
VITE_API_URL=http://127.0.0.1:8000
```

Adjust if your Django backend runs on a different port/host.

## Demo & Quick Start

### Prerequisites
- Django backend running on http://localhost:8000
- Frontend running on http://localhost:5173
- Demo database seeded with test data (see backend setup)

### How to Run Full Stack

**Terminal 1 - Backend:**
```bash
cd PFE-MADAR-GRH
source .venv/bin/activate
python manage.py seed_demo  # Creates demo data (run once)
python manage.py runserver
```

**Terminal 2 - Frontend:**
```bash
cd PFE-MADAR-GRH-frontend
npm run dev
```

### Demo Credentials by Role

Use any of these accounts to test different features:

| Role | Email | Password | Menu Access |
|------|-------|----------|-------------|
| **EMPLOYEE** | emp@example.com | emppass123 | Tasks, Attendance, Leaves, Documents, Notifications, Reports |
| **CHEF** | chef@example.com | chefpass123 | Employees, Leaves (Dept), Assign Task, Documents, Reports, Notifications |
| **RH_SIMPLE** | rh_simple@example.com | rhpass123 | Absences (Yesterday), Leaves, Documents, Reports, Notifications |
| **RH_SENIOR** | rh_senior@example.com | rhspass123 | Discipline Flags, Documents, Reports, Notifications |
| **GRH** | grh@example.com | grhpass123 | Reports, Documents, Employees, Notifications |

### Recommended Demo Flow

Walk through the system with a standard user workflow:

1. **Login** (emp@example.com / emppass123)
   - See Dashboard with employee menu
   - Note the role and department displayed

2. **View Tasks** (/tasks)
   - See assigned tasks
   - Mark tasks as done
   - Note: Task counts and DONE status visual indicator

3. **Request Leave** (/leaves)
   - Create a new leave request (Annual or Sick)
   - For Sick leaves, upload a doctor's note (any small file)
   - Observe form validation and status display
   - Note: Leave appears in table with PENDING status

4. **Check Attendance** (/attendance)
   - Click "Check In" (records current time)
   - View check-in history with date range filter
   - Change date range (current month default)
   - Click "Check Out" to end shift

5. **View Notifications** (/notifications)
   - See any notifications (leave approvals, task assignments, etc.)
   - Mark notification as read
   - Note: Unread count badge

6. **Upload Document** (/documents)
   - Upload a document (title, type, category, file)
   - Document appears in DRAFT status
   - Send document to department or RH
   - Cycle through workflow (Send → Validate → Archive)
   - Add comments to documents

7. **View Reports** (/reports)
   - See metrics dashboard (employees, attendance, warnings, etc.)
   - Apply date range filter
   - Note: Metrics update based on date range

### Demo Flow with Other Roles

**CHEF** (chef@example.com / chefpass123):
- View department employees (/employees)
- Approve/reject leave requests from team (/leaves/department)
- Assign tasks to team members (/tasks/assign)
- Manage shared documents

**RH_SIMPLE** (rh_simple@example.com / rhpass123):
- Review yesterday's absences (/absences/yesterday)
- Issue warnings for absent employees
- Monitor leave requests
- Manage HR documents

**RH_SENIOR** (rh_senior@example.com / rhspass123):
- Monitor discipline flags across system (/discipline/flags)
- Search and track problem employees
- Validate and archive critical documents
- View system reports

**GRH** (grh@example.com / grhpass123):
- Access full system reports (all data)
- Manage documents across all departments
- View all employees (no restrictions)
- Monitor all notifications

### What's Implemented (MVPs 1-19)

- ✅ Backend: 11 models, 40+ endpoints, RBAC, JWT auth
- ✅ Frontend: React + Vite, Login, Dashboard with role-based menu
- ✅ MVP 11: Notifications (fetch, mark as read)
- ✅ MVP 12: Tasks (Employee: MyTasks, Chef: AssignTask)
- ✅ MVP 13: Leaves (Employee: request with attachment, Chef: approve/reject)
- ✅ MVP 14: Attendance (Check in/out, history with date filter)
- ✅ MVP 15: Absences (RH_SIMPLE: view yesterday + issue warnings)
- ✅ MVP 16: Discipline Flags (RH_SENIOR: search and view)
- ✅ MVP 17: Documents (All roles: upload, send, validate, archive, comment)
- ✅ MVP 18: Reports (All roles: view metrics, date range filter)
- ✅ MVP 19: Employees (Chef/GRH: view with search filter)

## Architecture

- **src/api.js**: Axios instance with JWT interceptor
- **src/App.jsx**: Router configuration and private route guard
- **src/pages/Login.jsx**: Login form with token handling
- **src/pages/Dashboard.jsx**: User dashboard with role-based menu

## CORS

Django has been configured to allow requests from:
- `http://localhost:5173`
- `http://127.0.0.1:5173`
- `http://localhost:3000`
- `http://127.0.0.1:3000`

See `config/settings.py` in the Django project.

## Pages Implemented

### Notifications Page (`/notifications`)

**Description**:
List of user notifications with ability to mark as read.

**Features**:
- Fetches notifications from `GET /api/notifications/`
- Displays: title, message, created_at, is_read status
- Visually distinguishes unread notifications (orange border, highlighted background)
- Unread notifications have "Mark as Read" button
- Posts to `POST /api/notifications/<id>/read/` when marking read
- Loading, error, and empty states
- Unread count in header

**Test Plan** (Manual):

1. **View Notifications**:
   - Login with emp@example.com / emppass123
   - Click "Notifications" in the menu
   - Should see list of notifications (if any exist via API)
   - Unread notifications should have orange left border and cream background
   - Read notifications should appear faded

2. **Mark as Read**:
   - If notifications exist, find an unread one
   - Click "Mark as Read" button
   - Button should change to "Marking..." briefly
   - Notification should visually update (border and background removed)
   - Button should disappear for that notification

3. **Empty State**:
   - If no notifications, page should show "No notifications yet"

4. **Loading State**:
   - Page initially shows "Loading notifications..."
   - Should clear once data is fetched

5. **Error Handling**:
   - If API is down, should show error message
   - "Retry" button should appear to refetch

6. **Role-Based Navigation**:
   - All roles (EMPLOYEE, CHEF, RH_SIMPLE, RH_SENIOR, GRH) should have "Notifications" in their menu
   - Click from dashboard should navigate to /notifications

7. **Auth Guard**:
   - Logout and try to access /notifications directly
   - Should redirect to /login

8. **Summary**:
   - Header shows "Total: X | Unread: Y"
   - Count updates after marking as read

### My Tasks Page (`/tasks`) - Employee Role

**Description**:
List of tasks assigned to the logged-in employee with ability to mark tasks as done.

**Features**:
- Fetches tasks from `GET /api/tasks/me/`
- Displays: title, description, due_date, status (TODO/DONE)
- Only shows "Mark as Done" button for TODO tasks
- Button calls `PATCH /api/tasks/<id>/done/` and updates UI optimistically
- Loading, error, and empty states
- Total task count and done count in header
- Visually distinguishes done tasks (faded, strikethrough title)

**Test Plan** (Manual):

1. **View Tasks**:
   - Login with emp@example.com / emppass123
   - Click "Tasks" in the menu (or navigate to /tasks)
   - Should see list of assigned tasks (if any exist)
   - Each task shows: title (bold), description, due date, status badge
   - Should see count: "Total: X | Done: Y"

2. **Mark Task as Done**:
   - If tasks exist with status TODO, find one
   - Click "Mark as Done" button
   - Button changes to "Marking..." briefly
   - Task visually updates (title gets strikethrough, card fades)
   - Button disappears for that task
   - Total done count updates in header

3. **Empty State**:
   - If employee has no tasks, should show "No tasks assigned yet"

4. **Loading State**:
   - Page initially shows "Loading tasks..."
   - Should clear once data is fetched

5. **Error Handling**:
   - Force an error (e.g., stop API), should show error message
   - "Retry" button should appear to refetch

6. **Task Display**:
   - Verify all task fields display correctly (title, description, due date)
   - Verify status badges show correctcolor (yellow for TODO, green for DONE)
   - Verify created_at (assigned date) displays correctly

7. **Navigation**:
   - Login as non-EMPLOYEE role (e.g., CHEF) and navigate to /tasks
   - If API has role-based restrictions, should fail or show no tasks
   - EMPLOYEE role should have "Tasks" in menu

8. **Auth Guard**:
   - Logout and try to access /tasks directly
   - Should redirect to /login

### Assign Task Page (`/tasks/assign`) - Chef Role

**Description**:
Form for chefs to assign tasks to employees in their department.

**Features**:
- Fetches employees from `GET /api/employees/` (filtered by chef's department via API)
- Form fields: employee (required select), title (required), description (optional), due_date (required)
- Submit button calls `POST /api/tasks/` with form data
- Shows success message briefly after submission (auto-clears after 3 seconds)
- Shows error/validation messages if form submission fails
- Form validation: checks required fields before submit
- Inline error + success banners with close button
- Loading state while fetching employees

**Test Plan** (Manual):

1. **View Assign Task Page**:
   - Login with chef@example.com / chefpass123
   - Click "Assign Task" in the menu (or navigate to /tasks/assign)
   - Should see form with: Employee select, Title, Description, Due Date fields
   - Employee dropdown should populate with employees from same department

2. **Assign Task (Happy Path)**:
   - Select an employee from dropdown
   - Enter task title (e.g., "Prepare report")
   - Optionally enter description
   - Select due date (e.g., 2026-02-15)
   - Click "Assign Task" button
   - Button shows "Assigning..." while submitting
   - Success message appears: "Task assigned successfully"
   - Form clears after success
   - Success message disappears after ~3 seconds

3. **Form Validation**:
   - Try submitting without selecting employee → error "Please fill in all required fields"
   - Try submitting without title → error "Please fill in all required fields"
   - Try submitting without due_date → error "Please fill in all required fields"
   - Description can be left blank → should succeed

4. **Error Handling**:
   - Stop API, try to assign task → error message displays
   - Error banner shows close (×) button to dismiss
   - Try again after API recovers should work

5. **Clear Form**:
   - Fill form with data
   - Click "Clear" button
   - All fields reset to empty/default
   - Error/success messages cleared

6. **Loading State**:
   - Page initially shows "Loading employees..."
   - Once loaded, form becomes enabled and employee dropdown ready

7. **Employee Display**:
   - Verify dropdown shows employee email and name format
   - Example: "emp@example.com (John Doe)"

8. **Navigation & Auth**:
   - Only CHEF role should see "Assign Task" in menu
   - Login as non-CHEF (e.g., EMPLOYEE) → cannot see link in menu
   - Logout and try /tasks/assign directly → redirect to /login

### My Leaves Page (`/leaves`) - Employee Role

**Description**:
Submit leave requests and view leave history with approval status.

**Features**:
- Fetch leave requests from `GET /api/leaves/me/`
- Form to create new leave:
  - start_date, end_date (date inputs)
  - type (select: ANNUAL/SICK/OTHER)
  - reason (textarea, required)
  - attachment file upload (only shown when type == SICK, required for SICK)
- Submit button sends `POST /api/leaves/` with FormData (multipart)
- Success message auto-clears after 3 seconds
- Form validation: checks required fields and date order
- Displays leave history with: dates, type, status, reason, chef_comment
- Status badges show color-coded state: PENDING (yellow), APPROVED (green), REJECTED (red)
- Loading, error, empty states

**Test Plan** (Manual):

1. **View My Leaves Page**:
   - Login with emp@example.com / emppass123
   - Click "Leaves" in menu or navigate to /leaves
   - Should see form to create leave request in top section
   - Should see "Leave History" section below with past requests (if any)
   - Should see counts: "Total: X | Pending: Y"

2. **Create Annual Leave (Happy Path)**:
   - Select Start Date: 2026-02-09
   - Select End Date: 2026-02-13
   - Leave Type: Annual Leave (default)
   - Reason: "Family visit"
   - Click "Submit Request"
   - Button shows "Submitting..." briefly
   - Success message appears: "Leave request submitted successfully"
   - Form clears
   - New leave appears in history with PENDING status (yellow badge)
   - Success message disappears after ~3 seconds

3. **Create Sick Leave with Attachment**:
   - Select Start Date: 2026-02-10
   - Select End Date: 2026-02-10
   - Leave Type: Sick Leave
   - Attachment field becomes visible (required)
   - Upload a file (e.g., medical_cert.pdf)
   - Reason: "Doctor appointment"
   - Click "Submit Request"
   - Should succeed and show success message
   - New sick leave appears in history with attachment link

4. **Form Validation**:
   - Try submitting without start_date → error "Please fill in all required fields"
   - Try submitting without end_date → error "Please fill in all required fields"
   - Try submitting without reason → error "Please fill in all required fields"
   - Select End Date before Start Date → error "Start date must be before end date"
   - Select SICK leave without attachment → error "Attachment is required for SICK leave"

5. **Attachment Field Visibility**:
   - Select Leave Type: ANNUAL → attachment field should NOT appear
   - Change to SICK → attachment field appears with red * (required)
   - Change back to ANNUAL → attachment field disappears

6. **Leave History Display**:
   - Verify leaves show: type emoji (📅/🏥/📝), dates, number of days
   - Verify status badges: PENDING (yellow), APPROVED (green), REJECTED (red)
   - Verify chef_comment displays for approved/rejected leaves
   - Verify submitted_at date displays

7. **Clear Form**:
   - Fill leave form with data
   - Click "Clear" button
   - All fields reset
   - Attachment clears

8. **Error Handling**:
   - Stop API, try to submit → error message displays
   - Error banner has close (×) button
   - Can retry after API recovers

9. **Auth Guard**:
   - Logout and navigate to /leaves directly
   - Should redirect to /login

### Department Leaves Page (`/leaves/department`) - Chef Role

**Description**:
Review and approve/reject leave requests from employees in the chef's department.

**Features**:
- Fetch department leaves from `GET /api/leaves/department/`
- Displays leaves grouped by status: Pending, Approved, Rejected
- For each pending leave: shows expandable action section with approve/reject buttons
- Optional comment field for each decision
- Approve button posts to `POST /api/leaves/<id>/approve/`
- Reject button posts to `POST /api/leaves/<id>/reject/`
- Optimistically updates UI status after action
- Shows employee name, email, dates, type, reason, attachment link
- Summary counts at top: Total, Pending, Approved, Rejected
- Loading, error, empty states

**Test Plan** (Manual):

1. **View Department Leaves Page**:
   - Login with chef@example.com / chefpass123
   - Click "Leaves (Department)" in menu or navigate to /leaves/department
   - Should see summary: "Total: X | Pending: Y | Approved: Z | Rejected: W"
   - Should see sections: Pending Approval, Approved, Rejected
   - If no pending leaves, should show "No pending leave requests"

2. **Review Pending Leave**:
   - Assuming an employee has submitted a leave request
   - Find it in "Pending Approval" section
   - Should display: employee email/name, leave type (emoji), dates, days, reason
   - Click "Review & Decide" button
   - Section expands to show:
     - Comment textarea (optional)
     - Approve button (green)
     - Reject button (red)
     - Cancel button (gray)

3. **Approve Leave (Happy Path)**:
   - Expand a pending leave
   - Optionally enter comment: "Approved"
   - Click "Approve" button
   - Button shows "Processing..." briefly
   - Leave status changes to APPROVED (green badge)
   - Leaves Approved section and visually updates
   - Leave moves to "Approved" section below
   - Comment displays if provided

4. **Reject Leave with Comment**:
   - Expand another pending leave
   - Enter comment: "Too many leaves this month"
   - Click "Reject" button
   - Button shows "Processing..." briefly
   - Leave status changes to REJECTED (red badge)
   - Leave moves to "Rejected" section
   - Comment displays under "Reason" label

5. **Approve without Comment**:
   - Leave comment field empty
   - Click "Approve"
   - Should succeed (comment is optional)
   - Leave status updates

6. **Cancel Action**:
   - Expand a pending leave
   - Click "Cancel" button
   - Expansion collapses
   - No changes are sent to server

7. **Section Organization**:
   - Pending leaves at top with action buttons
   - Approved leaves in middle section (read-only display)
   - Rejected leaves at bottom (read-only display)
   - Each section shows count: "Pending Approval (X)", "Approved (Y)", "Rejected (Z)"

8. **Employee Info Display**:
   - Verify each leave shows: employee.user.email + employee first/last name
   - Verify attachment link displays and is clickable for SICK leaves
   - Example: "emp@example.com (John Doe)"

9. **Error Handling**:
   - Stop API, try to approve → error message displays
   - Error banner shows close (×) button
   - Pending leave remains editable after error
   - Can retry

10. **Auth Guard & Role Restriction**:
    - Only CHEF role should see "Leaves (Department)" in menu
    - Login as non-CHEF (e.g., EMPLOYEE) → cannot see link
    - Logout and navigate to /leaves/department → redirect to /login

### My Attendance Page (`/attendance`) - Employee Role

**Description**:
Employee check-in/check-out with attendance history and date range filtering.

**Features**:
- Two main buttons: "Check In" and "Check Out"
- Check In button posts to `POST /api/attendance/check-in/`
- Check Out button posts to `POST /api/attendance/check-out/`
- Success/error message appears after action, auto-clears after 2 seconds
- Buttons disabled while action is in progress
- Attendance history table with date range filtering
- Default date range: 1st of current month to today
- Filter by date: from_date and to_date inputs + "Apply Filter" button
- Table displays: date, check_in_time, check_out_time (formatted as HH:MM)
- Loading, error, empty states
- Record count shown below table

**Test Plan** (Manual):

1. **View Attendance Page**:
   - Login with emp@example.com / emppass123
   - Click "Attendance" in menu or navigate to /attendance
   - Should see "Daily Check-in/Check-out" section with two buttons
   - Should see "Attendance History" section with date filters and table
   - Default date range should be current month (2026-02-01 to 2026-02-06)

2. **Check In**:
   - Click "Check In" button
   - Button shows "Checking in..." briefly
   - Success message appears: "Checked in successfully"
   - Message auto-clears after ~2 seconds
   - Attendance table updates with new entry

3. **Check Out**:
   - Click "Check Out" button
   - Button shows "Checking out..." briefly
   - Success message appears: "Checked out successfully"
   - Message auto-clears after ~2 seconds
   - Attendance table updates with check-out time

4. **Concurrent Action Prevention**:
   - Click "Check In"
   - While processing, click "Check Out"
   - Check Out button should be disabled
   - Only one action can proceed at a time

5. **Filter by Date Range**:
   - Change from date to 2026-02-01
   - Change to date to 2026-02-05
   - Click "Apply Filter"
   - Table refreshes with records in that range
   - Record count updates below table

6. **Table Display**:
   - Verify date format: "Mon, Feb 6" (weekday, short month, day)
   - Verify time format: "09:30 AM" (HH:MM with AM/PM)
   - If check_in_time is missing, show "-"
   - If check_out_time is missing (e.g., not checked out yet), show "-"

7. **Empty State**:
   - Set date range to future dates with no records
   - Click "Apply Filter"
   - Should show: "No attendance records for the selected period"

8. **Error Handling**:
   - Stop API, click "Check In"
   - Error message appears
   - Error banner shows close (×) button
   - Can retry check-in

9. **Loading State**:
   - Page initially shows "Loading attendance..."
   - Once loaded, buttons and filters are enabled

10. **Auth Guard**:
    - Logout and navigate to /attendance directly
    - Should redirect to /login

### Absences Yesterday Page (`/absences/yesterday`) - RH_SIMPLE Role

**Description**:
Review employees absent yesterday and issue warnings per absence with optional comments.

**Features**:
- Fetches absences from `GET /api/absences/yesterday/`
- Displays table with: employee name, department, email
- For each absence: comment textarea (optional) + "Issue Warning" button
- Comment button posts to `POST /api/warnings/` with employee_id, date=yesterday, comment
- Success/error message shows per row after warning issued
- Shows yesterday's date in page header (calculation based on today)
- Row-level success/error handling: one absence doesn't block others
- Loading, error, empty states
- Total absent count at bottom

**Test Plan** (Manual):

1. **View Absences Page**:
   - Login with rh_simple@example.com / rhpass123
   - Click "Absences (Yesterday)" in menu or navigate to /absences/yesterday
   - Should see page title with yesterday's date (e.g., "Thursday, February 05, 2026")
   - Should see table with columns: Employee Name, Department, Comment, Action

2. **Empty State**:
   - If no absences yesterday, should show: "No absences reported yesterday. Great job! 🎉"
   - Record count: "Total absent employees: 0"

3. **Issue Warning (Happy Path)**:
   - Assuming employees exist with absences yesterday
   - Find employee in table
   - Optionally enter comment in textarea (e.g., "Needs explanation")
   - Click "Issue Warning" button
   - Button shows "Issuing..." briefly
   - Success message appears below button: "Warning issued successfully" (green)
   - Message auto-clears after ~3 seconds
   - Comment field clears
   - Table row remains (not removed)

4. **Issue Warning without Comment**:
   - Click "Issue Warning" without entering comment
   - Should succeed (comment is optional)
   - Success message appears

5. **Multiple Warnings in Sequence**:
   - Issue warning to first employee
   - While first is processing, try to issue to second
   - First button should be disabled ("Issuing...")
   - Second should still be clickable
   - Can issue to multiple employees independently

6. **Error Handling**:
   - Stop API, click "Issue Warning"
   - Error message appears below button: red banner with error text
   - Message does NOT auto-clear
   - Can retry from same row

7. **Table Display**:
   - Verify employee name and email displayed correctly
   - Verify department name shows for each absence
   - Verify "Total absent employees: X" count at bottom

8. **Loading State**:
   - Page initially shows "Loading absences..."
   - Once loaded, table renders with buttons enabled

9. **Auth Guard & Role Restriction**:
   - Only RH_SIMPLE role should see "Absences (Yesterday)" in menu
   - Login as non-RH_SIMPLE (e.g., EMPLOYEE) → cannot see link
   - Logout and navigate to /absences/yesterday → redirect to /login

### Discipline Flags Page (`/discipline/flags`) - RH_SENIOR Role

**Description**:
View discipline/warning flags for employees with client-side search filtering.

**Features**:
- Fetches discipline flags from `GET /api/discipline/flags/`
- Displays table with: employee name/email, department, warning_count, month
- Warning count shown as badge (yellow)
- Client-side search filter by employee name or email
- Filter updates in real-time as user types
- Shows count: "X of Y record(s)" during filtering
- Front-end role check: shows "Not authorized" if not RH_SENIOR or GRH
  - Backend will also return 403, but frontend checks user.role from localStorage
- Loading, error, empty states
- Total flags count at bottom

**Test Plan** (Manual):

1. **View Discipline Flags Page**:
   - Login with rh_senior@example.com / rhspass123
   - Click "Discipline Flags" in menu or navigate to /discipline/flags
   - Should see page title "Discipline Flags"
   - If flags exist, should see table with columns: Employee Name, Department, Warning Count, Month

2. **Empty State**:
   - If no discipline flags, should show: "No discipline flags on record. All clear! ✓"

3. **Table Display**:
   - Verify employee name and email displayed in first column
   - Verify department name shows correctly
   - Verify warning count appears in yellow badge (e.g., "2 warnings")
   - Verify month displayed as text (e.g., "2026-02")

4. **Search Filter (Happy Path)**:
   - Assuming flags exist with employee "John Doe" / "john@example.com"
   - Type "john" in search field
   - Table filters in real-time to show only matching records
   - Count updates: "1 of X record(s)"

5. **Search by Email**:
   - Clear previous search
   - Type "john@example.com"
   - Table filters to show matching employee
   - Count updates

6. **Search with No Matches**:
   - Type "xyz" (non-existent)
   - Should show: "No records match your search"

7. **Clear Search**:
   - Type search query
   - Delete all text in search field
   - Table returns to showing all flags
   - Count shows: "X of X record(s)"

8. **Role Check - Authorized (RH_SENIOR)**:
   - Login as rh_senior@example.com
   - Can see "Discipline Flags" in menu
   - Can view page and table normally

9. **Role Check - Authorized (GRH)**:
   - Login as grh@example.com
   - Can see "Discipline Flags" in menu (if in GRH menu)
   - Can view page and table normally

10. **Role Check - Unauthorized**:
    - Login as emp@example.com (EMPLOYEE)
    - Cannot see "Discipline Flags" in menu
    - If manually navigate to /discipline/flags, should see: "Not authorized" message
    - Message should show: "You do not have permission to access this page"
    - Shows: "Only RH_SENIOR and GRH roles can view discipline flags"

11. **Loading State**:
    - Page initially shows "Loading discipline flags..."
    - Once loaded, table renders

12. **Error Handling**:
    - Stop API, refresh page
    - Should show error message
    - Can retry

13. **Auth Guard**:
    - Logout and navigate to /discipline/flags directly
    - Should redirect to /login

### Documents Page (`/documents`) - All Roles (EMPLOYEE, CHEF, RH_SIMPLE, RH_SENIOR, GRH)

**Description**:
Comprehensive document management with upload, workflow status tracking, and role-based actions.

**Features**:
- **Upload Section**:
  - Form fields: title, type, category (INTERNAL/RH/FINANCE), source_department, target_department, file
  - All required fields: title, type, file
  - Submit posts to `POST /api/documents/` using FormData (multipart)
  - Success/error messages with auto-clear
  - Form clears after successful upload

- **Documents List Table**:
  - Fetches from `GET /api/documents/me/`
  - Columns: title, type, category, status, source, target, created date
  - Status badges: DRAFT (gray), SENT (yellow), VALIDATED (green), ARCHIVED (dark gray)

- **Row Actions**:
  - **All roles**: Comment button (💬) with expandable textarea + Post button
    - Calls `POST /api/documents/<id>/comment/`
    - Success/error per row
  - **DRAFT documents**: Send button (calls `POST /api/documents/<id>/send/`)
    - Only own documents can send (backend enforces)
    - Status updates to SENT optimistically
  - **RH_SENIOR/GRH only**: Validate button (if status == SENT)
    - Calls `POST /api/documents/<id>/validate/`
    - Status updates to VALIDATED
  - **RH_SENIOR/GRH only**: Archive button (if status == VALIDATED)
    - Calls `POST /api/documents/<id>/archive/`
    - Status updates to ARCHIVED

- Loading, error, empty states
- Document count shown at bottom
- Optimistic UI updates for fast feedback

**Test Plan** (Manual):

1. **View Documents Page**:
   - Login with emp@example.com / emppass123
   - Click "Documents" in menu or navigate to /documents
   - Should see two sections: "Upload Document" and "My Documents"
   - Upload form has fields: Title, Type, Category, Source, Target, File
   - Table shows existing documents (if any)

2. **Upload Document (Happy Path)**:
   - Fill Title: "Project Proposal"
   - Fill Type: "Report"
   - Category: "INTERNAL" (default)
   - Source: "HR Department" (optional)
   - Target: "Finance Department" (optional)
   - Select file (any file)
   - Click "Upload Document"
   - Button shows "Uploading..." briefly
   - Success message appears: "Document uploaded successfully"
   - Form clears
   - New document appears in table with DRAFT status
   - Success message auto-clears after ~1.5 seconds

3. **Upload Validation**:
   - Try submitting without title → error "Please fill in title, type, and select a file"
   - Try without selecting file → error same
   - Try without type → error same
   - Source and Target are optional → can submit without them

4. **Upload Another Document**:
   - Upload second document
   - Both documents show in table
   - Verify counts update

5. **Send Document (DRAFT → SENT)**:
   - Find a DRAFT document in table
   - Click "Send" button next to it
   - Button shows "..." briefly
   - Status changes from DRAFT to SENT (yellow badge)
   - Success message appears: "Document sent successfully"
   - Message auto-clears after 3 seconds
   - Send button disappears (status no longer DRAFT)

6. **Add Comment to Document**:
   - Find any document
   - Click comment button (💬)
   - Textarea and "Post" button appear inline
   - Type comment: "Looks good"
   - Click "Post"
   - Button shows "..." briefly
   - Success message: "Comment added"
   - Comment field clears
   - Expands/collapse closes
   - Message auto-clears

7. **Comment Validation**:
   - Click comment button on document
   - Leave textarea empty
   - Click "Post"
   - Error message: "Comment cannot be empty"

8. **RH_SENIOR Validate Action**:
   - Login with rh_senior@example.com / rhspass123
   - Navigate to /documents
   - Find a SENT document
   - Should see "Validate" button (only if status == SENT)
   - Click "Validate"
   - Status changes from SENT to VALIDATED (green badge)
   - Success message: "Document validated"
   - Message auto-clears

9. **RH_SENIOR Archive Action**:
   - Find a VALIDATED document
   - Should see "Archive" button (only if status == VALIDATED)
   - Click "Archive"
   - Status changes from VALIDATED to ARCHIVED (dark gray badge)
   - Success message: "Document archived"
   - Archive button disappears

10. **DRAFT Document Upload & Send (Workflow)**:
    - Upload new document
    - Document appears with DRAFT status
    - Click "Send" button
    - Status becomes SENT
    - Send button disappears
    - Validate button appears (for RH_SENIOR/GRH)

11. **Error Handling**:
    - Stop API, try to upload → error message displays
    - Error banner has close (×) button
    - Try send action → error message on row
    - Can retry after API recovers

12. **Loading and Empty States**:
    - Page initially shows "Loading documents..."
    - If no documents, shows: "No documents yet. Upload one to get started!"
    - After upload, new document appears in table

13. **Role-Based Button Visibility**:
    - **EMPLOYEE**: Can upload, send own DRAFT docs, add comments. Cannot validate/archive
    - **CHEF**: Same as EMPLOYEE
    - **RH_SIMPLE**: Same as EMPLOYEE
    - **RH_SENIOR**: Can upload, validate SENT docs, archive VALIDATED docs, add comments
    - **GRH**: Same as RH_SENIOR
    - DRAFT docs only shown with "Send" button to creator
    - Validate button only shown to RH_SENIOR/GRH on SENT documents
    - Archive button only shown to RH_SENIOR/GRH on VALIDATED documents

14. **Table Display**:
    - Verify all columns display correctly
    - Dates show in MM/DD/YYYY format
    - Categories show correct values
    - Source/Target show "-" if empty

15. **Auth Guard**:
    - Logout and navigate to /documents directly
    - Should redirect to /login

## MVP 18 - Reports Summary Page (`/reports`)

**Access**: All roles (EMPLOYEE, CHEF, RH_SIMPLE, RH_SENIOR, GRH)

**Test Scenarios**:

1. **Default Metrics Display**:
   - Navigate to /reports
   - Page loads and shows loading state initially
   - Default date range: First day of current month to today
   - Displays 6 metric cards:
     - Total Employees (number)
     - Attendance Days (number)
     - Warnings Issued (number)
     - Discipline Flags (number)
     - Documents Created (number)
     - Documents Validated (number)
   - Each metric shows a label and large numeric value

2. **Leave Requests Table**:
   - Below metric cards, table displaying leave summary
   - 3 rows: Pending, Accepted, Refused
   - Each row shows status label and count
   - Table has header with "Status" and "Count" columns

3. **Date Filter Application**:
   - Modify "From Date" to specific date (e.g., 1 month ago)
   - Modify "To Date" to another date
   - Click "Apply Filter" button
   - Page shows "Loading..." state
   - Metrics update based on new date range
   - Date info displays below filter: "Showing metrics from [date] to [date]"

4. **Invalid Date Range**:
   - Clear "From Date" input
   - Click "Apply Filter"
   - Error message: "Please select both from and to dates"
   - Metrics remain unchanged

5. **Zero Metrics**:
   - Filter by date range with no activity
   - All metrics should display 0
   - Table shows 0 for Pending, Accepted, Refused leaves
   - Page displays correctly (no errors)

6. **API Error Handling**:
   - Stop API server
   - Try to apply filter
   - Error message displays: "Failed to load reports"
   - Error banner has close (×) button
   - Start API and apply filter again
   - Metrics load successfully

7. **Loading State**:
   - Apply filter by changing date range
   - "Apply Filter" button shows "Loading..." text
   - Button is disabled during load
   - After API response, button returns to "Apply Filter"

8. **Metric Cards Layout**:
   - On desktop (wide screen): 6 cards in grid, adjusted spacing
   - Cards have white background, border, shadow
   - Values are blue and bold
   - Labels are gray and smaller
   - Responsive grid (auto-fit columns)

9. **Navigation**:
   - Click "Reports" link from Dashboard for each role
   - Page loads correctly for:
     - EMPLOYEE logged in
     - CHEF logged in
     - RH_SIMPLE logged in
     - RH_SENIOR logged in
     - GRH logged in

10. **Auth Guard**:
    - Logout and navigate to /reports directly
    - Should redirect to /login

## MVP 19 - Employees Page (`/employees`)

**Access**: CHEF (department employees only), GRH (all employees)

**Test Scenarios**:

1. **CHEF Views Department Employees**:
   - Login with chef@example.com / chefpass123
   - Navigate to Dashboard → "Employees"
   - Page loads and displays employees from chef's department
   - Table shows columns: Full Name, Email, Department
   - All displayed employees have same department

2. **GRH Views All Employees**:
   - Login with grh@example.com / grhpass123
   - Navigate to Dashboard → "Employees"
   - Page loads and displays all employees across all departments
   - Multiple different departments shown in Department column
   - Count includes more employees than CHEF view

3. **Search Filter by Name**:
   - On Employees page
   - Enter search term in "Search by Name" field (e.g., "john")
   - Table filters in real-time as you type
   - Only employees with matching first/last name appear
   - Result count updates: "Showing X of Y total employees"

4. **Empty Search Results**:
   - Enter search term that matches no employees (e.g., "zzzzzz")
   - Table shows: "No employees match your search."
   - Count shows 0

5. **Table Display**:
   - Full Name column displays: FirstName LastName (or ID if no names)
   - Email column shows employee email (or ID if no email)
   - Department column shows department name (or "-" if missing)
   - All rows properly aligned and readable

6. **Loading State**:
   - Navigate to /employees
   - Initially shows "Loading employees..."
   - After API response, loading message disappears
   - Table/data displays

7. **Error Handling**:
   - Stop API server
   - Refresh /employees page
   - Error message displays: "Failed to load employees"
   - Error banner has close (×) button
   - Click close button to dismiss
   - Start API and refresh
   - Employees load successfully

8. **Navigation**:
   - CHEF: "Employees" link visible in Dashboard menu
   - GRH: "Employees" link visible in Dashboard menu
   - Other roles (EMPLOYEE, RH_SIMPLE, RH_SENIOR): No "Employees" link visible
   - Clicking "Employees" navigates to /employees

