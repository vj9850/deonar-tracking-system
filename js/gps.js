// ─── GPS / GOOGLE MAPS ───────────────────────────────────────────────────────
let _map = null;
let _mapInitialized = false;
let _googleMapsReady = false;
let _pendingMapInit = false;
let _animating = true;
let _animInterval = null;
let _routesVisible = true;
let _currentLayer = 'roadmap';
let _selectedVehicleId = null;
let _markers = {};
let _routeLines = {};
let _destMarkers = {};
let _infoWindows = {};
let _activeInfoWindow = null;
let _roadPaths = {};       // vehicleId → [[lat,lng], ...] snapped to real roads

const _animState = {};     // vehicleId → { t, bearing }

function _ll(arr) { return { lat: arr[0], lng: arr[1] }; }
function _lerp(a, b, t) { return a + (b - a) * t; }

// Interpolate bearing accounting for 0/360 wrap
function _lerpBearing(a, b, t) {
  let diff = ((b - a + 540) % 360) - 180;
  return (a + diff * t + 360) % 360;
}

function _pointAlongRoute(route, t) {
  if (t >= 1) return route[route.length - 1];
  if (t <= 0) return route[0];
  const totalSegs = route.length - 1;
  const seg = Math.min(Math.floor(t * totalSegs), totalSegs - 1);
  const segT = (t * totalSegs) - seg;
  return [
    _lerp(route[seg][0], route[seg + 1][0], segT),
    _lerp(route[seg][1], route[seg + 1][1], segT)
  ];
}

// Called by Google Maps API script via callback
function _onGoogleMapsLoaded() {
  _googleMapsReady = true;
  if (_pendingMapInit) initGoogleMap();
}

function initGoogleMap() {
  if (!_googleMapsReady) { _pendingMapInit = true; return; }

  // If already initialized, just ensure the map fills its container
  if (_mapInitialized) {
    if (_map) google.maps.event.trigger(_map, 'resize');
    return;
  }

  // Don't initialize if the map box has no height yet (page still hidden / layout not settled).
  // Check the box (explicit CSS height) rather than #google-map (position:absolute → clientHeight=0 before init).
  const mapBox = document.getElementById('gps-map-box');
  const container = document.getElementById('google-map');
  if (!container || !mapBox || mapBox.clientHeight === 0) {
    setTimeout(initGoogleMap, 150);
    return;
  }

  _mapInitialized = true;

  _map = new google.maps.Map(container, {
    center: _ll(DEONAR_YARD),
    zoom: 13,
    mapTypeId: 'roadmap',
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: false,
    zoomControl: true,
    zoomControlOptions: { position: google.maps.ControlPosition.RIGHT_CENTER }
  });

  // Trigger resize at multiple intervals to handle slow mobile layout settling
  setTimeout(() => { if (_map) google.maps.event.trigger(_map, 'resize'); }, 150);
  setTimeout(() => { if (_map) google.maps.event.trigger(_map, 'resize'); }, 500);
  setTimeout(() => { if (_map) google.maps.event.trigger(_map, 'resize'); }, 1200);

  // Coordinate display on mouse move
  _map.addListener('mousemove', function(e) {
    const el = document.getElementById('map-coord-display');
    if (el) el.textContent = e.latLng.lat().toFixed(4) + '°N, ' + e.latLng.lng().toFixed(4) + '°E';
  });

  // Deonar Yard marker
  const yardMarker = new google.maps.Marker({
    position: _ll(DEONAR_YARD), map: _map,
    icon: _makeLabelIcon('Deonar Yard', '#0A1628'),
    title: 'Deonar Dumping Yard', zIndex: 10
  });
  const yardInfo = new google.maps.InfoWindow({
    content: '<div class="vp-inner"><div class="vp-head">🏭 Deonar Dumping Yard</div><div class="vp-row"><span class="vp-key">Type</span><span class="vp-val">SOURCE</span></div><div class="vp-row"><span class="vp-key">Coords</span><span class="vp-val">19.0430, 72.9175</span></div><div class="vp-row"><span class="vp-key">Status</span><span class="vp-val" style="color:#1A7A4A">OPERATIONAL</span></div></div>'
  });
  yardMarker.addListener('click', () => { _closeActiveInfo(); yardInfo.open(_map, yardMarker); _activeInfoWindow = yardInfo; });

  // Destination markers
  Object.entries(DESTINATIONS).forEach(([name, info]) => {
    const m = new google.maps.Marker({
      position: _ll(info.latLng), map: _map,
      icon: _makeLabelIcon(name, '#2D3748'), title: name, zIndex: 10
    });
    const iw = new google.maps.InfoWindow({
      content: `<div class="vp-inner"><div class="vp-head">${info.icon} ${name}</div><div class="vp-row"><span class="vp-key">Type</span><span class="vp-val">${info.type.toUpperCase()}</span></div><div class="vp-row"><span class="vp-key">Coords</span><span class="vp-val">${info.latLng[0].toFixed(4)}, ${info.latLng[1].toFixed(4)}</span></div></div>`
    });
    m.addListener('click', () => { _closeActiveInfo(); iw.open(_map, m); _activeInfoWindow = iw; });
    _destMarkers[name] = m;
  });

  // Fetch real road routes then build markers
  _initRoadRoutes();
}

