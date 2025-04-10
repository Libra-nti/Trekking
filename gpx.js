var word = ""
  var equips = []

  function send(){
    var equip = document.getElementById("equipaggiamento").value
    for(var i=0;i<equip.length;i++){
      if(equip[i]!=" "){
        word = word + equip[i]
      }
      else{
        if (!Array.isArray(equips)) {
    equips = equips ? [equips] : [];  // Se non è un array, lo converte
}

        equips.push(word)
        word=""
      }
    }
    console.log(equips)
    target(document.getElementById("token").value)
  }



  // Inizializzazione della mappa
  const map = L.map('map').setView([51.505, -0.09], 13); // Imposta una vista iniziale

  // Aggiungi un layer di tile della mappa (OpenStreetMap)
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  
  }).addTo(map);
var imageURL
  async function ottieni(){
    const img = document.getElementById("image")
    try {
            const response = await fetch("http://localhost:3100/image/space.jpg", {
                method: "GET",
            });

            const result = await response;
             const blob = await response.blob();
             imageURL = URL.createObjectURL(blob);
            img.src = imageURL;
            img.style.display = "block";
            status.textContent = "";
        } catch (error) {
            console.error("Errore:", error);
        }
  }




  async function uploadFile() {
        const fileInput = document.getElementById("fileInput");
        const status = document.getElementById("status");

        if (fileInput.files.length === 0) {
            status.textContent = "Seleziona un file prima!";
            return;
        }

        const formData = new FormData();
        formData.append("file", fileInput.files[0]);  // Aggiunge il file al FormData

        try {
            const response = await fetch("https://trekkingbackend.onrender.com/upload", {
                method: "POST",
                body: formData
            });

            const result = await response.text();
        } catch (error) {
            console.error("Errore:", error);
        }
    }




  // Funzione per caricare il file GPX


  async function target(token) {
    const fileInput = document.getElementById('gpxFile'); // Recupera l'input file
    const file = fileInput.files[0]
    filePath = document.getElementById("gpxFile").value
    console.log(file + "di ensione "+file.size)
    if (file) {
        
        
      const reader = new FileReader();
      reader.onload = function(e) {
        console.log(file)
        const gpxData = e.target.result;
        const formData = new FormData();
        console.log(equips)
        equips = JSON.stringify(equips)
        console.log(equips)

    formData.append('gpxFile', file);

        
    formData.append('name', document.getElementById("nome").value)
    formData.append('description', document.getElementById("descrizione").value)
    formData.append('elevation', document.getElementById("dislivello").value)
    formData.append('duration', document.getElementById("durata").value)
    formData.append('date', document.getElementById("data").value)
    formData.append('difficulty', document.getElementById("difficoltà").value)
    formData.append('distance', document.getElementById("distanza").value)
    formData.append('gpx', "")
    formData.append('imgId', imageURL)
    formData.append('parking', document.getElementById("parking").value)
    formData.append('relive', document.getElementById("relive").value)
    formData.append('youtube', document.getElementById("youtube").value)
    formData.append('url', document.getElementById("url").value)
    formData.append('season', document.getElementById("stagione").value)
    formData.append('equipment', equips)
    formData.append('numFoto', document.getElementById("foto").value)
    formData.append('stars', document.getElementById("stelle").value)
    formData.append('tipo', document.getElementById("tipologia").value )

        
        console.log("eseguo fetch")
        try{
        fetch("https://trekkingbackend.onrender.com/saveGPX2", {
            method: 'POST',
            headers: {
              "Authorization": `Bearer ${token}`
            },
            body: formData
        })
        .then(response => response.json())
        .then(json =>{

        console.log(json)


        })
      }
      catch(e){
        console.log("errore:"+ e)
      }
        // Carica il file GPX nella mappa utilizzando Omnivore
        const gpxLayer = omnivore.gpx.parse(gpxData);
        
        // Aggiungi il layer GPX alla mappa
        gpxLayer.addTo(map);

        // Adatta la vista della mappa per includere l'intero percorso
        map.fitBounds(gpxLayer.getBounds());
      };
      reader.readAsText(file);
    }
  };