var trekking
var xmlGPX
let marker
var map
var gpxLayer
var url = "https://viaggiditony.it"

// ─────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", () => {
    map = L.map('map').setView([45.9, 9.4], 13);
    mostraContenuto();
    generateStars(document.getElementById("rating").innerText);

    const imageModal = document.getElementById('imageModal');
    if (imageModal) {
        imageModal.addEventListener('show.bs.modal', event => {
            const triggerImg = event.relatedTarget;
            document.getElementById('modalImage').src = triggerImg.getAttribute('data-bs-img');
        });
    }

    const btnDownload = document.getElementById("btn-download");
    if (btnDownload) {
        btnDownload.addEventListener("click", download);
    }
});

// ─────────────────────────────────────────────
// CARICA CONTENUTO TREKKING
// ─────────────────────────────────────────────

async function mostraContenuto() {
    // 1. Carica i dati del trekking
    let trek;
    try {
        const id = document.getElementById("trekking-name").innerText;
        trek = await fetch(url + "/trekID/" + encodeURIComponent(id), {
            method: 'GET',
            headers: { "Content-Type": "application/json" }
        }).then(r => r.json());
        
        trekking = trek;
    } catch (e) {
        console.error("Errore caricamento trek:", e);
        return;
    }

    // 2. Carica il GPX grezzo dall'endpoint dedicato (stringa XML pulita)
    let gpxString;
    try {
        const gpxResponse = await fetch(url + "/trekGPX/" + trek._id.toString());
        // /trekGPX restituisce JSON con la stringa XML dentro — la estraiamo e puliamo
        const gpxRaw = await gpxResponse.json();
       
        gpxString = gpxRaw
            .replace(/\\n/g, '\n')
            .replace(/\\"/g, '"')
            .replace(/^"|"$/g, ''); // rimuove eventuali virgolette esterne
        xmlGPX = gpxString;
         console.log(xmlGPX);
    } catch (e) {
        console.error("Errore caricamento GPX:", e);
        return;
    }

    // 3. Grafico altimetrico (parse XML diretto)
    try {
        extractDataAndPlot(gpxString);
    } catch (e) {
        console.error("Errore grafico:", e);
    }

    // 4. Mappa
    try {
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);

        // Passiamo la stringa GPX già pulita a leaflet-gpx
        gpxLayer = new L.GPX(gpxString, {
            async: true,
            polyline_options: {
                color: 'rgb(51, 136, 255)',
                weight: 3
            },
            marker_options: {
                startIconUrl: null,
                endIconUrl:   null,
                shadowUrl:    null
            }
        });

        gpxLayer.on('loaded', function(e) {
            map.fitBounds(e.target.getBounds());
            map.invalidateSize();

            // Query Overpass per rifugi/bivacchi
            const bounds = e.target.getBounds();
            const south = bounds.getSouth();
            const west  = bounds.getWest();
            const north = bounds.getNorth();
            const east  = bounds.getEast();

            const queryOverpass = `[out:json][timeout:25];
(
  node["tourism"~"alpine_hut|wilderness_hut"](${south},${west},${north},${east});
  way["tourism"~"alpine_hut|wilderness_hut"](${south},${west},${north},${east});
  node["amenity"="shelter"](${south},${west},${north},${east});
  way["amenity"="shelter"](${south},${west},${north},${east});
  node["name"~"bivacco|rifugio",i](${south},${west},${north},${east});
);
out body;
>;
out skel qt;`;

            fetch('https://overpass-api.de/api/interpreter', {
                method: 'POST',
                body: queryOverpass,
                headers: { 'Content-Type': 'text/plain' }
            })
            .then(res => res.json())
            .then(data => addOverpassElementsToMap(data, map))
            .catch(e => console.error("Errore Overpass:", e));
        });

        gpxLayer.on('error', function(e) {
            console.error("Errore leaflet-gpx:", e);
        });

        gpxLayer.addTo(map);
    } catch (e) {
        console.error("Errore mappa:", e);
    }

    // 5. Carosello foto
    carosello();
}

// ─────────────────────────────────────────────
// MARKER BIVACCHI / RIFUGI (Overpass)
// ─────────────────────────────────────────────

const bivaccoIcon = L.icon({
    iconUrl: '/loghi/bivacco.png',
    iconSize: [28, 28],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32]
});

function addOverpassElementsToMap(data, map) {
    const elements = data.elements;
    const nodesById = {};
    elements.forEach(el => { if (el.type === 'node') nodesById[el.id] = el; });

    elements.forEach(el => {
        if (el.type === 'node' && el.lat && el.lon && el.tags) {
            L.marker([el.lat, el.lon], { icon: bivaccoIcon })
                .addTo(map)
                .bindPopup(el.tags.name || 'Senza nome');
        }
        if (el.type === 'way' && el.nodes?.length > 0) {
            const latlngs = el.nodes.map(id => nodesById[id]).filter(n => n).map(n => [n.lat, n.lon]);
            if (latlngs.length > 0) {
                const avgLat = latlngs.reduce((s, p) => s + p[0], 0) / latlngs.length;
                const avgLon = latlngs.reduce((s, p) => s + p[1], 0) / latlngs.length;
                L.marker([avgLat, avgLon], { icon: bivaccoIcon })
                    .addTo(map)
                    .bindPopup(el.tags?.name || 'Senza nome');
            }
        }
    });
}

// ─────────────────────────────────────────────
// GRAFICO ALTIMETRICO
// ─────────────────────────────────────────────

var chart
var distanceDecimal = []
var gpxDataGraph    = []
var totalDistance

