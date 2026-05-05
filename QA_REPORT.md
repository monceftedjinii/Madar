# QA Report — MADAR GRH HR Management System

**Date:** 2026-05-05  
**Tester:** Claude Code (QA Engineer role)  
**Environment:** Local development  
**Backend version:** Django 4.2.28 | DRF 3.16.1  
**Frontend version:** React 19.2.0 | Vite 7.2.5  

---

## 1. Project Summary

MADAR GRH is a full-featured Human Resources Management (HRM) web application built for an Algerian company (timezone Africa/Algiers). The system manages the complete HR lifecycle across multiple departments/services.

**Core modules:**
| Module | Purpose |
|---|---|
| Authentication | JWT-based login, role-based access |
| Employee Management | CRUD, role assignment, password reset |
| Attendance | Daily check-in/out with 4-digit PIN |
| Leave Requests | Multi-step workflow: Employee → Chef → RH |
| Tasks | Assignment, submission, review, completion |
| Documents | Upload, versioning, validation, archiving |
| Messaging | Internal email: send, reply, forward, block, report |
| Formations | Training request, catalog, participant management |
| Evaluations | Criterion-based scoring with global score |
| Dashboard/KPIs | Role-based analytics and exports |

**Role system (dual schema — migration in progress):**
| New Role | Old Equivalent | Access Level |
|---|---|---|
| DRH | GRH | Full HR director |
| RH | RH_SIMPLE | Basic HR |
| RH_FORMATION | RH_AGENT | Training manager |
| RH_CONGE | — | Leave manager |
| CHEF | CHEF | Department supervisor |
| EMPLOYEE | EMPLOYEE | Regular staff |

**Architecture:** Single Django app (`madar_app`), 35+ models, 173 API endpoints, modular views, SQLite database (development). React frontend with Vite/MUI, tokens in `localStorage`.

---

## 2. Environment and Commands Used

### Backend
```bash
# Location
cd "/Users/moncef_tedjini/Pfe Project/PFE-MADAR-GRH"

# Server already running on port 8000
curl http://127.0.0.1:8000/api/ping/
# → {"ping":"pong"}

# Django admin
# URL: http://127.0.0.1:8000/admin/
```

### Frontend
```bash
# Location
cd "/Users/moncef_tedjini/Pfe Project/client"
npm run dev
# URL: http://localhost:5173
```

### Django system checks
```bash
python manage.py check
# → System check identified no issues (0 silenced)

python manage.py makemigrations --check --dry-run
# → No changes detected
```

### Database
- **Engine:** SQLite3 (local dev file)
- **Path:** `PFE-MADAR-GRH/db.sqlite3`
- **Status:** Development/demo data confirmed safe (no real production emails)

---

## 3. Test Data Created / Used

### Test accounts (passwords set during testing)

| Email | Password | User.role | User.service | Employee.role | Employee.service |
|---|---|---|---|---|---|
| admin@example.com | AdminTest@123 | GRH | RH | (no emp record) | — |
| admin@madar.dz | AdminTest@123 | GRH | RH | (no emp record) | — |
| grh@example.com | grhpass123 | GRH | RH | EMPLOYEE | HR |
| emp@example.com | emppass123 | EMPLOYEE | OTHER | EMPLOYEE | SALES |
| chef@example.com | chefpass123 | CHEF | OTHER | EMPLOYEE | SALES |
| rh_simple@example.com | rhpass123 | RH_SIMPLE | RH | **DRH** | SALES |
| rh.agent@example.com | TestPass@123 | RH_AGENT | RH | (no emp record) | — |
| drh@company.com | TestPass@123 | GRH | RH | (no emp record) | — |

**Note:** Bold `DRH` indicates the role inconsistency — `rh_simple@example.com` accidentally has `Employee.role=DRH`, giving it unintended DRH-level access.

### Supporting data used
- **Services:** IT, HR, SALES, FIN, OPS (from seed data)
- **Leave types:** CA (30 days), CM (15 days), MAT (90 days), AUTRE
- **Tasks:** 7 existing + 2 created during testing
- **Documents:** 3 created during testing
- **Messages:** 12 messages in system
- **Evaluation criteria:** 5 existing (Ponctualite, Productivite, etc.)
- **Formation requests:** 10 existing + 1 created during testing

---

## 4. Features Tested

### Authentication
| Test | Result | Evidence |
|---|---|---|
| Valid login returns JWT access+refresh tokens | **PASSED** | `POST /api/auth/token/` → `{access, refresh}` |
| Wrong password returns error | **PASSED** | `{"detail": ["Mot de passe incorrect."]}` |
| Non-existent email returns error | **PASSED** | `{"detail": ["Utilisateur introuvable."]}` |
| Missing fields returns validation error | **PASSED** | `{email: required, password: required}` |
| No token → 401 on protected endpoint | **PASSED** | HTTP 401 |
| Fake/invalid token → 401 | **PASSED** | HTTP 401 |
| Token refresh works | **PASSED** | New access token returned |
| Logout clears session | **PASSED** | `{"message": "Logged out successfully"}` |
| whoami returns role/service info | **PASSED** | Full user profile returned |

