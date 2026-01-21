# Voice-First AI Travel Planner

A voice-first AI travel planning assistant built with Google Gemini Multimodal Live API, featuring real-time voice interaction, live updating UI, and grounded recommendations.

## Live Demo

- **Deployed Application**: [https://travel-planner.vercel.app](https://travel-planner.vercel.app) *(Update with your deployment URL)*
- **Demo Video**: [Watch on YouTube](https://youtube.com/watch?v=XXXXX) *(Update with your video link)*

## Features

- **Voice-First Interaction**: Speak naturally to plan your trip using Gemini's multimodal capabilities
- **Real-Time Updates**: Watch your itinerary build and update as you talk
- **Voice-Based Editing**: Modify your itinerary with natural language ("Make Day 2 more relaxed")
- **Grounded Recommendations**: POIs from OpenStreetMap with citations from Wikivoyage
- **Smart Itinerary Building**: Automatic travel time estimation and activity scheduling
- **Explanation & Reasoning**: Ask "Why this place?" and get grounded answers
- **Export Options**: Send your finalized itinerary via email as PDF (via n8n workflow)

## Architecture

```
┌─────────────────┐     WebSocket      ┌─────────────────┐     WebSocket     ┌─────────────────┐
│  React Frontend │ ◄─────────────────► │  Node.js Proxy  │ ◄───────────────► │  Gemini Live API│
│  (Voice + UI)   │                     │  (Backend)      │                   │                 │
└─────────────────┘                     └─────────────────┘                   └─────────────────┘
        │                                       │
        │                               ┌───────┴───────┐
        │                               │   MCP Tools   │
        │                               ├───────────────┤
        │                               │ • POI Search  │
        │                               │ • Itinerary   │
        │                               │ • Weather     │
        │                               │ • City Info   │
        │                               └───────────────┘
        │                                       │
        ▼                               ┌───────┴───────┐
┌─────────────────┐                     │  Data Sources │
│   n8n Workflow  │                     ├───────────────┤
│  (Email + PDF)  │                     │ • OSM/Overpass│
└─────────────────┘                     │ • Wikivoyage  │
                                        │ • Open-Meteo  │
                                        └───────────────┘
```

## MCP Tools

The system implements the following MCP (Model Context Protocol) tools:

| Tool | Type | Description |
|------|------|-------------|
| `poi_search` | **Required** | Search POIs at a destination via OpenStreetMap Overpass API |
| `update_itinerary` | **Required** | Create and modify travel itineraries with targeted edits |
| `get_weather` | Bonus | Get weather forecast from Open-Meteo API |
| `calculate_travel_time` | Bonus | Estimate travel time between locations |
| `get_city_info` | RAG | Retrieve city guidance from Wikivoyage (safety, customs, etc.) |
| `search_destination_info` | RAG | Web search for destination info from Wikipedia + Wikivoyage |

Tools are defined in [`server/src/tools/toolDefinitions.ts`](server/src/tools/toolDefinitions.ts) and executed via [`server/src/mcp/toolExecutor.ts`](server/src/mcp/toolExecutor.ts).

## Data Sources

| Source | API | Usage |
|--------|-----|-------|
| **OpenStreetMap** | Overpass API | Points of Interest (restaurants, attractions, temples, etc.) |
| **Wikivoyage** | MediaWiki API | Travel tips, safety info, cultural guidance |
| **Wikipedia** | MediaWiki API | Destination overviews and history |
| **Open-Meteo** | REST API | Weather forecasts for trip planning |

Local cached data for Jaipur is available in [`data/jaipur/`](data/jaipur/).

## Getting Started

### Prerequisites

- Node.js 18+
- Google AI API Key (Gemini)
- n8n instance (optional, for email export)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/capston.git
cd capston
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
# Server
cp server/.env.example server/.env
# Add your GOOGLE_API_KEY

# Client
cp client/.env.example client/.env
# Add your VITE_WS_URL (use ws://localhost:3001 for dev)
```

4. Start development servers:
```bash
npm run dev
```

This will start:
- Backend server at `http://localhost:3001`
- Frontend at `http://localhost:5173`

### Usage

1. Open your browser to `http://localhost:5173`
2. Allow microphone access when prompted
3. Click the voice orb and speak: "Plan a 3-day trip to Jaipur, I like food and culture"
4. Watch your itinerary update in real-time
5. Make edits by speaking: "Make Day 2 more relaxed"
6. Ask questions: "Why did you pick this place?"
7. Click "Email this Plan" to receive a PDF of your itinerary

## Project Structure

```
capston/
├── client/              # React Frontend (Voice UI)
│   ├── src/
│   │   ├── components/  # UI components (VoiceOrb, Itinerary, Sources)
│   │   ├── hooks/       # Custom hooks (useWebSocket, useAudioRecorder)
│   │   └── types/       # TypeScript types
│   └── vercel.json      # Vercel deployment config
├── server/              # Node.js Backend
│   ├── src/
│   │   ├── mcp/         # MCP tool implementations
│   │   ├── rag/         # RAG (Wikivoyage, vector store)
│   │   ├── tools/       # Tool definitions for Gemini
│   │   └── websocket/   # WebSocket handlers + Gemini client
│   └── railway.toml     # Railway deployment config
├── evals/               # AI Evaluation scripts
├── data/                # Cached POI and Wikivoyage data
├── n8n/                 # n8n workflow for email export
├── transcripts/         # Sample test transcripts
├── deploy/              # Deployment documentation
└── system_instruction.txt  # Gemini system prompt
```

## Running Evaluations

Three AI evaluations are implemented as required:

```bash
# 1. Feasibility Eval - Check activity counts and travel times
npm run eval:feasibility

# 2. Edit Correctness Eval - Verify only intended sections change
npm run eval:edit

# 3. Grounding Eval - Verify POI citations and sources
npm run eval:grounding
```

### Evaluation Criteria

| Eval | Checks |
|------|--------|
| **Feasibility** | Activities per day ≤ 4, total hours ≤ 10, travel times < 60 min |
| **Edit Correctness** | Editing Day 2 doesn't affect Day 1 or Day 3 |
| **Grounding** | POIs exist in dataset, sources are properly attributed |

## n8n Workflow Setup

The email export feature uses an n8n workflow. See [`n8n/README.md`](n8n/README.md) for setup instructions.

Quick setup:
1. Import [`n8n/workflow.json`](n8n/workflow.json) into your n8n instance
2. Configure SMTP credentials
3. Set `VITE_N8N_WEBHOOK_URL` in client environment

## Sample Test Transcripts

Example conversations demonstrating system capabilities are in [`transcripts/`](transcripts/):

1. **[Basic Trip Planning](transcripts/01-basic-trip-planning.md)** - Full planning flow
2. **[Voice Editing](transcripts/02-voice-editing.md)** - Targeted modifications
3. **[Explanations](transcripts/03-explanations-and-reasoning.md)** - Grounded reasoning

## Deployment

See [`deploy/README.md`](deploy/README.md) for detailed deployment instructions.

Quick options:
- **Vercel** (client) + **Railway** (server) - Recommended
- **Railway** (both) - Monorepo support
- **Render** - Alternative PaaS

## Tech Stack

**Backend:**
- Express.js + WebSocket (ws)
- Gemini Multimodal Live API
- Axios for API calls

**Frontend:**
- React + TypeScript + Vite
- Tailwind CSS
- Zustand (state management)
- Web Audio API (voice recording)

**External APIs:**
- Google Gemini Multimodal Live API
- OpenStreetMap Overpass API
- Wikivoyage / Wikipedia MediaWiki API
- Open-Meteo Weather API

## Scope

This project is scoped to:
- **One city**: Jaipur (with extensible architecture for other cities)
- **2-4 day itineraries**
- **Heuristic transit estimates**

## License

MIT
