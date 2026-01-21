import { searchPOIs, calculateDistance, estimateTravelTime, POI } from './poiSearch';
import { buildItinerary, updateItinerary, Itinerary } from './itineraryBuilder';
import { getWeather } from './weatherService';
import { getCityInfo } from '../rag/wikivoyage';
import { searchDestinationInfo } from './webSearch';

// Store current itinerary in memory (per session, would be per-client in production)
let currentItinerary: Itinerary | null = null;

// POI name to coordinates lookup (built from searches)
const poiCoordinates: Map<string, { lat: number; lon: number }> = new Map();

export async function executeToolCall(
  toolName: string,
  args: unknown
): Promise<unknown> {
  const params = args as Record<string, unknown>;

  switch (toolName) {
    case 'poi_search': {
      const destination = params.destination as string;
      const category = params.category as string;
      const interests = params.interests as string[] | undefined;
      const limit = (params.limit as number) || 5;

      if (!destination) {
        return {
          success: false,
          error: 'Destination is required for POI search',
        };
      }

      const pois = await searchPOIs(destination, category, interests, limit);

      // Store coordinates for travel time calculations
      pois.forEach((poi) => {
        poiCoordinates.set(poi.name.toLowerCase(), { lat: poi.lat, lon: poi.lon });
      });

      return {
        success: true,
        destination,
        results: pois,
        count: pois.length,
        source: 'OpenStreetMap',
      };
    }

    case 'update_itinerary': {
      const action = params.action as string;
      console.log(`update_itinerary called with action: ${action}`, JSON.stringify(params).slice(0, 500));

      // Handle 'set' action - parse itinerary_json string or use full_itinerary object
      if (action === 'set') {
        if (params.itinerary_json) {
          // itinerary_json is a JSON string that needs parsing
          try {
            currentItinerary = JSON.parse(params.itinerary_json as string) as Itinerary;
            console.log('Parsed itinerary from itinerary_json:', currentItinerary?.destination, currentItinerary?.days?.length, 'days');
          } catch (e) {
            console.error('Failed to parse itinerary_json:', e);
            return { success: false, error: 'Invalid itinerary_json format' };
          }
        } else if (params.full_itinerary) {
          // full_itinerary is already an object
          currentItinerary = params.full_itinerary as Itinerary;
          console.log('Used full_itinerary object:', currentItinerary?.destination);
        }
        
        if (currentItinerary && currentItinerary.days) {
          // Apply name from params if provided, or generate a default
          if (params.name) {
            currentItinerary.name = params.name as string;
          } else if (!currentItinerary.name && currentItinerary.destination) {
            currentItinerary.name = `${currentItinerary.destination} Adventure`;
          }
          
          return {
            success: true,
            itinerary: currentItinerary,
            message: 'Itinerary set successfully',
          };
        }
      }

      if (!currentItinerary) {
        // Initialize empty itinerary with destination from params or default
        const destination = params.destination as string || 'Unknown';
        const name = params.name as string || `${destination} Trip`;
        currentItinerary = {
          name,
          destination,
          days: [],
          sources: [],
        };
        console.log('Initialized empty itinerary for:', destination, 'with name:', name);
      } else {
        // Update destination and name if provided
        if (params.destination) {
          currentItinerary.destination = params.destination as string;
        }
        if (params.name) {
          currentItinerary.name = params.name as string;
        }
        // Generate default name if missing
        if (!currentItinerary.name && currentItinerary.destination) {
          currentItinerary.name = `${currentItinerary.destination} Adventure`;
        }
      }

      const dayNumber = params.day_number as number | undefined;
      
      // Build activity object from individual parameters if not provided as nested object
      let activity = params.activity as Record<string, unknown> | undefined;
      if (!activity && (params.poi_name || params.time_slot)) {
        activity = {
          time_slot: params.time_slot || 'Morning',
          poi_name: params.poi_name,
          duration_minutes: params.duration_minutes || 60,
          notes: params.notes || '',
        };
        console.log('Built activity from params:', activity);
      }

      // Handle building new itinerary from POIs
      if (action === 'build' && params.num_days) {
        const numDays = params.num_days as number;
        const pois = (params.pois as POI[]) || [];
        const preferences = params.preferences as { pace?: string; interests?: string[] } || {};

        currentItinerary = buildItinerary(
          pois,
          numDays,
          preferences as { pace?: 'relaxed' | 'moderate' | 'active'; interests?: string[] }
        );

        return {
          success: true,
          itinerary: currentItinerary,
          message: `Built ${numDays}-day itinerary`,
        };
      }

      // Handle other actions
      currentItinerary = updateItinerary(
        currentItinerary,
        action,
        dayNumber,
        activity as Partial<{ time_slot: 'Morning' | 'Afternoon' | 'Evening'; poi_name: string; poi_id?: string; duration_minutes: number; travel_time_to_next?: number; notes: string; source?: string; lat?: number; lon?: number }>
      );

      return {
        success: true,
        itinerary: currentItinerary,
        message: `Itinerary updated: ${action}`,
      };
    }

    case 'get_city_info': {
      const destination = params.destination as string;
      const topic = params.topic as string;

      if (!destination) {
        return {
          success: false,
          error: 'Destination is required for city info',
        };
      }

      const info = await getCityInfo(destination, topic);

      return {
        success: true,
        destination,
        topic,
        content: info.content,
        source: info.source,
      };
    }

    case 'get_weather': {
      const destination = params.destination as string;
      const date = params.date as string;

      if (!destination) {
        return {
          success: false,
          error: 'Destination is required for weather',
        };
      }

      const weather = await getWeather(destination, date);

      return {
        success: true,
        weather,
      };
    }

    case 'calculate_travel_time': {
      const fromPoi = (params.from_poi as string).toLowerCase();
      const toPoi = (params.to_poi as string).toLowerCase();
      const mode = (params.mode as 'auto' | 'taxi' | 'walking') || 'auto';

      const fromCoords = poiCoordinates.get(fromPoi);
      const toCoords = poiCoordinates.get(toPoi);

      if (!fromCoords || !toCoords) {
        return {
          success: false,
          error: 'Location coordinates not found. Please search for POIs first.',
        };
      }

      const distance = calculateDistance(
        fromCoords.lat,
        fromCoords.lon,
        toCoords.lat,
        toCoords.lon
      );
      const travelTime = estimateTravelTime(distance, mode);

      return {
        success: true,
        from: params.from_poi,
        to: params.to_poi,
        distance_km: Math.round(distance * 10) / 10,
        travel_time_minutes: travelTime,
        mode,
      };
    }

    case 'search_destination_info': {
      const destination = params.destination as string;
      const queryType = params.query_type as string;

      if (!destination) {
        return {
          success: false,
          error: 'Destination is required for web search',
        };
      }

      console.log(`Searching web for ${destination} - ${queryType}...`);
      const info = await searchDestinationInfo(destination, queryType);

      return {
        success: true,
        destination,
        query_type: queryType,
        content: info.content,
        sources: info.sources,
      };
    }

    default:
      return {
        success: false,
        error: `Unknown tool: ${toolName}`,
      };
  }
}

// Export for testing/evaluation
export function getCurrentItinerary(): Itinerary | null {
  return currentItinerary;
}

export function resetItinerary(): void {
  currentItinerary = null;
  poiCoordinates.clear();
}

export default executeToolCall;
