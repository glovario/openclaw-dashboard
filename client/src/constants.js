export const STATUSES   = ['new', 'backlog', 'in-progress', 'on-hold', 'for-approval', 'review', 'done']
export const OWNERS     = ['norman', 'ada', 'mason', 'atlas', 'bard', 'quinn', 'juno', 'malik', 'priya', 'elias', 'rowan', 'asha', 'soren', 'elena', 'nia', 'theo', 'matt', 'team']
export const PRIORITIES = ['high', 'medium', 'low']
export const EFFORTS    = ['unknown', 'small', 'medium', 'large']

export const STATUS_COLORS = {
  new:           'info',
  backlog:       'secondary',
  'in-progress': 'primary',
  'on-hold':     'warning',
  'for-approval':'purple',
  review:        'warning',
  done:          'success'
}

export const STATUS_META = {
  new:           { label: 'New',          color: 'info',      textClass: 'text-dark' },
  backlog:       { label: 'Backlog',      color: 'secondary', textClass: '' },
  'in-progress': { label: 'In Progress',  color: 'primary',   textClass: '' },
  'on-hold':     { label: 'On Hold',      color: 'warning',   textClass: 'text-dark' },
  'for-approval':{ label: 'For Approval', color: 'purple',    textClass: '' },
  review:        { label: 'Review',       color: 'warning',   textClass: 'text-dark' },
  done:          { label: 'Done',         color: 'success',   textClass: '' },
}

export const PRIORITY_ICONS = {
  high:   '🔴',
  medium: '🟡',
  low:    '🟢'
}

// Token effort: tier label, Bootstrap colour, tooltip
export const EFFORT_META = {
  unknown: { label: '?', color: 'secondary', title: 'Unknown — effort not assessed', full: 'Unknown' },
  small:   { label: 'S', color: 'success',   title: 'Small  (<2,000 tokens)',         full: 'Small (<2k)'    },
  medium:  { label: 'M', color: 'warning',   title: 'Medium (2,000–8,000 tokens)',    full: 'Medium (2k–8k)' },
  large:   { label: 'L', color: 'danger',    title: 'Large  (8,000+ tokens)',         full: 'Large (8k+)'    },
}
