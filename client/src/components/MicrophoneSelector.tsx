import { useEffect } from 'react';
import { useAudioDevices } from '../hooks/useAudioDevices';
import { useAppStore } from '../hooks/useItinerary';

export function MicrophoneSelector() {
  const { devices, isLoading, error, hasPermission, refreshDevices } = useAudioDevices();
  const { selectedMicId, setSelectedMicId } = useAppStore();

  // Auto-select first device if none selected and devices are available
  useEffect(() => {
    if (!selectedMicId && devices.length > 0 && hasPermission) {
      setSelectedMicId(devices[0].deviceId);
    }
  }, [devices, selectedMicId, hasPermission, setSelectedMicId]);

  // If the selected device is no longer available, clear selection
  useEffect(() => {
    if (selectedMicId && devices.length > 0) {
      const deviceExists = devices.some(d => d.deviceId === selectedMicId);
      if (!deviceExists) {
        setSelectedMicId(devices[0]?.deviceId || null);
      }
    }
  }, [devices, selectedMicId, setSelectedMicId]);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
            fill="none"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
        <span>Loading microphones...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-red-500">{error}</span>
        <button
          onClick={refreshDevices}
          className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (devices.length === 0) {
    return (
      <div className="text-sm text-gray-500">
        No microphones found
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="mic-select" className="text-sm text-gray-600 flex items-center gap-1">
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
          />
        </svg>
        <span className="sr-only sm:not-sr-only">Mic:</span>
      </label>
      <select
        id="mic-select"
        value={selectedMicId || ''}
        onChange={(e) => setSelectedMicId(e.target.value || null)}
        className="text-sm px-2 py-1 rounded border border-gray-300 bg-white 
                   focus:outline-none focus:ring-2 focus:ring-jaipur-pink-400 focus:border-transparent
                   max-w-[200px] truncate"
      >
        {devices.map((device) => (
          <option key={device.deviceId} value={device.deviceId}>
            {device.label}
          </option>
        ))}
      </select>
      <button
        onClick={refreshDevices}
        className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
        title="Refresh microphone list"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
      </button>
    </div>
  );
}

export default MicrophoneSelector;
