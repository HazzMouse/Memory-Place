// Redirect to login if not authenticated
const token = localStorage.getItem("token");

if (!token || token === "undefined" || token === "null") {
  window.location.href = "login.html";
}

// ─────────────────────────────────────────────────────────────────────────────
// MAP LOGIC
// ─────────────────────────────────────────────────────────────────────────────

let map;
let tempLatLng = null;
let memories = [];
let editingMemoryId = null;
const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:3000' : window.location.origin;

const memoryIcon = L.icon({
  iconUrl: 'marker.png',
  iconSize: [44, 66],
  iconAnchor: [22, 66],
  popupAnchor: [0, -66]
});

window.onload = () => {
  const bounds = [[-85, -180], [85, 180]];
  map = L.map('map', {
    maxBounds: bounds,
    maxBoundsViscosity: 0.8,
    worldCopyJump: false,
    minZoom: 1,
    maxZoom: 20
  }).setView([-33.8688, 151.2093], 13);
  map.zoomControl.setPosition('topright');

  L.tileLayer('https://api.maptiler.com/maps/openstreetmap/256/{z}/{x}/{y}.png?key=ZYnLuAnXONks3zYPMqCb', {
      tileSize: 256,
      minZoom: 1,
      maxZoom: 20,
      attribution: '<a href="https://www.maptiler.com/copyright/" target="_blank">© MapTiler</a> <a href="https://www.openstreetmap.org/copyright" target="_blank">© OpenStreetMap contributors</a>',
      crossOrigin: true,
      noWrap: true
  }).addTo(map);
  map.options.minZoom = 2;
  map.options.maxZoom = 18;
  map.options.worldCopyJump = false;

  // Rip I was trying to make the default a cursor instead of a hand
  // map.getCanvas().style.cursor = 'default';

  // map.on('mousedown', () => {
  //     map.getCanvas().style.cursor = 'grabbing';
  // });
  
  // map.on('mouseup', () => {
  //     map.getCanvas().style.cursor = 'default';
  // });
  
  // map.on('dragend', () => {
  //     map.getCanvas().style.cursor = 'default';
  // });

  map.on('click', (e) => {
    tempLatLng = e.latlng;
    showForm();
  });

  document.getElementById("sidebarToggle").onclick = () => {
    const sidebar = document.getElementById("sidebar");
    const mapDiv = document.getElementById("map");

    sidebar.classList.toggle("closed");
    mapDiv.classList.toggle("shifted");

    // Force Leaflet to recalc map size
    setTimeout(() => {
      map.invalidateSize();
    }, 350);
  };

  document.getElementById('saveMemoryBtn').onclick = saveMemory;
  document.getElementById('cancelMemoryBtn').onclick = hideForm;
  document.getElementById("deleteAllBtn").onclick = deleteAllMemories;
  
  document.getElementById("logoutBtn").onclick = () => {
    localStorage.removeItem("token");
    window.location.href = "login.html";
  };

  loadMemories();
};

// SIDEBAR
function renderSidebar() {
  const list = document.getElementById("memoryList");
  list.innerHTML = "";

  [...memories].reverse().forEach(memory => {
    const item = document.createElement("div");
    item.className = "memory-item";
    item.onclick = () => focusMemory(memory);

    item.innerHTML = `
      <div class="memory-item-title">${memory.title}</div>
      <div class="memory-item-time">${new Date(memory.time).toLocaleString()}</div>
    `;

    list.appendChild(item);
  });
}

function focusMemory(memory) {
  map.setView([memory.location.lat, memory.location.lng], 16);

  // Find the marker and open its popup
  map.eachLayer(layer => {
    if (layer instanceof L.Marker) {
      const pos = layer.getLatLng();
      if (pos.lat === memory.location.lat && pos.lng === memory.location.lng) {
        layer.openPopup();
      }
    }
  });
}


// ─────────────────────────────────────────────────────────────────────────────
// FORM HANDLING
// ─────────────────────────────────────────────────────────────────────────────

function showForm(isEditing = false) {
  document.getElementById('memoryForm').classList.remove('hidden');
  document.getElementById('formTitle').textContent = isEditing ? 'Edit Memory' : 'Add Memory';
  if (!isEditing) editingMemoryId = null;
  document.getElementById("removeImageCheckbox").checked = false;
}

