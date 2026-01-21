// Gemini Function Calling Tool Definitions

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export const toolDefinitions: ToolDefinition[] = [
  {
    name: 'poi_search',
    description: 'Search for points of interest at a destination. Use this to find restaurants, attractions, temples, markets, and other places based on category and user interests.',
    parameters: {
      type: 'object',
      properties: {
        destination: {
          type: 'string',
          description: 'The city/destination to search in (e.g., "Jaipur, India", "Paris, France")',
        },
        category: {
          type: 'string',
          enum: ['restaurant', 'attraction', 'temple', 'market', 'museum', 'park', 'hotel'],
          description: 'The category of POI to search for',
        },
        interests: {
          type: 'array',
          items: { type: 'string' },
          description: 'User interests to filter results (e.g., ["vegetarian", "historical", "photography"])',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results to return (default: 5)',
        },
      },
      required: ['destination', 'category'],
    },
  },
  {
    name: 'update_itinerary',
    description: 'Update the travel itinerary. Use this to add, modify, or remove activities from specific days. Always call this when the user asks to change their trip plan.',
    parameters: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['set', 'add_activity', 'remove_activity', 'update_activity', 'clear_day'],
          description: 'The type of update to perform',
        },
        day_number: {
          type: 'integer',
          description: 'The day number to update (1-indexed)',
        },
        time_slot: {
          type: 'string',
          enum: ['Morning', 'Afternoon', 'Evening'],
          description: 'Time slot for the activity',
        },
        poi_name: {
          type: 'string',
          description: 'Name of the place/activity',
        },
        duration_minutes: {
          type: 'integer',
          description: 'Expected duration in minutes',
        },
        notes: {
          type: 'string',
          description: 'Additional notes or tips',
        },
        destination: {
          type: 'string',
          description: 'Destination city (for set action)',
        },
        name: {
          type: 'string',
          description: 'A creative, memorable name for the trip itinerary (e.g., "Pink City Adventure", "Roman Holiday", "Tokyo Food Trail"). Generate this based on the destination and trip theme.',
        },
        itinerary_json: {
          type: 'string',
          description: 'JSON string of full itinerary when action is "set"',
        },
      },
      required: ['action'],
    },
  },
  {
    name: 'get_city_info',
    description: 'Get general information about a destination including travel tips, safety info, best times to visit, local customs, and etiquette. Use this for background context.',
    parameters: {
      type: 'object',
      properties: {
        destination: {
          type: 'string',
          description: 'The city/destination to get information about (e.g., "Jaipur", "Paris")',
        },
        topic: {
          type: 'string',
          enum: ['overview', 'safety', 'weather', 'customs', 'transport', 'food', 'shopping', 'history'],
          description: 'The topic to get information about',
        },
      },
      required: ['destination', 'topic'],
    },
  },
  {
    name: 'get_weather',
    description: 'Get weather forecast for a destination for trip planning. Returns temperature, conditions, and recommendations.',
    parameters: {
      type: 'object',
      properties: {
        destination: {
          type: 'string',
          description: 'The city/destination to get weather for (e.g., "Jaipur, India", "Paris, France")',
        },
        date: {
          type: 'string',
          description: 'Date in YYYY-MM-DD format (within next 7 days)',
        },
      },
      required: ['destination', 'date'],
    },
  },
  {
    name: 'calculate_travel_time',
    description: 'Calculate estimated travel time between two locations at a destination.',
    parameters: {
      type: 'object',
      properties: {
        destination: {
          type: 'string',
          description: 'The city/destination where the locations are (e.g., "Jaipur", "Paris")',
        },
        from_poi: {
          type: 'string',
          description: 'Starting location name',
        },
        to_poi: {
          type: 'string',
          description: 'Destination location name',
        },
        mode: {
          type: 'string',
          enum: ['auto', 'taxi', 'walking'],
          description: 'Mode of transport (default: taxi)',
        },
      },
      required: ['destination', 'from_poi', 'to_poi'],
    },
  },
  {
    name: 'search_destination_info',
    description: 'Search the web for detailed information about a destination. Use this to get up-to-date travel information, top attractions, local tips, and cultural insights for any destination worldwide. Always use this before planning a trip to a new destination.',
    parameters: {
      type: 'object',
      properties: {
        destination: {
          type: 'string',
          description: 'The city or destination to search for (e.g., "Tokyo, Japan", "Barcelona, Spain")',
        },
        query_type: {
          type: 'string',
          enum: ['overview', 'attractions', 'food', 'culture', 'tips', 'neighborhoods'],
          description: 'Type of information to search for',
        },
      },
      required: ['destination', 'query_type'],
    },
  },
];

// Convert tool definition to Gemini format (uppercase types, camelCase keys)
function convertToGeminiFormat(tool: ToolDefinition) {
  const convertType = (type: string): string => type.toUpperCase();

  const convertProperties = (props: Record<string, unknown>): Record<string, unknown> => {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(props)) {
      const prop = value as Record<string, unknown>;
      const converted: Record<string, unknown> = {};

      if (prop.type) {
        converted.type = convertType(prop.type as string);
      }
      if (prop.description) {
        converted.description = prop.description;
      }
      if (prop.enum) {
        converted.enum = prop.enum;
      }
      if (prop.items) {
        const items = prop.items as Record<string, unknown>;
        converted.items = { type: convertType(items.type as string) };
      }

      result[key] = converted;
    }
    return result;
  };

  return {
    name: tool.name,
    description: tool.description,
    parameters: {
      type: convertType(tool.parameters.type),
      properties: convertProperties(tool.parameters.properties),
      required: tool.parameters.required,
    },
  };
}

// Format tools for Gemini setup message
export function getToolsForGemini() {
  return {
    functionDeclarations: toolDefinitions.map(convertToGeminiFormat),
  };
}

export default toolDefinitions;
