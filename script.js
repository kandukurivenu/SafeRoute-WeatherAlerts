const tomtomApiKey = "CuAfPqiqkkpWVwg6U6SroG4bYK7QWBih";
let map;
let startMarker, destinationMarker;

function initMap() {
  map = tt.map({
    key: tomtomApiKey,
    container: "map",
    center: [78.9629, 20.5937],
    zoom: 5,
  });

  map.addControl(new tt.NavigationControl());
}

async function geocodeLocation(location) {
  const url = `https://api.tomtom.com/search/2/geocode/${encodeURIComponent(location)}.json?key=${tomtomApiKey}`;
  const response = await fetch(url);
  const data = await response.json();
  if (!data.results || data.results.length === 0) throw new Error("Location not found.");
  return {
    lat: data.results[0].position.lat,
    lng: data.results[0].position.lon,
  };
}

async function getWeatherData(latitude, longitude) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`;
  const response = await fetch(url);
  if (!response.ok) throw new Error("Weather data not found.");
  return response.json();
}

function displayWeatherAlert(weatherData) {
  const weatherAlert = document.getElementById("weatherAlert");
  const weatherIcon = document.getElementById("weatherIcon");
  const weatherMessage = document.getElementById("weatherMessage");
  const weatherCode = weatherData.current_weather.weathercode;
  const temp = weatherData.current_weather.temperature;

  let alertMessage = "";
  if (weatherCode === 3 || weatherCode === 4) {
    alertMessage = `⚠️ Rain expected! Drive carefully. Temperature: ${temp}°C.`;
    weatherIcon.className = "fas fa-cloud-rain";
    weatherAlert.className = "alert warning";
  } else {
    alertMessage = `✅ Weather is clear. Safe travels! Temperature: ${temp}°C.`;
    weatherIcon.className = "fas fa-sun";
    weatherAlert.className = "alert";
  }

  weatherMessage.textContent = alertMessage;
  weatherAlert.style.display = "flex";
}

function addMarkers(startCoords, destCoords) {
  if (startMarker) startMarker.remove();
  if (destinationMarker) destinationMarker.remove();

  startMarker = new tt.Marker().setLngLat([startCoords.lng, startCoords.lat]).addTo(map);
  destinationMarker = new tt.Marker().setLngLat([destCoords.lng, destCoords.lat]).addTo(map);
}

async function calculateAndDisplayRoute(start, destination) {
  const routeUrl = `https://api.tomtom.com/routing/1/calculateRoute/${start.lat},${start.lng}:${destination.lat},${destination.lng}/json?key=${tomtomApiKey}`;

  const response = await fetch(routeUrl);
  const data = await response.json();

  const routeCoordinates = data.routes[0].legs[0].points.map((point) => [point.longitude, point.latitude]);

  if (map.getLayer("route")) map.removeLayer("route");
  if (map.getSource("route")) map.removeSource("route");

  map.addLayer({
    id: "route",
    type: "line",
    source: {
      type: "geojson",
      data: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: routeCoordinates,
        },
      },
    },
    paint: {
      "line-color": "#FF0000",
      "line-width": 2,
    },
  });

  addMarkers(start, destination);

  const distance = (data.routes[0].summary.lengthInMeters / 1000).toFixed(2);
  const travelTime = (data.routes[0].summary.travelTimeInSeconds / 60).toFixed(2);
  document.getElementById("distance").textContent = `${distance} km`;
  document.getElementById("travelTime").textContent = `${travelTime} mins`;

  const trafficInfo = data.routes[0].summary.trafficDelayInSeconds > 0 ? "Heavy traffic expected" : "No traffic delays";
  document.getElementById("trafficInfo").textContent = trafficInfo;
}

function saveSearchHistory(startName, destinationName) {
  const history = JSON.parse(localStorage.getItem("searchHistory")) || [];
  history.push({ start: startName, destination: destinationName });
  localStorage.setItem("searchHistory", JSON.stringify(history));
  displaySearchHistory();
}

function displaySearchHistory() {
  const history = JSON.parse(localStorage.getItem("searchHistory")) || [];
  const historyList = document.getElementById("historyList");
  historyList.innerHTML = history.map((item, index) => `
    <li onclick="loadSearch(${index})">${item.start} → ${item.destination}</li>
  `).join("");
}

function loadSearch(index) {
  const history = JSON.parse(localStorage.getItem("searchHistory")) || [];
  const search = history[index];
  document.getElementById("start").value = search.start;
  document.getElementById("destination").value = search.destination;
  document.getElementById("routeForm").dispatchEvent(new Event("submit"));
}

function clearRoute() {
  if (map.getLayer("route")) map.removeLayer("route");
  if (map.getSource("route")) map.removeSource("route");
  if (startMarker) startMarker.remove();
  if (destinationMarker) destinationMarker.remove();
  document.getElementById("distance").textContent = "-";
  document.getElementById("travelTime").textContent = "-";
  document.getElementById("trafficInfo").textContent = "-";
  document.getElementById("weatherAlert").style.display = "none";
}

function deleteSearchHistory() {
  localStorage.removeItem("searchHistory");
  displaySearchHistory();
}

document.getElementById("routeForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const startName = document.getElementById("start").value;
  const destinationName = document.getElementById("destination").value;

  document.getElementById("loading").style.display = "block";

  try {
    const startCoords = await geocodeLocation(startName);
    const destCoords = await geocodeLocation(destinationName);

    const weatherData = await getWeatherData(startCoords.lat, startCoords.lng);
    displayWeatherAlert(weatherData);

    await calculateAndDisplayRoute(startCoords, destCoords);

    saveSearchHistory(startName, destinationName);
  } catch (error) {
    console.error("Error:", error);
    const weatherAlert = document.getElementById("weatherAlert");
    weatherAlert.textContent = "Failed to fetch data. Please try again.";
    weatherAlert.style.display = "flex";
    weatherAlert.className = "alert danger";
  } finally {
    document.getElementById("loading").style.display = "none";
  }
});

document.getElementById("clearRoute").addEventListener("click", clearRoute);

document.getElementById("zoomIn").addEventListener("click", () => {
  map.zoomIn();
});

document.getElementById("zoomOut").addEventListener("click", () => {
  map.zoomOut();
});

document.getElementById("darkModeToggle").addEventListener("click", () => {
  document.body.classList.toggle("dark-mode");
});

document.getElementById("deleteHistory").addEventListener("click", deleteSearchHistory);

initMap();
displaySearchHistory();