import type { PropsWithChildren } from 'react'
import { NavLink } from 'react-router-dom'

function AppLayout({ children }: PropsWithChildren) {
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
          <NavLink to="/map">Map</NavLink>
          <NavLink to="/equipment">Equipment Register</NavLink>
          <NavLink to="/analytics">Analytics</NavLink>
          <NavLink to="/contribute">Contribute</NavLink>
        </nav>
      </header>
      <main className="page-content" id="main-content">{children}</main>
      <footer className="site-footer">
        <p>Demonstration data only. Verified public data will be connected during integration.</p>
      </footer>
    </div>
  )
}

export default AppLayout
