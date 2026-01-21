import { useRef, useCallback, useState } from 'react';

interface AudioRecorderOptions {
  onAudioData: (base64Data: string) => void;
  sampleRate?: number;
  deviceId?: string | null;
}

export function useAudioRecorder({ onAudioData, sampleRate = 16000, deviceId }: AudioRecorderOptions) {
  const [isRecording, setIsRecording] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  const startRecording = useCallback(async (overrideDeviceId?: string) => {
    try {
      // Use override device ID, or the one from options
      const selectedDeviceId = overrideDeviceId || deviceId;
      
      // Request microphone access with optional device selection
      const audioConstraints: MediaTrackConstraints = {
        channelCount: 1,
        sampleRate,
        echoCancellation: true,
        noiseSuppression: true,
      };
      
      // Add device constraint if a specific device is selected
      if (selectedDeviceId) {
        audioConstraints.deviceId = { exact: selectedDeviceId };
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: audioConstraints,
      });

      streamRef.current = stream;

      // Create audio context
      const audioContext = new AudioContext({ sampleRate });
      audioContextRef.current = audioContext;

      // Create source from microphone
      const source = audioContext.createMediaStreamSource(stream);
      sourceRef.current = source;

      // Create script processor for raw PCM data
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (event) => {
        const inputData = event.inputBuffer.getChannelData(0);

        // Convert Float32 to Int16 PCM
        const pcmData = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          const sample = Math.max(-1, Math.min(1, inputData[i]));
          pcmData[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
        }

        // Convert to base64
        const base64 = arrayBufferToBase64(pcmData.buffer);
        onAudioData(base64);
      };

      // Connect nodes
      source.connect(processor);
      processor.connect(audioContext.destination);

      setIsRecording(true);
    } catch (error) {
      console.error('Error starting audio recording:', error);
      throw error;
    }
  }, [onAudioData, sampleRate, deviceId]);

  const stopRecording = useCallback(() => {
    // Disconnect and clean up
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }

    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    setIsRecording(false);
  }, []);

  return {
    isRecording,
    startRecording,
    stopRecording,
  };
}

// Helper function to convert ArrayBuffer to base64
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Audio playback utilities
export class AudioPlayer {
  private audioContext: AudioContext | null = null;
  private gainNode: GainNode | null = null;
  private queue: AudioBuffer[] = [];
  private isPlaying = false;
  private currentSource: AudioBufferSourceNode | null = null;

  async init() {
    this.audioContext = new AudioContext({ sampleRate: 24000 });
    this.gainNode = this.audioContext.createGain();
    this.gainNode.connect(this.audioContext.destination);
  }

  async playAudio(base64Data: string) {
    if (!this.audioContext || !this.gainNode) {
      await this.init();
    }

    try {
      // Decode base64 to ArrayBuffer
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Convert Int16 PCM to Float32
      const int16Data = new Int16Array(bytes.buffer);
      const float32Data = new Float32Array(int16Data.length);
      for (let i = 0; i < int16Data.length; i++) {
        float32Data[i] = int16Data[i] / 32768;
      }

      // Create audio buffer
      const audioBuffer = this.audioContext!.createBuffer(
        1,
        float32Data.length,
        24000
      );
      audioBuffer.getChannelData(0).set(float32Data);

      // Queue and play
      this.queue.push(audioBuffer);
      if (!this.isPlaying) {
        this.playNext();
      }
    } catch (error) {
      console.error('Error playing audio:', error);
    }
  }

  private playNext() {
    if (this.queue.length === 0) {
      this.isPlaying = false;
      this.currentSource = null;
      return;
    }

    this.isPlaying = true;
    const buffer = this.queue.shift()!;
    const source = this.audioContext!.createBufferSource();
    source.buffer = buffer;
    source.connect(this.gainNode!);
    source.onended = () => this.playNext();
    source.start();
    this.currentSource = source;
  }

  stop() {
    // Stop currently playing audio
    if (this.currentSource) {
      try {
        this.currentSource.stop();
      } catch {
        // Ignore errors if already stopped
      }
      this.currentSource = null;
    }
    this.queue = [];
    this.isPlaying = false;
  }
}

export default useAudioRecorder;
