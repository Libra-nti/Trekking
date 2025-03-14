let trekkingData = [];
let filteredTrekking = [];
var J = 0

var url = "https://trekking-qwju.onrender.com"

var src = []



async function loading(){
 await fetch(url + '/all', {
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
        newest()

    })
    document.getElementById("loader").style.display = "none"
  }


// Funzione per filtrare i trekking in base ai criteri
function filterTrekking() {
    const search = document.getElementById('search').value.toLowerCase();
    const difficulty = document.getElementById('difficulty').value;
    const distance = document.getElementById('distance').value;
    const elevation = document.getElementById('elevation').value;
    const date = document.getElementById('date').value;
    const season = document.getElementById('season').value;

    filteredTrekking = trekkingData.filter(trekking => {
        console.log(trekking.distance - distance)
        return (
            (trekking.name.toLowerCase().includes(search)) &&
            (difficulty ? trekking.difficulty === difficulty : true) &&
            (distance ? trekking.distance - distance <= 0 : true) &&
            (elevation ? trekking.elevation - elevation <= 0 : true) &&
            (date ? trekking.date == date : true) && 
            (season ? trekking.season === season : true)
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


function newest(){
    var  newest = "1999-01-01"
    var ind
    for(var i=0;i<trekkingData.length;i++){
        if(newest<trekkingData[i].date){
            newest = trekkingData[i].date
            ind = i
        }
    }
    console.log(ind)
    var t = document.getElementsByClassName("card-body")[ind]
    var newLogo = document.createElement("img")
    newLogo.src = "newLogo.png"
    newLogo.style.width="100%"
    t.appendChild(newLogo)
    
}