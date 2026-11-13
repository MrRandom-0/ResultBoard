import { Minus, Plus, Tags, Trash2, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { ResultStatus, Tag } from '../models/types';
import type { TagChangeMode } from '../utils/bulk';

interface Props {
  /** Number of records in the bulk selection. */
  count: number;
  /** Total records currently visible (after filters). */
  visibleCount: number;
  tags: Tag[];
  onClassify(status: ResultStatus): void;
  onTag(tagId: string, mode: TagChangeMode): void;
  onRemove(): void;
  onSelectAllVisible(): void;
  onClear(): void;
  onDone(): void;
}

const STATUS_ACTIONS: { status: ResultStatus; label: string }[] = [
  { status: 'keep', label: 'Keep' },
  { status: 'maybe', label: 'Maybe' },
  { status: 'reject', label: 'Reject' },
];

/**
 * Action bar for the board / side-panel select mode.
 *
 * Renders whenever select mode is active — including with an empty
 * selection, where it doubles as the mode's instructions and exit point.
 */
export function BulkActionBar({ count, visibleCount, tags, onClassify, onTag, onRemove, onSelectAllVisible, onClear, onDone }: Props) {
  const [tagMenuOpen, setTagMenuOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!tagMenuOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setTagMenuOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setTagMenuOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [tagMenuOpen]);

  const allVisibleSelected = visibleCount > 0 && count >= visibleCount;

  return (
    <div ref={rootRef} className="bulk-bar" role="region" aria-label="Bulk actions">
      <span className="bulk-count">
        {count > 0 ? `${count} selected` : 'Select results to act on them together'}
      </span>
      <div className="bulk-actions">
        <button className="button" disabled={allVisibleSelected || visibleCount === 0} onClick={onSelectAllVisible}>
          Select all visible{visibleCount > 0 ? ` (${visibleCount})` : ''}
        </button>
        {STATUS_ACTIONS.map(({ status, label }) => (
          <button key={status} className="button" disabled={count === 0} onClick={() => onClassify(status)}>
            {label}
          </button>
        ))}
        <div className="bulk-tag">
          <button
            className="button"
            disabled={count === 0 || tags.length === 0}
            aria-expanded={tagMenuOpen}
            aria-haspopup="menu"
            title={tags.length === 0 ? 'Create a tag first' : 'Add or remove a tag'}
            onClick={() => setTagMenuOpen(!tagMenuOpen)}
          >
            <Tags size={14} /> Tag
          </button>
          {tagMenuOpen && (
            <div className="bulk-tag-menu" role="menu">
              {tags.map((tag) => (
                <div key={tag.id} className="bulk-tag-row">
                  <span className="tag" style={{ '--tag': tag.color } as React.CSSProperties}>{tag.name}</span>
                  <button
                    className="icon-button"
                    aria-label={`Add tag ${tag.name} to selected`}
                    title="Add to selected"
                    onClick={() => { onTag(tag.id, 'add'); setTagMenuOpen(false); }}
                  >
                    <Plus size={13} />
                  </button>
                  <button
                    className="icon-button"
                    aria-label={`Remove tag ${tag.name} from selected`}
                    title="Remove from selected"
                    onClick={() => { onTag(tag.id, 'remove'); setTagMenuOpen(false); }}
                  >
                    <Minus size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        <button
          className="button danger"
          disabled={count === 0}
          onClick={() => { if (confirm(`Remove ${count} selected result${count !== 1 ? 's' : ''} from this project?`)) onRemove(); }}
        >
          <Trash2 size={14} /> Remove
        </button>
        <button className="button" disabled={count === 0} onClick={onClear}>
          Clear
        </button>
        <button className="icon-button" aria-label="Exit select mode" title="Exit select mode" onClick={onDone}>
          <X size={15} />
        </button>
      </div>
    </div>
  );
}
