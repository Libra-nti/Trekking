id = new URLSearchParams(window.location.search).get('id')
var trekking
var xmlGPX
let marker
var url = "https://viaggiditony.onrender.com"
//var url = "http://localhost:3100"
const urlGPX = 'https://viaggiditony.onrender.com/trekGPX/'+id; // URL del tuo file XML binario

async function fetchAndConvertToXML(urlGPX) {
    // Effettua la fetch per ottenere i dati binari
    const response = await fetch(urlGPX);
    console.log(response)
    // Recupera il dato binario come ArrayBuffer
    const binaryData = await response.arrayBuffer();
    console.log(binaryData)
    // Usa TextDecoder per decodificare i dati binari in una stringa XML
    const decoder = new TextDecoder('utf-8');
    const xml = decoder.decode(binaryData);
    
    console.log(xml)
    // Ora xmlString contiene il contenuto XML decodificato
    return xml;
}

function removeFooter(){
    document.getElementsByClassName("video-footer")[0].remove()
}

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));


// Funzione per mostrare il contenuto dopo il caricamento
const mostraContenuto = async () => {
    await fetchData();  // Attendi la fine della fetch
   // await wait(500);  
    document.getElementById("loader").style.display = "none";  // Nascondi il loader
    document.getElementById("content").style.display = "block";  // Mostra il contenuto
    //removeFooter()
    if (window.map) {
        setTimeout(() => {
            window.map.invalidateSize();  // Risistema le dimensioni della mappa
        }, 0);
    } else {
        // Inizializza la mappa se non l'hai già fatto
        window.map = L.map('map').setView([45.931055, 9.432543], 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(window.map);
        //chart.redraw()
    }
};

var map // Imposta una vista iniziale
// Esegui la funzione quando la pagina è completamente caricata
window.addEventListener("load", () => {
    map = L.map('map').setView([51.505, -0.09], 13); 
    mostraContenuto();
});
    
    

    function fetchData() {
        
            fetch(url+"/trek/"+id, {
                method: 'GET',
                headers: {"Content-Type": "application/json"},
            })
            .then(response => response.json()).
            then(data => {
                trekking = data
                if (trekking) {
                    document.getElementById('trekking-name').innerText = trekking.name;
                    document.getElementById('trekking-duration').innerText = trekking.duration;
                    document.getElementById('trekking-elevation').innerText = trekking.elevation +" mt";
                    document.getElementById('trekking-distance').innerText = trekking.distance +" km";
                    document.getElementById('trekking-difficulty').innerText = trekking.difficulty;
                    document.getElementById('trekking-description').innerText = trekking.description;
                    document.getElementById('youtube').innerHTML = trekking.youtube;
                    document.getElementById('relive').innerHTML = trekking.relive
                    document.getElementById('trekking-parking').innerText = trekking.parking
                    document.getElementById('trekking-parking').href = "https://www.google.com/maps/place/"+trekking.parking
            
            
            
              // Aggiungi un layer di tile della mappa (OpenStreetMap)
              L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              }).addTo(map);
            
            
              //var binaryData = Buffer.from(data.gpx); // Esempio di dati binari di MongoDB
             
                // Usa TextDecoder per decodificare i dati binari in una stringa XML
                //const decoder = new TextDecoder('utf-8');
                //const xmlGPX = decoder.decode(binaryData);
               //const xmlGPX = binaryToXML(data.gpx);
               console.log("trell")
               console.log(data.gpx)
               const gpxLayer = omnivore.gpx.parse(data.gpx);
                    
               // Aggiungi il layer GPX alla mappa
               gpxLayer.addTo(map);
            
               // Adatta la vista della mappa per includere l'intero percorso
               map.fitBounds(gpxLayer.getBounds());
                }
            }
            )

            fetchAndConvertToXML(urlGPX)
    .then(xmlContent => {
        //console.log(xmlContent); 
        const result = xmlContent.slice(1, -1);
        console.log(result); 
        extractDataAndPlot(result)
        xmlGPX = xmlContent// Questo stamperà l'XML decodificato
        // Puoi anche fare un parsing aggiuntivo con un parser XML se necessario
    })
    .catch(error => {
        console.error('Errore nel recupero del file:', error);
    });
    console.log("finito")
          
    };



var chart



function createElevationChart(distances, elevations) {
    const ctx = document.getElementById('elevationChart').getContext('2d');
     chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: distances,
            datasets: [{
                label: 'Dislivello (m)',
                data: elevations,
                borderColor: 'rgb(51, 136, 255)',
                borderWidth: 2,
                fill: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { 
                    title: { display: true, text: 'Distanza (km)' } 
                },
                y: { 
                    title: { display: true, text: 'Altitudine (m)' }
                }
            },
            onHover: (event, chartElements) => {
                if (chartElements.length > 0) {
                    const index = chartElements[0].index;
                    const point = gpxDataGraph[index];
                    marker.setLatLng([point.lat, point.lon]);
                    //map.panTo([point.lat, point.lon], { animate: true });
                }
            }

        }
    });
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
    //gpxText = gpxText.text()
    //const cleanGpxText = gpxText.replace(/\\"/g, '"');
    const cleanGpxText = gpxText.replace(/\\n/g, '').replace(/\\"/g, '"');
    console.log(cleanGpxText)
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(cleanGpxText, "application/xml");
    console.log(xmlDoc)
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
        gpxDataGraph[i] = {lat: lat, lon: lon, ele: ele}

        if (previousLat !== null && previousLon !== null) {
            const d = haversine(previousLat, previousLon, lat, lon);
            totalDistance += d;
        }

        distances.push(totalDistance.toFixed(2));
        elevations.push(ele);
        previousLat = lat;
        previousLon = lon;
    }
    
   marker = L.marker([gpxDataGraph[0].lat, gpxDataGraph[0].lon]).addTo(map);
    console.log(gpxDataGraph)
    createElevationChart(distances, elevations);
}



const graph = document.getElementById('elevationChart');  // Il canvas o l'elemento del grafico

/* graph.addEventListener('mousemove', function(event) {
    console.log(event)
    const cursorX = event.offsetX;  // Posizione orizzontale del cursore
    const cursorY = event.offsetY;  // Posizione verticale del cursore
    updateMapPosition(cursorX);
});
 */



function updateMapPosition(cursorX) {
    // Supponiamo che il grafico sia lungo 1000px
    const graphWidth = graph.offsetWidth;  
      // Distanza totale in km dal GPX
    const distanceAtCursor = (cursorX / graphWidth) * totalDistance;  // Distanza percorsa in km
    console.log(distanceAtCursor)
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
        console.log(closest)
        return closest;
    } 
    
    // Ora hai il punto GPS corrispondente, aggiornando la mappa:
    updateMapWithPosition(closest.lat, closest.lon);
}



function updateMapWithPosition(lat, lon) {
    // Centra la mappa sulla posizione GPS
    console.log(marker)
    marker.setLatLng([lat, lon], 15);  // 'map' è l'oggetto Leaflet della tua mappa
    //map.setView([lat, lon],15, {animate: true});  // Aggiungi un marker alla mappa
}

