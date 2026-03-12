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

  // Filter toggle (mobile)
  const filterRows = document.getElementById('filter-rows')!;
  const filterToggle = document.getElementById('filter-toggle')!;
  // Start collapsed on mobile
  if (window.innerWidth <= 768) {
    filterRows.classList.add('collapsed');
    filterToggle.textContent = 'Filters \u25B8';
  }
  filterToggle.addEventListener('click', () => {
    filterRows.classList.toggle('collapsed');
    filterToggle.textContent = filterRows.classList.contains('collapsed') ? 'Filters \u25B8' : 'Filters \u25BE';
  });

  render();
});
