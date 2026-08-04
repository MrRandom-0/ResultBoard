export const DATABASE_VERSION = 4 as const;

export type ResultStatus = 'keep' | 'maybe' | 'reject';
export type Theme = 'light' | 'dark' | 'system';
export type RejectedDisplay = 'fade' | 'hide' | 'show';

export interface Project {
  id: string;
  name: string;
  status: 'active' | 'archived';
  createdAt: string;
  updatedAt: string;
}

export interface Tag {
  id: string;
  projectId: string;
  name: string;
  color: string;
  createdAt: string;
}

export interface ComparisonCriterion {
  id: string;
  projectId: string;
  name: string;
  weight: number;
}

export interface KeyboardShortcuts {
  nextResult: string;
  prevResult: string;
  keepResult: string;
  maybeResult: string;
  rejectResult: string;
  openBoard: string;
  togglePanel: string;
}

export interface SearchResultRecord {
  id: string;
  projectId: string;
  canonicalUrl: string;
  url: string;
  title: string;
  snippet: string;
  domain: string;
  status: ResultStatus;
  rejectionReason: string;
  notes: string;
  tagIds: string[];
  criterionScores?: Record<string, number>;
  sourceQueries: string[];
  createdAt: string;
  updatedAt: string;
}

export type FontSize = 'small' | 'medium' | 'large';
export type AnimationSpeed = 'none' | 'reduced' | 'normal';

export interface UserSettings {
  theme: Theme;
  rejectedDisplay: RejectedDisplay;
  onboardingComplete: boolean;
  paused: boolean;
  density: 'comfortable' | 'compact';
  shortcuts: KeyboardShortcuts;
  fontSize: FontSize;
  accentColor: string;
  animationSpeed: AnimationSpeed;
  autoArchiveDays: number;
  maxResultsWarning: number;
}

export interface StoredDatabase {
  version: number;
  activeProjectId: string | null;
  projects: Project[];
  records: SearchResultRecord[];
  tags: Tag[];
  comparisonCriteria: ComparisonCriterion[];
  settings: UserSettings;
}

export type AppState = StoredDatabase;

export interface ParsedSearchResult {
  url: string;
  canonicalUrl: string;
  title: string;
  snippet: string;
  domain: string;
  sourceQuery: string;
}

export const DEFAULT_SHORTCUTS: KeyboardShortcuts = {
  nextResult: 'j',
  prevResult: 'k',
  keepResult: 'g',
  maybeResult: 'm',
  rejectResult: 'r',
  openBoard: 'b',
  togglePanel: 'p'
};

export const DEFAULT_SETTINGS: UserSettings = {
  theme: 'system',
  rejectedDisplay: 'fade',
  onboardingComplete: false,
  paused: false,
  density: 'comfortable',
  shortcuts: { ...DEFAULT_SHORTCUTS },
  fontSize: 'medium',
  accentColor: '#6366f1',
  animationSpeed: 'normal',
  autoArchiveDays: 0,
  maxResultsWarning: 500
};

export const emptyDatabase = (): StoredDatabase => ({
  version: DATABASE_VERSION,
  activeProjectId: null,
  projects: [],
  records: [],
  tags: [],
  comparisonCriteria: [],
  settings: { ...DEFAULT_SETTINGS }
});
