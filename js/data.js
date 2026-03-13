// ─── TRIP DATA ───
const tripData = {
  'TRP-001': {title:'TRP-001',id:'TRP-001',status:'<span class="badge b-orange">In Transit</span>',vehicle:'MH-04-CG-7823',driver:'Ramesh Patil',vendor:'Sharma Transport',material:'🟤 Soil',gross:'28.4 MT',tare:'10.0 MT',net:'18.4 MT',wbtime:'08:10 AM',source:'Deonar Dumping Yard',dest:'📍 Bhiwandi Site 1'},
  'TRP-002': {title:'TRP-002',id:'TRP-002',status:'<span class="badge b-green">Delivered</span>',vehicle:'MH-04-BT-1192',driver:'Sunil Jadhav',vendor:'Gupta Logistics',material:'⬜ Stone',gross:'32.1 MT',tare:'10.0 MT',net:'22.1 MT',wbtime:'07:52 AM',source:'Deonar Dumping Yard',dest:'📍 Bhiwandi Site 2'},
  'TRP-003': {title:'TRP-003',id:'TRP-003',status:'<span class="badge b-green">Delivered</span>',vehicle:'MH-04-DK-4455',driver:'Manoj Singh',vendor:'BMC Fleet',material:'🟤 Soil',gross:'29.8 MT',tare:'10.0 MT',net:'19.8 MT',wbtime:'08:30 AM',source:'Deonar Dumping Yard',dest:'📍 Ulwe Site'},
  'TRP-004': {title:'TRP-004',id:'TRP-004',status:'<span class="badge b-blue">Loading</span>',vehicle:'MH-04-AB-3301',driver:'Prakash Mehta',vendor:'Sharma Transport',material:'🔵 Mixed',gross:'—',tare:'10.0 MT',net:'—',wbtime:'09:00 AM',source:'Deonar Dumping Yard',dest:'📍 Omkar Shet Site'},
  'TRP-005': {title:'TRP-005',id:'TRP-005',status:'<span class="badge b-orange">In Transit</span>',vehicle:'MH-04-ZX-9910',driver:'Dinesh Rao',vendor:'Gupta Logistics',material:'⬜ Stone',gross:'30.0 MT',tare:'10.0 MT',net:'20.0 MT',wbtime:'08:55 AM',source:'Deonar Dumping Yard',dest:'📍 Bhiwandi Site 2'},
  'TRP-006': {title:'TRP-006',id:'TRP-006',status:'<span class="badge b-green">Delivered</span>',vehicle:'MH-04-PQ-2277',driver:'Vijay Kumar',vendor:'BMC Fleet',material:'🟤 Soil',gross:'27.5 MT',tare:'10.0 MT',net:'17.5 MT',wbtime:'07:40 AM',source:'Deonar Dumping Yard',dest:'📍 Bhiwandi Site 1'},
};

// ─── GPS VEHICLE DATA ───
const DEONAR_YARD = [19.0430, 72.9175]; // Deonar Dumping Yard

