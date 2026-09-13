import { Navigate, Route, Routes } from 'react-router-dom'
import AnalyticsPage from './features/analytics/pages/AnalyticsPage'
import { buildAnalyticsSummary } from './features/analytics/presentation'
import ContributePage from './features/contribute/pages/ContributePage'
import EquipmentPage from './features/equipment/pages/EquipmentPage'
import { buildEquipmentRecords } from './features/equipment/presentation'
import { fixtureSites } from './features/map/data/fixtureSites'
import MapPage from './features/map/pages/MapPage'
import AppLayout from './layouts/AppLayout'

const equipmentRecords = buildEquipmentRecords(fixtureSites)
const analyticsSummary = buildAnalyticsSummary(fixtureSites)

function App() {
  return (
    <AppLayout>
      <Routes>
        <Route path="/map" element={<MapPage sites={fixtureSites} />} />
        <Route
          path="/equipment"
          element={<EquipmentPage records={equipmentRecords} />}
        />
        <Route
          path="/analytics"
          element={<AnalyticsPage summary={analyticsSummary} />}
        />
        <Route path="/contribute" element={<ContributePage />} />
        <Route path="/" element={<Navigate replace to="/map" />} />
        <Route path="*" element={<Navigate replace to="/map" />} />
      </Routes>
    </AppLayout>
  )
}

export default App