### Employee Management
| Test | Result | Evidence |
|---|---|---|
| GRH sees all 28 employees | **PASSED** | 28 records returned |
| Employee sees only own record (scoping) | **PASSED** | 1 record returned |
| Employee create blocked for EMPLOYEE role | **PASSED** | HTTP 403 |
| Employee create blocked for CHEF role | **PASSED** | HTTP 403 |
| Employee create works with DRH access | **PASSED** | Employee created with temp password |
| Update employee works for DRH | **PASSED** | HTTP 200, fields updated |
| Delete employee works for DRH | **PASSED** | HTTP 200 |
| Delete employee blocked for EMPLOYEE | **PASSED** | HTTP 403 |
| Update employee blocked for EMPLOYEE | **PASSED** | HTTP 403 |
| salary exposed in employee list API | **FAILED** | salary returned for ALL roles including employees seeing own record |
| attendance_pin in API response (GRH view) | **FAILED** | PIN '2003', '1234' returned in plaintext |
| attendance_pin in messaging endpoint | **PARTIALLY PASSED** | Set to None with for_messaging=true, but key still present |

### Leave Requests
| Test | Result | Evidence |
|---|---|---|
| Create leave with valid dates | **PASSED** | Leave id=30 created, status=PENDING |
| Create leave with start > end date | **PASSED** | `{"detail": "end_date must be the same or after start_date"}` |
| Block 2nd leave while 1st pending | **PASSED** | Properly blocked |
| Sick leave requires attachment | **PASSED** | `{"detail": "attachment required for this leave type"}` |
| Notice period validation (CA = 15 days) | **PASSED** | Error with earliest start date |
| Chef approves leave (workflow step 1) | **PASSED** | Step 1 APPROVED, moved to step 2 |
| RH approves leave (workflow step 2) | **PASSED** | Leave → ACCEPTED |
| Balance decremented after approval | **PASSED** | CA: taken=6.0, remaining=24.0 |
| Employee cannot cancel ACCEPTED leave | **PASSED** | `{"detail": "only pending leave requests can be canceled"}` |
| Employee cannot view department leaves | **PASSED** | HTTP 403 |
| Leave block checks non-overlapping future dates | **FAILED** | BUG: Blocks all new leaves if ANY accepted leave ends in future, regardless of date overlap |
| Leave type list returns all required fields | **PARTIALLY PASSED** | Returns code/label/requires_attachment/notice_days — missing nbrJoursDroit, sexeAutorise |

### Attendance
| Test | Result | Evidence |
|---|---|---|
| Check-in creates attendance record | **PASSED** | `{id: 17, check_in_time: ...}` |
| Double check-in blocked | **PASSED** | `{"detail": "already checked in"}` |
| Check-out updates record | **PASSED** | `{check_out_time: ...}` |
| Check-out without check-in blocked | **PASSED** | `{"detail": "already checked out"}` |
| Wrong PIN rejected | **PASSED** | HTTP 403 `{"detail": "Invalid PIN"}` |
| Employee views own attendance | **PASSED** | Scoped to own records |
| Chef views team attendance | **PASSED** | Returns team summary |
| **EMPLOYEE views team attendance (should be 403)** | **FAILED** | HTTP 200 — permission bypass via HasRole bug |
| Absence warning blocked for EMPLOYEE | **PASSED** | HTTP 403 |

### Tasks
| Test | Result | Evidence |
|---|---|---|
| Chef creates task | **PASSED** | Task created, assigned to employee |
| Employee submits own task | **PASSED** | Status → SUBMITTED |
| Chef approves submission (action=approve) | **PASSED** | Status → DONE |
| Employee cannot delete task | **PASSED** | HTTP 403 |
| **EMPLOYEE creates tasks (should be 403)** | **FAILED** | HTTP 400 (passes permission, fails validation) |
| **EMPLOYEE views chef task list (should be 403)** | **FAILED** | HTTP 200 — permission bypass |
| Chef review with wrong action value | **FAILED** | `{"detail": "L'action doit etre approve ou reject."}` — undocumented action key format |

### Documents
| Test | Result | Evidence |
|---|---|---|
| Upload document with doc_type ID | **PASSED** | Document created, status=DRAFT |
| Upload with type name (creates new type) | **PASSED** | `DocumentType` created automatically |
| Send document | **PASSED** | Status → SENT |
| Employee blocked from CONFIDENTIAL doc (diff service) | **PASSED** | HTTP 403 |
| DRH validates document | **PASSED** | Status → VALIDATED |
| DRH rejects document | **PASSED** | Status → REJECTED |
| Employee blocked from validating | **PASSED** | HTTP 403 |
| Archive validated document | **PASSED** | Status → ARCHIVED |
| Create new version | **PASSED** | Version 2 created with SHA256 checksum |
| Employee deletes own document | **PASSED** | HTTP 204 |
| Employee blocked from deleting others' docs | **PASSED** | HTTP 403 |
| Upload with wrong parameter name (type_id) | **FAILED** | Returns `{"detail": "type is required"}` — confusing error, wrong parameter name silently ignored |

