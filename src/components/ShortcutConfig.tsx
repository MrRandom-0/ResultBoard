import { Keyboard } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import type { KeyboardShortcuts } from '../models/types';
import { DEFAULT_SHORTCUTS } from '../models/types';

interface Props {
  shortcuts: KeyboardShortcuts;
  onUpdate(shortcuts: KeyboardShortcuts): void;
}

export const SHORTCUT_LABELS: Record<keyof KeyboardShortcuts, string> = {
  nextResult: 'Next result',
  prevResult: 'Previous result',
  keepResult: 'Mark as Keep',
  maybeResult: 'Mark as Maybe',
  rejectResult: 'Mark as Reject',
  openBoard: 'Open board',
  togglePanel: 'Toggle panel',
};

function keyComboToString(event: KeyboardEvent): string {
  const parts: string[] = [];
  if (event.ctrlKey) parts.push('Ctrl');
  if (event.altKey) parts.push('Alt');
  if (event.shiftKey) parts.push('Shift');
  if (event.metaKey) parts.push('Meta');

  const key = event.key;
  if (!['Control', 'Alt', 'Shift', 'Meta'].includes(key)) {
    parts.push(key.length === 1 ? key.toLowerCase() : key);
  }

  return parts.join('+') || '';
}

export function ShortcutConfig({ shortcuts, onUpdate }: Props) {
  const [recording, setRecording] = useState<keyof KeyboardShortcuts | null>(null);
  const [conflict, setConflict] = useState('');

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!recording) return;
      event.preventDefault();
      event.stopPropagation();

      const combo = keyComboToString(event);
      if (!combo) return;

      // Check for conflicts with other shortcuts
      const entries = Object.entries(shortcuts) as [keyof KeyboardShortcuts, string][];
      const conflicting = entries.find(([key, value]) => key !== recording && value === combo);

      if (conflicting) {
        setConflict(`"${combo}" is already used for "${SHORTCUT_LABELS[conflicting[0]]}"`);
        return;
      }

      setConflict('');
      onUpdate({ ...shortcuts, [recording]: combo });
      setRecording(null);
    },
    [recording, shortcuts, onUpdate]
  );

  useEffect(() => {
    if (recording) {
      document.addEventListener('keydown', handleKeyDown, true);
      return () => document.removeEventListener('keydown', handleKeyDown, true);
    }
  }, [recording, handleKeyDown]);

  const resetToDefaults = () => {
    onUpdate({ ...DEFAULT_SHORTCUTS });
    setConflict('');
  };

  return (
    <div className="shortcut-config">
      <div className="shortcut-header">
        <h3><Keyboard size={16} /> Keyboard Shortcuts</h3>
        <button className="button" onClick={resetToDefaults}>Reset defaults</button>
      </div>

      {conflict && <div className="error">{conflict}</div>}

      <div className="shortcut-list">
        {(Object.entries(SHORTCUT_LABELS) as [keyof KeyboardShortcuts, string][]).map(
          ([key, label]) => (
            <div className="shortcut-row" key={key}>
              <span className="shortcut-label">{label}</span>
              <button
                className={`shortcut-key ${recording === key ? 'recording' : ''}`}
                onClick={() => {
                  setRecording(recording === key ? null : key);
                  setConflict('');
                }}
              >
                {recording === key ? 'Press a key...' : shortcuts[key]}
              </button>
            </div>
          )
        )}
      </div>
    </div>
  );
}
