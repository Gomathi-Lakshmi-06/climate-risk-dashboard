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
  response: {
    pageTitle: "Emergency Coordination Hub",
    summary:
      "Access emergency numbers, relief locations, live operational context, and a map-first response workflow from one control page.",
    contacts: [
      {
        label: "Emergency Response",
        value: "112",
        href: "tel:112",
        description: "Unified emergency response number across India"
      },
      {
        label: "Ambulance",
        value: "108",
        href: "tel:108",
        description: "24x7 emergency ambulance service"
      },
      {
        label: "Fire and Rescue",
        value: "101",
        href: "tel:101",
        description: "Fire and rescue dispatch"
      },
      {
        label: "State Disaster Helpline",
        value: "1070",
        href: "tel:1070",
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
    ]
  }
};

const userReports = [];

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

function removeUserReport(id) {
  const index = userReports.findIndex((r) => String(r.id) === String(id));
  if (index !== -1) {
    userReports.splice(index, 1);
    return true;
  }
  return false;
}

module.exports = {
  siteConfig,
  content,
  listUserReports,
  addUserReport,
  removeUserReport
};
