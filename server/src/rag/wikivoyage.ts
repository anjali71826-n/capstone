import axios from 'axios';
import { config } from '../config';
import fs from 'fs';
import path from 'path';

// Cache for fetched Wikivoyage content by destination and topic
const wikiCache: Map<string, { content: string; source: string }> = new Map();

export async function getCityInfo(
  destination: string,
  topic: string
): Promise<{ content: string; source: string }> {
  const normalizedTopic = topic.toLowerCase();
  const normalizedDestination = destination.toLowerCase().trim();
  const cacheKey = `${normalizedDestination}:${normalizedTopic}`;

  // Check cache first
  if (wikiCache.has(cacheKey)) {
    return wikiCache.get(cacheKey)!;
  }

  // Try to fetch from Wikivoyage API
  try {
    const content = await fetchWikivoyageContent(destination);
    
    // Extract relevant section based on topic
    const extractedContent = extractTopicContent(content, normalizedTopic, destination);
    
    const result = {
      content: extractedContent,
      source: `Wikivoyage - ${destination}`,
    };
    
    wikiCache.set(cacheKey, result);
    return result;
  } catch (error) {
    console.error('Wikivoyage fetch error:', error);
    
    // Return a generic response
    return {
      content: `Information about ${topic} in ${destination} is not currently available. Please try searching for specific places or attractions.`,
      source: 'System',
    };
  }
}

async function fetchWikivoyageContent(destination: string): Promise<string> {
  // Extract just the city name (remove country if present)
  const cityName = destination.split(',')[0].trim();
  
  const response = await axios.get(config.wikivoyageApi, {
    params: {
      action: 'query',
      titles: cityName,
      prop: 'extracts',
      exintro: false,
      explaintext: true,
      format: 'json',
    },
    timeout: 10000,
  });

  const pages = response.data.query.pages;
  const pageId = Object.keys(pages)[0];

  if (pageId === '-1') {
    throw new Error(`Wikivoyage page not found for: ${destination}`);
  }

  return pages[pageId].extract || 'No content available';
}

function extractTopicContent(fullContent: string, topic: string, destination: string): string {
  // Map topics to common Wikivoyage section headers
  const topicHeaders: Record<string, string[]> = {
    overview: ['understand', 'introduction', ''],
    safety: ['stay safe', 'safety', 'crime'],
    weather: ['climate', 'weather', 'when to visit'],
    customs: ['respect', 'customs', 'culture', 'etiquette'],
    transport: ['get around', 'transport', 'getting around', 'by taxi', 'by bus'],
    food: ['eat', 'food', 'cuisine', 'restaurants'],
    shopping: ['buy', 'shopping', 'markets'],
    history: ['history', 'background'],
  };
  
  const headers = topicHeaders[topic] || [topic];
  
  // Try to find relevant section in the content
  const lines = fullContent.split('\n');
  let capturing = false;
  let capturedLines: string[] = [];
  let nextSectionFound = false;
  
  for (const line of lines) {
    const lowerLine = line.toLowerCase();
    
    // Check if this line is a section header we're looking for
    if (!capturing && headers.some(h => h && lowerLine.includes(h))) {
      capturing = true;
      continue;
    }
    
    // If we're capturing, check if we've hit the next section
    if (capturing) {
      // Section headers in Wikivoyage are usually in == format or standalone capitalized lines
      if (line.startsWith('==') || (line.length > 0 && line === line.toUpperCase() && line.length < 50)) {
        nextSectionFound = true;
        break;
      }
      if (line.trim()) {
        capturedLines.push(line);
      }
    }
  }
  
  if (capturedLines.length > 0) {
    // Limit to reasonable length
    return capturedLines.slice(0, 20).join('\n');
  }
  
  // If no specific section found, return the first part of the content as overview
  if (topic === 'overview') {
    return lines.slice(0, 15).join('\n');
  }
  
  return `General information about ${topic} in ${destination}. For more detailed information, please search for specific places or use web resources.`;
}

export async function getSystemInstruction(): Promise<string> {
  // Read from the system_instruction.txt file
  try {
    const instructionPath = path.resolve(__dirname, '../../../system_instruction.txt');
    const content = fs.readFileSync(instructionPath, 'utf-8');
    return content;
  } catch (error) {
    console.error('Error reading system instruction file:', error);
    // Return a basic fallback instruction
    return `You are a friendly AI travel assistant that helps plan trips to destinations around the world.

You have access to these tools:
1. poi_search: Search for places at a destination (requires destination and category)
2. update_itinerary: Create and modify travel itineraries
3. get_city_info: Get information about a destination (requires destination and topic)
4. get_weather: Get weather forecast (requires destination and date)
5. calculate_travel_time: Estimate travel time between locations

Start by asking the user which destination they'd like to visit, then help them plan their trip.`;
  }
}

export default getCityInfo;
