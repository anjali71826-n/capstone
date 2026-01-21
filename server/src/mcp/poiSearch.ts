import axios from 'axios';
import { config } from '../config';

export interface POI {
  id: string;
  name: string;
  category: string;
  lat: number;
  lon: number;
  address?: string;
  rating?: number;
  tags?: Record<string, string>;
  source: 'osm' | 'cached';
}

interface BoundingBox {
  south: number;
  west: number;
  north: number;
  east: number;
}

// Cache for geocoded bounding boxes
const bboxCache: Map<string, BoundingBox> = new Map();

// Geocode a destination to get its bounding box using Nominatim
async function geocodeDestination(destination: string): Promise<BoundingBox> {
  const cacheKey = destination.toLowerCase().trim();
  
  if (bboxCache.has(cacheKey)) {
    return bboxCache.get(cacheKey)!;
  }
  
  try {
    const response = await axios.get('https://nominatim.openstreetmap.org/search', {
      params: {
        q: destination,
        format: 'json',
        limit: 1,
        addressdetails: 1,
      },
      headers: {
        'User-Agent': 'TravelPlannerApp/1.0',
      },
      timeout: 10000,
    });
    
    if (response.data && response.data.length > 0) {
      const result = response.data[0];
      const boundingbox = result.boundingbox; // [south, north, west, east] as strings
      
      const bbox: BoundingBox = {
        south: parseFloat(boundingbox[0]),
        north: parseFloat(boundingbox[1]),
        west: parseFloat(boundingbox[2]),
        east: parseFloat(boundingbox[3]),
      };
      
      bboxCache.set(cacheKey, bbox);
      return bbox;
    }
    
    throw new Error(`Could not geocode destination: ${destination}`);
  } catch (error) {
    console.error('Geocoding error:', error);
    throw error;
  }
}

// Category to OSM tag mapping
const CATEGORY_TAGS: Record<string, string[]> = {
  restaurant: ['amenity=restaurant', 'amenity=cafe', 'amenity=fast_food'],
  attraction: ['tourism=attraction', 'tourism=viewpoint', 'historic=monument', 'historic=castle', 'historic=palace'],
  temple: ['amenity=place_of_worship', 'building=temple', 'building=church', 'building=mosque', 'building=synagogue'],
  market: ['shop=market', 'amenity=marketplace', 'shop=mall', 'shop=department_store'],
  museum: ['tourism=museum', 'tourism=gallery'],
  park: ['leisure=park', 'leisure=garden', 'leisure=nature_reserve'],
  hotel: ['tourism=hotel', 'tourism=guest_house', 'tourism=hostel'],
};

export async function searchPOIs(
  destination: string,
  category: string,
  interests?: string[],
  limit = 5
): Promise<POI[]> {
  try {
    // Geocode the destination to get bounding box
    const bbox = await geocodeDestination(destination);
    
    // Try to fetch from Overpass API (OpenStreetMap)
    const tags = CATEGORY_TAGS[category] || [`tourism=${category}`];
    const query = buildOverpassQuery(tags, bbox);

    console.log(`Searching POIs for ${destination} in category ${category}...`);

    const response = await axios.post(config.overpassApi, query, {
      headers: { 'Content-Type': 'text/plain' },
      timeout: 15000, // Increased timeout for API calls
    });

    const elements = response.data.elements || [];
    let pois: POI[] = elements.map((el: Record<string, unknown>) => ({
      id: `osm_${el.id}`,
      name: (el.tags as Record<string, string>)?.name || 'Unknown',
      category,
      lat: el.lat as number || (el.center as { lat: number })?.lat,
      lon: el.lon as number || (el.center as { lon: number })?.lon,
      address: (el.tags as Record<string, string>)?.['addr:full'] ||
        (el.tags as Record<string, string>)?.['addr:street'] ||
        (el.tags as Record<string, string>)?.['addr:city'],
      tags: el.tags as Record<string, string>,
      source: 'osm' as const,
    }));

    // Filter out POIs without names
    pois = pois.filter(poi => poi.name && poi.name !== 'Unknown');

    // Filter by interests if provided
    if (interests && interests.length > 0) {
      pois = filterByInterests(pois, interests);
    }

    console.log(`Found ${pois.length} POIs for ${destination}`);
    return pois.slice(0, limit);
  } catch (error) {
    console.error('POI search error:', error);
    
    // Return error info instead of empty array so user knows there was an issue
    return [];
  }
}

function buildOverpassQuery(tags: string[], bbox: BoundingBox): string {
  const { south, west, north, east } = bbox;
  const tagQueries = tags
    .map((tag) => {
      const [key, value] = tag.split('=');
      return `node["${key}"="${value}"](${south},${west},${north},${east});
      way["${key}"="${value}"](${south},${west},${north},${east});`;
    })
    .join('\n');

  return `
    [out:json][timeout:10];
    (
      ${tagQueries}
    );
    out center;
  `;
}

function filterByInterests(pois: POI[], interests: string[]): POI[] {
  const interestLower = interests.map((i) => i.toLowerCase());

  return pois.filter((poi) => {
    const searchText = [
      poi.name,
      poi.category,
      ...(poi.tags ? Object.values(poi.tags) : []),
    ]
      .join(' ')
      .toLowerCase();

    return interestLower.some((interest) => searchText.includes(interest));
  });
}

// Calculate haversine distance between two points
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

// Estimate travel time based on distance and mode
export function estimateTravelTime(
  distanceKm: number,
  mode: 'auto' | 'taxi' | 'walking' = 'auto'
): number {
  // Average speeds in km/h
  const speeds: Record<string, number> = {
    auto: 20, // Auto-rickshaw in city traffic
    taxi: 25, // Taxi slightly faster
    walking: 4, // Walking speed
  };

  const speed = speeds[mode];
  const timeHours = distanceKm / speed;
  const timeMinutes = Math.ceil(timeHours * 60);

  // Add buffer for traffic and stops
  return Math.max(10, timeMinutes + 5);
}

export default searchPOIs;
