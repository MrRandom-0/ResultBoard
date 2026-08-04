import { AlertTriangle, CheckCircle, FileUp, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { migrateDatabase } from '../storage/migrations';
import type { StoredDatabase } from '../models/types';

interface Props {
  open: boolean;
  onClose(): void;
  onImport(data: StoredDatabase, mode: 'merge' | 'replace'): Promise<void>;
}

interface ImportPreview {
  projectCount: number;
  recordCount: number;
  tagCount: number;
  criteriaCount: number;
  data: StoredDatabase;
}

export function ImportDialog({ open, onClose, onImport }: Props) {
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [mode, setMode] = useState<'merge' | 'replace'>('merge');
  const [importing, setImporting] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const reset = useCallback(() => {
    setPreview(null);
    setErrors([]);
    setImporting(false);
  }, []);
  const close = useCallback(() => {
    reset();
    onClose();
  }, [onClose, reset]);

  useEffect(() => {
    if (!open) return;
    closeButtonRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
      if (event.key !== 'Tab') return;
      const focusable = modalRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href]');
      if (!focusable?.length) return;
      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, close]);

  if (!open) return null;

  const handleFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const raw: unknown = JSON.parse(reader.result as string) as unknown;
        const data = migrateDatabase(raw);
        setErrors([]);
        setPreview({
          projectCount: data.projects.length,
          recordCount: data.records.length,
          tagCount: data.tags.length,
          criteriaCount: data.comparisonCriteria.length,
          data,
        });
      } catch (error) {
        setPreview(null);
        setErrors([error instanceof Error ? error.message : 'Invalid ResultBoard backup.']);
      }
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!preview) return;
    setImporting(true);
    try {
      await onImport(preview.data, mode);
      close();
    } catch (err) {
      setErrors([err instanceof Error ? err.message : 'Import failed.']);
      setImporting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(event) => { if (event.target === event.currentTarget) close(); }}>
      <div ref={modalRef} className="modal" role="dialog" aria-modal="true" aria-labelledby="import-title">
        <div className="modal-header">
          <h2 id="import-title"><FileUp size={18} /> Import Data</h2>
          <button ref={closeButtonRef} className="icon-button" aria-label="Close" onClick={close}>
            <X size={16} />
          </button>
        </div>

        <div className="modal-body">
          <label className="file-input-label">
            <input
              type="file"
              accept=".json,application/json"
              onChange={handleFile}
              className="file-input"
            />
            <span className="button">Choose JSON file</span>
          </label>

          {errors.length > 0 && (
            <div className="import-errors">
              <AlertTriangle size={16} />
              <div>
                <strong>Validation errors:</strong>
                <ul>
                  {errors.map((error, i) => (
                    <li key={i}>{error}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {preview && (
            <div className="import-preview">
              <CheckCircle size={16} />
              <div>
                <strong>Ready to import:</strong>
                <ul>
                  <li>{preview.projectCount} project{preview.projectCount !== 1 ? 's' : ''}</li>
                  <li>{preview.recordCount} record{preview.recordCount !== 1 ? 's' : ''}</li>
                  <li>{preview.tagCount} tag{preview.tagCount !== 1 ? 's' : ''}</li>
                  <li>{preview.criteriaCount} criteria</li>
                </ul>
              </div>
            </div>
          )}

          {preview && (
            <fieldset className="import-mode">
              <legend>Import mode</legend>
              <label>
                <input
                  type="radio"
                  name="import-mode"
                  value="merge"
                  checked={mode === 'merge'}
                  onChange={() => setMode('merge')}
                />
                <span>
                  <strong>Merge</strong>
                  <small>Add imported data alongside existing data</small>
                </span>
              </label>
              <label>
                <input
                  type="radio"
                  name="import-mode"
                  value="replace"
                  checked={mode === 'replace'}
                  onChange={() => setMode('replace')}
                />
                <span>
                  <strong>Replace</strong>
                  <small>Replace all existing data with imported data</small>
                </span>
              </label>
            </fieldset>
          )}
        </div>

        {preview && (
          <div className="modal-footer">
            <button className="button" onClick={close}>Cancel</button>
            <button className="button primary" disabled={importing} onClick={() => void handleImport()}>
              {importing ? 'Importing...' : `Import (${mode})`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
