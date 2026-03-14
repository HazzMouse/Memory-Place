let map;
let tempLatLng = null; // store clicked location
let memories = [];     // store memory objects

window.onload = () => {
  // Create the map
  map = L.map('map').setView([-33.8688, 151.2093], 13);

  // Add OpenStreetMap tiles
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap'
  }).addTo(map);

  // When user clicks on the map
  map.on('click', (e) => {
    tempLatLng = e.latlng; // store clicked location
    showForm();
  });

  // Form buttons
  document.getElementById("saveMemoryBtn").onclick = saveMemory;
  document.getElementById("cancelMemoryBtn").onclick = hideForm;
};

// Show the memory form
function showForm() {
  document.getElementById("memoryForm").classList.remove("hidden");
}

// Hide the form
function hideForm() {
  document.getElementById("memoryForm").classList.add("hidden");
  document.getElementById("memoryTitle").value = "";
  document.getElementById("memoryDescription").value = "";
}

// Save memory + drop pin
function saveMemory() {
  const title = document.getElementById("memoryTitle").value;
  const description = document.getElementById("memoryDescription").value;

  const memory = {
    title,
    description,
    lat: tempLatLng.lat,
    lng: tempLatLng.lng
  };

  memories.push(memory);
  addMarker(memory);

  hideForm();
}

// Add a pin to the map
function addMarker(memory) {
  const marker = L.marker([memory.lat, memory.lng]).addTo(map);

  marker.bindPopup(`
    <b>${memory.title}</b><br>
    ${memory.description}
  `);
}
