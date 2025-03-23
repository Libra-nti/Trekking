let trekkingData = [];
let filteredTrekking = [];
var J = 0

var url = "https://trekking-qwju.onrender.com"

var src = []
var pages


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
        newest()
       renderTrekkingList(filteredTrekking, 1)
        

        //console.log(filteredTrekking)
        

    })
    document.getElementById("loader").style.display = "none"
    document.getElementById("content").style.display = "block"
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
            (trekking.name.toLowerCase().includes(search) || trekking.description.toLowerCase().includes(search)) &&
            (difficulty ? trekking.difficulty === difficulty : true) &&
            (distance ? trekking.distance - distance <= 0 : true) &&
            (elevation ? trekking.elevation - elevation <= 0 : true) &&
            (date ? trekking.date == date : true) && 
            (season ? trekking.season === season : true)
        );
    });
    console.log(filteredTrekking)

    renderTrekkingList(filteredTrekking, 1);
}

// Funzione per visualizzare i trekking
function renderTrekkingList(trekkingList, pageSelected) {
    var c = 0
    console.log(trekkingList)
    const listContainer = document.getElementById('trekking-list');
    listContainer.innerHTML = ''; // Pulisce la lista esistente
    var H = 0;
    var row
    var maxShowed
    if(trekkingList.length<12*pageSelected){
        maxShowed = trekkingList.length
    }
    else{
        maxShowed = 12*pageSelected
    }
    for(var pagesI=12*(pageSelected-1); pagesI<maxShowed;pagesI++){
        
        //console.log(pagesI)
        if (H % 6 == 0) {
            row = document.createElement("div")
            row.className = "row"
            listContainer.appendChild(row)
        }
        const card = document.createElement('div');
        card.className = "col-sm-4 col-lg-2 col-6 mb-3"
        card.innerHTML = `
    <div onclick="move('${trekkingList[pagesI]._id}')" class="card h-100" style="width: auto">
      <img src='${trekkingList[pagesI].url}' class="card-img-top">
       <div class="card-body bottom-0">
       <h5 class="card-title">${trekkingList[pagesI].name}</h5>
       <p class="card-text">${trekkingList[pagesI].date}</p>
      </div>
      </div>
    `;
    
    if(trekkingList[pagesI].date == dataNewest){
        //console.log("qui")
        card.innerHTML = `
    <div onclick="move('${trekkingList[pagesI]._id}')" class="card h-100" style="width: auto">
      <img src='${trekkingList[pagesI].url}' class="card-img-top">
       <div class="card-body bottom-0">
       <h5 class="card-title">${trekkingList[pagesI].name}</h5>
       <p class="card-text">${trekkingList[pagesI].date}</p>
       <img src="newLogo.png" style="width:100%"></img>
      </div>
      </div>
    `;
        /* var t = document.getElementsByClassName("card-body")[pagesI]
    var newLogo = document.createElement("img")
    newLogo.src = "newLogo.png"
    newLogo.style.width="100%"
    t.appendChild(newLogo) */
    }
        card.onclick = () => {
            window.location.href = `trekking-details.html?id=${trekkingList[pagesI]._id}`;
        };
        row.appendChild(card)
        H = H + 1

    }
    pages = Math.ceil(trekkingList.length/12)
    console.log(pages)

}

// Funzione per caricare i dettagli di un trekking

var dataNewest
function newest(){
    var  newest = "1999-01-01"
    
    for(var i=0;i<trekkingData.length;i++){
        if(newest<trekkingData[i].date){
            newest = trekkingData[i].date
            indiceNewest = i
        }
    }
    //console.log(ind)
    dataNewest = newest
    
    
}

function next(){
    var items
    if(document.getElementById("distance").value != '' || document.getElementById("elevation").value != '' ||document.getElementById("season").value != '' ||document.getElementById("difficulty").value != '' ||document.getElementById("date").value != ''){
        items = filteredTrekking
       
    }
    else{
        items = trekkingData
    }
    var pagesEl = document.getElementById("pages")
    var actualPage = pagesEl.innerText
    console.log(pages)
    if(pages>1 && pagesEl.innerText!=pages){
        console.log("qui")
        actualPage++
        pagesEl.innerText = actualPage
        console.log(pagesEl.innerText)
        renderTrekkingList(items, pagesEl.innerText)
    }
    
}


function prev(){
    var items
    if(document.getElementById("distance").value != '' || document.getElementById("elevation").value != '' ||document.getElementById("season").value != '' ||document.getElementById("difficulty").value != '' ||document.getElementById("date").value != ''){
        items = filteredTrekking
    }
    else{
        items = trekkingData
    }
    var pagesEl = document.getElementById("pages")
    var actualPage = pagesEl.innerText
    if(pagesEl.innerText!=1){
        actualPage--
        pagesEl.innerText = actualPage
        renderTrekkingList(items, pagesEl.innerText)
    }

}

function move(idTrek){
    window.location.href = "trekking-details.html?id="+idTrek
}