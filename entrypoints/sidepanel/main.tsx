import React from 'react';
import ReactDOM from 'react-dom/client';
import { BarChart3, Download, ExternalLink, Grid, Keyboard, List, ListChecks, Settings } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Logo } from '../../src/components/Logo';
import { ProjectSwitcher } from '../../src/components/ProjectSwitcher';
import { ResultCard } from '../../src/components/ResultCard';
import { FilterBar } from '../../src/components/FilterBar';
import { EmptyState } from '../../src/components/EmptyState';
import { ComparisonView } from '../../src/components/ComparisonView';
import { BulkActionBar } from '../../src/components/BulkActionBar';
import { ShortcutHelp } from '../../src/components/ShortcutHelp';
import { KeyboardNavProvider, useKeyboardNav } from '../../src/components/KeyboardNav';
import { useAppState } from '../../src/hooks/use-app-state';
import { useTheme } from '../../src/hooks/use-theme';
import { filterRecords, sortRecords, type RecordFilters, type SortKey } from '../../src/utils/records';
import { downloadText, recordsToCsv } from '../../src/utils/csv';
import type { ResultStatus, SearchResultRecord, Tag } from '../../src/models/types';
import '../../src/styles/base.css';
import './style.css';

type Tab = 'keep' | 'maybe' | 'reject' | 'all';
type ViewMode = 'list' | 'grid' | 'comparison';
const initialFilters: RecordFilters = { query: '', statuses: [], tagIds: [], domain: '', hasNote: null };

