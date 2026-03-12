export interface RawEvent {
  uid: string;
  summary: string;
  description?: string;
  dtstart: string;
  dtend: string;
  url: string;
  location: string;
  cost: string;
  type: string;
  rawBlock: string;
}

export interface SXSWEvent {
  uid: string;
  summary: string;
  description: string;
  start: Date;
  end: Date;
  url: string;
  location: string;
  cost: string;
  type: string;
  rawBlock: string;
  index: number;
}

export interface Conflict {
  id: string;
  eventA: number;
  eventB: number;
  overlapMinutes: number;
  resolved: boolean;
  winner: number | null;
}

export type ViewMode = 'discover' | 'resolve' | 'schedule' | 'map';

export interface Filters {
  cost: string;
  type: string;
  search: string;
}
