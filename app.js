const e = React.createElement;
const CITY_STORAGE_KEY = "climate-risk-selected-city";
const PRECISE_LOCATION_KEY = "climate-risk-precise-location";
const API_CACHE_PREFIX = "climate-risk-api-cache:";
const API_CACHE_TTL_MS = 30 * 60 * 1000;

function cacheKeyForUrl(url) {
  return `${API_CACHE_PREFIX}${url}`;
}

function readCachedApiData(url) {
  try {
    const raw = localStorage.getItem(cacheKeyForUrl(url));
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.savedAt || !parsed.data) {
      return null;
    }

    if (Date.now() - parsed.savedAt > API_CACHE_TTL_MS) {
      localStorage.removeItem(cacheKeyForUrl(url));
      return null;
    }

    return parsed.data;
  } catch {
    return null;
  }
}

function writeCachedApiData(url, data) {
  try {
    localStorage.setItem(
      cacheKeyForUrl(url),
      JSON.stringify({
        savedAt: Date.now(),
        data
      })
    );
  } catch {
    // Ignore localStorage quota or serialization failures.
  }
}

function useCitySelection() {
  const [selectedCity, setSelectedCity] = React.useState(
    () => localStorage.getItem(CITY_STORAGE_KEY) || "Chennai"
  );

  React.useEffect(() => {
    localStorage.setItem(CITY_STORAGE_KEY, selectedCity);
  }, [selectedCity]);

  return [selectedCity, setSelectedCity];
}

function usePreciseLocation() {
  const [location, setLocation] = React.useState(() => {
    const raw = localStorage.getItem(PRECISE_LOCATION_KEY);
    return raw ? JSON.parse(raw) : null;
  });
  const [status, setStatus] = React.useState("");

  React.useEffect(() => {
    if (location) {
      localStorage.setItem(PRECISE_LOCATION_KEY, JSON.stringify(location));
    } else {
      localStorage.removeItem(PRECISE_LOCATION_KEY);
    }
  }, [location]);

  function requestPreciseLocation() {
    if (!navigator.geolocation) {
      setStatus("Geolocation is not supported in this browser.");
      return;
    }

    setStatus("Getting your live location...");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
        setStatus("Using your precise live location.");
      },
      () => {
        setStatus("Location permission was denied.");
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000
      }
    );
  }

  function clearPreciseLocation() {
    setLocation(null);
    setStatus("Using searched place instead of device location.");
  }

  return { location, status, requestPreciseLocation, clearPreciseLocation };
}

<<<<<<< HEAD
function buildApiUrl(path, city, preciseLocation, type) {
=======
function buildApiUrl(path, city, preciseLocation) {
>>>>>>> cef72ba797417fab0af8d51fb6ea27ef218effe4
  const url = new URL(path, window.location.origin);
  if (city) {
    url.searchParams.set("city", city);
  }
  if (preciseLocation?.latitude && preciseLocation?.longitude) {
    url.searchParams.set("lat", preciseLocation.latitude);
    url.searchParams.set("lon", preciseLocation.longitude);
  }
<<<<<<< HEAD
  if (type) {
    url.searchParams.set("type", type);
  }
=======
>>>>>>> cef72ba797417fab0af8d51fb6ea27ef218effe4
  return `${url.pathname}${url.search}`;
}

function useFetch(url, refreshMs) {
  const [state, setState] = React.useState(() => {
    const cachedData = readCachedApiData(url);
    return {
      loading: !cachedData,
      data: cachedData,
      error: ""
    };
  });

  React.useEffect(() => {
    let active = true;
    const cachedData = readCachedApiData(url);

    setState((current) => ({
      loading: !current.data && !cachedData,
      data: current.data || cachedData,
      error: ""
    }));

    function load() {
      fetch(url)
        .then((response) => {
          if (!response.ok) {
            throw new Error("Unable to load live data");
          }
          return response.json();
        })
        .then((data) => {
          writeCachedApiData(url, data);
          if (active) {
            setState({ loading: false, data, error: "" });
          }
        })
        .catch((error) => {
          if (active) {
            setState((current) => ({
<<<<<<< HEAD
              loading: false,
=======
              loading: current.data ? false : true,
>>>>>>> cef72ba797417fab0af8d51fb6ea27ef218effe4
              data: current.data,
              error: error.message
            }));
          }
        });
    }

    load();
    const timer = refreshMs ? window.setInterval(load, refreshMs) : null;

    return () => {
      active = false;
<<<<<<< HEAD
      if (timer) window.clearInterval(timer);
    };
  }, [url]);
=======
      if (timer) {
        window.clearInterval(timer);
      }
    };
  }, [url, refreshMs]);
>>>>>>> cef72ba797417fab0af8d51fb6ea27ef218effe4

  return state;
}

function useCitySearch(query) {
  const [results, setResults] = React.useState([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!query || query.trim().length < 2) {
      setResults([]);
      setLoading(false);
      return undefined;
    }

    let active = true;
    setLoading(true);

    const timer = window.setTimeout(() => {
      fetch(`/api/cities?query=${encodeURIComponent(query.trim())}`)
        .then((response) => response.json())
        .then((data) => {
          if (active) {
            setResults(data.cities || []);
            setLoading(false);
          }
        })
        .catch(() => {
          if (active) {
            setResults([]);
            setLoading(false);
          }
        });
    }, 250);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [query]);

  return { results, loading };
}

function severityClass(value) {
  const normalized = String(value || "").toLowerCase();
  if (["high", "elevated", "watch", "sticky"].includes(normalized)) {
    return "severity-high";
  }
  if (["moderate", "standby"].includes(normalized)) {
    return "severity-moderate";
  }
  return "severity-low";
}

