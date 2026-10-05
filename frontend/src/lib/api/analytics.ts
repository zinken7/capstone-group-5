import { requestJson } from './http'

export interface TimelineYear {
  year: number
  newlyCommissioned: number
  inService: number
}

interface TimelineDto {
  years: { year: number; newly_commissioned: number; in_service: number }[]
}

/** Machines commissioned and in service per year, for every verified deployment (GET /api/analytics/timeline). */
export async function getTimeline(): Promise<TimelineYear[]> {
  const dto = await requestJson<TimelineDto>('analytics/timeline')
  return dto.years.map((item) => ({ year: item.year, newlyCommissioned: item.newly_commissioned, inService: item.in_service }))
}
