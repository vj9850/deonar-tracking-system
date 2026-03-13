// ─── VEHICLE DETAIL ───
function openVehicleDetail(v){
  document.getElementById('vd-modal-title').textContent = 'Vehicle Detail — ' + v;
  openModal('modal-vehicle-detail');
}

// ─── VEHICLE FILTERS ───
function filterVehicles(){
  const s = document.getElementById('vf-status').value.toLowerCase();
  document.querySelectorAll('#v-tbody tr').forEach(r => {
    const rs = (r.dataset.status || '').toLowerCase();
    r.style.display = (!s || rs === s) ? '' : 'none';
  });
}

// ─── VEHICLE FORM ───
function saveVehicle(){
  const r = document.getElementById('nv-regno').value.trim();
  const t = document.getElementById('nv-type').value;
  const v = document.getElementById('nv-vendor').value;
  if(!r || !t || !v){ showToast('Please fill required fields (*)', 'error'); return; }
  showToast('Vehicle ' + r + ' registered', 'success');
  closeModal('modal-add-vehicle');
}
