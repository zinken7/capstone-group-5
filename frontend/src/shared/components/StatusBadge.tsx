import { formatEnumLabel } from '../../lib/format'

interface StatusBadgeProps {
  status: string | null | undefined
}

function StatusBadge({ status }: StatusBadgeProps) {
  const value = status ?? 'unknown'
  const label = formatEnumLabel(value === 'unknown' ? null : value)
  const variant = value.replaceAll('_', '-')

  return <span className={`status-badge status-badge--${variant}`}>{label}</span>
}

export default StatusBadge