### Messaging
| Test | Result | Evidence |
|---|---|---|
| Send message to another user | **PASSED** | Message id=8 delivered |
| Inbox returns received messages | **PASSED** | 2 messages in chef inbox |
| Reply to message | **PASSED** | Reply created (id=9) |
| Forward message | **PASSED** | Forward created (id=10) |
| Save draft | **PASSED** | Draft id=1 saved |
| Block user | **PASSED** | `{"success": true, "blocked": "chef@example.com"}` |
| View blocked users | **PASSED** | Returns blocked user list |
| Unblock user | **PASSED** | Unblocked successfully |
| Report message | **PASSED** | Report created (id=1) |
| Employee blocked from admin reports | **PASSED** | HTTP 403 |
| **Blocked user can still send messages to blocker** | **FAILED** | Message id=12 created despite block — blocking has no backend enforcement |
| **Sender can message user they blocked** | **FAILED** | No restriction prevents blocked person from being messaged |
| Reply `is_reply` field | **PARTIALLY PASSED** | Field returns `null` instead of `true` in response |

### Formation/Training
| Test | Result | Evidence |
|---|---|---|
| Chef creates formation request | **PASSED** | Status=PENDING |
| Employee blocked from creating formation request | **PASSED** | HTTP 403 |
| RH_FORMATION user views formation requests | **FAILED** | HTTP 403 — `is_formation_rh` ignores `User.role=RH_AGENT` when `User.service='RH'` |
| RH_FORMATION approves formation request | **FAILED** | HTTP 403 — same dual-schema bug |
| Formation catalog accessible | **FAILED** | HTTP 403 for rh.agent@example.com |
| Chef views own formation requests | **PASSED** | 10 requests visible |

