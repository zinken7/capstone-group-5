import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'

import { useAdminSession } from '../session'

/**
 * The administration header, used on every admin page in place of the public
 * one. Signed out, it shows only the brand and the way back to the public site.
 */
function AdminBar() {
  const { state, signOut } = useAdminSession()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const profile = state.status === 'signed-in' ? state.profile : null
  const mustChange = profile?.mustChangePassword ?? false

  return (
    <header className="admin-header">
      <div className="admin-header__inner">
        <Link className="admin-brand" to={profile ? '/admin' : '/admin/login'}>
          <span className="brand-mark" aria-hidden="true">AM</span>
          <span>
            <strong>Mining Market Map</strong>
            <small>Administration</small>
          </span>
        </Link>

        {profile && (
          <nav className="admin-nav" aria-label="Administration">
            {/* A record under review still belongs to the queue */}
            {!mustChange && (
              <NavLink to="/admin" className={({ isActive }) => (isActive && (pathname === '/admin' || pathname.startsWith('/admin/deployments/')) ? 'active' : undefined)}>
                Review queue
              </NavLink>
            )}
            {!mustChange && profile.role === 'root' && <NavLink to="/admin/users">Administrators</NavLink>}
            <NavLink to="/admin/password">Change password</NavLink>
          </nav>
        )}

        <div className="admin-account">
          <Link className="admin-account__public" to="/map">Public site</Link>
          {profile && (
            <>
              <span className="admin-account__user" title={profile.email}>{profile.email}</span>
              <button
                className="admin-account__sign-out"
                type="button"
                onClick={() => {
                  void signOut().then(() => navigate('/admin/login', { replace: true }))
                }}
              >
                Sign out
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  )
}

export default AdminBar
