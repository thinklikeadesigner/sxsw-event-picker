import { getState, toggleStar } from '../state';
import { renderEventCard } from '../components/event-card';
import { dayKey, dayLabel, fmt } from '../utils/time';

function matchesCostFilter(cost: string, filter: string): boolean {
  if (filter === 'all') return true;
  const c = (cost || '').toLowerCase();
  if (filter === 'free') return c === 'free';
  if (filter === 'register') return c === 'register';
  if (filter === 'approval') return c.includes('approval');
  if (filter === 'request') return c.includes('request');
  if (filter === 'paid') return /\$/.test(cost);
  return true;
}

export function renderDiscover(container: HTMLElement) {
  const { events, starred, currentDay, filters, conflicts } = getState();

  // Filter events for current day and cost
  const dayEvents = events.filter(e =>
    dayKey(e.start) === currentDay && matchesCostFilter(e.cost, filters.cost)
  );

  if (dayEvents.length === 0) {
    container.innerHTML = '<div class="empty-state">No events match the current filter.</div>';
    return;
  }

  // Count conflicts per event (among starred events)
  const conflictCounts: Record<number, number> = {};
  for (const c of conflicts) {
    if (!c.resolved) {
      conflictCounts[c.eventA] = (conflictCounts[c.eventA] || 0) + 1;
      conflictCounts[c.eventB] = (conflictCounts[c.eventB] || 0) + 1;
    }
  }

  // Group by start time
  const byTime: Record<string, typeof dayEvents> = {};
  for (const e of dayEvents) {
    const key = fmt(e.start);
    if (!byTime[key]) byTime[key] = [];
    byTime[key].push(e);
  }

  const sortedTimes = Object.keys(byTime).sort((a, b) => {
    const toMin = (t: string) => {
      const m = t.match(/(\d+):(\d+) (AM|PM)/);
      if (!m) return 0;
      let h = +m[1];
      if (m[3] === 'PM' && h !== 12) h += 12;
      if (m[3] === 'AM' && h === 12) h = 0;
      return h * 60 + (+m[2]);
    };
    return toMin(a) - toMin(b);
  });

  const d = dayEvents[0].start;
  const starredInDay = dayEvents.filter(e => starred.has(e.index)).length;
  const conflictsInDay = dayEvents.filter(e => conflictCounts[e.index]).length;

  let html = `
    <div class="day-header">
      ${dayLabel(d)}
      <span class="day-badge">${dayEvents.length} events</span>
      <span class="day-badge starred-badge">${starredInDay} starred</span>
      ${conflictsInDay > 0 ? `<span class="day-badge conflict-badge">\u26A1 ${conflictsInDay} conflicts</span>` : ''}
    </div>`;

  for (const time of sortedTimes) {
    html += `
      <div class="time-slot">
        <div class="time-label">${time}</div>
        <div class="events-row">
          ${byTime[time].map(e => renderEventCard(e, starred.has(e.index), conflictCounts[e.index] || 0)).join('')}
        </div>
      </div>`;
  }

  container.innerHTML = html;

  // Bind click handlers
  container.querySelectorAll('.event-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).tagName === 'A') return;
      const index = parseInt(card.getAttribute('data-index')!);
      toggleStar(index);
    });
  });
}
