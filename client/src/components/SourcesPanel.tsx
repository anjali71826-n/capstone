import { useAppStore } from '../hooks/useItinerary';

export function SourcesPanel() {
  const { sources } = useAppStore();

  if (sources.length === 0) {
    return null;
  }

  return (
    <div className="glass-panel p-4">
      <h2 className="text-lg font-semibold text-jaipur-pink-700 mb-3">
        Sources
      </h2>
      <div className="flex flex-wrap gap-2">
        {sources.map((source) => (
          <a
            key={source.id}
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="source-chip"
          >
            {source.type === 'osm' && '🗺️ '}
            {source.type === 'wikivoyage' && '📖 '}
            {source.type === 'google' && '🔍 '}
            {source.title}
          </a>
        ))}
      </div>
      <p className="text-xs text-gray-500 mt-3">
        All recommendations are sourced from open data and travel guides.
      </p>
    </div>
  );
}

export default SourcesPanel;
