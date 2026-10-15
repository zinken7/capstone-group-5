import { Navigate, Route, Routes } from 'react-router-dom'
import AdminLoginPage from './features/admin/pages/AdminLoginPage'
import AdminPasswordPage from './features/admin/pages/AdminPasswordPage'
import AdminQueuePage from './features/admin/pages/AdminQueuePage'
import AdminRecordPage from './features/admin/pages/AdminRecordPage'
import AdminSubmissionHistoryPage from './features/admin/pages/AdminSubmissionHistoryPage'
import AdminUsersPage from './features/admin/pages/AdminUsersPage'
import { AdminSessionProvider, RequireAdminSession } from './features/admin/session'
import AnalyticsPage from './features/analytics/pages/AnalyticsPage'
import { MyContributionsProvider } from './features/contribute/my-contributions'
import ContributePage from './features/contribute/pages/ContributePage'
import EquipmentPage from './features/equipment/pages/EquipmentPage'
import MapPage from './features/map/pages/MapPage'
import NotFoundPage from './features/not-found/pages/NotFoundPage'
import AppLayout from './layouts/AppLayout'

function App() {
  return (
    // Outside the layout, so its navigation can show the contributor's own submissions too
    <MyContributionsProvider>
    <AppLayout>
      <AdminSessionProvider>
        <Routes>
          <Route path="/map" element={<MapPage />} />
          <Route path="/equipment" element={<EquipmentPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/contribute" element={<ContributePage />} />
          {/* Administration: not linked from the public navigation */}
          <Route path="/admin/login" element={<AdminLoginPage />} />
          <Route path="/admin/password" element={<RequireAdminSession allowPendingPasswordChange><AdminPasswordPage /></RequireAdminSession>} />
          <Route path="/admin" element={<RequireAdminSession><AdminQueuePage /></RequireAdminSession>} />
          <Route path="/admin/deployments/:id" element={<RequireAdminSession><AdminRecordPage /></RequireAdminSession>} />
          <Route path="/admin/submissions" element={<RequireAdminSession><AdminSubmissionHistoryPage /></RequireAdminSession>} />
          <Route path="/admin/users" element={<RequireAdminSession><AdminUsersPage /></RequireAdminSession>} />
          <Route path="/" element={<Navigate replace to="/map" />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </AdminSessionProvider>
    </AppLayout>
    </MyContributionsProvider>
  )
}

export default App
