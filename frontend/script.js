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
  loadMemories();
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
async function saveMemory() {
  const title = document.getElementById("memoryTitle").value;
  const content = document.getElementById("memoryDescription").value;

  const memory = {
    title,
    content,
    location: {
      lat: tempLatLng.lat,
      lng: tempLatLng.lng
    },
    time: new Date().toISOString()
  };

  // Send to backend
  const res = await fetch("http://localhost:3000/api/memories", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(memory)
  });

  const savedMemory = await res.json();

  // Add marker to map
  addMarker(savedMemory);

  hideForm();
}


// Add a pin to the map
function addMarker(memory) {
  const marker = L.marker([memory.location.lat, memory.location.lng]).addTo(map);

  marker.bindPopup(`
    <b>${memory.title}</b><br>
    ${memory.content}<br><br>
    <small>${new Date(memory.time).toLocaleString()}</small>
  `);
}


// This loads all saved memories from memories.json and displays them.
async function loadMemories() {
  const res = await fetch("http://localhost:3000/api/memories");
  const memories = await res.json();

  memories.forEach(memory => addMarker(memory));
}