const VEHICLES = {
  'MH-04-CG-7823': {
    label: 'CG-7823', shortId: 'CG-7823',
    driver: 'Ramesh Patil', vendor: 'Sharma Transport',
    material: '🟤 Soil', materialType: 'Soil',
    status: 'alert', statusLabel: 'In Transit',
    badgeClass: 'b-orange',
    dest: 'Bhiwandi Site 1',
    destLatLng: [19.0580, 72.9380],
    color: '#D4680A',
    progress: 0.68,
    alert: '⚠ Route deviation detected',
    netWt: '18.4 MT',
    tripId: 'TRP-001',
    routePoints: [
      [19.0430, 72.9175], [19.0460, 72.9220], [19.0500, 72.9280],
      [19.0530, 72.9310], [19.0555, 72.9345], [19.0580, 72.9380]
    ],
    currentPos: [19.0540, 72.9325],
    timeline: [
      {done:true, title:'Arrived at Deonar Yard', time:'08:00 AM'},
      {done:true, title:'Tare weight captured — 10.0 MT', time:'08:05 AM'},
      {done:true, title:'Loaded — Gross 28.4 MT · Net 18.4 MT', time:'08:10 AM'},
      {done:true, title:'Trip auto-created (TRP-001)', time:'08:10 AM'},
      {active:true, title:'In transit → Bhiwandi Site 1', time:'08:22 AM', note:'⚠ Route deviation near Govandi Naka', noteColor:'#D4680A'},
      {pending:true, title:'Deliver & unload at Bhiwandi Site 1', time:'ETA 09:15 AM'},
    ]
  },
  'MH-04-BT-1192': {
    label: 'BT-1192', shortId: 'BT-1192',
    driver: 'Sunil Jadhav', vendor: 'Gupta Logistics',
    material: '⬜ Stone', materialType: 'Stone',
    status: 'delivered', statusLabel: 'Delivered',
    badgeClass: 'b-green',
    dest: 'Bhiwandi Site 2',
    destLatLng: [19.0620, 72.9000],
    color: '#1A7A4A',
    progress: 1.0,
    alert: null,
    netWt: '22.1 MT',
    tripId: 'TRP-002',
    routePoints: [
      [19.0430, 72.9175], [19.0480, 72.9120], [19.0530, 72.9060],
      [19.0580, 72.9020], [19.0620, 72.9000]
    ],
    currentPos: [19.0620, 72.9000],
    timeline: [
      {done:true, title:'Arrived at yard · Loaded 22.1 MT Stone', time:'07:45 AM'},
      {done:true, title:'Trip auto-created (TRP-002)', time:'07:52 AM'},
      {done:true, title:'Departed → Bhiwandi Site 2', time:'07:52 AM'},
      {done:true, title:'Arrived at Bhiwandi Site 2', time:'08:30 AM'},
      {done:true, title:'Delivery confirmed & signed off', time:'08:38 AM'},
    ]
  },
  'MH-04-ZX-9910': {
    label: 'ZX-9910', shortId: 'ZX-9910',
    driver: 'Dinesh Rao', vendor: 'Gupta Logistics',
    material: '⬜ Stone', materialType: 'Stone',
    status: 'transit', statusLabel: 'In Transit',
    badgeClass: 'b-orange',
    dest: 'Omkar Shet Site',
    destLatLng: [19.0700, 72.8870],
    color: '#1A6DD4',
    progress: 0.45,
    alert: null,
    netWt: '20.0 MT',
    tripId: 'TRP-005',
    routePoints: [
      [19.0430, 72.9175], [19.0500, 72.9100], [19.0560, 72.9020],
      [19.0620, 72.8950], [19.0660, 72.8900], [19.0700, 72.8870]
    ],
    currentPos: [19.0545, 72.9025],
    timeline: [
      {done:true, title:'Loaded 20.0 MT Stone', time:'08:50 AM'},
      {done:true, title:'Trip auto-created (TRP-005)', time:'08:55 AM'},
      {active:true, title:'In transit → Omkar Shet Site', time:'08:55 AM'},
      {pending:true, title:'Deliver at Omkar Shet Site', time:'ETA 09:40 AM'},
    ]
  },
  'MH-04-DK-4455': {
    label: 'DK-4455', shortId: 'DK-4455',
    driver: 'Manoj Singh', vendor: 'BMC Fleet',
    material: '🟤 Soil', materialType: 'Soil',
    status: 'delivered', statusLabel: 'Delivered',
    badgeClass: 'b-green',
    dest: 'Ulwe Site',
    destLatLng: [19.0300, 72.9310],
    color: '#1A7A4A',
    progress: 1.0,
    alert: null,
    netWt: '19.8 MT',
    tripId: 'TRP-003',
    routePoints: [
      [19.0430, 72.9175], [19.0390, 72.9200], [19.0350, 72.9250],
      [19.0300, 72.9310]
    ],
    currentPos: [19.0300, 72.9310],
    timeline: [
      {done:true, title:'Loaded 19.8 MT Soil', time:'08:25 AM'},
      {done:true, title:'Trip auto-created (TRP-003)', time:'08:30 AM'},
      {done:true, title:'Departed → Ulwe Site', time:'08:30 AM'},
      {done:true, title:'Delivered at Ulwe Site', time:'09:05 AM'},
    ]
  },
  'MH-04-AB-3301': {
    label: 'AB-3301', shortId: 'AB-3301',
    driver: 'Prakash Mehta', vendor: 'Sharma Transport',
    material: '🔵 Mixed', materialType: 'Mixed',
    status: 'loading', statusLabel: 'Loading',
    badgeClass: 'b-blue',
    dest: 'Omkar Shet Site',
    destLatLng: [19.0700, 72.8870],
    color: '#6B3FA0',
    progress: 0.05,
    alert: null,
    netWt: '—',
    tripId: 'TRP-004',
    routePoints: [
      [19.0430, 72.9175], [19.0500, 72.9100], [19.0600, 72.9020],
      [19.0700, 72.8870]
    ],
    currentPos: [19.0430, 72.9175],
    timeline: [
      {done:true, title:'Arrived at Deonar Yard', time:'08:55 AM'},
      {active:true, title:'Loading in progress at yard', time:'09:00 AM'},
      {pending:true, title:'Weighbridge check & trip creation', time:'Pending'},
      {pending:true, title:'Depart → Omkar Shet Site', time:'Pending'},
    ]
  },
  'MH-04-PQ-2277': {
    label: 'PQ-2277', shortId: 'PQ-2277',
    driver: 'Vijay Kumar', vendor: 'BMC Fleet',
    material: '🟤 Soil', materialType: 'Soil',
    status: 'delivered', statusLabel: 'Delivered',
    badgeClass: 'b-green',
    dest: 'Bhiwandi Site 1',
    destLatLng: [19.0580, 72.9380],
    color: '#1A7A4A',
    progress: 1.0,
    alert: null,
    netWt: '17.5 MT',
    tripId: 'TRP-006',
    routePoints: [
      [19.0430, 72.9175], [19.0460, 72.9220], [19.0510, 72.9290],
      [19.0580, 72.9380]
    ],
    currentPos: [19.0580, 72.9380],
    timeline: [
      {done:true, title:'Loaded 17.5 MT Soil', time:'07:35 AM'},
      {done:true, title:'Departed → Bhiwandi Site 1', time:'07:40 AM'},
      {done:true, title:'Delivered at Bhiwandi Site 1', time:'08:15 AM'},
    ]
  },
  'MH-04-LM-5566': {
    label: 'LM-5566', shortId: 'LM-5566',
    driver: 'Arvind Kale', vendor: 'Sharma Transport',
    material: '⬜ Stone', materialType: 'Stone',
    status: 'transit', statusLabel: 'In Transit',
    badgeClass: 'b-orange',
    dest: 'Bhiwandi Site 2',
    destLatLng: [19.0620, 72.9000],
    color: '#1A6DD4',
    progress: 0.30,
    alert: null,
    netWt: '21.0 MT',
    tripId: 'TRP-007',
    routePoints: [
      [19.0430, 72.9175], [19.0455, 72.9140], [19.0490, 72.9100],
      [19.0540, 72.9055], [19.0580, 72.9025], [19.0620, 72.9000]
    ],
    currentPos: [19.0475, 72.9118],
    timeline: [
      {done:true, title:'Loaded 21.0 MT Stone', time:'09:05 AM'},
      {active:true, title:'In transit → Bhiwandi Site 2', time:'09:10 AM'},
      {pending:true, title:'Deliver at Bhiwandi Site 2', time:'ETA 09:50 AM'},
    ]
  },
  'MH-04-RN-8843': {
    label: 'RN-8843', shortId: 'RN-8843',
    driver: 'Santosh More', vendor: 'Gupta Logistics',
    material: '🟤 Soil', materialType: 'Soil',
    status: 'transit', statusLabel: 'In Transit',
    badgeClass: 'b-orange',
    dest: 'Ulwe Site',
    destLatLng: [19.0300, 72.9310],
    color: '#1A6DD4',
    progress: 0.55,
    alert: null,
    netWt: '18.9 MT',
    tripId: 'TRP-008',
    routePoints: [
      [19.0430, 72.9175], [19.0400, 72.9210], [19.0365, 72.9250],
      [19.0330, 72.9280], [19.0300, 72.9310]
    ],
    currentPos: [19.0370, 72.9240],
    timeline: [
      {done:true, title:'Loaded 18.9 MT Soil', time:'08:45 AM'},
      {active:true, title:'In transit → Ulwe Site', time:'08:50 AM'},
      {pending:true, title:'Deliver at Ulwe Site', time:'ETA 09:30 AM'},
    ]
  }
};

