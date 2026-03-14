let map;
let tempLatLng = null; // store clicked location
let memories = [];     // store memory objects
let editingMemoryId = null; // allow memory editing

const memoryIcon = L.icon({
  iconUrl: 'marker.png',   // put your custom icon in /frontend
  iconSize: [44, 66],
  iconAnchor: [44, 66],
  popupAnchor: [0, -28]
});

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
function showForm(isEditing = false) {
  const form = document.getElementById("memoryForm");
  form.classList.remove("hidden");
  setTimeout(() => form.classList.add("show"), 10);

  if (!isEditing) editingMemoryId = null;
}


// Hide the form
function hideForm() {
  const form = document.getElementById("memoryForm");
  form.classList.remove("show");
  setTimeout(() => form.classList.add("hidden"), 200);

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
    location: tempLatLng,
    time: new Date().toISOString()
  };

  let res;

  if (editingMemoryId) {
    // EDIT
    res = await fetch(`http://localhost:3000/api/memories/${editingMemoryId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(memory)
    });
  } else {
    // CREATE
    res = await fetch("http://localhost:3000/api/memories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(memory)
    });
  }

  const savedMemory = await res.json();

  hideForm();
  refreshMarkers();
}

// Add a pin to the map
function addMarker(memory) {
  const marker = L.marker([memory.location.lat, memory.location.lng], { icon: memoryIcon }).addTo(map);

  // // Add bounce animation here
  // const markerEl = marker._icon;
  // markerEl.classList.add("bounce");

  marker.bindPopup(`
    <b>${memory.title}</b><br>
    ${memory.content}<br><br>
    <small>${new Date(memory.time).toLocaleString()}</small>
    <br><br>
    <button onclick="startEdit('${memory.id}')">Edit</button>
    <button onclick="deleteMemory('${memory.id}')">Delete</button>
  `);
}



// This loads all saved memories from memories.json and displays them.
async function loadMemories() {
  const res = await fetch("http://localhost:3000/api/memories");
  const memories = await res.json();

  memories.forEach(memory => addMarker(memory));
}

async function startEdit(id) {
  // Load all memories from backend
  const res = await fetch("http://localhost:3000/api/memories");
  const memories = await res.json();

  const memory = memories.find(m => m.id === id);

  // Fill the form with existing data
  document.getElementById("memoryTitle").value = memory.title;
  document.getElementById("memoryDescription").value = memory.content;

  tempLatLng = memory.location; // keep the same location
  editingMemoryId = id;

  showForm(true);
}

async function deleteMemory(id) {
  await fetch(`http://localhost:3000/api/memories/${id}`, {
    method: "DELETE"
  });

  refreshMarkers();
}

async function refreshMarkers() {
  // Remove all markers from the map
  map.eachLayer(layer => {
    if (layer instanceof L.Marker) {
      map.removeLayer(layer);
    }
  });

  // Reload memories
  loadMemories();
}