function formatDate(value) {
  return new Date(value).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short"
  });
}

function buildMapUrl(latitude, longitude) {
  return `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
}

function buildMapEmbedUrl(latitude, longitude) {
  const box = 0.02;
  const left = longitude - box;
  const right = longitude + box;
  const top = latitude + box;
  const bottom = latitude - box;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${left}%2C${bottom}%2C${right}%2C${top}&layer=mapnik&marker=${latitude}%2C${longitude}`;
}

function buildQueryMapUrl(query) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

function LocationPicker(props) {
  const [query, setQuery] = React.useState(props.selectedCity);
  const [open, setOpen] = React.useState(false);
  const { results, loading } = useCitySearch(query);

  React.useEffect(() => {
    setQuery(props.selectedCity);
  }, [props.selectedCity]);

  function selectLocation(city) {
    props.onSelect(city.label || city.name);
    props.onClearPrecise();
    setQuery(city.label || city.name);
    setOpen(false);
  }

<<<<<<< HEAD
  function bestMatchedLocation() {
    const normalizedQuery = query.trim().toLowerCase();
    if (!results.length) {
      return null;
    }

    return (
      results.find((city) => city.label.toLowerCase() === normalizedQuery) ||
      results.find((city) => city.label.toLowerCase().startsWith(normalizedQuery)) ||
      results[0]
    );
  }

=======
>>>>>>> cef72ba797417fab0af8d51fb6ea27ef218effe4
  return e(
    "div",
    { className: "city-picker" },
    e("label", { className: "city-picker-label" }, "Location"),
    e(
      "div",
      { className: "city-picker-shell" },
      e("input", {
        value: query,
        onChange: (event) => {
          setQuery(event.target.value);
          setOpen(true);
        },
        onFocus: () => setOpen(true),
        placeholder: "Search city or locality",
        className: "city-input"
      }),
      e(
        "button",
        {
          type: "button",
          className: "city-apply-button",
          onClick: () => {
<<<<<<< HEAD
            const matched = bestMatchedLocation();
            if (matched) {
              selectLocation(matched);
              return;
            }
=======
>>>>>>> cef72ba797417fab0af8d51fb6ea27ef218effe4
            props.onSelect(query.trim() || "Chennai");
            props.onClearPrecise();
            setOpen(false);
          }
        },
        "Use place"
      )
    ),
    e(
      "div",
      { className: "location-actions" },
      e(
        "button",
        {
          type: "button",
          className: "secondary-button",
          onClick: props.onRequestPrecise
        },
        "Use precise location"
      ),
      props.preciseLocation
        ? e(
            "button",
            {
              type: "button",
              className: "secondary-button",
              onClick: props.onClearPrecise
            },
            "Clear precise"
          )
        : null
    ),
    props.locationStatus ? e("p", { className: "picker-note" }, props.locationStatus) : null,
    props.preciseLocation ? e("p", { className: "picker-note" }, "Precise location is active, so nearby values and facilities are based on your live device location.") : null,
    open
      ? e(
          "div",
          { className: "city-results" },
          loading
            ? e("div", { className: "city-result muted" }, "Searching...")
            : results.length
              ? results.map((city) =>
                  e(
                    "button",
                    {
                      type: "button",
                      key: city.id,
                      className: "city-result",
                      onClick: () => selectLocation(city)
                    },
                    city.label
                  )
                )
              : e("div", { className: "city-result muted" }, "Type at least 2 letters to search locations")
        )
      : null
  );
}

function Layout(props) {
  const navItems = [
    { href: "index.html", label: "Home", key: "index" },
    { href: "dashboard.html", label: "Dashboard", key: "dashboard" },
    { href: "heat.html", label: "Heat", key: "heat" },
    { href: "flood.html", label: "Flood", key: "flood" },
    { href: "response.html", label: "Response", key: "response" }
  ];

  return e(
    "div",
    { className: "site-shell" },
    e(
      "header",
      { className: "topbar" },
      e(
        "div",
        { className: "brand" },
        e("p", { className: "brand-kicker" }, "Live operations"),
        e("p", { className: "brand-title" }, "Climate Risk and Disaster Management Dashboard"),
        e("p", { className: "brand-subtitle" }, "Live monitoring for weather, risk posture, relief access, and emergency response.")
      ),
      e(
        "div",
        { className: "topbar-controls" },
        e(
<<<<<<< HEAD
          "div",
          { className: "topbar-location" },
          e(LocationPicker, {
            selectedCity: props.selectedCity,
            onSelect: props.onSelectCity,
            preciseLocation: props.preciseLocation,
            onRequestPrecise: props.onRequestPreciseLocation,
            onClearPrecise: props.onClearPreciseLocation,
            locationStatus: props.locationStatus
          })
        ),
        e(
=======
>>>>>>> cef72ba797417fab0af8d51fb6ea27ef218effe4
          "nav",
          { className: "nav-links", "aria-label": "Main navigation" },
          navItems.map((item) =>
            e(
              "a",
              {
                key: item.key,
                href: item.href,
                className: props.page === item.key ? "active" : ""
              },
              item.label
            )
          )
<<<<<<< HEAD
        )
      )
    ),
    props.children
=======
        ),
        e(
          "div",
          { className: "topbar-location" },
          e(LocationPicker, {
            selectedCity: props.selectedCity,
            onSelect: props.onSelectCity,
            preciseLocation: props.preciseLocation,
            onRequestPrecise: props.onRequestPreciseLocation,
            onClearPrecise: props.onClearPreciseLocation,
            locationStatus: props.locationStatus
          })
        )
      )
    ),
    props.children,
    e(
      "footer",
      { className: "footer" },
      e("div", null, props.footerText || "Live weather and response context refresh automatically.")
    )
