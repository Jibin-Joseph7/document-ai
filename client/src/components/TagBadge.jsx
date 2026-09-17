import React from 'react';
// client/src/components/TagBadge.jsx
export function TagBadge({ name, onRemove }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-sm bg-teal-50 px-2 py-0.5 text-xs font-medium text-teal-700">
      {name}
      {onRemove && (
        <button
          onClick={onRemove}
          aria-label={`Remove tag ${name}`}
          className="text-teal-700/60 hover:text-teal-700"
        >
          Ã—
        </button>
      )}
    </span>
  );
}