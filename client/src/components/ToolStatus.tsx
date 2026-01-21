import { useToolStatus } from '../hooks/useItinerary';

export function ToolStatus() {
  const toolStatus = useToolStatus();

  if (!toolStatus) {
    return null;
  }

  return (
    <div className="flex items-center justify-center gap-2 text-sm text-terracotta-600 animate-fade-in">
      <div className="flex items-center gap-1.5">
        {/* Animated dots */}
        <span className="flex gap-1">
          <span className="w-1.5 h-1.5 bg-jaipur-pink-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-1.5 h-1.5 bg-jaipur-pink-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-1.5 h-1.5 bg-jaipur-pink-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </span>
        <span className="ml-1">{toolStatus.displayText}</span>
      </div>
    </div>
  );
}

export default ToolStatus;