>>>>>>> cef72ba797417fab0af8d51fb6ea27ef218effe4
  );
}

function Hero(props) {
  return e(
    "section",
    { className: "hero reveal" },
    e(
      "div",
      { className: "hero-copy" },
      e("div", { className: "eyebrow" }, e("span", { className: "live-dot" }), props.eyebrow || "Live monitoring"),
      e("h1", null, props.title),
      e("p", null, props.description),
      props.actions ? e("div", { className: "action-row" }, props.actions) : null
    ),
    props.aside ? e("div", { className: "hero-aside" }, props.aside) : null
  );
}

function MetricCard(metric) {
  return e(
    "article",
<<<<<<< HEAD
    { className: `card reveal ${metric.featured ? "metric-card featured" : "metric-card"}`, key: metric.id || metric.label },
=======
    { className: "card reveal", key: metric.id || metric.label },
>>>>>>> cef72ba797417fab0af8d51fb6ea27ef218effe4
    e("div", { className: "card-label" }, metric.label),
    e("div", { className: "metric-value" }, metric.value),
    e("div", { className: `status-pill ${severityClass(metric.status)}` }, metric.status),
    e("p", { className: "muted" }, metric.detail || metric.note)
  );
}

<<<<<<< HEAD
function MetricGrid(props) {
  const items = props.items || [];
  const columnClass = items.length === 6 ? "grid-3" : "grid-2";
  
  return e(
    "div",
    { className: "metrics-stack" },
    e(
      "div",
      { className: `grid metrics ${columnClass}` },
      items.map((item, index) => e(MetricCard, { ...item, key: item.id || index, featured: index < 2 }))
    )
  );
}

=======
>>>>>>> cef72ba797417fab0af8d51fb6ea27ef218effe4
function ForecastList(props) {
  return e(
    "div",
    { className: "panel reveal" },
    e("h3", null, props.title),
    e(
      "div",
      { className: "list" },
      props.items.map((item, index) =>
        e(
          "div",
          { className: "list-item forecast-row", key: item.day || item.label || index },
          e(
            "div",
            null,
            e("h4", null, item.day || item.label),
            e("p", null, item.condition || item.summary || item.note)
          ),
          e(
            "div",
            { className: "forecast-meta" },
            e("div", { className: `status-pill ${severityClass(item.risk || item.severity)}` }, item.risk || item.severity || "Info"),
            e("p", null, item.value || item.temperature || item.rainfall || item.description)
          )
        )
      )
    )
  );
}

<<<<<<< HEAD
=======
function SourceBadge(props) {
  return e(
    "div",
    { className: "source-badge" },
    `Last updated ${formatDate(props.updatedAt)} | auto refresh every ${props.refreshMinutes} min`
  );
}

function LoadingPanel(props) {
  return e(
    "div",
    { className: "loading-state" },
    e(
      "div",
      { className: "loading-orb", "aria-hidden": "true" },
      e("span", { className: "loading-ring loading-ring--one" }),
      e("span", { className: "loading-ring loading-ring--two" }),
      e("span", { className: "loading-core" })
    ),
    e("p", { className: "loading-title" }, props.title),
    e("p", { className: "loading-caption" }, props.caption || "Pulling live climate signals and preparing the view.")
  );
}

>>>>>>> cef72ba797417fab0af8d51fb6ea27ef218effe4
function pageLayoutProps(props, data, page, footerText) {
  return {
    page,
    selectedCity: props.selectedCity,
    onSelectCity: props.onSelectCity,
    preciseLocation: props.preciseLocation,
    onRequestPreciseLocation: props.onRequestPreciseLocation,
    onClearPreciseLocation: props.onClearPreciseLocation,
    locationStatus: props.locationStatus,
    footerText,
    source: data?.source
  };
}

function HomePage(props) {
  const overview = useFetch(buildApiUrl("/api/overview", props.selectedCity, props.preciseLocation), 600000);

  if (overview.loading && !overview.data) {
<<<<<<< HEAD
    return e(Layout, pageLayoutProps(props, null, "index"), e("div", { className: "loading-state" }, "Loading climate overview..."));
=======
    return e(Layout, pageLayoutProps(props, null, "index"), e(LoadingPanel, { title: "Loading climate overview..." }));
>>>>>>> cef72ba797417fab0af8d51fb6ea27ef218effe4
  }

  if (overview.error && !overview.data) {
    return e(Layout, pageLayoutProps(props, null, "index"), e("div", { className: "empty-state" }, overview.error));
  }

  const data = overview.data;

  return e(
    Layout,
    pageLayoutProps(props, data, "index", `${data.location} live situation snapshot.`),
    e(
      Hero,
      {
        eyebrow: data.location,
        title: data.hero.title,
        description: data.hero.subtitle,
        actions: [
          e("a", { key: "dashboard", href: "dashboard.html", className: "link-button primary" }, "Open live dashboard"),
          e("a", { key: "response", href: "response.html", className: "link-button ghost" }, "Go to response hub")
        ],
        aside: e(
          "div",
          { className: "hero-aside-card" },
<<<<<<< HEAD
          e("div", { className: "hero-risk-grid" },
            e("div", { className: "hero-risk-tile" }, e("span", { className: "muted" }, "Heat"), e("strong", null, data.heatRisk)),
            e("div", { className: "hero-risk-tile" }, e("span", { className: "muted" }, "Flood"), e("strong", null, data.peakFloodRisk || data.floodRisk)),
            e("div", { className: "hero-risk-tile full" }, e("span", { className: "muted" }, "Now"), e("strong", null, data.summary))
=======
          e(SourceBadge, { updatedAt: data.lastUpdated, refreshMinutes: data.refreshMinutes }),
          e("div", { className: "hero-risk-grid" },
            e("div", { className: "hero-risk-tile" }, e("span", { className: "muted" }, "Heat"), e("strong", null, data.heatRisk)),
            e("div", { className: "hero-risk-tile" }, e("span", { className: "muted" }, "Flood outlook"), e("strong", null, data.peakFloodRisk || data.floodRisk)),
            e("div", { className: "hero-risk-tile" }, e("span", { className: "muted" }, "Incidents"), e("strong", null, String(data.incidentCount)))
>>>>>>> cef72ba797417fab0af8d51fb6ea27ef218effe4
          )
        )
      }
    ),
    e(
      "section",
      { className: "section" },
      e(
        "div",
        { className: "section-heading" },
<<<<<<< HEAD
        e("div", null, e("h2", null, "Live place indicators"), e("p", null, "Current field conditions derived from live location-aware weather feeds."))
      ),
      e(MetricGrid, { items: data.metrics })
=======
        e("div", null, e("h2", null, "Live place indicators"), e("p", null, "Current field conditions derived from live location-aware weather feeds.")),
        e(SourceBadge, { updatedAt: data.lastUpdated, refreshMinutes: data.refreshMinutes })
      ),
      e("div", { className: "grid metrics" }, data.metrics.map(MetricCard))
>>>>>>> cef72ba797417fab0af8d51fb6ea27ef218effe4
    ),
    e(
      "section",
      { className: "section" },
      e(
        "div",
        { className: "grid two" },
        e(ForecastList, { title: "Priority alerts", items: data.alerts }),
        e(ForecastList, { title: "3-day outlook", items: data.outlook })
      )
    )
  );
}