// ── Instant load with fallback routes, then silently upgrade to road routes ───
function _initRoadRoutes() {
  // Step 1 — render everything immediately with straight-line fallback routes
  Object.entries(VEHICLES).forEach(([id, v]) => {
    _roadPaths[id] = v.routePoints;
    _buildRoutePolyline(id, v);
    _buildVehicleMarker(id, v);
  });
  _afterAllRoutesLoaded(); // map is live immediately

  // Step 2 — fetch real road routes in background; update polylines as they arrive
  const ds = new google.maps.DirectionsService();
  Object.entries(VEHICLES).forEach(([id, v]) => {
    ds.route({
      origin:      _ll(DEONAR_YARD),
      destination: _ll(v.destLatLng),
      travelMode:  google.maps.TravelMode.DRIVING,
      region: 'IN'
    }, (result, status) => {
      if (status !== 'OK') return; // keep straight-line fallback
      const path = [];
      result.routes[0].legs[0].steps.forEach(step => {
        step.path.forEach(p => path.push([p.lat(), p.lng()]));
      });
      _roadPaths[id] = path;
      if (_routeLines[id]) _routeLines[id].setPath(path.map(_ll));
    });
  });
}

function _buildRoutePolyline(id, v) {
  const isAlert = v.status === 'alert';
  const color = isAlert ? '#D4680A' : v.status === 'delivered' ? '#1A7A4A' : v.color;
  const isDashed = v.status === 'delivered' || v.status === 'loading';
  const gap = v.status === 'delivered' ? '12px' : '18px';

  _routeLines[id] = new google.maps.Polyline({
    path: _roadPaths[id].map(_ll),
    geodesic: true,
    strokeColor: color,
    strokeOpacity: isDashed ? 0 : 0.65,
    strokeWeight: 3,
    icons: isDashed ? [{
      icon: { path: 'M 0,-1 0,1', strokeOpacity: 0.7, scale: 3, strokeColor: color },
      offset: '0', repeat: gap
    }] : [],
    map: _map
  });
}

function _buildVehicleMarker(id, v) {
  const path = _roadPaths[id];
  const pos = (v.status === 'delivered' || v.status === 'loading')
    ? v.currentPos
    : _pointAlongRoute(path, v.progress);

  const initBearing = _vehicleBearing(v, v.progress, path);
  _animState[id] = { t: v.progress, bearing: initBearing };

  const marker = new google.maps.Marker({
    position: _ll(pos), map: _map,
    icon: _makeTruckIcon(v, id, initBearing),
    title: id, zIndex: v.status === 'alert' ? 1000 : 100
  });
  const infoWin = new google.maps.InfoWindow({ content: _makePopupHtml(id, v), maxWidth: 260 });
  _infoWindows[id] = infoWin;
  marker.addListener('click', () => selectVehicle(id));
  _markers[id] = marker;
}

function _afterAllRoutesLoaded() {
  _renderVehicleList();
  _renderChipStrip();
  _startAnimation();
  _updateMapTimestamp();
  setInterval(_updateMapTimestamp, 5000);
}

function _closeActiveInfo() {
  if (_activeInfoWindow) { _activeInfoWindow.close(); _activeInfoWindow = null; }
}

