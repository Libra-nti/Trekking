let trekkingData = [];
let filteredTrekking = [];
var J = 0

var url = "https://trekkingbackend.onrender.com"


var src = []
var pages


async function loading(){
 await fetch(url + '/all', {
        method: 'GET',
        headers: {
            "Content-Type": "application/json", // Tipo di contenuto accettato in risposta
        },
    })
    .then(response => response.json())
    .then(data => {
        console.log(data)
        trekkingData = data;
        filteredTrekking = data;
        newest()
        cronological()
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
    const tipo = document.getElementById("tipo").value;
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
            (season ? trekking.season === season : true)&& 
            (tipo ? trekking.tipo === tipo : true)
        );
    });
    console.log(filteredTrekking)

    renderTrekkingList(filteredTrekking, 1);
    cronological()
}

var cards = []
// Funzione per visualizzare i trekking
function renderTrekkingList(trekkingList, pageSelected) {
    cards = []
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
      <img src="public/${trekkingList[pagesI].name}-${trekkingList[pagesI].date}/copertina.jpg" class="card-img-top">
       <div class="card-body bottom-0">
       <h5 class="card-title">${trekkingList[pagesI].name}</h5>
       <p class="card-text">${trekkingList[pagesI].date}</p>
      </div>
      </div>
    `;
    
    if(trekkingList[pagesI].date == dataNewest){
        //console.log("qui")
        card.innerHTML = `
    <div onclick="move('${trekkingList[pagesI]._id}')" class="card h-100" style="width: auto" onmouseover="hideLogo()" onmouseout="showLogo()">
    <div class="prova" style="display: inline-block; positoin:relative">
      <img src="public/${trekkingList[pagesI].name}-${trekkingList[pagesI].date}/copertina.jpg" class="card-img-top">
      <img id="newLogo" src="newLogo.png" >
      </div>
       <div class="card-body bottom-0">
       <h5 class="card-title">${trekkingList[pagesI].name}</h5>
       <p class="card-text">${trekkingList[pagesI].date}</p>
       
      </div>
      </div>
    `;
        /* var t = document.getElementsByClassName("card-body")[pagesI]
    var newLogo = document.createElement("img")
    newLogo.src = "newLogo.png"
    newLogo.style.width="100%"
    t.appendChild(newLogo) */
    }
        cards.push(card)
        row.appendChild(card)
        H = H + 1

    }
    pages = Math.ceil(trekkingList.length/12)
    console.log(pages)

}


function hideLogo(){
    document.getElementById("newLogo").style.opacity = 0;
}


function showLogo(){
    document.getElementById("newLogo").style.opacity = 0.8;
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


function cronological(){
    var temp
    var c =-1
    console.log(cards)
    for(var i = 0;i<trekkingData.length-1;i++){
        console.log(i)
        if(cards[i].childNodes[1].children[1].children[1].innerText<cards[i+1].childNodes[1].children[1].children[1].innerText){
            temp = cards[i]
            cards[i]=cards[i+1]
            cards[i+1]=temp
            i=-1

        }
    }
    console.log(cards)
    for(var i=0; i<cards.length;i++){
        if(i%6==0){
            c++
        }
            document.getElementsByClassName("row")[c].appendChild(cards[i])
    
    }
    
}


function tipo(tipo){
    document.getElementById("difficulty").removeAttribute("disabled");
    document.getElementById("tipo").value = tipo
    
    var ul = document.getElementById("ulDifficulty")
    lis = ul.getElementsByTagName("li")
    Array.from(lis).forEach(el => el.remove());

    if(tipo == "Ferrata"){
        for (let i = 1; i <= 3; i++) {
            let li = document.createElement("li");
            let a = document.createElement("a")
            a.classList = "dropdown-item"
            if(i==1){
            a.innerText="EEA - F"
            a.onclick = function() {
                difficulty("EEA - F")
            }
        }
            else if(i==2){
                a.innerText="EEA - PD"
            a.onclick = function() {
                difficulty("EEA - PD")
            }
        }
            else if(i==3){
                a.innerText="EEA - D"
            a.onclick = function() {
                difficulty("EEA - D")

            }
            }
            // Aggiunge il bottone al container
            li.appendChild(a)
            ul.appendChild(li);
        }

    }
    else if(tipo == "Escursionismo"){
        for (let i = 1; i <= 5; i++) {
            let li = document.createElement("li");
            let a = document.createElement("a")
            a.classList = "dropdown-item"
            if(i==1){
            a.innerText="T"
            a.onclick = function() {
                difficulty("T")
            }
        }
            else if(i==2){
                a.innerText="E"
            a.onclick = function() {
                difficulty("E")
            }
        }
            else if(i==3){
                a.innerText="EE"
            a.onclick = function() {
                difficulty("EE")

            }
            }
            else if(i==4){
                a.innerText="EEA"
            a.onclick = function() {
                difficulty("EEA")

            }
            }
            else if(i==5){
                a.innerText="EAI"
            a.onclick = function() {
                difficulty("EAI")

            }
            }
            // Aggiunge il bottone al container
            li.appendChild(a)
            ul.appendChild(li);
        }

    }
    
    else if(tipo == "Alpinismo"){
        for (let i = 1; i <= 7; i++) {
            let li = document.createElement("li");
            let a = document.createElement("a")
            a.classList = "dropdown-item"
            if(i==1){
            a.innerText="F"
            a.onclick = function() {
                difficulty("F")
            }
        }
            else if(i==2){
                a.innerText="PD"
            a.onclick = function() {
                difficulty("PD")
            }
        }
            else if(i==3){
                a.innerText="AD"
            a.onclick = function() {
                difficulty("AD")

            }
            }
            else if(i==4){
                a.innerText="D"
            a.onclick = function() {
                difficulty("D")

            }
            }
            else if(i==5){
                a.innerText="TD"
            a.onclick = function() {
                difficulty("TD")

            }
            }
            else if(i==6){
                a.innerText="ED"
            a.onclick = function() {
                difficulty("ED")

            }
            }
            else if(i==7){
                a.innerText="ABO"
            a.onclick = function() {
                difficulty("ABO")

            }
            }
            // Aggiunge il bottone al container
            li.appendChild(a)
            ul.appendChild(li);
        }

    }
    else{
        document.getElementById("divDifficulty").style.display = "none"
    
    }
    //document.getElementById("divDifficulty").style.display = "block"
}


function difficulty(difficoltà){
    document.getElementById("difficulty").value = difficoltà
  }
