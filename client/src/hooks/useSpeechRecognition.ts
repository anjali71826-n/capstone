import { useRef, useCallback, useState, useEffect } from 'react';

interface SpeechRecognitionOptions {
  onResult: (transcript: string) => void;
  onInterimResult?: (transcript: string) => void;
  continuous?: boolean;
  language?: string;
  deviceId?: string | null;
}

// Type definitions for Web Speech API
interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: Event & { error: string }) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
  onaudiostart: (() => void) | null;
  onspeechstart: (() => void) | null;
  onspeechend: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition: new () => SpeechRecognitionInstance;
  }
}

export function useSpeechRecognition({
  onResult,
  onInterimResult,
  continuous = false,
  language = 'en-US',
  deviceId,
}: SpeechRecognitionOptions) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  // Use refs for callbacks to avoid re-creating recognition on every render
  const onResultRef = useRef(onResult);
  const onInterimResultRef = useRef(onInterimResult);
  
  // Keep refs updated with latest callbacks
  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);
  
  useEffect(() => {
    onInterimResultRef.current = onInterimResult;
  }, [onInterimResult]);

  useEffect(() => {
    // Check if browser supports Speech Recognition
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    setIsSupported(!!SpeechRecognition);

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = continuous;
      recognition.interimResults = !!onInterimResultRef.current;
      recognition.lang = language;

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        console.log('Speech recognition result event:', event.results.length, 'results');
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            finalTranscript += result[0].transcript;
            console.log('Final transcript:', finalTranscript);
          } else {
            interimTranscript += result[0].transcript;
            console.log('Interim transcript:', interimTranscript);
          }
        }

        if (interimTranscript && onInterimResultRef.current) {
          onInterimResultRef.current(interimTranscript);
        }

        if (finalTranscript) {
          console.log('Sending final transcript to callback:', finalTranscript);
          onResultRef.current(finalTranscript);
        }
      };

      recognition.onerror = (event) => {
        console.error('[SpeechRecognition] Error:', event.error);
        if (event.error !== 'no-speech') {
          setIsListening(false);
        }
      };

      recognition.onend = () => {
        console.log('[SpeechRecognition] onend - recognition ended');
        setIsListening(false);
        // Clean up the device stream when recognition ends
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
      };

      recognition.onstart = () => {
        console.log('[SpeechRecognition] onstart - recognition started successfully');
        setIsListening(true);
      };
      
      recognition.onaudiostart = () => {
        console.log('[SpeechRecognition] onaudiostart - audio capture started');
      };
      
      recognition.onspeechstart = () => {
        console.log('[SpeechRecognition] onspeechstart - speech detected');
      };
      
      recognition.onspeechend = () => {
        console.log('[SpeechRecognition] onspeechend - speech ended');
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [continuous, language]);

  const startListening = useCallback(async () => {
    console.log('[SpeechRecognition] startListening called, recognitionRef:', !!recognitionRef.current, 'isListening:', isListening);
    if (recognitionRef.current && !isListening) {
      try {
        // If a specific device is selected, acquire a stream from it first
        // This may help some browsers use the correct microphone
        if (deviceId) {
          console.log('[SpeechRecognition] Acquiring stream for device:', deviceId);
          try {
            const stream = await navigator.mediaDevices.getUserMedia({
              audio: {
                deviceId: { exact: deviceId },
                echoCancellation: true,
                noiseSuppression: true,
              },
            });
            streamRef.current = stream;
            console.log('[SpeechRecognition] Stream acquired successfully');
          } catch (err) {
            console.warn('[SpeechRecognition] Could not acquire stream for selected device:', err);
          }
        }
        
        console.log('[SpeechRecognition] Calling recognition.start()');
        recognitionRef.current.start();
      } catch (error) {
        console.error('[SpeechRecognition] Error starting speech recognition:', error);
        // Clean up stream if recognition failed
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
      }
    } else {
      console.log('[SpeechRecognition] Cannot start - recognitionRef:', !!recognitionRef.current, 'isListening:', isListening);
    }
  }, [isListening, deviceId]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
    // Clean up the device stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, [isListening]);

  return {
    isListening,
    isSupported,
    startListening,
    stopListening,
  };
}

export default useSpeechRecognition;
