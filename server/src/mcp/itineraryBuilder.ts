import { POI, calculateDistance, estimateTravelTime } from './poiSearch';

export type TimeSlot = 'Morning' | 'Afternoon' | 'Evening';

export interface Activity {
  time_slot: TimeSlot;
  poi_name: string;
  poi_id?: string;
  duration_minutes: number;
  travel_time_to_next?: number;
  notes: string;
  source?: string;
  lat?: number;
  lon?: number;
}

export interface Day {
  day_number: number;
  date?: string;
  activities: Activity[];
}

export interface Source {
  id: string;
  type: 'osm' | 'wikivoyage' | 'google';
  url?: string;
  title: string;
}

export interface Itinerary {
  name?: string;
  destination: string;
  days: Day[];
  sources: Source[];
}

// Default activity durations by category
const DEFAULT_DURATIONS: Record<string, number> = {
  attraction: 90,
  temple: 60,
  museum: 120,
  restaurant: 60,
  market: 90,
  park: 60,
  hotel: 0,
};

// Time slot hours
const TIME_SLOT_HOURS: Record<TimeSlot, { start: number; end: number }> = {
  Morning: { start: 9, end: 12 },
  Afternoon: { start: 13, end: 17 },
  Evening: { start: 18, end: 21 },
};

export function buildItinerary(
  pois: POI[],
  numDays: number,
  preferences: {
    pace?: 'relaxed' | 'moderate' | 'active';
    interests?: string[];
  } = {}
): Itinerary {
  const { pace = 'moderate' } = preferences;

  // Activities per day based on pace
  const activitiesPerDay = {
    relaxed: 2,
    moderate: 3,
    active: 4,
  }[pace];

  const days: Day[] = [];
  const sources: Source[] = [];
  let poiIndex = 0;

  for (let dayNum = 1; dayNum <= numDays; dayNum++) {
    const dayActivities: Activity[] = [];
    const timeSlots: TimeSlot[] = ['Morning', 'Afternoon', 'Evening'];

    for (let i = 0; i < activitiesPerDay && poiIndex < pois.length; i++) {
      const poi = pois[poiIndex];
      const timeSlot = timeSlots[i % timeSlots.length];
      const duration = DEFAULT_DURATIONS[poi.category] || 60;

      const activity: Activity = {
        time_slot: timeSlot,
        poi_name: poi.name,
        poi_id: poi.id,
        duration_minutes: duration,
        notes: generateActivityNote(poi),
        source: poi.source === 'osm' ? 'OpenStreetMap' : 'Local Guide',
        lat: poi.lat,
        lon: poi.lon,
      };

      // Calculate travel time from previous activity
      if (dayActivities.length > 0) {
        const prevActivity = dayActivities[dayActivities.length - 1];
        if (prevActivity.lat && prevActivity.lon && poi.lat && poi.lon) {
          const distance = calculateDistance(
            prevActivity.lat,
            prevActivity.lon,
            poi.lat,
            poi.lon
          );
          prevActivity.travel_time_to_next = estimateTravelTime(distance);
        }
      }

      dayActivities.push(activity);

      // Add source
      if (!sources.find((s) => s.id === poi.id)) {
        sources.push({
          id: poi.id,
          type: poi.source === 'osm' ? 'osm' : 'wikivoyage',
          title: poi.name,
          url: poi.source === 'osm'
            ? `https://www.openstreetmap.org/node/${poi.id.replace('osm_', '')}`
            : undefined,
        });
      }

      poiIndex++;
    }

    days.push({
      day_number: dayNum,
      activities: dayActivities,
    });
  }

  return {
    name: 'Pink City Adventure',
    destination: 'Jaipur',
    days,
    sources,
  };
}

