// ─── TRIP DETAIL ───
function openTripDetail(id){
  const t = tripData[id]; if(!t) return;
  document.getElementById('td-title').textContent = 'Trip Detail — ' + t.id;
  document.getElementById('td-id').textContent = t.id;
  document.getElementById('td-status').innerHTML = t.status;
  document.getElementById('td-vehicle').textContent = t.vehicle;
  document.getElementById('td-driver').textContent = t.driver;
  document.getElementById('td-vendor').textContent = t.vendor;
  document.getElementById('td-material').textContent = t.material;
  document.getElementById('td-gross').textContent = t.gross;
  document.getElementById('td-tare').textContent = t.tare;
  document.getElementById('td-net').textContent = t.net;
  document.getElementById('td-wbtime').textContent = t.wbtime;
  document.getElementById('td-source').textContent = t.source;
  document.getElementById('td-dest').textContent = t.dest;
  openModal('modal-trip-detail');
}

function openTripTimeline(id){ openModal('modal-trip-timeline'); }

// ─── TRIP FILTERS ───
function filterTrips(){
  const status   = document.getElementById('ft-status').value.toLowerCase();
  const material = document.getElementById('ft-material').value.toLowerCase();
  const vendor   = document.getElementById('ft-vendor').value.toLowerCase();
  document.querySelectorAll('#trips-tbody tr').forEach(r => {
    const rs = (r.dataset.status   || '').toLowerCase();
    const rm = (r.dataset.material || '').toLowerCase();
    const rv = (r.dataset.vendor   || '').toLowerCase();
    const sm = !status   || rs === status;
    const mm = !material || rm === material;
    const vm = !vendor   || rv.includes(vendor.split(' ')[0].toLowerCase());
    r.style.display = (sm && mm && vm) ? '' : 'none';
  });
}

function searchTrips(q){
  q = q.toLowerCase();
  document.querySelectorAll('#trips-tbody tr').forEach(r => {
    r.style.display = r.textContent.toLowerCase().includes(q) ? '' : 'none';
  });
}