// ─── DESTINATION DATA ───
const DESTINATIONS = {
  'Bhiwandi Site 1':  { latLng: [19.2813, 73.0579], icon: '🏗️', type: 'Landfill' },
  'Bhiwandi Site 2':  { latLng: [19.2950, 73.0650], icon: '🏭', type: 'Depot' },
  'Ulwe Site':        { latLng: [18.9893, 73.0493], icon: '🏔️', type: 'Landfill' },
  'Omkar Shet Site':  { latLng: [19.0760, 72.8777], icon: '🔨', type: 'Construction' }
};

// ─── DIESEL DATA ───
const DIESEL_DRIVERS = {
  'MH-04-CG-7823': {driver:'Ramesh Patil', vendor:'Sharma Transport'},
  'MH-04-BT-1192': {driver:'Sunil Jadhav', vendor:'Gupta Logistics'},
  'MH-04-ZX-9910': {driver:'Dinesh Rao', vendor:'Gupta Logistics'},
  'MH-04-DK-4455': {driver:'Manoj Singh', vendor:'BMC Fleet'},
  'MH-04-AB-3301': {driver:'Prakash Mehta', vendor:'Sharma Transport'},
  'MH-04-PQ-2277': {driver:'Vijay Kumar', vendor:'BMC Fleet'},
  'MH-04-LM-5566': {driver:'Arvind Kale', vendor:'Sharma Transport'},
  'MH-04-RN-8843': {driver:'Santosh More', vendor:'Gupta Logistics'},
};

