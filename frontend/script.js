let map;

window.onload = () => {
  // Create the map
  map = L.map('map').setView([-33.8688, 151.2093], 13);

  // Add OpenStreetMap tiles (free)
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap'
  }).addTo(map);
};