// ── Icon builders (SVG data URLs) ────────────────────────────────────────────
function _makeLabelIcon(text, bg) {
  const w = Math.max(80, text.length * 7 + 20);
  const h = 22;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
    <rect x="0" y="0" width="${w}" height="${h}" rx="4" fill="${bg}"/>
    <text x="${w/2}" y="15" text-anchor="middle" font-family="sans-serif" font-size="10" font-weight="600" fill="white">${_escXml(text)}</text>
  </svg>`;
  return {
    url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg),
    scaledSize: new google.maps.Size(w, h),
    anchor: new google.maps.Point(w / 2, h / 2)
  };
}

function _makeTruckIcon(v, id, bearing) {
  const isAlert    = v.status === 'alert';
  const isSelected = id === _selectedVehicleId;
  const isDelivered= v.status === 'delivered';
  const isLoading  = v.status === 'loading';
  const color      = isAlert ? '#D4680A' : isDelivered ? '#1A7A4A' : isLoading ? '#6B3FA0' : v.color;
  const hdg        = (bearing !== undefined) ? bearing : (_animState[id] ? _animState[id].bearing : 0);

  const bodyColor  = isDelivered ? '#aaa' : (isLoading ? '#8B6BBF' : color);
  const cabColor   = isDelivered ? '#999' : (isLoading ? '#6B3FA0' : (isAlert ? '#B85A08' : _darken(color)));
  const glassColor = isDelivered ? '#c8d8e0' : '#C8E8F8';
  const opacity    = isDelivered ? 0.55 : 1;
  const labelColor = isDelivered ? '#777' : color;
  const alertPrefix = isAlert ? '! ' : isDelivered ? 'v ' : '';

  const selRing   = isSelected ? `<circle cx="18" cy="14" r="18" fill="none" stroke="#0A1628" stroke-width="2.5" opacity="0.8"/>` : '';
  const alertRing = isAlert    ? `<circle cx="18" cy="14" r="17" fill="${color}" opacity="0.2"/>` : '';
  const alertDot  = isAlert    ? `<circle cx="9" cy="7" r="2" fill="#FF6B00"/>` : '';

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="46">
    ${alertRing}${selRing}
    <g transform="translate(18,14) rotate(${hdg.toFixed(1)}) translate(-9,-14)" opacity="${opacity}">
      <ellipse cx="9" cy="26.5" rx="6" ry="1.8" fill="rgba(0,0,0,0.18)"/>
      <rect x="2.5" y="10" width="13" height="14" rx="1.5" fill="${bodyColor}" stroke="${cabColor}" stroke-width="0.8"/>
      <line x1="2.5" y1="16" x2="15.5" y2="16" stroke="${_darken(bodyColor)}" stroke-width="0.7" opacity="0.5"/>
      <rect x="3" y="3.5" width="12" height="8" rx="2" fill="${cabColor}" stroke="${_darken(cabColor)}" stroke-width="0.8"/>
      <rect x="4.5" y="4.5" width="9" height="5" rx="1.5" fill="${glassColor}" opacity="0.9"/>
      <rect x="5" y="5" width="3" height="2" rx="0.8" fill="white" opacity="0.45"/>
      <rect x="3.5" y="2.5" width="3" height="2" rx="1" fill="#FFF9C4" stroke="#E6C800" stroke-width="0.4"/>
      <rect x="11.5" y="2.5" width="3" height="2" rx="1" fill="#FFF9C4" stroke="#E6C800" stroke-width="0.4"/>
      <rect x="3" y="1.5" width="12" height="1.5" rx="0.8" fill="${_darken(cabColor)}" opacity="0.7"/>
      <rect x="3" y="23" width="2.5" height="2" rx="0.7" fill="${isAlert ? '#FF4444' : '#FF9999'}" opacity="0.9"/>
      <rect x="12.5" y="23" width="2.5" height="2" rx="0.7" fill="${isAlert ? '#FF4444' : '#FF9999'}" opacity="0.9"/>
      <rect x="0" y="6" width="2.5" height="4.5" rx="1.2" fill="#333" stroke="#555" stroke-width="0.4"/>
      <rect x="15.5" y="6" width="2.5" height="4.5" rx="1.2" fill="#333" stroke="#555" stroke-width="0.4"/>
      <rect x="0" y="14" width="2.5" height="4.5" rx="1.2" fill="#333" stroke="#555" stroke-width="0.4"/>
      <rect x="15.5" y="14" width="2.5" height="4.5" rx="1.2" fill="#333" stroke="#555" stroke-width="0.4"/>
      <rect x="0" y="21" width="2.5" height="4.5" rx="1.2" fill="#333" stroke="#555" stroke-width="0.4"/>
      <rect x="15.5" y="21" width="2.5" height="4.5" rx="1.2" fill="#333" stroke="#555" stroke-width="0.4"/>
      ${alertDot}
    </g>
    <rect x="1" y="31" width="34" height="12" rx="2.5" fill="white" stroke="${labelColor}" stroke-width="1.5"/>
    <text x="18" y="41" text-anchor="middle" font-family="monospace" font-size="7.5" font-weight="700" fill="${labelColor}">${_escXml(alertPrefix + v.shortId)}</text>
  </svg>`;

  return {
    url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg),
    scaledSize: new google.maps.Size(36, 46),
    anchor: new google.maps.Point(18, 31)
  };
}

