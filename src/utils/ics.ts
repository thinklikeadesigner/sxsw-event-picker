import { SXSWEvent } from '../data/types';

export function buildICS(events: SXSWEvent[]): string {
  const header = `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//SXSW 2026 Picker//EN\r\nCALSCALE:GREGORIAN\r\nMETHOD:PUBLISH\r\nX-WR-CALNAME:SXSW 2026 My Schedule\r\nX-WR-TIMEZONE:America/Chicago\r\nBEGIN:VTIMEZONE\r\nTZID:America/Chicago\r\nBEGIN:STANDARD\r\nDTSTART:19671029T020000\r\nRRULE:FREQ=YEARLY;BYDAY=1SU;BYMONTH=11\r\nTZOFFSETFROM:-0500\r\nTZOFFSETTO:-0600\r\nTZNAME:CST\r\nEND:STANDARD\r\nBEGIN:DAYLIGHT\r\nDTSTART:19870405T020000\r\nRRULE:FREQ=YEARLY;BYDAY=2SU;BYMONTH=3\r\nTZOFFSETFROM:-0600\r\nTZOFFSETTO:-0500\r\nTZNAME:CDT\r\nEND:DAYLIGHT\r\nEND:VTIMEZONE\r\n`;
  let body = '';
  for (const e of events) {
    body += e.rawBlock.replace(/\r?\n/g, '\r\n');
    if (!body.endsWith('\r\n')) body += '\r\n';
  }
  return header + body + 'END:VCALENDAR\r\n';
}

export function downloadICS(events: SXSWEvent[]) {
  if (events.length === 0) return;
  const ics = buildICS(events);
  const dataUri = 'data:text/calendar;charset=utf-8,' + encodeURIComponent(ics);
  const a = document.createElement('a');
  a.href = dataUri;
  a.download = 'SXSW_2026_MySchedule.ics';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
