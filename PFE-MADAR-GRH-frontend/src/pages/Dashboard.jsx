import { useNavigate } from 'react-router-dom'
import api from '../api'

function Dashboard({ user, setUser }) {
  const navigate = useNavigate()

  const handleLogout = async () => {
    try {
      await api.post('/api/auth/logout/')
    } catch (err) {
      console.error('Logout error:', err)
    } finally {
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      localStorage.removeItem('user')
      setUser(null)
      navigate('/login')
    }
  }

  if (!user) {
    return <div style={{ padding: '20px' }}>Chargement...</div>
  }

  // Menu items by role
  const roleMenus = {
    EMPLOYEE: [
      { label: 'Mes tâches', href: '/tasks' },
      { label: 'Présence', href: '/attendance' },
      { label: 'Congés', href: '/leaves' },
      { label: 'Messages', href: '/messages' },
      { label: 'Documents', href: '/documents' },
      { label: 'Notifications', href: '/notifications' },
      { label: 'Rapports', href: '/reports' },
      { label: 'Profil', href: '/profile' },
    ],
    CHEF: [
      { label: 'Employés', href: '/employees' },
      { label: 'Congés (Département)', href: '/leaves/department' },
      { label: 'Assigner une tâche', href: '/tasks/assign' },
      { label: 'Formations', href: '/formation' },
      { label: 'Messages', href: '/messages' },
      { label: 'Documents', href: '/documents' },
      { label: 'Rapports', href: '/reports' },
      { label: 'Notifications', href: '/notifications' },
      { label: 'Profil', href: '/profile' },
    ],
    RH_SIMPLE: [
      { label: "Absences (d'hier)", href: '/absences/yesterday' },
      { label: 'Congés (Approbations)', href: '/leaves/department' },
      { label: 'Congés', href: '/leaves' },
      { label: 'Messages', href: '/messages' },
      { label: 'Documents', href: '/documents' },
      { label: 'Rapports', href: '/reports' },
      { label: 'Notifications', href: '/notifications' },
      { label: 'Profil', href: '/profile' },
    ],
    RH_AGENT: [
      { label: 'Congés (Approbations)', href: '/leaves/department' },
      { label: 'Formations', href: '/agent/formations' },
      { label: 'Messages', href: '/messages' },
      { label: 'Documents', href: '/documents' },
      { label: 'Rapports', href: '/reports' },
      { label: 'Notifications', href: '/notifications' },
      { label: 'Profil', href: '/profile' },
    ],
    RH_SENIOR: [
      { label: 'Signalements disciplinaires', href: '/discipline/flags' },
      { label: 'Congés (Approbations)', href: '/leaves/department' },
      { label: 'Messages', href: '/messages' },
      { label: 'Documents', href: '/documents' },
      { label: 'Rapports', href: '/reports' },
      { label: 'Notifications', href: '/notifications' },
      { label: 'Profil', href: '/profile' },
    ],
    GRH: [
      { label: '📊 Tableau de bord analytique', href: '/analytics' },
      { label: 'Congés (Approbations)', href: '/leaves/department' },
      { label: 'Rapports', href: '/reports' },
      { label: 'Documents', href: '/documents' },
      { label: 'Employés', href: '/employees' },
      { label: 'Messages', href: '/messages' },
      { label: 'Notifications', href: '/notifications' },
      { label: 'Profil', href: '/profile' },
    ],
  }

  const menu = roleMenus[user.role] || []

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div>
          <h1>MADAR — Tableau de bord</h1>
          <p style={styles.subtitle}>
            Bienvenue, <strong>{user.email}</strong> — Rôle : <strong>{user.role}</strong>
          </p>
        </div>
        <button onClick={handleLogout} style={styles.logoutBtn}>
          Déconnexion
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
              <p>Aucun élément de menu disponible</p>
            )}
          </nav>
        </aside>

        <main style={styles.main}>
          <h2>Fonctionnalités à venir</h2>
          <p>
            Votre rôle est <strong>{user.role}</strong>. Les pages de fonctionnalités seront disponibles prochainement.
          </p>
          <div style={styles.infoBox}>
            <h3>Informations utilisateur :</h3>
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
