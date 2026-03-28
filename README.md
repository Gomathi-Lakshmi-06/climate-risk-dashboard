# 🌍 Climate Risk & Disaster Management Dashboard

<p align="center">
  <strong>A real-time climate intelligence platform for localized risk analysis and disaster response coordination.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" />
  <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" />
  <img src="https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black" />
  <img src="https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white" />
</p>

---

## 🚀 Overview

The **Climate Risk & Disaster Management Dashboard** is a full-stack web application that transforms real-time weather data into actionable insights for climate risk assessment and emergency response.

It enables users to monitor environmental conditions, evaluate risk levels, and coordinate response efforts through a unified and interactive interface.

---

## ✨ Key Features

### 🌡️ Climate Risk Analytics

* Real-time monitoring of temperature, humidity, rainfall, UV index, and wind
* Automated classification of **Heat Risk** and **Flood Risk** (Low, Moderate, High)
* Short-term forecasting (3-day outlook) for proactive decision-making

### 📊 Interactive Dashboard

* Structured climate indicator grid for quick insights
* Alert queue highlighting critical conditions
* Forecast shift analysis for upcoming environmental changes

### 🚑 Emergency Response System

* Community-driven **incident reporting system**
* Integration of emergency contacts and relief locations
* Real-time situational updates for coordinated response

### 📍 Location Intelligence

* Supports both manual city input and precise geolocation
* Persistent location context across all modules
* Hyper-local climate insights for targeted monitoring

---

## 🛠️ Tech Stack

| Layer    | Technology                 |
| -------- | -------------------------- |
| Frontend | HTML, CSS, React (CDN)     |
| Backend  | Node.js                    |
| APIs     | Open-Meteo, OpenWeather    |
| Maps     | OpenStreetMap, Google Maps |

---

## 📂 Project Structure

```bash
.
├── server.js        # Backend API server
├── data.js          # Data processing & logic
├── app.js           # React frontend logic
├── styles.css       # UI styling
├── index.html       # Home page
├── dashboard.html   # Dashboard view
├── heat.html        # Heat risk module
├── flood.html       # Flood risk module
├── response.html    # Emergency response hub
```

---

## 🔗 API Endpoints

| Method | Endpoint           | Description             |
| ------ | ------------------ | ----------------------- |
| GET    | `/api/overview`    | Climate summary         |
| GET    | `/api/risks/heat`  | Heat risk data          |
| GET    | `/api/risks/flood` | Flood risk data         |
| GET    | `/api/response`    | Response dashboard data |
| GET    | `/api/incidents`   | Retrieve incidents      |
| POST   | `/api/incidents`   | Submit incident         |

---

## 🌦️ Data Sources

* **Open-Meteo** → Weather forecasts and geolocation
* **OpenWeather** → Official alerts *(optional)*
* **OpenStreetMap** → Mapping and spatial data
* **Google Maps** → Navigation links

---

## ▶️ Getting Started

```bash
git clone <your-repo-link>
cd climate-risk-dashboard
npm start
```

Open in browser:

```
http://localhost:3000
```

---

## 🔐 Environment Variables (Optional)

```bash
OPENWEATHER_API_KEY=your_api_key
```

---

## 📈 Future Enhancements

* Persistent database integration
* User authentication system
* Predictive analytics for climate risks
* Cloud deployment

---

## 👥 Team

* Navya
* Gomathi Lakshmi

---

## 📜 License

Developed for academic and demonstration purposes.
