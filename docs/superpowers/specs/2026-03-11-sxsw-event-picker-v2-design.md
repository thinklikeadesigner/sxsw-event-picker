# SXSW Event Picker v2 — Design Spec

## Problem

SXSW has 267+ events with heavy time overlap. The current app visualizes conflicts but doesn't help users resolve them. Every existing tool in this space (Clashfinder, SXSW GO, Sched) stops at "here are your conflicts." Nobody helps you decide.

## Solution

Rebuild with **conflict resolution as the core UX**. Three-phase flow:

1. **Discover** — Browse/filter events, star ones you're interested in
2. **Resolve** — Work through conflicts pair-by-pair with side-by-side comparison
3. **Export** — Download a conflict-free .ics schedule

## Architecture

### Stack
- Vanilla TypeScript (no framework)
- Vite for dev server + build
- Zero runtime dependencies
- Mobile-first responsive CSS

### File Structure
```
src/
  main.ts              — Entry point, view router
  state.ts             — Centralized state management
  data/
    events.ts          — Event data (from existing events.js)
    conflicts.ts       — Conflict detection engine
  views/
    discover.ts        — Browse/filter/star events (list + timeline)
    resolve.ts         — Side-by-side conflict resolution
    schedule.ts        — Final schedule view + export
  components/
    event-card.ts      — Reusable event card
    filters.ts         — Day, cost, type filter bar
    header.ts          — Navigation + progress indicators
  utils/
    time.ts            — Date/time parsing and formatting
    ics.ts             — .ics file generation
    dom.ts             — DOM helper utilities
index.html
style.css
```

### Data Model
```typescript
interface SXSWEvent {
  uid: string;
  summary: string;
  dtstart: string;        // "20260312T080000"
  dtend: string;
  url: string;
  location: string;
  cost: string;           // "Free" | "Paid" | "Register" | etc.
  type: string;           // "Networking" | "Dinner" | etc.
  starred: boolean;       // User wants to attend
  selected: boolean;      // Final selection (after conflict resolution)
}

interface Conflict {
  id: string;
  eventA: SXSWEvent;
  eventB: SXSWEvent;
  overlapMinutes: number; // How much they overlap
  resolved: boolean;      // User has picked a winner
  winner?: string;        // UID of chosen event
}

interface AppState {
  events: SXSWEvent[];
  conflicts: Conflict[];
  currentView: 'discover' | 'resolve' | 'schedule';
  currentDay: string;
  filters: {
    cost: string;
    type: string;
    search: string;
  };
  stats: {
    starred: number;
    conflicts: number;
    resolved: number;
  };
}
```

## Views

### 1. Discover View
- Default landing view
- Event cards in a grid/list grouped by time
- Each card shows: title, time, venue, cost badge, type badge
- Click card to toggle "starred" (interested)
- Filter bar: day selector, cost filter, type filter, search
- Gantt/timeline toggle (carried from v1)
- Top bar shows: "X events starred | Y conflicts detected"
- When conflicts exist, a prominent CTA appears: "Resolve N conflicts →"

### 2. Resolve View (the new core feature)
- Shows one conflict at a time
- Side-by-side layout: Event A (left) vs Event B (right)
- Each side shows full event details: title, description, time, venue, cost, type, URL
- Visual overlap indicator: timeline bar showing how much they overlap
- Pick button on each side — tap to choose the winner
- "Skip" button to defer decision
- Progress bar: "5 of 12 conflicts resolved"
- On mobile: stacked cards with swipe left/right to pick
- After all conflicts resolved → auto-transition to Schedule view

### 3. Schedule View
- Shows your final conflict-free schedule
- Timeline/Gantt view by day
- List view alternative
- "Export to Calendar" button → generates .ics
- "Back to editing" link to return to Discover

## Conflict Detection

Precomputed on load (not per-render):
- Only between starred events (not all 267)
- Recomputed when stars change
- Overlap calculated in minutes (partial overlaps included)
- Conflicts grouped by day
- Transitive chains identified (A↔B, B↔C shown as a cluster)

## UI Design

- Dark theme (keep existing palette: dark bg, #4ade80 green accent)
- Mobile-first: single-column on mobile, side-by-side on desktop
- Sticky header with view tabs: Discover | Resolve (badge) | Schedule
- Smooth transitions between views
- Cards: rounded corners, subtle borders, hover states
- Conflict cards: orange accent (carried from v1)
- Selected/starred: green accent
- Progress indicators: filled bar for conflict resolution

## Export

- Generate .ics from selected (conflict-resolved) events
- Same format as v1 (VCALENDAR with VEVENT blocks)
- Download button with toast showing import instructions

## What's NOT in scope
- User accounts / persistence beyond session (use localStorage)
- Social features (friend schedules)
- Walking time calculations
- AI recommendations
- Backend / API
