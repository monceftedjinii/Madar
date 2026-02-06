# React Frontend MVP - File Structure & Guide

## Created Files

### Root Configuration Files

#### `package.json`
Main npm project configuration with dependencies:
- react & react-dom (UI library)
- react-router-dom (routing)
- axios (HTTP client)
- vite & @vitejs/plugin-react (build tools)

#### `vite.config.js`
Vite configuration:
- React plugin for JSX support
- Dev server on port 5173

#### `.env`
Environment variables:
- `VITE_API_URL` points to Django backend (http://127.0.0.1:8000)

#### `index.html`
Entry HTML file with root div and main.jsx script

#### `.gitignore`
Excludes node_modules, dist, logs, etc.

### Source Code Files

#### `src/main.jsx`
Entry point - renders React app to DOM

#### `src/App.jsx`
Main component with:
- React Router setup with BrowserRouter
- PrivateRoute component for auth guard
- Routes: /login, /dashboard, /
- Token & user state from localStorage

#### `src/api.js`
Axios configuration:
- Base URL from VITE_API_URL
- Request interceptor that adds `Authorization: Bearer <token>` to all requests
- Retrieves token from localStorage

#### `src/index.css`
Basic global CSS (reset, font setup)

#### `src/pages/Login.jsx`
Login page component:
- Email & password input form
- Posts to `/api/auth/token/` to get JWT token
- Calls `/api/whoami/` with token to fetch user info
- Saves token & user to localStorage
- Shows error messages on failure
- Redirects to /dashboard on success
- Basic styled card layout

#### `src/pages/Dashboard.jsx`
Dashboard page component:
- Shows user email and role
- Displays role-specific navigation menu:
  - EMPLOYEE: Tasks, Attendance, Leaves, Notifications, Reports
  - CHEF: Employees, Leaves (Dept), Assign Tasks, Reports, Notifications
  - RH_SIMPLE: Absences, Warnings, Leaves, Documents, Reports, Notifications
  - RH_SENIOR: Discipline Flags, Documents, Reports, Notifications
  - GRH: Reports, Documents, Employees
- Logout button to clear token and redirect to /login
- Sidebar navigation with styled menu

### Documentation Files

#### `README.md`
Quick reference for setup and features

## How It Works

### Login Flow
1. User enters email & password on `/login`
2. Axios posts to `POST /api/auth/token/` with credentials
3. Django returns JWT access token
4. Token saved to localStorage
5. Axios calls `GET /api/whoami/` with Bearer token (via interceptor)
6. User info stored in localStorage and React state
7. Router navigates to `/dashboard`

### Dashboard Flow
1. Dashboard receives user info from state
2. Displays welcome message with email and role
3. Conditionally renders menu items based on user.role
4. All links are placeholders (href targets that don't exist yet)
5. Logout button clears localStorage and redirects to /login

### Auth Guard
- `PrivateRoute` component wraps `/dashboard`
- Checks for `access_token` in localStorage
- If missing, redirects to `/login`
- If present, renders the protected component

### Token Usage
- Stored in localStorage as `access_token`
- Axios interceptor automatically adds to all requests
- Survives page refresh (localStorage persists)
- Cleared on logout

## Next Steps to Enhance

### Immediate
1. Install dependencies: `npm install`
2. Start dev server: `npm run dev`
3. Test login with test credentials
4. Verify dashboard shows correct menu for each role

### Feature Pages (Placeholder Links Ready)
- `/tasks` - Task management (for EMPLOYEE, CHEF)
- `/attendance` - Check-in/out and history
- `/leaves` - Submit and track leave requests
- `/notifications` - View notifications
- `/reports` - View statistics and reports
- `/employees` - Employee directory
- `/documents` - Document management
- `/discipline-flags` - Discipline tracking
- `/warnings` - Absence warnings
- `/absences` - Yesterday's absences

### Frontend Improvements
1. Replace placeholder links with real feature pages
2. Add loading states and error boundaries
3. Implement proper styling (Tailwind, Material-UI, etc.)
4. Add form validation
5. Add toast notifications for feedback
6. Implement proper response error handling
7. Add user profile settings page
8. Add theme switching (light/dark mode)

### State Management
1. Consider using Context API or Redux as app grows
2. Current state management is minimal (localStorage + component state)
3. May need centralized state for multi-page features

## Testing Locally

### Prerequisites
- Node.js 16+ and npm

### Setup
```bash
cd PFE-MADAR-GRH-frontend
npm install
```

### Start
```bash
npm run dev
```

Then open http://localhost:5173

### Login Test
```
Email: emp@example.com
Password: emppass123
```

You should see:
- Dashboard with "Welcome emp@example.com — Role: EMPLOYEE"
- Left sidebar with EMPLOYEE menu items
- User info JSON at bottom

### Build for Production
```bash
npm run build
npm run preview
```

## Architecture Notes

### Client-Side Routing
- React Router DOM handles all navigation
- No page refreshes, all SPA (Single Page Application)
- Home (/) redirects to /dashboard or /login based on auth

### State Management
- User info in App component state (minimal)
- Token in localStorage (survives refresh)
- Per-component state for form inputs

### HTTP Requests
- Axios with interceptor for automatic token injection
- No manual Authorization header needed in component code
- Errors caught and displayed to user

### Security Considerations
- JWT token in localStorage (note: httpOnly cookies would be more secure)
- Bearer token in Authorization header
- Protected routes check for token before rendering
- CORS enabled in Django for localhost:5173

## File Sizes (Approximate)eated to be lightweight:
- App.jsx: ~800 bytes
- Login.jsx: ~2.5 KB
- Dashboard.jsx: ~2.5 KB
- api.js: ~600 bytes
- Total: < 10 KB uncompressed, < 3 KB gzipped

Vite will bundle and minify for production.
