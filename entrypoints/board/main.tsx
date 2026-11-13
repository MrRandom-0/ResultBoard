import React from 'react';
import ReactDOM from 'react-dom/client';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Archive,
  ArchiveRestore,
  BarChart3,
  ChevronDown,
  ChevronRight,
  CopyCheck,
  Download,
  FolderPlus,
  Grid,
  Keyboard,
  List,
  ListChecks,
  Plus,
} from 'lucide-react';
import { Logo } from '../../src/components/Logo';
import { ResultCard } from '../../src/components/ResultCard';
import { FilterBar } from '../../src/components/FilterBar';
import { EmptyState } from '../../src/components/EmptyState';
import { ComparisonView } from '../../src/components/ComparisonView';
import { BulkActionBar } from '../../src/components/BulkActionBar';
import { ShortcutHelp } from '../../src/components/ShortcutHelp';
import { DuplicatesDialog } from '../../src/components/DuplicatesDialog';
import { KeyboardNavProvider, useKeyboardNav } from '../../src/components/KeyboardNav';
import { useAppState } from '../../src/hooks/use-app-state';
import { useTheme } from '../../src/hooks/use-theme';
import { filterRecords, findDuplicateGroups, sortRecords, type RecordFilters, type SortKey } from '../../src/utils/records';
import { downloadText, recordsToCsv } from '../../src/utils/csv';
import { recordsToJson, recordsToMarkdown, recordsToHtml } from '../../src/utils/export';
import type { ResultStatus, SearchResultRecord, Tag } from '../../src/models/types';
import '../../src/styles/base.css';
import './style.css';

type ViewMode = 'list' | 'grid' | 'comparison';
const initialFilters: RecordFilters = { query: '', statuses: [], tagIds: [], domain: '', hasNote: null };

function BoardContent({
  records,
  view,
  compact,
  tags,
  selectedIds,
  onToggleSelect,
  selectMode,
  bulkIds,
  onToggleBulk,
  onUpdate,
  onRemove,
}: {
  records: SearchResultRecord[];
  view: ViewMode;
  compact: boolean;
  tags: Tag[];
  selectedIds: Set<string>;
  onToggleSelect(id: string): void;
  selectMode: boolean;
  bulkIds: Set<string>;
  onToggleBulk(id: string): void;
  onUpdate(id: string, patch: { status?: ResultStatus; notes?: string; tagIds?: string[]; criterionScores?: Record<string, number> }): Promise<unknown>;
  onRemove(id: string): Promise<unknown>;
}) {
  const { active, focusIndex, setTotalItems } = useKeyboardNav();

  // Keep the total items count in sync
  React.useEffect(() => {
    setTotalItems(records.length);
  }, [records.length, setTotalItems]);

  const containerClass = view === 'grid' ? 'board-grid' : 'board-list';

  return (
    <section className={containerClass} aria-live="polite">
      {records.map((record, index) => (
        <div
          key={record.id}
          className={`board-item ${(selectMode ? bulkIds : selectedIds).has(record.id) ? 'selected' : ''} ${active && focusIndex === index ? 'keyboard-focused' : ''}`}
          onClick={(e) => {
            if (selectMode) {
              // Whole-card toggle, except when the click lands on a control
              // or link inside the card (those keep their own behaviour).
              if (!(e.target as HTMLElement).closest('a, button, input, textarea, select, label')) {
                onToggleBulk(record.id);
              }
            } else if (e.ctrlKey || e.metaKey) {
              onToggleSelect(record.id);
            }
          }}
        >
          <ResultCard
            record={record}
            tags={tags}
            compact={compact}
            selected={(selectMode ? bulkIds : selectedIds).has(record.id)}
            onToggleSelect={() => (selectMode ? onToggleBulk(record.id) : onToggleSelect(record.id))}
            selectionPurpose={selectMode ? 'bulk actions' : 'comparison'}
            onUpdate={(patch) => onUpdate(record.id, patch)}
            onRemove={() => onRemove(record.id)}
          />
        </div>
      ))}
      {records.length === 0 && <EmptyState filtered={false} />}
    </section>
  );
}

