# Climate Risk & Disaster Management Dashboard

## Overview
This project is now a complete mini web application built with:

- HTML
- CSS
- React
- Node.js

It provides a polished climate-risk dashboard with separate pages for:

- Home
- Dashboard
- Heat Risk
- Flood Risk
- Disaster Response

## What Works
- Shared responsive frontend design across all pages
- React-powered page rendering and API data loading
- Node.js backend server using built-in modules
- Real-time weather-backed climate metrics
- City locator with live search and cross-page city persistence
- Live signal-based incident board instead of seeded fake incidents
- Climate overview API
- Heat and flood risk API endpoints
- Disaster response data API
- Incident reporting form with backend POST handling
- Navigation between all project pages

## Project Files
- `server.js` - Node.js server and API routes
- `data.js` - shared dashboard and response data
- `app.js` - React frontend logic for all pages
- `styles.css` - shared styling and layout
- `index.html` - home page shell
- `dashboard.html` - dashboard page shell
- `heat.html` - heat page shell
- `flood.html` - flood page shell
- `response.html` - response page shell

## Run The Project
1. Open a terminal in the project folder.
2. Start the server:

```bash
npm start
```

3. Open this address in your browser:

```text
http://127.0.0.1:3000
```

## API Routes
- `GET /api/overview`
- `GET /api/risks/heat`
- `GET /api/risks/flood`
- `GET /api/response`
- `GET /api/cities`
- `GET /api/incidents`
- `POST /api/incidents`

## Live Data Sources
- `Open-Meteo Forecast API` - current weather and 3-day forecast values used for temperature, humidity, rainfall, wind, UV, and live risk scoring
- `Open-Meteo Geocoding API` - resolves the dashboard city to live coordinates before requesting forecast data
- `OpenWeather Alerts API` - optional official alert feed when `OPENWEATHER_API_KEY` is set in your environment
- `OpenStreetMap embed` - shelter location map view inside the response page
- `Google Maps search links` - external directions and map opening for locations and incident reports

## Notes
- The response board now shows live weather-derived signals, optional OpenWeather alerts, and any user-submitted reports.
- User-submitted incident data is stored in memory while the server is running.
- To enable OpenWeather alerts, start the app with `OPENWEATHER_API_KEY=your_key npm start`
- The frontend loads React from CDN links in the HTML pages.
- The app is designed for project/demo use and can be extended with a database later.

## Team
- Gomathi Lakshmi
- Navya