function _escXml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── Bearing / direction helpers ──────────────────────────────────────────────
function _bearing(from, to) {
  const φ1 = from[0] * Math.PI / 180, φ2 = to[0] * Math.PI / 180;
  const Δλ = (to[1] - from[1]) * Math.PI / 180;
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}

function _vehicleBearing(v, t, path) {
  const route = path || _roadPaths[Object.keys(VEHICLES).find(k => VEHICLES[k] === v)] || v.routePoints;
  if (!route || route.length < 2) return 0;
  if (v.status === 'delivered' || v.status === 'loading') {
    return _bearing(route[route.length - 2], route[route.length - 1]);
  }
  const totalSegs = route.length - 1;
  const seg = Math.min(Math.floor(t * totalSegs), totalSegs - 1);
  return _bearing(route[seg], route[Math.min(seg + 1, route.length - 1)]);
}

function _darken(hex) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, ((n >> 16) & 0xFF) - 40);
  const g = Math.max(0, ((n >>  8) & 0xFF) - 40);
  const b = Math.max(0, ( n        & 0xFF) - 40);
  return '#' + [r,g,b].map(v => v.toString(16).padStart(2,'0')).join('');
}

function _makePopupHtml(id, v) {
  const statusColors = { alert: '#D4680A', delivered: '#1A7A4A', transit: '#1A6DD4', loading: '#6B3FA0' };
  const sc = statusColors[v.status] || '#718096';
  return `<div class="vp-inner">
    <div class="vp-head">${v.label} <span style="font-size:9px;padding:2px 5px;border-radius:3px;background:${sc};color:#fff;font-weight:700">${v.statusLabel.toUpperCase()}</span></div>
    <div class="vp-row"><span class="vp-key">Driver</span><span class="vp-val">${v.driver}</span></div>
    <div class="vp-row"><span class="vp-key">Vendor</span><span class="vp-val">${v.vendor}</span></div>
    <div class="vp-row"><span class="vp-key">Material</span><span class="vp-val">${v.materialType} · ${v.netWt}</span></div>
    <div class="vp-row"><span class="vp-key">Destination</span><span class="vp-val">${v.dest}</span></div>
    <div class="vp-row"><span class="vp-key">Trip</span><span class="vp-val" style="color:#1A6DD4">${v.tripId}</span></div>
    ${v.alert ? `<div style="margin-top:6px;font-size:10px;color:#D4680A;font-weight:600">${v.alert}</div>` : ''}
    <div style="margin-top:8px"><div style="font-size:9px;color:#718096;margin-bottom:3px">ROUTE PROGRESS</div><div style="background:#EDF2F7;border-radius:3px;height:5px"><div style="background:${sc};height:100%;border-radius:3px;width:${Math.round(v.progress*100)}%"></div></div><div style="font-size:9px;color:#718096;margin-top:2px">${Math.round(v.progress*100)}% complete</div></div>
    <button onclick="selectVehicle('${id}')" style="margin-top:8px;width:100%;padding:5px;background:${sc};color:#fff;border:none;border-radius:4px;font-size:10px;font-weight:700;cursor:pointer;font-family:inherit">VIEW TIMELINE →</button>
  </div>`;
}

// ── Smooth animation (100 ms ticks, bearing interpolation) ───────────────────
// Speed: ~0.00037/tick × 10 ticks/s ≈ 0.0037/s (same as original 0.003/800ms)
const _TICK_MS   = 100;
const _STEP_SIZE = 0.00037;

