import { SXSWEvent, Conflict, ViewMode, Filters } from './data/types';
import { loadEvents } from './data/events';
import { detectConflicts } from './data/conflicts';

const STORAGE_KEY = 'sxsw2026-v2';

interface AppState {
  events: SXSWEvent[];
  starred: Set<number>;
  conflicts: Conflict[];
  currentView: ViewMode;
  currentDay: string;
  filters: Filters;
  resolveIndex: number;
}

const state: AppState = {
  events: [],
  starred: new Set(),
  conflicts: [],
  currentView: 'discover',
  currentDay: (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; })(),
  filters: { cost: 'all', type: 'all', search: '' },
  resolveIndex: 0,
};

let renderCallback: (() => void) | null = null;

export function onStateChange(cb: () => void) { renderCallback = cb; }
function notify() { renderCallback?.(); }

export function getState() { return state; }

export function init() {
  state.events = loadEvents();
  loadFromStorage();
  recomputeConflicts();
}

export function toggleStar(index: number) {
  if (state.starred.has(index)) state.starred.delete(index);
  else state.starred.add(index);
  recomputeConflicts();
  saveToStorage();
  notify();
}

export function setView(view: ViewMode) {
  state.currentView = view;
  if (view === 'resolve') state.resolveIndex = 0;
  notify();
}

export function setDay(day: string) {
  state.currentDay = day;
  notify();
}

export function setFilter(key: keyof Filters, value: string) {
  state.filters[key] = value;
  notify();
}

export function resolveConflict(conflictId: string, winnerIndex: number) {
  const conflict = state.conflicts.find(c => c.id === conflictId);
  if (!conflict) return;
  conflict.resolved = true;
  conflict.winner = winnerIndex;
  const loser = conflict.eventA === winnerIndex ? conflict.eventB : conflict.eventA;
  state.starred.delete(loser);
  recomputeConflicts();
  saveToStorage();
  notify();
}

export function skipConflict() {
  const unresolved = state.conflicts.filter(c => !c.resolved);
  if (unresolved.length > 1) {
    // Rotate: move first unresolved to end by incrementing resolveIndex
    state.resolveIndex = (state.resolveIndex + 1) % unresolved.length;
  }
  notify();
}

export function starAll(indices: number[]) {
  indices.forEach(i => state.starred.add(i));
  recomputeConflicts();
  saveToStorage();
  notify();
}

export function clearStars(indices?: number[]) {
  if (indices) indices.forEach(i => state.starred.delete(i));
  else state.starred.clear();
  recomputeConflicts();
  saveToStorage();
  notify();
}

function recomputeConflicts() {
  const oldResolutions = new Map(
    state.conflicts.filter(c => c.resolved).map(c => [c.id, c])
  );
  state.conflicts = detectConflicts(state.events, state.starred);
  for (const c of state.conflicts) {
    const old = oldResolutions.get(c.id);
    if (old) { c.resolved = old.resolved; c.winner = old.winner; }
  }
}

function saveToStorage() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      starred: [...state.starred],
      conflicts: state.conflicts,
      currentDay: state.currentDay,
    }));
  } catch {}
}

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    if (data.starred) state.starred = new Set(data.starred);
    if (data.conflicts) state.conflicts = data.conflicts;
    const today = state.currentDay;
    if (data.currentDay && data.currentDay >= today) state.currentDay = data.currentDay;
  } catch {}
}
