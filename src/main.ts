import './style.css';
import { init, onStateChange, getState, setView } from './state';
import { renderDiscover } from './views/discover';
import { renderResolve } from './views/resolve';
import { renderSchedule } from './views/schedule';
import { renderMap, destroyMap } from './views/map';
import { renderFilters } from './components/filters';
import { ViewMode } from './data/types';

function render() {
  const state = getState();
  const content = document.getElementById('content')!;
  const controls = document.getElementById('controls')!;

  // Update stats
  document.getElementById('starred-count')!.textContent = String(state.starred.size);
  const unresolvedCount = state.conflicts.filter(c => !c.resolved).length;
  document.getElementById('conflict-count')!.textContent = String(unresolvedCount);
  const badge = document.getElementById('resolve-badge')!;
  badge.textContent = String(unresolvedCount);
  badge.style.display = unresolvedCount > 0 ? '' : 'none';

  // Update active tab
  document.querySelectorAll('.tab').forEach(t => {
    t.classList.toggle('active', t.getAttribute('data-view') === state.currentView);
  });

  // Clean up map when switching away
  if (state.currentView !== 'map') {
    destroyMap();
  }

  // Show/hide filters (discover and map views)
  controls.style.display = (state.currentView === 'discover' || state.currentView === 'map') ? '' : 'none';

  // Render
  switch (state.currentView) {
    case 'discover':
      renderFilters();
      renderDiscover(content);
      break;
    case 'map':
      renderFilters();
      renderMap(content);
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
      setView(tab.getAttribute('data-view') as ViewMode);
    });
  });

  // Tooltip on hover for event cards with descriptions
  let tooltip: HTMLElement | null = null;

  document.addEventListener('mouseover', (e) => {
    const card = (e.target as HTMLElement).closest('.event-card[data-tooltip]') as HTMLElement | null;
    if (!card) return;
    const text = card.getAttribute('data-tooltip');
    if (!text) return;

    if (!tooltip) {
      tooltip = document.createElement('div');
      tooltip.className = 'card-tooltip';
      document.body.appendChild(tooltip);
    }
    tooltip.textContent = text;
    tooltip.style.display = 'block';

    const rect = card.getBoundingClientRect();
    const tipW = 360;
    let left = rect.left;
    let top = rect.bottom + 8;

    // Keep tooltip on screen
    if (left + tipW > window.innerWidth) left = window.innerWidth - tipW - 12;
    if (left < 8) left = 8;
    if (top + 150 > window.innerHeight) top = rect.top - 8; // flip above

    tooltip.style.left = left + 'px';
    tooltip.style.top = top + 'px';
  });

  document.addEventListener('mouseout', (e) => {
    const card = (e.target as HTMLElement).closest('.event-card[data-tooltip]');
    if (card && tooltip) {
      tooltip.style.display = 'none';
    }
  });

  render();
});