function _startAnimation() {
  if (_animInterval) clearInterval(_animInterval);
  if (!_animating) return;

  _animInterval = setInterval(() => {
    if (!_animating || !_map) return;

    Object.entries(VEHICLES).forEach(([id, v]) => {
      if (v.status !== 'transit' && v.status !== 'alert') return;

      const state = _animState[id];
      if (!state) return;
      const path = _roadPaths[id] || v.routePoints;

      // Advance position
      state.t = Math.min(state.t + _STEP_SIZE, 0.98);
      if (state.t >= 0.98) state.t = 0.05;

      const pos = _pointAlongRoute(path, state.t);

      // Smooth bearing: interpolate toward actual heading (ease factor 0.15)
      const targetBearing = _bearing(
        _pointAlongRoute(path, Math.max(0, state.t - _STEP_SIZE * 2)),
        _pointAlongRoute(path, Math.min(1, state.t + _STEP_SIZE * 2))
      );
      state.bearing = _lerpBearing(state.bearing || 0, targetBearing, 0.15);

      if (_markers[id]) {
        _markers[id].setPosition(_ll(pos));
        _markers[id].setIcon(_makeTruckIcon(v, id, state.bearing));
        if (_activeInfoWindow && _activeInfoWindow === _infoWindows[id]) {
          _infoWindows[id].setContent(_makePopupHtml(id, v));
        }
      }
    });
  }, _TICK_MS);
}

function _stopAnimation() {
  if (_animInterval) { clearInterval(_animInterval); _animInterval = null; }
}

function toggleAnimation() {
  _animating = !_animating;
  const btn = document.getElementById('btn-animate-toggle');
  if (_animating) {
    _startAnimation();
    btn.textContent = '⏸ Pause';
    showToast('Live tracking resumed', 'success');
  } else {
    _stopAnimation();
    btn.textContent = '▶ Resume';
    showToast('Live tracking paused');
  }
}

function toggleRoutes() {
  _routesVisible = !_routesVisible;
  const btn = document.getElementById('btn-routes-toggle');
  Object.values(_routeLines).forEach(l => l.setMap(_routesVisible ? _map : null));
  btn.classList.toggle('active', _routesVisible);
  showToast(_routesVisible ? 'Routes shown' : 'Routes hidden');
}

function switchLayer(type) {
  if (_currentLayer === type || !_map) return;
  _currentLayer = type;
  _map.setMapTypeId(type === 'satellite' ? 'satellite' : 'roadmap');
  document.getElementById('btn-layer-satellite').classList.toggle('active', type === 'satellite');
  document.getElementById('btn-layer-streets').classList.toggle('active', type !== 'satellite');
}

function resetMapView() {
  if (_map) { _map.setCenter(_ll(DEONAR_YARD)); _map.setZoom(13); }
  showToast('Map view reset');
}

function _updateMapTimestamp() {
  const el = document.getElementById('map-last-update');
  if (el) {
    const now = new Date();
    el.textContent = 'Updated ' + now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }
}

// ── Vehicle list & chip strip ─────────────────────────────────────────────────
function _renderVehicleList() {
  const list = document.getElementById('vehicle-list');
  if (!list) return;
  const statusOrder = { alert: 0, transit: 1, loading: 2, delivered: 3 };
  let entries = Object.entries(VEHICLES).sort((a, b) => (statusOrder[a[1].status] || 99) - (statusOrder[b[1].status] || 99));

  if (_vehicleListFilter && _vehicleListFilter !== 'all') {
    const f = _vehicleListFilter;
    entries = entries.filter(([, v]) => f === 'transit' ? (v.status === 'transit' || v.status === 'alert') : v.status === f);
  }

  const borderColors = { alert:'var(--orange)', delivered:'var(--green)', loading:'var(--purple)', transit:'var(--accent)' };
  list.innerHTML = entries.map(([id, v]) => {
    const bc = borderColors[v.status] || 'var(--accent)';
    const progressColor = v.status === 'delivered' ? 'g' : v.status === 'alert' ? 'o' : '';
    return `<div class="card ${id === _selectedVehicleId ? 'selected' : ''}" style="cursor:pointer;border-left:3px solid ${bc};transition:all .15s;margin:0" onclick="selectVehicle('${id}')">
      <div class="card-body" style="padding:11px 14px">
        <div class="flex-sb" style="margin-bottom:5px">
          <div>
            <div class="mono fw700" style="font-size:12px">${id}</div>
            <div style="font-size:10px;color:var(--muted)">${v.material} · ${v.dest}</div>
          </div>
          <span class="badge ${v.badgeClass}">${v.statusLabel}</span>
        </div>
        <div style="font-size:11px;color:var(--muted)">${v.driver} · ${v.vendor}</div>
        ${v.alert ? `<div style="font-size:10px;color:var(--orange);margin-top:3px">${v.alert}</div>` : ''}
        <div class="prog" style="margin-top:7px"><div class="prog-fill ${progressColor}" style="width:${Math.round(v.progress*100)}%"></div></div>
        <div style="font-size:10px;color:var(--muted);margin-top:2px">${Math.round(v.progress*100)}% · ${v.netWt} · <span style="font-family:'IBM Plex Mono',monospace">${v.tripId}</span></div>
      </div>
    </div>`;
  }).join('') || '<div style="padding:20px;text-align:center;color:var(--muted);font-size:12px;grid-column:1/-1">No vehicles match this filter</div>';
}

