// ─────────────────────────────────────────────────────────────────────────────
// MAP LOGIC
// ─────────────────────────────────────────────────────────────────────────────

let map;
let tempLatLng = null;
let memories = [];
let editingMemoryId = null;

const memoryIcon = L.icon({
  iconUrl: 'marker.png',
  iconSize: [44, 66],
  iconAnchor: [22, 66],
  popupAnchor: [0, -66]
});

window.onload = () => {
  map = L.map('map').setView([-33.8688, 151.2093], 13);
  map.zoomControl.setPosition('topright');

  L.tileLayer('https://api.maptiler.com/maps/openstreetmap/256/{z}/{x}/{y}.png?key=ZYnLuAnXONks3zYPMqCb', {
      tileSize: 256,
      minZoom: 1,
      maxZoom: 20,
      attribution: '<a href="https://www.maptiler.com/copyright/" target="_blank">© MapTiler</a> <a href="https://www.openstreetmap.org/copyright" target="_blank">© OpenStreetMap contributors</a>',
      crossOrigin: true,
  }).addTo(map);

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

  document.getElementById('saveMemoryBtn').onclick = saveMemory;
  document.getElementById('cancelMemoryBtn').onclick = hideForm;

  loadMemories();
};

// SIDEBAR
function renderSidebar() {
  const list = document.getElementById("memoryList");
  list.innerHTML = "";

  memories.forEach(memory => {
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
  // Reset image preview
  const preview = document.getElementById('imagePreview');
  const placeholder = document.getElementById('imagePlaceholder');
  if (preview) { preview.src = ''; preview.classList.add('hidden'); }
  if (placeholder) placeholder.style.display = 'flex';
}

// Wire up image preview on file select
document.addEventListener('DOMContentLoaded', () => {
  const imgInput = document.getElementById('memoryImage');
  if (imgInput) {
    imgInput.addEventListener('change', () => {
      const file = imgInput.files[0];
      setImagePreview(file ? URL.createObjectURL(file) : null);
    });
  }
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

  let url = "http://localhost:3000/api/memories";
  let method = "POST";

  if (editingMemoryId) {
    url = `http://localhost:3000/api/memories/${editingMemoryId}`;
    method = "PUT";
  }

  await fetch(url, { method, body: formData });

  hideForm();
  refreshMarkers();
}

// ─────────────────────────────────────────────────────────────────────────────
// MARKERS + POPUPS
// ─────────────────────────────────────────────────────────────────────────────

function addMarker(memory) {
  const marker = L.marker([memory.location.lat, memory.location.lng], { icon: memoryIcon }).addTo(map);

  const cachedBadge = memory.sceneData
    ? `<span class="popup-cached-badge">✦ scene ready</span>`
    : '';

  marker.bindPopup(`
    <div class="popup-inner">
      <div class="popup-title">${memory.title}</div>

      ${memory.image ? `
        <img src="http://localhost:3000${memory.image}"
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
  `);
}

// ─────────────────────────────────────────────────────────────────────────────
// LOAD / EDIT / DELETE
// ─────────────────────────────────────────────────────────────────────────────

async function loadMemories() {
  const res = await fetch('http://localhost:3000/api/memories');
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
    setImagePreview(`http://localhost:3000${memory.image}`);
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
  await fetch(`http://localhost:3000/api/memories/${id}`, { method: 'DELETE' });
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
    const res = await fetch('http://localhost:3000/api/memories');
    const data = await res.json();
    memory = data.find(m => m.id === id);
  }
  if (!memory) return;

  const prompt = [memory.title, memory.content].filter(Boolean).join('. ');
  const imageUrl = memory.image ? `http://localhost:3000${memory.image}` : null;

  // ── Use cached scene if available ──
  if (memory.sceneData) {
    launchDreamVisualiser(null, memory.title, prompt, memory.sceneData, imageUrl);
    return;
  }

  // ── Otherwise generate and cache ──
  launchDreamVisualiser(prompt, memory.title, prompt, null, imageUrl, async (sd) => {
    // Save sceneData back to the server so we never call Gemini again for this memory
    try {
      await fetch(`http://localhost:3000/api/memories/${memory.id}/scene`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sceneData: sd })
      });
      // Update local cache too
      const idx = memories.findIndex(m => m.id === memory.id);
      if (idx !== -1) memories[idx].sceneData = sd;
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

  const applyScene = (sd) => {
    sd.skyTop      = sd.skyTop      || '#1a0a2e';
    sd.skyBottom   = sd.skyBottom   || '#3d1a5c';
    sd.fogColor    = sd.fogColor    || '#2a1040';
    sd.lightColor  = sd.lightColor  || '#f5c880';
    sd.accentColor = sd.accentColor || '#c084fc';
    sd.groundColor = sd.groundColor || '#2d3a1a';
    sd.objects     = Array.isArray(sd.objects) && sd.objects.length
      ? sd.objects
      : [{ type: 'tree', count: 5, scale: 1, glowing: false, floating: false }];
    sd.ambientIntensity = sd.ambientIntensity || 0.5;
    sd.particleDensity  = sd.particleDensity  || 700;
    sd.dreamIntensity   = sd.dreamIntensity   || 0.7;
    sd.title            = sd.title            || memoryTitle || 'a memory';

    sceneTitle.textContent  = sd.title;
    scenePrompt.textContent = displayPrompt ? `"${displayPrompt}"` : '';
    tagList.innerHTML = sd.objects.slice(0, 7)
      .map(o => `<span class="dream-tag">${o.type}</span>`).join('');

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
  const res = await fetch('http://localhost:3000/api/parse-memory', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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
    uniforms: { uTime: { value: 0 }, uCol: { value: accentC }, uCol2: { value: lightC } },
    vertexShader: `attribute float phase; uniform float uTime; varying float vB;
      void main(){ vB=.35+sin(uTime*1.2+phase)*.5+.5*.65; vec4 mv=modelViewMatrix*vec4(position,1.); gl_PointSize=(1.8+vB*3.5)*(160./-mv.z); gl_Position=projectionMatrix*mv; }`,
    fragmentShader: `uniform vec3 uCol,uCol2; varying float vB;
      void main(){ vec2 uv=gl_PointCoord-.5; float d=length(uv); if(d>.5)discard;
        float c=pow(1.-smoothstep(0.,.5,d),2.2); gl_FragColor=vec4(mix(uCol,uCol2,vB),c*vB*.9); }`,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false
  });
  scene.add(new THREE.Points(pGeo, pMat));

  // Material helpers
  const soft = (col, r = .78, op = 1) => new THREE.MeshStandardMaterial({ color: col, roughness: r, metalness: .04, transparent: op < 1, opacity: op });
  const glow = (col, i = .55, op = 1) => new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: i, roughness: .25, metalness: .08, transparent: op < 1, opacity: op });

  const floaters = [];
  const place = (g, x, z) => { g.position.set(x, 0, z); scene.add(g); return g; };

  function buildTree(x, z, s, gl) {
    const g = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(.07*s,.22*s,2.2*s,9,4), soft(groundC.clone().lerp(new THREE.Color(0x2a1205),.72),.9));
    trunk.position.set(0,1.1*s,0); trunk.castShadow=true; g.add(trunk);
    const fc = accentC.clone().lerp(new THREE.Color(0x0e3a14), gl ? .15 : .6);
    const fm = gl ? glow(fc,.45) : soft(fc,.82);
    [{r:1.05*s,y:2.3*s},{r:.78*s,y:3.1*s},{r:.5*s,y:3.7*s}].forEach(({r,y})=>{
      const c = new THREE.Mesh(new THREE.IcosahedronGeometry(r,1), fm.clone());
      c.rotation.set(Math.random()*.5,Math.random()*6,Math.random()*.5); c.position.y=y; c.castShadow=true; g.add(c);
    });
    return place(g,x,z);
  }
  function buildWillow(x, z, s, gl) {
    const g = new THREE.Group();
    const willowTrunk = new THREE.Mesh(new THREE.CylinderGeometry(.09*s,.25*s,3.2*s,9), soft(groundC.clone().lerp(new THREE.Color(0x1e0d04),.75),.85));
    willowTrunk.position.set(0,1.6*s,0); willowTrunk.castShadow=true; g.add(willowTrunk);
    const fc = accentC.clone().lerp(new THREE.Color(0x1f5527), gl ? .1 : .55);
    const fm = gl ? glow(fc,.35,.88) : soft(fc,.72,.9);
    for (let i = 0; i < 16; i++) {
      const a=(i/16)*Math.PI*2, r=(1.1+Math.random()*.4)*s;
      const st=new THREE.Mesh(new THREE.CylinderGeometry(.012*s,.005*s,(2+Math.random()*1.2)*s,4),fm.clone());
      st.position.set(Math.cos(a)*r*.55,2.4*s,Math.sin(a)*r*.55); st.rotation.z=Math.cos(a)*.55; st.rotation.x=Math.sin(a)*.5; g.add(st);
    }
    return place(g,x,z);
  }
  function buildPine(x, z, s, gl) {
    const g = new THREE.Group();
    const pineTrunk = new THREE.Mesh(new THREE.CylinderGeometry(.08*s,.22*s,2.8*s,8), soft(new THREE.Color(0x2a1205).lerp(groundC,.3)));
    pineTrunk.position.set(0,1.4*s,0); pineTrunk.castShadow=true; g.add(pineTrunk);
    const fc=accentC.clone().lerp(new THREE.Color(0x0a2e14),gl?.08:.72);
    const fm=gl?glow(fc,.4):soft(fc,.85);
    for(let i=0;i<6;i++){const c=new THREE.Mesh(new THREE.ConeGeometry(s*(.8-i*.1),s*1.,8),fm.clone());c.position.y=(2.+i*.9)*s;c.castShadow=true;g.add(c);}
    return place(g,x,z);
  }
  function buildHouse(x, z, s, gl) {
    const g = new THREE.Group();
    const wc=fogC.clone().lerp(new THREE.Color(0xd4c4a4),.5);
    const walls=new THREE.Mesh(new THREE.BoxGeometry(2.2*s,1.7*s,2.4*s),soft(wc,.75));
    walls.position.y=.85*s; walls.castShadow=walls.receiveShadow=true; g.add(walls);
    const rc=accentC.clone().lerp(new THREE.Color(0x6a2814),.58);
    const roof=new THREE.Mesh(new THREE.ConeGeometry(1.9*s,1.3*s,4),soft(rc,.68));
    roof.position.y=2.25*s; roof.rotation.y=Math.PI/4; roof.castShadow=true; g.add(roof);
    const chim=new THREE.Mesh(new THREE.BoxGeometry(.25*s,.6*s,.25*s),soft(rc.clone().lerp(new THREE.Color(0x333333),.3)));
    chim.position.set(.5*s,2.75*s,.4*s); g.add(chim);
    const wgc=gl?accentC.clone().lerp(new THREE.Color(0xffee88),.35):new THREE.Color(0x9ab8cc).lerp(skyBot,.4);
    const wgm=gl?glow(wgc,1.3,.95):soft(wgc,.05,.75);
    [[-.6,.9,1.22],[.6,.9,1.22]].forEach(([wx,wy,wz])=>{const win=new THREE.Mesh(new THREE.BoxGeometry(.38*s,.44*s,.06),wgm.clone());win.position.set(wx*s,wy*s,wz*s);g.add(win);});
    const door=new THREE.Mesh(new THREE.BoxGeometry(.48*s,.78*s,.08),soft(groundC.clone().lerp(new THREE.Color(0x4a1e06),.65)));
    door.position.set(0,.39*s,1.22*s); g.add(door);
    if(gl){const pl=new THREE.PointLight(accentC,1.6,9*s);pl.position.set(0,.9*s,1.6*s);g.add(pl);}
    return place(g,x,z);
  }
  function buildMountain(x,z,s){
    const g=new THREE.Group();
    const mc=fogC.clone().lerp(skyTop,.38), sc2=new THREE.Color(0xdde4f0).lerp(skyTop,.25);
    [{dx:0,dz:0,r:3.8*s,h:8*s,seg:7},{dx:-2.5*s,dz:.5*s,r:2.4*s,h:5.5*s,seg:6},{dx:2.2*s,dz:.9*s,r:2.*s,h:4.8*s,seg:6}]
    .forEach(({dx,dz,r,h,seg},i)=>{
      const b=new THREE.Mesh(new THREE.ConeGeometry(r,h,seg),soft(mc.clone().lerp(skyTop,i*.08),.88));
      b.position.set(dx,h/2,dz); b.castShadow=true; g.add(b);
      const sn=new THREE.Mesh(new THREE.ConeGeometry(r*.32,h*.25,seg),soft(sc2,.45));
      sn.position.set(dx,h*.88,dz); g.add(sn);
    });
    return place(g,x,z);
  }
  function buildMoon(x,z,s,gl){
    const g=new THREE.Group();
    const mc=lightC.clone().lerp(new THREE.Color(0xfff5e8),.65);
    g.add(new THREE.Mesh(new THREE.SphereGeometry(1.4*s,32,32),glow(mc,gl?1.3:.5)));
    if(gl){
      [2.4,3.6,5.2].forEach((r,i)=>{
        const ring=new THREE.Mesh(new THREE.RingGeometry(r*s,(r+.14)*s,64),new THREE.MeshBasicMaterial({color:mc,transparent:true,opacity:.1-i*.025,side:THREE.DoubleSide,depthWrite:false}));
        g.add(ring);
      });
      const pl=new THREE.PointLight(lightC,2.,60); pl.position.set(x-4,13,z-22); scene.add(pl);
    }
    g.position.set(x-4,13,z-22); scene.add(g); return g;
  }
  function buildSun(x,z,s,gl){
    const g=new THREE.Group();
    const sc2=lightC.clone().lerp(new THREE.Color(0xffd040),.55);
    g.add(new THREE.Mesh(new THREE.SphereGeometry(1.8*s,32,32),glow(sc2,1.6)));
    for(let i=0;i<14;i++){const a=(i/14)*Math.PI*2,ray=new THREE.Mesh(new THREE.CylinderGeometry(.025*s,.0,2.8*s,4),glow(sc2,.9,.55));ray.position.set(Math.cos(a)*2.4*s,Math.sin(a)*2.4*s,0);ray.rotation.z=-a;g.add(ray);}
    const pl=new THREE.PointLight(sc2,2.5,80); scene.add(pl); pl.position.set(x+10,17,z-32);
    g.position.set(x+10,17,z-32); scene.add(g); return g;
  }
  function buildWater(x,z,s){
    const g=new THREE.Group();
    const wc=accentC.clone().lerp(skyBot,.28).lerp(new THREE.Color(0x082038),.45);
    const waterSurface=new THREE.Mesh(new THREE.PlaneGeometry(5.5*s,5.5*s,14,14),new THREE.MeshStandardMaterial({color:wc,roughness:.02,metalness:.9,transparent:true,opacity:.85}));
    waterSurface.rotation.x=-Math.PI/2; waterSurface.position.y=.05; g.add(waterSurface);
    [1.,1.5,2.1].forEach((r,i)=>{const ring=new THREE.Mesh(new THREE.RingGeometry(r*s*2.6,(r*s*2.6)+.12,64),new THREE.MeshBasicMaterial({color:wc,transparent:true,opacity:.22-i*.06,side:THREE.DoubleSide,depthWrite:false}));ring.rotation.x=-Math.PI/2;ring.position.y=.07;g.add(ring);});
    return place(g,x,z);
  }
  function buildFlower(x,z,s,gl){
    const g=new THREE.Group();
    const stem=new THREE.Mesh(new THREE.CylinderGeometry(.03*s,.05*s,1.*s,6),soft(new THREE.Color(0x236428)));
    stem.position.set(0,.5*s,0); g.add(stem);
    const fc=accentC.clone(), fm=gl?glow(fc,.75):soft(fc,.48);
    const cc=fc.clone().lerp(new THREE.Color(0xffee55),.55);
    const centre=new THREE.Mesh(new THREE.SphereGeometry(.14*s,10,10),glow(cc,.6));
    centre.position.set(0,1.02*s,0); g.add(centre);
    for(let i=0;i<8;i++){const a=(i/8)*Math.PI*2,p=new THREE.Mesh(new THREE.SphereGeometry(.16*s,7,5),fm.clone());p.scale.set(.45,1.1,.45);p.position.set(Math.cos(a)*.25*s,1.*s,Math.sin(a)*.25*s);g.add(p);}
    return place(g,x,z);
  }
  function buildBird(x,z,s){
    const g=new THREE.Group();
    const bm=soft(accentC.clone().lerp(new THREE.Color(0xffffff),.45),.35,.9);
    g.add(new THREE.Mesh(new THREE.SphereGeometry(.15*s,8,6),bm));
    [-1,1].forEach(sd2=>{const w=new THREE.Mesh(new THREE.CylinderGeometry(.02*s,.09*s,.48*s,5),bm.clone());w.position.set(sd2*.3*s,0,0);w.rotation.z=sd2*.65;w.rotation.x=.3;g.add(w);});
    g.position.set(x,8+Math.random()*5,z); scene.add(g);
    floaters.push({mesh:g,baseY:g.position.y,speed:.35+Math.random()*.6,amp:.35+Math.random()*.6});
    return g;
  }
  function buildStars(){
    const cnt=600,pos=new Float32Array(cnt*3),ph=new Float32Array(cnt);
    for(let i=0;i<cnt;i++){const t2=Math.random()*Math.PI*2,p2=Math.acos(2*Math.random()-1);pos[i*3]=Math.sin(p2)*Math.cos(t2)*100;pos[i*3+1]=Math.abs(Math.cos(p2))*100+5;pos[i*3+2]=Math.sin(p2)*Math.sin(t2)*100;ph[i]=Math.random()*Math.PI*2;}
    const geo=new THREE.BufferGeometry();
    geo.setAttribute('position',new THREE.BufferAttribute(pos,3));
    geo.setAttribute('phase',new THREE.BufferAttribute(ph,1));
    const mat=new THREE.ShaderMaterial({
      uniforms:{uTime:{value:0}},
      vertexShader:`attribute float phase;uniform float uTime;varying float vB; void main(){vB=.4+sin(uTime*.7+phase)*.5+.5*.6;vec4 mv=modelViewMatrix*vec4(position,1.);gl_PointSize=(1.2+vB*2.8)*(260./-mv.z);gl_Position=projectionMatrix*mv;}`,
      fragmentShader:`varying float vB; void main(){vec2 uv=gl_PointCoord-.5;if(length(uv)>.5)discard;float c=pow(1.-smoothstep(0.,.5,length(uv)),2.5);gl_FragColor=vec4(1.,.97,.92,c*vB);}`,
      transparent:true,blending:THREE.AdditiveBlending,depthWrite:false
    });
    const stars=new THREE.Points(geo,mat); scene.add(stars); return stars;
  }
  function buildLantern(x,z,s,gl){
    const g=new THREE.Group();
    const pole=new THREE.Mesh(new THREE.CylinderGeometry(.04*s,.08*s,2.8*s,9),soft(groundC.clone().lerp(new THREE.Color(0x888888),.55)));
    pole.position.set(0,1.4*s,0); pole.castShadow=true; g.add(pole);
    const lc=accentC.clone().lerp(new THREE.Color(0xffee88),.42);
    const lantern=new THREE.Mesh(new THREE.SphereGeometry(.25*s,12,12),glow(lc,gl?1.5:.5));
    lantern.position.y=2.8*s; g.add(lantern);
    const rm=soft(new THREE.Color(0xaaaaaa),.6,.9);
    [0,.18,.36].forEach(dy=>{const r=new THREE.Mesh(new THREE.TorusGeometry(.26*s,.016*s,6,24),rm);r.position.y=(2.64+dy)*s;g.add(r);});
    if(gl){const pl=new THREE.PointLight(lc,2.,10*s);pl.position.y=2.8*s;g.add(pl);}
    return place(g,x,z);
  }
  function buildPath(x,z,s){
    const g=new THREE.Group();
    const sc2=groundC.clone().lerp(new THREE.Color(0xb8a888),.55);
    for(let i=0;i<12;i++){const stone=new THREE.Mesh(new THREE.CylinderGeometry((.26+Math.random()*.18)*s,(.3+Math.random()*.2)*s,.09*s,5+Math.floor(Math.random()*4)),soft(sc2.clone().lerp(new THREE.Color(0x777777),Math.random()*.18),.92));stone.position.set((Math.random()-.5)*.55*s,.045*s,(i-6)*.9*s);stone.rotation.y=Math.random()*Math.PI;stone.receiveShadow=true;g.add(stone);}
    return place(g,x,z);
  }
  function buildArch(x,z,s,gl){
    const g=new THREE.Group();
    const am=gl?glow(fogC.clone().lerp(skyTop,.42),.32):soft(fogC.clone().lerp(skyTop,.42),.58);
    [-1,1].forEach(sd2=>{const p=new THREE.Mesh(new THREE.CylinderGeometry(.2*s,.25*s,3.8*s,10),am.clone());p.position.set(sd2*1.2*s,1.9*s,0);p.castShadow=true;g.add(p);});
    const arc=new THREE.Mesh(new THREE.TorusGeometry(1.2*s,.2*s,8,32,Math.PI),am.clone());
    arc.position.y=3.8*s; arc.rotation.z=Math.PI; arc.castShadow=true; g.add(arc);
    return place(g,x,z);
  }
  function buildStone(x,z,s){
    const g=new THREE.Group();
    const sc2=fogC.clone().lerp(new THREE.Color(0x6a6a7a),.45);
    for(let i=0;i<1+Math.floor(Math.random()*3);i++){const st=new THREE.Mesh(new THREE.DodecahedronGeometry(s*(.4+Math.random()*.5),0),soft(sc2.clone().lerp(skyTop,Math.random()*.12),.92));st.scale.y=1.4+Math.random()*1.1;st.position.set((Math.random()-.5)*1.5*s,s*(.55+Math.random()*.5),(Math.random()-.5)*1.5*s);st.rotation.set(Math.random()*.3,Math.random()*Math.PI,Math.random()*.25);st.castShadow=st.receiveShadow=true;g.add(st);}
    return place(g,x,z);
  }
  function buildGrass(x,z,s){
    const g=new THREE.Group();
    const gc=accentC.clone().lerp(new THREE.Color(0x2e6825),.55);
    for(let i=0;i<45;i++){const h=s*(.28+Math.random()*.55);const blade=new THREE.Mesh(new THREE.CylinderGeometry(.01*s,.045*s,h,4),soft(gc.clone().lerp(groundC,Math.random()*.35),.65));blade.position.set((Math.random()-.5)*4.5*s,h/2,(Math.random()-.5)*4.5*s);blade.rotation.z=(Math.random()-.5)*.6;g.add(blade);}
    return place(g,x,z);
  }

  // ── NEW BUILDERS ─────────────────────────────────────────────────────────

  // Oak — wide rounded canopy, lighter green
  function buildOak(x,z,s,gl){
    const g=new THREE.Group();
    const trunk=new THREE.Mesh(new THREE.CylinderGeometry(.1*s,.28*s,2.8*s,8),soft(groundC.clone().lerp(new THREE.Color(0x3a1a08),.75),.9));
    trunk.position.set(0,1.4*s,0); trunk.castShadow=true; g.add(trunk);
    const fc=accentC.clone().lerp(new THREE.Color(0x1a4a0a),gl?.1:.5);
    const fm=gl?glow(fc,.4):soft(fc,.8);
    [{r:1.5*s,y:2.8*s},{r:1.2*s,y:3.6*s},{r:.9*s,y:4.2*s},{r:.6*s,y:4.8*s}].forEach(({r,y})=>{
      const c=new THREE.Mesh(new THREE.IcosahedronGeometry(r,1),fm.clone());
      c.rotation.set(Math.random()*.5,Math.random()*6,Math.random()*.4);c.position.y=y;c.castShadow=true;g.add(c);
    });
    return place(g,x,z);
  }

  // Bush — low rounded shrub
  function buildBush(x,z,s,gl){
    const g=new THREE.Group();
    const bc=accentC.clone().lerp(new THREE.Color(0x1a5010),.65);
    const bm=gl?glow(bc,.3):soft(bc,.82);
    [{dx:0,dz:0,r:.7},{dx:-.5,dz:.2,r:.5},{dx:.5,dz:-.1,r:.55},{dx:.1,dz:.5,r:.45}].forEach(({dx,dz,r})=>{
      const b=new THREE.Mesh(new THREE.IcosahedronGeometry(r*s,1),bm.clone());
      b.position.set(dx*s,r*.6*s,dz*s);g.add(b);
    });
    return place(g,x,z);
  }

  // Bamboo — tall thin segmented stalks
  function buildBamboo(x,z,s){
    const g=new THREE.Group();
    const bc=accentC.clone().lerp(new THREE.Color(0x3a7a20),.7);
    for(let i=0;i<5;i++){
      const ox=(Math.random()-.5)*.8*s,oz=(Math.random()-.5)*.8*s;
      const stalk=new THREE.Group();
      const h=(3+Math.random()*2)*s;
      for(let seg=0;seg<6;seg++){
        const seg3d=new THREE.Mesh(new THREE.CylinderGeometry(.06*s,.07*s,h/6,6),soft(bc.clone().lerp(new THREE.Color(0x8aaa30),.2+seg*.06),.7));
        seg3d.position.y=(seg+.5)*h/6;stalk.add(seg3d);
        const ring=new THREE.Mesh(new THREE.TorusGeometry(.08*s,.015*s,4,8),soft(new THREE.Color(0x2a5010),.6));
        ring.position.y=(seg+1)*h/6;stalk.add(ring);
      }
      stalk.position.set(ox,0,oz);stalk.rotation.z=(Math.random()-.5)*.12;g.add(stalk);
    }
    return place(g,x,z);
  }

  // Cabin — smaller cosier than house
  function buildCabin(x,z,s,gl){
    const g=new THREE.Group();
    const wc=groundC.clone().lerp(new THREE.Color(0x8b5a2b),.55);
    const walls=new THREE.Mesh(new THREE.BoxGeometry(1.8*s,1.4*s,2.*s),soft(wc,.85));
    walls.position.y=.7*s;walls.castShadow=walls.receiveShadow=true;g.add(walls);
    const rc=accentC.clone().lerp(new THREE.Color(0x3a1a08),.7);
    const roof=new THREE.Mesh(new THREE.ConeGeometry(1.5*s,1.*s,4),soft(rc,.7));
    roof.position.y=1.9*s;roof.rotation.y=Math.PI/4;roof.castShadow=true;g.add(roof);
    for(let i=0;i<4;i++){const log=new THREE.Mesh(new THREE.CylinderGeometry(.1*s,.1*s,2.*s,6),soft(wc.clone().lerp(new THREE.Color(0x5a3010),.4),.9));log.rotation.z=Math.PI/2;log.position.set(0,(i*.35+.15)*s,.95*s);g.add(log);}
    if(gl){const pl=new THREE.PointLight(accentC.clone().lerp(new THREE.Color(0xffee88),.5),1.2,7*s);pl.position.set(0,1.*s,1.1*s);g.add(pl);}
    return place(g,x,z);
  }

  // Castle — towers and battlements
  function buildCastle(x,z,s){
    const g=new THREE.Group();
    const sc2=fogC.clone().lerp(new THREE.Color(0x888899),.45);
    const sm=soft(sc2,.85);
    const keep=new THREE.Mesh(new THREE.BoxGeometry(2.4*s,3.*s,2.4*s),sm.clone());
    keep.position.y=1.5*s;keep.castShadow=keep.receiveShadow=true;g.add(keep);
    [[1.2,-1.2],[1.2,1.2],[-1.2,-1.2],[-1.2,1.2]].forEach(([tx,tz])=>{
      const tower=new THREE.Mesh(new THREE.CylinderGeometry(.55*s,.6*s,3.8*s,8),sm.clone());
      tower.position.set(tx*s,1.9*s,tz*s);tower.castShadow=true;g.add(tower);
      const top=new THREE.Mesh(new THREE.ConeGeometry(.6*s,.8*s,8),soft(accentC.clone().lerp(new THREE.Color(0x440000),.5),.65));
      top.position.set(tx*s,3.9*s,tz*s);g.add(top);
    });
    return place(g,x,z);
  }

  // Fence — row of wooden planks
  function buildFence(x,z,s){
    const g=new THREE.Group();
    const fc2=groundC.clone().lerp(new THREE.Color(0xc8a87a),.55);
    for(let i=0;i<8;i++){
      const post=new THREE.Mesh(new THREE.BoxGeometry(.12*s,1.2*s,.12*s),soft(fc2,.9));
      post.position.set((i-3.5)*.55*s,.6*s,0);g.add(post);
    }
    [[.3],[.7]].forEach(([fy])=>{
      const rail=new THREE.Mesh(new THREE.BoxGeometry(4.4*s,.12*s,.1*s),soft(fc2,.9));
      rail.position.set(0,fy*s*1.2,.0);g.add(rail);
    });
    return place(g,x,z);
  }

  // Bench — simple park bench
  function buildBench(x,z,s){
    const g=new THREE.Group();
    const bc2=groundC.clone().lerp(new THREE.Color(0xb8884a),.55);
    const seat=new THREE.Mesh(new THREE.BoxGeometry(1.8*s,.12*s,.6*s),soft(bc2,.85));
    seat.position.y=.7*s;g.add(seat);
    const back=new THREE.Mesh(new THREE.BoxGeometry(1.8*s,.55*s,.1*s),soft(bc2,.85));
    back.position.set(0,.98*s,-.24*s);g.add(back);
    [-.7,.7].forEach(lx=>{
      const leg=new THREE.Mesh(new THREE.BoxGeometry(.1*s,.7*s,.6*s),soft(bc2.clone().lerp(new THREE.Color(0x555555),.3)));
      leg.position.set(lx*s,.35*s,0);g.add(leg);
    });
    return place(g,x,z);
  }

  // Bridge — arched stone bridge
  function buildBridge(x,z,s){
    const g=new THREE.Group();
    const bc2=fogC.clone().lerp(new THREE.Color(0x888877),.5);
    const deck=new THREE.Mesh(new THREE.BoxGeometry(4*s,.18*s,.9*s),soft(bc2,.9));
    deck.position.y=1.2*s;g.add(deck);
    const arch=new THREE.Mesh(new THREE.TorusGeometry(1.*s,.22*s,8,32,Math.PI),soft(bc2.clone().lerp(new THREE.Color(0x666655),.35),.88));
    arch.rotation.z=Math.PI;arch.position.y=1.18*s;g.add(arch);
    [[-1.6,0],[1.6,0]].forEach(([bx])=>{
      const p=new THREE.Mesh(new THREE.BoxGeometry(.22*s,1.2*s,.95*s),soft(bc2,.92));
      p.position.set(bx*s,.6*s,0);g.add(p);
    });
    return place(g,x,z);
  }

  // Well — stone well with roof
  function buildWell(x,z,s){
    const g=new THREE.Group();
    const sc2=fogC.clone().lerp(new THREE.Color(0x777766),.55);
    const wall=new THREE.Mesh(new THREE.CylinderGeometry(.5*s,.55*s,.9*s,10,1,true),soft(sc2,.9));
    wall.position.y=.45*s;g.add(wall);
    const rim=new THREE.Mesh(new THREE.TorusGeometry(.55*s,.07*s,6,18),soft(sc2,.88));
    rim.position.y=.92*s;g.add(rim);
    [-1,1].forEach(dx=>{
      const p=new THREE.Mesh(new THREE.CylinderGeometry(.05*s,.05*s,1.6*s,6),soft(groundC.clone().lerp(new THREE.Color(0x5a3010),.5)));
      p.position.set(dx*.55*s,1.3*s,0);g.add(p);
    });
    const roofPole=new THREE.Mesh(new THREE.CylinderGeometry(.04*s,.04*s,.3*s,6),soft(groundC.clone().lerp(new THREE.Color(0x4a2a08),.6)));
    roofPole.position.y=2.18*s;g.add(roofPole);
    const roof=new THREE.Mesh(new THREE.CylinderGeometry(.08*s,.8*s,.5*s,8),soft(accentC.clone().lerp(new THREE.Color(0x882a14),.6),.7));
    roof.position.y=1.88*s;g.add(roof);
    return place(g,x,z);
  }

  // Windmill — rotating sails
  function buildWindmill(x,z,s){
    const g=new THREE.Group();
    const wc=fogC.clone().lerp(new THREE.Color(0xd4c8a8),.5);
    const body=new THREE.Mesh(new THREE.CylinderGeometry(.6*s,1.*s,4.*s,8),soft(wc,.8));
    body.position.y=2.*s;g.add(body);
    const sailHub=new THREE.Group();
    sailHub.position.set(0,3.8*s,.95*s);
    for(let i=0;i<4;i++){
      const sail=new THREE.Mesh(new THREE.BoxGeometry(.22*s,2.*s,.06*s),soft(fogC.clone().lerp(new THREE.Color(0xeeddcc),.4),.7));
      sail.position.y=1.*s;sail.rotation.z=(i/4)*Math.PI*2;sailHub.add(sail);
    }
    g.add(sailHub);
    floaters.push({mesh:sailHub,type:'spin',speed:.4+Math.random()*.3});
    const cap=new THREE.Mesh(new THREE.ConeGeometry(.75*s,.7*s,8),soft(accentC.clone().lerp(new THREE.Color(0x883322),.5),.72));
    cap.position.y=4.4*s;g.add(cap);
    return place(g,x,z);
  }

  // Lighthouse — tall striped tower with glowing top
  function buildLighthouse(x,z,s,gl){
    const g=new THREE.Group();
    const lc2=fogC.clone().lerp(new THREE.Color(0xeeeeee),.5);
    const tc=accentC.clone().lerp(new THREE.Color(0xcc2222),.6);
    for(let i=0;i<8;i++){
      const band=new THREE.Mesh(new THREE.CylinderGeometry((.45-.025*i)*s,(.5-.025*i)*s,.65*s,10),soft(i%2===0?lc2:tc,.8));
      band.position.y=(i*.65+.325)*s;g.add(band);
    }
    const light=new THREE.Mesh(new THREE.SphereGeometry(.38*s,14,10),glow(lightC.clone().lerp(new THREE.Color(0xffff88),.5),gl?2.:.8));
    light.position.y=5.6*s;g.add(light);
    const top=new THREE.Mesh(new THREE.ConeGeometry(.5*s,.5*s,8),soft(tc,.7));
    top.position.y=6.05*s;g.add(top);
    if(gl){const pl=new THREE.PointLight(lightC,3.,30*s);pl.position.y=5.6*s;g.add(pl);}
    return place(g,x,z);
  }

  // Hill — gentle rolling mound
  function buildHill(x,z,s){
    const g=new THREE.Group();
    const hc=groundC.clone().lerp(accentC.clone().lerp(new THREE.Color(0x1a4a12),.6),.35);
    const hill=new THREE.Mesh(new THREE.SphereGeometry(2.8*s,16,10),soft(hc,.88));
    hill.scale.y=.38;hill.position.y=-.1*s;g.add(hill);
    return place(g,x,z);
  }

  // Cloud — fluffy cluster of spheres
  function buildCloud(x,z,s){
    const g=new THREE.Group();
    const cc=new THREE.Color(0xffffff).lerp(skyTop,.12);
    [{dx:0,dy:0,r:.9},{dx:-.7,dy:-.15,r:.65},{dx:.7,dy:-.1,r:.72},{dx:.35,dy:.28,r:.58},{dx:-.38,dy:.22,r:.52}]
    .forEach(({dx,dy,r})=>{
      const c=new THREE.Mesh(new THREE.SphereGeometry(r*s,10,8),soft(cc,.35,.92));
      c.position.set(dx*s,dy*s,0);g.add(c);
    });
    g.position.set(x,10+Math.random()*6,z);
    scene.add(g);
    floaters.push({mesh:g,baseY:g.position.y,speed:.15+Math.random()*.2,amp:.4+Math.random()*.6});
    return g;
  }

  // Rainbow — arc of coloured tori
  function buildRainbow(x,z,s){
    const g=new THREE.Group();
    const cols=[0xff2020,0xff8820,0xffee20,0x20ee20,0x2088ff,0x8820ff];
    cols.forEach((hex,i)=>{
      const r=(4+i*.55)*s;
      const arc=new THREE.Mesh(new THREE.TorusGeometry(r,.12*s,6,48,Math.PI),
        new THREE.MeshStandardMaterial({color:new THREE.Color(hex),transparent:true,opacity:.55,roughness:.4,emissive:new THREE.Color(hex),emissiveIntensity:.2}));
      arc.rotation.z=Math.PI;arc.position.y=.5*s;g.add(arc);
    });
    g.position.set(x,1,z);scene.add(g);return g;
  }

  // Waterfall — cascading vertical planes
  function buildWaterfall(x,z,s){
    const g=new THREE.Group();
    const wc=accentC.clone().lerp(skyTop,.35).lerp(new THREE.Color(0x88ccff),.45);
    for(let i=0;i<3;i++){
      const fall=new THREE.Mesh(new THREE.PlaneGeometry((.4+i*.15)*s,(3+i*.5)*s,1,8),
        new THREE.MeshStandardMaterial({color:wc,transparent:true,opacity:.55-.05*i,roughness:.05,metalness:.6,side:THREE.DoubleSide,depthWrite:false}));
      fall.position.set((i-.5)*.5*s,1.5*s,.05*i);g.add(fall);
    }
    const splash=new THREE.Mesh(new THREE.CylinderGeometry(.8*s,.05*s,.3*s,10,1,true),
      new THREE.MeshStandardMaterial({color:wc,transparent:true,opacity:.35,roughness:.1,side:THREE.DoubleSide,depthWrite:false}));
    splash.position.y=.15*s;g.add(splash);
    return place(g,x,z);
  }

  // Mushroom — spotty cap
  function buildMushroom(x,z,s,gl){
    const g=new THREE.Group();
    const stem=new THREE.Mesh(new THREE.CylinderGeometry(.14*s,.18*s,.7*s,8),soft(new THREE.Color(0xeeddcc),.7));
    stem.position.y=.35*s;g.add(stem);
    const cap=new THREE.Mesh(new THREE.SphereGeometry(.45*s,12,8),gl?glow(accentC.clone().lerp(new THREE.Color(0xcc2222),.55),.6):soft(accentC.clone().lerp(new THREE.Color(0xcc2222),.55),.65));
    cap.scale.y=.65;cap.position.y=.72*s;g.add(cap);
    for(let i=0;i<5;i++){
      const dot=new THREE.Mesh(new THREE.SphereGeometry(.07*s,6,5),soft(new THREE.Color(0xffffff),.5));
      const a=(i/5)*Math.PI*2;dot.position.set(Math.cos(a)*.22*s,.85*s,Math.sin(a)*.22*s);g.add(dot);
    }
    return place(g,x,z);
  }

  // Fern — layered fronds
  function buildFern(x,z,s){
    const g=new THREE.Group();
    const fc2=accentC.clone().lerp(new THREE.Color(0x1a5a10),.7);
    for(let i=0;i<8;i++){
      const a=(i/8)*Math.PI*2;
      const frond=new THREE.Mesh(new THREE.ConeGeometry(.06*s,.9*s,4),soft(fc2.clone().lerp(new THREE.Color(0x0a3a08),Math.random()*.3),.72));
      frond.position.set(Math.cos(a)*.25*s,.35*s,Math.sin(a)*.25*s);
      frond.rotation.z=Math.cos(a)*.7;frond.rotation.x=Math.sin(a)*.5;g.add(frond);
    }
    return place(g,x,z);
  }

  // Butterfly — two wing lobes floating
  function buildButterfly(x,z,s){
    const g=new THREE.Group();
    const wc=accentC.clone().lerp(lightC,.4);
    const wm=glow(wc,.55,.88);
    [-1,1].forEach(sd2=>{
      const wing=new THREE.Mesh(new THREE.SphereGeometry(.28*s,8,6),wm.clone());
      wing.scale.set(.4,1,1);wing.position.set(sd2*.28*s,0,0);g.add(wing);
    });
    g.position.set(x,3+Math.random()*4,z);scene.add(g);
    floaters.push({mesh:g,baseY:g.position.y,speed:.8+Math.random(),amp:.35+Math.random()*.5});
    return g;
  }

  // Cat — round body, pointy ears, tail
  function buildCat(x,z,s){
    const g=new THREE.Group();
    const cc=accentC.clone().lerp(groundC,.55);
    const body=new THREE.Mesh(new THREE.SphereGeometry(.45*s,10,8),soft(cc,.8));
    body.scale.y=.75;body.position.y=.5*s;g.add(body);
    const head=new THREE.Mesh(new THREE.SphereGeometry(.3*s,10,8),soft(cc,.8));
    head.position.set(0,.95*s,.2*s);g.add(head);
    [-1,1].forEach(dx=>{
      const ear=new THREE.Mesh(new THREE.ConeGeometry(.1*s,.2*s,4),soft(cc.clone().lerp(accentC,.35)));
      ear.position.set(dx*.18*s,1.22*s,.22*s);g.add(ear);
    });
    const tail=new THREE.Mesh(new THREE.CylinderGeometry(.05*s,.03*s,.8*s,6),soft(cc.clone().lerp(new THREE.Color(0x888888),.2)));
    tail.rotation.z=.6;tail.position.set(-.5*s,.55*s,0);g.add(tail);
    return place(g,x,z);
  }

  // Dog — blocky body, floppy ear impression
  function buildDog(x,z,s){
    const g=new THREE.Group();
    const dc=groundC.clone().lerp(new THREE.Color(0xd4a870),.55);
    const body=new THREE.Mesh(new THREE.BoxGeometry(1.*s,.6*s,.55*s),soft(dc,.8));
    body.position.y=.65*s;g.add(body);
    const head=new THREE.Mesh(new THREE.BoxGeometry(.48*s,.42*s,.42*s),soft(dc,.8));
    head.position.set(.62*s,.82*s,0);g.add(head);
    const snout=new THREE.Mesh(new THREE.BoxGeometry(.22*s,.18*s,.25*s),soft(dc.clone().lerp(new THREE.Color(0xc89050),.3)));
    snout.position.set(.86*s,.72*s,0);g.add(snout);
    [[-1,1],[1,1]].forEach(([dx])=>{
      const leg=new THREE.Mesh(new THREE.CylinderGeometry(.1*s,.1*s,.5*s,6),soft(dc.clone().lerp(groundC,.35)));
      leg.position.set(dx*.35*s,.28*s,.16*s);g.add(leg);
    });
    const tail=new THREE.Mesh(new THREE.CylinderGeometry(.06*s,.03*s,.55*s,5),soft(dc));
    tail.rotation.z=-.5;tail.position.set(-.58*s,.95*s,0);g.add(tail);
    return place(g,x,z);
  }

  // Horse — stylised four legs, mane
  function buildHorse(x,z,s){
    const g=new THREE.Group();
    const hc=groundC.clone().lerp(new THREE.Color(0x8b5a2b),.45);
    const body=new THREE.Mesh(new THREE.BoxGeometry(1.8*s,.8*s,.7*s),soft(hc,.8));
    body.position.y=1.2*s;g.add(body);
    const neck=new THREE.Mesh(new THREE.BoxGeometry(.35*s,.9*s,.35*s),soft(hc,.8));
    neck.position.set(.75*s,1.72*s,0);neck.rotation.z=-.35;g.add(neck);
    const head=new THREE.Mesh(new THREE.BoxGeometry(.42*s,.38*s,.38*s),soft(hc,.8));
    head.position.set(1.08*s,2.2*s,0);g.add(head);
    const mane=new THREE.Mesh(new THREE.BoxGeometry(.1*s,.7*s,.15*s),soft(accentC.clone().lerp(groundC,.4)));
    mane.position.set(.88*s,1.95*s,0);g.add(mane);
    [[-1,-.25],[1,-.25],[-1,.25],[1,.25]].forEach(([dx,dz2])=>{
      const leg=new THREE.Mesh(new THREE.CylinderGeometry(.1*s,.09*s,.95*s,6),soft(hc.clone().lerp(groundC,.2)));
      leg.position.set(dx*.6*s,.52*s,dz2*s);g.add(leg);
    });
    return place(g,x,z);
  }

  // Deer — slender body, antlers
  function buildDeer(x,z,s){
    const g=new THREE.Group();
    const dc=groundC.clone().lerp(new THREE.Color(0xc87838),.5);
    const body=new THREE.Mesh(new THREE.SphereGeometry(.55*s,10,7),soft(dc,.78));
    body.scale.set(1.4,.7,1);body.position.y=1.1*s;g.add(body);
    const neck=new THREE.Mesh(new THREE.CylinderGeometry(.15*s,.2*s,.7*s,7),soft(dc,.78));
    neck.position.set(.55*s,1.4*s,0);neck.rotation.z=-.45;g.add(neck);
    const head=new THREE.Mesh(new THREE.SphereGeometry(.24*s,8,6),soft(dc,.78));
    head.position.set(.9*s,1.75*s,0);g.add(head);
    for(let i=0;i<4;i++){
      const leg=new THREE.Mesh(new THREE.CylinderGeometry(.075*s,.065*s,.85*s,5),soft(dc.clone().lerp(groundC,.25)));
      leg.position.set((i<2?-.3:.3)*s,.45*s,(i%2===0?-.18:.18)*s);g.add(leg);
    }
    [-1,1].forEach(dx=>{
      const ant1=new THREE.Mesh(new THREE.CylinderGeometry(.03*s,.025*s,.55*s,4),soft(new THREE.Color(0x8b5a2b),.85));
      ant1.position.set((.9+dx*.1)*s,2.1*s,0);ant1.rotation.z=dx*.45;g.add(ant1);
      const ant2=new THREE.Mesh(new THREE.CylinderGeometry(.02*s,.018*s,.3*s,4),soft(new THREE.Color(0x8b5a2b),.85));
      ant2.position.set((.92+dx*.28)*s,2.5*s,0);ant2.rotation.z=dx*.8;g.add(ant2);
    });
    return place(g,x,z);
  }

  // Balloon — floating oval
  function buildBalloon(x,z,s){
    const g=new THREE.Group();
    const bc=accentC.clone().lerp(lightC,.3);
    const ball=new THREE.Mesh(new THREE.SphereGeometry(.55*s,14,10),glow(bc,.5,.9));
    ball.scale.y=1.3;g.add(ball);
    const string=new THREE.Mesh(new THREE.CylinderGeometry(.01*s,.01*s,1.5*s,4),soft(new THREE.Color(0xffffff),.5));
    string.position.y=-.9*s;g.add(string);
    g.position.set(x,6+Math.random()*5,z);scene.add(g);
    floaters.push({mesh:g,baseY:g.position.y,speed:.3+Math.random()*.4,amp:.5+Math.random()*.7});
    return g;
  }

  // Kite — diamond shape with tail
  function buildKite(x,z,s){
    const g=new THREE.Group();
    const kc=accentC.clone();
    const body=new THREE.Mesh(new THREE.OctahedronGeometry(.55*s,0),glow(kc,.4,.85));
    body.scale.set(1,1.6,.15);g.add(body);
    const tail=new THREE.Mesh(new THREE.CylinderGeometry(.02*s,.01*s,2.*s,4),soft(lightC.clone().lerp(kc,.3),.6,.7));
    tail.position.y=-.85*s;g.add(tail);
    g.position.set(x,8+Math.random()*4,z);scene.add(g);
    floaters.push({mesh:g,baseY:g.position.y,speed:.22+Math.random()*.3,amp:.6+Math.random()*.8});
    return g;
  }

  // Boat — hull + sail
  function buildBoat(x,z,s){
    const g=new THREE.Group();
    const hullC=groundC.clone().lerp(new THREE.Color(0x8b4a1a),.55);
    const hull=new THREE.Mesh(new THREE.CylinderGeometry(.05*s,.7*s,.5*s,8,1,true),soft(hullC,.8));
    hull.scale.set(2,.7,1);hull.position.y=.25*s;g.add(hull);
    const deck=new THREE.Mesh(new THREE.CylinderGeometry(.7*s,.7*s,.12*s,8),soft(hullC.clone().lerp(new THREE.Color(0xd4b888),.3)));
    deck.scale.set(2,1,1);deck.position.y=.5*s;g.add(deck);
    const mast=new THREE.Mesh(new THREE.CylinderGeometry(.04*s,.04*s,2.2*s,5),soft(groundC.clone().lerp(new THREE.Color(0x5a3010),.5)));
    mast.position.y=1.6*s;g.add(mast);
    const sail=new THREE.Mesh(new THREE.ConeGeometry(.7*s,1.6*s,4),soft(new THREE.Color(0xf8f0e0),.5,.9));
    sail.rotation.z=Math.PI/2;sail.scale.set(1,1.4,1);sail.position.set(.4*s,1.8*s,0);g.add(sail);
    return place(g,x,z);
  }

  // Campfire — logs + glowing flame
  function buildCampfire(x,z,s,gl){
    const g=new THREE.Group();
    const logC=groundC.clone().lerp(new THREE.Color(0x4a2208),.65);
    for(let i=0;i<4;i++){
      const a=(i/4)*Math.PI*2;
      const log=new THREE.Mesh(new THREE.CylinderGeometry(.08*s,.1*s,.9*s,6),soft(logC,.9));
      log.rotation.z=Math.PI/2+.25;log.position.set(Math.cos(a)*.25*s,.1*s,Math.sin(a)*.25*s);log.rotation.y=a;g.add(log);
    }
    const flameC=new THREE.Color(0xff8820);
    const flame=new THREE.Mesh(new THREE.ConeGeometry(.2*s,.7*s,7),glow(flameC,gl?2.:1.2,.85));
    flame.position.y=.45*s;g.add(flame);
    const ember=new THREE.Mesh(new THREE.SphereGeometry(.14*s,8,6),glow(new THREE.Color(0xffcc44),1.6));
    ember.position.y=.2*s;g.add(ember);
    if(gl){const pl=new THREE.PointLight(flameC,2.5,8*s);pl.position.y=.7*s;g.add(pl);}
    floaters.push({mesh:flame,baseY:.45*s,speed:1.8,amp:.08*s});
    return place(g,x,z);
  }

  // Tent — triangular canvas shelter
  function buildTent(x,z,s){
    const g=new THREE.Group();
    const tc=accentC.clone().lerp(new THREE.Color(0xcc6622),.5);
    const body=new THREE.Mesh(new THREE.ConeGeometry(1.1*s,1.8*s,4),soft(tc,.7));
    body.rotation.y=Math.PI/4;body.position.y=.9*s;body.castShadow=true;g.add(body);
    const opening=new THREE.Mesh(new THREE.CylinderGeometry(.0,.55*s,.88*s,4,1,true),soft(tc.clone().lerp(new THREE.Color(0x000000),.55),.5,.7));
    opening.rotation.y=Math.PI/4;opening.position.set(0,.44*s,.8*s);g.add(opening);
    return place(g,x,z);
  }

  // Umbrella — parasol on a pole
  function buildUmbrella(x,z,s,gl){
    const g=new THREE.Group();
    const uc=accentC.clone();
    const pole=new THREE.Mesh(new THREE.CylinderGeometry(.04*s,.04*s,2.2*s,6),soft(new THREE.Color(0xaaaaaa),.7));
    pole.position.y=1.1*s;g.add(pole);
    const canopy=new THREE.Mesh(new THREE.SphereGeometry(1.1*s,16,6,0,Math.PI*2,0,Math.PI*.4),gl?glow(uc,.3,.85):soft(uc,.55,.9));
    canopy.position.y=2.2*s;g.add(canopy);
    const tip=new THREE.Mesh(new THREE.SphereGeometry(.06*s,6,5),soft(uc.clone().lerp(lightC,.4)));
    tip.position.y=2.85*s;g.add(tip);
    return place(g,x,z);
  }

  // Rabbit — round body, long ears
  function buildRabbit(x,z,s){
    const g=new THREE.Group();
    const rc=fogC.clone().lerp(new THREE.Color(0xffffff),.55);
    const body=new THREE.Mesh(new THREE.SphereGeometry(.32*s,9,7),soft(rc,.75));
    body.scale.y=1.1;body.position.y=.38*s;g.add(body);
    const head=new THREE.Mesh(new THREE.SphereGeometry(.22*s,9,7),soft(rc,.75));
    head.position.set(0,.76*s,.1*s);g.add(head);
    [-1,1].forEach(dx=>{
      const ear=new THREE.Mesh(new THREE.CylinderGeometry(.055*s,.07*s,.5*s,6),soft(rc.clone().lerp(accentC.clone().lerp(new THREE.Color(0xffcccc),.6),.25),.7));
      ear.position.set(dx*.12*s,1.08*s,.1*s);g.add(ear);
    });
    return place(g,x,z);
  }

  // ── PERSON — stylised Mii-like figure ──────────────────────────────────────
  function buildPerson(x,z,s,gl){
    const g=new THREE.Group();
    // Random skin/clothing colours derived from scene accent/light
    const skinC = lightC.clone().lerp(new THREE.Color(0xf0c090),.7);
    const shirtC = accentC.clone().lerp(new THREE.Color(0x4466ee), Math.random());
    const pantsC = groundC.clone().lerp(new THREE.Color(0x334455),.55);
    const hairCols = [0x1a0a04, 0xf0c050, 0xcc4444, 0x333333, 0xffffff];
    const hairC = new THREE.Color(hairCols[Math.floor(Math.random()*hairCols.length)]);

    // Head
    const head = new THREE.Mesh(new THREE.SphereGeometry(.28*s,14,12), soft(skinC,.6));
    head.position.y = 2.62*s; g.add(head);

    // Hair cap
    const hair = new THREE.Mesh(new THREE.SphereGeometry(.295*s,14,8,0,Math.PI*2,0,Math.PI*.52), soft(hairC,.75));
    hair.position.y = 2.62*s; g.add(hair);

    // Eyes
    [-1,1].forEach(dx => {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(.055*s,7,6), soft(new THREE.Color(0x112255),.3));
      eye.position.set(dx*.11*s,2.65*s,.25*s); g.add(eye);
      const pupil = new THREE.Mesh(new THREE.SphereGeometry(.03*s,5,5), soft(new THREE.Color(0x000000),.2));
      pupil.position.set(dx*.11*s,2.65*s,.29*s); g.add(pupil);
      if(gl){
        const shine = new THREE.Mesh(new THREE.SphereGeometry(.014*s,4,4), soft(new THREE.Color(0xffffff),.1));
        shine.position.set(dx*.118*s,2.672*s,.31*s); g.add(shine);
      }
    });

    // Nose
    const nose = new THREE.Mesh(new THREE.SphereGeometry(.04*s,6,5), soft(skinC.clone().lerp(new THREE.Color(0xdd8855),.25),.5));
    nose.position.set(0,2.57*s,.28*s); g.add(nose);

    // Smile
    const smileGeo = new THREE.TorusGeometry(.085*s,.018*s,5,12,Math.PI*.55);
    const smile = new THREE.Mesh(smileGeo, soft(new THREE.Color(0xcc4444),.4));
    smile.rotation.z = Math.PI;
    smile.position.set(0,2.46*s,.265*s);
    g.add(smile);

    // Neck
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(.1*s,.12*s,.22*s,8), soft(skinC,.65));
    neck.position.y = 2.24*s; g.add(neck);

    // Torso
    const torso = new THREE.Mesh(new THREE.BoxGeometry(.52*s,.8*s,.3*s), soft(shirtC,.7));
    torso.position.y = 1.65*s; torso.castShadow = true; g.add(torso);

    // Arms
    [-1,1].forEach(dx => {
      const upper = new THREE.Mesh(new THREE.CylinderGeometry(.1*s,.1*s,.55*s,7), soft(shirtC,.72));
      upper.rotation.z = dx*.35;
      upper.position.set(dx*.38*s,1.85*s,0); g.add(upper);
      const lower = new THREE.Mesh(new THREE.CylinderGeometry(.085*s,.08*s,.5*s,7), soft(skinC,.65));
      lower.rotation.z = dx*.5;
      lower.position.set(dx*.56*s,1.4*s,0); g.add(lower);
      const hand = new THREE.Mesh(new THREE.SphereGeometry(.1*s,8,7), soft(skinC,.6));
      hand.position.set(dx*.7*s,1.1*s,0); g.add(hand);
    });

    // Legs
    [-1,1].forEach(dx => {
      const thigh = new THREE.Mesh(new THREE.CylinderGeometry(.13*s,.12*s,.55*s,7), soft(pantsC,.75));
      thigh.position.set(dx*.14*s,.98*s,0); g.add(thigh);
      const shin = new THREE.Mesh(new THREE.CylinderGeometry(.11*s,.1*s,.52*s,7), soft(pantsC.clone().lerp(new THREE.Color(0x222222),.25),.8));
      shin.position.set(dx*.14*s,.44*s,0); g.add(shin);
      const shoe = new THREE.Mesh(new THREE.BoxGeometry(.2*s,.12*s,.32*s), soft(new THREE.Color(0x222222),.8));
      shoe.position.set(dx*.14*s,.1*s,.06*s); g.add(shoe);
    });

    // Subtle idle bob
    floaters.push({mesh:g, baseY:0, speed:.6+Math.random()*.3, amp:.045*s});
    return place(g,x,z);
  }

  // ── CROWD — loose ring of small background figures ─────────────────────────
  function buildCrowd(x,z,s){
    const g = new THREE.Group();
    for(let i=0;i<8;i++){
      const fig = new THREE.Group();
      const a=(i/8)*Math.PI*2, r=(.8+Math.random()*.8)*s*3;
      const px=Math.cos(a)*r, pz=Math.sin(a)*r;
      const sc2=s*(0.55+Math.random()*.35);
      const sc3=accentC.clone().lerp(fogC,Math.random()*.6);
      // simplified silhouette: body + head
      const body=new THREE.Mesh(new THREE.BoxGeometry(.45*sc2,.7*sc2,.28*sc2),soft(sc3.clone().lerp(groundC,Math.random()*.4),.8));
      body.position.y=.55*sc2;fig.add(body);
      const head=new THREE.Mesh(new THREE.SphereGeometry(.22*sc2,8,7),soft(lightC.clone().lerp(new THREE.Color(0xf0c090),.6),.65));
      head.position.y=1.2*sc2;fig.add(head);
      [[-1,1],[1,1]].forEach(([dx])=>{
        const leg=new THREE.Mesh(new THREE.CylinderGeometry(.09*sc2,.08*sc2,.5*sc2,5),soft(sc3.clone().lerp(new THREE.Color(0x334455),.5)));
        leg.position.set(dx*.13*sc2,.22*sc2,0);fig.add(leg);
      });
      fig.position.set(px,0,pz);
      g.add(fig);
      floaters.push({mesh:fig,baseY:0,speed:.4+Math.random()*.5,amp:.03*sc2});
    }
    return place(g,x,z);
  }

  // ── SPEECH BUBBLE — billboard that always faces camera ────────────────────
  // speechBubbles array collects them so the animate loop can face them
  const speechBubbles = [];
  function buildSpeechBubble(x,z,s,gl,text){
    const msg = (text && String(text).trim()) || '…';
    // Create a canvas texture for the bubble text
    const cvs = document.createElement('canvas');
    cvs.width = 256; cvs.height = 128;
    const ctx2 = cvs.getContext('2d');
    // Bubble background
    ctx2.fillStyle = 'rgba(255,255,255,0.92)';
    ctx2.beginPath();
    ctx2.roundRect(4,4,248,88,20);
    ctx2.fill();
    // Tail
    ctx2.fillStyle = 'rgba(255,255,255,0.92)';
    ctx2.beginPath();
    ctx2.moveTo(60,92);ctx2.lineTo(40,118);ctx2.lineTo(90,92);
    ctx2.fill();
    // Text
    ctx2.fillStyle = '#222244';
    ctx2.font = 'bold 22px sans-serif';
    ctx2.textAlign = 'center';
    ctx2.textBaseline = 'middle';
    // Wrap into two lines if long
    const words = msg.split(' ');
    let lines = [];
    let cur = '';
    words.forEach(w => {
      const test = cur ? cur+' '+w : w;
      if(ctx2.measureText(test).width > 220 && cur){lines.push(cur);cur=w;}
      else cur=test;
    });
    if(cur) lines.push(cur);
    lines = lines.slice(0,2);
    const lineH = 28;
    const startY = 48 - (lines.length-1)*lineH/2;
    lines.forEach((ln,i) => ctx2.fillText(ln, 128, startY+i*lineH));

    const tex = new THREE.CanvasTexture(cvs);
    const mat = new THREE.MeshBasicMaterial({map:tex,transparent:true,depthWrite:false,side:THREE.DoubleSide});
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1.6*s,.8*s), mat);
    // Float a bit above a nearby person height
    mesh.position.set(x, 3.8*s, z);
    scene.add(mesh);
    speechBubbles.push(mesh);
    return mesh;
  }

  const builders = {
    // Original
    tree:buildTree, willow:buildWillow, pine:buildPine, house:buildHouse,
    mountain:buildMountain, moon:buildMoon, sun:buildSun, water:buildWater,
    flower:buildFlower, bird:buildBird, stars:buildStars, lantern:buildLantern,
    path:buildPath, arch:buildArch, stone:buildStone, grass:buildGrass,
    // New nature
    oak:buildOak, bush:buildBush, bamboo:buildBamboo, fern:buildFern,
    mushroom:buildMushroom, waterfall:buildWaterfall,
    // New weather/sky
    cloud:buildCloud, rainbow:buildRainbow,
    // New animals
    butterfly:buildButterfly, cat:buildCat, dog:buildDog,
    rabbit:buildRabbit, horse:buildHorse, deer:buildDeer,
    // New structures
    cabin:buildCabin, castle:buildCastle, fence:buildFence, bench:buildBench,
    bridge:buildBridge, well:buildWell, windmill:buildWindmill, lighthouse:buildLighthouse,
    hill:buildHill,
    // New props
    balloon:buildBalloon, kite:buildKite, boat:buildBoat,
    campfire:buildCampfire, tent:buildTent, umbrella:buildUmbrella,
    // Characters
    person:buildPerson, crowd:buildCrowd, speech_bubble:buildSpeechBubble,
  };
  const sky3d = ['moon','sun','stars','cloud','rainbow','balloon','kite','butterfly'];
  const starMeshes = [];

  (sd.objects || []).forEach(obj => {
    const fn = builders[obj.type]; if (!fn) return;
    const n = Math.min(obj.count || 1, 12);
    if (sky3d.includes(obj.type)) {
      const m = fn(0,0,obj.scale||1,obj.glowing||false);
      if(obj.type==='stars') starMeshes.push(m);
      return;
    }
    for (let i = 0; i < n; i++) {
      const a = (i/n)*Math.PI*2 + Math.random()*.7, r = 3 + Math.random()*14;
      const px = Math.cos(a)*r, pz = Math.sin(a)*r-2;
      // speech_bubble also needs speechText
      const mesh = obj.type === 'speech_bubble'
        ? fn(px, pz, obj.scale||1, obj.glowing||false, obj.speechText||'')
        : fn(px, pz, obj.scale||1, obj.glowing||false);
      if (mesh && obj.floating) floaters.push({ mesh, baseY: mesh.position.y, speed: .28+Math.random()*.55, amp: .28+Math.random()*.55 });
    }
  });

  let raf, tt = 0;
  function animate() {
    raf = requestAnimationFrame(animate); tt += .01;
    skyMat.uniforms.uTime.value = tt;
    pMat.uniforms.uTime.value = tt;
    for (let i = 0; i < pN; i++) { pPos[i*3+1] += .006+pPh[i]*.009; pPos[i*3] += Math.sin(tt*.4+pPh[i])*.006; if(pPos[i*3+1]>20) pPos[i*3+1]=0; }
    pGeo.attributes.position.needsUpdate = true;
    floaters.forEach(f => {
      if(f.type==='spin'){
        f.mesh.rotation.z += f.speed * .016;
      } else {
        f.mesh.position.y = (f.baseY||0) + Math.sin(tt*(f.speed||1))*(f.amp||.5)*(sd.dreamIntensity||.7);
      }
    });
    scene.children.forEach(c => { if(c.userData.fog){ c.position.x += c.userData.drift; if(c.position.x>50) c.position.x=-50; c.material.opacity=.02+Math.abs(Math.sin(tt*.25+c.userData.phase))*.04; }});
    starMeshes.forEach(s2 => { if(s2&&s2.material&&s2.material.uniforms&&s2.material.uniforms.uTime) s2.material.uniforms.uTime.value=tt; });
    // Speech bubbles always face the camera
    speechBubbles.forEach(sb => { sb.quaternion.copy(camera.quaternion); });
    controls.update(tt);
    renderer.render(scene, camera);
  }
  animate();

  const onResize = () => { const w=canvas.clientWidth,h=canvas.clientHeight; camera.aspect=w/h; camera.updateProjectionMatrix(); renderer.setSize(w,h,false); };
  window.addEventListener('resize', onResize);

  return () => { cancelAnimationFrame(raf); controls.dispose(); window.removeEventListener('resize',onResize); renderer.dispose(); };
}