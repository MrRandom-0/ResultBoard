import React from 'react';
import ReactDOM from 'react-dom/client';
import { ArrowRight, Maximize2, Pause, Play, Settings } from 'lucide-react';
import { useState } from 'react';
import { Logo } from '../../src/components/Logo';
import { useAppState } from '../../src/hooks/use-app-state';
import { useTheme } from '../../src/hooks/use-theme';
import '../../src/styles/base.css';
import './style.css';

function App() {
  const { state, error, loading, dispatch } = useAppState();
  const [projectName, setProjectName] = useState('My research');
  useTheme(state?.settings.theme, state?.settings.fontSize, state?.settings.accentColor, state?.settings.animationSpeed);

  if (loading || !state) return <div className="popup"><div className="spinner" /></div>;

  const project = state.projects.find((p) => p.id === state.activeProjectId);
  const records = state.records.filter((r) => r.projectId === project?.id);

  const openSidePanel = async () => {
    const win = await chrome.windows.getCurrent();
    if (win.id !== undefined) await chrome.sidePanel.open({ windowId: win.id });
    window.close();
  };

  const openFullBoard = () => {
    void chrome.tabs.create({ url: chrome.runtime.getURL('/board.html') });
    window.close();
  };

  return (
    <main className="popup">
      <header>
        <Logo />
        <button
          className="icon-button"
          aria-label="Settings"
          onClick={() => void chrome.runtime.openOptionsPage()}
        >
          <Settings size={16} />
        </button>
      </header>
      {error && <div className="error">{error}</div>}
      <section className="project">
        <small>Current project</small>
        <strong>{project?.name ?? 'No project yet'}</strong>
        {project ? (
          <div className="quick-counts">
            <span>
              <b>{records.filter((r) => r.status === 'keep').length}</b> Keep
            </span>
            <span>
              <b>{records.filter((r) => r.status === 'maybe').length}</b> Maybe
            </span>
            <span>
              <b>{records.filter((r) => r.status === 'reject').length}</b> Rejected
            </span>
          </div>
        ) : (
          <p>Create a project to start organizing search results.</p>
        )}
      </section>
      <button className="button primary wide" onClick={() => void openSidePanel()}>
        Open board <ArrowRight size={15} />
      </button>
      <button className="button wide" onClick={openFullBoard}>
        <Maximize2 size={15} /> Open Full Board
      </button>
      {!project && (
        <form className="popup-create" onSubmit={(event) => {
          event.preventDefault();
          const name = projectName.trim();
          if (name) void dispatch({ type: 'CREATE_PROJECT', name });
        }}>
          <input aria-label="Project name" maxLength={80} value={projectName} onChange={(event) => setProjectName(event.target.value)} />
          <button className="button" type="submit" disabled={!projectName.trim()}>Create</button>
        </form>
      )}
      <footer>
        <button
          onClick={() =>
            void dispatch({ type: 'UPDATE_SETTINGS', patch: { paused: !state.settings.paused } })
          }
        >
          {state.settings.paused ? <Play size={14} /> : <Pause size={14} />}{' '}
          {state.settings.paused ? 'Resume on Google' : 'Pause on Google'}
        </button>
        <button onClick={() => void chrome.runtime.openOptionsPage()}>
          <Settings size={14} /> Settings
        </button>
      </footer>
    </main>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
