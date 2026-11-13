import { Keyboard, X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import type { KeyboardShortcuts } from '../models/types';
import { SHORTCUT_LABELS } from './ShortcutConfig';

interface Props {
  open: boolean;
  shortcuts: KeyboardShortcuts;
  onClose(): void;
}

const BUILT_IN_ROWS: { label: string; combo: string }[] = [
  { label: 'Open focused result', combo: 'Enter' },
  { label: 'Stop keyboard navigation', combo: 'Esc' },
  { label: 'Select for comparison', combo: 'Ctrl / ⌘ + Click' },
  { label: 'Show this help', combo: '?' },
];

/**
 * In-context shortcut reference for the board and side panel.
 *
 * The configurable combos come straight from settings, so the dialog always
 * shows the bindings the user actually has — the same source ShortcutConfig
 * edits on the options page.
 */
export function ShortcutHelp({ open, shortcuts, onClose }: Props) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

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

  const configurable = (Object.entries(SHORTCUT_LABELS) as [keyof KeyboardShortcuts, string][]).map(
    ([key, label]) => ({ label, combo: shortcuts[key] })
  );

  return (
    <div className="modal-overlay" onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="shortcut-help-title">
        <div className="modal-header">
          <h2 id="shortcut-help-title"><Keyboard size={18} /> Keyboard shortcuts</h2>
          <button ref={closeButtonRef} className="icon-button" aria-label="Close shortcut help" onClick={onClose}>
            <X size={16} />
          </button>
        </div>
        <div className="modal-body">
          <dl className="shortcut-list">
            {[...configurable, ...BUILT_IN_ROWS].map((row) => (
              <div key={row.label} className="shortcut-row">
                <dt>{row.label}</dt>
                <dd><kbd>{row.combo}</kbd></dd>
              </div>
            ))}
          </dl>
          <p className="muted">Navigation shortcuts work on the board and in the side panel. You can rebind them in Settings → Keyboard shortcuts.</p>
        </div>
      </div>
    </div>
  );
}
