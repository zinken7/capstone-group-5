import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'

import BrandMark from '../../../shared/components/BrandMark'
import { publicPageToReturnTo, useAdminSession } from '../session'

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
          <BrandMark />
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
            {!mustChange && <NavLink to="/admin/submissions">Submission history</NavLink>}
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
                  // Back to the public page this tab came from, not to another sign-in
                  navigate(publicPageToReturnTo(), { replace: true })
                  void signOut()
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