function haversine(lat1, lon1, lat2, lon2) {
    const R    = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a    = Math.sin(dLat/2)**2 +
                 Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLon/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function extractDataAndPlot(gpxText) {
    const parser  = new DOMParser();
    const xmlDoc  = parser.parseFromString(gpxText, "application/xml");

    // Controlla errori di parsing XML
    const parseError = xmlDoc.querySelector("parsererror");
    if (parseError) {
        console.error("Errore parsing GPX XML:", parseError.textContent);
        return;
    }

    const trkpts = xmlDoc.getElementsByTagName('trkpt');
    if (trkpts.length === 0) {
        console.error("Nessun punto trovato nel GPX");
        return;
    }

    let distances   = [];
    let elevations  = [];
    totalDistance   = 0;
    let prevLat     = null;
    let prevLon     = null;
    gpxDataGraph    = [];

    for (let i = 0; i < trkpts.length; i++) {
        const lat = parseFloat(trkpts[i].getAttribute('lat'));
        const lon = parseFloat(trkpts[i].getAttribute('lon'));
        const eleEl = trkpts[i].getElementsByTagName('ele')[0];
        const ele = eleEl ? parseFloat(eleEl.textContent) : 0;

        gpxDataGraph[i] = { lat, lon, ele };

        if (prevLat !== null) {
            totalDistance += haversine(prevLat, prevLon, lat, lon);
        }
        distances.push(totalDistance);
        elevations.push(ele);
        prevLat = lat;
        prevLon = lon;
    }

    // Marker iniziale sulla mappa
    marker = L.marker([gpxDataGraph[0].lat, gpxDataGraph[0].lon]).addTo(map);

    // Grafico
    distanceDecimal = distances.map(d => d.toFixed(2));
    const ctx = document.getElementById('elevationChart').getContext('2d');
    chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: distanceDecimal,
            datasets: [{
                label: 'Altitudine (m)',
                data: elevations,
                borderColor: 'rgb(51, 136, 255)',
                fill: { target: 'origin', above: 'rgb(140, 176, 238)' }
            }]
        },
        options: {
            elements: { point: { pointStyle: "line", radius: 1, borderWidth: 0 } },
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                tooltip: {
                    enabled: true,
                    intersect: false,
                    mode: 'index',
                    axis: 'x',
                    callbacks: {
                        label: function(context) {
                            const i  = context.dataIndex;
                            const y  = context.parsed.y;
                            const x  = distances[i];
                            let inc  = 'N/A';
                            if (i > 0) {
                                const dy  = y - elevations[i - 1];
                                let dx    = (x - distances[i - 1]) * 1000;
                                if (dx < 1) dx = 1;
                                inc = `${((dy / dx) * 100).toFixed(2)}%`;
                            }
                            return [`Altitudine: ${y} m`, `Inclinazione: ${inc}`];
                        }
                    }
                }
            },
            hover: { intersect: false },
            scales: {
                x: { title: { display: true, text: 'Distanza (km)' } },
                y: { title: { display: true, text: 'Altitudine (m)' } }
            },
            onHover: (event) => {
                if (!marker || !chart) return;
                const els = chart.getElementsAtEventForMode(event, 'index', { intersect: false }, false);
                if (els.length > 0) {
                    const point = gpxDataGraph[els[0].index];
                    if (marker._icon) marker._icon.classList.add('marker-no-transition');
                    if (marker._shadow?.parentNode) marker._shadow.remove();
                    marker.setLatLng([point.lat, point.lon]);
                }
            }
        }
    });
}

// ─────────────────────────────────────────────
// CAROSELLO FOTO
// ─────────────────────────────────────────────

function carosello() {
    for (let i = 1; i <= trekking.numFoto; i++) {
        const button = document.createElement("button");
        button.type = "button";
        button.ariaLabel = String(i);
        button.setAttribute('data-bs-target', '#carouselExampleIndicators');
        button.setAttribute('data-bs-slide-to', i - 1);
        if (i === 1) button.classList.add("active");

        const image = document.createElement("img");
        image.src     = `https://res.cloudinary.com/dieh3kepz/image/upload/${trekking.name}-${trekking.date}/${i}.jpg`;
        image.classList = "d-block";
        image.alt     = `Foto n° ${i} del trekking ${trekking.name}`;

        const carousel = document.createElement("div");
        carousel.classList = i === 1 ? "carousel-item active" : "carousel-item";
        carousel.appendChild(image);

        document.getElementById("carosello").appendChild(carousel);
        document.getElementById("indicator").appendChild(button);
    }
}

// ─────────────────────────────────────────────
// DOWNLOAD GPX
// ─────────────────────────────────────────────

function download() {
    const blob    = new Blob([xmlGPX], { type: 'application/gpx+xml' });
    const blobUrl = URL.createObjectURL(blob);
    const link    = document.createElement('a');
    link.href     = blobUrl;
    link.download = document.getElementById("trekking-name").innerText + '.gpx';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(blobUrl);
}

// ─────────────────────────────────────────────
// STELLE VALUTAZIONE
// ─────────────────────────────────────────────

function generateStars(rating) {
    const container  = document.getElementById('rating');
    const full       = Math.floor(rating);
    const half       = (rating % 1 >= 0.5) ? 1 : 0;
    const empty      = 5 - full - half;
    container.innerHTML = '';
    for (let i = 0; i < full;  i++) container.innerHTML += `<span class="star">&#9733;</span>`;
    if (half)                        container.innerHTML += `<span class="star-half">&#9733;</span>`;
    for (let i = 0; i < empty; i++) container.innerHTML += `<span class="star-empty">&#9733;</span>`;
}