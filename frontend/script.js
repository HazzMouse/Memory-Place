// ─────────────────────────────────────────────────────────────────────────────
// MAP LOGIC
// ─────────────────────────────────────────────────────────────────────────────

let map;
let tempLatLng = null;
let memories = [];
let editingMemoryId = null;

const memoryIcon = L.icon({
  iconUrl: 'marker.png',   // put your custom icon in /frontend
  iconSize: [44, 66],
  iconAnchor: [22, 66],
  popupAnchor: [0, -66]
});

window.onload = () => {
  map = L.map('map').setView([-33.8688, 151.2093], 13);
  map.zoomControl.setPosition('topright');


  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap'
  }).addTo(map);

  map.on('click', (e) => {
    tempLatLng = e.latlng;
    showForm();
  });

  document.getElementById('saveMemoryBtn').onclick = saveMemory;
  document.getElementById('cancelMemoryBtn').onclick = hideForm;

  loadMemories();
};

function showForm(isEditing = false) {
  document.getElementById('memoryForm').classList.remove('hidden');
  if (!isEditing) editingMemoryId = null;
}

function hideForm() {
  document.getElementById('memoryForm').classList.add('hidden');
  document.getElementById('memoryTitle').value = '';
  document.getElementById('memoryDescription').value = '';
}

async function saveMemory() {
  const title = document.getElementById('memoryTitle').value;
  const content = document.getElementById('memoryDescription').value;
  const memory = { title, content, location: tempLatLng, time: new Date().toISOString() };
  let res;
  if (editingMemoryId) {
    res = await fetch(`http://localhost:3000/api/memories/${editingMemoryId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(memory)
    });
  } else {
    res = await fetch('http://localhost:3000/api/memories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(memory)
    });
  }
  await res.json();
  hideForm();
  refreshMarkers();
}

function addMarker(memory) {
  // Add the memoryIcon to the marker
  const marker = L.marker([memory.location.lat, memory.location.lng], { icon: memoryIcon }).addTo(map);
  
  marker.bindPopup(`
    <div class="popup-inner">
      <div class="popup-title">${memory.title}</div>
      <div class="popup-content">${memory.content}</div>
      <small class="popup-time">${new Date(memory.time).toLocaleString()}</small>
      <div class="popup-actions">
        <button class="popup-btn popup-btn--dream" onclick="enterMemory('${memory.id}')">✦ Enter Memory</button>
        <button class="popup-btn popup-btn--edit" onclick="startEdit('${memory.id}')">Edit</button>
        <button class="popup-btn popup-btn--delete" onclick="deleteMemory('${memory.id}')">Delete</button>
      </div>
    </div>
  `);
}

async function loadMemories() {
  const res = await fetch('http://localhost:3000/api/memories');
  const data = await res.json();
  memories = data;
  data.forEach(memory => addMarker(memory));
}

async function startEdit(id) {
  const res = await fetch('http://localhost:3000/api/memories');
  const data = await res.json();
  const memory = data.find(m => m.id === id);
  document.getElementById('memoryTitle').value = memory.title;
  document.getElementById('memoryDescription').value = memory.content;
  tempLatLng = memory.location;
  editingMemoryId = id;
  showForm(true);
}

async function deleteMemory(id) {
  await fetch(`http://localhost:3000/api/memories/${id}`, { method: 'DELETE' });
  refreshMarkers();
}

async function refreshMarkers() {
  map.eachLayer(layer => { if (layer instanceof L.Marker) map.removeLayer(layer); });
  loadMemories();
}

// ─────────────────────────────────────────────────────────────────────────────
// ENTER MEMORY — triggers dream visualisation
// ─────────────────────────────────────────────────────────────────────────────

async function enterMemory(id) {
  // Find memory from cached list, or re-fetch
  let memory = memories.find(m => m.id === id);
  if (!memory) {
    const res = await fetch('http://localhost:3000/api/memories');
    const data = await res.json();
    memory = data.find(m => m.id === id);
  }
  if (!memory) return;

  // Build a rich prompt from title + content
  const prompt = [memory.title, memory.content].filter(Boolean).join('. ');
  launchDreamVisualiser(prompt, memory.title);
}

// ─────────────────────────────────────────────────────────────────────────────
// DREAM VISUALISER
// ─────────────────────────────────────────────────────────────────────────────

let cleanupFn = null;

function launchDreamVisualiser(prompt, memoryTitle) {
  const overlay = document.getElementById('dream-overlay');
  const canvas  = document.getElementById('dream-canvas');
  const loadingOvl = document.getElementById('dream-loading');
  const sceneTitle = document.getElementById('dream-title');
  const scenePrompt = document.getElementById('dream-prompt');
  const tagList = document.getElementById('dream-tags');

  overlay.style.display = 'block';
  loadingOvl.style.display = 'flex';

  parseMemory(prompt).then(sd => {
    // Defaults
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
    scenePrompt.textContent = `"${prompt}"`;
    tagList.innerHTML = sd.objects.slice(0, 5)
      .map(o => `<span class="dream-tag">${o.type}</span>`).join('');

    loadingOvl.style.display = 'none';

    requestAnimationFrame(() => {
      if (cleanupFn) { cleanupFn(); cleanupFn = null; }
      cleanupFn = buildScene(canvas, sd);
    });
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

function buildScene(canvas, sd) {
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

  const builders = { tree:buildTree,willow:buildWillow,pine:buildPine,house:buildHouse,mountain:buildMountain,moon:buildMoon,sun:buildSun,water:buildWater,flower:buildFlower,bird:buildBird,stars:buildStars,lantern:buildLantern,path:buildPath,arch:buildArch,stone:buildStone,grass:buildGrass };
  const sky3d = ['moon','sun','stars'];
  const starMeshes = [];

  (sd.objects || []).forEach(obj => {
    const fn = builders[obj.type]; if (!fn) return;
    const n = Math.min(obj.count || 1, 12);
    if (sky3d.includes(obj.type)) { const m = fn(0,0,obj.scale||1,obj.glowing||false); if(obj.type==='stars') starMeshes.push(m); return; }
    for (let i = 0; i < n; i++) {
      const a = (i/n)*Math.PI*2 + Math.random()*.7, r = 3 + Math.random()*14;
      const mesh = fn(Math.cos(a)*r, Math.sin(a)*r-2, obj.scale||1, obj.glowing||false);
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
    floaters.forEach(({mesh,baseY,speed,amp}) => { mesh.position.y = baseY + Math.sin(tt*speed)*amp*(sd.dreamIntensity||.7); });
    scene.children.forEach(c => { if(c.userData.fog){ c.position.x += c.userData.drift; if(c.position.x>50) c.position.x=-50; c.material.opacity=.02+Math.abs(Math.sin(tt*.25+c.userData.phase))*.04; }});
    starMeshes.forEach(s2 => { if(s2&&s2.material&&s2.material.uniforms&&s2.material.uniforms.uTime) s2.material.uniforms.uTime.value=tt; });
    controls.update(tt);
    renderer.render(scene, camera);
  }
  animate();

  const onResize = () => { const w=canvas.clientWidth,h=canvas.clientHeight; camera.aspect=w/h; camera.updateProjectionMatrix(); renderer.setSize(w,h,false); };
  window.addEventListener('resize', onResize);

  return () => { cancelAnimationFrame(raf); controls.dispose(); window.removeEventListener('resize',onResize); renderer.dispose(); };
}