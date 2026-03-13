// ─── INITIALIZATION ───
document.addEventListener('DOMContentLoaded', () => {
  // Start live clock
  updateClock();
  setInterval(updateClock, 1000);

  // Set bottom nav default active state
  setBnActive('bn-dashboard');

  // Periodic map timestamp update fallback
  setInterval(() => {
    const t = document.getElementById('map-last-update');
    if(t) t.textContent = 'Updated just now';
  }, 5000);

  // Load Google Maps dynamically — key comes from config.js (git-ignored)
  const key = window.APP_CONFIG && window.APP_CONFIG.googleMapsApiKey;
  if (key && key !== 'YOUR_GOOGLE_MAPS_API_KEY') {
    const s = document.createElement('script');
    s.defer = true;
    s.src = `https://maps.googleapis.com/maps/api/js?key=${key}&callback=_onGoogleMapsLoaded&loading=async`;
    document.head.appendChild(s);
  } else {
    console.warn('Google Maps: add your API key to public/js/config.js');
  }
});

// ─── MODAL CLICK-OUTSIDE TO CLOSE ───
document.querySelectorAll('.modal-overlay').forEach(o => {
  o.addEventListener('click', e => { if(e.target === o) o.classList.remove('open'); });
});

// ─── KEYBOARD SHORTCUTS ───
document.addEventListener('keydown', e => {
  if(e.key === 'Escape'){
    document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open'));
    closeSidebar();
  }
});
