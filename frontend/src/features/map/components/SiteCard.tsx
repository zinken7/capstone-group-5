import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

import { getSite } from '../../../lib/api/sites'
import type { MapMarker, SiteDeployment, SiteDetail } from '../../../lib/api/types'
import { formatCountry, formatEnumLabel, formatNumber } from '../../../lib/format'
import StatusBadge from '../../../shared/components/StatusBadge'
import { endedBy, inServiceAt, startYearOf } from '../geometry'
import MapIcon from './MapIcon'

interface SiteCardProps {
  marker: MapMarker
  year: number
  includeDecommissioned: boolean
  onClose: () => void
  onZoom: () => void
}

function machineName(deployment: SiteDeployment): string {
  return [deployment.machineManufacturer, deployment.machineModel].filter(Boolean).join(' ') || formatEnumLabel(deployment.machineType)
}

function DeploymentItem({ deployment, ended }: { deployment: SiteDeployment; ended?: boolean }) {
  const detail = [formatEnumLabel(deployment.machineType), deployment.technologySupplier, startYearOf(deployment)].filter(Boolean).join(' · ')
  return (
    <li className={ended ? 'site-card__deployment site-card__deployment--ended' : 'site-card__deployment'}>
      <span className="site-card__machine"><strong>{machineName(deployment)}</strong><small>{detail}</small></span>
      <span className="site-card__quantity">{formatNumber(deployment.quantity)}</span>
      <StatusBadge status={deployment.status} />
    </li>
  )
}

const plural = (count: number, one: string, many: string) => `${formatNumber(count)} ${count === 1 ? one : many}`

/** The selected site, with what was in service at the year shown on the map. */
function SiteCard({ marker, year, includeDecommissioned, onClose, onZoom }: SiteCardProps) {
  const [detail, setDetail] = useState<{ id: number; site: SiteDetail } | { id: number; error: string } | null>(null)
  const heading = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    let active = true
    getSite(marker.id)
      .then((site) => active && setDetail({ id: marker.id, site }))
      .catch((caught: unknown) => active && setDetail({ id: marker.id, error: caught instanceof Error ? caught.message : 'Site details are unavailable.' }))
    return () => {
      active = false
    }
  }, [marker.id])

  useEffect(() => {
    heading.current?.focus()
  }, [marker.id])

  const current = detail?.id === marker.id ? detail : null
  const deployments = current && 'site' in current ? current.site.deployments : []
  const inService = deployments.filter((deployment) => inServiceAt(deployment, year))
  const ended = deployments.filter((deployment) => endedBy(deployment, year))
  const notYet = deployments.length - inService.length - ended.length
  const endedMachines = ended.reduce((total, deployment) => total + deployment.quantity, 0)
  const place = [marker.region, formatCountry(marker.countryCode)].filter(Boolean).join(', ')

  return (
    <article className="site-card" aria-labelledby="site-card-title" onKeyDown={(event) => event.key === 'Escape' && onClose()}>
      <header className="site-card__header">
        <div>
          <h2 id="site-card-title" ref={heading} tabIndex={-1}>{marker.name}</h2>
          <p>{[place, marker.commodity && formatEnumLabel(marker.commodity)].filter(Boolean).join(' · ')}</p>
        </div>
        <button type="button" className="map-icon-button map-icon-button--quiet" title="Close" onClick={onClose}>
          <MapIcon name="close" /><span className="visually-hidden">Close site details</span>
        </button>
      </header>

      <dl className="site-card__stats">
        <div><dt>machines in service</dt><dd>{formatNumber(marker.machineCount)}</dd></div>
        <div><dt>{marker.deploymentCount === 1 ? 'deployment' : 'deployments'} in service</dt><dd>{formatNumber(marker.deploymentCount)}</dd></div>
      </dl>

      {!current && <p className="site-card__note" role="status">Loading the deployments…</p>}
      {current && 'error' in current && <p className="site-card__note" role="alert">{current.error}</p>}
      {current && 'site' in current && (
        <>
          <ul className="site-card__deployments" aria-label={`Deployments in service at the end of ${year}`}>
            {inService.map((deployment) => <DeploymentItem key={deployment.id} deployment={deployment} />)}
            {includeDecommissioned && ended.map((deployment) => <DeploymentItem key={deployment.id} deployment={deployment} ended />)}
          </ul>
          {inService.length === 0 && !includeDecommissioned && <p className="site-card__note">Nothing was in service here at the end of {year}.</p>}
          {!includeDecommissioned && ended.length > 0 && (
            <p className="site-card__note">
              {plural(ended.length, 'decommissioned deployment', 'decommissioned deployments')} ({plural(endedMachines, 'machine', 'machines')}) {ended.length === 1 ? 'is' : 'are'} hidden. Tick “Include decommissioned deployments” to show {ended.length === 1 ? 'it' : 'them'}.
            </p>
          )}
          {notYet > 0 && <p className="site-card__note">{plural(notYet, 'announced or later deployment is', 'announced or later deployments are')} not counted for {year}.</p>}
        </>
      )}

      <div className="site-card__actions">
        <Link className="map-button map-button--primary" to={`/equipment?site_id=${marker.id}`}><MapIcon name="table" size={16} />View in register</Link>
        <button type="button" className="map-button" onClick={onZoom}><MapIcon name="locate" size={16} />Zoom to site</button>
      </div>
    </article>
  )
}

export default SiteCard
