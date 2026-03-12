# SXSW Event Picker v2 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the SXSW Event Picker with conflict resolution as the core UX — three-phase flow: Discover, Resolve, Export.

**Architecture:** Vanilla TypeScript app built with Vite. No runtime dependencies. Modular file structure with separate modules for state, views, and components. Event data reused from existing `events.js`.

**Tech Stack:** TypeScript, Vite, CSS3, vanilla DOM manipulation

---

## Chunk 1: Project Scaffold + Data Layer

### Task 1: Vite + TypeScript Project Setup

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `index.html`
- Create: `src/main.ts`

- [ ] **Step 1: Initialize Vite project**

```bash
cd /Users/k2/Desktop/moltathon/sxsw-event-picker-v2
npm create vite@latest . -- --template vanilla-ts
```

Say yes to overwrite if prompted (the directory has the docs folder but no package.json yet).

- [ ] **Step 2: Clean up Vite boilerplate**

Remove default counter app files. Keep only `index.html`, `src/main.ts`, `tsconfig.json`, `vite.config.ts`, `package.json`.

- [ ] **Step 3: Install dependencies and verify**

```bash
npm install
npm run dev
```

Verify the dev server starts on localhost.

- [ ] **Step 4: Commit scaffold**

```bash
git add -A
git commit -m "chore: scaffold Vite + TypeScript project"
```

### Task 2: Data Types and Event Loading

**Files:**
- Create: `src/data/types.ts`
- Create: `src/data/events.ts` (copy from existing `events.js`, add types)
- Create: `src/data/conflicts.ts`

- [ ] **Step 1: Define TypeScript types in `src/data/types.ts`**

```typescript
export interface RawEvent {
  uid: string;
  summary: string;
  description?: string;
  dtstart: string;
  dtend: string;
  url: string;
  location: string;
  cost: string;
  type: string;
  rawBlock: string;
}

export interface SXSWEvent {
  uid: string;
  summary: string;
  description: string;
  start: Date;
  end: Date;
  url: string;
  location: string;
  cost: string;
  type: string;
  rawBlock: string;
  index: number; // position in master array
}

export interface Conflict {
  id: string;
  eventA: number; // index into events array
  eventB: number;
  overlapMinutes: number;
  resolved: boolean;
  winner: number | null; // index of chosen event
}

export type ViewMode = 'discover' | 'resolve' | 'schedule';

export interface Filters {
  cost: string;
  type: string;
  search: string;
}
```

- [ ] **Step 2: Create `src/data/events.ts`**

Copy the EVENTS_DATA array from the existing `events.js` (all 267 events). Add type annotation. Export a `loadEvents()` function that parses dtstart/dtend into Date objects and returns `SXSWEvent[]`.

```typescript
import { RawEvent, SXSWEvent } from './types';

const EVENTS_DATA: RawEvent[] = [
  // ... paste existing event data ...
];

function parseLocalDate(s: string): Date {
  const m = s.match(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/);
  if (!m) return new Date();
  return new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]);
}

export function loadEvents(): SXSWEvent[] {
  const seen = new Set<string>();
  const events: SXSWEvent[] = [];

  for (const d of EVENTS_DATA) {
    const key = d.summary.trim() + '|' + d.dtstart;
    if (seen.has(key)) continue;
    seen.add(key);

    events.push({
      uid: d.uid,
      summary: d.summary,
      description: d.description || '',
      start: parseLocalDate(d.dtstart),
      end: parseLocalDate(d.dtend),
      url: d.url,
      location: d.location,
      cost: d.cost,
      type: d.type,
      rawBlock: d.rawBlock,
      index: events.length,
    });
  }

  return events;
}
```

- [ ] **Step 3: Create conflict detection in `src/data/conflicts.ts`**

