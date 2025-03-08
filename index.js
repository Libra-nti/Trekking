let trekkingData = [];
let filteredTrekking = [];
var J = 0

var url = "https://trekking-qwju.onrender.com"

var src = []
fetch(url + '/all', {
        method: 'GET',
        headeheaders: {
            "Content-Type": "application/json", // Tipo di contenuto accettato in risposta
        },
    })
    .then(response => response.json())
    .then(data => {
        console.log(data)
        trekkingData = data;
        filteredTrekking = data;
        renderTrekkingList(filteredTrekking)
        console.log(filteredTrekking)

    })



// Funzione per filtrare i trekking in base ai criteri
function filterTrekking() {
    const search = document.getElementById('search').value.toLowerCase();
    const difficulty = document.getElementById('difficulty').value;
    const distance = document.getElementById('distance').value;
    const elevation = document.getElementById('elevation').value;
    const date = document.getElementById('date').value;

    filteredTrekking = trekkingData.filter(trekking => {
        console.log(trekking.distance - distance)
        return (
            (trekking.name.toLowerCase().includes(search)) &&
            (difficulty ? trekking.difficulty === difficulty : true) &&
            (distance ? trekking.distance - distance <= 0 : true) &&
            (elevation ? trekking.elevation - elevation <= 0 : true) &&
            (date ? trekking.date == date : true)
        );
    });
    console.log(filteredTrekking)

    renderTrekkingList(filteredTrekking);
}

// Funzione per visualizzare i trekking
function renderTrekkingList(trekkingList) {

    console.log("trekkingList")
    const listContainer = document.getElementById('trekking-list');
    listContainer.innerHTML = ''; // Pulisce la lista esistente
    var H = 0;
    var row
    trekkingList.forEach(trekking => {
        console.log(trekking.src)
        if (H % 6 == 0) {
            row = document.createElement("div")
            row.className = "row"
            listContainer.appendChild(row)
        }
        const card = document.createElement('div');
        card.className = "col-sm-4 col-lg-2 col-6 mb-3"
        card.innerHTML = `
    <div class="card h-100" style="width: auto">
      <img src='${trekking.url}' class="card-img-top">
       <div class="card-body bottom-0">
       <h5 class="card-title">${trekking.name}</h5>
       <p class="card-text">${trekking.date}</p>
      </div>
      </div>
    `;
        card.onclick = () => {
            window.location.href = `trekking-details.html?id=${trekking._id}`;
        };
        row.appendChild(card)
        H = H + 1

    });
}

// Funzione per caricare i dettagli di un trekking