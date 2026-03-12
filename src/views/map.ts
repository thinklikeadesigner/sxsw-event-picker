import L from 'leaflet';
import { getState, toggleStar } from '../state';
import { dayKey, fmt } from '../utils/time';
import { VENUE_COORDS } from '../data/coordinates';

// Fix Leaflet default icon issue with bundlers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: new URL('leaflet/dist/images/marker-icon-2x.png', import.meta.url).href,
  iconUrl: new URL('leaflet/dist/images/marker-icon.png', import.meta.url).href,
  shadowUrl: new URL('leaflet/dist/images/marker-shadow.png', import.meta.url).href,
});

let map: L.Map | null = null;
let markersLayer: L.LayerGroup | null = null;

function createMap(container: HTMLElement): L.Map {
  const mapDiv = document.createElement('div');
  mapDiv.id = 'map-container';
  mapDiv.style.height = 'calc(100vh - 200px)';
  mapDiv.style.width = '100%';
  mapDiv.style.borderRadius = '12px';
  mapDiv.style.overflow = 'hidden';
  container.innerHTML = '';
  container.appendChild(mapDiv);

  map = L.map('map-container').setView([30.2672, -97.7431], 14);
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
    maxZoom: 20,
    subdomains: 'abcd',
  }).addTo(map);

  markersLayer = L.layerGroup().addTo(map);
  return map;
}

export function renderMap(container: HTMLElement) {
  const { events, starred, currentDay, filters } = getState();

  if (!map || !container.querySelector('#map-container')) {
    if (map) {
      map.remove();
      map = null;
      markersLayer = null;
    }
    createMap(container);
  }

  // Clear existing markers
  markersLayer!.clearLayers();

  // Filter events for current day
  const dayEvents = events.filter(e => {
    if (dayKey(e.start) !== currentDay) return false;
    const cost = (e.cost || '').toLowerCase();
    if (filters.cost === 'free' && cost !== 'free') return false;
    if (filters.cost === 'register' && cost !== 'register') return false;
    if (filters.cost === 'approval' && !cost.includes('approval')) return false;
    if (filters.cost === 'request' && !cost.includes('request')) return false;
    if (filters.cost === 'paid' && !/\$/.test(e.cost)) return false;
    return true;
  });

  // Place markers
  for (const event of dayEvents) {
    const coords = VENUE_COORDS[event.location];
    if (!coords) continue;

    const isStarred = starred.has(event.index);

    const marker = L.circleMarker([coords[0], coords[1]], {
      radius: 8,
      fillColor: isStarred ? '#4ade80' : '#3b82f6',
      color: isStarred ? '#166534' : '#1e40af',
      weight: 2,
      opacity: 1,
      fillOpacity: 0.8,
    });

    const popupContent = `
      <div style="font-family:-apple-system,sans-serif;min-width:200px">
        <strong style="font-size:14px">${event.summary}</strong><br>
        <span style="color:#666;font-size:12px">${fmt(event.start)} – ${fmt(event.end)}</span><br>
        ${event.cost ? `<span style="color:#7c3aed;font-size:12px">${event.cost}</span><br>` : ''}
        ${event.type ? `<span style="color:#059669;font-size:12px">${event.type}</span><br>` : ''}
        <span style="color:#888;font-size:11px">${event.location}</span><br>
        <button onclick="window.__toggleStar(${event.index})" style="margin-top:6px;padding:4px 12px;border-radius:6px;border:1px solid ${isStarred ? '#ef4444' : '#4ade80'};background:${isStarred ? '#1a0000' : '#052e16'};color:${isStarred ? '#ef4444' : '#4ade80'};cursor:pointer;font-size:12px;font-weight:600">
          ${isStarred ? '\u2605 Unstar' : '\u2606 Star'}
        </button>
      </div>
    `;

    marker.bindPopup(popupContent);
    markersLayer!.addLayer(marker);
  }

  // Expose toggle function globally for popup buttons
  (window as any).__toggleStar = (index: number) => {
    toggleStar(index);
  };

  // Invalidate size after render (Leaflet needs this when container changes)
  setTimeout(() => map?.invalidateSize(), 100);
}

export function destroyMap() {
  if (map) {
    map.remove();
    map = null;
    markersLayer = null;
  }
}
