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
  map.zoomControl.setPosition('topright');


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
  const imageFile = document.getElementById("memoryImage").files[0];

  const formData = new FormData();
  formData.append("title", title);
  formData.append("content", content);
  formData.append("time", new Date().toISOString());
  formData.append("location", JSON.stringify(tempLatLng));

  if (imageFile) {
    formData.append("image", imageFile);
  }

  let url = "http://localhost:3000/api/memories";
  let method = "POST";

  if (editingMemoryId) {
    url = `http://localhost:3000/api/memories/${editingMemoryId}`;
    method = "PUT";
  }

  const res = await fetch(url, {
    method,
    body: formData
  });

  hideForm();
  refreshMarkers();
}


// Add a pin to the map
function addMarker(memory) {
  const marker = L.marker([memory.location.lat, memory.location.lng], { icon: memoryIcon }).addTo(map);

  // // Add bounce animation here
  // const markerEl = marker._icon;
  // markerEl.classList.add("bounce");
  memory.marker = marker;


  marker.bindPopup(`
    <b>${memory.title}</b><br>
    ${memory.content}<br><br>
    ${memory.image ? `<img src="http://localhost:3000${memory.image}" style="width:200px;border-radius:8px;">` : ""}
    <br><small>${new Date(memory.time).toLocaleString()}</small>
    <br><br>
    <button onclick="startEdit('${memory.id}')">Edit</button>
    <button onclick="deleteMemory('${memory.id}')">Delete</button>
  `);
}



// This loads all saved memories from memories.json and displays them.
async function loadMemories() {
  const res = await fetch("http://localhost:3000/api/memories");
  const memories = await res.json();

  const list = document.getElementById("memoryList");
  list.innerHTML = ""; // clear sidebar

  memories.forEach(memory => {
    addMarker(memory);

    // Add to sidebar
    const li = document.createElement("li");
    li.textContent = memory.title;

    li.onclick = () => {
      map.setView([memory.location.lat, memory.location.lng], 16);
      // Open popup after map moves
      setTimeout(() => {
        memory.marker.openPopup();
      }, 300);
    };

    list.appendChild(li);
  });
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
