import { useNavigate } from 'react-router-dom'

function Dashboard({ user, setUser }) {
  const navigate = useNavigate()

  const handleLogout = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('user')
    setUser(null)
    navigate('/login')
  }

  if (!user) {
    return <div style={{ padding: '20px' }}>Loading...</div>
  }

  // Menu items by role
  const roleMenus = {
    EMPLOYEE: [
      { label: 'Tasks', href: '/tasks' },
      { label: 'Attendance', href: '/attendance' },
      { label: 'Leaves', href: '/leaves' },
      { label: 'Documents', href: '/documents' },
      { label: 'Notifications', href: '/notifications' },
      { label: 'Reports', href: '/reports' },
    ],
    CHEF: [
      { label: 'Employees', href: '/employees' },
      { label: 'Leaves (Department)', href: '/leaves/department' },
      { label: 'Assign Task', href: '/tasks/assign' },
      { label: 'Documents', href: '/documents' },
      { label: 'Reports', href: '/reports' },
      { label: 'Notifications', href: '/notifications' },
    ],
    RH_SIMPLE: [
      { label: 'Absences (Yesterday)', href: '/absences/yesterday' },
      { label: 'Leaves', href: '/leaves' },
      { label: 'Documents', href: '/documents' },
      { label: 'Reports', href: '/reports' },
      { label: 'Notifications', href: '/notifications' },
    ],
    RH_SENIOR: [
      { label: 'Discipline Flags', href: '/discipline/flags' },
      { label: 'Documents', href: '/documents' },
      { label: 'Reports', href: '/reports' },
      { label: 'Notifications', href: '/notifications' },
    ],
    GRH: [
      { label: 'Reports', href: '/reports' },
      { label: 'Documents', href: '/documents' },
      { label: 'Employees', href: '/employees' },
      { label: 'Notifications', href: '/notifications' },
    ],
  }

  const menu = roleMenus[user.role] || []

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div>
          <h1>MADAR Dashboard</h1>
          <p style={styles.subtitle}>
            Welcome <strong>{user.email}</strong> — Role: <strong>{user.role}</strong>
          </p>
        </div>
        <button onClick={handleLogout} style={styles.logoutBtn}>
          Logout
        </button>
      </header>

      <div style={styles.content}>
        <aside style={styles.sidebar}>
          <h2>Navigation</h2>
          <nav style={styles.nav}>
            {menu.length > 0 ? (
              <ul style={styles.menuList}>
                {menu.map((item, idx) => (
                  <li key={idx} style={styles.menuItem}>
                    <a href={item.href} style={styles.menuLink}>
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p>No menu items available</p>
            )}
          </nav>
        </aside>

        <main style={styles.main}>
          <h2>Features Coming Soon</h2>
          <p>
            Your role is <strong>{user.role}</strong>. Feature pages will be implemented next.
          </p>
          <div style={styles.infoBox}>
            <h3>User Info:</h3>
            <pre>{JSON.stringify(user, null, 2)}</pre>
          </div>
        </main>
      </div>
    </div>
  )
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100vh',
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#333',
    color: 'white',
    padding: '20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  subtitle: {
    margin: '5px 0 0 0',
    fontSize: '14px',
  },
  logoutBtn: {
    padding: '8px 16px',
    backgroundColor: '#dc3545',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  content: {
    display: 'flex',
    flex: 1,
  },
  sidebar: {
    width: '250px',
    backgroundColor: 'white',
    padding: '20px',
    borderRight: '1px solid #ddd',
  },
  nav: {
    marginTop: '20px',
  },
  menuList: {
    listStyle: 'none',
    padding: 0,
  },
  menuItem: {
    marginBottom: '10px',
  },
  menuLink: {
    color: '#007bff',
    textDecoration: 'none',
    fontSize: '14px',
  },
  main: {
    flex: 1,
    padding: '20px',
  },
  infoBox: {
    backgroundColor: 'white',
    padding: '15px',
    borderRadius: '4px',
    marginTop: '20px',
    border: '1px solid #ddd',
  },
}

export default Dashboard