function hideForm() {
  document.getElementById('memoryForm').classList.add('hidden');
  document.getElementById('memoryTitle').value = '';
  document.getElementById('memoryDescription').value = '';
  document.getElementById('memoryImage').value = '';
  document.getElementById("removeImageCheckbox").checked = false;
  document.getElementById("removeImageWrap").style.display = "none";
  document.getElementById("imageUploadWrap").classList.remove('drag-over');
  // Reset image preview
  const preview = document.getElementById('imagePreview');
  const placeholder = document.getElementById('imagePlaceholder');
  if (preview) { preview.src = ''; preview.classList.add('hidden'); }
  if (placeholder) placeholder.style.display = 'flex';
}

// Wire up image upload — drag-and-drop + click-to-browse
document.addEventListener('DOMContentLoaded', () => {
  const imgInput = document.getElementById('memoryImage');
  const wrap     = document.getElementById('imageUploadWrap');

  if (!imgInput || !wrap) return;

  // File chosen via the native picker
  imgInput.addEventListener('change', () => {
    const file = imgInput.files[0];
    setImagePreview(file ? URL.createObjectURL(file) : null);
  });

  // Drag enter/over — add visual class
  wrap.addEventListener('dragenter', e => {
    e.preventDefault();
    wrap.classList.add('drag-over');
  });
  wrap.addEventListener('dragover', e => {
    e.preventDefault();
    wrap.classList.add('drag-over');
  });

  // Drag leave — only remove class when leaving the wrap itself
  wrap.addEventListener('dragleave', e => {
    if (!wrap.contains(e.relatedTarget)) {
      wrap.classList.remove('drag-over');
    }
  });

  // Drop — hand the file to the input and preview it
  wrap.addEventListener('drop', e => {
    e.preventDefault();
    wrap.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (!file || !file.type.startsWith('image/')) return;
    // Assign to the real input so FormData picks it up on save
    const dt = new DataTransfer();
    dt.items.add(file);
    imgInput.files = dt.files;
    setImagePreview(URL.createObjectURL(file));
  });
});

