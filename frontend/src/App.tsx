import { Navigate, Route, Routes } from 'react-router-dom'
import AnalyticsPage from './features/analytics/pages/AnalyticsPage'
import ContributePage from './features/contribute/pages/ContributePage'
import EquipmentPage from './features/equipment/pages/EquipmentPage'
import MapPage from './features/map/pages/MapPage'
import AppLayout from './layouts/AppLayout'

function App() {
  return (
    <AppLayout>
      <Routes>
        <Route path="/map" element={<MapPage />} />
        <Route path="/equipment" element={<EquipmentPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/contribute" element={<ContributePage />} />
        <Route path="/" element={<Navigate replace to="/map" />} />
        <Route path="*" element={<Navigate replace to="/map" />} />
      </Routes>
    </AppLayout>
  )
}

export default App
