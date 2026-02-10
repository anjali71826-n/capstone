import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from root .env file
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  googleApiKey: process.env.GOOGLE_API_KEY || '',

  // Gemini Multimodal Live API
  gemini: {
    model: 'models/gemini-2.5-flash-latest',
    wsUrl: `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent`,
  },

  // External APIs
  overpassApi: 'https://overpass-api.de/api/interpreter',
  openMeteoApi: 'https://api.open-meteo.com/v1/forecast',
  wikivoyageApi: 'https://en.wikivoyage.org/w/api.php',
};

// Validate required config
if (!config.googleApiKey) {
  console.warn('Warning: GOOGLE_API_KEY is not set. Gemini API calls will fail.');
}

export default config;