function setImagePreview(src) {
  const preview = document.getElementById('imagePreview');
  const placeholder = document.getElementById('imagePlaceholder');
  if (!preview || !placeholder) return;
  if (src) {
    preview.src = src;
    preview.classList.remove('hidden');
    placeholder.style.display = 'none';
  } else {
    preview.src = '';
    preview.classList.add('hidden');
    placeholder.style.display = 'flex';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SAVE / UPDATE MEMORY
// ─────────────────────────────────────────────────────────────────────────────

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

  if (document.getElementById("removeImageCheckbox").checked) {
      formData.append("removeImage", "true");
  }

  let url = `${API_BASE}/api/memories`;
  let method = "POST";

  if (editingMemoryId) {
    url = `${API_BASE}/api/memories/${editingMemoryId}`;
    method = "PUT";
  }

  await fetch(url, {
    method,
    headers: {
      "Authorization": "Bearer " + localStorage.getItem("token")
    },
    body: formData
  });

  hideForm();
  refreshMarkers();
}

// ─────────────────────────────────────────────────────────────────────────────
// MARKERS + POPUPS
// ─────────────────────────────────────────────────────────────────────────────

function addMarker(memory) {
  const marker = L.marker([memory.location.lat, memory.location.lng], { icon: memoryIcon }).addTo(map);

  // Store marker on the memory object so we can update the popup later
  memory._marker = marker;

  bindPopup(marker, memory);
}

function buildPopupHtml(memory) {
  const cachedBadge = memory.sceneData
    ? `<span class="popup-cached-badge">✦ scene ready</span>`
    : '';

  return `
    <div class="popup-inner">
      <div class="popup-title">${memory.title}</div>

      ${memory.image ? `
        <img src="${API_BASE}${memory.image}"
             style="width:100%;border-radius:8px;margin:6px 0 8px;object-fit:cover;max-height:120px;">
      ` : ""}

      <div class="popup-content">${memory.content}</div>
      <span class="popup-time">${new Date(memory.time).toLocaleString()}</span>

      <div class="popup-actions">
        <button class="popup-btn popup-btn--dream" onclick="enterMemory('${memory.id}')">
          ✦ Enter Memory ${cachedBadge}
        </button>
        <button class="popup-btn popup-btn--edit" onclick="startEdit('${memory.id}')">Edit</button>
        <button class="popup-btn popup-btn--delete" onclick="deleteMemory('${memory.id}')">Delete</button>
      </div>
    </div>
  `;
}

function bindPopup(marker, memory) {
  marker.bindPopup(buildPopupHtml(memory));
}

// ─────────────────────────────────────────────────────────────────────────────
// LOAD / EDIT / DELETE
// ─────────────────────────────────────────────────────────────────────────────

async function deleteAllMemories() {
  const confirmed = confirm("Are you sure you want to delete ALL memories? This cannot be undone.");

  if (!confirmed) return;

  await fetch(`${API_BASE}/api/memories`, {
    method: "DELETE",
    headers: {
      "Authorization": "Bearer " + localStorage.getItem("token")
    }
  });

  refreshMarkers();
}

async function loadMemories() {
  const res = await fetch(`${API_BASE}/api/memories`, {
    headers: {
      "Authorization": "Bearer " + localStorage.getItem("token")
    }
  });
  memories = await res.json();

  memories.forEach(memory => addMarker(memory));
  renderSidebar();
}

function startEdit(id) {
  const memory = memories.find(m => m.id === id);
  if (!memory) return;

  document.getElementById("memoryImage").value = "";
  document.getElementById('memoryTitle').value = memory.title;
  document.getElementById('memoryDescription').value = memory.content;
  tempLatLng = memory.location;
  editingMemoryId = id;

  if (memory.image) {
    setImagePreview(`${API_BASE}${memory.image}`);
    document.getElementById("removeImageCheckbox").checked = false;
    document.getElementById("removeImageWrap").style.display = "flex";
  } else {
    setImagePreview(null);
    document.getElementById("removeImageCheckbox").checked = false;
    document.getElementById("removeImageWrap").style.display = "none";
  }

  showForm(true);
}

async function deleteMemory(id) {
  await fetch(`${API_BASE}/api/memories/${id}`, {
    method: "DELETE",
    headers: {
      "Authorization": "Bearer " + localStorage.getItem("token")
    }
  });
  refreshMarkers();
}

async function refreshMarkers() {
  map.eachLayer(layer => {
    if (layer instanceof L.Marker) map.removeLayer(layer);
  });
  loadMemories();
}

// ─────────────────────────────────────────────────────────────────────────────
// ENTER MEMORY — triggers dream visualisation (uses cached sceneData if present)
// ─────────────────────────────────────────────────────────────────────────────

async function enterMemory(id) {
  let memory = memories.find(m => m.id === id);
  if (!memory) {
    const res = await fetch(`${API_BASE}/api/memories`, {
      headers: {
        "Authorization": "Bearer " + localStorage.getItem("token")
      }
    });
    const data = await res.json();
    memory = data.find(m => m.id === id);
  }
  if (!memory) return;

  const prompt = [memory.title, memory.content].filter(Boolean).join('. ');
  const imageUrl = memory.image ? `${API_BASE}${memory.image}` : null;

  // ── Use cached scene only if it has valid primitives ──
  const hasPrimitives = memory.sceneData &&
    memory.sceneData.object &&
    Array.isArray(memory.sceneData.object.primitives) &&
    memory.sceneData.object.primitives.length > 0;

  if (hasPrimitives) {
    launchDreamVisualiser(null, memory.title, prompt, memory.sceneData, imageUrl);
    return;
  }

  // ── Stale/empty cache or no cache — clear it and regenerate ──
  if (memory.sceneData && !hasPrimitives) {
    // Wipe the bad cached entry so it saves fresh after generation
    try {
      await fetch(`${API_BASE}/api/memories/${memory.id}/scene`, {
        method: 'PATCH',
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + localStorage.getItem("token")
        },
        body: JSON.stringify({ sceneData: null })
      });

      const idx = memories.findIndex(m => m.id === memory.id);
      if (idx !== -1) memories[idx].sceneData = null;
    } catch (e) {
      console.warn('Could not clear stale scene cache:', e);
    }
  }

  // ── Otherwise generate and cache ──
  launchDreamVisualiser(prompt, memory.title, prompt, null, imageUrl, async (sd) => {
    try {
      await fetch(`${API_BASE}/api/memories/${memory.id}/scene`, {
        method: 'PATCH',
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + localStorage.getItem("token")
        },
        body: JSON.stringify({ sceneData: sd })
      });

      // Update local cache
      const idx = memories.findIndex(m => m.id === memory.id);
      if (idx !== -1) {
        memories[idx].sceneData = sd;
        // Rebind the marker popup in-place so "scene ready" appears without a refresh
        if (memories[idx]._marker) {
          bindPopup(memories[idx]._marker, memories[idx]);
        }
      }
    } catch (e) {
      console.warn('Could not cache scene:', e);
    }
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// DREAM VISUALISER
// ─────────────────────────────────────────────────────────────────────────────

let cleanupFn = null;

// prompt      — Gemini prompt string (null if using cached sd)
// memoryTitle — display title
// displayPrompt — quoted text shown in the overlay
// cachedSd    — pre-built scene data (skip API call if truthy)
// imageUrl    — optional background image URL
// onGenerated — callback(sd) called after fresh generation so caller can cache
function launchDreamVisualiser(prompt, memoryTitle, displayPrompt, cachedSd, imageUrl, onGenerated) {
  const overlay = document.getElementById('dream-overlay');
  const canvas  = document.getElementById('dream-canvas');
  const loadingOvl = document.getElementById('dream-loading');
  const sceneTitle = document.getElementById('dream-title');
  const scenePrompt = document.getElementById('dream-prompt');
  const tagList = document.getElementById('dream-tags');

  overlay.style.display = 'block';

  // ── Clear stale content from any previous memory immediately ──
  sceneTitle.textContent  = '';
  scenePrompt.textContent = '';
  tagList.innerHTML       = '';

  const applyScene = (sd) => {
    sd.skyTop      = sd.skyTop      || '#1a0a2e';
    sd.skyBottom   = sd.skyBottom   || '#3d1a5c';
    sd.fogColor    = sd.fogColor    || '#2a1040';
    sd.lightColor  = sd.lightColor  || '#f5c880';
    sd.accentColor = sd.accentColor || '#c084fc';
    sd.groundColor = sd.groundColor || '#2d3a1a';
    sd.ambientIntensity = sd.ambientIntensity || 0.5;
    sd.particleDensity  = sd.particleDensity  || 700;
    sd.dreamIntensity   = sd.dreamIntensity   || 0.7;
    sd.title            = sd.title            || memoryTitle || 'a memory';
    // Ensure object exists with at least an empty primitives array
    if (!sd.object || !Array.isArray(sd.object.primitives)) {
      sd.object = { label: 'memory', primitives: [] };
    }

    sceneTitle.textContent  = sd.title;
    scenePrompt.textContent = displayPrompt ? `"${displayPrompt}"` : '';
    // Show the object label as the single tag
    const label = sd.object && sd.object.label ? sd.object.label : '';
    tagList.innerHTML = label
      ? `<span class="dream-tag">${label}</span>`
      : '';

    loadingOvl.style.display = 'none';

    requestAnimationFrame(() => {
      if (cleanupFn) { cleanupFn(); cleanupFn = null; }
      cleanupFn = buildScene(canvas, sd, imageUrl);
    });
  };

  if (cachedSd) {
    loadingOvl.style.display = 'none';
    applyScene(cachedSd);
    return;
  }

  loadingOvl.style.display = 'flex';

  parseMemory(prompt).then(sd => {
    applyScene(sd);
    if (onGenerated) onGenerated(sd);
  }).catch(err => {
    console.error(err);
    loadingOvl.style.display = 'none';
    alert('Could not visualise this memory: ' + err.message);
    closeDreamVisualiser();
  });
}

function closeDreamVisualiser() {
  if (cleanupFn) { cleanupFn(); cleanupFn = null; }
  document.getElementById('dream-overlay').style.display = 'none';
}

// ─────────────────────────────────────────────────────────────────────────────
// CLAUDE API
// ─────────────────────────────────────────────────────────────────────────────

async function parseMemory(prompt) {
  const res = await fetch(`${API_BASE}/api/parse-memory`, {
    method: 'POST',
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + localStorage.getItem("token")
    },
    body: JSON.stringify({ prompt })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Server error ${res.status}`);
  }
  return res.json();
}


// ─────────────────────────────────────────────────────────────────────────────
// ORBIT CONTROLS
// ─────────────────────────────────────────────────────────────────────────────

function makeOrbitControls(camera, el) {
  const s = { th: 0.3, ph: Math.PI / 3.2, r: 22 };
  const t = { th: 0.3, ph: Math.PI / 3.2, r: 22 };
  const target = new THREE.Vector3(0, 2, 0);
  let drag = false, right = false, lx = 0, ly = 0;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp  = (a, b, t2) => a + (b - a) * t2;

  const onDown = e => { drag = true; right = e.button === 2; lx = e.clientX; ly = e.clientY; };
  const onUp   = () => { drag = false; };
  const onMove = e => {
    if (!drag) return;
    const dx = e.clientX - lx, dy = e.clientY - ly; lx = e.clientX; ly = e.clientY;
    if (!right) { t.th -= dx * 0.007; t.ph = clamp(t.ph + dy * 0.005, 0.08, Math.PI * 0.47); }
    else {
      const fwd = new THREE.Vector3(); camera.getWorldDirection(fwd);
      const r2 = new THREE.Vector3().crossVectors(fwd, new THREE.Vector3(0, 1, 0)).normalize();
      target.addScaledVector(r2, -dx * 0.02); target.y += dy * 0.02;
    }
  };
  el.addEventListener('mousedown', onDown);
  window.addEventListener('mouseup', onUp);
  window.addEventListener('mousemove', onMove);
  el.addEventListener('wheel', e => { t.r = clamp(t.r + e.deltaY * 0.02, 4, 55); e.preventDefault(); }, { passive: false });
  el.addEventListener('contextmenu', e => e.preventDefault());

  let t0x = 0, t0y = 0, tDist = 0, tDrag = false;
  el.addEventListener('touchstart', e => {
    if (e.touches.length === 1) { tDrag = true; t0x = e.touches[0].clientX; t0y = e.touches[0].clientY; }
    else if (e.touches.length === 2) { const d = e.touches; tDist = Math.hypot(d[0].clientX - d[1].clientX, d[0].clientY - d[1].clientY); }
    e.preventDefault();
  }, { passive: false });
  el.addEventListener('touchmove', e => {
    if (e.touches.length === 1 && tDrag) {
      const dx = e.touches[0].clientX - t0x, dy = e.touches[0].clientY - t0y;
      t0x = e.touches[0].clientX; t0y = e.touches[0].clientY;
      t.th -= dx * 0.009; t.ph = clamp(t.ph + dy * 0.007, 0.08, Math.PI * 0.47);
    } else if (e.touches.length === 2) {
      const d = e.touches; const nd = Math.hypot(d[0].clientX - d[1].clientX, d[0].clientY - d[1].clientY);
      t.r = clamp(t.r - (nd - tDist) * 0.06, 4, 55); tDist = nd;
    }
    e.preventDefault();
  }, { passive: false });
  el.addEventListener('touchend', () => { tDrag = false; });

  return {
    update(time) {
      if (!drag && !tDrag) t.th += 0.0012;
      s.th = lerp(s.th, t.th, 0.07);
      s.ph = lerp(s.ph, t.ph, 0.07);
      s.r  = lerp(s.r,  t.r,  0.07);
      const r2 = s.r + Math.sin(time * 0.25) * 0.2;
      camera.position.set(
        target.x + r2 * Math.sin(s.ph) * Math.sin(s.th),
        target.y + r2 * Math.cos(s.ph),
        target.z + r2 * Math.sin(s.ph) * Math.cos(s.th)
      );
      camera.lookAt(target);
    },
    dispose() {
      el.removeEventListener('mousedown', onDown);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('mousemove', onMove);
    }
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// THREE.JS SCENE BUILDER
// ─────────────────────────────────────────────────────────────────────────────

function buildScene(canvas, sd, imageUrl) {
  const W = canvas.clientWidth, H = canvas.clientHeight;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(W, H, false);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.35;

  const scene  = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(55, W / H, 0.1, 300);
  const controls = makeOrbitControls(camera, canvas);

  const skyTop  = new THREE.Color(sd.skyTop);
  const skyBot  = new THREE.Color(sd.skyBottom);
  const fogC    = new THREE.Color(sd.fogColor);
  const lightC  = new THREE.Color(sd.lightColor);
  const accentC = new THREE.Color(sd.accentColor);
  const groundC = new THREE.Color(sd.groundColor);

  scene.fog = new THREE.FogExp2(fogC, 0.022);

  // Sky dome
  const skyMat = new THREE.ShaderMaterial({
    uniforms: { uTop: { value: skyTop }, uBot: { value: skyBot }, uTime: { value: 0 } },
    vertexShader: `varying vec3 vP; void main(){ vP=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `
      uniform vec3 uTop,uBot; uniform float uTime; varying vec3 vP;
      float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
      void main(){
        float t=pow(clamp((vP.y+40.)/160.,0.,1.),.55);
        vec3 col=mix(uBot,uTop,t);
        float cx=vP.x*.004+uTime*.002,cy=vP.z*.004+uTime*.001;
        float cl=n(vec2(cx,cy))*.6+n(vec2(cx*2.3+.5,cy*2.1))*.3+n(vec2(cx*5.,cy*4.5))*.1;
        col+=smoothstep(.52,.62,cl)*.07*t*(uBot*.5+vec3(.08,.06,.06));
        gl_FragColor=vec4(col,1.);
      }`,
    side: THREE.BackSide, depthWrite: false
  });
  scene.add(new THREE.Mesh(new THREE.SphereGeometry(180, 32, 20), skyMat));

  // Terrain
  const res = 80;
  const tGeo = new THREE.PlaneGeometry(120, 120, res, res);
  const tv = tGeo.attributes.position;
  for (let i = 0; i < tv.count; i++) {
    const x = tv.getX(i), z = tv.getZ(i);
    tv.setY(i,
      Math.sin(x * .07) * Math.cos(z * .065) * 1.4 +
      Math.sin(x * .18 + 1.1) * Math.cos(z * .15 + .7) * .55 +
      Math.sin(x * .38 + z * .28) * .22 +
      Math.cos(x * .6 - z * .5) * .1
    );
  }
  tGeo.computeVertexNormals();
  const terrainMesh = new THREE.Mesh(tGeo, new THREE.MeshStandardMaterial({ color: groundC, roughness: .88, metalness: 0 }));
  terrainMesh.rotation.x = -Math.PI / 2;
  terrainMesh.receiveShadow = true;
  scene.add(terrainMesh);

  const sheen = new THREE.Mesh(new THREE.PlaneGeometry(120, 120),
    new THREE.MeshStandardMaterial({ color: skyBot.clone().lerp(accentC, .12), roughness: .02, metalness: .82, transparent: true, opacity: .1 }));
  sheen.rotation.x = -Math.PI / 2; sheen.position.y = .01; scene.add(sheen);

  // ── Background image billboard (if the memory has a photo) ──
  if (imageUrl) {
    const texLoader = new THREE.TextureLoader();
    texLoader.load(imageUrl, tex => {
      const aspect = tex.image ? tex.image.width / tex.image.height : 16 / 9;
      const bh = 38, bw = bh * aspect;
      const bgMat = new THREE.MeshBasicMaterial({
        map: tex,
        transparent: true,
        opacity: 0.28,
        depthWrite: false,
        side: THREE.FrontSide,
      });
      const bgMesh = new THREE.Mesh(new THREE.PlaneGeometry(bw, bh), bgMat);
      // Position it far back, centred, slightly raised
      bgMesh.position.set(0, bh * 0.48, -55);
      scene.add(bgMesh);
    });
  }

  // Lighting
  scene.add(new THREE.AmbientLight(skyBot, sd.ambientIntensity * .65));
  scene.add(new THREE.HemisphereLight(skyTop, groundC, .4));
  const sun = new THREE.DirectionalLight(lightC, 2.2);
  sun.position.set(10, 20, 8); sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.near = .5; sun.shadow.camera.far = 100;
  sun.shadow.camera.left = -30; sun.shadow.camera.right = 30;
  sun.shadow.camera.top = 30; sun.shadow.camera.bottom = -30;
  sun.shadow.bias = -.0008;
  scene.add(sun);
  const fillLight = new THREE.DirectionalLight(skyTop, .5);
  fillLight.position.set(-12, 6, -15);
  scene.add(fillLight);

  // Fog planes
  for (let i = 0; i < 7; i++) {
    const fp = new THREE.Mesh(
      new THREE.PlaneGeometry(50 + Math.random() * 30, 12 + Math.random() * 8),
      new THREE.MeshBasicMaterial({ color: fogC.clone().lerp(skyBot, .3), transparent: true, opacity: .028 + Math.random() * .038, depthWrite: false, side: THREE.DoubleSide })
    );
    fp.position.set((Math.random() - .5) * 40, .5 + i * 1.2, -5 - i * 4);
    fp.rotation.y = Math.random() * Math.PI;
    fp.userData = { fog: true, drift: .0008 + Math.random() * .0015, phase: Math.random() * Math.PI * 2 };
    scene.add(fp);
  }

  // Particles
  const pN = Math.floor(sd.particleDensity);
  const pPos = new Float32Array(pN * 3), pPh = new Float32Array(pN);
  for (let i = 0; i < pN; i++) {
    const a = Math.random() * Math.PI * 2, r = 4 + Math.random() * 28;
    pPos[i * 3] = Math.cos(a) * r; pPos[i * 3 + 1] = Math.random() * 15; pPos[i * 3 + 2] = Math.sin(a) * r;
    pPh[i] = Math.random() * Math.PI * 2;
  }
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
  pGeo.setAttribute('phase', new THREE.BufferAttribute(pPh, 1));
  const pMat = new THREE.ShaderMaterial({
    uniforms: {
      uTime:  { value: 0 },
      uCol:   { value: sd.particleColor ? new THREE.Color(sd.particleColor) : accentC },
      uCol2:  { value: lightC }
    },
    vertexShader: `attribute float phase; uniform float uTime; varying float vB;
      void main(){ vB=.35+sin(uTime*1.2+phase)*.5+.5*.65; vec4 mv=modelViewMatrix*vec4(position,1.); gl_PointSize=(1.8+vB*3.5)*(160./-mv.z); gl_Position=projectionMatrix*mv; }`,
    fragmentShader: `uniform vec3 uCol,uCol2; varying float vB;
      void main(){ vec2 uv=gl_PointCoord-.5; float d=length(uv); if(d>.5)discard;
        float c=pow(1.-smoothstep(0.,.5,d),2.2); gl_FragColor=vec4(mix(uCol,uCol2,vB),c*vB*.9); }`,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false
  });
  scene.add(new THREE.Points(pGeo, pMat));

  // ── Material helpers ──────────────────────────────────────────────────────
  const makeMat = (p) => {
    const col = new THREE.Color(p.color || '#ffffff');
    const op  = (p.opacity !== undefined) ? p.opacity : 1.0;
    const isTransparent = op < 0.999;
    if (p.emissive && p.emissive !== 'null' && p.emissive !== null) {
      return new THREE.MeshStandardMaterial({
        color: col,
        emissive: new THREE.Color(p.emissive),
        emissiveIntensity: p.emissiveIntensity ?? 0.6,
        roughness: p.roughness ?? 0.25,
        metalness: 0.08,
        transparent: isTransparent,
        opacity: op,
      });
    }
    return new THREE.MeshStandardMaterial({
      color: col,
      roughness: p.roughness ?? 0.78,
      metalness: 0.04,
      transparent: isTransparent,
      opacity: op,
    });
  };

  // ── Geometry factory ─────────────────────────────────────────────────────
  const makeGeo = (p) => {
    const sx = p.sx ?? 1, sy = p.sy ?? 1, sz = p.sz ?? 1;
    switch (p.shape) {
      case 'box':         return new THREE.BoxGeometry(sx, sy, sz);
      case 'sphere':      return new THREE.SphereGeometry(sx, 14, 10);
      case 'cylinder':    return new THREE.CylinderGeometry(sx, sz, sy, 10);
      case 'cone':        return new THREE.ConeGeometry(sx, sy, 9);
      case 'torus':       return new THREE.TorusGeometry(sx, sy, 8, 24);
      case 'ring':        return new THREE.RingGeometry(sx, sy, 24);
      case 'octahedron':  return new THREE.OctahedronGeometry(sx, 0);
      case 'icosahedron': return new THREE.IcosahedronGeometry(sx, 1);
      default:            return new THREE.SphereGeometry(sx, 10, 8);
    }
  };

  // ── Animation registry ───────────────────────────────────────────────────
  // Each entry: { mesh, anim, baseY, baseScale, phase }
  const animated = [];

  // ── Assemble the central object from primitives ──────────────────────────
  const obj = sd.object;
  if (obj && Array.isArray(obj.primitives)) {
    const group = new THREE.Group();

    obj.primitives.forEach((p, i) => {
      const geo  = makeGeo(p);
      const mat  = makeMat(p);
      const mesh = new THREE.Mesh(geo, mat);

      mesh.position.set(p.x ?? 0, p.y ?? 0, p.z ?? 0);
      mesh.rotation.set(p.rx ?? 0, p.ry ?? 0, p.rz ?? 0);
      mesh.castShadow    = true;
      mesh.receiveShadow = true;

      // Register animations
      const anim = p.animation || 'none';
      if (anim !== 'none') {
        animated.push({
          mesh,
          anim,
          baseY:     p.y ?? 0,
          baseScale: 1,
          phase:     i * 0.37,    // stagger so primitives don't move in lock-step
        });
      }

      group.add(mesh);
    });

    // Centre the whole group at origin, sitting on the ground
    const box = new THREE.Box3().setFromObject(group);
    const centre = new THREE.Vector3();
    box.getCenter(centre);
    group.position.set(-centre.x, -box.min.y, -centre.z);
    scene.add(group);
  }

  // ── Animate loop ─────────────────────────────────────────────────────────
  let raf, tt = 0;
  const dreamI = sd.dreamIntensity ?? 0.7;

  function animate() {
    raf = requestAnimationFrame(animate);
    tt += 0.01;

    skyMat.uniforms.uTime.value = tt;
    pMat.uniforms.uTime.value   = tt;

    // Drift particles upward
    for (let i = 0; i < pN; i++) {
      pPos[i*3+1] += 0.006 + pPh[i] * 0.009;
      pPos[i*3]   += Math.sin(tt * 0.4 + pPh[i]) * 0.006;
      if (pPos[i*3+1] > 20) pPos[i*3+1] = 0;
    }
    pGeo.attributes.position.needsUpdate = true;

    // Drift fog planes
    scene.children.forEach(c => {
      if (c.userData.fog) {
        c.position.x += c.userData.drift;
        if (c.position.x > 50) c.position.x = -50;
        c.material.opacity = 0.02 + Math.abs(Math.sin(tt * 0.25 + c.userData.phase)) * 0.04;
      }
    });

    // Per-primitive animations
    animated.forEach(({ mesh, anim, baseY, phase }) => {
      const t2 = tt + phase;
      switch (anim) {
        case 'float':
          mesh.position.y = baseY + Math.sin(t2 * 0.9) * 0.18 * dreamI;
          break;
        case 'spin_y':
          mesh.rotation.y += 0.008 * dreamI;
          break;
        case 'spin_z':
          mesh.rotation.z += 0.01 * dreamI;
          break;
        case 'pulse': {
          const sc = 1 + Math.sin(t2 * 1.4) * 0.06 * dreamI;
          mesh.scale.setScalar(sc);
          break;
        }
        case 'sway':
          mesh.rotation.z = Math.sin(t2 * 0.7) * 0.08 * dreamI;
          break;
      }
    });

    controls.update(tt);
    renderer.render(scene, camera);
  }
  animate();

  const onResize = () => {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  };
  window.addEventListener('resize', onResize);

  return () => {
    cancelAnimationFrame(raf);
    controls.dispose();
    window.removeEventListener('resize', onResize);
    renderer.dispose();
  };
}