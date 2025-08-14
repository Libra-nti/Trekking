
var trekking
var xmlGPX
let marker
var map // Imposta una vista iniziale
var url = "https://viaggiditony.onrender.com"
//var url = "http://localhost:3100"

async function fetchAndConvertToXML(urlGPX) {
    // Effettua la fetch per ottenere i dati binari
    const response = await fetch(urlGPX);
    //consol.log(response)
    // Recupera il dato binario come ArrayBuffer
    const binaryData = await response.arrayBuffer();
    //consol.log(binaryData)
    // Usa TextDecoder per decodificare i dati binari in una stringa XML
    const decoder = new TextDecoder('utf-8');
    const xml = decoder.decode(binaryData);

    //consol.log(xml)
    // Ora xmlString contiene il contenuto XML decodificato
    return xml;
}

function removeFooter() {
    document.getElementsByClassName("video-footer")[0].remove()
}

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Funzione per mostrare il contenuto dopo il caricamento
async function mostraContenuto() {
    try{
        var id = document.getElementById("trekking-name").innerText
        console.log(id)
        var trek = await fetch(url + "/trekkID/" + id, {
        method: 'GET',
        headers: {
            "Content-Type": "application/json"
        },
    })
    .then(response =>  response.json()
      );
      console.log(trek)
    }
    catch(e){
        console.log(e)
    }
    try{
        var mappa = await fetchAndConvertToXML(url+trek._id.toString())
        mappa = mappa.slice(1,-1);
        extractDataAndPlot(mappa)
        xmlGPX = mappa
    
     
    // Aggiungi un layer di tile della mappa (OpenStreetMap)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);
    const gpxLayer = omnivore.gpx.parse(trek.gpx);
    // Aggiungi il layer GPX alla mappa
    gpxLayer.addTo(map);
    // Adatta la vista della mappa per includere l'intero percorso
    map.fitBounds(gpxLayer.getBounds());
    const bounds = gpxLayer.getBounds();  // map è l'istanza Leaflet
const south = bounds.getSouth();
const west = bounds.getWest();
const north = bounds.getNorth();
const east = bounds.getEast();

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
out skel qt;`
//console.log(queryOverpass)
fetch('https://overpass-api.de/api/interpreter', {
  method: 'POST',
  body: queryOverpass,
  headers: {
    'Content-Type': 'text/plain'
  }
})
.then(res => res.json())
.then(data => {
    //console.log(data)
    addOverpassElementsToMap(data, map);
});


    //wait(1000);  
    carosello()

    //removeFooter()
    if (window.map) {
        window.map.invalidateSize(); // Risistema le dimensioni della mappa
        map.fitBounds(gpxLayer.getBounds());

    } else {
        // Inizializza la mappa se non l'hai già fatto
        window.map = L.map('map').setView([45.931055, 9.432543], 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(window.map);
        //char
        // t.redraw()
    }
}
catch(e){
    console.log(e)
}
};


// Esegui la funzione quando la pagina è completamente caricata


const bivaccoIcon = L.icon({
  iconUrl: '/public/loghi/bivacco.png',   // Percorso al tuo file
  iconSize: [28, 28],           // Dimensioni icona
  iconAnchor: [16, 32],         // Punto che tocca la mappa (in basso al centro)
  popupAnchor: [0, -32]         // Dove appare il popup rispetto all'icona
});


function addOverpassElementsToMap(data, map) {
  const elements = data.elements;

  // Mappa per cercare facilmente i nodi per ID (serve per i way)
  const nodesById = {};
  elements.forEach(el => {
    if (el.type === 'node') {
      nodesById[el.id] = el;
    }
  });

  elements.forEach(el => {
    if (el.type === 'node' && el.lat && el.lon) {
        if(el.tags != null){
      const name = el.tags?.name ;
      L.marker([el.lat, el.lon], {icon: bivaccoIcon})
        .addTo(map)
        .bindPopup(name);
        }
    }

    // Se è un way, calcolo un centro medio dei nodi per metterci il marker
    if (el.type === 'way' && el.nodes?.length > 0) {
      const latlngs = el.nodes
        .map(id => nodesById[id])
        .filter(n => n)
        .map(n => [n.lat, n.lon]);

      if (latlngs.length > 0) {
        // Calcola centro geometrico
        const avgLat = latlngs.reduce((sum, p) => sum + p[0], 0) / latlngs.length;
        const avgLon = latlngs.reduce((sum, p) => sum + p[1], 0) / latlngs.length;
        const name = el.tags?.name || 'Senza nome';

        L.marker([avgLat, avgLon], {icon: bivaccoIcon})
          .addTo(map)
          .bindPopup(name);
      }
    }
  });
}



async function fetchData() {

            // Aggiungi un layer di tile della mappa (OpenStreetMap)
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            }).addTo(map);
            const gpxLayer = omnivore.gpx.parse(data.gpx);
            // Aggiungi il layer GPX alla mappa
            gpxLayer.addTo(map);
            // Adatta la vista della mappa per includere l'intero percorso
            map.fitBounds(gpxLayer.getBounds());
            
       
    //consol.log("finito")

};



var chart
var distanceDecimal = []

function toDecimal(distances){
    for(var i=0;i<distances.length;i++){
        distanceDecimal[i] = distances[i].toFixed(2)
    }
}



function createElevationChart(distances, elevations) {
    //consol.log(distances)
    //consol.log(elevations)
    toDecimal(distances)
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
                point:{
                    pointStyle: "line",
                    radius: 1,
                    borderWidth: 0
                }
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
                        label: function(context) {
                            const index = context.dataIndex;
                            const prevIndex = index - 1
                            const data = context.dataset.data;
                            const label = context.dataset.label || '';
                            const y = context.parsed.y;
                            const x = distances[index]
                            
                            
                            //consol.log(context)
                            // Calcolo inclinazione tra il punto corrente e il precedente
                            let inclinazione = 'N/A'; // Default se non c'è punto precedente
                            if (index > 0) {
                                //consol.log(context.label)
                                const prevValueY = data[index - 1];
                                const prevValueX = distances[index - 1];
                                const deltaY = y - prevValueY;
                                
                                var deltaX = x * 1000 - prevValueX * 1000; // Assumendo distanze uguali tra i punti
                                //consol.log(x)
                                //consol.log(prevValueX)
                                if (deltaX <= 1) {
                                    deltaX = 1
                                }
                                const inclinazionePercent = ((deltaY / deltaX) * 100).toFixed(2);
                                inclinazione = `${inclinazionePercent}%`;
                            }

                            // Mostra il valore e l'inclinazione nel tooltip
                            return [`Dislivello (m): ${y}`,
                                `Inclinazione: ${inclinazione}`
                            ];
                        }
                    }
                }
            },
            hover: {
                intersect: false // Permette di ottenere l'indice anche sotto il grafico
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Distanza (km)'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Altitudine (m)'
                    }
                }
            },
            onHover: (event) => {
                const chartElements = chart.getElementsAtEventForMode(event, 'index', {
                    intersect: false
                }, false);
                if (chartElements.length > 0) {
                    //consol.log(chartElements)
                    //consol.log(gpxDataGraph)
                    const index = chartElements[0].index;
                    const point = gpxDataGraph[index];
                    //  const datasetIndex = chartElements[0].datasetIndex;
                    //const value = chart.data.datasets[datasetIndex].gpxDataGraph[index];  // Valore verticale (Y)
                    //console.log(point.lat, point.lon)
                    marker._icon.style.transition = 'none'
                    //marker._icon.shadowUrl = "null"
                    //console.log(marker._shadow)
                    marker._shadow.remove()
                    marker.setLatLng([point.lat, point.lon]);
                    //map.panTo([point.lat, point.lon], { animate: true });
                }
            }

        },
    });
    //consol.log(chart)
}



function haversine(lat1, lon1, lat2, lon2) {
    const R = 6371; // Raggio della Terra in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distanza in km
}


var gpxDataGraph = []
var totalDistance

function extractDataAndPlot(gpxText) {
    //console.log(gpxText)
    //gpxText = gpxText.text()
    //const cleanGpxText = gpxText.replace(/\\"/g, '"');
    const cleanGpxText = gpxText.replace(/\\n/g, '').replace(/\\"/g, '"');
    //consol.log(cleanGpxText)
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(cleanGpxText, "application/xml");
    //consol.log(xmlDoc)
    const trkpts = xmlDoc.getElementsByTagName('trkpt');
    let distances = [];
    let elevations = [];
    totalDistance = 0;
    let previousLat = null;
    let previousLon = null;

    for (let i = 0; i < trkpts.length; i++) {
        const lat = parseFloat(trkpts[i].getAttribute('lat'));
        const lon = parseFloat(trkpts[i].getAttribute('lon'));
        const ele = parseFloat(trkpts[i].getElementsByTagName('ele')[0].textContent);
        gpxDataGraph[i] = {
            lat: lat,
            lon: lon,
            ele: ele
        }

        if (previousLat !== null && previousLon !== null) {
            const d = haversine(previousLat, previousLon, lat, lon);
            totalDistance += d;
        }

        distances.push(totalDistance);
        elevations.push(ele);
        previousLat = lat;
        previousLon = lon;
    }
    //consol.log(distances)
    marker = L.marker([gpxDataGraph[0].lat, gpxDataGraph[0].lon]).addTo(map);
    //consol.log(gpxDataGraph)
    createElevationChart(distances, elevations);
}



const graph = document.getElementById('elevationChart'); // Il canvas o l'elemento del grafico

/* graph.addEventListener('mousemove', function(event) {
    //consol.log(event)
    const cursorX = event.offsetX;  // Posizione orizzontale del cursore
    const cursorY = event.offsetY;  // Posizione verticale del cursore
    updateMapPosition(cursorX);
});
 */



function updateMapPosition(cursorX) {
    // Supponiamo che il grafico sia lungo 1000px
    const graphWidth = graph.offsetWidth;
    // Distanza totale in km dal GPX
    const distanceAtCursor = (cursorX / graphWidth) * totalDistance; // Distanza percorsa in km
    //consol.log(distanceAtCursor)
    // Trova il punto GPS più vicino alla distanza percorsa
    let closestPoint = findClosestPoint(distanceAtCursor);

    // Funzione per trovare il punto GPS più vicino alla distanza percorsa
    function findClosestPoint(distance) {
        let closest = gpxDataGraph[0];
        let minDiff = Math.abs(distance - closest.ele);

        for (let i = 1; i < gpxDataGraph.length; i++) {
            const diff = Math.abs(distance - gpxDataGraph[i].ele);
            if (diff < minDiff) {
                closest = gpxDataGraph[i];
                minDiff = diff;
            }
        }
        //consol.log(closest)
        return closest;
    }

    // Ora hai il punto GPS corrispondente, aggiornando la mappa:
    updateMapWithPosition(closest.lat, closest.lon);
}



function updateMapWithPosition(lat, lon) {
    // Centra la mappa sulla posizione GPS
    //consol.log(marker)
    marker.setLatLng([lat, lon], 15); // 'map' è l'oggetto Leaflet della tua mappa
    //map.setView([lat, lon],15, {animate: true});  // Aggiungi un marker alla mappa
}


function carosello(){
    for(var i =1 ; i<trekking.numFoto+1;i++){
        var button = document.createElement("button")
        var carouselIndicator = document.getElementById("indicator")
        button.type = "button"
        button.ariaLabel = i
        button.setAttribute('data-bs-target', '#carouselExampleIndicators');
        button.setAttribute('data-bs-slide-to', i-1);
        var image = document.createElement("img")
        var carousel = document.createElement("div")
        
        if(i==1){
            button.classList = "active"
            carousel.classList = "carousel-item active"
        }
        else{
            carousel.classList = "carousel-item"
        }
        image.src= "/public/"+trekking.name+"-"+trekking.date+"/"+i+".jpg"
        image.classList ="d-block"
        image.alt = "Foto n° "+i+ " del trekking "+ trekking.name
        carousel.appendChild(image)
        var node = document.getElementById("carosello")
        node.appendChild(carousel)
        carouselIndicator.appendChild(button)
    }
}


function download(){
    //console.log(xmlGPX)
    const cleanGpxText = xmlGPX.replace(/\\n/g, '').replace(/\\/g, '');
    //console.log(cleanGpxText)
    const blob = new Blob([cleanGpxText], { type: 'application/gpx+xml' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = trekking.name+'.gpx';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url); 
}



function generateStars(rating) {
    const fullStar = '&#9733;';
    const halfStar = '&#9733;';
    const emptyStar = '&#9733;';
    const container = document.getElementById('rating');

    // Calcoliamo il numero di stelle piene, metà stella e vuote
    let fullStars = Math.floor(rating);
    let halfStars = (rating % 1 >= 0.5) ? 1 : 0;
    let emptyStars = 5 - fullStars - halfStars;

    // Ricostruiamo la valutazione con le stelle
    container.innerHTML = '';

    // Stelle piene
    for (let i = 0; i < fullStars; i++) {
        container.innerHTML += `<span class="star">${fullStar}</span>`;
    }

    // Mezza stella
    if (halfStars) {
        container.innerHTML += `<span class="star-half">${halfStar}</span>`;
    }

    // Stelle vuote
    for (let i = 0; i < emptyStars; i++) {
        container.innerHTML += `<span class="star-empty">${emptyStar}</span>`;
    }
}

