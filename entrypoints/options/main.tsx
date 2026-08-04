import React from 'react';
import ReactDOM from 'react-dom/client';
import { useState } from 'react';
import { Archive, Database, Download, FileUp, Gauge, Palette, Plus, RotateCcw, Scale, Shield, Sliders, Trash2, Type, X, Zap } from 'lucide-react';
import { Logo } from '../../src/components/Logo';
import { ShortcutConfig } from '../../src/components/ShortcutConfig';
import { ImportDialog } from '../../src/components/ImportDialog';
import { useAppState } from '../../src/hooks/use-app-state';
import { useTheme } from '../../src/hooks/use-theme';
import { downloadText, recordsToCsv } from '../../src/utils/csv';
import { recordsToJson, recordsToMarkdown, recordsToHtml } from '../../src/utils/export';
import type { AnimationSpeed, FontSize, KeyboardShortcuts, RejectedDisplay, StoredDatabase, Theme } from '../../src/models/types';
import '../../src/styles/base.css';
import './style.css';

const ACCENT_PRESETS: Array<{ name: string; color: string }> = [
  { name: 'Indigo', color: '#6366f1' },
  { name: 'Violet', color: '#8b5cf6' },
  { name: 'Rose', color: '#f43f5e' },
  { name: 'Amber', color: '#f59e0b' },
  { name: 'Emerald', color: '#10b981' },
  { name: 'Cyan', color: '#06b6d4' },
  { name: 'Slate', color: '#64748b' },
  { name: 'Fuchsia', color: '#d946ef' }
];

