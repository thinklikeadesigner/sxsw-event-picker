import { SXSWEvent } from '../data/types';
import { fmt } from '../utils/time';

export function formatUrlLabel(url: string): string {
  try {
    const host = new URL(url).hostname.replace('www.', '');
    const labels: Record<string, string> = {
      'luma.com': 'Luma',
      'eventbrite.com': 'Eventbrite',
      'connectingtheamericas.com': 'Connecting the Americas',
      'events.inc.com': 'Inc.',
      'events.fastcompany.com': 'Fast Company',
      'posh.vip': 'Posh',
      'splashthat.com': 'Splash',
      'swoogo.com': 'Swoogo',
    };
    const match = Object.entries(labels).find(([domain]) => host.endsWith(domain));
    return `Event page: ${match ? match[1] : host}`;
  } catch {
    return url;
  }
}

export function renderEventCard(event: SXSWEvent, starred: boolean, conflictCount: number): string {
  return `
    <div class="event-card ${starred ? 'starred' : ''} ${conflictCount > 0 ? 'has-conflict' : ''}"
         data-index="${event.index}">
      <div class="star-icon">${starred ? '\u2605' : '\u2606'}</div>
      <div class="event-name">${event.summary}</div>
      <div class="event-meta">
        <span class="pill pill-time">${fmt(event.start)} \u2013 ${fmt(event.end)}</span>
        ${event.cost ? `<span class="pill pill-cost">${event.cost}</span>` : ''}
        ${event.type ? `<span class="pill pill-type">${event.type}</span>` : ''}
        ${conflictCount > 0 ? `<span class="pill pill-conflict">\u26A1 ${conflictCount} overlap${conflictCount > 1 ? 's' : ''}</span>` : ''}
      </div>
      ${event.location ? `<div class="event-location">\uD83D\uDCCD ${event.location}</div>` : ''}
      ${event.url ? `<a class="event-url" href="${event.url}" target="_blank">${formatUrlLabel(event.url)}</a>` : ''}
      ${event.description ? `<div class="card-description">${event.description}</div>` : ''}
    </div>`;
}
