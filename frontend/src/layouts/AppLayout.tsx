import { useMyContributions } from '../features/contribute/my-contributions'
import type { PropsWithChildren } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { useEffect } from 'react'

import BrandMark from '../shared/components/BrandMark'

const pageTitles: [string, string][] = [
  ['/admin/deployments/', 'Admin · Review record'],
  ['/admin/password', 'Admin · Change password'],
  ['/admin/login', 'Admin · Sign in'],
  ['/admin/users', 'Admin · Administrators'],
  ['/admin/submissions', 'Admin · Submission history'],
  ['/admin', 'Admin · Review queue'],
  ['/map', 'Map'],
  ['/equipment', 'Equipment'],
  ['/analytics', 'Analytics'],
  ['/contribute', 'Contribute'],
]

function AppLayout({ children }: PropsWithChildren) {
  const location = useLocation()
  const inAdmin = location.pathname === '/admin' || location.pathname.startsWith('/admin/')
  // Submissions from this browser waiting on the contributor (FR-59)
  const needsChanges = useMyContributions().items.filter((item) => !item.missing && item.last?.verificationStatus === 'changes_requested').length

  useEffect(() => {
    // Only routes explicitly ending in `/` own nested paths. Public pages and
    // the admin queue have no child routes, so an unknown suffix must remain a
    // 404 rather than inheriting a misleading parent title.
    const page = pageTitles.find(([path]) => path.endsWith('/')
      ? location.pathname.startsWith(path)
      : location.pathname === path)?.[1]
    document.title = page ? `${page} · Mining Market Map` : 'Page not found · Mining Market Map'
  }, [location.pathname])

  // Administration pages bring their own header (AdminBar) and need no public footer
  if (inAdmin) {
    return (
      <div className="app-shell app-shell--admin">
        <a className="skip-link" href="#main-content">Skip to main content</a>
        {children}
      </div>
    )
  }

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <header className="site-header">
        <NavLink className="brand" to="/map" aria-label="Mining Market Map home">
          <BrandMark />
          <span>
            <strong>Mining Market Map</strong>
            <small>Autonomous equipment intelligence</small>
          </span>
        </NavLink>

        <nav className="primary-nav" aria-label="Primary navigation">
          <NavLink className={({ isActive }) => isActive ? 'active' : undefined} to="/map">Map</NavLink>
          <NavLink className={({ isActive }) => isActive ? 'active' : undefined} to="/equipment">Equipment</NavLink>
          <NavLink className={({ isActive }) => isActive ? 'active' : undefined} to="/analytics">Analytics</NavLink>
          <NavLink
            className={({ isActive }) => isActive ? 'active' : undefined}
            // With requests waiting, the link opens the contributor's list
            to={needsChanges > 0 ? '/contribute?tab=mine' : '/contribute'}
            aria-label={needsChanges > 0 ? `Contribute, ${needsChanges} ${needsChanges === 1 ? 'submission needs' : 'submissions need'} changes` : undefined}
          >
            Contribute
            {needsChanges > 0 && <span className="nav-badge" aria-hidden="true">{needsChanges}</span>}
          </NavLink>
        </nav>
        {/* On phones the footer link is a long scroll away, so the header carries it as an icon, after the navigation in tab order */}
        <Link className="site-header__admin" to="/admin" aria-label="Administrator sign-in" title="Administrator sign-in">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
        </Link>
      </header>
      <main className="page-content" id="main-content" tabIndex={-1}>{children}</main>
      <footer className="site-footer">
        <p><strong>About the data</strong> · Unverified submissions are excluded from public views. Data licensed under <a href="https://creativecommons.org/licenses/by/4.0/" rel="license noreferrer" target="_blank">CC BY 4.0</a>.</p>
        {/* The way in for administrators; the pages behind it still require a sign-in */}
        <Link className="site-footer__admin" to="/admin">Administrator sign-in</Link>
      </footer>
    </div>
  )
}

export default AppLayout