function _renderTimeline(id, v) {
  const subEl = document.getElementById('gps-timeline-sub');
  if (subEl) subEl.textContent = `${id} — ${v.driver} · ${v.vendor} · ${v.tripId}`;
}

// ── Vehicle selection & side panel ───────────────────────────────────────────
function selectVehicle(id) {
  const v = VEHICLES[id];
  if (!v) return;
  _selectedVehicleId = id;

  if (_map && _markers[id]) {
    _map.panTo(_markers[id].getPosition());
    _map.setZoom(15);
    setTimeout(() => {
      _closeActiveInfo();
      _infoWindows[id].open(_map, _markers[id]);
      _activeInfoWindow = _infoWindows[id];
    }, 350);
  }

  Object.entries(_routeLines).forEach(([rid, line]) => {
    line.setOptions({ strokeWeight: rid === id ? 5 : 2, strokeOpacity: rid === id ? 0.9 : 0.3 });
  });
  Object.entries(_markers).forEach(([mid, marker]) => {
    const mv = VEHICLES[mid];
    if (mv) marker.setIcon(_makeTruckIcon(mv, mid));
  });

  const sub = document.getElementById('gps-map-sub');
  if (sub) sub.textContent = `Focused: ${id} → ${v.dest} · ${Math.round(v.progress*100)}% complete`;

  _openSidePanel(id, v);
  _renderChipStrip();
  _renderVehicleList();
  showToast('Tracking ' + id, 'success');
}

let _currentVehicleTab = 'overview';

function _isMobile() { return window.innerWidth <= 600; }

function _openSidePanel(id, v) {
  const panel = document.getElementById('gps-side-panel');
  panel.classList.add('open');
  if (_isMobile()) {
    const ov = document.getElementById('gps-panel-overlay');
    if (ov) ov.classList.add('open');
  }
  const statusColors = { alert:'#D4680A', delivered:'#1A7A4A', transit:'#1A6DD4', loading:'#6B3FA0' };
  document.getElementById('gsp-vehicle-id').innerHTML =
    `<span style="color:${statusColors[v.status]||'#718096'}">${id}</span>
     <span class="badge ${v.badgeClass}" style="margin-left:6px;font-size:9px">${v.statusLabel}</span>`;
  _currentVehicleTab = 'overview';
  _setActiveTab('overview');
  _renderPanelTab(id, v, 'overview');
  // Notify Google Maps of layout change after CSS transition completes (desktop only — on mobile panel is position:fixed, map size unchanged)
  if (!_isMobile()) setTimeout(() => { if (_map) google.maps.event.trigger(_map, 'resize'); }, 320);
}

function closeVehiclePanel() {
  document.getElementById('gps-side-panel').classList.remove('open');
  const ov = document.getElementById('gps-panel-overlay');
  if (ov) ov.classList.remove('open');
  _selectedVehicleId = null;
  Object.values(_routeLines).forEach(l => l.setOptions({ strokeWeight: 3, strokeOpacity: 0.65 }));
  Object.entries(_markers).forEach(([mid, marker]) => {
    const mv = VEHICLES[mid];
    if (mv) marker.setIcon(_makeTruckIcon(mv, mid));
  });
  const sub = document.getElementById('gps-map-sub');
  if (sub) sub.textContent = 'Deonar Yard · 8 vehicles';
  _renderChipStrip();
  _renderVehicleList();
  // Notify Google Maps of layout change after CSS transition completes (desktop only)
  if (!_isMobile()) setTimeout(() => { if (_map) google.maps.event.trigger(_map, 'resize'); }, 320);
}

