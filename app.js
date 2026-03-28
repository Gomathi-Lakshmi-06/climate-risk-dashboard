const e = React.createElement;
const CITY_STORAGE_KEY = "climate-risk-selected-city";
const PRECISE_LOCATION_KEY = "climate-risk-precise-location";
const API_CACHE_PREFIX = "climate-risk-api-cache:v2:";
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

function buildApiUrl(path, city, preciseLocation, type) {
  const url = new URL(path, window.location.origin);
  if (city) {
    url.searchParams.set("city", city);
  }
  if (preciseLocation?.latitude && preciseLocation?.longitude) {
    url.searchParams.set("lat", preciseLocation.latitude);
    url.searchParams.set("lon", preciseLocation.longitude);
  }
  if (type) {
    url.searchParams.set("type", type);
  }
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
              loading: false,
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
      if (timer) window.clearInterval(timer);
    };
  }, [url]);

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
            const matched = bestMatchedLocation();
            if (matched) {
              selectLocation(matched);
              return;
            }
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
        )
      )
    ),
    props.children
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
    { className: `card reveal ${metric.featured ? "metric-card featured" : "metric-card"}`, key: metric.id || metric.label },
    e("div", { className: "card-label" }, metric.label),
    e("div", { className: "metric-value" }, metric.value),
    e("div", { className: `status-pill ${severityClass(metric.status)}` }, metric.status),
    e("p", { className: "muted" }, metric.detail || metric.note)
  );
}

function MetricGrid(props) {
  const items = props.items || [];
  const columnClass = items.length === 8 ? "grid-4" : items.length === 6 ? "grid-3" : "grid-2";
  
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
    return e(Layout, pageLayoutProps(props, null, "index"), e("div", { className: "loading-state" }, "Loading climate overview..."));
  }

  if (overview.error && !overview.data) {
    return e(Layout, pageLayoutProps(props, null, "index"), e("div", { className: "empty-state" }, overview.error));
  }

  const data = overview.data;
  const homeMetricLabels = new Set(["Air Temperature", "Humidity", "Rain Probability", "Wind Max"]);
  const homeMetrics = (data.metrics || []).filter((item) => homeMetricLabels.has(item.label));

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
          e("div", { className: "hero-risk-grid" },
            e("div", { className: "hero-risk-tile" }, e("span", { className: "muted" }, "Heat"), e("strong", null, data.heatRisk)),
            e("div", { className: "hero-risk-tile" }, e("span", { className: "muted" }, "Flood"), e("strong", null, data.peakFloodRisk || data.floodRisk)),
            e("div", { className: "hero-risk-tile full" }, e("span", { className: "muted" }, "Now"), e("strong", null, data.summary))
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
        e("div", null, e("h2", null, "Live place indicators"), e("p", null, "Current field conditions derived from live location-aware weather feeds."))
      ),
      e(MetricGrid, { items: homeMetrics })
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
  const overview = useFetch(buildApiUrl("/api/overview", props.selectedCity, props.preciseLocation, "dashboard"), 600000);

  if (overview.loading && !overview.data) {
    return e(Layout, pageLayoutProps(props, null, "dashboard"), e("div", { className: "loading-state" }, "Loading live dashboard..."));
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
        title: "Climate posture analysis",
        description: "Track live conditions, scan the next 48 to 72 hours for temperature and rainfall shifts, and review the location currently driving the dashboard data.",
        aside: e(
          "div",
          { className: "hero-aside-card" },
          e("div", { className: "hero-risk-grid" },
            e("div", { className: "hero-risk-tile" }, e("span", { className: "muted" }, "Heat"), e("strong", null, data.heatRisk)),
            e("div", { className: "hero-risk-tile" }, e("span", { className: "muted" }, "Flood"), e("strong", null, data.peakFloodRisk || data.floodRisk)),
            e("div", { className: "hero-risk-tile full" }, e("span", { className: "muted" }, "Now"), e("strong", null, data.summary))
          )
        )
      }
    ),
    e("section", { className: "section" }, e(MetricGrid, { items: data.metrics })),
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
    return e(Layout, pageLayoutProps(props, null, props.type), e("div", { className: "loading-state" }, `Loading ${props.type} risk data...`));
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
          e("div", { className: "hero-risk-grid" },
            e("div", { className: "hero-risk-tile" }, e("span", { className: "muted" }, "Current risk"), e("strong", null, data.riskLevel)),
            e("div", { className: "hero-risk-tile" }, e("span", { className: "muted" }, "3-day outlook"), e("strong", null, data.forecastRisk || data.riskLevel))
          )
        )
      }
    ),
    e("section", { className: "section" }, e(MetricGrid, { items: data.indicators })),
    e(
      "section",
      { className: "section" },
      e(
        "div",
        { className: "grid two" },
        e(
          "div",
          { className: "panel reveal" },
          e("h3", null, props.type === "heat" ? "Live heat observations" : "Live flood observations"),
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
  const relief = useFetch(buildApiUrl("/api/response-relief", props.selectedCity, props.preciseLocation), 600000);
  const [form, setForm] = React.useState({
    title: "",
    location: "",
    severity: "Moderate",
    description: ""
  });
  const [submitState, setSubmitState] = React.useState({ loading: false, message: "", error: "" });
  const [incidents, setIncidents] = React.useState([]);

  React.useEffect(() => {
    if (response.data) {
      setIncidents(response.data.incidents || []);
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

  if (response.loading && !response.data) {
    return e(Layout, pageLayoutProps(props, null, "response"), e("div", { className: "loading-state" }, "Loading response hub..."));
  }

  if (response.error && !response.data) {
    return e(Layout, pageLayoutProps(props, null, "response"), e("div", { className: "empty-state" }, response.error));
  }

  const data = response.data;
  const reliefData = relief.data;
  const shelters = reliefData?.shelters || [];
  const reliefStatus = reliefData?.reliefStatus || "Matching the selected place to live relief-map data...";
  const reliefScope = reliefData?.reliefScope || data.reliefScope || "Citywide coverage";

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
        e("div", { className: "mini-stat" }, e("span", { className: "muted" }, "Relief coverage"), e("strong", null, reliefScope)),
        e("div", { className: "mini-stat" }, e("span", { className: "muted" }, "Nearby relief points"), e("strong", null, relief.loading && !reliefData ? "Loading..." : String(shelters.length))),
        e("div", { className: "mini-stat" }, e("span", { className: "muted" }, "User reports"), e("strong", null, String(incidents.length)))
      ),
      e(
        "div",
        { className: "panel reveal section-note" },
        e("p", null, reliefStatus)
      ),
        e(
          "div",
          { className: "grid two response-balance" },
          e(
            "div",
            { className: "panel reveal response-left-panel" },
            e("h3", null, "Emergency contacts"),
          e(
            "div",
            { className: "contact-list" },
            data.contacts.map((contact) =>
              e(
                "article",
                { className: "contact-card", key: contact.label },
                e("div", null, e("h4", null, contact.label), e("p", null, contact.description)),
                e("a", { href: contact.href, className: "link-button primary contact-button" }, contact.value)
              )
            )
          ),
          e("div", { className: "section-divider" }),
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
          )
        ),
        e(
          "div",
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
    )
  );
}

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
