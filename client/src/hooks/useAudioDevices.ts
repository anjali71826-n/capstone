import { useState, useEffect, useCallback } from 'react';

export interface AudioDevice {
  deviceId: string;
  label: string;
  kind: MediaDeviceKind;
}

export function useAudioDevices() {
  const [devices, setDevices] = useState<AudioDevice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState(false);

  const enumerateDevices = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Request microphone permission first to get device labels
      // Without permission, labels are empty strings
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setHasPermission(true);
      
      // Stop the temporary stream
      stream.getTracks().forEach(track => track.stop());

      // Now enumerate devices - labels should be available
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      
      const audioInputs = allDevices
        .filter(device => device.kind === 'audioinput')
        .map(device => ({
          deviceId: device.deviceId,
          label: device.label || `Microphone ${device.deviceId.slice(0, 8)}`,
          kind: device.kind,
        }));

      setDevices(audioInputs);
    } catch (err) {
      console.error('Error enumerating audio devices:', err);
      if (err instanceof DOMException) {
        if (err.name === 'NotAllowedError') {
          setError('Microphone permission denied');
        } else if (err.name === 'NotFoundError') {
          setError('No microphone found');
        } else {
          setError(`Error accessing microphone: ${err.message}`);
        }
      } else {
        setError('Failed to enumerate audio devices');
      }
      setHasPermission(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Listen for device changes (e.g., plugging in a new mic)
  useEffect(() => {
    enumerateDevices();

    const handleDeviceChange = () => {
      enumerateDevices();
    };

    navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);
    
    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange);
    };
  }, [enumerateDevices]);

  const refreshDevices = useCallback(() => {
    enumerateDevices();
  }, [enumerateDevices]);

  return {
    devices,
    isLoading,
    error,
    hasPermission,
    refreshDevices,
  };
}

export default useAudioDevices;
