const colors = { green: '#18755d', coral: '#ef725b', yellow: '#f5c445', ink: '#11201f', income: '#9a7bc1' };
const landmarks = [
  ['Statue of Liberty', 40.6892, -74.0445, 'statue-of-liberty', 'Statue_of_Liberty'],
  ['Brooklyn Bridge', 40.7061, -73.9969, 'brooklyn-bridge', 'Brooklyn_Bridge'],
  ['One World Trade Center', 40.7127, -74.0134, 'one-world-trade-center', 'World_Trade_Center_(2001–present)'],
  ['Washington Square Park', 40.7308, -73.9973, 'washington-square-park', 'Washington_Square_Park'],
  ['The High Line', 40.7480, -74.0048, 'high-line', 'High_Line_(New_York_City)'],
  ['Empire State Building', 40.7484, -73.9857, 'empire-state-building', 'Empire_State_Building'],
  ['Grand Central Terminal', 40.7527, -73.9772, 'grand-central-terminal', 'Grand_Central_Terminal'],
  ['Central Park', 40.7826, -73.9656, 'central-park', 'Central_Park'],
  ['MoMA', 40.7614, -73.9776, 'moma', 'Museum_of_Modern_Art'],
  ['Metropolitan Museum of Art', 40.7794, -73.9632, 'metropolitan-museum', 'Metropolitan_Museum_of_Art']
];
const map = L.map('layer-map', { zoomControl: false, scrollWheelZoom: true, dragging: true, touchZoom: true, keyboard: true, zoomSnap: .25 }).setView([40.735, -73.985], 12.4);
L.control.zoom({ position: 'bottomright' }).addTo(map);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap contributors' }).addTo(map);
const layers = { income: L.layerGroup().addTo(map), stations: L.layerGroup().addTo(map), flows: L.layerGroup().addTo(map), landmarks: L.layerGroup().addTo(map) };
let trips = [], stations = [], stationById = new Map(), flowPairs = [], incomeByZip = new Map(), zctaGeo = null, bikeRouteGeo = null;

function parseTime(value) { const [date, time] = value.split(' '); const [m, d, y] = date.split('/').map(Number); const [h, min] = time.split(':').map(Number); return { minute: h * 60 + min, date: new Date(2000 + y, m - 1, d, h, min) }; }
function money(v) { return v ? `$${Math.round(+v / 1000)}k median income` : 'Income unavailable'; }
function toggle(id, layer) { document.getElementById(id).addEventListener('change', e => e.target.checked ? map.addLayer(layer) : map.removeLayer(layer)); }

function addLandmarks() {
  landmarks.forEach(([name, lat, lng, image, article]) => {
    const preview = `<img src="assets/landmarks/${image}.jpg" alt="${name}" /><div><strong>${name}</strong><a href="https://en.wikipedia.org/wiki/${article}" target="_blank" rel="noopener">Photo: Wikimedia Commons</a></div>`;
    L.marker([lat, lng], { icon: L.divIcon({ className: 'landmark-marker', iconSize: [13, 13] }) })
      .bindTooltip(preview, { direction: 'top', offset: [0, -8], opacity: 1, className: 'landmark-preview' })
      .addTo(layers.landmarks);
  });
}
function renderMap() {
  const incomeValues = [...incomeByZip.values()].filter(d => Number.isFinite(d) && d > 0).sort(d3.ascending);
  // Clamp the scale to the 5th–95th percentile so one unusually wealthy ZIP
  // does not flatten the visual difference among the rest of the city.
  const incomeFloor = d3.quantile(incomeValues, .05);
  const incomeCeiling = d3.quantile(incomeValues, .95);
  const incomeColor = d3.scaleQuantize()
    .domain([incomeFloor, incomeCeiling])
    .range(['#e8e0f0', '#d1bfe1', '#ae91cf', '#8965b5', '#643d91', '#3f216a']);
  L.geoJSON(zctaGeo, {
    style: feature => ({
      color: '#fffaf0', weight: 1.25, opacity: .86,
      fillColor: feature.properties.income > 0 ? incomeColor(feature.properties.income) : '#d9d7d1', fillOpacity: .56
    }),
    onEachFeature: (feature, layer) => layer.bindTooltip(`<strong>${feature.properties.zip}</strong><br>${feature.properties.income > 0 ? money(feature.properties.income) : 'Income unavailable'}`, { sticky: true })
  }).addTo(layers.income);
  stations.forEach(d => {
    const radius = d.docks > 40 ? 9 : d.docks >= 30 ? 6.5 : 4.5;
    const capacity = d.docks > 40 ? 'large station · over 40 docks' : d.docks >= 30 ? 'medium station · 30–40 docks' : 'small station · 29 or fewer docks';
    L.circleMarker([d.lat, d.lng], { radius, className: 'station-marker', color: '#6e5011', fillColor: colors.yellow, fillOpacity: .9, weight: 1 }).bindTooltip(`<strong>${d.name}</strong><br>${d.docks} docks · ${capacity}<br>ZIP ${d.zip}`).addTo(layers.stations);
  });
  L.geoJSON(bikeRouteGeo, {
    style: feature => ({ color: colors.green, weight: 1 + Math.sqrt(feature.properties.count) / 2, opacity: .56 }),
    onEachFeature: (feature, layer) => {
      const { start, end, count } = feature.properties;
      layer.bindTooltip(`${stationById.get(start)?.name || start} → ${stationById.get(end)?.name || end}<br>${count} archived rides · bicycle-network estimate`);
    }
  }).addTo(layers.flows);
  addLandmarks();
  document.getElementById('map-summary').textContent = `${zctaGeo.features.length} ZIP areas · ${stations.length} stations · ${bikeRouteGeo.features.length} estimated high-use routes`;
}

