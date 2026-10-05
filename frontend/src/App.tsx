import { Navigate, Route, Routes } from 'react-router-dom'
import AdminLoginPage from './features/admin/pages/AdminLoginPage'
import AdminPasswordPage from './features/admin/pages/AdminPasswordPage'
import AdminQueuePage from './features/admin/pages/AdminQueuePage'
import AdminRecordPage from './features/admin/pages/AdminRecordPage'
import { AdminSessionProvider, RequireAdminSession } from './features/admin/session'
import AnalyticsPage from './features/analytics/pages/AnalyticsPage'
import ContributePage from './features/contribute/pages/ContributePage'
import EquipmentPage from './features/equipment/pages/EquipmentPage'
import MapPage from './features/map/pages/MapPage'
import AppLayout from './layouts/AppLayout'

function App() {
  return (
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
          <Route path="/" element={<Navigate replace to="/map" />} />
          <Route path="*" element={<Navigate replace to="/map" />} />
        </Routes>
      </AdminSessionProvider>
    </AppLayout>
  )
}

export default App
