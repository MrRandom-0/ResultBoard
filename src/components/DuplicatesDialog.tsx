import { CopyCheck, Trash2, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { DuplicateGroup } from '../utils/records';

interface Props {
  open: boolean;
  groups: DuplicateGroup[];
  onRemoveIds(ids: string[]): Promise<unknown>;
  onClose(): void;
}

/**
 * Review and clean up duplicate saves of the same URL in a project.
 *
 * Duplicates can only appear via a merge import (classifying dedupes by
 * canonical URL), so this is a maintenance dialog, opened from the board
 * toolbar only when groups exist.
 */
export function DuplicatesDialog({ open, groups, onRemoveIds, onClose }: Props) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [busy, setBusy] = useState(false);
  const totalDuplicates = groups.reduce((sum, group) => sum + group.duplicates.length, 0);

  useEffect(() => {
    if (!open) return;
    closeButtonRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const remove = async (ids: string[]) => {
    setBusy(true);
    try {
      await onRemoveIds(ids);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="duplicates-title">
        <div className="modal-header">
          <h2 id="duplicates-title"><CopyCheck size={18} /> Duplicate results</h2>
          <button ref={closeButtonRef} className="icon-button" aria-label="Close duplicates" onClick={onClose}>
            <X size={16} />
          </button>
        </div>
        <div className="modal-body">
          {groups.length === 0 ? (
            <p className="muted">All duplicates are cleaned up. Every URL in this project is now saved exactly once.</p>
          ) : (
            <>
              <p className="muted">
                These URLs are saved more than once — usually after merging a backup from another profile.
                Cleanup keeps the earliest copy (the one classifying updates in place). Notes and tags that
                exist only on a duplicate copy are removed along with it.
              </p>
              {groups.map((group) => (
                <div key={group.canonicalUrl} className="duplicate-group">
                  <div className="duplicate-head">
                    <a href={group.keeper.url} target="_blank" rel="noreferrer">{group.keeper.title}</a>
                    <span>{group.keeper.domain}</span>
                  </div>
                  <ul className="duplicate-list">
                    <li>
                      <span className={`badge ${group.keeper.status}`}>{group.keeper.status}</span>
                      Saved {new Date(group.keeper.createdAt).toLocaleDateString()} — kept
                    </li>
                    {group.duplicates.map((record) => (
                      <li key={record.id}>
                        <span className={`badge ${record.status}`}>{record.status}</span>
                        Saved {new Date(record.createdAt).toLocaleDateString()} — duplicate
                      </li>
                    ))}
                  </ul>
                  <button
                    className="button"
                    disabled={busy}
                    onClick={() => void remove(group.duplicates.map((record) => record.id))}
                  >
                    <Trash2 size={14} /> Keep earliest, remove {group.duplicates.length}
                  </button>
                </div>
              ))}
            </>
          )}
        </div>
        {groups.length > 1 && (
          <div className="modal-footer">
            <button
              className="button danger"
              disabled={busy}
              onClick={() => void remove(groups.flatMap((group) => group.duplicates.map((record) => record.id)))}
            >
              Remove all {totalDuplicates} duplicates
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