### Evaluations
| Test | Result | Evidence |
|---|---|---|
| Chef creates evaluation with scores | **PASSED** | global_score=3.73, recommendation=Bon |
| Evaluation criteria list accessible to all | **PASSED** | 5 criteria returned |
| Employee views own evaluations | **PASSED** | Returns own evaluations |
| **Employee accesses chef evaluations list** | **FAILED** | HTTP 200 (should be 403) — HasRole bypass |
| **Employee can POST to evaluations/chef/** | **FAILED** | HTTP 400 (passes permission, fails validation) |
| RH evaluations endpoint blocks employee | **PASSED** | HTTP 403 |
| Evaluation requires at least one score | **PASSED** | Validation error if scores empty |

### Dashboard/KPIs
| Test | Result | Evidence |
|---|---|---|
| `/api/ping/` health check | **PASSED** | `{"ping": "pong"}` |
| Employee dashboard endpoint | Not fully tested | Requires UI verification |
| RBAC test blocked for EMPLOYEE | **PASSED** | HTTP 403 |
| RBAC test accessible for accidental DRH | **PASSED** | HTTP 200 (wrong user but correct permission) |

---

## 5. Role and Permission Testing

### EMPLOYEE (emp@example.com, service=OTHER)
| Action | Expected | Actual | Status |
|---|---|---|---|
| Login | Allowed | Allowed | PASS |
| View own employee record | Allowed | Allowed | PASS |
| View all employee records | Blocked | Blocked | PASS |
| Create employee | Blocked (403) | Blocked (403) | PASS |
| Delete employee | Blocked (403) | Blocked (403) | PASS |
| Create task | Blocked (403) | HTTP 400 (passes permission) | **FAIL** |
| View chef task list | Blocked (403) | HTTP 200 | **FAIL** |
| View team attendance | Blocked (403) | HTTP 200 | **FAIL** |
| View/post chef evaluations | Blocked (403) | HTTP 200/400 | **FAIL** |
| Validate document | Blocked (403) | Blocked (403) | PASS |
| Access admin message reports | Blocked (403) | Blocked (403) | PASS |

**Root cause of failures:** `HasRole` permission class maps `service='OTHER'` to `[EMPLOYEE, CHEF]` roles. Since `CHEF` appears in `allowed_roles` for `IsServiceManager` and `IsChef`, all OTHER-service users pass those checks.

### CHEF (chef@example.com, service=OTHER)
| Action | Expected | Actual | Status |
|---|---|---|---|
| Create/delete tasks | Allowed | Allowed | PASS |
| View department leaves | Allowed | Allowed | PASS |
| Approve/reject leaves | Allowed (own dept) | Allowed | PASS |
| View team attendance | Allowed | Allowed | PASS |
| Create formation request | Allowed | Allowed | PASS |
| Create evaluations | Allowed | Allowed | PASS |
| Create employee | Blocked | Blocked | PASS |

### RH_SIMPLE (rh_simple@example.com) — Accidental DRH Access
| Action | Expected | Actual | Status |
|---|---|---|---|
| Create employee | Blocked (RH_SIMPLE) | **Allowed** (Employee.role=DRH) | **FAIL** |
| Delete employee | Blocked | **Allowed** | **FAIL** |
| Validate documents | Blocked | **Allowed** | **FAIL** |
| Full DRH operations | Blocked | **Allowed** (privilege escalation) | **FAIL** |

### GRH Users (admin@example.com, grh@example.com, drh@company.com)
| Action | Expected | Actual | Status |
|---|---|---|---|
| Create employee | Allowed | **Blocked (403)** | **FAIL** |
| Delete employee | Allowed | **Blocked (403)** | **FAIL** |
| Validate documents | Allowed | **Blocked (403)** | **FAIL** |
| All DRH operations | Allowed | **Blocked** | **FAIL** |

**Root cause:** `is_drh()` checks `Employee.role == DRH` when `User.service='RH'`, but these users either have no Employee record or have `Employee.role=EMPLOYEE`. The old `User.role=GRH` is ignored.

### RH_AGENT (rh.agent@example.com)
| Action | Expected | Actual | Status |
|---|---|---|---|
| View formation requests | Allowed | **Blocked (403)** | **FAIL** |
| Approve formation requests | Allowed | **Blocked (403)** | **FAIL** |
| Formation catalog | Allowed | **Blocked (403)** | **FAIL** |

---

## 6. Django Admin Testing

### Models Registered
| Model | Registered | Quality |
|---|---|---|
| User | ✓ | Good — role, service display |
| Employee | ✓ | Good — list_display with search |
| Service/Job/Affectation | ✓ | Present |
| LeaveType/SoldeConge | ✓ | Present |
| LeaveRequest | ✓ | Minimal — `__str__` only, no search/filter |
| Task | ✓ | Minimal — `__str__` only |
| Document | ✓ | Minimal — `__str__` only |
| DocumentVersion/Access | ✓ | Present |
| Message/Draft/BlockedUser | ✓ | Present |
| MessageReport | ✓ | Present |
| **EvaluationCampaign** | ✗ | **MISSING** |
| **EvaluationCriteria** | ✗ | **MISSING** |
| **Evaluation** | ✗ | **MISSING** |
| **EvaluationScore** | ✗ | **MISSING** |
| **FormationRequest** | ✗ | **MISSING** |
| **FormationCatalog** | ✗ | **MISSING** |
| **FormationParticipant** | ✗ | **MISSING** |
| AbsenceWarning | ✗ | **MISSING** |

**Key admin issues:**
1. `Employee.attendance_pin` shown in `list_display` — exposes 4-digit PINs in admin list view
2. `LeaveRequest`, `Task`, `Document` have minimal admin config (no search, no filters)
3. Evaluation and Formation modules entirely absent from admin — no admin management path

---

## 7. Bugs Found

---

### BUG-001: HasRole Permission Bypass — Critical Security Vulnerability
**Severity:** CRITICAL  
**Steps to reproduce:**
1. Authenticate as `emp@example.com` (EMPLOYEE role, service=OTHER)
2. `GET http://127.0.0.1:8000/api/tasks/chef/` → HTTP 200 (should be 403)
3. `GET http://127.0.0.1:8000/api/attendance/team/` → HTTP 200 (should be 403)
4. `GET http://127.0.0.1:8000/api/evaluations/chef/` → HTTP 200 (should be 403)
5. `POST http://127.0.0.1:8000/api/tasks/` → HTTP 400 (passes permission, should be 403)

**Expected:** HTTP 403 Forbidden  
**Actual:** HTTP 200/400 — request processed  
**Likely cause:**  
In [madar_app/permissions.py:64-86](PFE-MADAR-GRH/madar_app/permissions.py#L64), `HasRole.has_permission()` maps `service='OTHER'` to `[EMPLOYEE, CHEF]`, then checks if ANY role in that list is in `allowed_roles`. Since `CHEF` appears in `IsServiceManager.allowed_roles=[CHEF, GRH]` and `IsChef.allowed_roles=[CHEF]`, all users with `service='OTHER'` (including EMPLOYEES) pass these checks.

**Affected endpoints:** All endpoints using `IsChef`, `IsServiceManager`, `IsEmployeeOrChef`  
**Suggested fix:** Directly check `user.role` against `allowed_roles` (and `Employee.role` for new schema), removing the indirect service → role mapping.  
**Files:** [madar_app/permissions.py](PFE-MADAR-GRH/madar_app/permissions.py)

---

### BUG-002: All Intended DRH/GRH Users Fail DRH Permission Check
**Severity:** CRITICAL  
**Steps to reproduce:**
1. Login as `grh@example.com` (User.role=GRH, User.service=RH)
2. `POST /api/employees/create/` → HTTP 403
3. `DELETE /api/employees/2/delete/` → HTTP 403
4. All DRH-level operations fail

**Expected:** DRH users can perform full HR operations  
**Actual:** All 5 intended GRH/DRH users (`admin@example.com`, `grh@example.com`, `rh_senior@example.com`, `drh@company.com`, `admin@madar.dz`) are blocked  
**Likely cause:**  
In [madar_app/permissions.py](PFE-MADAR-GRH/madar_app/permissions.py), `is_drh()` checks `get_rh_employee_role(user) == DRH` when `user.service == 'RH'`. But these users either have no `Employee` record or their `Employee.role` isn't `DRH`. The fallback `user.role == GRH` only runs when `user.service != 'RH'`, so it's never reached.

Simultaneously, `rh_simple@example.com` (User.role=RH_SIMPLE) accidentally has DRH access because its `Employee.role=DRH`.

**Suggested fix:** Fix the migration to ensure `Employee.role` is populated correctly when `User.service='RH'`. Add a fallback check for `User.role` regardless of service.  
**Files:** [madar_app/permissions.py](PFE-MADAR-GRH/madar_app/permissions.py), [madar_app/migrations/0049_migrate_role_to_service.py](PFE-MADAR-GRH/madar_app/migrations/)

---

### BUG-003: Message Blocking Has No Backend Enforcement
**Severity:** HIGH  
**Steps to reproduce:**
1. Login as `emp@example.com`, block user 4 (`chef@example.com`)
2. Login as `chef@example.com`
3. `POST /api/messages/send/` to `emp@example.com`
4. Returns `{"id": 12, "success": true}` — message delivered despite block

**Expected:** HTTP 403 or error when blocked user attempts to message blocker  
**Actual:** Message delivered successfully (id=12)  
**Likely cause:** The `send_message` view in [madar_app/views/messages.py](PFE-MADAR-GRH/madar_app/views/messages.py) does not query `BlockedUser` to check if the sender is blocked by the recipient.  
**Suggested fix:** Before creating the Message, check `BlockedUser.objects.filter(blocker=recipient, blocked=sender).exists()` and return 403 if true.  
**Files:** [madar_app/views/messages.py](PFE-MADAR-GRH/madar_app/views/messages.py)

---

### BUG-004: Leave Overlap Check Too Broad — Blocks Non-Overlapping Future Leaves
**Severity:** HIGH  
**Steps to reproduce:**
1. Employee has leave approved for May 20-25, 2026
2. Employee tries to create leave for September 1-3, 2026 (no date overlap)
3. Returns `{"detail": "You can't submit a new leave request while you have a pending request or an ongoing approved leave."}`

**Expected:** Leave for September should be allowed (no date overlap)  
**Actual:** Blocked because the existing approved leave's `end_date >= today`  
**Likely cause:**  
In [madar_app/views/leaves.py:81-88](PFE-MADAR-GRH/madar_app/views/leaves.py#L81), the overlap check is:
```python
LeaveRequest.objects.filter(employee=emp, status=ACCEPTED, end_date__gte=today).exists()
```
This is too broad — it should check if the NEW leave's date range overlaps with the existing approved leave's range.  
**Suggested fix:** Replace with date-range overlap query:
```python
LeaveRequest.objects.filter(employee=emp, status=ACCEPTED, start_date__lte=new_end, end_date__gte=new_start).exists()
```
**Files:** [madar_app/views/leaves.py](PFE-MADAR-GRH/madar_app/views/leaves.py#L81)

---

### BUG-005: Attendance PIN Returned in Plaintext via API
**Severity:** HIGH  
**Steps to reproduce:**
1. Login as GRH user
2. `GET /api/employees/` → Response includes `"attendance_pin": "1234"` for all 28 employees
3. Employee can see their own PIN via their own record

**Expected:** PIN should not be returned in API responses (or should be masked/omitted)  
**Actual:** All PINs visible in plaintext: `emp@example.com → '2003'`, most others → `'1234'`  
**Likely cause:** [madar_app/views/employees.py:89](PFE-MADAR-GRH/madar_app/views/employees.py#L89) returns `e.attendance_pin` directly.  
**Suggested fix:** Remove `attendance_pin` from the API response entirely. The PIN should only be used at check-in time, not returned in list views.  
**Files:** [madar_app/views/employees.py](PFE-MADAR-GRH/madar_app/views/employees.py)

---

### BUG-006: Attendance PIN Stored as Plaintext in Database
**Severity:** HIGH  
**Steps to reproduce:**
1. Check `Employee.attendance_pin` field in [madar_app/models.py:369](PFE-MADAR-GRH/madar_app/models.py#L369): `CharField(max_length=4)`
2. Check [madar_app/views/attendance.py:28](PFE-MADAR-GRH/madar_app/views/attendance.py#L28): `str(pin) != emp.attendance_pin` — direct string comparison

**Expected:** PIN stored as hash (bcrypt/PBKDF2)  
**Actual:** PIN stored as plaintext 4-digit string (e.g., `'1234'`, `'2003'`)  
**Note:** `User.attendance_pin_hash` field exists but is unused.  
**Suggested fix:** Use Django's `check_password`/`make_password` to hash PINs on save and verify on check-in. Use the existing `User.attendance_pin_hash` or add `Employee.attendance_pin_hash`.  
**Files:** [madar_app/models.py:369](PFE-MADAR-GRH/madar_app/models.py#L369), [madar_app/views/attendance.py](PFE-MADAR-GRH/madar_app/views/attendance.py)

---

### BUG-007: RH_FORMATION / RH_CONGE / RH Users with service='RH' Cannot Access RH Endpoints
**Severity:** HIGH  
**Steps to reproduce:**
1. Login as `rh.agent@example.com` (User.role=RH_AGENT, service=RH, no Employee record)
2. `GET /api/agent/formations/requests/` → `{"detail": "Unauthorized"}`
3. `GET /api/agent/formations/catalog/` → `{"detail": "Unauthorized"}`

**Expected:** RH_AGENT should access formation management  
**Actual:** HTTP 403 Unauthorized  
**Likely cause:** Same pattern as BUG-002. `is_formation_rh()` in [madar_app/permissions.py](PFE-MADAR-GRH/madar_app/permissions.py) checks `Employee.role` when `service='RH'`, but `rh.agent@example.com` has no Employee record. The fallback `user.role in {RH_AGENT, GRH}` is never reached because `user.service == 'RH'`.  
**Suggested fix:** Fix permission helpers to fall back to `User.role` when Employee record is not found.  
**Files:** [madar_app/permissions.py](PFE-MADAR-GRH/madar_app/permissions.py)

---

### BUG-008: Salary Exposed in All Employee API Responses
**Severity:** MEDIUM  
**Steps to reproduce:**
1. Login as `emp@example.com` (EMPLOYEE role)
2. `GET /api/employees/` → Returns `"salary": "50000.00"` for own record
3. GRH sees salary for all 28 employees

**Expected:** Salary should be visible to DRH/HR roles, not to regular employees  
**Actual:** Salary is included in all employee API responses, including the employee's own scoped record  
**Likely cause:** No field-level access control in the employee serialization in [madar_app/views/employees.py](PFE-MADAR-GRH/madar_app/views/employees.py).  
**Suggested fix:** Omit salary from the response unless the requester is a DRH/RH role.

---

### BUG-009: Chef Task Review Requires Undocumented `action` Key (Not `decision`)
**Severity:** MEDIUM  
**Steps to reproduce:**
1. Login as chef, submit task for review
2. `POST /api/tasks/<id>/review/` with `{"decision": "APPROVED", "comment": "..."}` → `{"detail": "L'action doit etre approve ou reject."}`
3. Retry with `{"action": "approve"}` → Success

**Expected:** API should accept `decision: APPROVED/REJECTED` (as documented in frontend code) or at minimum return a clear error with the correct field name  
**Actual:** Requires `action: approve/reject` (lowercase), not `decision: APPROVED/REJECTED`  
**Likely cause:** Inconsistent parameter naming in [madar_app/views/tasks.py](PFE-MADAR-GRH/madar_app/views/tasks.py).  
**Suggested fix:** Accept both forms, or clearly document the correct field name.

---

### BUG-010: Formation Module Completely Unusable for All Intended RH Users
**Severity:** HIGH  
**Steps to reproduce:**
1. Login as any RH user (grh@example.com, rh.agent@example.com, rh_simple@example.com with User.role=RH_SIMPLE)
2. `GET /api/agent/formations/requests/` → HTTP 403 for all except rh_simple (who accidentally has DRH via Employee.role)

**Expected:** RH_AGENT/GRH users can manage formations  
**Actual:** Formation module is inaccessible due to dual-schema bugs  
**Likely cause:** Combination of BUG-002 and BUG-007.  
**Files:** [madar_app/views/formation.py](PFE-MADAR-GRH/madar_app/views/formation.py), [madar_app/permissions.py](PFE-MADAR-GRH/madar_app/permissions.py)

---

### BUG-011: Missing Admin Registration for Evaluation and Formation Models
**Severity:** MEDIUM  
**Evidence:** Models not in `admin.site._registry`:  
- `EvaluationCampaign`, `EvaluationCriteria`, `Evaluation`, `EvaluationScore`  
- `FormationRequest`, `FormationCatalog`, `FormationParticipant`  
- `AbsenceWarning`

**Impact:** No admin UI for managing evaluation campaigns, criteria, formation requests, or absence warnings.  
**Suggested fix:** Register these models in [madar_app/admin.py](PFE-MADAR-GRH/madar_app/admin.py) with appropriate `list_display`, `search_fields`, and `list_filter`.

---

### BUG-012: LeaveRequest / Task / Document Admin Config Minimal
**Severity:** LOW  
**Evidence:** `LeaveRequest`, `Task`, and `Document` admin classes have `list_display = ('__str__',)` with no search fields or filters.  
**Impact:** Poor admin UX — cannot search for specific leave requests, filter by status, or find tasks by employee.  
**Suggested fix:** Add proper `list_display`, `search_fields`, `list_filter` to these admin classes in [madar_app/admin.py](PFE-MADAR-GRH/madar_app/admin.py).

---

### BUG-013: Employee.attendance_pin in Admin list_display
**Severity:** MEDIUM  
**Evidence:** `EmployeeAdmin.list_display` includes `attendance_pin` — [madar_app/admin.py](PFE-MADAR-GRH/madar_app/admin.py)  
**Impact:** Any admin user can see all employee PINs in the list view.  
**Suggested fix:** Remove `attendance_pin` from `list_display` and use password masking.

---

### BUG-014: Document Upload Parameter Name Inconsistency
**Severity:** LOW  
**Steps to reproduce:**
1. `POST /api/documents/` with `type_id=1` → `{"detail": "type is required"}`
2. Must use `doc_type=1` (for ID) or `type=<name>` (for text name)

**Expected:** Either consistent naming or helpful error message suggesting correct field names  
**Actual:** Confusing error; `type_id` silently ignored  
**Files:** [madar_app/views/documents.py:246-261](PFE-MADAR-GRH/madar_app/views/documents.py#L246)

---

### BUG-015: Role/service Fields Still Returned in Messaging Endpoint
**Severity:** LOW  
**Steps to reproduce:**
1. `GET /api/employees/?for_messaging=true` → `role`, `employee_role`, `hired_at` still returned

**Expected:** Messaging context should only return id, name, email, is_online  
**Actual:** Also returns `role`, `employee_role`, `hired_at` — unnecessary organizational exposure  
**Files:** [madar_app/views/employees.py](PFE-MADAR-GRH/madar_app/views/employees.py)

---

## 8. Missing or Weak App Logic

### Weak Validations
1. **Leave date overlap** — No server-side validation for overlapping leaves beyond the too-broad current check (BUG-004)
2. **Leave balance check** — No validation that employee has sufficient leave balance before creating a request. An employee could request 100 days with a 30-day balance.
3. **Task assignment scope** — Chef can assign tasks to employees from other services (no service scope check in `create_task`)
4. **Service cycle detection** — Service hierarchy has cycle detection, but deleting a parent service cascades to all children silently

### Missing Business Rules
1. **Leave notice period only checked at creation** — Not enforced when a chef approves; employee could submit a leave with insufficient notice if the chef approves it
2. **Maternity leave gender restriction** — `LeaveType.sexeAutorise` field exists but not enforced in the `create_leave` view
3. **Formation participants limit** — `FormationCatalog.people_required` exists but there's no check that participants don't exceed this count
4. **Evaluation campaign scoping** — No check that evaluations belong to the chef's service; a chef could theoretically evaluate employees from other services if they know their ID

### Missing Workflows
1. **Password change notification** — No email/notification sent when admin resets employee password
2. **Leave cancellation after approval** — Once approved, leave can't be cancelled (correct), but there's no process for emergency revocation by RH
3. **Formation participant confirmation** — No workflow for participants to acknowledge/accept formation assignment

---

## 9. Security Concerns

### Critical
| Issue | Evidence | Risk |
|---|---|---|
| **HasRole permission bypass** | Employees bypass IsChef/IsServiceManager | Any employee can create tasks, view chef data |
| **DRH permission system broken** | 5/5 GRH users cannot perform DRH operations | System cannot be administered by intended users |
| **Blocking not enforced at backend** | Blocked user sends messages successfully | Harassment/messaging abuse not preventable |

### High
| Issue | Evidence | Risk |
|---|---|---|
| attendance_pin returned in API | Visible in GET /api/employees/ | PIN theft, attendance fraud |
| attendance_pin stored plaintext | Employee model CharField | Database breach → all PINs exposed |
| salary exposed to all employees | Returned in employee list | Pay scale transparency violation |
| JWT in localStorage | client/src/api/auth.js | Vulnerable to XSS attacks |

### Medium (Development/Config)
| Issue | File | Risk |
|---|---|---|
| `DEBUG = True` | [config/settings.py:27](PFE-MADAR-GRH/config/settings.py#L27) | Stack traces exposed in production |
| Hardcoded `SECRET_KEY` | [config/settings.py:24](PFE-MADAR-GRH/config/settings.py#L24) | JWT forgery risk if key is leaked |
| `ALLOWED_HOSTS = []` | [config/settings.py:29](PFE-MADAR-GRH/config/settings.py#L29) | Host header attacks |
| No rate limiting on login | config/settings.py | Brute-force on employee PINs/passwords |
| `ROTATE_REFRESH_TOKENS = False` | config/settings.py | Refresh token compromise persists until expiry |

### Low
| Issue | Notes |
|---|---|
| 78+ console.log statements in frontend | Leaks API details in browser dev tools |
| No API versioning | Breaking changes affect all clients |
| No request timeout configuration | DRF defaults may allow slow-loris |
| `supabase` and `streamlit` in requirements.txt | Unused dependencies increase attack surface |

---

## 10. Recommendations

### Must Fix Before Launch

1. **Fix HasRole permission class** (BUG-001)  
   Direct `user.role` comparison instead of indirect service-to-role mapping. Every endpoint using `IsChef`/`IsServiceManager` is currently bypassable by any EMPLOYEE.

2. **Fix dual-schema permission helpers** (BUG-002, BUG-007, BUG-010)  
   `is_drh()`, `is_formation_rh()`, `is_conge_rh()`, `is_any_rh()` must fall back to `User.role` when no Employee record exists or when the Employee record hasn't been migrated to new schema roles. Run a data migration to ensure `Employee.role` is consistent with `User.role`.

3. **Enforce message blocking at backend** (BUG-003)  
   Add `BlockedUser` check in `send_message` view: prevent blocked users from messaging blockers.

4. **Fix leave overlap check** (BUG-004)  
   Use date range overlap query instead of `end_date__gte=today`.

5. **Hash attendance PINs** (BUG-006)  
   Use Django's `make_password`/`check_password` for PIN storage. The `User.attendance_pin_hash` field already exists but is unused.

### Should Fix Soon

6. **Remove attendance_pin from API responses** (BUG-005)  
   Never return PINs in employee list/detail endpoints.

7. **Remove salary from employee responses for non-RH roles** (BUG-008)  
   Only DRH/RH roles should see salary data.

8. **Register missing admin models** (BUG-011)  
   Evaluation, Formation, and AbsenceWarning models need admin registration for day-to-day HR operations.

9. **Add leave balance validation before request creation**  
   Reject leave requests that exceed available balance (with clear error message).

10. **Enforce gender restriction on leave types**  
    Check `LeaveType.sexeAutorise` against employee gender in `create_leave`.

11. **Fix Django admin config for LeaveRequest/Task/Document** (BUG-012)  
    Add search fields, filters, and list_display for key operational models.

12. **Move sensitive config to environment variables**  
    `SECRET_KEY`, database credentials, CORS origins → `.env` file loaded via `python-dotenv`.

### Nice to Have

13. **Add API versioning** (`/api/v1/`)
14. **Add DRF serializers layer** (replace inline dict construction)
15. **Add leave balance validation** in the frontend with real-time feedback
16. **Add formation participant limit check** against `FormationCatalog.people_required`
17. **Improve admin UX** for task/leave/document management
18. **Switch JWT tokens to HttpOnly cookies** to mitigate XSS
19. **Add rate limiting** on login and PIN check endpoints
20. **Add OpenAPI/Swagger documentation**
21. **Clean up unused dependencies** (`supabase`, `streamlit`)
22. **Remove `attendance_pin` from admin `list_display`** (BUG-013)

---

## 11. Suggested Automated Tests

### Django (pytest-django or unittest)

```python
# Permission boundary tests (all role combinations × all endpoints)
class TestHasRoleBypass(TestCase):
    def test_employee_cannot_create_task(self):
        self.client.force_authenticate(user=self.employee_user)
        resp = self.client.post('/api/tasks/', {...})
        self.assertEqual(resp.status_code, 403)

    def test_employee_cannot_view_chef_tasks(self):
        resp = self.client.get('/api/tasks/chef/')
        self.assertEqual(resp.status_code, 403)

# Leave workflow tests
class TestLeaveWorkflow(TestCase):
    def test_leave_overlap_check_uses_date_ranges(self):
        # Create approved leave May 20-25
        # Try to create leave Sep 1-3
        # Should succeed (no overlap)

    def test_leave_balance_deducted_on_approval(self):
        ...

# Blocking enforcement
class TestMessageBlocking(TestCase):
    def test_blocked_user_cannot_send_message(self):
        emp.block(chef)
        resp = chef.post('/api/messages/send/', {'recipient_id': emp.id, ...})
        self.assertEqual(resp.status_code, 403)

# DRH permission
class TestDRHPermissions(TestCase):
    def test_user_with_old_grh_role_can_create_employee(self):
        grh_user.role = 'GRH'
        grh_user.service = 'RH'
        # Must create Employee record with correct role
        ...
```

### React / UI (Vitest + React Testing Library)

```javascript
// Route protection tests
test('employee cannot navigate to /rh/employees', () => {
  render(<App user={employeeUser} />)
  navigate('/rh/employees')
  expect(screen.getByText('Access Denied')).toBeInTheDocument()
})

// Leave form validation
test('leave form shows error when dates overlap', () => {
  // ...
})

// API error handling
test('shows user-friendly error on 403 response', () => {
  mockAxios.onGet('/api/tasks/chef/').reply(403)
  // ...
})
```

### E2E (Playwright)

```javascript
test('full leave workflow: submit → chef approve → RH approve → balance updated', async () => {
  // Login as employee, create leave, verify status
  // Login as chef, approve, verify step change
  // Login as RH, approve, verify ACCEPTED + balance
})
```

---

## 12. Final Verdict

### App Status: ❌ NOT READY — Not for Demo, Internal Testing, or Production

**The application has two blocking critical bugs that make core functionality non-functional:**

1. **The DRH permission system is completely broken** — the 5 intended admin/GRH users cannot perform any administrative operations (create employees, validate documents, manage services). The system is effectively unmanageable by its intended administrators. Only `rh_simple@example.com` accidentally has DRH access due to data inconsistency.

2. **The HasRole permission class has a systematic bypass** — all employees with `service='OTHER'` (the majority of employees) can access chef-level endpoints (create tasks, view all team data, create evaluations). This is a significant security vulnerability.

**Additionally:** The message blocking feature is entirely cosmetic (no backend enforcement), the leave overlap check prevents legitimate leave requests, and the formation module is inaccessible to all RH users.

---

### Top 5 Most Important Fixes

| Priority | Bug | Impact |
|---|---|---|
| #1 | **BUG-002**: Fix `is_drh()` / `is_any_rh()` dual-schema helpers — complete the role migration data correctly | No admin can manage the system |
| #2 | **BUG-001**: Fix `HasRole.has_permission()` — remove indirect service→role mapping | EMPLOYEE-level users bypass all chef/manager permission checks |
| #3 | **BUG-003**: Enforce `BlockedUser` check in `send_message` view | Blocking feature is non-functional |
| #4 | **BUG-004**: Fix leave date overlap check to use date range comparison | Employees cannot book non-overlapping future leaves |
| #5 | **BUG-005 + BUG-006**: Remove PIN from API responses, hash PINs in DB | Attendance PIN security breach risk |

---

*Report generated by automated QA run. All API tests performed against `http://127.0.0.1:8000`. Database: SQLite dev instance. No production data was accessed or modified.*
