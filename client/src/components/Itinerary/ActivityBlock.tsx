import type { Activity } from '../../types/itinerary';

interface ActivityBlockProps {
  activity: Activity;
  showTravelTime?: boolean;
}

const timeSlotColors: Record<string, string> = {
  Morning: 'time-slot-morning',
  Afternoon: 'time-slot-afternoon',
  Evening: 'time-slot-evening',
};

export function ActivityBlock({ activity, showTravelTime }: ActivityBlockProps) {
  const colorClass = timeSlotColors[activity.time_slot] || '';

  return (
    <div>
      <div className={`activity-block ${colorClass}`}>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h5 className="font-semibold text-gray-800">{activity.poi_name}</h5>
            {activity.notes && (
              <p className="text-sm text-gray-600 mt-1">{activity.notes}</p>
            )}
          </div>
          <div className="text-right ml-4">
            <span className="text-sm text-gray-500">
              {formatDuration(activity.duration_minutes)}
            </span>
          </div>
        </div>

        {/* Metadata row */}
        <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
          {activity.source && (
            <span className="flex items-center gap-1">
              {activity.source === 'OpenStreetMap' ? '🗺️' : '📖'}
              {activity.source}
            </span>
          )}
          {activity.poi_id && (
            <span>ID: {activity.poi_id}</span>
          )}
        </div>
      </div>

      {/* Travel time indicator */}
      {showTravelTime && activity.travel_time_to_next && (
        <div className="flex items-center gap-2 py-2 px-4 text-xs text-gray-400">
          <div className="flex-1 border-t border-dashed border-gray-300" />
          <span className="flex items-center gap-1">
            🚗 {activity.travel_time_to_next} min travel
          </span>
          <div className="flex-1 border-t border-dashed border-gray-300" />
        </div>
      )}
    </div>
  );
}

function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${mins}m`;
}

export default ActivityBlock;
