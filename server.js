const http = require("http");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");
const { siteConfig, content, listUserReports, addUserReport, removeUserReport } = require("./data");

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || "127.0.0.1";
const ROOT = __dirname;
const CACHE_MS = siteConfig.refreshMinutes * 60 * 1000;
const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY || "";
const INDIA_ISO3 = "IND";

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon"
};

const liveCache = {
  entries: new Map()
};

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  res.end(JSON.stringify(data));
}

function serveFile(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = contentTypes[ext] || "application/octet-stream";

  fs.readFile(filePath, (err, data) => {
    if (err) {
      sendJson(res, 404, { error: "Not found" });
      return;
    }

    res.writeHead(200, { "Content-Type": contentType });
    res.end(data);
  });
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";

    req.on("data", (chunk) => {
      body += chunk.toString();
      if (body.length > 1e6) {
        reject(new Error("Payload too large"));
      }
    });

    req.on("end", () => {
      if (!body) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(new Error("Invalid JSON"));
      }
    });

    req.on("error", reject);
  });
}

function normalizePlace(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

function cacheKeyFor(place, latitude, longitude, options = {}) {
  const flags = [
    `relief:${options.includeRelief ? 1 : 0}`,
    `forecast:${options.includeForecast === false ? 0 : 1}`,

    `official:${options.includeOfficialAlerts ? 1 : 0}`,
    `current:${options.includeCurrentWeather === false ? 0 : 1}`
  ].join("|");
  if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
    return `coords:${latitude.toFixed(4)},${longitude.toFixed(4)}|${flags}`;
  }
  return `place:${normalizePlace(place).toLowerCase()}|${flags}`;
}

async function safeFetch(promise, fallbackValue) {
  try {
    return await promise;
  } catch {
    return fallbackValue;
  }
}

async function fetchJson(url, options = {}) {
  const controller = new AbortController();
  const timeoutMs = options.timeoutMs || 8000;
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        "User-Agent": "climate-risk-dashboard/1.0",
        ...(options.headers || {})
      }
    });

    if (!response.ok) {
      throw new Error(`Upstream request failed with ${response.status}`);
    }

    return response.json();
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error(`Upstream request timed out after ${timeoutMs}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchText(url, options = {}) {
  const controller = new AbortController();
  const timeoutMs = options.timeoutMs || 8000;
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        "User-Agent": "climate-risk-dashboard/1.0",
        ...(options.headers || {})
      }
    });

    if (!response.ok) {
      throw new Error(`Upstream request failed with ${response.status}`);
    }

    return response.text();
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error(`Upstream request timed out after ${timeoutMs}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function formatLocationLabel(location) {
  return [location.name, location.admin1, location.country].filter(Boolean).join(", ");
}

function normalizeSearchQuery(query) {
  return normalizePlace(query)
    .replace(/,\s*indi$/i, ", India")
    .replace(/\s+indi$/i, " India")
    .replace(/,\s*in$/i, ", India");
}

async function findLocationMatches(query) {
  const normalized = normalizeSearchQuery(query);
  if (!normalized || normalized.length < 2) {
    return [];
  }

  const geocodeUrl = new URL("https://geocoding-api.open-meteo.com/v1/search");
  geocodeUrl.searchParams.set("name", normalized.split(",")[0].trim());
  geocodeUrl.searchParams.set("count", "6");
  geocodeUrl.searchParams.set("language", "en");
  geocodeUrl.searchParams.set("format", "json");
  geocodeUrl.searchParams.set("countryCode", "IN");

  try {
    const geocode = await fetchJson(geocodeUrl, { timeoutMs: 2200 });
    const results = (Array.isArray(geocode.results) ? geocode.results : []).filter(
      (item) => String(item.country_code || item.country || "").toLowerCase() === "in" || String(item.country || "").toLowerCase() === "india"
    );
    if (results.length > 0) {
      return results;
    }
  } catch (error) {
    console.warn("Open-Meteo place search fallback:", error.message);
  }

  const nominatimUrl = new URL("https://nominatim.openstreetmap.org/search");
  nominatimUrl.searchParams.set("q", normalized.includes("india") ? normalized : `${normalized}, India`);
  nominatimUrl.searchParams.set("format", "jsonv2");
  nominatimUrl.searchParams.set("limit", "6");
  nominatimUrl.searchParams.set("addressdetails", "1");
  nominatimUrl.searchParams.set("countrycodes", "in");

  try {
    const results = await fetchJson(nominatimUrl, { timeoutMs: 2200 });
    return (Array.isArray(results) ? results : []).map((item) => ({
      name:
        item.address?.suburb ||
        item.address?.neighbourhood ||
        item.address?.city_district ||
        item.address?.town ||
        item.address?.city ||
        item.display_name?.split(",")[0] ||
        normalized,
      admin1: item.address?.state || item.address?.county || "",
      country: item.address?.country || "",
      latitude: Number(item.lat),
      longitude: Number(item.lon)
    }));
  } catch (error) {
    console.warn("Nominatim place search fallback failed:", error.message);
    return [];
  }
}

async function reverseGeocode(latitude, longitude) {
  const reverseUrl = new URL("https://nominatim.openstreetmap.org/reverse");
  reverseUrl.searchParams.set("lat", String(latitude));
  reverseUrl.searchParams.set("lon", String(longitude));
  reverseUrl.searchParams.set("format", "jsonv2");
  reverseUrl.searchParams.set("zoom", "14");
  return fetchJson(reverseUrl, { timeoutMs: 2200 });
}

function fallbackLocation(place) {
  const normalized = normalizeSearchQuery(place);
  if (normalized) {
    return {
      name: normalized,
      admin1: "",
      country: "",
      latitude: siteConfig.fallbackLatitude,
      longitude: siteConfig.fallbackLongitude,
      unresolved: true
    };
  }

  return {
    name: siteConfig.city,
    admin1: "Tamil Nadu",
    country: "India",
    latitude: siteConfig.fallbackLatitude,
    longitude: siteConfig.fallbackLongitude
  };
}

async function resolveLocation(place, latitude, longitude) {
  const normalizedPlace = normalizeSearchQuery(place);

  if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
    try {
      const reverse = await reverseGeocode(latitude, longitude);
      const address = reverse.address || {};
      return {
        name:
          address.suburb ||
          address.neighbourhood ||
          address.city_district ||
          address.city ||
          normalizedPlace ||
          siteConfig.city,
        admin1: address.state || address.county || "",
        country: address.country || "",
        latitude,
        longitude
      };
    } catch (error) {
      console.warn("Reverse geocoding fallback:", error.message);
      return fallbackLocation(normalizedPlace || siteConfig.city);
    }
  }

  const matches = await findLocationMatches(normalizedPlace || siteConfig.city);
  return matches[0] || fallbackLocation(normalizedPlace || siteConfig.city);
}

