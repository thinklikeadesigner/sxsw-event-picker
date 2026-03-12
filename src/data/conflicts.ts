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
