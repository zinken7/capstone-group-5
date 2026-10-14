import { formatEnumLabel } from '../../lib/format'

interface StatusBadgeProps {
  status: string | null | undefined
  /** Text to show in place of the status name, keeping the status colour */
  label?: string
}

function StatusBadge({ status, label }: StatusBadgeProps) {
  const value = status ?? 'unknown'
  const text = label ?? formatEnumLabel(value === 'unknown' ? null : value)
  const variant = value.replaceAll('_', '-')

  return <span className={`status-badge status-badge--${variant}`}>{text}</span>
}

export default StatusBadge
