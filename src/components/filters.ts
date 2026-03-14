import { getState, setDay, setFilter, starAll, clearStars } from '../state';
import { dayKey } from '../utils/time';

const DAYS = [
  { key: '2026-03-10', label: 'Tue 10' },
  { key: '2026-03-11', label: 'Wed 11' },
  { key: '2026-03-12', label: 'Thu 12' },
  { key: '2026-03-13', label: 'Fri 13' },
  { key: '2026-03-14', label: 'Sat 14' },
  { key: '2026-03-15', label: 'Sun 15' },
  { key: '2026-03-16', label: 'Mon 16' },
  { key: '2026-03-17', label: 'Tue 17' },
  { key: '2026-03-18', label: 'Wed 18' },
];

const COSTS = [
  { key: 'all', label: 'All' },
  { key: 'free', label: 'Free' },
  { key: 'register', label: 'Register' },
  { key: 'approval', label: 'Approval Required' },
  { key: 'request', label: 'Request to Join' },
  { key: 'paid', label: 'Paid ($)' },
];

export function renderFilters() {
  const { currentDay, filters, events } = getState();

  const dayFilters = document.getElementById('day-filters')!;
  // Count events per day
  const dayCounts: Record<string, number> = {};
  for (const e of events) {
    const k = dayKey(e.start);
    dayCounts[k] = (dayCounts[k] || 0) + 1;
  }

  const today = dayKey(new Date());
  const visibleDays = DAYS.filter(d => d.key >= today);

  dayFilters.innerHTML = `
    <span class="filter-label">DAY:</span>
    ${visibleDays.map(d => `
      <button class="filter-btn ${currentDay === d.key ? 'active' : ''}" data-day="${d.key}">
        ${d.label}
        <span class="filter-count">${dayCounts[d.key] || 0}</span>
      </button>
    `).join('')}
    <div class="filter-actions">
      <button class="filter-btn" id="star-day">Star Day</button>
      <button class="filter-btn" id="clear-day">Clear Day</button>
    </div>
  `;

  const costFilters = document.getElementById('cost-filters')!;
  costFilters.innerHTML = `
    <span class="filter-label">COST:</span>
    ${COSTS.map(c => `
      <button class="filter-btn ${filters.cost === c.key ? 'active' : ''}" data-cost="${c.key}">${c.label}</button>
    `).join('')}
  `;

  // Bind day buttons
  dayFilters.querySelectorAll('[data-day]').forEach(btn => {
    btn.addEventListener('click', () => setDay(btn.getAttribute('data-day')!));
  });

  // Bind cost buttons
  costFilters.querySelectorAll('[data-cost]').forEach(btn => {
    btn.addEventListener('click', () => setFilter('cost', btn.getAttribute('data-cost')!));
  });

  // Bind star/clear day
  document.getElementById('star-day')?.addEventListener('click', () => {
    const { events, currentDay } = getState();
    const dayIndices = events.filter(e => dayKey(e.start) === currentDay).map(e => e.index);
    starAll(dayIndices);
  });

  document.getElementById('clear-day')?.addEventListener('click', () => {
    const { events, currentDay } = getState();
    const dayIndices = events.filter(e => dayKey(e.start) === currentDay).map(e => e.index);
    clearStars(dayIndices);
  });
}
