import { create } from 'zustand';
import type {
  Itinerary,
  TranscriptMessage,
  Source,
  ConnectionStatus,
  Activity,
} from '../types/itinerary';

export interface ToolStatus {
  name: string;
  displayText: string;
  timestamp: number;
}

interface AppState {
  // Connection
  connectionStatus: ConnectionStatus;
  setConnectionStatus: (status: ConnectionStatus) => void;

  // Voice state
  isListening: boolean;
  setIsListening: (listening: boolean) => void;
  isSpeaking: boolean;
  setIsSpeaking: (speaking: boolean) => void;

  // Tool status for showing realtime activity
  toolStatus: ToolStatus | null;
  setToolStatus: (status: ToolStatus | null) => void;

  // Audio device selection
  selectedMicId: string | null;
  setSelectedMicId: (deviceId: string | null) => void;

  // Itinerary
  itinerary: Itinerary | null;
  setItinerary: (itinerary: Itinerary | null) => void;
  updateItinerary: (action: string, dayNumber?: number, activity?: Partial<Activity>) => void;

  // Transcript
  transcript: TranscriptMessage[];
  addTranscriptMessage: (message: Omit<TranscriptMessage, 'id' | 'timestamp'>) => void;
  updateLastMessage: (text: string) => void;
  clearTranscript: () => void;

  // Sources
  sources: Source[];
  addSource: (source: Source) => void;
  clearSources: () => void;

  // Error
  error: string | null;
  setError: (error: string | null) => void;

  // Reset
  reset: () => void;
}

const initialState = {
  connectionStatus: 'disconnected' as ConnectionStatus,
  isListening: false,
  isSpeaking: false,
  toolStatus: null as ToolStatus | null,
  selectedMicId: null as string | null,
  itinerary: null,
  transcript: [],
  sources: [],
  error: null,
};

export const useAppStore = create<AppState>((set, get) => ({
  ...initialState,

  setConnectionStatus: (status) => set({ connectionStatus: status }),

  setIsListening: (listening) => set({ isListening: listening }),

  setIsSpeaking: (speaking) => set({ isSpeaking: speaking }),

  setToolStatus: (status) => set({ toolStatus: status }),

  setSelectedMicId: (deviceId) => set({ selectedMicId: deviceId }),

  setItinerary: (itinerary) => set({ itinerary }),

  updateItinerary: (action, dayNumber, activity) => {
    const { itinerary } = get();
    if (!itinerary) return;

    const updated = JSON.parse(JSON.stringify(itinerary)) as Itinerary;

    switch (action) {
      case 'add_activity':
        if (dayNumber && activity) {
          const day = updated.days.find((d) => d.day_number === dayNumber);
          if (day) {
            day.activities.push(activity as Activity);
          }
        }
        break;

      case 'remove_activity':
        if (dayNumber && activity?.poi_name) {
          const day = updated.days.find((d) => d.day_number === dayNumber);
          if (day) {
            day.activities = day.activities.filter(
              (a) => a.poi_name !== activity.poi_name
            );
          }
        }
        break;

      case 'clear_day':
        if (dayNumber) {
          const day = updated.days.find((d) => d.day_number === dayNumber);
          if (day) {
            day.activities = [];
          }
        }
        break;
    }

    set({ itinerary: updated });
  },

  addTranscriptMessage: (message) => {
    const newMessage: TranscriptMessage = {
      ...message,
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
    };

    set((state) => ({
      transcript: [...state.transcript, newMessage],
    }));
  },

  updateLastMessage: (text) => {
    set((state) => {
      const transcript = [...state.transcript];
      if (transcript.length > 0) {
        const last = transcript[transcript.length - 1];
        if (last.role === 'assistant' && last.isPartial) {
          transcript[transcript.length - 1] = {
            ...last,
            text: last.text + text,
          };
        }
      }
      return { transcript };
    });
  },

  clearTranscript: () => set({ transcript: [] }),

  addSource: (source) => {
    set((state) => {
      // Avoid duplicates
      if (state.sources.find((s) => s.id === source.id)) {
        return state;
      }
      return { sources: [...state.sources, source] };
    });
  },

  clearSources: () => set({ sources: [] }),

  setError: (error) => set({ error }),

  reset: () => set(initialState),
}));

// Selectors for convenience
export const useConnectionStatus = () =>
  useAppStore((state) => state.connectionStatus);
export const useIsListening = () => useAppStore((state) => state.isListening);
export const useIsSpeaking = () => useAppStore((state) => state.isSpeaking);
export const useToolStatus = () => useAppStore((state) => state.toolStatus);
export const useSelectedMicId = () => useAppStore((state) => state.selectedMicId);
export const useItinerary = () => useAppStore((state) => state.itinerary);
export const useTranscript = () => useAppStore((state) => state.transcript);
export const useSources = () => useAppStore((state) => state.sources);