```typescript
import { SXSWEvent, Conflict } from './types';

export function detectConflicts(events: SXSWEvent[], starredIndices: Set<number>): Conflict[] {
  const conflicts: Conflict[] = [];
  const starred = events.filter(e => starredIndices.has(e.index));

  for (let i = 0; i < starred.length; i++) {
    for (let j = i + 1; j < starred.length; j++) {
      const a = starred[i], b = starred[j];
      if (a.start.toDateString() !== b.start.toDateString()) continue;
      if (a.start < b.end && b.start < a.end) {
        const overlapStart = Math.max(a.start.getTime(), b.start.getTime());
        const overlapEnd = Math.min(a.end.getTime(), b.end.getTime());
        const overlapMinutes = Math.round((overlapEnd - overlapStart) / 60000);

        conflicts.push({
          id: `${a.index}-${b.index}`,
          eventA: a.index,
          eventB: b.index,
          overlapMinutes,
          resolved: false,
          winner: null,
        });
      }
    }
  }

  return conflicts;
}
```

- [ ] **Step 4: Commit data layer**

```bash
git add src/data/
git commit -m "feat: add typed event data layer with conflict detection"
```

### Task 3: State Management

**Files:**
- Create: `src/state.ts`

- [ ] **Step 1: Create centralized state with localStorage persistence**

```typescript
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
}

const state: AppState = {
  events: [],
  starred: new Set(),
  conflicts: [],
  currentView: 'discover',
  currentDay: '2026-03-12',
  filters: { cost: 'all', type: 'all', search: '' },
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

export function skipConflict(conflictId: string) {
  // Move to next without resolving — no state change needed
  notify();
}

export function starAll(indices: number[]) {
  indices.forEach(i => state.starred.add(i));
  recomputeConflicts();
  saveToStorage();
  notify();
}

export function clearStars(indices: number[]) {
  indices.forEach(i => state.starred.delete(i));
  recomputeConflicts();
  saveToStorage();
  notify();
}

function recomputeConflicts() {
  // Preserve existing resolutions
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
    if (data.currentDay) state.currentDay = data.currentDay;
  } catch {}
}
```

- [ ] **Step 2: Commit state module**

```bash
git add src/state.ts
git commit -m "feat: add centralized state management with localStorage"
```

## Chunk 2: Utility Modules + HTML Shell

### Task 4: Utility Functions

**Files:**
- Create: `src/utils/time.ts`
- Create: `src/utils/dom.ts`
- Create: `src/utils/ics.ts`

- [ ] **Step 1: Create `src/utils/time.ts`**

Time formatting, day key generation, day names — extracted from existing app.js:

```typescript
export const DAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
export const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export function fmt(d: Date): string {
  const h = d.getHours(), m = d.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hr = h % 12 || 12;
  return `${hr}:${m.toString().padStart(2, '0')} ${ampm}`;
}

export function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

export function dayLabel(d: Date): string {
  return `${DAY_NAMES[d.getDay()]}, ${MONTH_NAMES[d.getMonth()]} ${d.getDate()}`;
}

export function toMinutes(d: Date): number {
  return d.getHours() * 60 + d.getMinutes();
}
```

- [ ] **Step 2: Create `src/utils/dom.ts`**

```typescript
export function $(selector: string): HTMLElement | null {
  return document.querySelector(selector);
}

export function html(el: HTMLElement, content: string) {
  el.innerHTML = content;
}
```

- [ ] **Step 3: Create `src/utils/ics.ts`**

ICS export — extracted from existing app.js:

```typescript
import { SXSWEvent } from '../data/types';

export function buildICS(events: SXSWEvent[]): string {
  const header = `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//SXSW 2026 Picker//EN\r\nCALSCALE:GREGORIAN\r\nMETHOD:PUBLISH\r\nX-WR-CALNAME:SXSW 2026 My Schedule\r\nX-WR-TIMEZONE:America/Chicago\r\nBEGIN:VTIMEZONE\r\nTZID:America/Chicago\r\nBEGIN:STANDARD\r\nDTSTART:19671029T020000\r\nRRULE:FREQ=YEARLY;BYDAY=1SU;BYMONTH=11\r\nTZOFFSETFROM:-0500\r\nTZOFFSETTO:-0600\r\nTZNAME:CST\r\nEND:STANDARD\r\nBEGIN:DAYLIGHT\r\nDTSTART:19870405T020000\r\nRRULE:FREQ=YEARLY;BYDAY=2SU;BYMONTH=3\r\nTZOFFSETFROM:-0600\r\nTZOFFSETTO:-0500\r\nTZNAME:CDT\r\nEND:DAYLIGHT\r\nEND:VTIMEZONE\r\n`;

  let body = '';
  for (const e of events) {
    body += e.rawBlock.replace(/\r?\n/g, '\r\n');
    if (!body.endsWith('\r\n')) body += '\r\n';
  }

  return header + body + 'END:VCALENDAR\r\n';
}

