const siteConfig = {
  city: "Chennai",
  fallbackLatitude: 13.0827,
  fallbackLongitude: 80.2707,
  timezone: "Asia/Kolkata",
  refreshMinutes: 10
};

const content = {
  hero: {
    title: "Climate Risk Operations Center",
    subtitle:
      "A real-time monitoring space for temperature stress, rainfall pressure, flood readiness, and coordinated public response."
  },
<<<<<<< HEAD
=======
  heatHotspots: [
    "Transit interchanges with long wait times and limited shade",
    "Industrial loading areas and concrete logistics yards",
    "Dense neighborhoods with low air circulation",
    "Open market streets with high daytime footfall"
  ],
  heatActions: [
    "Shift outdoor activity to early morning and late evening windows.",
    "Increase water access points near schools, markets, and labor zones.",
    "Push hydration and rest advisories for elderly residents and field crews.",
    "Check generator backup at cooling centers and clinics."
  ],
  floodHotspots: [
    "Underpasses and low-elevation transport corridors",
    "Canal-adjacent stretches with known drain choke points",
    "River-edge settlements with narrow access roads",
    "Market roads with frequent surface runoff pooling"
  ],
  floodActions: [
    "Pre-position pumps, barricades, and sandbags at mapped choke points.",
    "Issue alternate route guidance before peak rainfall windows.",
    "Move critical supplies above floor level in low-lying facilities.",
    "Prepare shelter check-in, sanitation, and lighting ahead of evening rain."
  ],
  airQualityHotspots: [
    "High-traffic junctions with long idling vehicle queues",
    "Dense commercial corridors with diesel delivery movement",
    "Construction clusters with dust lift during dry afternoon hours",
    "Low-ventilation neighborhoods where haze can linger"
  ],
  airQualityActions: [
    "Reduce prolonged outdoor exposure when AQI moves into the unhealthy range.",
    "Use N95-grade masks for field teams working near traffic, smoke, or dust-heavy areas.",
    "Shift strenuous outdoor work to cleaner time windows when pollutant levels ease.",
    "Keep classrooms, clinics, and community halls ventilated with cleaner indoor air where possible."
  ],
>>>>>>> cef72ba797417fab0af8d51fb6ea27ef218effe4
  response: {
    pageTitle: "Emergency Coordination Hub",
    summary:
      "Access emergency numbers, relief locations, live operational context, and a map-first response workflow from one control page.",
    contacts: [
      {
        label: "Emergency Response",
        value: "112",
        href: "tel:112",
<<<<<<< HEAD
        description: "Unified emergency response number across India"
=======
        description: "Unified emergency response number across India for immediate police, fire, or medical coordination during any urgent threat.",
        helpText: "Use this first when you need fast multi-agency support and you are not sure which department should respond."
>>>>>>> cef72ba797417fab0af8d51fb6ea27ef218effe4
      },
      {
        label: "Ambulance",
        value: "108",
        href: "tel:108",
<<<<<<< HEAD
        description: "24x7 emergency ambulance service"
=======
        description: "24x7 ambulance support for injuries, breathing distress, heat stroke, collapse, and other medical emergencies.",
        helpText: "Call this when someone needs transport to a hospital or urgent medical assistance at the incident location."
>>>>>>> cef72ba797417fab0af8d51fb6ea27ef218effe4
      },
      {
        label: "Fire and Rescue",
        value: "101",
        href: "tel:101",
<<<<<<< HEAD
        description: "Fire and rescue dispatch"
=======
        description: "Fire and rescue dispatch for fires, trapped residents, gas leaks, electrical hazards, and structural danger.",
        helpText: "Use this when the risk involves flames, smoke, rescue access, or situations that need specialized rescue equipment."
>>>>>>> cef72ba797417fab0af8d51fb6ea27ef218effe4
      },
      {
        label: "State Disaster Helpline",
        value: "1070",
        href: "tel:1070",
<<<<<<< HEAD
        description: "State disaster management helpline"
      },
      {
        label: "Police",
        value: "100",
        href: "tel:100",
        description: "Local police emergency services"
      },
      {
        label: "Women Helpline",
        value: "1091",
        href: "tel:1091",
        description: "Dedicated helpline for women in distress"
      },
      {
        label: "Child Helpline",
        value: "1098",
        href: "tel:1098",
        description: "24-hour free emergency phone service for children"
      }
=======
        description: "State disaster management helpline for flood response, evacuation guidance, shelter information, and district-level escalation.",
        helpText: "Call this when you need broader disaster coordination, official relief directions, or help during large-area climate events."
      }
    ],
    checklist: [
      "Verify emergency stocks: water, ORS, lights, blankets, chargers, first aid.",
      "Confirm transport access for elderly residents, children, and hospital referrals.",
      "Refresh district-level volunteer and officer contact lists.",
      "Update shelter occupancy and route status every 30 minutes during activation."
>>>>>>> cef72ba797417fab0af8d51fb6ea27ef218effe4
    ]
  }
};

const userReports = [];
<<<<<<< HEAD
=======
const resolvedReports = [];
>>>>>>> cef72ba797417fab0af8d51fb6ea27ef218effe4

function listUserReports() {
  return [...userReports].sort((a, b) => new Date(b.reportedAt) - new Date(a.reportedAt));
}

function addUserReport(payload) {
  const report = {
    id: Date.now(),
    title: payload.title,
    location: payload.location,
    severity: payload.severity,
    status: "Reported",
    description: payload.description,
    reportedAt: new Date().toISOString(),
    source: "User report"
  };

  userReports.unshift(report);
  return report;
}

<<<<<<< HEAD
function removeUserReport(id) {
  const index = userReports.findIndex((r) => String(r.id) === String(id));
  if (index !== -1) {
    userReports.splice(index, 1);
    return true;
  }
  return false;
=======
function removeUserReport(reportId, review) {
  const id = Number(reportId);
  const index = userReports.findIndex((report) => report.id === id);

  if (index === -1) {
    return null;
  }

  const [report] = userReports.splice(index, 1);
  const resolvedReport = {
    ...report,
    status: "Resolved",
    resolvedAt: new Date().toISOString(),
    resolutionReview: review
  };

  resolvedReports.unshift(resolvedReport);
  return resolvedReport;
>>>>>>> cef72ba797417fab0af8d51fb6ea27ef218effe4
}

module.exports = {
  siteConfig,
  content,
  listUserReports,
  addUserReport,
  removeUserReport
};