const DIESEL_ENTRIES = [
  {id:1,vehicle:'MH-04-CG-7823',driver:'Ramesh Patil',date:'09/03/2026 06:45',litres:'85 L',cost:'₹7,608',kmpl:'3.9 km/L',odo:'42,180 km',pump:'BPCL — Govandi',status:'<span class="badge b-green">Verified</span>'},
  {id:2,vehicle:'MH-04-BT-1192',driver:'Sunil Jadhav',date:'09/03/2026 06:50',litres:'90 L',cost:'₹8,055',kmpl:'4.1 km/L',odo:'38,920 km',pump:'HPCL — Chembur',status:'<span class="badge b-green">Verified</span>'},
  {id:3,vehicle:'MH-04-ZX-9910',driver:'Dinesh Rao',date:'09/03/2026 07:05',litres:'112 L',cost:'₹10,024',kmpl:'2.9 km/L',odo:'55,312 km',pump:'IOC — Mankhurd',status:'<span class="badge b-red">High Usage</span>'},
  {id:4,vehicle:'MH-04-DK-4455',driver:'Manoj Singh',date:'09/03/2026 07:10',litres:'78 L',cost:'₹6,981',kmpl:'4.2 km/L',odo:'29,445 km',pump:'BPCL — Govandi',status:'<span class="badge b-green">Verified</span>'},
  {id:5,vehicle:'MH-04-AB-3301',driver:'Prakash Mehta',date:'09/03/2026 07:15',litres:'95 L',cost:'₹8,503',kmpl:'3.1 km/L',odo:'61,088 km',pump:'IOC — Mankhurd',status:'<span class="badge b-red">High Usage</span>'},
  {id:6,vehicle:'MH-04-PQ-2277',driver:'Vijay Kumar',date:'09/03/2026 07:20',litres:'82 L',cost:'₹7,339',kmpl:'3.8 km/L',odo:'44,220 km',pump:'HPCL — Chembur',status:'<span class="badge b-green">Verified</span>'},
  {id:7,vehicle:'MH-04-LM-5566',driver:'Arvind Kale',date:'09/03/2026 07:30',litres:'88 L',cost:'₹7,876',kmpl:'4.0 km/L',odo:'33,660 km',pump:'BPCL — Govandi',status:'<span class="badge b-green">Verified</span>'},
  {id:8,vehicle:'MH-04-RN-8843',driver:'Santosh More',date:'09/03/2026 07:35',litres:'92 L',cost:'₹8,234',kmpl:'3.7 km/L',odo:'47,810 km',pump:'IOC — Mankhurd',status:'<span class="badge b-green">Verified</span>'},
];