function ResultList({
  records,
  view,
  tags,
  compact,
  selectedIds,
  onToggleSelect,
  selectMode,
  bulkIds,
  onToggleBulk,
  dispatch,
}: {
  records: SearchResultRecord[];
  view: ViewMode;
  tags: Tag[];
  compact: boolean;
  selectedIds: Set<string>;
  onToggleSelect(id: string): void;
  selectMode: boolean;
  bulkIds: Set<string>;
  onToggleBulk(id: string): void;
  dispatch: ReturnType<typeof useAppState>['dispatch'];
}) {
  const { active, focusIndex, setTotalItems } = useKeyboardNav();

  React.useEffect(() => {
    setTotalItems(records.length);
  }, [records.length, setTotalItems]);

  const containerClass = view === 'grid' ? 'result-grid' : 'result-list';

  return (
    <section className={containerClass} aria-live="polite">
      {records.map((record, index) => (
        <div
          key={record.id}
          className={`result-item ${(selectMode ? bulkIds : selectedIds).has(record.id) ? 'selected' : ''} ${active && focusIndex === index ? 'keyboard-focused' : ''}`}
          onClick={(e) => {
            if (selectMode) {
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
            onUpdate={(patch) => dispatch({ type: 'UPDATE_RECORD', recordId: record.id, patch })}
            onRemove={() => dispatch({ type: 'REMOVE_RECORD', recordId: record.id })}
          />
        </div>
      ))}
      {!records.length && <EmptyState filtered={false} />}
    </section>
  );
}

function App() {
  const { state, error, loading, dispatch, setError } = useAppState();
  const [tab, setTab] = useState<Tab>('keep');
  const [filters, setFilters] = useState(initialFilters);
  const [sort, setSort] = useState<SortKey>('newest');
  const [view, setView] = useState<ViewMode>('list');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectMode, setSelectMode] = useState(false);
  const [bulkIds, setBulkIds] = useState<Set<string>>(new Set());
  const [showHelp, setShowHelp] = useState(false);
  const [projectName, setProjectName] = useState('My research');
  useTheme(state?.settings.theme, state?.settings.fontSize, state?.settings.accentColor, state?.settings.animationSpeed);

  const active = state?.projects.find((project) => project.id === state.activeProjectId);
  const projectRecords = useMemo(
    () => state?.records.filter((record) => record.projectId === state.activeProjectId) ?? [],
    [state]
  );
  const statuses: ResultStatus[] = tab === 'all' ? filters.statuses : [tab];
  const visible = sortRecords(filterRecords(projectRecords, { ...filters, statuses }), sort);
  const projectTags = state?.tags.filter((tag) => tag.projectId === state.activeProjectId) ?? [];
  const projectCriteria = state?.comparisonCriteria.filter((c) => c.projectId === state?.activeProjectId) ?? [];
  const counts = {
    keep: projectRecords.filter((r) => r.status === 'keep').length,
    maybe: projectRecords.filter((r) => r.status === 'maybe').length,
    reject: projectRecords.filter((r) => r.status === 'reject').length,
    all: projectRecords.length,
  };

  const selectedRecords = visible.filter((r) => selectedIds.has(r.id));

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

  const activeProjectId = state?.activeProjectId;
  useEffect(() => {
    setBulkIds(new Set());
    setSelectMode(false);
  }, [activeProjectId]);

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

  const openFullBoard = () => {
    void chrome.tabs.create({ url: chrome.runtime.getURL('/board.html') });
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
      <main className={`board ${state.settings.density}`}>
        <header>
          <Logo />
          <div className="header-actions">
            <button
              className="icon-button"
              title="Open full board"
              aria-label="Open full board"
              onClick={openFullBoard}
            >
              <ExternalLink size={16} />
            </button>
            <button
              className="icon-button"
              title="Export project as CSV"
              aria-label="Export project"
              disabled={!active}
              onClick={() => {
                if (active) downloadText(`${active.name.replace(/\W+/g, '-').toLowerCase()}.csv`, recordsToCsv(projectRecords, active, state.tags), 'text/csv');
              }}
            >
              <Download size={16} />
            </button>
            <button
              className="icon-button"
              title="Keyboard shortcuts (?)"
              aria-label="Keyboard shortcuts"
              onClick={() => setShowHelp(true)}
            >
              <Keyboard size={16} />
            </button>
            <button
              className="icon-button"
              title="Settings"
              aria-label="Settings"
              onClick={() => void chrome.runtime.openOptionsPage()}
            >
              <Settings size={17} />
            </button>
          </div>
        </header>
        <ProjectSwitcher
          projects={state.projects}
          activeId={state.activeProjectId}
          onSwitch={(projectId) => dispatch({ type: 'SWITCH_PROJECT', projectId })}
          onCreate={(name) => dispatch({ type: 'CREATE_PROJECT', name })}
          onRename={(projectId, name) => dispatch({ type: 'RENAME_PROJECT', projectId, name })}
          onArchive={(id) => dispatch({ type: 'ARCHIVE_PROJECT', projectId: id })}
          onUnarchive={(id) => dispatch({ type: 'UNARCHIVE_PROJECT', projectId: id })}
        />
        {error && (
          <div className="error" role="alert">
            {error}
            <button aria-label="Dismiss error" onClick={() => setError('')}>
              x
            </button>
          </div>
        )}
        {!active ? (
          <section className="welcome">
            <div className="welcome-art">
              <span />
              <span />
              <span />
            </div>
            <h1>Start your first research board</h1>
            <p>
              Give every search a focused home. Create as many local projects as you need.
            </p>
            <form className="welcome-create" onSubmit={(event) => {
              event.preventDefault();
              const name = projectName.trim();
              if (name) void dispatch({ type: 'CREATE_PROJECT', name });
            }}>
              <input aria-label="Project name" maxLength={80} value={projectName} onChange={(event) => setProjectName(event.target.value)} />
              <button className="button primary" type="submit" disabled={!projectName.trim()}>Create project</button>
            </form>
          </section>
        ) : (
          <>
            <nav className="tabs" aria-label="Result status">
              {(['keep', 'maybe', 'reject', 'all'] as Tab[]).map((item) => (
                <button
                  key={item}
                  aria-current={tab === item ? 'page' : undefined}
                  onClick={() => setTab(item)}
                >
                  {item === 'reject'
                    ? 'Rejected'
                    : item[0]?.toUpperCase() + item.slice(1)}{' '}
                  <span>{counts[item]}</span>
                </button>
              ))}
            </nav>
            <section className="toolbar">
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
              <div className="density">
                <button
                  className={view === 'list' ? 'active' : ''}
                  aria-label="List view"
                  onClick={() => setView('list')}
                >
                  <List size={15} />
                </button>
                <button
                  className={view === 'grid' ? 'active' : ''}
                  aria-label="Grid view"
                  onClick={() => setView('grid')}
                >
                  <Grid size={15} />
                </button>
                <button
                  className={view === 'comparison' ? 'active' : ''}
                  aria-label="Compare"
                  onClick={() => { exitSelectMode(); setView('comparison'); }}
                >
                  <BarChart3 size={15} />
                </button>
                <button
                  className={selectMode ? 'active' : ''}
                  aria-label="Select results for bulk actions"
                  aria-pressed={selectMode}
                  title="Select results for bulk actions"
                  disabled={view === 'comparison'}
                  onClick={() => (selectMode ? exitSelectMode() : setSelectMode(true))}
                >
                  <ListChecks size={15} />
                </button>
              </div>
            </section>
            <div className="result-summary">
              <span>
                {visible.length} {visible.length === 1 ? 'result' : 'results'}
              </span>
              {(filters.query || filters.domain || filters.tagIds.length || filters.hasNote !== null) && (
                <button onClick={() => setFilters(initialFilters)}>Clear filters</button>
              )}
            </div>

            {selectMode && view !== 'comparison' ? (
              <BulkActionBar
                count={bulkIds.size}
                visibleCount={visible.length}
                tags={projectTags}
                onClassify={(status) => { const ids = [...bulkIds]; if (ids.length) void dispatch({ type: 'BULK_CLASSIFY', recordIds: ids, status }); }}
                onTag={(tagId, mode) => { const ids = [...bulkIds]; if (ids.length) void dispatch({ type: 'BULK_UPDATE_TAGS', recordIds: ids, tagIds: [tagId], mode }); }}
                onRemove={() => { const ids = [...bulkIds]; if (ids.length) { void dispatch({ type: 'BULK_REMOVE_RECORDS', recordIds: ids }); setBulkIds(new Set()); } }}
                onSelectAllVisible={() => setBulkIds(new Set(visible.slice(0, 500).map((record) => record.id)))}
                onClear={() => setBulkIds(new Set())}
                onDone={exitSelectMode}
              />
            ) : selectedIds.size > 0 && view !== 'comparison' && (
              <div className="compare-hint">
                {selectedIds.size} selected (max 4)
                <button
                  className="button"
                  disabled={selectedIds.size < 2}
                  onClick={() => setView('comparison')}
                >
                  Compare
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
              <ResultList
                records={visible}
                view={view}
                tags={state.tags}
                compact={state.settings.density === 'compact'}
                selectedIds={selectedIds}
                onToggleSelect={toggleSelect}
                selectMode={selectMode}
                bulkIds={bulkIds}
                onToggleBulk={toggleBulk}
                dispatch={dispatch}
              />
            )}
          </>
        )}
        <ShortcutHelp open={showHelp} shortcuts={state.settings.shortcuts} onClose={() => setShowHelp(false)} />
      </main>
    </KeyboardNavProvider>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