function renderTripStrip(minute) {
  const active = trips.filter(d => d.startMinute <= minute && d.endMinute >= minute);
  const near = trips.filter(d => Math.abs(d.startMinute - minute) < 20 || Math.abs(d.endMinute - minute) < 20).slice(0, 340);
  const node = document.getElementById('trip-strip'); const width = node.clientWidth || 900; const height = 280;
  const svg = d3.select(node).selectAll('svg').data([null]).join('svg').attr('viewBox', `0 0 ${width} ${height}`).attr('width', width).attr('height', height);
  const x = d3.scaleLinear().domain([-74.03, -73.94]).range([20, width - 20]); const y = d3.scaleLinear().domain([40.67, 40.79]).range([height - 15, 15]);
  svg.selectAll('.ghost').data(near).join('line').attr('class', 'ghost').attr('x1', d => x(d.startLng)).attr('y1', d => y(d.startLat)).attr('x2', d => x(d.endLng)).attr('y2', d => y(d.endLat)).attr('stroke', '#42635a').attr('stroke-width', .5).attr('opacity', .35);
  svg.selectAll('.departure').data(near.filter(d => Math.abs(d.startMinute - minute) < 20)).join('circle').attr('class', 'departure').attr('cx', d => x(d.startLng)).attr('cy', d => y(d.startLat)).attr('r', 3).attr('fill', colors.green);
  svg.selectAll('.arrival').data(near.filter(d => Math.abs(d.endMinute - minute) < 20)).join('circle').attr('class', 'arrival').attr('cx', d => x(d.endLng)).attr('cy', d => y(d.endLat)).attr('r', 3).attr('fill', colors.coral);
  svg.selectAll('.active').data(active.slice(0, 150)).join('circle').attr('class', 'active').attr('cx', d => x((d.startLng + d.endLng) / 2)).attr('cy', d => y((d.startLat + d.endLat) / 2)).attr('r', 3.5).attr('fill', colors.yellow);
  document.getElementById('trip-count').textContent = `${active.length.toLocaleString()} rides active`;
}
function setupTimeline() { const slider = document.getElementById('time-slider'); const update = () => { const m = +slider.value; document.getElementById('time-readout').textContent = `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`; renderTripStrip(m); }; slider.addEventListener('input', update); update(); }