function App() {
  const { state, error, loading, dispatch } = useAppState();
  const [importOpen, setImportOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<'json' | 'csv' | 'markdown' | 'html'>('json');
  const [criterionName, setCriterionName] = useState('');
  const [criterionWeight, setCriterionWeight] = useState(50);
  useTheme(
    state?.settings.theme,
    state?.settings.fontSize,
    state?.settings.accentColor,
    state?.settings.animationSpeed
  );

  if (loading || !state) return <div className="spinner" />;

  const setting = <K extends keyof typeof state.settings>(
    key: K,
    value: (typeof state.settings)[K]
  ) => void dispatch({ type: 'UPDATE_SETTINGS', patch: { [key]: value } });

  const handleImport = async (data: StoredDatabase, mode: 'merge' | 'replace') => {
    await dispatch({ type: 'IMPORT_DATABASE', data, mode });
  };

  const handleShortcutsUpdate = (shortcuts: KeyboardShortcuts) => {
    void dispatch({ type: 'UPDATE_SETTINGS', patch: { shortcuts } });
  };

  const handleExport = () => {
    const project = state.projects.find((p) => p.id === state.activeProjectId);
    if (!project) {
      downloadText(
        `resultboard-backup-${new Date().toISOString().slice(0, 10)}.json`,
        JSON.stringify(state, null, 2),
        'application/json'
      );
      return;
    }
    const name = project.name.replace(/\W+/g, '-').toLowerCase();
    const records = state.records.filter((r) => r.projectId === project.id);
    switch (exportFormat) {
      case 'csv':
        downloadText(`${name}.csv`, recordsToCsv(records, project, state.tags), 'text/csv');
        break;
      case 'json':
        downloadText(`${name}.json`, recordsToJson(state, project.id), 'application/json');
        break;
      case 'markdown':
        downloadText(`${name}.md`, recordsToMarkdown(records, project, state.tags), 'text/markdown');
        break;
      case 'html':
        downloadText(`${name}.html`, recordsToHtml(records, project, state.tags), 'text/html');
        break;
    }
  };

  const handleBackup = () => {
    downloadText(
      `resultboard-backup-${new Date().toISOString().slice(0, 10)}.json`,
      JSON.stringify(state, null, 2),
      'application/json'
    );
  };

  const activeProject = state.projects.find((project) => project.id === state.activeProjectId);
  const activeCriteria = state.comparisonCriteria.filter((criterion) => criterion.projectId === state.activeProjectId);

  return (
    <main>
      <header>
        <Logo />
        <span>Settings</span>
      </header>
      {error && <div className="error">{error}</div>}

      <section>
        <h2>Appearance</h2>
        <div className="setting">
          <div>
            <strong>Theme</strong>
            <p>Choose how ResultBoard looks.</p>
          </div>
          <select
            aria-label="Theme"
            value={state.settings.theme}
            onChange={(e) => setting('theme', e.target.value as Theme)}
          >
            <option value="system">System</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </div>
        <div className="setting">
          <div>
            <strong>Rejected results on Google</strong>
            <p>Fade is the calm default. Hover to review.</p>
          </div>
          <select
            aria-label="Rejected display"
            value={state.settings.rejectedDisplay}
            onChange={(e) => setting('rejectedDisplay', e.target.value as RejectedDisplay)}
          >
            <option value="fade">Fade</option>
            <option value="hide">Hide</option>
            <option value="show">Show normally</option>
          </select>
        </div>
        <div className="setting">
          <div>
            <strong>Density</strong>
            <p>Comfortable shows snippets and details. Compact saves space.</p>
          </div>
          <select
            aria-label="Density"
            value={state.settings.density}
            onChange={(e) => setting('density', e.target.value as 'comfortable' | 'compact')}
          >
            <option value="comfortable">Comfortable</option>
            <option value="compact">Compact</option>
          </select>
        </div>
      </section>

      <section>
        <h2 className="section-title"><Palette size={16} /> Personalization</h2>
        <div className="setting">
          <div>
            <strong><Type size={14} /> Font Size</strong>
            <p>Adjust the base text size across the interface.</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <select
              aria-label="Font size"
              value={state.settings.fontSize}
              onChange={(e) => setting('fontSize', e.target.value as FontSize)}
            >
              <option value="small">Small (13px)</option>
              <option value="medium">Medium (14px)</option>
              <option value="large">Large (16px)</option>
            </select>
            <span className="font-size-preview">{state.settings.fontSize}</span>
          </div>
        </div>
        <div className="setting">
          <div>
            <strong><Palette size={14} /> Accent Color</strong>
            <p>Applied to buttons, badges, focus rings, and active states.</p>
          </div>
          <div className="color-swatches">
            {ACCENT_PRESETS.map((preset) => (
              <button
                key={preset.color}
                className={`color-swatch${state.settings.accentColor === preset.color ? ' active' : ''}`}
                style={{ backgroundColor: preset.color }}
                onClick={() => setting('accentColor', preset.color)}
                aria-label={`Select ${preset.name} accent color`}
                title={preset.name}
              />
            ))}
          </div>
        </div>
        <div className="setting">
          <div>
            <strong><Zap size={14} /> Animation Speed</strong>
            <p>Reduce or disable motion for accessibility or preference.</p>
          </div>
          <select
            aria-label="Animation speed"
            value={state.settings.animationSpeed}
            onChange={(e) => setting('animationSpeed', e.target.value as AnimationSpeed)}
          >
            <option value="normal">Normal</option>
            <option value="reduced">Reduced</option>
            <option value="none">None</option>
          </select>
        </div>
      </section>

      <section>
        <h2 className="section-title"><Sliders size={16} /> Behavior</h2>
        <div className="setting">
          <div>
            <strong><Archive size={14} /> Auto-archive after</strong>
            <p>Automatically archive projects with no activity. Set to 0 to disable.</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <input
              type="number"
              aria-label="Auto-archive days"
              min={0}
              max={365}
              value={state.settings.autoArchiveDays}
              onChange={(e) => {
                const val = Math.max(0, Math.min(365, parseInt(e.target.value, 10) || 0));
                setting('autoArchiveDays', val);
              }}
            />
            <span style={{ color: 'var(--muted)', fontSize: '12px' }}>days</span>
          </div>
        </div>
        <div className="setting">
          <div>
            <strong><Gauge size={14} /> Max results warning</strong>
            <p>Show a warning when a project exceeds this many results.</p>
          </div>
          <input
            type="number"
            aria-label="Max results warning threshold"
            min={10}
            max={10000}
            value={state.settings.maxResultsWarning}
            onChange={(e) => {
              const val = Math.max(10, Math.min(10000, parseInt(e.target.value, 10) || 500));
              setting('maxResultsWarning', val);
            }}
          />
        </div>
      </section>

      <section>
        <h2 className="section-title"><Scale size={16} /> Comparison criteria</h2>
        <p className="section-copy">Create weighted criteria for the active project. These are shown in comparison mode.</p>
        {!activeProject ? (
          <p className="muted">Create or select a project first.</p>
        ) : (
          <>
            <div className="criteria-list">
              {activeCriteria.map((criterion) => (
                <div className="criterion-setting" key={criterion.id}>
                  <input
                    aria-label={`Name for ${criterion.name}`}
                    defaultValue={criterion.name}
                    maxLength={80}
                    onBlur={(event) => {
                      const name = event.target.value.trim();
                      if (name && name !== criterion.name) void dispatch({ type: 'UPDATE_CRITERION', criterionId: criterion.id, patch: { name } });
                      else event.target.value = criterion.name;
                    }}
                  />
                  <label>
                    <span className="sr-only">Weight for {criterion.name}</span>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={criterion.weight}
                      onChange={(event) => void dispatch({ type: 'UPDATE_CRITERION', criterionId: criterion.id, patch: { weight: Number(event.target.value) } })}
                    />
                    <span>%</span>
                  </label>
                  <button className="icon-button" aria-label={`Remove ${criterion.name}`} onClick={() => void dispatch({ type: 'REMOVE_CRITERION', criterionId: criterion.id })}>
                    <X size={15} />
                  </button>
                </div>
              ))}
              {activeCriteria.length === 0 && <p className="muted">No criteria yet.</p>}
            </div>
            <form
              className="criterion-create"
              onSubmit={(event) => {
                event.preventDefault();
                if (!criterionName.trim()) return;
                void dispatch({ type: 'CREATE_CRITERION', projectId: activeProject.id, name: criterionName, weight: criterionWeight });
                setCriterionName('');
              }}
            >
              <input value={criterionName} maxLength={80} placeholder="Criterion name, e.g. Credibility" onChange={(event) => setCriterionName(event.target.value)} />
              <input aria-label="New criterion weight" type="number" min={0} max={100} value={criterionWeight} onChange={(event) => setCriterionWeight(Number(event.target.value))} />
              <button className="button" type="submit"><Plus size={15} /> Add</button>
            </form>
          </>
        )}
      </section>

      <section>
        <h2>Keyboard Shortcuts</h2>
        <ShortcutConfig shortcuts={state.settings.shortcuts} onUpdate={handleShortcutsUpdate} />
      </section>

      <section>
        <h2>Privacy</h2>
        <div className="privacy">
          <Shield size={20} />
          <p>
            <strong>Your research stays on this device by default.</strong>
            <br />
            ResultBoard stores projects in Chrome local storage. It does not send your
            projects, notes, saved URLs, or search-query context to ResultBoard servers.
            On Google Search pages, the content script reads organic result cards and the
            current query only to organize results in the active local project.
          </p>
        </div>
      </section>

      <section>
        <h2>Data</h2>
        <div className="setting">
          <div>
            <strong>Export format</strong>
            <p>Choose the format for project exports.</p>
          </div>
          <select
            aria-label="Export format"
            value={exportFormat}
            onChange={(e) => setExportFormat(e.target.value as typeof exportFormat)}
          >
            <option value="json">JSON</option>
            <option value="csv">CSV</option>
            <option value="markdown">Markdown</option>
            <option value="html">HTML</option>
          </select>
        </div>
        <div className="action-row">
          <button className="button primary" onClick={handleBackup}>
            <Database size={15} /> Download full backup
          </button>
          <button className="button" onClick={handleExport} disabled={!activeProject}>
            <Download size={15} /> Export active project
          </button>
          <button className="button" onClick={() => setImportOpen(true)}>
            <FileUp size={15} /> Import data
          </button>
          <button
            className="button"
            onClick={() => {
              void setting('onboardingComplete', false);
              void chrome.tabs.create({ url: chrome.runtime.getURL('/onboarding.html') });
            }}
          >
            <RotateCcw size={15} /> Restart onboarding
          </button>
          <button
            className="button danger"
            onClick={() => {
              if (
                confirm(
                  'Delete every ResultBoard project, result, note, and tag from this device? This cannot be undone.'
                )
              )
                void dispatch({ type: 'DELETE_ALL' });
            }}
          >
            <Trash2 size={15} /> Delete all data
          </button>
        </div>
      </section>

      <ImportDialog open={importOpen} onClose={() => setImportOpen(false)} onImport={handleImport} />

      <Footer />
    </main>
  );
}

function Footer() {
  return (
    <footer>
      <span>ResultBoard {chrome.runtime.getManifest().version}</span>
      {' '}- Local-first by design
    </footer>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
