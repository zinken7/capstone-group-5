import type { Deployment, DeploymentStatus } from '../types.js'

const STATUS_PRECEDENCE: DeploymentStatus[] = ['operational', 'commissioning', 'announced', 'decommissioned']

/** FR-16: a site marker is coloured by the highest-precedence status among its deployments. */
export function deriveSiteStatus(deployments: Array<Pick<Deployment, 'status'>>): DeploymentStatus | null {
  for (const status of STATUS_PRECEDENCE) {
    if (deployments.some((deployment) => deployment.status === status)) {
      return status
    }
  }
  return null
}
