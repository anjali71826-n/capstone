import axios from 'axios';
import { config } from '../config';

export interface WeatherData {
  date: string;
  destination: string;
  temperature: {
    min: number;
    max: number;
    unit: string;
  };
  condition: string;
  precipitation_probability: number;
  humidity: number;
  wind_speed: number;
  recommendations: string[];
}

interface Coordinates {
  latitude: number;
  longitude: number;
  timezone: string;
}

// Cache for geocoded coordinates
const coordsCache: Map<string, Coordinates> = new Map();

// Weather code to condition mapping
const WEATHER_CODES: Record<number, string> = {
  0: 'Clear sky',
  1: 'Mainly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Foggy',
  48: 'Depositing rime fog',
  51: 'Light drizzle',
  53: 'Moderate drizzle',
  55: 'Dense drizzle',
  61: 'Slight rain',
  63: 'Moderate rain',
  65: 'Heavy rain',
  71: 'Slight snow',
  73: 'Moderate snow',
  75: 'Heavy snow',
  77: 'Snow grains',
  80: 'Slight rain showers',
  81: 'Moderate rain showers',
  82: 'Violent rain showers',
  85: 'Slight snow showers',
  86: 'Heavy snow showers',
  95: 'Thunderstorm',
  96: 'Thunderstorm with slight hail',
  99: 'Thunderstorm with heavy hail',
};

// Geocode destination to get coordinates
async function geocodeForWeather(destination: string): Promise<Coordinates> {
  const cacheKey = destination.toLowerCase().trim();
  
  if (coordsCache.has(cacheKey)) {
    return coordsCache.get(cacheKey)!;
  }
  
  try {
    const response = await axios.get('https://nominatim.openstreetmap.org/search', {
      params: {
        q: destination,
        format: 'json',
        limit: 1,
      },
      headers: {
        'User-Agent': 'TravelPlannerApp/1.0',
      },
      timeout: 10000,
    });
    
    if (response.data && response.data.length > 0) {
      const result = response.data[0];
      
      // Determine timezone based on longitude (rough approximation)
      const lon = parseFloat(result.lon);
      let timezone = 'UTC';
      if (lon >= 60 && lon <= 100) timezone = 'Asia/Kolkata';
      else if (lon >= -10 && lon <= 30) timezone = 'Europe/London';
      else if (lon >= 30 && lon <= 60) timezone = 'Europe/Moscow';
      else if (lon >= -130 && lon <= -60) timezone = 'America/New_York';
      else if (lon >= 100 && lon <= 150) timezone = 'Asia/Tokyo';
      
      const coords: Coordinates = {
        latitude: parseFloat(result.lat),
        longitude: lon,
        timezone,
      };
      
      coordsCache.set(cacheKey, coords);
      return coords;
    }
    
    throw new Error(`Could not geocode destination: ${destination}`);
  } catch (error) {
    console.error('Geocoding error for weather:', error);
    throw error;
  }
}

export async function getWeather(destination: string, date: string): Promise<WeatherData> {
  try {
    // Geocode the destination
    const coords = await geocodeForWeather(destination);
    
    const response = await axios.get(config.openMeteoApi, {
      params: {
        latitude: coords.latitude,
        longitude: coords.longitude,
        daily: 'temperature_2m_max,temperature_2m_min,precipitation_probability_max,weathercode,relative_humidity_2m_max,windspeed_10m_max',
        timezone: coords.timezone,
        start_date: date,
        end_date: date,
      },
      timeout: 5000,
    });

    const daily = response.data.daily;
    const index = 0; // We only requested one day

    const weatherCode = daily.weathercode[index];
    const condition = WEATHER_CODES[weatherCode] || 'Unknown';
    const tempMax = daily.temperature_2m_max[index];
    const tempMin = daily.temperature_2m_min[index];
    const precipProb = daily.precipitation_probability_max[index];
    const humidity = daily.relative_humidity_2m_max[index];
    const windSpeed = daily.windspeed_10m_max[index];

    return {
      date,
      destination,
      temperature: {
        min: tempMin,
        max: tempMax,
        unit: '°C',
      },
      condition,
      precipitation_probability: precipProb,
      humidity,
      wind_speed: windSpeed,
      recommendations: generateWeatherRecommendations(
        tempMax,
        condition,
        precipProb
      ),
    };
  } catch (error) {
    console.error('Weather API error:', error);

    // Return fallback data
    return {
      date,
      destination,
      temperature: {
        min: 15,
        max: 25,
        unit: '°C',
      },
      condition: 'Unknown',
      precipitation_probability: 20,
      humidity: 50,
      wind_speed: 10,
      recommendations: [
        'Weather data temporarily unavailable',
        'Check local weather sources for accurate information',
        'Be prepared for varying conditions',
      ],
    };
  }
}

function generateWeatherRecommendations(
  tempMax: number,
  condition: string,
  precipProb: number
): string[] {
  const recommendations: string[] = [];

  // Temperature-based recommendations
  if (tempMax > 40) {
    recommendations.push('Extreme heat expected - stay hydrated and avoid midday sun');
    recommendations.push('Plan indoor activities (museums, galleries) for afternoon');
    recommendations.push('Carry water, sunscreen, and a hat');
  } else if (tempMax > 35) {
    recommendations.push('Hot day expected - carry water and sun protection');
    recommendations.push('Best to visit outdoor sites in early morning or evening');
  } else if (tempMax > 25) {
    recommendations.push('Pleasant weather for sightseeing');
    recommendations.push('Good day for exploring outdoor attractions and markets');
  } else if (tempMax < 15) {
    recommendations.push('Cool weather - bring a light jacket');
    recommendations.push('Great weather for walking tours');
  } else if (tempMax < 5) {
    recommendations.push('Cold weather expected - dress warmly in layers');
    recommendations.push('Consider indoor attractions during coldest hours');
  }

  // Precipitation-based recommendations
  if (precipProb > 60) {
    recommendations.push('High chance of rain - carry an umbrella');
    recommendations.push('Consider flexible itinerary with indoor backup plans');
  } else if (precipProb > 30) {
    recommendations.push('Some chance of rain - umbrella recommended');
  }

  // Condition-based recommendations
  if (condition.toLowerCase().includes('fog')) {
    recommendations.push('Foggy conditions may affect visibility at viewpoints');
    recommendations.push('Sunset views may not be ideal today');
  }

  if (condition.toLowerCase().includes('clear')) {
    recommendations.push('Great visibility for photography');
    recommendations.push('Perfect day for scenic viewpoints and outdoor activities');
  }

  if (condition.toLowerCase().includes('snow')) {
    recommendations.push('Snowy conditions - wear appropriate footwear');
    recommendations.push('Some attractions may have limited access');
  }

  // Ensure we have at least one recommendation
  if (recommendations.length === 0) {
    recommendations.push('Weather looks suitable for sightseeing');
  }

  return recommendations.slice(0, 3); // Max 3 recommendations
}

export default getWeather;
