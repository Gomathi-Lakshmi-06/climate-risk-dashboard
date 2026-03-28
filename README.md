<h1 align="center">🌍 Climate Risk and Disaster Management Dashboard</h1>

<<<<<<< HEAD
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
=======
<p align="center">
A front-end web application focused on visualizing climate risks and promoting
disaster preparedness through clear, accessible information.
</p>

<hr>

<h2>📘 Abstract</h2>
<p>
The Climate Risk and Disaster Management Dashboard is a front-end web application
developed to present climate-related hazards in a clear, visual, and user-friendly
manner. The system focuses on environmental risks such as floods and heat waves
while providing structured safety guidelines and response information. This project
demonstrates how web technologies can be applied to address real-world societal
challenges related to climate awareness and disaster preparedness.
</p>

<h2>🧭 Introduction</h2>
<p>
Climate-related disasters have increased in frequency and severity due to
environmental changes, urbanization, and climate variability. Timely access to
understandable climate risk information is essential for public safety. However,
such information is often complex and inaccessible to non-technical users.
</p>

<p>
This project addresses this gap by designing an intuitive web-based dashboard
that visually communicates climate risks and corresponding response measures
in a simplified and accessible format.
</p>

<h2>🎯 Project Objectives</h2>
<ul>
  <li>Design a structured web dashboard for climate risk visualization</li>
  <li>Improve awareness of flood and heat-related hazards</li>
  <li>Present emergency response and safety information clearly</li>
  <li>Apply web programming concepts learned during the semester</li>
</ul>

<h2>📌 Scope of the Project</h2>
<p>
The project focuses exclusively on front-end development and user interface
design. It does not include backend services or database integration. Climate
data is fetched using public APIs or simulated values for educational and
demonstration purposes. This system is not intended to function as an official
disaster alert platform.
</p>

<h2>✨ Key Features</h2>
<ul>
  <li><strong>Home Page:</strong> Overview of climate risks and project purpose</li>
  <li><strong>Risk Dashboard:</strong> Summary of current flood and heat risk levels</li>
  <li><strong>Flood Risk Module:</strong> Alerts, precautions, and relief information</li>
  <li><strong>Heat Alert Module:</strong> Temperature visualization, heat index, and health advisories</li>
  <li><strong>Response & Safety Module:</strong> Emergency steps, helpline details, and first-aid guidance</li>
  <li><strong>Responsive Design:</strong> Optimized for mobile and desktop devices</li>
</ul>

<h2>🛠️ Technologies Used</h2>
<ul>
  <li>HTML – Page structure and semantic layout</li>
  <li>CSS – Styling, layout design, gradients, and responsiveness</li>
  <li>JavaScript – Dynamic content handling and simulated updates</li>
  <li>OpenWeather API – Weather data integration for demonstration</li>
</ul>

<h2>🌱 Social Impact and Relevance</h2>
<p>
The project emphasizes climate awareness and disaster preparedness by simplifying
complex environmental data and presenting it alongside clear safety guidance.
It highlights how front-end web technologies can contribute to informed
decision-making and community resilience during environmental emergencies.
</p>

<h2>⚠️ Limitations</h2>
<ul>
  <li>The data displayed is simulated or sourced from public APIs</li>
  <li>The dashboard does not replace official government alerts</li>
  <li>No backend processing or persistent data storage is implemented</li>
</ul>

<h2>📖 Conclusion</h2>
<p>
This project demonstrates the practical application of web programming concepts
to a socially relevant problem. Through structured design and interactive elements,
the Climate Risk and Disaster Management Dashboard showcases how front-end
technologies can be used effectively to visualize climate risks and promote
disaster awareness.
</p>

<h2>👥 Team Members</h2>
<ul>
  <li>Gomathi Lakshmi</li>
  <li>Navya</li>
</ul>

<h2>📜 Academic Declaration</h2>
<p>
This project was developed as part of the Web Programming course for the semester.
All work was carried out strictly for academic purposes in accordance with course
guidelines and collaborative development practices.
</p>
>>>>>>> cef72ba797417fab0af8d51fb6ea27ef218effe4
