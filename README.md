<h1 align="center">🌍 Climate Risk & Disaster Management Dashboard</h1>

<p align="center">
A full-stack, real-time climate intelligence platform for monitoring environmental risks and enabling effective disaster response.
</p>

---

## 🚀 Overview

The **Climate Risk & Disaster Management Dashboard** is a real-time web application designed to monitor climate conditions and assess risks such as heatwaves and floods.

It combines live weather data, risk analytics, and emergency response tools into a unified, user-friendly interface.

---

## 🛠️ Tech Stack

* **Frontend:** HTML, CSS, React (CDN-based)
* **Backend:** Node.js
* **APIs:** Open-Meteo, OpenWeather
* **Maps & Location:** OpenStreetMap, Google Maps

---

## ✨ Key Features

* 📊 Real-time climate monitoring (temperature, humidity, UV, rainfall, wind)
* 🌡️ Heat & Flood risk classification
* 📍 Location-based data with live city search
* ⚠️ Disaster response & incident reporting system
* 🗺️ Integrated maps and emergency resource access
* 🔁 Dynamic frontend with API-driven updates

---

## 🖥️ Application Screenshots

### 🏠 Home & Live Operations

* Central control panel for climate monitoring
* Displays current risk levels and live weather summary

![Home](./screenshots/home.png)

---

### 📊 Dashboard – Climate Posture Analysis

* Detailed breakdown of climate indicators
* Heat index, humidity, UV index, rainfall, wind
* Alert queue and forecast shift insights

![Dashboard](./screenshots/dashboard.png)

---

### 🌡️ Heat & Risk Indicators

* Real-time heat exposure analysis
* Priority alerts for safety recommendations

*(Integrated within dashboard view)*

---

### 🌊 Flood Risk Center

* Rainfall tracking and probability analysis
* Flood readiness indicators
* Recommended precautionary actions

![Flood](./screenshots/flood.png)

---

### 🚑 Emergency Coordination Hub

* Emergency helplines and contacts
* Nearby hospitals and relief centers
* Incident reporting system with backend integration
* Map-based response support

![Response](./screenshots/response.png)

---

## 📂 Project Structure

```bash
.
├── server.js        # Backend server & API routes
├── data.js          # Shared data logic
├── app.js           # React frontend logic
├── styles.css       # Styling
├── index.html       # Home page
├── dashboard.html   # Dashboard
├── heat.html        # Heat risk
├── flood.html       # Flood risk
├── response.html    # Disaster response
```

---

## 🔗 API Endpoints

* `GET /api/overview`
* `GET /api/risks/heat`
* `GET /api/risks/flood`
* `GET /api/response`
* `GET /api/cities`
* `GET /api/incidents`
* `POST /api/incidents`

---

## 🌦️ Data Sources

* Open-Meteo Forecast API → real-time weather metrics
* Open-Meteo Geocoding API → location resolution
* OpenWeather API → official alerts *(optional)*
* OpenStreetMap → map visualization
* Google Maps → navigation links

---

## ▶️ Getting Started

### 1. Clone the Repository

```bash
git clone <your-repo-link>
cd climate-risk-dashboard
```

### 2. Run the Server

```bash
npm start
```

### 3. Open in Browser

```text
http://localhost:3000
```

---

## 🔐 Environment Variables (Optional)

```bash
OPENWEATHER_API_KEY=your_api_key
```

---

## 📌 Future Enhancements

* Persistent database for incident storage
* User authentication system
* Advanced predictive analytics
* Cloud deployment (AWS / Vercel / Render)

---

## 👥 Team

* Navya
* Gomathi Lakshmi
---

## 📜 License

Developed for academic and demonstration purposes.
