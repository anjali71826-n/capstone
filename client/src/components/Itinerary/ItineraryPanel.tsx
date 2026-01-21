import { useAppStore } from '../../hooks/useItinerary';
import { DayCard } from './DayCard';

export function ItineraryPanel() {
  const { itinerary } = useAppStore();

  if (!itinerary || itinerary.days.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-6xl mb-4">🌍</div>
        <h3 className="text-xl font-semibold text-jaipur-pink-700 mb-2">
          Ready to Plan Your Trip?
        </h3>
        <p className="text-gray-600 max-w-md mx-auto">
          Start speaking to plan your trip. Tell me where you'd like to go, how many days you'll be visiting,
          and what interests you most - history, food, shopping, or photography!
        </p>
        <div className="mt-6 flex flex-wrap gap-2 justify-center">
          {['3 days exploring', 'Food tour', 'Photography spots', 'Local experiences'].map(
            (suggestion) => (
              <span
                key={suggestion}
                className="px-3 py-1 bg-jaipur-pink-100 text-jaipur-pink-700 rounded-full text-sm"
              >
                "{suggestion}"
              </span>
            )
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Itinerary Header */}
      <div className="flex items-center gap-3">
        <span className="text-3xl">📍</span>
        <div>
          <h3 className="text-2xl font-bold text-jaipur-pink-700">
            {itinerary.name || `${itinerary.destination || 'Your'} Trip`}
          </h3>
          <p className="text-gray-600">
            {itinerary.destination && <span className="font-medium">{itinerary.destination} • </span>}
            {itinerary.days.length} day{itinerary.days.length !== 1 && 's'} of adventure
          </p>
        </div>
      </div>

      {/* Day Cards */}
      <div className="space-y-4">
        {itinerary.days.map((day) => (
          <DayCard key={day.day_number} day={day} />
        ))}
      </div>

      {/* Summary */}
      <div className="mt-6 p-4 bg-jaipur-pink-50 rounded-xl">
        <h4 className="font-semibold text-jaipur-pink-700 mb-2">Trip Summary</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Total Days</span>
            <p className="font-semibold">{itinerary.days.length}</p>
          </div>
          <div>
            <span className="text-gray-500">Activities</span>
            <p className="font-semibold">
              {itinerary.days.reduce((sum, day) => sum + day.activities.length, 0)}
            </p>
          </div>
          <div>
            <span className="text-gray-500">Sources</span>
            <p className="font-semibold">{itinerary.sources?.length || 0}</p>
          </div>
          <div>
            <span className="text-gray-500">Status</span>
            <p className="font-semibold text-green-600">Ready</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ItineraryPanel;
