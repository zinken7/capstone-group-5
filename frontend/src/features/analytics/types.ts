export interface AnalyticsBreakdown {
  label: string
  value: number
}

export interface AnalyticsSummary {
  machineCount: number
  siteCount: number
  countryCount: number
  machinesByType: AnalyticsBreakdown[]
  machinesByCountry: AnalyticsBreakdown[]
  machinesByAutomationLevel: AnalyticsBreakdown[]
  machinesBySupplier: AnalyticsBreakdown[]
}
