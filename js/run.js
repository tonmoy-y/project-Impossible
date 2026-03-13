let map;
let marker = null;
let polyline = null;
let watchId = null;
let routePoints = [];
let totalDistance = 0;
let startTime = null;
let timerInterval = null;

// UI elements
const startRunBtn = document.getElementById("startRunBtn");
const stopRunBtn = document.getElementById("stopRunBtn");
const runStatus = document.getElementById("runStatus");
const distanceValue = document.getElementById("distanceValue");
const timeValue = document.getElementById("timeValue");
const caloriesValue = document.getElementById("caloriesValue");
const areaValue = document.getElementById("areaValue");
const runMessage = document.getElementById("runMessage");

// page load then start map
document.addEventListener("DOMContentLoaded", function () {
  initializeMap();
});

// map create
function initializeMap() {
  map = L.map("map").setView([23.8103, 90.4125], 13);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors",
  }).addTo(map);

  polyline = L.polyline([], {
    color: "blue",
    weight: 4,
  }).addTo(map);

  setTimeout(function () {
    map.invalidateSize();
  }, 300);
}

// button events
startRunBtn.addEventListener("click", startRun);
stopRunBtn.addEventListener("click", stopRun);

// run start
function startRun() {
  if (!navigator.geolocation) {
    showMessage("Geolocation is not supported by your browser.", "alert-error");
    return;
  }

  // reset old data
  routePoints = [];
  totalDistance = 0;
  startTime = Date.now();

  distanceValue.textContent = "0.00";
  timeValue.textContent = "0s";
  caloriesValue.textContent = "0";
  areaValue.textContent = "0";
  runStatus.textContent = "Running...";

  polyline.setLatLngs([]);

  if (marker) {
    map.removeLayer(marker);
    marker = null;
  }

  startRunBtn.disabled = true;
  stopRunBtn.disabled = false;

  timerInterval = setInterval(updateTimer, 1000);

  watchId = navigator.geolocation.watchPosition(
    updatePosition,
    locationError,
    {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 10000,
    }
  );

  showMessage("Run started. GPS tracking is active.", "alert-success");
}

// live location update
function updatePosition(position) {
  const lat = position.coords.latitude;
  const lng = position.coords.longitude;
  const newPoint = [lat, lng];

  
  if (routePoints.length > 0) {
    const lastPoint = routePoints[routePoints.length - 1];
    totalDistance += calculateDistance(lastPoint[0], lastPoint[1], lat, lng);
    distanceValue.textContent = totalDistance.toFixed(2);
  }

  routePoints.push(newPoint);
  polyline.setLatLngs(routePoints);

  if (!marker) {
    marker = L.marker(newPoint).addTo(map);
  } else {
    marker.setLatLng(newPoint);
  }

  map.setView(newPoint, 16);
}

// stop run
function stopRun() {
  if (watchId !== null) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }

  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }

  runStatus.textContent = "Run finished";
  startRunBtn.disabled = false;
  stopRunBtn.disabled = true;

  const calories = Math.round(totalDistance * 60);
  caloriesValue.textContent = calories;

  showMessage("Run stopped successfully.", "alert-success");

  console.log("Route points:", routePoints);

  // then backend call --here add ittt
  // fetch("/api/run/finish", {...})
}

// location error
function locationError(error) {
  showMessage("Location error: " + error.message, "alert-error");
}

// timer update
function updateTimer() {
  if (!startTime) return;

  const seconds = Math.floor((Date.now() - startTime) / 1000);
  timeValue.textContent = formatTime(seconds);
}

function formatTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  if (h > 0) {
    return `${h}h ${m}m ${s}s`;
  } else if (m > 0) {
    return `${m}m ${s}s`;
  } else {
    return `${s}s`;
  }
}

// km distance
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // in km
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRadians(value) {
  return (value * Math.PI) / 180;
}

// message show
function showMessage(text, type) {
  runMessage.classList.remove("hidden");
  runMessage.className = "alert " + type;
  runMessage.textContent = text;
}