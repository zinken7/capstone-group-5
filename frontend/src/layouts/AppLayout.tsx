import type { PropsWithChildren } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useEffect } from 'react'

const pageTitles: [string, string][] = [
  ['/admin/deployments/', 'Admin · Review record'],
  ['/admin/password', 'Admin · Change password'],
  ['/admin/login', 'Admin · Sign in'],
  ['/admin/users', 'Admin · Administrators'],
  ['/admin', 'Admin · Review queue'],
  ['/map', 'Map'],
  ['/equipment', 'Equipment register'],
  ['/analytics', 'Analytics'],
  ['/contribute', 'Contribute'],
]

function AppLayout({ children }: PropsWithChildren) {
  const location = useLocation()

  useEffect(() => {
    // Only routes explicitly ending in `/` own nested paths. Public pages and
    // the admin queue have no child routes, so an unknown suffix must remain a
    // 404 rather than inheriting a misleading parent title.
    const page = pageTitles.find(([path]) => path.endsWith('/')
      ? location.pathname.startsWith(path)
      : location.pathname === path)?.[1]
    document.title = page ? `${page} · Mining Market Map` : 'Page not found · Mining Market Map'
  }, [location.pathname])

  return (
    <div className="app-shell">
      <header className="site-header">
        <NavLink className="brand" to="/map" aria-label="Mining Market Map home">
          <span className="brand-mark" aria-hidden="true">AM</span>
          <span>
            <strong>Mining Market Map</strong>
            <small>Autonomous equipment intelligence</small>
          </span>
        </NavLink>

        <nav className="primary-nav" aria-label="Primary navigation">
          <NavLink className={({ isActive }) => isActive ? 'active' : undefined} to="/map">Map</NavLink>
          <NavLink className={({ isActive }) => isActive ? 'active' : undefined} to="/equipment">Equipment Register</NavLink>
          <NavLink className={({ isActive }) => isActive ? 'active' : undefined} to="/analytics">Analytics</NavLink>
          <NavLink className={({ isActive }) => isActive ? 'active' : undefined} to="/contribute">Contribute</NavLink>
          <NavLink className="primary-nav__cta" to="/contribute">Submit a deployment</NavLink>
        </nav>
      </header>
      <main className="page-content" id="main-content">{children}</main>
      <footer className="site-footer">
        <p><strong>About the data</strong> · Verified public records loaded from the project API. Unverified submissions are excluded from public views.</p>
      </footer>
    </div>
  )
}

export default AppLayout
