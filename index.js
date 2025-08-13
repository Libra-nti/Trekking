let trekkingData = [];
let filteredTrekking = [];
var J = 0

var url = "https://viaggiditony.onrender.com"


var src = []
var pages



async function loading(){
  document.getElementById("main").classList.add('visible');
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
        fillCards(trekkingData)
        
        cronological(trekkingData)
        renderTrekkingList(filteredTrekking, 1)
        
        

        //console.log(filteredTrekking)
        

    })
    document.getElementById("loader").style.display = "none"
    document.getElementById("main").style.display = "none"
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
            (distance ? trekking.distance - distance >= -0.5 && trekking.distance - distance <= 0.5 : true) &&
            (elevation ? trekking.elevation - elevation >= -100 && trekking.elevation - elevation <= 100: true) &&
            (date ? trekking.date == date : true) && 
            (season ? trekking.season === season : true)&& 
            (tipo ? trekking.tipo === tipo : true)
        );
    });
    console.log(filteredTrekking)

    fillCards(filteredTrekking)
    cronological(filteredTrekking)
    renderTrekkingList(filteredTrekking, 1);
}

var cards = []


function fillCards(trekkingList){
    cards = []
    for(var i = 0;i<trekkingList.length;i++){
        const card = document.createElement('div');
        card.className = "col-sm-4 col-lg-2 col-6 mb-3"

        if(trekkingList[i].date != dataNewest){
        
        card.innerHTML = `
        <a href="./trekking/trekking-details.html?id=${trekkingList[i].name.toLowerCase()}-${trekkingList[i]._id}" style="all: unset">
    <div class="card h-100" style="width: auto">
      <img loading="lazy" src="public/${trekkingList[i].name}-${trekkingList[i].date}/copertina.jpg?format=webp" class="card-img-top" name="${trekkingList[i].name}" alt="Foto copetina ${trekkingList[i].name}">
       <div class="card-body bottom-0">
       <h5 class="card-title">${trekkingList[i].name}</h5>
       <p class="card-text">${trekkingList[i].date}</p>
      </div>
      </div>
      </a>
    `
        }
        else{
            card.innerHTML = `
            <a href="./trekking/trekking-details.html?id=${trekkingList[i].name.toLowerCase()}-${trekkingList[i]._id}" style="all: unset">
    <div  class="card h-100" style="width: auto" onmouseover="hideLogo()" onmouseout="showLogo()">
    <div class="prova" style="display: inline-block">
      <img loading="lazy" src="public/${trekkingList[i].name}-${trekkingList[i].date}/copertina.jpg?format=webp" class="card-img-top" name="${trekkingList[i].name}" alt="Foto copetina ${trekkingList[i].name}">
      <img id="newLogo" src="newLogo.png" alt="NUOVO!">
      </div>
       <div class="card-body bottom-0">
       <h5 class="card-title">${trekkingList[i].name}</h5>
       <p class="card-text">${trekkingList[i].date}</p>
       
      </div>
      </div>
      </a>
    `;
        }
        cards.push(card)
    }
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
        
        row.appendChild(cards[pagesI])
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
    window.location.href = "trekking/"+idTrek
}


function cronological(trekkingList){
    var temp
    var c =-1
    console.log(cards)
    for(var i = 0;i<trekkingList.length-1;i++){
        console.log(i)
        if(cards[i].childNodes[1].children[0].children[1].children[1].innerText<cards[i+1].childNodes[1].children[0].children[1].children[1].innerText){
            temp = cards[i]
            cards[i]=cards[i+1]
            cards[i+1]=temp
            i=-1

        }
    }
    
    
}


const grades = [
      "4a", "4b", "4c",
      "5a", "5b", "5c",
      "6a", "6a+", "6b", "6b+", "6c", "6c+",
      "7a", "7a+", "7b", "7b+", "7c", "7c+",
      "8a", "8a+", "8b", "8b+", "8c", "8c+",
      "9a", "9a+", "9b", "9b+", "9c"
    ];

function tipo(tipo){
    document.getElementById("difficulty").removeAttribute("disabled");
    document.getElementById("difficulty").value = ""
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
    else if(tipo == "Multipitch"){
        ulSize()
        window.addEventListener("resize", ulSize);
        
        let li = document.createElement("li");
        var slider = document.createElement("input")
        slider.type="range"
        slider.min = 0;
    slider.max = grades.length - 1;
    slider.value = 0;
    slider.id = 'gradeSlider';
    slider.style.width="96%"
    slider.style.marginLeft="2%"
    slider.addEventListener('input', function () {
      document.getElementById('difficulty').value = grades[this.value];
    });
li.appendChild(slider)
            ul.appendChild(li);
    }
    else{
        document.getElementById("divDifficulty").style.display = "none"
    
    }
    //document.getElementById("divDifficulty").style.display = "block"
}


function difficulty(difficoltà){
    document.getElementById("difficulty").value = difficoltà
  }



  document.getElementById("formS").addEventListener("submit", function(e) {
  e.preventDefault(); // Impedisce il refresh della pagina

  filterTrekking()

  // Aggiungi qui la tua funzione di ricerca personalizzata
});

function ulSize(){
    var ul = document.getElementById("ulDifficulty")
    var targetElement = document.getElementsByClassName("input-group-text")[6];
var spamPX = targetElement.getBoundingClientRect().width;
var parent = ul.parentElement
var parentWidth = parent.getBoundingClientRect().width
        ul.style.width=parentWidth-spamPX+"px"
}

