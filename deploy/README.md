# Deployment Guide

This guide explains how to deploy the Voice-First AI Travel Planner.

## Architecture

The application consists of two parts:
- **Client**: React frontend (Vite)
- **Server**: Node.js backend (Express + WebSocket)

Both need to be deployed separately.

---

## Option 1: Railway (Recommended)

Railway makes it easy to deploy both parts from a monorepo.

### Deploy Server

1. Go to [Railway](https://railway.app)
2. Click **New Project** → **Deploy from GitHub repo**
3. Select this repository
4. Railway will auto-detect the monorepo. Select `server` as the root directory
5. Add environment variables:
   ```
   GOOGLE_API_KEY=your-gemini-api-key
   CLIENT_URL=https://your-client-url.vercel.app
   PORT=3001
   ```
6. Deploy and note the URL (e.g., `https://travel-planner-server.up.railway.app`)

### Deploy Client

1. In Railway, add another service from the same repo
2. Select `client` as the root directory
3. Add environment variables:
   ```
   VITE_WS_URL=wss://travel-planner-server.up.railway.app
   VITE_N8N_WEBHOOK_URL=https://your-n8n.com/webhook/travel-itinerary
   ```
4. Deploy and note the URL

---

## Option 2: Vercel (Client) + Railway (Server)

### Deploy Client to Vercel

1. Go to [Vercel](https://vercel.com)
2. Click **New Project** → Import this repository
3. Set **Root Directory** to `client`
4. Add environment variables:
   ```
   VITE_WS_URL=wss://your-server-url
   VITE_N8N_WEBHOOK_URL=https://your-n8n/webhook/travel-itinerary
   ```
5. Deploy

### Deploy Server to Railway

Follow the Railway server instructions above.

---

## Option 3: Render

### Deploy Server

1. Go to [Render](https://render.com)
2. Click **New** → **Web Service**
3. Connect your GitHub repo
4. Configure:
   - **Root Directory**: `server`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
5. Add environment variables
6. Deploy

### Deploy Client

1. Click **New** → **Static Site**
2. Configure:
   - **Root Directory**: `client`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`
3. Add environment variables
4. Deploy

---

## Environment Variables

### Server (.env)

```bash
# Required
GOOGLE_API_KEY=your-gemini-api-key

# Optional (defaults shown)
PORT=3001
CLIENT_URL=http://localhost:5173
OVERPASS_API=https://overpass-api.de/api/interpreter
WIKIVOYAGE_API=https://en.wikivoyage.org/w/api.php
OPEN_METEO_API=https://api.open-meteo.com/v1/forecast
```

### Client (.env)

```bash
# Required
VITE_WS_URL=wss://your-server-url

# Optional
VITE_N8N_WEBHOOK_URL=https://your-n8n/webhook/travel-itinerary
```

---

## Post-Deployment Checklist

1. [ ] Server is running and accessible
2. [ ] Client can connect to server via WebSocket
3. [ ] Voice recording works in browser
4. [ ] POI search returns results
5. [ ] Itinerary updates in real-time
6. [ ] Email export works (if n8n configured)

---

## Troubleshooting

### WebSocket Connection Failed

- Ensure server URL uses `wss://` (not `ws://`) for HTTPS deployments
- Check CORS settings in server config
- Verify `CLIENT_URL` env var matches your client domain

### Microphone Not Working

- Must be served over HTTPS (browsers require secure context)
- User must grant microphone permission

### API Errors

- Verify `GOOGLE_API_KEY` is valid and has Gemini API enabled
- Check rate limits on OpenStreetMap Overpass API