function weatherLabel(code) {
  const map = {
    0: "Clear sky",
    1: "Mostly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Depositing rime fog",
    51: "Light drizzle",
    53: "Moderate drizzle",
    55: "Dense drizzle",
    61: "Light rain",
    63: "Rain",
    65: "Heavy rain",
    71: "Light snowfall",
    80: "Rain showers",
    81: "Moderate showers",
    82: "Violent showers",
    95: "Thunderstorm"
  };
  return map[code] || "Mixed conditions";
}

function normalizeStatus(value) {
  if (value >= 80) {
    return "High";
  }
  if (value >= 45) {
    return "Moderate";
  }
  return "Low";
}

function determineHeatRisk(current, daily) {
  const apparent = current.apparent_temperature || current.temperature_2m || 0;
  const uvMax = daily.uv_index_max?.[0] || 0;
  if (apparent >= 40 || uvMax >= 10) {
    return "High";
  }
  if (apparent >= 34 || uvMax >= 7) {
    return "Moderate";
  }
  return "Low";
}

function determinePeakHeatRisk(daily) {
  const temps = Array.isArray(daily.temperature_2m_max) ? daily.temperature_2m_max : [];
  const uvs = Array.isArray(daily.uv_index_max) ? daily.uv_index_max : [];
  let peak = "Low";
  for (let i = 0; i < Math.min(3, Math.max(temps.length, uvs.length)); i++) {
    const t = temps[i] || 0;
    const u = uvs[i] || 0;
    if (t >= 38 || u >= 10) return "High";
    if (t >= 34 || u >= 7) peak = "Moderate";
  }
  return peak;
}

function determineFloodRisk(current, daily) {
  const rainNow = (current.precipitation || 0) + (current.rain || 0) + (current.showers || 0);
  const rainDay = daily.precipitation_sum?.[0] || 0;
  const probability = daily.precipitation_probability_max?.[0] || 0;
  if (rainDay >= 80 || probability >= 85 || rainNow >= 12) {
    return "High";
  }
  if (rainDay >= 25 || probability >= 55 || rainNow >= 4) {
    return "Moderate";
  }
  return "Low";
}

function determinePeakFloodRisk(daily) {
  const totals = Array.isArray(daily.precipitation_sum) ? daily.precipitation_sum : [];
  const probabilities = Array.isArray(daily.precipitation_probability_max) ? daily.precipitation_probability_max : [];
  let peak = "Low";

  for (let index = 0; index < Math.min(3, Math.max(totals.length, probabilities.length)); index += 1) {
    const candidate = determineFloodRisk(
      { precipitation: Number(totals[index] || 0) / 8 },
      {
        precipitation_sum: [Number(totals[index] || 0)],
        precipitation_probability_max: [Number(probabilities[index] || 0)]
      }
    );

    if (candidate === "High") {
      return "High";
    }
    if (candidate === "Moderate") {
      peak = "Moderate";
    }
  }

  return peak;
}

function buildTrendValue(today, tomorrow, suffix) {
  if (typeof today !== "number" || typeof tomorrow !== "number") {
    return "Stable";
  }
  const delta = tomorrow - today;
  const sign = delta > 0 ? "+" : "";
  return `${sign}${delta.toFixed(1)} ${suffix}`;
}

function districtReadiness(heatRisk, floodRisk, index) {
  const base = 90 - index * 2;
  const riskPenalty =
    (heatRisk === "High" ? 4 : heatRisk === "Moderate" ? 2 : 0) +
    (floodRisk === "High" ? 5 : floodRisk === "Moderate" ? 2 : 0);
  return `${Math.max(76, base - riskPenalty)}%`;
}

function toRadians(value) {
  return (value * Math.PI) / 180;
}

