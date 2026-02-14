export const STATUSES   = ['backlog', 'in-progress', 'review', 'done']
export const OWNERS     = ['norman', 'ada', 'mason', 'atlas', 'bard', 'matt', 'team']
export const PRIORITIES = ['high', 'medium', 'low']
export const EFFORTS    = ['small', 'medium', 'large']

export const STATUS_COLORS = {
  backlog:       'secondary',
  'in-progress': 'primary',
  review:        'warning',
  done:          'success'
}

export const PRIORITY_ICONS = {
  high:   '🔴',
  medium: '🟡',
  low:    '🟢'
}

// Token effort: tier label, Bootstrap colour, tooltip
export const EFFORT_META = {
  small:  { label: 'S', color: 'success', title: 'Small  (<2,000 tokens)',       full: 'Small (<2k)'    },
  medium: { label: 'M', color: 'warning', title: 'Medium (2,000–8,000 tokens)',  full: 'Medium (2k–8k)' },
  large:  { label: 'L', color: 'danger',  title: 'Large  (8,000+ tokens)',       full: 'Large (8k+)'    },
}
