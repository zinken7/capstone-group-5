import { requestJson } from './http'
import { mapSiteDetail } from './mappers'
import type { SiteDetail, SiteDetailDto } from './types'

export async function getSite(id: number): Promise<SiteDetail> {
  return mapSiteDetail(await requestJson<SiteDetailDto>(`sites/${id}`))
}
