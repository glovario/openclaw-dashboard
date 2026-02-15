import { EFFORT_META } from '../constants'

/**
 * Token effort badge.
 * compact=true → short "S / M / L" badge (for task cards)
 * compact=false → full label e.g. "Medium (2k–8k)" (for detail view)
 */
export default function EffortBadge({ effort, compact = true }) {
  const meta = EFFORT_META[effort]
  if (!meta) return null

  return (
    <span
      className={`badge bg-${meta.color} text-${meta.color === 'warning' ? 'dark' : 'white'}`}
      title={meta.title}
      style={{ fontSize: '0.68rem', letterSpacing: '0.03em' }}
    >
      {compact
        ? (effort === 'unknown' ? `?` : `⚡${meta.label}`)
        : (effort === 'unknown' ? `? ${meta.full}` : `⚡ ${meta.full}`)}
    </span>
  )
}