export function downloadICS(events: SXSWEvent[]) {
  const ics = buildICS(events);
  const dataUri = 'data:text/calendar;charset=utf-8,' + encodeURIComponent(ics);
  const a = document.createElement('a');
  a.href = dataUri;
  a.download = 'SXSW_2026_MySchedule.ics';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
```

- [ ] **Step 4: Commit utils**

```bash
git add src/utils/
git commit -m "feat: add time, DOM, and ICS utility modules"
```

### Task 5: HTML Shell + Base CSS

**Files:**
- Modify: `index.html`
- Create: `src/style.css`

- [ ] **Step 1: Write `index.html`**

Minimal HTML shell with three-tab navigation, filter bar, and content area. Mobile-first viewport.

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SXSW 2026 Event Picker</title>
</head>
<body>
  <div id="app">
    <div class="sticky-top">
      <header>
        <div>
          <h1>SXSW 2026 Event Picker</h1>
          <div class="subtitle">267 unofficial tech events via Entre</div>
        </div>
        <div class="header-stats">
          <span class="stat">Starred: <span id="starred-count">0</span></span>
          <span class="stat">Conflicts: <span id="conflict-count">0</span></span>
        </div>
      </header>
      <nav class="view-tabs">
        <button class="tab active" data-view="discover">Discover</button>
        <button class="tab" data-view="resolve">
          Resolve <span class="tab-badge" id="resolve-badge">0</span>
        </button>
        <button class="tab" data-view="schedule">My Schedule</button>
      </nav>
      <div class="controls" id="controls">
        <div class="filter-row" id="day-filters"></div>
        <div class="filter-row" id="cost-filters"></div>
      </div>
    </div>
    <main id="content"></main>
  </div>
  <script type="module" src="/src/main.ts"></script>
</body>
</html>
```

- [ ] **Step 2: Write `src/style.css` — base reset, layout, dark theme, tabs, filters, cards**

Port over the dark theme from existing style.css. Add tab navigation styles, the resolve view side-by-side layout, and mobile responsive breakpoints. Key additions:
- `.view-tabs` — horizontal tab bar below header
- `.tab-badge` — conflict count badge on Resolve tab
- `.resolve-view` — side-by-side conflict comparison layout
- `.resolve-card` — enlarged event card for comparison
- `.resolve-actions` — pick/skip buttons
- `.progress-bar` — conflict resolution progress
- `@media (max-width: 768px)` — stack cards vertically on mobile

- [ ] **Step 3: Commit HTML + CSS**

```bash
git add index.html src/style.css
git commit -m "feat: add HTML shell with three-tab nav and dark theme CSS"
```

## Chunk 3: Views

### Task 6: Header + Filter Components

**Files:**
- Create: `src/components/header.ts`
- Create: `src/components/filters.ts`

- [ ] **Step 1: Create `src/components/header.ts`**

Renders stat counters and handles tab switching. Updates badge count on resolve tab.

- [ ] **Step 2: Create `src/components/filters.ts`**

Renders day buttons (Mar 10-18) and cost filter buttons. Calls `setDay()` and `setFilter()` on state. Shows/hides based on current view (hidden in resolve/schedule views).

- [ ] **Step 3: Commit components**

```bash
git add src/components/
git commit -m "feat: add header and filter components"
```

### Task 7: Event Card Component

**Files:**
- Create: `src/components/event-card.ts`

- [ ] **Step 1: Create reusable event card renderer**

Returns HTML string for an event card. Takes the event, whether it's starred, and an optional `compact` flag for list view. Shows: title, time pill, cost pill, type pill, location, URL, star toggle, conflict indicator.

- [ ] **Step 2: Commit**

```bash
git add src/components/event-card.ts
git commit -m "feat: add reusable event card component"
```

### Task 8: Discover View

**Files:**
- Create: `src/views/discover.ts`

- [ ] **Step 1: Create discover view**

The main browse view. Groups events by start time for the selected day. Renders event cards in a flex grid. Click toggles star. Includes "Star All" / "Clear Day" bulk actions. Shows Gantt timeline toggle (reuse existing Gantt logic).

Key functions:
- `renderDiscover(container: HTMLElement)` — main render function
- Filters events by current day + cost filter
- Groups by time slot, renders cards
- Shows conflict count badge per day

- [ ] **Step 2: Commit**

```bash
git add src/views/discover.ts
git commit -m "feat: add discover view with event browsing and starring"
```

### Task 9: Resolve View (Core Feature)

**Files:**
- Create: `src/views/resolve.ts`

- [ ] **Step 1: Create the conflict resolution view**

This is the new core feature. Shows one conflict at a time as a side-by-side comparison.

```typescript
import { getState, resolveConflict, skipConflict } from '../state';
import { renderEventCard } from '../components/event-card';
import { fmt } from '../utils/time';

export function renderResolve(container: HTMLElement) {
  const { events, conflicts } = getState();
  const unresolved = conflicts.filter(c => !c.resolved);
  const total = conflicts.length;
  const resolved = total - unresolved.length;

  if (unresolved.length === 0) {
    container.innerHTML = `
      <div class="resolve-empty">
        <div class="resolve-done-icon">✓</div>
        <h2>All Clear!</h2>
        <p>${total === 0 ? 'No conflicts detected. Star more events in Discover to find overlaps.' : `All ${total} conflicts resolved. Check your schedule!`}</p>
      </div>`;
    return;
  }

  const conflict = unresolved[0];
  const eventA = events[conflict.eventA];
  const eventB = events[conflict.eventB];

  container.innerHTML = `
    <div class="resolve-progress">
      <div class="resolve-progress-text">${resolved} of ${total} conflicts resolved</div>
      <div class="resolve-progress-bar">
        <div class="resolve-progress-fill" style="width:${total ? (resolved/total*100) : 0}%"></div>
      </div>
    </div>
    <div class="resolve-overlap-info">
      <span class="pill pill-conflict">${conflict.overlapMinutes} min overlap</span>
      <span class="resolve-remaining">${unresolved.length} remaining</span>
    </div>
    <div class="resolve-versus">
      <div class="resolve-side" data-index="${conflict.eventA}">
        ${renderResolveCard(eventA)}
        <button class="resolve-pick" data-conflict="${conflict.id}" data-winner="${conflict.eventA}">Pick This</button>
      </div>
      <div class="resolve-divider">
        <span class="vs-badge">VS</span>
      </div>
      <div class="resolve-side" data-index="${conflict.eventB}">
        ${renderResolveCard(eventB)}
        <button class="resolve-pick" data-conflict="${conflict.id}" data-winner="${conflict.eventB}">Pick This</button>
      </div>
    </div>
    <div class="resolve-actions">
      <button class="resolve-skip" data-conflict="${conflict.id}">Skip →</button>
    </div>`;

  // Attach event listeners
  container.querySelectorAll('.resolve-pick').forEach(btn => {
    btn.addEventListener('click', () => {
      const cid = btn.getAttribute('data-conflict')!;
      const winner = parseInt(btn.getAttribute('data-winner')!);
      resolveConflict(cid, winner);
    });
  });

  container.querySelector('.resolve-skip')?.addEventListener('click', () => {
    // Move this conflict to end of unresolved list
    const cid = container.querySelector('.resolve-skip')!.getAttribute('data-conflict')!;
    skipConflict(cid);
  });
}

function renderResolveCard(event: SXSWEvent): string {
  // Enlarged card with full details for comparison
  return `
    <div class="resolve-card">
      <div class="event-name">${event.summary}</div>
      ${event.description ? `<div class="resolve-description">${event.description}</div>` : ''}
      <div class="event-meta">
        <span class="pill pill-time">${fmt(event.start)} – ${fmt(event.end)}</span>
        ${event.cost ? `<span class="pill pill-cost">${event.cost}</span>` : ''}
        ${event.type ? `<span class="pill pill-type">${event.type}</span>` : ''}
      </div>
      ${event.location ? `<div class="event-location">📍 ${event.location}</div>` : ''}
      ${event.url ? `<a class="event-url" href="${event.url}" target="_blank">${event.url}</a>` : ''}
    </div>`;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/views/resolve.ts
git commit -m "feat: add conflict resolution view with side-by-side comparison"
```

### Task 10: Schedule View + Export

**Files:**
- Create: `src/views/schedule.ts`

- [ ] **Step 1: Create schedule view**

Shows final conflict-free schedule grouped by day. Only shows starred events. Includes "Export to Calendar" button with the same dropdown pattern (Apple/Google/Outlook). Shows warning if unresolved conflicts remain.

- [ ] **Step 2: Commit**

```bash
git add src/views/schedule.ts
git commit -m "feat: add schedule view with calendar export"
```

## Chunk 4: Main Entry + Integration

### Task 11: Main Entry Point + View Router

**Files:**
- Modify: `src/main.ts`

- [ ] **Step 1: Wire everything together in `src/main.ts`**

```typescript
import './style.css';
import { init, onStateChange, getState, setView, setDay, setFilter } from './state';
import { renderDiscover } from './views/discover';
import { renderResolve } from './views/resolve';
import { renderSchedule } from './views/schedule';
import { renderFilters } from './components/filters';

function render() {
  const state = getState();
  const content = document.getElementById('content')!;
  const controls = document.getElementById('controls')!;

  // Update stats
  document.getElementById('starred-count')!.textContent = String(state.starred.size);
  const unresolvedCount = state.conflicts.filter(c => !c.resolved).length;
  document.getElementById('conflict-count')!.textContent = String(unresolvedCount);
  document.getElementById('resolve-badge')!.textContent = String(unresolvedCount);

  // Update active tab
  document.querySelectorAll('.tab').forEach(t => {
    t.classList.toggle('active', t.getAttribute('data-view') === state.currentView);
  });

  // Show/hide filters (only in discover view)
  controls.style.display = state.currentView === 'discover' ? '' : 'none';

  // Render current view
  switch (state.currentView) {
    case 'discover':
      renderFilters();
      renderDiscover(content);
      break;
    case 'resolve':
      renderResolve(content);
      break;
    case 'schedule':
      renderSchedule(content);
      break;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  init();
  onStateChange(render);

  // Tab navigation
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      setView(tab.getAttribute('data-view') as any);
    });
  });

  render();
});
```

- [ ] **Step 2: Verify app loads and all three views work**

```bash
npm run dev
```

Open in browser, click through Discover/Resolve/Schedule tabs.

- [ ] **Step 3: Commit**

```bash
git add src/main.ts
git commit -m "feat: wire up main entry point with view router"
```

### Task 12: Polish + Mobile Responsiveness

**Files:**
- Modify: `src/style.css`

- [ ] **Step 1: Add mobile breakpoints**

At `max-width: 768px`:
- Stack resolve cards vertically instead of side-by-side
- Full-width event cards
- Scrollable day filter buttons
- Smaller header

- [ ] **Step 2: Add transitions and animations**

- Resolve card pick animation (scale + fade)
- Progress bar fill animation
- Tab switch transition
- Toast notification for export

- [ ] **Step 3: Commit**

```bash
git add src/style.css
git commit -m "feat: add mobile responsiveness and animations"
```

### Task 13: Build Verification + Final Commit

- [ ] **Step 1: Run production build**

```bash
npm run build
```

Verify no TypeScript errors, output in `dist/`.

- [ ] **Step 2: Test the production build**

```bash
npm run preview
```

Open in browser, verify all views work.

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "feat: SXSW Event Picker v2 complete — Discover, Resolve, Export"
```
