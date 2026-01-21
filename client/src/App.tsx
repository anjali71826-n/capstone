import { useEffect } from 'react';
import { useAppStore } from './hooks/useItinerary';
import { useWebSocket } from './hooks/useWebSocket';
import { VoiceOrb } from './components/VoiceOrb';
import { ToolStatus } from './components/ToolStatus';
import { ItineraryPanel } from './components/Itinerary/ItineraryPanel';
import { Transcript } from './components/Transcript';
import { SourcesPanel } from './components/SourcesPanel';
import { EmailButton } from './components/EmailButton';
import { MicrophoneSelector } from './components/MicrophoneSelector';

function App() {
  const { connectionStatus, error, itinerary, isSpeaking } = useAppStore();
  const { connect, disconnect, sendText, sendTextWithInterrupt, sendAudio, stopSpeech, sendInterrupt } = useWebSocket();

  useEffect(() => {
    // Auto-connect on mount
    connect();

    return () => {
      disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen p-4 md:p-8">
      {/* Header */}
      <header className="text-center mb-8">
        <h1 className="text-4xl md:text-5xl font-bold text-jaipur-pink-700 mb-2">
          Travel Planner
        </h1>
        <p className="text-terracotta-600 text-lg">
          Your Voice-First AI Travel Assistant
        </p>
        <div className="mt-2 flex items-center justify-center gap-2">
          <span
            className={`inline-block w-3 h-3 rounded-full ${
              connectionStatus === 'ready'
                ? 'bg-green-500'
                : connectionStatus === 'connecting'
                ? 'bg-yellow-500 animate-pulse'
                : 'bg-red-500'
            }`}
          />
          <span className="text-sm text-gray-600 capitalize">
            {connectionStatus}
          </span>
        </div>
      </header>

      {/* Error Message */}
      {error && (
        <div className="max-w-2xl mx-auto mb-6 p-4 bg-red-100 border border-red-300 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* Main Layout */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Panel - Voice & Transcript */}
        <div className="lg:col-span-1 space-y-6">
          {/* Voice Orb */}
          <div className="glass-panel p-8 flex flex-col items-center">
            <VoiceOrb sendAudio={sendAudio} stopSpeech={stopSpeech} sendInterrupt={sendInterrupt} />
            
            {/* Realtime tool status */}
            <div className="mt-4 h-6">
              <ToolStatus />
            </div>
            
            <p className="mt-2 text-center text-gray-600 text-sm">
              {connectionStatus === 'ready'
                ? 'Click and speak to plan your trip'
                : 'Connecting to AI assistant...'}
            </p>
            <div className="mt-4 w-full flex justify-center">
              <MicrophoneSelector />
            </div>
          </div>

          {/* Text Input (fallback) */}
          <div className="glass-panel p-4">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const input = e.currentTarget.querySelector('input');
                if (input && input.value.trim()) {
                  // If AI is speaking, interrupt and send new message immediately
                  if (isSpeaking) {
                    sendTextWithInterrupt(input.value);
                  } else {
                    sendText(input.value);
                  }
                  input.value = '';
                }
              }}
              className="flex gap-2"
            >
              <input
                type="text"
                placeholder="Or type your message..."
                className="flex-1 px-4 py-2 rounded-lg border border-jaipur-pink-200 focus:outline-none focus:ring-2 focus:ring-jaipur-pink-400"
                disabled={connectionStatus !== 'ready'}
              />
              <button
                type="submit"
                disabled={connectionStatus !== 'ready'}
                className="px-4 py-2 bg-jaipur-pink-500 text-white rounded-lg hover:bg-jaipur-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Send
              </button>
            </form>
          </div>

          {/* Transcript */}
          <div className="glass-panel p-4 h-80 overflow-hidden">
            <h2 className="text-lg font-semibold text-jaipur-pink-700 mb-3">
              Conversation
            </h2>
            <Transcript />
          </div>

          {/* Sources */}
          <SourcesPanel />
        </div>

        {/* Right Panel - Itinerary */}
        <div className="lg:col-span-2">
          <div className="glass-panel p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-jaipur-pink-700">
                Your Itinerary
              </h2>
              {itinerary && itinerary.days.length > 0 && <EmailButton />}
            </div>
            <ItineraryPanel />
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="text-center mt-12 text-gray-500 text-sm">
        <p>Powered by Google Gemini Multimodal Live API</p>
        <p className="mt-1">
          Data from OpenStreetMap &bull; Tips from Wikivoyage
        </p>
      </footer>
    </div>
  );
}

export default App;
