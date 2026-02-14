import React from 'react';

const ICONS = {
  matt:   '👤',
  norman: '🤖',
  ada:    '🌸',
  mason:  '🔨',
  atlas:  '🗺️',
  bard:   '🎭',
  team:   '👥',
};

export default function OwnerBadge({ owner, className = '' }) {
  return (
    <span className={`badge owner-${owner} ${className}`}>
      {ICONS[owner] || '?'} {owner}
    </span>
  );
}
