import { useCallback, useRef, useEffect } from 'react';
import { useAppStore } from '../hooks/useItinerary';
import { useAudioRecorder } from '../hooks/useAudioRecorder';

interface VoiceOrbProps {
  sendAudio: (base64Data: string) => void;
  stopSpeech: () => void;
  sendInterrupt: () => void;
}

export function VoiceOrb({ sendAudio, stopSpeech, sendInterrupt }: VoiceOrbProps) {
  const { connectionStatus, isListening, isSpeaking, setIsListening, selectedMicId } = useAppStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const wasInterruptedRef = useRef(false);

  // Use audio recorder to stream audio directly to Gemini
  const { isRecording, startRecording, stopRecording } = useAudioRecorder({
    onAudioData: (base64Data) => {
      // Stream audio chunks directly to Gemini via WebSocket
      sendAudio(base64Data);
    },
    sampleRate: 16000,
    deviceId: selectedMicId,
  });

  // Sync the recording state with the global isListening state
  useEffect(() => {
    if (isRecording !== isListening) {
      setIsListening(isRecording);
    }
    // Reset interrupt flag when recording stops
    if (!isRecording) {
      wasInterruptedRef.current = false;
    }
  }, [isRecording, isListening, setIsListening]);

  const toggleListening = useCallback(async () => {
    console.log('Toggle listening clicked, connectionStatus:', connectionStatus, 'isRecording:', isRecording, 'isSpeaking:', isSpeaking);

    if (connectionStatus !== 'ready') {
      console.log('Not ready, connectionStatus is:', connectionStatus);
      return;
    }

    if (isRecording) {
      console.log('Stopping recording');
      stopRecording();
    } else {
      // Only interrupt if AI is currently speaking
      if (isSpeaking) {
        console.log('AI is speaking - interrupting before recording');
        stopSpeech();
        sendInterrupt();
        wasInterruptedRef.current = true;
      }
      
      try {
        console.log('Starting audio recording...');
        await startRecording();
      } catch (error) {
        console.error('Failed to start recording:', error);
        alert('Could not access microphone. Please check permissions.');
      }
    }
  }, [connectionStatus, isRecording, isSpeaking, startRecording, stopRecording, stopSpeech, sendInterrupt]);

  // Animation loop for the orb
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;

    let phase = 0;

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      // Draw waves when listening or speaking
      if (isListening || isSpeaking) {
        const numWaves = 5;
        const baseRadius = 40;

        for (let i = 0; i < numWaves; i++) {
          const wavePhase = phase + (i * Math.PI) / numWaves;
          const amplitude = isListening ? 15 : 10;
          const radius = baseRadius + Math.sin(wavePhase * 2) * amplitude + i * 5;

          ctx.beginPath();
          ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
          ctx.strokeStyle = isSpeaking
            ? `rgba(240, 200, 32, ${0.3 - i * 0.05})`
            : `rgba(224, 77, 112, ${0.3 - i * 0.05})`;
          ctx.lineWidth = 3;
          ctx.stroke();
        }

        phase += 0.05;
      }

      // Draw audio bars when listening
      if (isListening) {
        const numBars = 5;
        const barWidth = 4;
        const maxBarHeight = 30;
        const spacing = 8;
        const startX = centerX - ((numBars * barWidth + (numBars - 1) * spacing) / 2);

        for (let i = 0; i < numBars; i++) {
          const barPhase = phase * 3 + i * 0.5;
          const barHeight = Math.abs(Math.sin(barPhase)) * maxBarHeight + 5;

          ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
          ctx.fillRect(
            startX + i * (barWidth + spacing),
            centerY - barHeight / 2,
            barWidth,
            barHeight
          );
        }
      }

      // Draw microphone icon when idle
      if (!isListening && !isSpeaking) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.font = '32px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🎤', centerX, centerY);
      }

      // Draw speaker icon when speaking
      if (isSpeaking && !isListening) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.font = '32px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🔊', centerX, centerY);
      }

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isListening, isSpeaking]);

  const orbClasses = [
    'voice-orb',
    isListening && 'listening',
    isSpeaking && 'speaking',
    connectionStatus !== 'ready' && 'opacity-50 cursor-not-allowed',
  ]
    .filter(Boolean)
    .join(' ');

  // Determine aria-label based on current state
  const getAriaLabel = () => {
    if (isSpeaking) return 'Tap to interrupt';
    if (isListening) return 'Stop listening';
    return 'Start listening';
  };

  // Determine status text for screen readers
  const getStatusText = () => {
    if (isListening) return 'Listening...';
    if (isSpeaking) return 'Speaking... Tap to interrupt';
    return 'Click to speak';
  };

  return (
    <button
      onClick={toggleListening}
      disabled={connectionStatus !== 'ready'}
      className={orbClasses}
      aria-label={getAriaLabel()}
    >
      <canvas
        ref={canvasRef}
        width={128}
        height={128}
        className="absolute inset-0"
      />
      <span className="sr-only">
        {getStatusText()}
      </span>
    </button>
  );
}

export default VoiceOrb;
