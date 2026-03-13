// ─── TABLE SEARCH ───
function searchTable(tbodyId, q){
  q = q.toLowerCase();
  document.querySelectorAll('#' + tbodyId + ' tr').forEach(r => {
    r.style.display = r.textContent.toLowerCase().includes(q) ? '' : 'none';
  });
}

// ─── EXPORT UTILITIES ───
function exportCSV(){ showToast('CSV exported & downloading', 'success'); }
function doExport(fmt){ showToast(fmt.toUpperCase() + ' report generated & downloading', 'success'); }

// ─── VEHICLE GVW CALCULATION ───
function calcGVW(){
  const c = parseFloat(document.getElementById('nv-cap').value) || 0;
  const t = parseFloat(document.getElementById('nv-tare').value) || 0;
  if(c && t) document.getElementById('nv-gvw').value = (c + t).toFixed(1) + ' MT';
}
