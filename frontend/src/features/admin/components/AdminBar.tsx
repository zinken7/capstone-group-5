import { NavLink, useNavigate } from 'react-router-dom'

import { useAdminSession } from '../session'

/** Administration navigation, shown above every signed-in admin page. */
function AdminBar() {
  const { state, signOut } = useAdminSession()
  const navigate = useNavigate()
  if (state.status !== 'signed-in') return null

  const mustChange = state.profile.mustChangePassword
  return (
    <div className="admin-bar">
      <nav aria-label="Administration">
        {!mustChange && <NavLink end to="/admin">Review queue</NavLink>}
        <NavLink to="/admin/password">Change password</NavLink>
      </nav>
      <span className="admin-bar__user">Signed in as {state.profile.email}</span>
      <button
        className="button button--secondary"
        type="button"
        onClick={() => {
          void signOut().then(() => navigate('/admin/login', { replace: true }))
        }}
      >
        Sign out
      </button>
    </div>
  )
}

export default AdminBar
