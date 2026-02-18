import { STATUS_META } from '../constants'

/**
 * Compact badge rendering for a task status, reusing `STATUS_META` colours.
 * @param {{status:string, className?:string}} props
 */
export default function StatusBadge({ status, className = '' }) {
  const meta = STATUS_META[status] || { label: status, color: 'secondary', textClass: '' }
  return (
    <span className={`badge bg-${meta.color} ${meta.textClass} ${className}`}>
      {meta.label}
    </span>
  );
}
