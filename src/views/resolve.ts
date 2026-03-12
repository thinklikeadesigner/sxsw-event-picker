import { getState, resolveConflict, skipConflict } from '../state';
import { SXSWEvent } from '../data/types';
import { fmt } from '../utils/time';
import { formatUrlLabel } from '../components/event-card';

function renderResolveCard(event: SXSWEvent): string {
  return `
    <div class="resolve-card">
      <div class="event-name">${event.summary}</div>
      ${event.description ? `<div class="resolve-description">${event.description}</div>` : ''}
      <div class="event-meta">
        <span class="pill pill-time">${fmt(event.start)} \u2013 ${fmt(event.end)}</span>
        ${event.cost ? `<span class="pill pill-cost">${event.cost}</span>` : ''}
        ${event.type ? `<span class="pill pill-type">${event.type}</span>` : ''}
      </div>
      ${event.location ? `<div class="event-location">\uD83D\uDCCD ${event.location}</div>` : ''}
      ${event.url ? `<a class="event-url" href="${event.url}" target="_blank">${formatUrlLabel(event.url)}</a>` : ''}
    </div>`;
}

export function renderResolve(container: HTMLElement) {
  const { events, conflicts, resolveIndex } = getState();
  const unresolved = conflicts.filter(c => !c.resolved);
  const total = conflicts.length;
  const resolvedCount = total - unresolved.length;

  if (unresolved.length === 0) {
    container.innerHTML = `
      <div class="resolve-empty">
        <div class="resolve-done-icon">\u2713</div>
        <h2>${total === 0 ? 'No Conflicts' : 'All Clear!'}</h2>
        <p>${total === 0
          ? 'Star some events in the Discover tab to find scheduling conflicts.'
          : `All ${total} conflicts resolved. Check your schedule!`}</p>
      </div>`;
    return;
  }

  const idx = resolveIndex % unresolved.length;
  const conflict = unresolved[idx];
  const eventA = events[conflict.eventA];
  const eventB = events[conflict.eventB];

  container.innerHTML = `
    <div class="resolve-container">
      <div class="resolve-progress">
        <div class="resolve-progress-text">${resolvedCount} of ${total} conflicts resolved</div>
        <div class="resolve-progress-bar">
          <div class="resolve-progress-fill" style="width:${total ? (resolvedCount / total * 100) : 0}%"></div>
        </div>
      </div>
      <div class="resolve-overlap-info">
        <span class="pill pill-conflict">\u26A1 ${conflict.overlapMinutes} min overlap</span>
        <span class="resolve-remaining">${unresolved.length} remaining</span>
      </div>
      <div class="resolve-versus">
        <div class="resolve-side">
          ${renderResolveCard(eventA)}
          <button class="resolve-pick" data-conflict="${conflict.id}" data-winner="${conflict.eventA}">
            Pick This \u2713
          </button>
        </div>
        <div class="resolve-divider">
          <span class="vs-badge">VS</span>
        </div>
        <div class="resolve-side">
          ${renderResolveCard(eventB)}
          <button class="resolve-pick" data-conflict="${conflict.id}" data-winner="${conflict.eventB}">
            Pick This \u2713
          </button>
        </div>
      </div>
      <div class="resolve-bottom-actions">
        <button class="resolve-skip">Skip \u2192</button>
      </div>
    </div>`;

  // Bind pick buttons
  container.querySelectorAll('.resolve-pick').forEach(btn => {
    btn.addEventListener('click', () => {
      const cid = btn.getAttribute('data-conflict')!;
      const winner = parseInt(btn.getAttribute('data-winner')!);
      resolveConflict(cid, winner);
    });
  });

  // Bind skip
  container.querySelector('.resolve-skip')?.addEventListener('click', () => {
    skipConflict();
  });
}
