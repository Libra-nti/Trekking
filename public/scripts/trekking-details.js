var trekking
var xmlGPX
let marker
var map
var gpxLayer
var url = "https://viaggiditony.it"

// ─────────────────────────────────────────────
// FETCH GPX
// ─────────────────────────────────────────────

async function fetchAndConvertToXML(urlGPX) {
    const response = await fetch(urlGPX);
    const binaryData = await response.arrayBuffer();
    const decoder = new TextDecoder('utf-8');
    return decoder.decode(binaryData);
}

// ─────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", () => {
    map = L.map('map').setView([51.505, -0.09], 13);
    mostraContenuto();
    generateStars(document.getElementById("rating").innerText);

    const imageModal = document.getElementById('imageModal');
    if (imageModal) {
        imageModal.addEventListener('show.bs.modal', event => {
            const triggerImg = event.relatedTarget;
            const imgSrc = triggerImg.getAttribute('data-bs-img');
            document.getElementById('modalImage').src = imgSrc;
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
    let trek;
    try {
        const id = document.getElementById("trekking-name").innerText;
        trek = await fetch(url + "/trekID/" + id, {
            method: 'GET',
            headers: { "Content-Type": "application/json" }
        }).then(r => r.json());
        trekking = trek;
    } catch (e) {
        console.error("Errore caricamento trek:", e);
        return;
    }

    try {
        // Fetch e parse GPX per il grafico altimetrico
        let mappa = await fetchAndConvertToXML(url + "/trekGPX/" + trek._id.toString());
        mappa = mappa.slice(1, -1);
        extractDataAndPlot(mappa);
        xmlGPX = mappa;

        // Tiles OpenStreetMap
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);

        // FIX: sostituito omnivore.gpx.parse() con leaflet-gpx (no eval, no unsafe-eval)
        // leaflet-gpx accetta direttamente la stringa XML del GPX
        const cleanGpx = trek.gpx.replace(/\\n/g, '').replace(/\\"/g, '"');
        gpxLayer = new L.GPX(cleanGpx, {
            async: true,
            polyline_options: {
                color: 'rgb(51, 136, 255)',
                weight: 3
            },
            marker_options: {
                startIconUrl: null,
                endIconUrl: null,
                shadowUrl: null
            }
        });

        gpxLayer.on('loaded', function (e) {
            map.fitBounds(e.target.getBounds());

            // Query Overpass per rifugi e bivacchi nell'area del percorso
            const bounds = e.target.getBounds();
            const south = bounds.getSouth();
            const west  = bounds.getWest();
            const north = bounds.getNorth();
            const east  = bounds.getEast();

            const queryOverpass = `[out:json][timeout:25];
(
  node["tourism"~"alpine_hut|wilderness_hut"](${south},${west},${north},${east});
  way["tourism"~"alpine_hut|wilderness_hut"](${south},${west},${north},${east});
  relation["tourism"~"alpine_hut|wilderness_hut"](${south},${west},${north},${east});
  node["amenity"="shelter"](${south},${west},${north},${east});
  way["amenity"="shelter"](${south},${west},${north},${east});
  relation["amenity"="shelter"](${south},${west},${north},${east});
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
            .then(data => addOverpassElementsToMap(data, map));

            // Ridimensiona la mappa
            map.invalidateSize();
            map.fitBounds(e.target.getBounds());
        });

        gpxLayer.addTo(map);
        carosello();

    } catch (e) {
        console.error("Errore caricamento mappa:", e);
    }
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

    elements.forEach(el => {
        if (el.type === 'node') nodesById[el.id] = el;
    });

    elements.forEach(el => {
        if (el.type === 'node' && el.lat && el.lon && el.tags) {
            L.marker([el.lat, el.lon], { icon: bivaccoIcon })
                .addTo(map)
                .bindPopup(el.tags.name || 'Senza nome');
        }

        if (el.type === 'way' && el.nodes?.length > 0) {
            const latlngs = el.nodes
                .map(id => nodesById[id])
                .filter(n => n)
                .map(n => [n.lat, n.lon]);

            if (latlngs.length > 0) {
                const avgLat = latlngs.reduce((sum, p) => sum + p[0], 0) / latlngs.length;
                const avgLon = latlngs.reduce((sum, p) => sum + p[1], 0) / latlngs.length;
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
var gpxDataGraph = []
var totalDistance

function toDecimal(distances) {
    for (var i = 0; i < distances.length; i++) {
        distanceDecimal[i] = distances[i].toFixed(2);
    }
}

function createElevationChart(distances, elevations) {
    toDecimal(distances);
    const ctx = document.getElementById('elevationChart').getContext('2d');
    chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: distanceDecimal,
            datasets: [{
                label: 'Dislivello (m)',
                data: elevations,
                borderColor: 'rgb(51, 136, 255)',
                fill: {
                    target: 'origin',
                    above: 'rgb(140, 176, 238)',
                }
            }]
        },
        options: {
            elements: {
                point: { pointStyle: "line", radius: 1, borderWidth: 0 }
            },
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                tooltip: {
                    enabled: true,
                    intersect: false,
                    mode: 'index',
                    axis: 'x',
                    callbacks: {
                        label: function (context) {
                            const index = context.dataIndex;
                            const data = context.dataset.data;
                            const y = context.parsed.y;
                            const x = distances[index];
                            let inclinazione = 'N/A';
                            if (index > 0) {
                                const prevValueY = data[index - 1];
                                const prevValueX = distances[index - 1];
                                const deltaY = y - prevValueY;
                                var deltaX = x * 1000 - prevValueX * 1000;
                                if (deltaX <= 1) deltaX = 1;
                                inclinazione = `${((deltaY / deltaX) * 100).toFixed(2)}%`;
                            }
                            return [`Dislivello (m): ${y}`, `Inclinazione: ${inclinazione}`];
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
                if (!marker) return;
                const chartElements = chart.getElementsAtEventForMode(event, 'index', { intersect: false }, false);
                if (chartElements.length > 0) {
                    const index = chartElements[0].index;
                    const point = gpxDataGraph[index];

                    // FIX: invece di marker._icon.style.transition = 'none' (bloccato da CSP style-src),
                    // aggiungiamo una classe CSS che fa la stessa cosa senza violare la CSP.
                    // Nel tuo CSS aggiungi: .marker-no-transition { transition: none !important; }
                    if (marker._icon) {
                        marker._icon.classList.add('marker-no-transition');
                    }
                    if (marker._shadow && marker._shadow.parentNode) {
                        marker._shadow.remove();
                    }
                    marker.setLatLng([point.lat, point.lon]);
                }
            }
        }
    });
}

function haversine(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function extractDataAndPlot(gpxText) {
    const cleanGpxText = gpxText.replace(/\\n/g, '').replace(/\\"/g, '"');
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(cleanGpxText, "application/xml");
    const trkpts = xmlDoc.getElementsByTagName('trkpt');
    let distances = [];
    let elevations = [];
    totalDistance = 0;
    let previousLat = null;
    let previousLon = null;
    gpxDataGraph = [];

    for (let i = 0; i < trkpts.length; i++) {
        const lat = parseFloat(trkpts[i].getAttribute('lat'));
        const lon = parseFloat(trkpts[i].getAttribute('lon'));
        const ele = parseFloat(trkpts[i].getElementsByTagName('ele')[0].textContent);
        gpxDataGraph[i] = { lat, lon, ele };

        if (previousLat !== null && previousLon !== null) {
            totalDistance += haversine(previousLat, previousLon, lat, lon);
        }
        distances.push(totalDistance);
        elevations.push(ele);
        previousLat = lat;
        previousLon = lon;
    }

    marker = L.marker([gpxDataGraph[0].lat, gpxDataGraph[0].lon]).addTo(map);
    createElevationChart(distances, elevations);
}

// ─────────────────────────────────────────────
// CAROSELLO FOTO
// ─────────────────────────────────────────────

function carosello() {
    for (var i = 1; i < trekking.numFoto + 1; i++) {
        var button = document.createElement("button");
        var carouselIndicator = document.getElementById("indicator");
        button.type = "button";
        button.ariaLabel = i;
        button.setAttribute('data-bs-target', '#carouselExampleIndicators');
        button.setAttribute('data-bs-slide-to', i - 1);

        var image = document.createElement("img");
        var carousel = document.createElement("div");

        if (i === 1) {
            button.classList = "active";
            carousel.classList = "carousel-item active";
        } else {
            carousel.classList = "carousel-item";
        }

        image.src = "https://res.cloudinary.com/dieh3kepz/image/upload/" + trekking.name + "-" + trekking.date + "/" + i + ".jpg";
        image.classList = "d-block";
        image.alt = "Foto n° " + i + " del trekking " + trekking.name;
        carousel.appendChild(image);
        document.getElementById("carosello").appendChild(carousel);
        carouselIndicator.appendChild(button);
    }
}

// ─────────────────────────────────────────────
// DOWNLOAD GPX
// ─────────────────────────────────────────────

function download() {
    const cleanGpxText = xmlGPX.replace(/\\n/g, '').replace(/\\/g, '');
    const blob = new Blob([cleanGpxText], { type: 'application/gpx+xml' });
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
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
    const container = document.getElementById('rating');
    const fullStars  = Math.floor(rating);
    const halfStars  = (rating % 1 >= 0.5) ? 1 : 0;
    const emptyStars = 5 - fullStars - halfStars;
    container.innerHTML = '';
    for (let i = 0; i < fullStars;  i++) container.innerHTML += `<span class="star">&#9733;</span>`;
    if (halfStars)                         container.innerHTML += `<span class="star-half">&#9733;</span>`;
    for (let i = 0; i < emptyStars; i++) container.innerHTML += `<span class="star-empty">&#9733;</span>`;
}