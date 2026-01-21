export type TimeSlot = 'Morning' | 'Afternoon' | 'Evening';

export interface Activity {
  time_slot: TimeSlot;
  poi_name: string;
  poi_id?: string;
  duration_minutes: number;
  travel_time_to_next?: number;
  notes: string;
  source?: string;
  lat?: number;
  lon?: number;
}

export interface Day {
  day_number: number;
  date?: string;
  activities: Activity[];
}

export interface Source {
  id: string;
  type: 'osm' | 'wikivoyage' | 'google';
  url?: string;
  title: string;
}

export interface Itinerary {
  name?: string;
  destination: string;
  days: Day[];
  sources: Source[];
}

export interface TranscriptMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: Date;
  isPartial?: boolean;
}

export type ConnectionStatus = 'disconnected' | 'connecting' | 'ready' | 'error';

export interface AppState {
  connectionStatus: ConnectionStatus;
  isListening: boolean;
  isSpeaking: boolean;
  itinerary: Itinerary | null;
  transcript: TranscriptMessage[];
  sources: Source[];
  error: string | null;
}
