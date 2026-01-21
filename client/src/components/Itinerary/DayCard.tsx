import type { Day } from '../../types/itinerary';
import { ActivityBlock } from './ActivityBlock';

interface DayCardProps {
  day: Day;
}

const dayEmojis = ['🌅', '🌞', '🌄', '🏔️'];

export function DayCard({ day }: DayCardProps) {
  const emoji = dayEmojis[(day.day_number - 1) % dayEmojis.length];

  // Group activities by time slot
  const morningActivities = day.activities.filter((a) => a.time_slot === 'Morning');
  const afternoonActivities = day.activities.filter((a) => a.time_slot === 'Afternoon');
  const eveningActivities = day.activities.filter((a) => a.time_slot === 'Evening');

  // Calculate total time
  const totalMinutes = day.activities.reduce((sum, act) => {
    return sum + act.duration_minutes + (act.travel_time_to_next || 0);
  }, 0);
  const totalHours = Math.round(totalMinutes / 60 * 10) / 10;

  return (
    <div className="day-card">
      {/* Day Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{emoji}</span>
          <div>
            <h3 className="text-xl font-bold text-jaipur-pink-700">
              Day {day.day_number}
            </h3>
            {day.date && (
              <p className="text-sm text-gray-500">
                {new Date(day.date).toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            )}
          </div>
        </div>
        <div className="text-right">
          <span className="text-sm text-gray-500">
            {day.activities.length} activities
          </span>
          <p className="text-xs text-gray-400">~{totalHours}h total</p>
        </div>
      </div>

      {/* Activities by Time Slot */}
      <div className="space-y-4">
        {/* Morning */}
        {morningActivities.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-gold-500">☀️</span>
              <h4 className="font-medium text-gold-700">Morning</h4>
              <span className="text-xs text-gray-400">9:00 AM - 12:00 PM</span>
            </div>
            <div className="space-y-2">
              {morningActivities.map((activity, index) => (
                <ActivityBlock
                  key={`${day.day_number}-morning-${index}`}
                  activity={activity}
                  showTravelTime={index < morningActivities.length - 1}
                />
              ))}
            </div>
          </div>
        )}

        {/* Afternoon */}
        {afternoonActivities.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-terracotta-500">🌤️</span>
              <h4 className="font-medium text-terracotta-700">Afternoon</h4>
              <span className="text-xs text-gray-400">1:00 PM - 5:00 PM</span>
            </div>
            <div className="space-y-2">
              {afternoonActivities.map((activity, index) => (
                <ActivityBlock
                  key={`${day.day_number}-afternoon-${index}`}
                  activity={activity}
                  showTravelTime={index < afternoonActivities.length - 1}
                />
              ))}
            </div>
          </div>
        )}

        {/* Evening */}
        {eveningActivities.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-jaipur-pink-500">🌙</span>
              <h4 className="font-medium text-jaipur-pink-700">Evening</h4>
              <span className="text-xs text-gray-400">6:00 PM - 9:00 PM</span>
            </div>
            <div className="space-y-2">
              {eveningActivities.map((activity, index) => (
                <ActivityBlock
                  key={`${day.day_number}-evening-${index}`}
                  activity={activity}
                  showTravelTime={index < eveningActivities.length - 1}
                />
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {day.activities.length === 0 && (
          <div className="text-center py-8 text-gray-400">
            <p>No activities planned yet</p>
            <p className="text-sm">Ask me to add something!</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default DayCard;
