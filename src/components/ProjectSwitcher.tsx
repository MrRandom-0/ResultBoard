import { Archive, ArchiveRestore, Check, ChevronDown, ChevronRight, Edit3, Plus } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { Project } from '../models/types';

interface Props {
  projects: Project[];
  activeId: string | null;
  onSwitch(id: string): Promise<unknown>;
  onCreate(name: string): Promise<unknown>;
  onRename(id: string, name: string): Promise<unknown>;
  onArchive?(id: string): Promise<unknown>;
  onUnarchive?(id: string): Promise<unknown>;
}

export function ProjectSwitcher({ projects, activeId, onSwitch, onCreate, onRename, onArchive, onUnarchive }: Props) {
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const active = projects.find((project) => project.id === activeId);
  const activeProjects = projects.filter((p) => p.status === 'active');
  const archivedProjects = projects.filter((p) => p.status === 'archived');

  const submit = async () => {
    if (!name.trim()) return;
    await onCreate(name);
    setName('');
    setCreating(false);
    setOpen(false);
  };

  return (
    <div ref={rootRef} className="project-switcher">
      <button className="project-current" onClick={() => setOpen(!open)} aria-expanded={open} aria-haspopup="menu">
        <span>
          <small>Project</small>
          <strong>{active?.name ?? 'Choose a project'}</strong>
        </span>
        <ChevronDown size={16} />
      </button>
      {open && (
        <div className="project-menu">
          {activeProjects.map((project) => (
            <div className="project-row" key={project.id}>
              <button
                onClick={() => {
                  void onSwitch(project.id);
                  setOpen(false);
                }}
              >
                {project.id === activeId ? <Check size={14} /> : <span className="check-space" />}
                {project.name}
              </button>
              <button
                className="mini"
                aria-label={`Rename ${project.name}`}
                onClick={() => {
                  const next = prompt('Rename project', project.name);
                  if (next) void onRename(project.id, next);
                }}
              >
                <Edit3 size={13} />
              </button>
              {onArchive && (
                <button
                  className="mini"
                  aria-label={`Archive ${project.name}`}
                  onClick={() => void onArchive(project.id)}
                >
                  <Archive size={13} />
                </button>
              )}
            </div>
          ))}

          {archivedProjects.length > 0 && (
            <div className="archived-section">
              <button className="archived-toggle" onClick={() => setShowArchived(!showArchived)}>
                {showArchived ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                <small>Archived ({archivedProjects.length})</small>
              </button>
              {showArchived &&
                archivedProjects.map((project) => (
                  <div className="project-row archived" key={project.id}>
                    <button
                      onClick={() => {
                        if (onUnarchive) void onUnarchive(project.id);
                      }}
                    >
                      <ArchiveRestore size={13} />
                      {project.name}
                    </button>
                  </div>
                ))}
            </div>
          )}

          {creating ? (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void submit();
              }}
              className="project-create"
            >
              <input
                autoFocus
                value={name}
                maxLength={80}
                placeholder="Project name"
                onChange={(e) => setName(e.target.value)}
              />
              <button className="button primary">Create</button>
            </form>
          ) : (
            <button className="new-project" onClick={() => setCreating(true)}>
              <Plus size={15} /> New project
            </button>
          )}
        </div>
      )}
    </div>
  );
}
