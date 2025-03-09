id = new URLSearchParams(window.location.search).get('id')
var trekking
var xmlGPX
let marker
var map // Imposta una vista iniziale
var url = "https://trekking-qwju.onrender.com"
//var url = "http://localhost:3100"
const urlGPX = 'https://trekking-qwju.onrender.com/trekGPX/' + id; // URL del tuo file XML binario

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

function XML(){
fetchAndConvertToXML(urlGPX)
        .then(xmlContent => {
            ////consol.log(xmlContent); 
            const result = xmlContent.slice(1, -1);
            //consol.log(result); 
            extractDataAndPlot(result)
            xmlGPX = xmlContent // Questo stamperà l'XML decodificato
            // Puoi anche fare un parsing aggiuntivo con un parser XML se necessario
        })
    }
// Funzione per mostrare il contenuto dopo il caricamento
async function mostraContenuto() {
    try{
        var mappa = await fetchAndConvertToXML(urlGPX)
        mappa = mappa.slice(1,-1);
        extractDataAndPlot(mappa)
        xmlGPX = mappa
    const trek = await fetch(url + "/trek/" + id, {
        method: 'GET',
        headers: {
            "Content-Type": "application/json"
        },
    })
    .then(response =>  response.json()
      ); // Attendi la fine della fetch
    console.log(trek)
    trekking = trek
     document.getElementById('trekking-name').innerText = trek.name;
     document.getElementById('trekking-duration').innerText = trek.duration;
     document.getElementById('trekking-elevation').innerText = trek.elevation + " mt";
     document.getElementById('trekking-distance').innerText = trek.distance + " km";
     document.getElementById('trekking-difficulty').innerText = trek.difficulty;
     document.getElementById('trekking-description').innerText = trek.description;
     document.getElementById('youtube').innerHTML = trek.youtube;
     document.getElementById('relive').innerHTML = trek.relive
     document.getElementById('trekking-parking').innerText = trek.parking
     document.getElementById('trekking-parking').href = "https://www.google.com/maps/place/" + trek.parking
     document.getElementById('trekking-season').innerText = trek.season
     for (var i = 0; i < trek.equipment.length; i++) {
        ////consol.log("dentro")
        var father = document.getElementById("equipaggiamento")
        //consol.log(father)
        var clone = document.createElement("li")

        clone.classList = "list-group-item"
        //consol.log(clone)
        clone.innerHTML = trek.equipment[i]
        father.appendChild(clone)
    }

    // Aggiungi un layer di tile della mappa (OpenStreetMap)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);
    const gpxLayer = omnivore.gpx.parse(trek.gpx);
    // Aggiungi il layer GPX alla mappa
    gpxLayer.addTo(map);
    // Adatta la vista della mappa per includere l'intero percorso
    map.fitBounds(gpxLayer.getBounds());
    //wait(1000);  
    carosello()
    document.getElementById("loader").style.display = "none"; // Nascondi il loader
    
    document.getElementById("content").style.display = "block"; // Mostra il contenuto

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
window.addEventListener("load", () => {
    map = L.map('map').setView([51.505, -0.09], 13);
    mostraContenuto();
});



async function fetchData() {

    fetch(url + "/trek/" + id, {
            method: 'GET',
            headers: {
                "Content-Type": "application/json"
            },
        })
        .then(response =>  response.json()
          ).
    then(data => {
        trekking = data
        if (trekking) {
            

            for (var i = 0; i < data.equipment.length; i++) {
                ////consol.log("dentro")
                var father = document.getElementById("equipaggiamento")
                //consol.log(father)
                var clone = document.createElement("li")

                clone.classList = "list-group-item"
                //consol.log(clone)
                clone.innerHTML = data.equipment[i]
                father.appendChild(clone)
            }

            // Aggiungi un layer di tile della mappa (OpenStreetMap)
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            }).addTo(map);
            const gpxLayer = omnivore.gpx.parse(data.gpx);
            // Aggiungi il layer GPX alla mappa
            gpxLayer.addTo(map);
            // Adatta la vista della mappa per includere l'intero percorso
            map.fitBounds(gpxLayer.getBounds());
            
        }
    })

    
    //consol.log("finito")

};



var chart



function createElevationChart(distances, elevations) {
    //consol.log(distances)
    //consol.log(elevations)
    const ctx = document.getElementById('elevationChart').getContext('2d');
    chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: distances,
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
                            const x = context.label
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
                                //consol.log(deltaX)
                                if (deltaX == 0) {
                                    deltaX = 1
                                }
                                const inclinazionePercent = ((deltaY / deltaX) * 100).toFixed(2);
                                inclinazione = `${inclinazionePercent}%`;
                            }

                            // Mostra il valore e l'inclinazione nel tooltip
                            return [`${label}: ${y}`,
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
                }, true);
                if (chartElements.length > 0) {
                    //consol.log(chartElements)
                    //consol.log(gpxDataGraph)
                    const index = chartElements[0].index;
                    const point = gpxDataGraph[index];
                    //  const datasetIndex = chartElements[0].datasetIndex;
                    //const value = chart.data.datasets[datasetIndex].gpxDataGraph[index];  // Valore verticale (Y)

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

        distances.push(totalDistance.toFixed(2));
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
        image.src= "public/"+trekking.name+"-"+trekking.date+"/"+i+".jpg"
        image.classList ="d-block"
        carousel.appendChild(image)
        var node = document.getElementById("carosello")
        node.appendChild(carousel)
        carouselIndicator.appendChild(button)
    }
}