function generateActivityNote(poi: POI): string {
  const notes: Record<string, string[]> = {
    attraction: [
      'Best visited in the morning for fewer crowds',
      'Don\'t miss the intricate architecture',
      'Great photo opportunities',
      'Allow extra time for exploration',
    ],
    temple: [
      'Dress modestly - cover shoulders and knees',
      'Remove shoes before entering',
      'Best visited during morning prayers',
      'Photography may be restricted inside',
    ],
    museum: [
      'Audio guides available at entrance',
      'Allow 2+ hours to see everything',
      'Photography permitted in most areas',
      'Closed on certain holidays',
    ],
    restaurant: [
      'Try the local specialties',
      'Vegetarian options widely available',
      'Peak hours 12-2pm and 7-9pm',
      'Cash preferred at traditional eateries',
    ],
    market: [
      'Bargaining is expected',
      'Best prices in the morning',
      'Known for textiles and handicrafts',
      'Keep valuables secure',
    ],
    park: [
      'Best visited early morning or evening',
      'Carry water, especially in summer',
      'Great for photography',
      'Peaceful escape from city bustle',
    ],
  };

  const categoryNotes = notes[poi.category] || notes.attraction;
  return categoryNotes[Math.floor(Math.random() * categoryNotes.length)];
}

export function updateItinerary(
  itinerary: Itinerary,
  action: string,
  dayNumber?: number,
  activity?: Partial<Activity>
): Itinerary {
  const updated = JSON.parse(JSON.stringify(itinerary)) as Itinerary;

  switch (action) {
    case 'add_activity':
      if (dayNumber && activity) {
        let day = updated.days.find((d) => d.day_number === dayNumber);
        // Create the day if it doesn't exist
        if (!day) {
          day = { day_number: dayNumber, activities: [] };
          updated.days.push(day);
          // Sort days by day_number
          updated.days.sort((a, b) => a.day_number - b.day_number);
        }
        day.activities.push(activity as Activity);
      }
      break;

    case 'remove_activity':
      if (dayNumber && activity?.poi_name) {
        const day = updated.days.find((d) => d.day_number === dayNumber);
        if (day) {
          day.activities = day.activities.filter(
            (a) => a.poi_name !== activity.poi_name
          );
        }
      }
      break;

    case 'update_activity':
      if (dayNumber && activity?.poi_name) {
        const day = updated.days.find((d) => d.day_number === dayNumber);
        if (day) {
          const actIndex = day.activities.findIndex(
            (a) => a.poi_name === activity.poi_name
          );
          if (actIndex !== -1) {
            day.activities[actIndex] = {
              ...day.activities[actIndex],
              ...activity,
            } as Activity;
          }
        }
      }
      break;

    case 'clear_day':
      if (dayNumber) {
        const day = updated.days.find((d) => d.day_number === dayNumber);
        if (day) {
          day.activities = [];
        }
      }
      break;
  }

  // Recalculate travel times
  for (const day of updated.days) {
    for (let i = 0; i < day.activities.length - 1; i++) {
      const current = day.activities[i];
      const next = day.activities[i + 1];
      if (current.lat && current.lon && next.lat && next.lon) {
        const distance = calculateDistance(
          current.lat,
          current.lon,
          next.lat,
          next.lon
        );
        current.travel_time_to_next = estimateTravelTime(distance);
      }
    }
  }

  return updated;
}

export function validateItinerary(itinerary: Itinerary): {
  valid: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  for (const day of itinerary.days) {
    // Check max activities per day
    if (day.activities.length > 4) {
      issues.push(
        `Day ${day.day_number} has ${day.activities.length} activities (max 4 recommended)`
      );
    }

    // Check total time doesn't exceed reasonable hours
    const totalMinutes = day.activities.reduce((sum, act) => {
      return sum + act.duration_minutes + (act.travel_time_to_next || 0);
    }, 0);

    if (totalMinutes > 600) {
      // 10 hours
      issues.push(
        `Day ${day.day_number} is too packed (${Math.round(totalMinutes / 60)} hours)`
      );
    }
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

export default buildItinerary;
