import { useEffect, useRef } from 'react';
import { useAppStore } from '../hooks/useItinerary';

export function Transcript() {
  const { transcript } = useAppStore();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcript]);

  if (transcript.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-gray-400 text-center">
        <div>
          <p className="text-4xl mb-2">💬</p>
          <p>Your conversation will appear here</p>
          <p className="text-sm mt-1">Click the orb and start speaking</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      className="h-full overflow-y-auto space-y-2 pr-2"
    >
      {transcript.map((message) => (
        <div
          key={message.id}
          className={`transcript-bubble ${message.role}`}
        >
          <p className="text-sm">{message.text}</p>
          <span className="text-xs opacity-60 mt-1 block">
            {message.timestamp.toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
            {message.isPartial && ' (typing...)'}
          </span>
        </div>
      ))}
    </div>
  );
}

export default Transcript;
