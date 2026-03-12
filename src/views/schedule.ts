import { getState, toggleStar } from '../state';
import { renderEventCard } from '../components/event-card';
import { dayKey, dayLabel } from '../utils/time';
import { downloadICS } from '../utils/ics';

export function renderSchedule(container: HTMLElement) {
  const { events, starred, conflicts } = getState();
  const starredEvents = events.filter(e => starred.has(e.index));

  if (starredEvents.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <h2>No events starred yet</h2>
        <p>Go to the Discover tab to browse and star events you want to attend.</p>
      </div>`;
    return;
  }

  // Group by day
  const byDay: Record<string, typeof starredEvents> = {};
  for (const e of starredEvents) {
    const k = dayKey(e.start);
    if (!byDay[k]) byDay[k] = [];
    byDay[k].push(e);
  }
  const sortedDays = Object.keys(byDay).sort();

  // Count unresolved conflicts
  const unresolvedCount = conflicts.filter(c => !c.resolved).length;

  // Conflict counts per event
  const conflictCounts: Record<number, number> = {};
  for (const c of conflicts) {
    if (!c.resolved) {
      conflictCounts[c.eventA] = (conflictCounts[c.eventA] || 0) + 1;
      conflictCounts[c.eventB] = (conflictCounts[c.eventB] || 0) + 1;
    }
  }

  let html = `
    <div class="schedule-header">
      <div class="day-header">
        My Schedule
        <span class="day-badge">${starredEvents.length} events</span>
        <span class="day-badge">${sortedDays.length} days</span>
        ${unresolvedCount > 0 ? `<span class="day-badge conflict-badge">\u26A1 ${unresolvedCount} unresolved conflicts</span>` : ''}
      </div>
      <div class="schedule-actions">
        <button class="export-btn" id="export-btn">Export to Calendar (.ics)</button>
      </div>
    </div>`;

  for (const day of sortedDays) {
    const dayEvents = byDay[day].sort((a, b) => a.start.getTime() - b.start.getTime());
    const d = dayEvents[0].start;

    html += `
      <div class="schedule-day">
        <div class="schedule-day-header">${dayLabel(d)}
          <span class="day-badge">${dayEvents.length} events</span>
        </div>
        <div class="schedule-events">
          ${dayEvents.map(e => renderEventCard(e, true, conflictCounts[e.index] || 0)).join('')}
        </div>
      </div>`;
  }

  container.innerHTML = html;

  // Bind export
  document.getElementById('export-btn')?.addEventListener('click', () => {
    downloadICS(starredEvents);
    showToast(`${starredEvents.length} events exported! Import the .ics file into your calendar app.`);
  });

  // Bind card clicks to unstar (with mobile tap-to-expand)
  container.querySelectorAll('.event-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).tagName === 'A') return;

      const isMobile = window.innerWidth <= 768;
      const tappedStar = (e.target as HTMLElement).closest('.star-icon');

      if (tappedStar || !isMobile) {
        const index = parseInt(card.getAttribute('data-index')!);
        toggleStar(index);
      } else {
        card.classList.toggle('expanded');
      }
    });
  });
}

function showToast(msg: string) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 4000);
}