function DashboardPage(props) {
<<<<<<< HEAD
  const overview = useFetch(buildApiUrl("/api/overview", props.selectedCity, props.preciseLocation, "dashboard"), 600000);

  if (overview.loading && !overview.data) {
    return e(Layout, pageLayoutProps(props, null, "dashboard"), e("div", { className: "loading-state" }, "Loading live dashboard..."));
=======
  const overview = useFetch(buildApiUrl("/api/overview", props.selectedCity, props.preciseLocation), 600000);

  if (overview.loading && !overview.data) {
    return e(Layout, pageLayoutProps(props, null, "dashboard"), e(LoadingPanel, { title: "Loading live dashboard..." }));
>>>>>>> cef72ba797417fab0af8d51fb6ea27ef218effe4
  }

  if (overview.error && !overview.data) {
    return e(Layout, pageLayoutProps(props, null, "dashboard"), e("div", { className: "empty-state" }, overview.error));
  }

  const data = overview.data;

  return e(
    Layout,
    pageLayoutProps(props, data, "dashboard", "Operational dashboard for rapid climate awareness and planning."),
    e(
      Hero,
      {
        eyebrow: "Operations dashboard",
<<<<<<< HEAD
        title: "Climate posture analysis",
        description: "Track live conditions, scan the next 48 to 72 hours for temperature and rainfall shifts, and review the location currently driving the dashboard data.",
        aside: e(
          "div",
          { className: "hero-aside-card" },
          e("div", { className: "hero-risk-grid" },
            e("div", { className: "hero-risk-tile" }, e("span", { className: "muted" }, "Heat"), e("strong", null, data.heatRisk)),
            e("div", { className: "hero-risk-tile" }, e("span", { className: "muted" }, "Flood"), e("strong", null, data.peakFloodRisk || data.floodRisk)),
            e("div", { className: "hero-risk-tile full" }, e("span", { className: "muted" }, "Now"), e("strong", null, data.summary))
=======
        title: "Real-time urban climate posture",
        description: "Track live conditions, scan the next 72 hours for temperature and rainfall shifts, and review the exact place currently driving the dashboard.",
        aside: e(
          "div",
          { className: "hero-aside-card" },
          e(SourceBadge, { updatedAt: data.lastUpdated, refreshMinutes: data.refreshMinutes }),
          e(
            "div",
            { className: "kpi-strip compact" },
            e("div", { className: "mini-stat" }, e("span", { className: "muted" }, "Heat posture"), e("strong", null, data.heatRisk)),
            e("div", { className: "mini-stat" }, e("span", { className: "muted" }, "Flood outlook"), e("strong", null, data.peakFloodRisk || data.floodRisk)),
            e("div", { className: "mini-stat" }, e("span", { className: "muted" }, "Live incidents"), e("strong", null, String(data.incidentCount)))
>>>>>>> cef72ba797417fab0af8d51fb6ea27ef218effe4
          )
        )
      }
    ),
<<<<<<< HEAD
    e("section", { className: "section" }, e(MetricGrid, { items: data.metrics })),
=======
    e("section", { className: "section" }, e("div", { className: "grid metrics" }, data.metrics.map(MetricCard))),
>>>>>>> cef72ba797417fab0af8d51fb6ea27ef218effe4
    e(
      "section",
      { className: "section" },
      e(
        "div",
        { className: "grid two" },
        e(ForecastList, { title: "Alert queue", items: data.alerts }),
        e(ForecastList, { title: "Forecast shifts", items: data.trends })
      )
    ),
    e(
      "section",
      { className: "section" },
      e(
        "div",
        { className: "panel reveal" },
        e(
          "div",
          { className: "section-heading" },
          e("div", null, e("h2", null, "Location briefing"), e("p", null, "This section now reflects the currently selected live location instead of static district placeholders."))
        ),
        e(
          "div",
          { className: "table-wrap" },
          e(
            "table",
            { className: "table" },
            e(
              "thead",
              null,
              e("tr", null, e("th", null, "Field"), e("th", null, "Live value"))
            ),
            e(
              "tbody",
              null,
              [
                ["Selected place", data.location],
                ["Coordinates", data.coordinates ? `${Number(data.coordinates.latitude).toFixed(4)}, ${Number(data.coordinates.longitude).toFixed(4)}` : "Unavailable"],
                ["Heat posture", data.heatRisk],
                ["Flood today", data.floodRisk],
                ["Flood next 3 days", data.peakFloodRisk || data.floodRisk],
<<<<<<< HEAD
=======
                ["Live incidents", String(data.incidentCount)],
>>>>>>> cef72ba797417fab0af8d51fb6ea27ef218effe4
                ["Last refresh", formatDate(data.lastUpdated)]
              ].map(([label, value]) =>
                e(
                  "tr",
                  { key: label },
                  e("td", null, label),
                  e("td", null, value)
                )
              )
            )
          )
        )
      )
    )
  );
}

function RiskPage(props) {
  const response = useFetch(buildApiUrl(`/api/risks/${props.type}`, props.selectedCity, props.preciseLocation), 600000);

  if (response.loading && !response.data) {
<<<<<<< HEAD
    return e(Layout, pageLayoutProps(props, null, props.type), e("div", { className: "loading-state" }, `Loading ${props.type} risk data...`));
=======
    return e(Layout, pageLayoutProps(props, null, props.type), e(LoadingPanel, { title: `Loading ${props.type} risk data...` }));
>>>>>>> cef72ba797417fab0af8d51fb6ea27ef218effe4
  }

  if (response.error && !response.data) {
    return e(Layout, pageLayoutProps(props, null, props.type), e("div", { className: "empty-state" }, response.error));
  }

  const data = response.data;

  return e(
    Layout,
    pageLayoutProps(props, data, props.type, `${data.pageTitle} refreshes with live weather conditions.`),
    e(
      Hero,
      {
        eyebrow: props.type === "heat" ? "Temperature stress monitoring" : "Rainfall and flood readiness",
        title: data.pageTitle,
        description: data.summary,
        aside: e(
          "div",
          { className: "hero-aside-card" },
<<<<<<< HEAD
          e("div", { className: "hero-risk-grid" },
            e("div", { className: "hero-risk-tile" }, e("span", { className: "muted" }, "Current risk"), e("strong", null, data.riskLevel)),
            e("div", { className: "hero-risk-tile" }, e("span", { className: "muted" }, "3-day outlook"), e("strong", null, data.forecastRisk || data.riskLevel))
=======
          e(SourceBadge, { updatedAt: data.lastUpdated, refreshMinutes: 10 }),
          e("div", { className: "hero-risk-grid" },
            e("div", { className: "hero-risk-tile" }, e("span", { className: "muted" }, "Current risk"), e("strong", null, data.riskLevel)),
            props.type === "flood"
              ? e("div", { className: "hero-risk-tile" }, e("span", { className: "muted" }, "3-day outlook"), e("strong", null, data.forecastRisk || data.riskLevel))
              : e("div", { className: "hero-risk-tile" }, e("span", { className: "muted" }, "Refresh"), e("strong", null, "10 min"))
>>>>>>> cef72ba797417fab0af8d51fb6ea27ef218effe4
          )
        )
      }
    ),
<<<<<<< HEAD
    e("section", { className: "section" }, e(MetricGrid, { items: data.indicators })),
=======
    e("section", { className: "section" }, e("div", { className: "grid metrics" }, data.indicators.map(MetricCard))),
>>>>>>> cef72ba797417fab0af8d51fb6ea27ef218effe4
    e(
      "section",
      { className: "section" },
      e(
        "div",
        { className: "grid two" },
        e(
          "div",
          { className: "panel reveal" },
<<<<<<< HEAD
          e("h3", null, props.type === "heat" ? "Live heat observations" : "Live flood observations"),
=======
          e("h3", null, "Priority hotspots"),
>>>>>>> cef72ba797417fab0af8d51fb6ea27ef218effe4
          e(
            "ul",
            { className: "list" },
            data.hotspots.map((item) => e("li", { className: "list-item", key: item }, e("p", null, item)))
          )
        ),
        e(
          "div",
          { className: "panel reveal" },
          e("h3", null, "Recommended actions"),
          e(
            "ul",
            { className: "list" },
            data.recommendations.map((item) => e("li", { className: "list-item", key: item }, e("p", null, item)))
          )
        )
      )
    ),
    e(ForecastList, { title: "Next 3 days", items: data.forecast })
  );
}

function ResponsePage(props) {
  const response = useFetch(buildApiUrl("/api/response", props.selectedCity, props.preciseLocation), 600000);
<<<<<<< HEAD
  const relief = useFetch(buildApiUrl("/api/response-relief", props.selectedCity, props.preciseLocation), 600000);
=======
  const [selectedShelterIndex, setSelectedShelterIndex] = React.useState(0);
>>>>>>> cef72ba797417fab0af8d51fb6ea27ef218effe4
  const [form, setForm] = React.useState({
    title: "",
    location: "",
    severity: "Moderate",
    description: ""
  });
  const [submitState, setSubmitState] = React.useState({ loading: false, message: "", error: "" });
  const [incidents, setIncidents] = React.useState([]);
<<<<<<< HEAD
=======
  const [removeState, setRemoveState] = React.useState({ loadingId: null, message: "", error: "" });
>>>>>>> cef72ba797417fab0af8d51fb6ea27ef218effe4

  React.useEffect(() => {
    if (response.data) {
      setIncidents(response.data.incidents || []);
<<<<<<< HEAD
=======
      setSelectedShelterIndex((current) =>
        Math.min(current, Math.max(0, (response.data.shelters || []).length - 1))
      );
      setRemoveState({ loadingId: null, message: "", error: "" });
>>>>>>> cef72ba797417fab0af8d51fb6ea27ef218effe4
    }
  }, [response.data]);

  function onChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  function onSubmit(event) {
    event.preventDefault();
    setSubmitState({ loading: true, message: "", error: "" });

    fetch("/api/incidents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    })
      .then((res) => res.json().then((body) => ({ ok: res.ok, body })))
      .then(({ ok, body }) => {
        if (!ok) {
          throw new Error(body.error || "Could not save incident");
        }
        setIncidents((current) => [body.incident, ...current]);
        setForm({ title: "", location: "", severity: "Moderate", description: "" });
        setSubmitState({ loading: false, message: "Incident submitted successfully.", error: "" });
      })
      .catch((error) => {
        setSubmitState({ loading: false, message: "", error: error.message });
      });
  }

<<<<<<< HEAD
  if (response.loading && !response.data) {
    return e(Layout, pageLayoutProps(props, null, "response"), e("div", { className: "loading-state" }, "Loading response hub..."));
=======
  function onRemoveIncident(incident) {
    const review = window.prompt("Before removing this incident, share a short review about the work done to resolve it.");
    if (review === null) {
      return;
    }

    const trimmedReview = review.trim();
    if (!trimmedReview) {
      setRemoveState({
        loadingId: null,
        message: "",
        error: "Please add a short review before removing the incident."
      });
      return;
    }

    const confirmed = window.confirm("Remove this incident from the board now?");
    if (!confirmed) {
      return;
    }

    setRemoveState({ loadingId: incident.id, message: "", error: "" });

    fetch(`/api/incidents/${incident.id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ review: trimmedReview })
    })
      .then((res) => res.json().then((body) => ({ ok: res.ok, body })))
      .then(({ ok, body }) => {
        if (!ok) {
          throw new Error(body.error || "Could not remove incident");
        }

        setIncidents((current) => current.filter((item) => item.id !== incident.id));
        setRemoveState({
          loadingId: null,
          message: "Incident removed after recording the completion review.",
          error: ""
        });
      })
      .catch((error) => {
        setRemoveState({ loadingId: null, message: "", error: error.message });
      });
  }

  if (response.loading && !response.data) {
    return e(Layout, pageLayoutProps(props, null, "response"), e(LoadingPanel, { title: "Loading response hub..." }));
>>>>>>> cef72ba797417fab0af8d51fb6ea27ef218effe4
  }

  if (response.error && !response.data) {
    return e(Layout, pageLayoutProps(props, null, "response"), e("div", { className: "empty-state" }, response.error));
  }

  const data = response.data;
<<<<<<< HEAD
  const reliefData = relief.data;
  const shelters = reliefData?.shelters || [];
  const reliefStatus = reliefData?.reliefStatus || "Matching the selected place to live relief-map data...";
  const reliefScope = reliefData?.reliefScope || data.reliefScope || "Citywide coverage";
=======
  const selectedShelter = data.shelters[selectedShelterIndex] || data.shelters[0];
>>>>>>> cef72ba797417fab0af8d51fb6ea27ef218effe4

  return e(
    Layout,
    pageLayoutProps(props, data, "response", `Emergency coordination view for ${data.location}.`),
    e(
      Hero,
      {
        eyebrow: "Emergency coordination",
        title: data.pageTitle,
        description: data.summary,
        aside: e(
          "div",
          { className: "hero-aside-card" },
<<<<<<< HEAD
=======
          e(SourceBadge, { updatedAt: data.lastUpdated, refreshMinutes: data.refreshMinutes }),
>>>>>>> cef72ba797417fab0af8d51fb6ea27ef218effe4
          e("div", { className: "hero-risk-grid" },
            e("div", { className: "hero-risk-tile" }, e("span", { className: "muted" }, "Heat"), e("strong", null, data.operationalStatus.heatRisk)),
            e("div", { className: "hero-risk-tile" }, e("span", { className: "muted" }, "Flood"), e("strong", null, data.operationalStatus.floodRisk)),
            e("div", { className: "hero-risk-tile wide" }, e("span", { className: "muted" }, "Now"), e("strong", null, data.operationalStatus.summary))
          )
        )
      }
    ),
    e(
      "section",
      { className: "section" },
      e(
        "div",
        { className: "kpi-strip response-overview reveal" },
        e("div", { className: "mini-stat" }, e("span", { className: "muted" }, "Selected place"), e("strong", null, data.location)),
<<<<<<< HEAD
        e("div", { className: "mini-stat" }, e("span", { className: "muted" }, "Relief coverage"), e("strong", null, reliefScope)),
        e("div", { className: "mini-stat" }, e("span", { className: "muted" }, "Nearby relief points"), e("strong", null, relief.loading && !reliefData ? "Loading..." : String(shelters.length))),
        e("div", { className: "mini-stat" }, e("span", { className: "muted" }, "User reports"), e("strong", null, String(incidents.length)))
=======
        e("div", { className: "mini-stat" }, e("span", { className: "muted" }, "Relief coverage"), e("strong", null, data.reliefScope || "Citywide coverage")),
        e("div", { className: "mini-stat" }, e("span", { className: "muted" }, "Nearby relief points"), e("strong", null, String(data.shelters.length))),
        e("div", { className: "mini-stat" }, e("span", { className: "muted" }, "Live source"), e("strong", null, data.source?.relief || "Live search"))
>>>>>>> cef72ba797417fab0af8d51fb6ea27ef218effe4
      ),
      e(
        "div",
        { className: "panel reveal section-note" },
<<<<<<< HEAD
        e("p", null, reliefStatus)
      ),
        e(
          "div",
          { className: "grid two response-balance" },
          e(
            "div",
            { className: "panel reveal response-left-panel" },
            e("h3", null, "Emergency contacts"),
=======
        e("p", null, data.reliefStatus || "Nearby places are being fetched from live map data for the selected place.")
      ),
      e(
        "div",
        { className: "grid two response-panels" },
        e(
          "div",
          { className: "panel reveal response-panel response-panel--contacts" },
          e("h3", null, "Emergency contacts"),
          e("p", { className: "contact-panel-note muted" }, "Choose the contact based on the kind of help needed so response teams can reach the right place faster."),
>>>>>>> cef72ba797417fab0af8d51fb6ea27ef218effe4
          e(
            "div",
            { className: "contact-list" },
            data.contacts.map((contact) =>
              e(
                "article",
                { className: "contact-card", key: contact.label },
<<<<<<< HEAD
                e("div", null, e("h4", null, contact.label), e("p", null, contact.description)),
                e("a", { href: contact.href, className: "link-button primary contact-button" }, contact.value)
              )
            )
          ),
          e("div", { className: "section-divider" }),
=======
                e(
                  "div",
                  { className: "contact-copy" },
                  e("h4", null, contact.label),
                  e("p", null, contact.description),
                  contact.helpText ? e("p", { className: "contact-help" }, contact.helpText) : null
                ),
                e("a", { href: contact.href, className: "link-button primary contact-button" }, contact.value)
              )
            )
          )
        ),
        e(
          "div",
          { className: "panel reveal response-panel response-panel--relief" },
          e(
            "div",
            { className: "section-heading" },
            e("div", null, e("h2", null, "Relief locations"), e("p", null, "These are live mapped response points based on your searched place or precise device location.")),
            selectedShelter
              ? e(
                  "a",
                  {
                    href: buildMapUrl(selectedShelter.latitude, selectedShelter.longitude),
                    target: "_blank",
                    rel: "noreferrer",
                    className: "link-button ghost"
                  },
                  "Open directions"
                )
              : null
          ),
          data.shelters.length
            ? e(
                "div",
                { className: "shelter-list" },
                data.shelters.map((shelter, index) =>
                  e(
                    "article",
                    {
                      key: shelter.id,
                      className: `shelter-card ${index === selectedShelterIndex ? "active" : ""}`,
                      onClick: () => setSelectedShelterIndex(index)
                    },
                    e(
                      "div",
                      null,
                      e("h4", null, shelter.name),
                      e("p", null, shelter.address),
                      e(
                        "p",
                        { className: "muted" },
                        data.reliefScope === "Precise location"
                          ? `${shelter.type} | ${shelter.distanceLabel} away`
                          : shelter.type
                      )
                    ),
                    e(
                      "div",
                      { className: "shelter-actions" },
                      e("span", { className: `status-pill ${severityClass(shelter.status)}` }, shelter.status),
                      e(
                        "a",
                        {
                          href: buildMapUrl(shelter.latitude, shelter.longitude),
                          target: "_blank",
                          rel: "noreferrer",
                          className: "link-button ghost small",
                          onClick: (event) => event.stopPropagation()
                        },
                        "Open map"
                      )
                    )
                  )
                )
              )
            : e(
                "div",
                { className: "empty-state" },
                e("p", null, "No nearby mapped relief locations were returned for this place right now."),
                e("p", { className: "muted" }, data.reliefStatus || "Try a more specific locality or use precise location for better results.")
              ),
          selectedShelter
            ? e(
                "div",
                { className: "map-panel" },
                e("iframe", {
                  title: selectedShelter.name,
                  src: buildMapEmbedUrl(selectedShelter.latitude, selectedShelter.longitude),
                  className: "map-frame",
                  loading: "lazy"
                })
              )
            : null
        )
      )
    ),
    e(
      "section",
      { className: "section" },
      e(
        "div",
        { className: "grid two" },
        e(
          "div",
          { className: "panel reveal" },
>>>>>>> cef72ba797417fab0af8d51fb6ea27ef218effe4
          e("h3", null, "Report an incident"),
          e(
            "form",
            { className: "form", onSubmit },
            e(
              "div",
              { className: "form-grid" },
              e("label", null, "Incident title", e("input", { name: "title", value: form.title, onChange, placeholder: "Ex: Severe waterlogging near bridge", required: true })),
              e("label", null, "Location", e("input", { name: "location", value: form.location, onChange, placeholder: "Ward / street / zone", required: true })),
              e(
                "label",
                null,
                "Severity",
                e(
                  "select",
                  { name: "severity", value: form.severity, onChange },
                  ["Low", "Moderate", "High"].map((level) => e("option", { key: level, value: level }, level))
                )
              )
            ),
            e("label", null, "Description", e("textarea", { name: "description", value: form.description, onChange, placeholder: "Describe the situation, impact, and support needed.", required: true })),
            e("button", { type: "submit", disabled: submitState.loading }, submitState.loading ? "Submitting..." : "Submit incident"),
            submitState.message ? e("p", { style: { color: "var(--green)", margin: 0 } }, submitState.message) : null,
            submitState.error ? e("p", { style: { color: "var(--red)", margin: 0 } }, submitState.error) : null,
<<<<<<< HEAD
            e("div", { className: "section-divider" }),
            e("h3", null, "Reported incidents"),
            incidents.length
              ? e(
                  "div",
                  { className: "list" },
                  incidents.map((incident) =>
                    e(
                      "article",
                      { className: "list-item", key: incident.id },
                      e("div", { className: `status-pill ${severityClass(incident.severity)}` }, incident.severity),
                      e("h4", { style: { marginTop: "12px", marginBottom: "8px" } }, incident.title),
                      e("p", null, incident.description),
                      e("p", { className: "muted", style: { marginTop: "10px", marginBottom: "12px" } }, `${incident.location} | ${formatDate(incident.reportedAt)}`),
                      e(
                        "button",
                        {
                          type: "button",
                          className: "link-button small",
                          style: { color: "var(--red)", border: "1px solid rgba(255, 100, 100, 0.2)", padding: "4px 10px" },
                          onClick: () => {
                            if (!confirm("Permanently remove this rectified incident from the live board?")) return;
                            fetch("/api/incidents/delete", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ id: incident.id })
                            }).then(() => window.location.reload());
                          }
                        },
                        "Mark as rectified / Delete"
                      )
                    )
                  )
                )
              : e("div", { className: "list-item" }, e("p", null, "No incident reports have been submitted for this session yet."))
=======
            removeState.message ? e("p", { style: { color: "var(--green)", margin: 0 } }, removeState.message) : null,
            removeState.error ? e("p", { style: { color: "var(--red)", margin: 0 } }, removeState.error) : null
>>>>>>> cef72ba797417fab0af8d51fb6ea27ef218effe4
          )
        ),
        e(
          "div",
<<<<<<< HEAD
          { className: "panel reveal response-right-panel" },
          e(
            "div",
            { className: "section-heading" },
            e("div", null, e("h2", null, "Relief locations"), e("p", null, "These are live mapped response points based on your searched place or precise device location."))
          ),
          relief.loading && !reliefData
            ? e("div", { className: "empty-state" }, e("p", null, "Loading relief locations for the matched place..."))
            : shelters.length
            ? e(
                "div",
                { className: "shelter-list" },
                shelters.map((shelter) =>
                  e(
                    "article",
                    {
                      key: shelter.id,
                      className: "shelter-card"
                    },
                    e(
                      "div",
                      null,
                      e("h4", null, shelter.name),
                      e("p", null, shelter.address),
                      e(
                        "p",
                        { className: "muted" },
                        reliefScope === "Precise location"
                          ? `${shelter.type} | ${shelter.distanceLabel} away`
                          : shelter.type
                      )
                    ),
                    e(
                      "div",
                      { className: "shelter-actions" },
                      e("span", { className: `status-pill ${severityClass(shelter.status)}` }, shelter.status),
                      e(
                        "a",
                        {
                          href: buildMapUrl(shelter.latitude, shelter.longitude),
                          target: "_blank",
                          rel: "noreferrer",
                          className: "link-button ghost small"
                        },
                        "Open map"
                      )
                    )
                  )
                )
              )
            : e(
                "div",
                { className: "empty-state" },
                e("p", null, "No nearby mapped relief locations were returned for this place right now."),
                e("p", { className: "muted" }, reliefStatus || "Try a more specific locality or use precise location for better results.")
              )
        )
      )
=======
          { className: "panel reveal" },
          e("h3", null, "Response checklist"),
          e(
            "ul",
            { className: "list" },
            data.checklist.map((item) => e("li", { className: "list-item", key: item }, e("p", null, item)))
          )
        )
      )
    ),
    e(
      "section",
      { className: "section" },
      e("div", { className: "section-heading" }, e("div", null, e("h2", null, "Incident board"), e("p", null, "Live weather signals, official alerts, and your submitted reports."))),
      incidents.length
        ? e(
            "div",
            { className: "grid two" },
            incidents.map((incident) =>
              e(
                "article",
                { className: "card reveal", key: incident.id },
                e("div", { className: `status-pill ${severityClass(incident.severity)}` }, incident.severity),
                e("h3", null, incident.title),
                e("p", null, incident.description),
                e("p", { className: "muted", style: { marginTop: "10px" } }, `${incident.location} | ${incident.status}`),
                e(
                  "div",
                  { className: "action-row compact" },
                  e("p", { className: "muted" }, `${formatDate(incident.reportedAt)} | ${incident.source}`),
                  e(
                    "div",
                    { className: "incident-actions" },
                    e("a", { href: buildQueryMapUrl(incident.location), target: "_blank", rel: "noreferrer", className: "link-button ghost small" }, "Open map"),
                    incident.source === "User report"
                      ? e(
                          "button",
                          {
                            type: "button",
                            className: "danger-button small",
                            onClick: () => onRemoveIncident(incident),
                            disabled: removeState.loadingId === incident.id
                          },
                          removeState.loadingId === incident.id ? "Removing..." : "Remove"
                        )
                      : null
                  )
                )
              )
            )
          )
        : e("div", { className: "empty-state" }, "No live incidents are available right now.")
>>>>>>> cef72ba797417fab0af8d51fb6ea27ef218effe4
    )
  );
}

<<<<<<< HEAD

=======
>>>>>>> cef72ba797417fab0af8d51fb6ea27ef218effe4
function AppRouter() {
  const page = document.body.dataset.page;
  const [selectedCity, setSelectedCity] = useCitySelection();
  const precise = usePreciseLocation();
  const sharedProps = {
    selectedCity,
    onSelectCity: setSelectedCity,
    preciseLocation: precise.location,
    locationStatus: precise.status,
    onRequestPreciseLocation: precise.requestPreciseLocation,
    onClearPreciseLocation: precise.clearPreciseLocation
  };

  if (page === "dashboard") {
    return e(DashboardPage, sharedProps);
  }
  if (page === "heat") {
    return e(RiskPage, { ...sharedProps, type: "heat" });
  }
  if (page === "flood") {
    return e(RiskPage, { ...sharedProps, type: "flood" });
  }
  if (page === "response") {
    return e(ResponsePage, sharedProps);
  }
  return e(HomePage, sharedProps);
}

ReactDOM.createRoot(document.getElementById("root")).render(e(AppRouter));