function distanceKm(fromLat, fromLon, toLat, toLon) {
  const earthRadius = 6371;
  const deltaLat = toRadians(toLat - fromLat);
  const deltaLon = toRadians(toLon - fromLon);
  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(toRadians(fromLat)) *
      Math.cos(toRadians(toLat)) *
      Math.sin(deltaLon / 2) *
      Math.sin(deltaLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadius * c;
}

function formatDistance(distance) {
  return distance < 1 ? `${Math.round(distance * 1000)} m` : `${distance.toFixed(1)} km`;
}

function formatFacilityType(tags) {
  if (tags.social_facility === "shelter") {
    return "Shelter";
  }
  if (tags.amenity === "hospital") {
    return "Hospital";
  }
  if (tags.amenity === "clinic") {
    return "Clinic";
  }
  if (tags.amenity === "community_centre") {
    return "Community center";
  }
  if (tags.amenity === "school") {
    return "School";
  }
  return "Relief point";
}

function extractElementCoordinates(element) {
  if (typeof element.lat === "number" && typeof element.lon === "number") {
    return { latitude: element.lat, longitude: element.lon };
  }
  if (element.center && typeof element.center.lat === "number" && typeof element.center.lon === "number") {
    return { latitude: element.center.lat, longitude: element.center.lon };
  }
  return null;
}

function sampleDistributedFacilities(items, limit) {
  if (items.length <= limit) {
    return items;
  }

  const selected = [];
  const lastIndex = items.length - 1;

  for (let index = 0; index < limit; index += 1) {
    const position = Math.round((index * lastIndex) / Math.max(1, limit - 1));
    selected.push(items[position]);
  }

  return selected;
}

function finalizeReliefResults(elements, latitude, longitude, mode) {
  const dedupe = new Set();
  const mapped = elements
    .map((element) => {
      const coords = extractElementCoordinates(element);
      const tags = element.tags || {};
      if (!coords || !tags.name) {
        return null;
      }

      const key = `${tags.name}-${coords.latitude.toFixed(4)}-${coords.longitude.toFixed(4)}`;
      if (dedupe.has(key)) {
        return null;
      }
      dedupe.add(key);

      const distance = distanceKm(latitude, longitude, coords.latitude, coords.longitude);
      const address = [
        tags["addr:housenumber"],
        tags["addr:street"],
        tags["addr:suburb"],
        tags["addr:city"]
      ]
        .filter(Boolean)
        .join(", ");

      return {
        id: key,
        name: tags.name,
        address: address || "Address not listed",
        type: formatFacilityType(tags),
        status: mode === "nearby" ? "Nearby" : "Citywide",
        latitude: coords.latitude,
        longitude: coords.longitude,
        distanceKm: distance,
        distanceLabel: formatDistance(distance)
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.distanceKm - b.distanceKm);

  if (mode === "citywide") {
    return sampleDistributedFacilities(mapped, 10).sort((a, b) => a.distanceKm - b.distanceKm);
  }

  return mapped.slice(0, 10);
}

async function fetchNearbyReliefLocations(latitude, longitude, mode = "nearby") {
  const radius = mode === "citywide" ? 25000 : 12000;
  const query = `
[out:json][timeout:25];
(
  node["amenity"~"hospital|clinic|community_centre|school"](around:${radius},${latitude},${longitude});
  way["amenity"~"hospital|clinic|community_centre|school"](around:${radius},${latitude},${longitude});
  relation["amenity"~"hospital|clinic|community_centre|school"](around:${radius},${latitude},${longitude});
  node["social_facility"="shelter"](around:${radius},${latitude},${longitude});
  way["social_facility"="shelter"](around:${radius},${latitude},${longitude});
  relation["social_facility"="shelter"](around:${radius},${latitude},${longitude});
);
out center tags;
`.trim();

  const endpoints = [
    "https://overpass-api.de/api/interpreter",
    "https://lz4.overpass-api.de/api/interpreter"
  ];

  for (const endpoint of endpoints) {
    try {
      const payload = await fetchJson(endpoint, {
        method: "POST",
        timeoutMs: 1800,
        headers: {
          "Content-Type": "text/plain;charset=UTF-8"
        },
        body: query
      });

      const results = finalizeReliefResults(Array.isArray(payload.elements) ? payload.elements : [], latitude, longitude, mode);

      if (results.length > 0) {
        return results;
      }
    } catch (error) {
      console.warn("Overpass relief lookup unavailable:", error.message);
    }
  }

  return [];
}

async function fallbackReliefSearch(locationLabel, latitude, longitude, mode = "nearby") {
  const categories = ["hospital", "clinic", "community centre", "shelter", "school"];
  const dedupe = new Set();
  const settled = await Promise.allSettled(
    categories.map(async (category) => {
      const searchUrl = new URL("https://nominatim.openstreetmap.org/search");
      searchUrl.searchParams.set("q", mode === "citywide" ? `${category} in ${locationLabel}` : `${category} near ${locationLabel}`);
      searchUrl.searchParams.set("format", "jsonv2");
      searchUrl.searchParams.set("limit", mode === "citywide" ? "6" : "4");
      searchUrl.searchParams.set("addressdetails", "1");

      const results = await fetchJson(searchUrl, { timeoutMs: 1200 });
      return { category, results: Array.isArray(results) ? results : [] };
    })
  );

  const collected = [];

  for (const result of settled) {
    if (result.status !== "fulfilled") {
      continue;
    }

    const { category, results } = result.value;
    for (const item of results) {
        const key = `${item.display_name}-${item.lat}-${item.lon}`;
        if (dedupe.has(key)) {
          continue;
        }
        dedupe.add(key);

        const resultLat = Number(item.lat);
        const resultLon = Number(item.lon);
        const distance = distanceKm(latitude, longitude, resultLat, resultLon);

        collected.push({
          id: key,
          name: item.display_name.split(",")[0],
          address: item.display_name,
          type: category[0].toUpperCase() + category.slice(1),
          status: mode === "nearby" ? "Nearby" : "Citywide",
          latitude: resultLat,
          longitude: resultLon,
          distanceKm: distance,
          distanceLabel: formatDistance(distance)
        });
    }
  }

  const sorted = collected.sort((a, b) => a.distanceKm - b.distanceKm);
  return mode === "citywide" ? sampleDistributedFacilities(sorted, 10).sort((a, b) => a.distanceKm - b.distanceKm) : sorted.slice(0, 10);
}



async function fetchOpenWeatherCurrent(latitude, longitude) {
  if (!OPENWEATHER_API_KEY) {
    return null;
  }

  const url = new URL("https://api.openweathermap.org/data/2.5/weather");
  url.searchParams.set("lat", String(latitude));
  url.searchParams.set("lon", String(longitude));
  url.searchParams.set("units", "metric");
  url.searchParams.set("appid", OPENWEATHER_API_KEY);

  try {
    return await fetchJson(url, { timeoutMs: 2200 });
  } catch (error) {
    console.warn("OpenWeather current unavailable:", error.message);
    return null;
  }
}

async function fetchOpenWeatherAlerts(latitude, longitude) {
  if (!OPENWEATHER_API_KEY) {
    return [];
  }

  const url = new URL("https://api.openweathermap.org/data/3.0/onecall");
  url.searchParams.set("lat", String(latitude));
  url.searchParams.set("lon", String(longitude));
  url.searchParams.set("exclude", "minutely,hourly,daily");
  url.searchParams.set("units", "metric");
  url.searchParams.set("appid", OPENWEATHER_API_KEY);

  try {
    const payload = await fetchJson(url, { timeoutMs: 2200 });
    return Array.isArray(payload.alerts) ? payload.alerts : [];
  } catch (error) {
    console.warn("OpenWeather alerts unavailable:", error.message);
    return [];
  }
}



function classifyHeatBand(apparentTemperature) {

  if (apparentTemperature >= 40) {
    return "Extreme";
  }
  if (apparentTemperature >= 34) {
    return "Elevated";
  }
  return "Manageable";
}

function classifyFloodBand(probability, rainTotal) {
  if (probability >= 85 || rainTotal >= 80) {
    return "Severe watch";
  }
  if (probability >= 55 || rainTotal >= 25) {
    return "Watch";
  }
  return "Routine";
}

function buildMetricCards(current, daily, heatRisk, floodRisk) {
  // Comprehensive set of metrics across both heat and flood domains (8 total)
  return [
    {
      id: "airTemperature",
      label: "Air Temperature",
      value: `${Math.round(current.temperature_2m)} C`,
      status: heatRisk,
      detail: "Current near-surface air temperature"
    },
    {
      id: "heatIndex",
      label: "Heat Index",
      value: `${Math.round(current.apparent_temperature)} C`,
      status: heatRisk,
      detail: "Daily apparent temperature index"
    },
    {
      id: "humidity",
      label: "Humidity",
      value: `${Math.round(current.relative_humidity_2m)}%`,
      status: normalizeStatus(current.relative_humidity_2m),
      detail: "Relative atmospheric moisture"
    },
    {
      id: "uvIndex",
      label: "UV Index",
      value: `${Math.round(daily.uv_index_max?.[0] || 0)}`,
      status: daily.uv_index_max?.[0] >= 8 ? "High" : daily.uv_index_max?.[0] >= 3 ? "Moderate" : "Low",
      detail: "Daily peak UV intensity today"
    },
    {
      id: "rainToday",
      label: "Rain Today",
      value: `${daily.precipitation_sum?.[0].toFixed(1)} mm`,
      status: floodRisk,
      detail: "Forecast daily precipitation total"
    },
    {
      id: "rainProb",
      label: "Rain Probability",
      value: `${daily.precipitation_probability_max?.[0] || 0}%`,
      status: floodRisk,
      detail: "Peak chance of measurable rainfall"
    },
    {
      id: "currentPrecip",
      label: "Current Precip",
      value: `${(current.precipitation || 0).toFixed(1)} mm`,
      status: floodRisk,
      detail: "Instant precipitation rate"
    },
    {
      id: "windMax",
      label: "Wind Max",
      value: `${Math.round(daily.wind_speed_10m_max?.[0] || 0)} km/h`,
      status: "Routine",
      detail: "Expected peak daily gusts"
    }
  ];
}

function buildDynamicHeatHotspots(live) {
  const current = live.forecast.current;
  const daily = live.forecast.daily;
  return [
    `Apparent temperature is ${Math.round(current.apparent_temperature)} C in ${live.location.name}.`,
    `Maximum UV for today is ${Math.round(daily.uv_index_max?.[0] || 0)}.`,
    `Humidity is ${Math.round(current.relative_humidity_2m)}%, which can intensify heat stress.`,
    `Wind speed is ${Math.round(current.wind_speed_10m || 0)} km/h with gusts up to ${Math.round(current.wind_gusts_10m || current.wind_speed_10m || 0)} km/h.`,
    `Surface pressure is ${Math.round(current.surface_pressure || 1013)} hPa, typical for the current thermal band.`,
    `Cloud cover is currently at ${Math.round(current.cloud_cover || 0)}%, allowing for significant solar radiation.`,
    `Local diurnal temperature range is expected to stay within a ${Math.round(daily.temperature_2m_max?.[0] - daily.temperature_2m_min?.[0] || 10)} degree band today.`
  ];
}

function buildDynamicHeatActions(live, riskLevel) {
  const actions = [];
  const current = live.forecast.current;
  const daily = live.forecast.daily;

  if (riskLevel !== "Low") {
    actions.push("Reduce outdoor exposure in the afternoon and move strenuous field work to cooler hours.");
  }
  if ((daily.uv_index_max?.[0] || 0) >= 7) {
    actions.push("Push hydration, shade breaks, and sun protection because UV stress is elevated today.");
  }
  if ((current.relative_humidity_2m || 0) >= 70) {
    actions.push("Watch for sticky heat conditions, especially for elderly residents and outdoor staff.");
  }

  actions.push("Ensure emergency cooling centers are staffed and community hydration points are fully operational.");
  actions.push("Issue heat stroke awareness alerts to vulnerable populations and outdoor workers.");
  actions.push("Limit construction and energy-intensive outdoor maintenance during peak sun hours (11 AM - 4 PM).");
  actions.push("Check in on neighbors who live alone or may have limited air conditioning access.");

  if (!actions.length) {
    actions.push("Current heat conditions are manageable; continue routine hydration and temperature monitoring.");
  }

  return actions;
}

function buildDynamicFloodHotspots(live) {
  const current = live.forecast.current;
  const daily = live.forecast.daily;
  return [
    `Forecast rainfall today is ${Number(daily.precipitation_sum?.[0] || 0).toFixed(1)} mm.`,
    `Rain probability today is ${daily.precipitation_probability_max?.[0] || 0}%.`,
    `Current precipitation is ${Number(current.precipitation || 0).toFixed(1)} mm.`,
    `Wind speed is ${Math.round(current.wind_speed_10m || 0)} km/h with daily maximums near ${Math.round(daily.wind_speed_10m_max?.[0] || 0)} km/h.`,
    `Atmospheric pressure is ${Math.round(current.surface_pressure || 1013)} hPa, coinciding with current condensation pressure.`,
    `Local sky coverage is ${Math.round(current.cloud_cover || 0)}%, which is consistent with the rainfall probability model.`,
    `Daily precipitation peak intensity is expected to be ${Number(daily.precipitation_sum?.[0] / 3 || 0).toFixed(1)} mm/hr if rain cells persist.`
  ];
}

function buildDynamicFloodActions(live, riskLevel, forecastRisk) {
  const actions = [];
  const daily = live.forecast.daily;

  if (riskLevel !== "Low" || forecastRisk !== "Low") {
    actions.push("Keep drainage-sensitive roads and low-lying corridors under active watch.");
  }
  if ((daily.precipitation_probability_max?.[0] || 0) >= 55) {
    actions.push("Prepare route advisories and waterlogging updates if rain cells intensify.");
  }
  if ((daily.precipitation_sum?.[1] || 0) > (daily.precipitation_sum?.[0] || 0)) {
    actions.push("Review tomorrow's rainfall increase and pre-position response equipment before conditions worsen.");
  }

  actions.push("Check street-level pumping stations and ensure manual crews are ready for rapid debris clearance.");
  actions.push("Pre-position medical supplies and emergency food packets in identified flood-vulnerable neighborhoods.");
  actions.push("Advise commuters to avoid chronically waterlogged subway tunnels and low-lying underpasses.");
  actions.push("Pre-deploy sandbags and temporary barriers at known overflow points in residential zones.");
  if (!actions.length) {
    actions.push("Flood conditions are currently manageable; continue routine monitoring of rainfall and drainage.");
  }

  return actions;
}

function buildResponseChecklist(live, overview, incidents) {
  const priorities = [];

  priorities.push(`Refresh live field status for ${live.location.name} every ${siteConfig.refreshMinutes} minutes.`);
  priorities.push(`Verify ${live.nearbyReliefLocations.length} mapped relief locations and keep route access visible on the response board.`);

  if (overview.heatRisk !== "Low") {
    priorities.push("Keep hydration, cooling support, and medical observation ready for heat-sensitive groups.");
  }
  if (overview.peakFloodRisk !== "Low") {
    priorities.push("Monitor low-lying roads and drainage corridors because short-range flood pressure is elevated.");
  }
  if (incidents.length) {
    priorities.push(`Track ${incidents.length} live incident records and keep map links ready for dispatch follow-up.`);
  }

  return priorities.slice(0, 6);
}

function buildLiveSignals(live, heatRisk, floodRisk) {
  const current = live.forecast.current;
  const daily = live.forecast.daily;
  const locationLabel = formatLocationLabel(live.location);
  const signals = [];

  if (heatRisk !== "Low") {
    signals.push({
      id: `heat-${live.fetchedAt}`,
      title: `Heat stress signal for ${live.location.name}`,
      location: locationLabel,
      severity: heatRisk,
      status: "Live weather signal",
      description: `Apparent temperature is ${Math.round(current.apparent_temperature)} C with UV index expected near ${Math.round(daily.uv_index_max?.[0] || 0)}.`,
      reportedAt: live.fetchedAt,
      source: "Live weather model"
    });
  }

  if (floodRisk !== "Low") {
    signals.push({
      id: `flood-${live.fetchedAt}`,
      title: `Flood readiness signal for ${live.location.name}`,
      location: locationLabel,
      severity: floodRisk,
      status: "Live weather signal",
      description: `Forecast rain today is ${Number(daily.precipitation_sum?.[0] || 0).toFixed(1)} mm with ${daily.precipitation_probability_max?.[0] || 0}% precipitation probability.`,
      reportedAt: live.fetchedAt,
      source: "Live weather model"
    });
  }

  if ((current.wind_gusts_10m || 0) >= 35) {
    signals.push({
      id: `wind-${live.fetchedAt}`,
      title: `Wind advisory for ${live.location.name}`,
      location: locationLabel,
      severity: "Moderate",
      status: "Live weather signal",
      description: `Wind gusts are reaching ${Math.round(current.wind_gusts_10m)} km/h.`,
      reportedAt: live.fetchedAt,
      source: "Live weather model"
    });
  }

  return signals;
}

function buildOfficialAlerts(live) {
  return (live.officialAlerts || []).map((alert, index) => ({
    id: `official-${index}-${alert.start || live.fetchedAt}`,
    title: alert.event || alert.sender_name || "Official weather alert",
    location: formatLocationLabel(live.location),
    severity: "High",
    status: "Official alert",
    description: alert.description || "Official weather alert received for this area.",
    reportedAt: alert.start ? new Date(alert.start * 1000).toISOString() : live.fetchedAt,
    source: "OpenWeather alerts"
  }));
}

function buildCombinedIncidents(live, heatRisk, floodRisk) {
  return [...buildOfficialAlerts(live), ...buildLiveSignals(live, heatRisk, floodRisk), ...listUserReports()].sort(
    (a, b) => new Date(b.reportedAt) - new Date(a.reportedAt)
  );
}

async function getLiveContext(place, latitude, longitude, options = {}) {
  const includeRelief = Boolean(options.includeRelief);
  const includeForecast = options.includeForecast !== false;
  const includeOfficialAlerts = Boolean(options.includeOfficialAlerts);
  const includeCurrentWeather = options.includeCurrentWeather !== false;
  const cacheKey = cacheKeyFor(place || siteConfig.city, latitude, longitude, {
    includeRelief,
    includeForecast,
    includeOfficialAlerts,
    includeCurrentWeather
  });
  const cached = liveCache.entries.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.payload;
  }

  const location = await resolveLocation(place, latitude, longitude);
  const resolvedLatitude = location.latitude || siteConfig.fallbackLatitude;
  const resolvedLongitude = location.longitude || siteConfig.fallbackLongitude;
  const locationLabel = formatLocationLabel(location);
  if (location.unresolved) {
    const error = new Error(`Could not resolve a live Indian location for "${normalizeSearchQuery(place)}". Please choose a suggestion from the list.`);
    error.code = "LOCATION_NOT_RESOLVED";
    throw error;
  }
  const reliefMode = Number.isFinite(latitude) && Number.isFinite(longitude) ? "nearby" : "citywide";

  const forecastUrl = new URL("https://api.open-meteo.com/v1/forecast");
  if (includeForecast) {
    forecastUrl.searchParams.set("latitude", String(resolvedLatitude));
    forecastUrl.searchParams.set("longitude", String(resolvedLongitude));
    forecastUrl.searchParams.set("timezone", siteConfig.timezone);
    forecastUrl.searchParams.set("forecast_days", "3");
    forecastUrl.searchParams.set(
      "current",
      [
        "temperature_2m",
        "relative_humidity_2m",
        "apparent_temperature",
        "precipitation",
        "rain",
        "showers",
        "wind_speed_10m",
        "wind_gusts_10m",
        "surface_pressure",
        "cloud_cover",
        "weather_code"
      ].join(",")
    );
    forecastUrl.searchParams.set(
      "daily",
      [
        "weather_code",
        "temperature_2m_max",
        "temperature_2m_min",
        "precipitation_sum",
        "precipitation_probability_max",
        "uv_index_max",
        "wind_speed_10m_max"
      ].join(",")
    );
  }

  const [forecast, officialAlerts, openWeatherCurrent, nearbyReliefLocations] = await Promise.all([
    includeForecast ? fetchJson(forecastUrl, { timeoutMs: 3200 }) : Promise.resolve(null),
    includeOfficialAlerts ? safeFetch(fetchOpenWeatherAlerts(resolvedLatitude, resolvedLongitude), []) : Promise.resolve([]),
    includeForecast && includeCurrentWeather ? safeFetch(fetchOpenWeatherCurrent(resolvedLatitude, resolvedLongitude), null) : Promise.resolve(null),
    includeRelief
      ? safeFetch(
          (async () => {
            const direct = await fetchNearbyReliefLocations(resolvedLatitude, resolvedLongitude, reliefMode);
            if (direct.length > 0) {
              return direct;
            }
            return fallbackReliefSearch(locationLabel, resolvedLatitude, resolvedLongitude, reliefMode);
          })(),
          []
        )
      : Promise.resolve([])
  ]);

  if (forecast && openWeatherCurrent?.main) {
    forecast.current.temperature_2m = openWeatherCurrent.main.temp;
    forecast.current.apparent_temperature = openWeatherCurrent.main.feels_like;
    forecast.current.relative_humidity_2m = openWeatherCurrent.main.humidity;
    forecast.current.surface_pressure = openWeatherCurrent.main.pressure;
    forecast.current.wind_speed_10m = Number(openWeatherCurrent.wind?.speed || 0) * 3.6;
    forecast.current.wind_gusts_10m = Number(openWeatherCurrent.wind?.gust || 0) * 3.6;
    forecast.current.cloud_cover = openWeatherCurrent.clouds?.all ?? forecast.current.cloud_cover;
  }

  const payload = {
    requestedPlace: normalizePlace(place) || location.name || siteConfig.city,
    location,
    forecast,
    officialAlerts,
    nearbyReliefLocations,
    reliefMode,
    fetchedAt: new Date().toISOString(),
    sources: {
      weather: OPENWEATHER_API_KEY ? "OpenWeather Current API + Open-Meteo Forecast API + OpenWeather Alerts API" : "Open-Meteo Forecast API",
      geocoding: Number.isFinite(latitude) && Number.isFinite(longitude) ? "OpenStreetMap Nominatim reverse geocoding + Open-Meteo Geocoding API" : "Open-Meteo Geocoding API",
      maps: "OpenStreetMap embed and map links",
      relief: includeRelief ? (nearbyReliefLocations.length ? "OpenStreetMap Overpass / Nominatim" : "Live map provider unavailable") : "Loaded on response page only"
    }
  };

  liveCache.entries.set(cacheKey, {
    payload,
    expiresAt: Date.now() + CACHE_MS
  });

  return payload;
}

function buildOverviewPayload(live, type = "home") {
  const current = live.forecast.current;
  const daily = live.forecast.daily;
  const heatRisk = determineHeatRisk(current, daily);
  const floodRisk = determineFloodRisk(current, daily);
  const peakFloodRisk = determinePeakFloodRisk(daily);
  const incidents = listUserReports();

  return {
    location: formatLocationLabel(live.location),
    selectedCity: live.requestedPlace,
    coordinates: {
      latitude: live.location.latitude,
      longitude: live.location.longitude
    },
    lastUpdated: live.fetchedAt,
    refreshMinutes: siteConfig.refreshMinutes,
    hero: content.hero,
    summary: `${weatherLabel(current.weather_code)}. ${Math.round(current.temperature_2m)} C and ${daily.precipitation_sum?.[0]?.toFixed(1) || 0} mm forecast rainfall today.`,
    metrics: buildMetricCards(current, daily, heatRisk, floodRisk),
    alerts: [
      {
        title: "Heat stress posture",
        severity: heatRisk,
        summary:
          heatRisk === "High"
            ? "Limit midday outdoor activity, increase hydration points, and keep cooling spaces ready."
            : heatRisk === "Moderate"
              ? "Heat exposure is elevated during the afternoon. Use shade, water, and paced field shifts."
              : "Heat risk is currently manageable."
      },
      {
        title: "Flood readiness posture",
        severity: peakFloodRisk,
        summary:
          peakFloodRisk === "High"
            ? "A stronger flood signal appears in the short-range forecast, so low-lying corridors should prepare for waterlogging."
            : peakFloodRisk === "Moderate"
              ? "Some forecast periods show higher rainfall pressure even if current flood conditions remain manageable."
              : "No broad flood signal right now, though drainage monitoring should continue."
      },
      {
        title: "Current sky condition",
        severity: "Info",
        summary: `${weatherLabel(current.weather_code)} across ${formatLocationLabel(live.location)}.`
      }
    ],
    trends: [
      {
        label: "Tomorrow max temperature",
        direction: daily.temperature_2m_max?.[1] > daily.temperature_2m_max?.[0] ? "up" : "down",
        value: buildTrendValue(daily.temperature_2m_max?.[0], daily.temperature_2m_max?.[1], "C")
      },
      {
        label: "Tomorrow rainfall",
        direction: daily.precipitation_sum?.[1] > daily.precipitation_sum?.[0] ? "up" : "down",
        value: buildTrendValue(daily.precipitation_sum?.[0], daily.precipitation_sum?.[1], "mm")
      },
      {
        label: "Flood band",
        direction: "steady",
        value: classifyFloodBand(daily.precipitation_probability_max?.[0] || 0, Number(daily.precipitation_sum?.[0] || 0))
      }
    ],
    outlook: daily.time.map((day, index) => ({
      day: index === 0 ? "Today" : index === 1 ? "Tomorrow" : "Day 3",
      date: day,
      condition: weatherLabel(daily.weather_code[index]),
      temperature: `${Math.round(daily.temperature_2m_max[index])} C / ${Math.round(daily.temperature_2m_min[index])} C`,
      rainfall: `${daily.precipitation_sum[index].toFixed(1)} mm`,
      risk:
        index === 0
          ? (heatRisk === "High" || floodRisk === "High" ? "High" : heatRisk === "Moderate" || floodRisk === "Moderate" ? "Moderate" : "Low")
          : determineFloodRisk(
              { precipitation: daily.precipitation_sum[index] / 8 },
              {
                precipitation_sum: [daily.precipitation_sum[index]],
                precipitation_probability_max: [daily.precipitation_probability_max[index]]
              }
            )
    })),
    heatRisk,
    floodRisk,
    peakFloodRisk,
    incidentCount: incidents.length,
    source: live.sources
  };
}

function buildHeatPayload(live) {
  const current = live.forecast.current;
  const daily = live.forecast.daily;
  const riskLevel = determineHeatRisk(current, daily);

  return {
    pageTitle: "Heat Risk Center",
    selectedCity: live.requestedPlace,
    riskLevel,
    forecastRisk: determinePeakHeatRisk(daily),
    summary: `Live temperature and UV readings indicate ${riskLevel.toLowerCase()} to elevated heat stress potential across ${live.location.name}.`,
    indicators: [
      { label: "Heat Index", value: `${Math.round(current.apparent_temperature)} C`, note: "Current apparent temperature" },
      { label: "Air Temperature", value: `${Math.round(current.temperature_2m)} C`, note: "Current near-surface air temperature" },
      { label: "Humidity", value: `${Math.round(current.relative_humidity_2m)}%`, note: "Humidity directly affects how hot it feels" },
      { label: "UV Index Max", value: `${Math.round(daily.uv_index_max?.[0] || 0)}`, note: "Expected peak UV today" }
    ],
    hotspots: buildDynamicHeatHotspots(live),
    recommendations: buildDynamicHeatActions(live, riskLevel),
    forecast: daily.time.map((day, index) => ({
      day: index === 0 ? "Today" : index === 1 ? "Tomorrow" : "Day 3",
      condition: weatherLabel(daily.weather_code[index]),
      value: `High ${Math.round(daily.temperature_2m_max[index])} C | Low ${Math.round(daily.temperature_2m_min[index])} C | UV ${Math.round(daily.uv_index_max[index] || 0)}`,
      risk:
        daily.temperature_2m_max[index] >= 38 || daily.uv_index_max[index] >= 10
          ? "High"
          : daily.temperature_2m_max[index] >= 34 || daily.uv_index_max[index] >= 7
            ? "Moderate"
            : "Low"
    })),
    source: live.sources,
    lastUpdated: live.fetchedAt
  };
}

function buildFloodPayload(live) {
  const current = live.forecast.current;
  const daily = live.forecast.daily;
  const riskLevel = determineFloodRisk(current, daily);
  const forecastRisk = determinePeakFloodRisk(daily);

  return {
    pageTitle: "Flood Risk Center",
    selectedCity: live.requestedPlace,
    riskLevel,
    forecastRisk,
    summary: `Rainfall probability, precipitation totals, and runoff pressure place flood readiness at ${riskLevel.toLowerCase()} level for ${live.location.name}.`,
    indicators: [
      { label: "Rain Today", value: `${daily.precipitation_sum?.[0].toFixed(1)} mm`, note: "Forecast daily precipitation total" },
      { label: "Rain Probability", value: `${daily.precipitation_probability_max?.[0] || 0}%`, note: "Chance of measurable rainfall today" },
      { label: "Current Precipitation", value: `${(current.precipitation || 0).toFixed(1)} mm`, note: "Instant precipitation rate" },
      { label: "Wind Max", value: `${Math.round(daily.wind_speed_10m_max?.[0] || 0)} km/h`, note: "Stronger gusts can worsen road conditions" }
    ],
    hotspots: buildDynamicFloodHotspots(live),
    recommendations: buildDynamicFloodActions(live, riskLevel, forecastRisk),
    forecast: daily.time.map((day, index) => ({
      day: index === 0 ? "Today" : index === 1 ? "Tomorrow" : "Day 3",
      condition: weatherLabel(daily.weather_code[index]),
      value: `${daily.precipitation_sum[index].toFixed(1)} mm | ${daily.precipitation_probability_max[index] || 0}% probability`,
      risk:
        daily.precipitation_sum[index] >= 80 || (daily.precipitation_probability_max[index] || 0) >= 85
          ? "High"
          : daily.precipitation_sum[index] >= 25 || (daily.precipitation_probability_max[index] || 0) >= 55
            ? "Moderate"
            : "Low"
    })),
    source: live.sources,
    lastUpdated: live.fetchedAt
  };
}

function buildResponsePayload(live) {
  const overview = buildOverviewPayload(live);
  const incidents = listUserReports();
  const shelters = live.nearbyReliefLocations || [];

  return {
    ...content.response,
    selectedCity: live.requestedPlace,
    shelters,
    reliefStatus: shelters.length
      ? live.reliefMode === "nearby"
        ? `Showing ${shelters.length} nearest mapped facilities around your precise location in ${formatLocationLabel(live.location)}.`
        : `Showing ${shelters.length} mapped relief points across ${formatLocationLabel(live.location)}.`
      : "Live relief locations are temporarily unavailable from the map provider.",
    reliefScope: live.reliefMode === "nearby" ? "Precise location" : "Citywide coverage",
    operationalStatus: {
      heatRisk: overview.heatRisk,
      floodRisk: overview.floodRisk,
      summary: `${weatherLabel(live.forecast.current.weather_code)}. ${Math.round(live.forecast.current.temperature_2m)} C and ${Number(live.forecast.daily.precipitation_sum?.[0] || 0).toFixed(1)} mm forecast rainfall today.`
    },
    refreshMinutes: siteConfig.refreshMinutes,
    location: overview.location,
    source: live.sources,
    lastUpdated: live.fetchedAt,
    checklist: buildResponseChecklist(live, overview, incidents),
    incidents
  };
}

function buildResponseReliefPayload(live) {
  const shelters = live.nearbyReliefLocations || [];

  return {
    location: formatLocationLabel(live.location),
    shelters,
    reliefStatus: shelters.length
      ? live.reliefMode === "nearby"
        ? `Showing ${shelters.length} nearest mapped facilities around your precise location in ${formatLocationLabel(live.location)}.`
        : `Showing ${shelters.length} mapped relief points across ${formatLocationLabel(live.location)}.`
      : "Live relief locations are temporarily unavailable from the map provider.",
    reliefScope: live.reliefMode === "nearby" ? "Precise location" : "Citywide coverage",
    lastUpdated: live.fetchedAt
  };
}

async function handleApi(req, res, pathname) {
  try {
    const requestUrl = new URL(req.url, `http://${req.headers.host}`);
    const place = normalizePlace(requestUrl.searchParams.get("city"));
    const latitude = Number.parseFloat(requestUrl.searchParams.get("lat"));
    const longitude = Number.parseFloat(requestUrl.searchParams.get("lon"));

    if (req.method === "GET" && pathname === "/api/cities") {
      const query = normalizePlace(requestUrl.searchParams.get("query"));
      if (!query || query.length < 2) {
        sendJson(res, 200, { cities: [] });
        return true;
      }

      const matches = await findLocationMatches(query);
      sendJson(res, 200, {
        cities: matches.map((item) => ({
          id: `${item.name}-${item.latitude}-${item.longitude}`,
          name: item.name,
          admin1: item.admin1,
          country: item.country,
          latitude: item.latitude,
          longitude: item.longitude,
          label: formatLocationLabel(item)
        }))
      });
      return true;
    }

    if (req.method === "GET" && pathname === "/api/overview") {
      const live = await getLiveContext(place, latitude, longitude, { includeRelief: false });
      sendJson(res, 200, buildOverviewPayload(live));
      return true;
    }

    if (req.method === "GET" && pathname === "/api/risks/heat") {
      const live = await getLiveContext(place, latitude, longitude, { includeRelief: false });
      sendJson(res, 200, buildHeatPayload(live));
      return true;
    }

    if (req.method === "GET" && pathname === "/api/risks/flood") {
      const live = await getLiveContext(place, latitude, longitude, { includeRelief: false });
      sendJson(res, 200, buildFloodPayload(live));
      return true;
    }


    if (req.method === "GET" && pathname === "/api/response") {
      const live = await getLiveContext(place, latitude, longitude, { includeRelief: false });
      sendJson(res, 200, buildResponsePayload(live));
      return true;
    }

    if (req.method === "GET" && pathname === "/api/response-relief") {
      const live = await getLiveContext(place, latitude, longitude, { includeRelief: true, includeForecast: false, includeCurrentWeather: false });
      sendJson(res, 200, buildResponseReliefPayload(live));
      return true;
    }

    if (req.method === "GET" && pathname === "/api/incidents") {
      sendJson(res, 200, { incidents: listUserReports() });
      return true;
    }

    if (req.method === "POST" && pathname === "/api/incidents") {
      const payload = await parseBody(req);
      const title = String(payload.title || "").trim();
      const location = String(payload.location || "").trim();
      const severity = String(payload.severity || "").trim();
      const description = String(payload.description || "").trim();

      if (!title || !location || !severity || !description) {
        sendJson(res, 400, {
          error: "title, location, severity, and description are required"
        });
        return true;
      }

      const incident = addUserReport({ title, location, severity, description });
      sendJson(res, 201, { message: "Incident recorded", incident });
      return true;
    }

    if (req.method === "POST" && pathname === "/api/incidents/delete") {
      const payload = await parseBody(req);
      const { id } = payload;

      if (!id) {
        sendJson(res, 400, { error: "Incident ID is required" });
        return true;
      }

      const removed = removeUserReport(id);
      if (removed) {
        sendJson(res, 200, { message: "Incident successfully removed" });
      } else {
        sendJson(res, 404, { error: "Incident record not found" });
      }
      return true;
    }

    return false;
  } catch (error) {
    sendJson(res, 502, { error: `Live data unavailable: ${error.message}` });
    return true;
  }
}

function resolvePage(pathname) {
  if (pathname === "/") {
    return path.join(ROOT, "index.html");
  }

  const safePath = path.normalize(pathname).replace(/^(\.\.[/\\])+/, "");
  return path.join(ROOT, safePath);
}

const server = http.createServer(async (req, res) => {
  const requestUrl = new URL(req.url, `http://${req.headers.host}`);
  const { pathname } = requestUrl;

  if (pathname.startsWith("/api/")) {
    const handled = await handleApi(req, res, pathname);
    if (!handled) {
      sendJson(res, 404, { error: "API route not found" });
    }
    return;
  }

  const filePath = resolvePage(pathname);
  if (!filePath.startsWith(ROOT)) {
    sendJson(res, 403, { error: "Forbidden" });
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      sendJson(res, 404, { error: "Page not found" });
      return;
    }
    serveFile(res, filePath);
  });
});

server.listen(PORT, HOST, () => {
  console.log(`Climate Risk Dashboard running at http://${HOST}:${PORT}`);
});