function showAllVehiclesPanel() {
  const sec = document.getElementById('gps-all-vehicles-section');
  if (sec) sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function switchVehicleTab(tab) {
  if (!_selectedVehicleId) return;
  _currentVehicleTab = tab;
  _setActiveTab(tab);
  _renderPanelTab(_selectedVehicleId, VEHICLES[_selectedVehicleId], tab);
}

function _setActiveTab(tab) {
  ['overview','timeline','history'].forEach(t => {
    const el = document.getElementById('gsp-tab-' + t);
    if (el) el.classList.toggle('active', t === tab);
  });
}

function _renderPanelTab(id, v, tab) {
  const body = document.getElementById('gsp-body');
  if (!body) return;
  if (tab === 'overview') body.innerHTML = _buildOverviewTab(id, v);
  else if (tab === 'timeline') body.innerHTML = _buildTimelineTab(id, v);
  else if (tab === 'history') body.innerHTML = _buildHistoryTab(id, v);
}

function _buildOverviewTab(id, v) {
  const statusColors = { alert:'#D4680A', delivered:'#1A7A4A', transit:'#1A6DD4', loading:'#6B3FA0' };
  const sc = statusColors[v.status] || '#718096';
  const pct = Math.round(v.progress * 100);
  const lat = v.currentPos[0].toFixed(4);
  const lng = v.currentPos[1].toFixed(4);
  return `
    ${v.alert ? `<div style="background:#FFF7ED;border:1px solid #F59E0B;border-radius:8px;padding:9px 11px;font-size:11px;color:#D4680A;font-weight:600;margin-bottom:12px;line-height:1.4">⚠ ${v.alert}</div>` : ''}
    <div class="gsp-route-box">
      <div style="font-size:9px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px">Route Progress</div>
      <div class="gsp-route-ends">
        <span class="gsp-route-src">🏭 Deonar Yard</span>
        <span class="gsp-route-dest">📍 ${v.dest}</span>
      </div>
      <div style="background:var(--border-l);border-radius:4px;height:8px;overflow:hidden;margin-bottom:5px">
        <div style="background:${sc};height:100%;border-radius:4px;width:${pct}%;transition:width .5s ease"></div>
      </div>
      <div style="font-size:10px;color:var(--muted);text-align:center;font-family:'IBM Plex Mono',monospace">${pct}% complete · ${v.netWt}</div>
    </div>
    <div style="margin-bottom:14px">
      <div class="vi-row"><span class="vi-key">Trip ID</span><span class="vi-val mono" style="color:var(--accent)">${v.tripId}</span></div>
      <div class="vi-row"><span class="vi-key">Driver</span><span class="vi-val">${v.driver}</span></div>
      <div class="vi-row"><span class="vi-key">Vendor</span><span class="vi-val">${v.vendor}</span></div>
      <div class="vi-row"><span class="vi-key">Material</span><span class="vi-val">${v.material} ${v.materialType}</span></div>
      <div class="vi-row"><span class="vi-key">Net Wt.</span><span class="vi-val mono">${v.netWt}</span></div>
      <div class="vi-row"><span class="vi-key">Destination</span><span class="vi-val">${v.dest}</span></div>
      <div class="vi-row"><span class="vi-key">GPS</span><span class="vi-val mono" style="font-size:9px">${lat}°N ${lng}°E</span></div>
    </div>
    <div class="gsp-actions">
      <button class="btn btn-primary btn-sm" onclick="switchVehicleTab('timeline')">📋 Full Timeline</button>
      <button class="btn btn-outline btn-sm" onclick="switchVehicleTab('history')">🕐 Trip History</button>
      <button class="btn btn-outline btn-sm" onclick="openModal('modal-trip-detail')">📄 Trip Detail Sheet</button>
      ${v.alert ? `<button class="btn btn-sm btn-danger" onclick="openModal('modal-alert-detail')">⚠ View Alert Detail</button>` : ''}
    </div>`;
}

function _buildTimelineTab(id, v) {
  const items = v.timeline.map((item, i) => {
    const dotClass = item.done ? 'done' : item.active ? 'active' : 'pending';
    const dotContent = item.done ? '✓' : item.active ? '⟳' : '○';
    const note = item.note ? `<div style="font-size:10px;font-weight:600;margin-top:3px;color:${item.noteColor||'var(--orange)'}">⚠ ${item.note}</div>` : '';
    const isLast = i === v.timeline.length - 1;
    return `<div class="tl-item" ${isLast ? 'style="padding-bottom:0"' : ''}>
      <div class="tl-dot ${dotClass}">${dotContent}</div>
      <div style="padding-top:2px;min-width:0;flex:1">
        <div class="tl-title" style="font-size:12px;line-height:1.4">${item.title}</div>
        <div class="tl-time">${item.time}</div>${note}
      </div>
    </div>`;
  }).join('');
  return `
    <div style="font-size:9px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:12px">Current Trip · ${id}</div>
    <div class="timeline">${items}</div>
    <div style="margin-top:14px;padding-top:12px;border-top:1px solid var(--border-l)">
      <div class="gsp-actions">
        <button class="btn btn-outline btn-sm" onclick="openModal('modal-trip-detail')">📋 Full Trip Detail</button>
        ${v.alert ? `<button class="btn btn-sm btn-danger" onclick="openModal('modal-alert-detail')">⚠ View Alert</button>` : ''}
      </div>
    </div>`;
}

function _buildHistoryTab(id, v) {
  const base = parseInt(v.tripId.replace(/\D/g,'')) || 10;
  const pastTrips = [
    { date:'10 Mar', trip:'TRP-'+(base-1), dest:v.dest,            wt:'19.2 MT', time:'07:20–08:15' },
    { date:'09 Mar', trip:'TRP-'+(base-2), dest:'Bhiwandi Site 2',  wt:'20.8 MT', time:'06:50–07:55' },
    { date:'09 Mar', trip:'TRP-'+(base-3), dest:'Bhiwandi Site 1',  wt:'17.6 MT', time:'09:10–10:05' },
    { date:'08 Mar', trip:'TRP-'+(base-4), dest:'Ulwe Site',         wt:'22.0 MT', time:'08:30–09:30' },
    { date:'08 Mar', trip:'TRP-'+(base-5), dest:'Salt Pans',   wt:'18.5 MT', time:'11:00–11:55' },
  ];
  const totalWt = pastTrips.reduce((s,t) => s + parseFloat(t.wt), 0).toFixed(1);
  const rows = pastTrips.map(t => `<tr>
    <td><span style="font-family:'IBM Plex Mono',monospace;color:var(--accent);font-size:10px">${t.trip}</span><br><span style="color:var(--muted);font-size:9px">${t.date}</span></td>
    <td style="max-width:100px;word-break:break-word">${t.dest}</td>
    <td style="font-family:'IBM Plex Mono',monospace;white-space:nowrap">${t.wt}</td>
    <td style="color:var(--muted);white-space:nowrap;font-size:9px">${t.time}</td>
  </tr>`).join('');
  return `
    <div class="gsp-hist-stats">
      <div class="gsp-hist-stat"><div class="gsp-hist-stat-val" style="color:var(--accent)">${pastTrips.length}</div><div class="gsp-hist-stat-label">Trips Today</div></div>
      <div class="gsp-hist-stat"><div class="gsp-hist-stat-val" style="color:var(--green)">${totalWt}</div><div class="gsp-hist-stat-label">MT Delivered</div></div>
    </div>
    <div style="font-size:9px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px">Past Trips — ${id}</div>
    <div class="gsp-hist-wrap">
      <table class="hist-table">
        <thead><tr><th>Trip</th><th>Destination</th><th>Wt.</th><th>Time</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <div style="margin-top:12px">
      <button class="btn btn-outline btn-sm" style="width:100%" onclick="navTo('trips','bn-trips')">📋 View All Trips →</button>
    </div>`;
}

function _renderChipStrip() {
  const strip = document.getElementById('vehicle-chip-strip');
  if (!strip) return;
  const statusColors = { alert:'#D4680A', delivered:'#1A7A4A', transit:'#1A6DD4', loading:'#6B3FA0' };
  const statusOrder = { alert: 0, transit: 1, loading: 2, delivered: 3 };
  strip.innerHTML = Object.entries(VEHICLES)
    .sort((a, b) => (statusOrder[a[1].status]||99) - (statusOrder[b[1].status]||99))
    .map(([id, v]) => {
      const sc = statusColors[v.status] || '#718096';
      return `<div class="vchip ${id === _selectedVehicleId ? 'selected' : ''}" style="border-color:${sc};color:${sc}" onclick="selectVehicle('${id}')">
        <div class="vchip-dot" style="background:${sc}"></div>
        ${v.shortId}${v.alert ? ' ⚠' : ''}
      </div>`;
    }).join('');
}

let _vehicleListFilter = 'all';
function filterVehicleList(f) {
  _vehicleListFilter = f;
  ['all','transit','alert','delivered'].forEach(ff => {
    const btn = document.getElementById('vl-filter-' + ff);
    if (btn) {
      if (ff === f) { btn.style.background='var(--accent)'; btn.style.color='#fff'; btn.style.borderColor='var(--accent)'; }
      else { btn.style.background=''; btn.style.color=''; btn.style.borderColor=''; }
    }
  });
  _renderVehicleList();
}
