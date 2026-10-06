/** How long an item has waited, for the review queue: "Just now", "45 min", "3 h", "2 days". */
export function formatWaiting(iso: string, now: Date = new Date()): string {
  const since = new Date(iso).getTime()
  if (Number.isNaN(since)) return iso
  const minutes = Math.max(0, Math.floor((now.getTime() - since) / 60_000))
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} h`
  const days = Math.floor(hours / 24)
  return days === 1 ? '1 day' : `${days} days`
}
