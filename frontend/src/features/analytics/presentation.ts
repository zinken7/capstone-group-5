import type { MapSite } from '../map/types'
import type { AnalyticsBreakdown, AnalyticsSummary } from './types'

function toBreakdown(values: Map<string, number>): AnalyticsBreakdown[] {
  return Array.from(values, ([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value)
}

export function buildAnalyticsSummary(sites: MapSite[]): AnalyticsSummary {
  const populatedSites = sites.filter((site) => site.deployments.length > 0)
  const machinesByType = new Map<string, number>()
  const machinesByCountry = new Map<string, number>()
  let machineCount = 0

  for (const site of populatedSites) {
    let siteMachineCount = 0
    for (const deployment of site.deployments) {
      machineCount += deployment.quantity
      siteMachineCount += deployment.quantity
      machinesByType.set(deployment.machineType, (machinesByType.get(deployment.machineType) ?? 0) + deployment.quantity)
    }
    machinesByCountry.set(site.country, (machinesByCountry.get(site.country) ?? 0) + siteMachineCount)
  }

  return {
    machineCount,
    siteCount: populatedSites.length,
    countryCount: new Set(populatedSites.map((site) => site.country)).size,
    machinesByType: toBreakdown(machinesByType),
    machinesByCountry: toBreakdown(machinesByCountry),
  }
}
