// ─── CLOCK ───
function updateClock(){
  const d = new Date();
  document.getElementById('live-clock').textContent =
    d.toLocaleDateString('en-IN', {day:'2-digit', month:'short', year:'numeric'}) + ' · ' +
    d.toLocaleTimeString('en-IN', {hour:'2-digit', minute:'2-digit', second:'2-digit'});
}

// ─── NAVIGATION ───
const pageMeta = {
  dashboard:    {title:'Dashboard',           sub:'/ Overview'},
  trips:        {title:'Trip Management',     sub:'/ All Trips'},
  weighbridge:  {title:'Weighbridge',         sub:'/ API Log & Live Data'},
  gps:          {title:'Live GPS Tracking',   sub:'/ Vehicle Positions'},
  reports:      {title:'Reports & Export',    sub:'/ Analytics'},
  vehicles:     {title:'Vehicle Master',      sub:'/ Registered Vehicles'},
  vendors:      {title:'Vendor Master',       sub:'/ Contractors'},
  drivers:      {title:'Driver Master',       sub:'/ Registered Drivers'},
  destinations: {title:'Destinations',        sub:'/ Site Management'},
  diesel:       {title:'Diesel Management',   sub:'/ Fuel Consumption & Costs'},
  api:          {title:'API Monitor',         sub:'/ Weighbridge Integration'},
  alerts:       {title:'Alerts',              sub:'/ Notifications'},
  audit:        {title:'Audit Log',           sub:'/ System Trail'},
  settings:     {title:'Settings',            sub:'/ Configuration'},
};

function nav(id, el){
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.ni').forEach(n => n.classList.remove('active'));
  const pg = document.getElementById('page-' + id);
  if(pg) pg.classList.add('active');
  if(el) el.classList.add('active');
  // Also activate the sidebar item by data-page if el not passed
  if(!el){
    const si = document.querySelector('.ni[data-page="' + id + '"]');
    if(si) si.classList.add('active');
  }
  const m = pageMeta[id];
  if(m){
    document.getElementById('pg-title').textContent = m.title;
    document.getElementById('pg-sub').textContent = m.sub;
  }
  document.querySelector('.content').scrollTop = 0;
  // Init map when GPS page is opened
  if(id === 'gps') setTimeout(initGoogleMap, 200);
}

// ─── MOBILE NAV HELPER ───
// Navigates, closes sidebar, and sets bottom nav active state
function navTo(pageId, bnId){
  nav(pageId, null);
  closeSidebar();
  setBnActive(bnId || null);
  if(pageId === 'gps') setTimeout(initGoogleMap, 200);
}

// ─── MODALS ───
function openModal(id){ document.getElementById(id).classList.add('open'); }
function closeModal(id){ document.getElementById(id).classList.remove('open'); }

// ─── TOAST ───
function showToast(msg, type=''){
  const c = document.getElementById('toast-container');
  const t = document.createElement('div');
  t.className = 'toast' + (type ? ' ' + type : '');
  const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️';
  t.innerHTML = `<span>${icon}</span><span>${msg}</span>`;
  c.appendChild(t);
  setTimeout(() => { t.style.animation = 'slideOut .3s ease forwards'; setTimeout(() => t.remove(), 300); }, 2800);
}

// ─── CONFIRM ───
let _confirmCb = null;
function confirmAction(msg, cb){
  document.getElementById('confirm-msg').textContent = msg;
  _confirmCb = cb;
  document.getElementById('confirm-btn-yes').onclick = () => { if(_confirmCb) _confirmCb(); closeModal('modal-confirm'); };
  openModal('modal-confirm');
}

// ─── MOBILE SIDEBAR ───
function toggleSidebar(){
  const sb = document.querySelector('.sb');
  const ov = document.getElementById('sb-overlay');
  const hb = document.getElementById('hamburger-btn');
  const open = sb.classList.toggle('open');
  ov.classList.toggle('show', open);
  if(hb) hb.classList.toggle('open', open);
  document.body.style.overflow = open ? 'hidden' : '';
}

function closeSidebar(){
  const sb = document.querySelector('.sb');
  if(!sb || !sb.classList.contains('open')) return;
  sb.classList.remove('open');
  const ov = document.getElementById('sb-overlay');
  if(ov) ov.classList.remove('show');
  const hb = document.getElementById('hamburger-btn');
  if(hb) hb.classList.remove('open');
  document.body.style.overflow = '';
}

function setBnActive(id){
  document.querySelectorAll('.bn-item').forEach(b => b.classList.remove('active'));
  if(id){ const el = document.getElementById(id); if(el) el.classList.add('active'); }
}
