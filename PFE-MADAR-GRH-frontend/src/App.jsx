import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Notifications from './pages/Notifications'
import MyTasks from './pages/MyTasks'
import AssignTask from './pages/AssignTask'
import MyLeaves from './pages/MyLeaves'
import DepartmentLeaves from './pages/DepartmentLeaves'
import MyAttendance from './pages/MyAttendance'
import AbsencesYesterday from './pages/AbsencesYesterday'
import DisciplineFlags from './pages/DisciplineFlags'
import Documents from './pages/Documents'
import Reports from './pages/Reports'
import Employees from './pages/Employees'

function PrivateRoute({ children }) {
  const token = localStorage.getItem('access_token')
  return token ? children : <Navigate to="/login" />
}

function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    const storedUser = localStorage.getItem('user')
    
    if (token && storedUser) {
      setUser(JSON.parse(storedUser))
    }
    setLoading(false)
  }, [])

  if (loading) {
    return <div style={{ padding: '20px' }}>Loading...</div>
  }

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login setUser={setUser} />} />
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <Dashboard user={user} setUser={setUser} />
            </PrivateRoute>
          }
        />
        <Route
          path="/notifications"
          element={
            <PrivateRoute>
              <Notifications />
            </PrivateRoute>
          }
        />
        <Route
          path="/tasks"
          element={
            <PrivateRoute>
              <MyTasks />
            </PrivateRoute>
          }
        />
        <Route
          path="/tasks/assign"
          element={
            <PrivateRoute>
              <AssignTask />
            </PrivateRoute>
          }
        />
        <Route
          path="/leaves"
          element={
            <PrivateRoute>
              <MyLeaves />
            </PrivateRoute>
          }
        />
        <Route
          path="/leaves/department"
          element={
            <PrivateRoute>
              <DepartmentLeaves />
            </PrivateRoute>
          }
        />
        <Route
          path="/attendance"
          element={
            <PrivateRoute>
              <MyAttendance />
            </PrivateRoute>
          }
        />
        <Route
          path="/absences/yesterday"
          element={
            <PrivateRoute>
              <AbsencesYesterday />
            </PrivateRoute>
          }
        />
        <Route
          path="/discipline/flags"
          element={
            <PrivateRoute>
              <DisciplineFlags />
            </PrivateRoute>
          }
        />
        <Route
          path="/documents"
          element={
            <PrivateRoute>
              <Documents />
            </PrivateRoute>
          }
        />
        <Route
          path="/reports"
          element={
            <PrivateRoute>
              <Reports />
            </PrivateRoute>
          }
        />
        <Route
          path="/employees"
          element={
            <PrivateRoute>
              <Employees />
            </PrivateRoute>
          }
        />
        <Route path="/" element={<Navigate to="/dashboard" />} />
      </Routes>
    </Router>
  )
}

export default App