function App() {
  const { state, error, loading, dispatch, setError } = useAppState();
  const [view, setView] = useState<ViewMode>('list');
  const [filters, setFilters] = useState(initialFilters);
  const [sort, setSort] = useState<SortKey>('newest');
  const [showArchived, setShowArchived] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectMode, setSelectMode] = useState(false);
  const [bulkIds, setBulkIds] = useState<Set<string>>(new Set());
  const [showHelp, setShowHelp] = useState(false);
  const [showDuplicates, setShowDuplicates] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [creatingProject, setCreatingProject] = useState(false);
  const [projectName, setProjectName] = useState('');
  const exportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showExportMenu) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!exportRef.current?.contains(event.target as Node)) setShowExportMenu(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setShowExportMenu(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [showExportMenu]);

  const createProject = async () => {
    const name = projectName.trim();
    if (!name) return;
    await dispatch({ type: 'CREATE_PROJECT', name });
    setProjectName('');
    setCreatingProject(false);
  };

  useTheme(state?.settings.theme, state?.settings.fontSize, state?.settings.accentColor, state?.settings.animationSpeed);

  const activeProjects = useMemo(() => state?.projects.filter((p) => p.status === 'active') ?? [], [state]);
  const archivedProjects = useMemo(() => state?.projects.filter((p) => p.status === 'archived') ?? [], [state]);
  const active = state?.projects.find((p) => p.id === state.activeProjectId);
  const projectRecords = useMemo(
    () => state?.records.filter((r) => r.projectId === state.activeProjectId) ?? [],
    [state]
  );
  const projectTags = useMemo(
    () => state?.tags.filter((t) => t.projectId === state.activeProjectId) ?? [],
    [state]
  );
  const projectCriteria = useMemo(
    () => state?.comparisonCriteria.filter((c) => c.projectId === state.activeProjectId) ?? [],
    [state]
  );

  const visible = sortRecords(filterRecords(projectRecords, filters), sort);
  const selectedRecords = visible.filter((r) => selectedIds.has(r.id));
  const duplicateGroups = useMemo(() => findDuplicateGroups(projectRecords), [projectRecords]);
  const duplicateCount = duplicateGroups.reduce((sum, group) => sum + group.duplicates.length, 0);

  // Bulk selection belongs to one project and one mode; reset both whenever
  // the user switches project.
  const activeProjectId = state?.activeProjectId;
  useEffect(() => {
    setBulkIds(new Set());
    setSelectMode(false);
  }, [activeProjectId]);

  // "?" opens the shortcut help from anywhere outside a text field.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== '?') return;
      const target = event.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable) return;
      setShowHelp(true);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  const toggleBulk = (id: string) => {
    setBulkIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < 500) next.add(id);
      return next;
    });
  };

  const bulkIdsList = () => [...bulkIds];

  const exitSelectMode = () => {
    setSelectMode(false);
    setBulkIds(new Set());
  };

  const handleClassify = (index: number, status: ResultStatus) => {
    const record = visible[index];
    if (record) {
      void dispatch({ type: 'UPDATE_RECORD', recordId: record.id, patch: { status } });
    }
  };

  const handleOpen = (index: number) => {
    const record = visible[index];
    if (record) {
      window.open(record.url, '_blank', 'noopener');
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size < 4) {
        next.add(id);
      }
      return next;
    });
  };

  const exportProject = (format: 'csv' | 'json' | 'markdown' | 'html') => {
    if (!active || !state) return;
    setShowExportMenu(false);
    const name = active.name.replace(/\W+/g, '-').toLowerCase();
    switch (format) {
      case 'csv':
        downloadText(`${name}.csv`, recordsToCsv(projectRecords, active, state.tags), 'text/csv');
        break;
      case 'json':
        downloadText(`${name}.json`, recordsToJson(state, active.id), 'application/json');
        break;
      case 'markdown':
        downloadText(`${name}.md`, recordsToMarkdown(projectRecords, active, state.tags), 'text/markdown');
        break;
      case 'html':
        downloadText(`${name}.html`, recordsToHtml(projectRecords, active, state.tags), 'text/html');
        break;
    }
  };

  if (loading || !state) {
    return (
      <main className="loading" aria-label="Loading ResultBoard">
        <Logo />
        <div className="spinner" />
      </main>
    );
  }

  return (
    <KeyboardNavProvider
      shortcuts={state.settings.shortcuts}
      onClassify={handleClassify}
      onOpen={handleOpen}
    >
      <main className="board-page">
        {/* Sidebar */}
        <aside className="board-sidebar">
          <Logo />

          <div className="sidebar-section">
            <h3>Projects</h3>
            {activeProjects.map((project) => (
              <button
                key={project.id}
                className={`sidebar-project ${project.id === state.activeProjectId ? 'active' : ''}`}
                onClick={() => void dispatch({ type: 'SWITCH_PROJECT', projectId: project.id })}
              >
                {project.name}
                <span className="project-count">
                  {state.records.filter((r) => r.projectId === project.id).length}
                </span>
              </button>
            ))}
            {creatingProject ? (
              <form
                className="sidebar-project-create"
                onSubmit={(event) => {
                  event.preventDefault();
                  void createProject();
                }}
              >
                <input autoFocus maxLength={80} placeholder="Project name" value={projectName} onChange={(event) => setProjectName(event.target.value)} />
                <button className="button primary" type="submit" disabled={!projectName.trim()}>Create</button>
              </form>
            ) : (
              <button className="sidebar-project" onClick={() => setCreatingProject(true)}>
                <Plus size={14} /> New project
              </button>
            )}
          </div>

          {archivedProjects.length > 0 && (
            <div className="sidebar-section">
              <button className="archived-toggle" onClick={() => setShowArchived(!showArchived)}>
                {showArchived ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                Archived ({archivedProjects.length})
              </button>
              {showArchived &&
                archivedProjects.map((project) => (
                  <div key={project.id} className="sidebar-project">
                    <span>{project.name}</span>
                    <button
                      className="icon-button"
                      title="Unarchive"
                      aria-label={`Unarchive ${project.name}`}
                      onClick={() => void dispatch({ type: 'UNARCHIVE_PROJECT', projectId: project.id })}
                    >
                      <ArchiveRestore size={14} />
                    </button>
                  </div>
                ))}
            </div>
          )}
        </aside>

        {/* Header */}
        <header className="board-header">
          <h1>{active?.name ?? 'ResultBoard'}</h1>

          <div className="board-toolbar">
            {active && (
              <button
                className="icon-button"
                title="Archive project"
                aria-label="Archive project"
                onClick={() => void dispatch({ type: 'ARCHIVE_PROJECT', projectId: active.id })}
              >
                <Archive size={16} />
              </button>
            )}

            <div className="view-switcher">
              <button
                className={view === 'list' ? 'active' : ''}
                onClick={() => setView('list')}
                aria-label="List view"
              >
                <List size={14} /> List
              </button>
              <button
                className={view === 'grid' ? 'active' : ''}
                onClick={() => setView('grid')}
                aria-label="Grid view"
              >
                <Grid size={14} /> Grid
              </button>
              <button
                className={view === 'comparison' ? 'active' : ''}
                onClick={() => {
                  exitSelectMode();
                  setView('comparison');
                }}
                aria-label="Comparison view"
              >
                <BarChart3 size={14} /> Compare
              </button>
            </div>

            <button
              className="icon-button"
              title="Select results for bulk actions"
              aria-label="Select results for bulk actions"
              aria-pressed={selectMode}
              disabled={!active || view === 'comparison'}
              onClick={() => (selectMode ? exitSelectMode() : setSelectMode(true))}
            >
              <ListChecks size={16} />
            </button>

            {duplicateCount > 0 && (
              <button
                className="icon-button"
                title={`Clean up ${duplicateCount} duplicate result${duplicateCount !== 1 ? 's' : ''}`}
                aria-label={`Clean up ${duplicateCount} duplicate results`}
                onClick={() => setShowDuplicates(true)}
              >
                <CopyCheck size={16} />
              </button>
            )}

            <button
              className="icon-button"
              title="Keyboard shortcuts (?)"
              aria-label="Keyboard shortcuts"
              onClick={() => setShowHelp(true)}
            >
              <Keyboard size={16} />
            </button>

            <div ref={exportRef} className="export-dropdown">
              <button
                className="icon-button"
                title="Export"
                aria-label="Export"
                aria-expanded={showExportMenu}
                aria-haspopup="menu"
                disabled={!active}
                onClick={() => setShowExportMenu(!showExportMenu)}
              >
                <Download size={16} />
              </button>
              {showExportMenu && (
                <div className="export-menu" role="menu">
                  <button role="menuitem" onClick={() => exportProject('csv')}>Export as CSV</button>
                  <button role="menuitem" onClick={() => exportProject('json')}>Export as JSON</button>
                  <button role="menuitem" onClick={() => exportProject('markdown')}>Export as Markdown</button>
                  <button role="menuitem" onClick={() => exportProject('html')}>Export as HTML</button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="board-content">
          {error && <div className="error" role="alert">{error}<button aria-label="Dismiss error" onClick={() => setError('')}>×</button></div>}
          {!active ? (
            <section className="welcome">
              <FolderPlus size={32} />
              <h2>Select or create a project</h2>
              <p>Use the sidebar to choose a project or create a new one.</p>
            </section>
          ) : (
            <>
              <FilterBar
                filters={filters}
                setFilters={setFilters}
                sort={sort}
                setSort={setSort}
                tags={projectTags}
                domains={[...new Set(projectRecords.map((r) => r.domain))].sort()}
                onCreateTag={(name) =>
                  dispatch({ type: 'CREATE_TAG', projectId: active.id, name, color: '#668b74' })
                }
              />

              {selectMode && view !== 'comparison' ? (
                <BulkActionBar
                  count={bulkIds.size}
                  visibleCount={visible.length}
                  tags={projectTags}
                  onClassify={(status) => { const ids = bulkIdsList(); if (ids.length) void dispatch({ type: 'BULK_CLASSIFY', recordIds: ids, status }); }}
                  onTag={(tagId, mode) => { const ids = bulkIdsList(); if (ids.length) void dispatch({ type: 'BULK_UPDATE_TAGS', recordIds: ids, tagIds: [tagId], mode }); }}
                  onRemove={() => { const ids = bulkIdsList(); if (ids.length) { void dispatch({ type: 'BULK_REMOVE_RECORDS', recordIds: ids }); setBulkIds(new Set()); } }}
                  onSelectAllVisible={() => setBulkIds(new Set(visible.slice(0, 500).map((record) => record.id)))}
                  onClear={() => setBulkIds(new Set())}
                  onDone={exitSelectMode}
                />
              ) : selectedIds.size > 0 && view !== 'comparison' && (
                <div className="comparison-select-hint">
                  {selectedIds.size} result{selectedIds.size !== 1 ? 's' : ''} selected (max 4)
                  <button
                    className="button"
                    disabled={selectedIds.size < 2}
                    onClick={() => setView('comparison')}
                  >
                    Compare selected
                  </button>
                  <button className="button" onClick={() => setSelectedIds(new Set())}>
                    Clear
                  </button>
                </div>
              )}

              {view === 'comparison' ? (
                <ComparisonView
                  records={selectedRecords.length >= 2 ? selectedRecords : visible.slice(0, 4)}
                  criteria={projectCriteria}
                  tags={state.tags}
                  onClose={() => setView('list')}
                  onUpdate={(recordId, criterionScores) => dispatch({ type: 'UPDATE_RECORD', recordId, patch: { criterionScores } })}
                />
              ) : (
                <BoardContent
                  records={visible}
                  view={view}
                  compact={state.settings.density === 'compact'}
                  tags={state.tags}
                  selectedIds={selectedIds}
                  onToggleSelect={toggleSelect}
                  selectMode={selectMode}
                  bulkIds={bulkIds}
                  onToggleBulk={toggleBulk}
                  onUpdate={(id, patch) => dispatch({ type: 'UPDATE_RECORD', recordId: id, patch })}
                  onRemove={(id) => dispatch({ type: 'REMOVE_RECORD', recordId: id })}
                />
              )}
            </>
          )}
        </div>
        <ShortcutHelp open={showHelp} shortcuts={state.settings.shortcuts} onClose={() => setShowHelp(false)} />
        <DuplicatesDialog
          open={showDuplicates}
          groups={duplicateGroups}
          onRemoveIds={(ids) => dispatch({ type: 'BULK_REMOVE_RECORDS', recordIds: ids })}
          onClose={() => setShowDuplicates(false)}
        />
      </main>
    </KeyboardNavProvider>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