function renderWheel() {
  const totals = d3.rollup(trips, v => v.length, d => d.startId); const topIds = [...totals].sort((a,b) => b[1]-a[1]).slice(0,20).map(d => d[0]); const selected = topIds[0];
  const links = d3.rollups(trips.filter(d => topIds.includes(d.startId) && topIds.includes(d.endId)), v => v.length, d => d.startId, d => d.endId).flatMap(([source, entries]) => entries.map(([target, value]) => ({source, target, value}))).filter(d => d.value > 4);
  const names = topIds.map(id => stationById.get(id)?.name || `Station ${id}`); const width = 760, height = 620, center = [width/2, height/2], radius = 210; const angle = d3.scalePoint().domain(topIds).range([-.96*Math.PI, .96*Math.PI]);
  const svg = d3.select('#wheel').append('svg').attr('viewBox', `0 0 ${width} ${height}`); const g = svg.append('g');
  const positions = new Map(topIds.map(id => { const a=angle(id)-Math.PI/2; return [id, [center[0]+Math.cos(a)*radius, center[1]+Math.sin(a)*radius, a]]; }));
  const linkLayer = g.append('g'); const nodeLayer = g.append('g');
  function selectStation(id) {
    const related = links.filter(d => d.source === id || d.target === id); const outbound = d3.sum(related.filter(d => d.source === id), d => d.value); const inbound = d3.sum(related.filter(d => d.target === id), d => d.value);
    document.getElementById('station-name').textContent = stationById.get(id)?.name || `Station ${id}`; document.getElementById('station-stats').textContent = `${outbound.toLocaleString()} recorded departures and ${inbound.toLocaleString()} recorded arrivals among the 20 busiest stations.`;
    linkLayer.selectAll('path').attr('stroke-opacity', d => (d.source===id||d.target===id) ? .72 : .05).attr('stroke', d => d.source === id ? colors.coral : colors.green);
    nodeLayer.selectAll('circle').attr('fill', d => d === id ? colors.yellow : colors.ink).attr('r', d => d === id ? 9 : 5);
  }
  linkLayer.selectAll('path').data(links).join('path').attr('d', d => { const [a,b] = [positions.get(d.source), positions.get(d.target)]; return `M${a[0]},${a[1]} Q${center[0]},${center[1]} ${b[0]},${b[1]}`; }).attr('fill','none').attr('stroke-width', d => Math.min(7, .4 + Math.sqrt(d.value)/2)).attr('stroke', colors.green).attr('stroke-opacity', .12);
  const nodes = nodeLayer.selectAll('.node').data(topIds).join('g').attr('class','node').attr('transform', d => `translate(${positions.get(d)[0]},${positions.get(d)[1]})`).on('click', (_,d) => selectStation(d)); nodes.append('circle').attr('r',5).attr('fill',colors.ink); nodes.append('text').attr('class','node-label').attr('x', d => Math.cos(positions.get(d)[2]) * 14).attr('y', d => Math.sin(positions.get(d)[2]) * 14 + 3).attr('text-anchor', d => Math.cos(positions.get(d)[2]) > .1 ? 'start' : Math.cos(positions.get(d)[2]) < -.1 ? 'end' : 'middle').text(d => (stationById.get(d)?.name || '').replace(' & ', ' &\n'));
  selectStation(selected);
}

Promise.all([d3.csv('data/bikestation.csv'), d3.csv('data/trips.csv'), d3.json('data/incomecsv.json'), d3.json('data/nyc-zctas.geojson'), d3.json('data/estimated-bike-routes.geojson')]).then(([stationRows, tripRows, incomeRows, zipAreas, bikeRoutes]) => {
  incomeByZip = new Map(incomeRows.map(d => [String(d.zipcode).padStart(5, '0'), +d.income])); zctaGeo = zipAreas; bikeRouteGeo = bikeRoutes;
  stations = stationRows.map(d => ({ id:+d.id, name:d.name, lat:+d.latitude, lng:+d.longitude, docks:+d.totalDocks, zip:String(d.postalCode).padStart(5, '0'), income:incomeByZip.get(String(d.postalCode).padStart(5, '0')) })); stationById = new Map(stations.map(d => [d.id,d]));
  trips = tripRows.map(d => { const start=parseTime(d.starttime), end=parseTime(d.stoptime); return { startMinute:start.minute, endMinute:end.minute, startId:+d.start_station_id, endId:+d.end_station_id, startLat:+d.start_station_latitude, startLng:+d.start_station_longitude, endLat:+d.end_station_latitude, endLng:+d.end_station_longitude }; }).filter(d => Number.isFinite(d.startLat) && Number.isFinite(d.endLat));
  flowPairs = d3.rollups(trips, v => v.length, d => `${d.startId}-${d.endId}`).map(([key,count]) => { const [s,t]=key.split('-').map(Number); return { origin:stationById.get(s), destination:stationById.get(t), count }; }).filter(d => d.origin && d.destination && d.origin.id !== d.destination.id).sort((a,b)=>b.count-a.count).slice(0,110);
  renderMap(); setupTimeline(); renderWheel(); ['income','stations','flows','landmarks'].forEach(n => toggle(`toggle-${n}`, layers[n]));
}).catch(error => { console.error(error); document.getElementById('map-summary').textContent = 'Could not load the archived data. Please open this project through a local web server.'; });
