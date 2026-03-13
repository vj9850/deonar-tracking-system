// ─── DIESEL MANAGEMENT ───

function prefillDieselDriver(){
  const vn = document.getElementById('dl-vehicle').value;
  const d = DIESEL_DRIVERS[vn];
  document.getElementById('dl-driver').value = d ? d.driver : '';
  document.getElementById('dl-vendor').value = d ? d.vendor : '';
}

function calcDieselCost(){
  const l    = parseFloat(document.getElementById('dl-litres').value) || 0;
  const r    = parseFloat(document.getElementById('dl-rate').value)   || 0;
  const odo  = parseFloat(document.getElementById('dl-odometer').value)  || 0;
  const prev = parseFloat(document.getElementById('dl-prev-odo').value)  || 0;
  if(l && r) document.getElementById('dl-cost').value = '₹' + (l * r).toFixed(2);
  if(odo && prev && odo > prev) {
    const dist = odo - prev;
    document.getElementById('dl-distance').value = dist + ' km';
    if(l) document.getElementById('dl-kmpl').value = (dist / l).toFixed(2) + ' km/L';
  }
}

function openDieselDetail(id){
  const e = DIESEL_ENTRIES.find(x => x.id === id); if(!e) return;
  document.getElementById('dd-title').textContent   = 'Diesel Entry — ' + e.vehicle;
  document.getElementById('dd-litres').textContent  = e.litres;
  document.getElementById('dd-cost').textContent    = e.cost;
  document.getElementById('dd-kmpl').textContent    = e.kmpl;
  document.getElementById('dd-vehicle').textContent = e.vehicle;
  document.getElementById('dd-driver').textContent  = e.driver;
  document.getElementById('dd-date').textContent    = e.date;
  document.getElementById('dd-pump').textContent    = e.pump;
  document.getElementById('dd-odo').textContent     = e.odo;
  document.getElementById('dd-status').innerHTML    = e.status;
  openModal('modal-diesel-detail');
}

function saveDieselEntry(){
  const v = document.getElementById('dl-vehicle').value;
  const l = document.getElementById('dl-litres').value;
  if(!v || !l){ showToast('Please select vehicle and enter litres', 'error'); return; }
  showToast('Diesel entry saved for ' + v, 'success');
  closeModal('modal-add-diesel');
}

function filterDieselTable(){
  const v = document.getElementById('df-vehicle').value.toLowerCase();
  document.querySelectorAll('#diesel-tbody tr').forEach(r => {
    r.style.display = (!v || (r.dataset.vehicle || '').toLowerCase() === v) ? '' : 'none';
  });
}
