var word = ""
var equips = []

  function send(){
    var equip = document.getElementById("equipaggiamento").value
    for(var i=0;i<equip.length;i++){
      if(equip[i]!=","){
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

var imageURL




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
            const response = await fetch("https://viaggiditony.it/upload", {
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
    console.log(token)
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

    formData.append('description_small', document.getElementById("descrizione_breve").value)
    formData.append('name', document.getElementById("nome").value)
    formData.append('title', document.getElementById("title").value)
    formData.append('description', document.getElementById("descrizione").value)
    formData.append('elevation', parseFloat(document.getElementById("dislivello").value))
    formData.append('duration', document.getElementById("durata").value)
    formData.append('date', document.getElementById("data").value)
    formData.append('difficulty', document.getElementById("difficoltà").value)
    formData.append('distance', parseFloat(document.getElementById("distanza").value))
    formData.append('gpx', "")
    formData.append('imgId', imageURL)
    formData.append('parking', document.getElementById("parking").value)
    formData.append('relive', document.getElementById("relive").value)
    formData.append('youtube', document.getElementById("youtube").value)
    formData.append('altitude', document.getElementById("quota").value)
    if(document.getElementById("tipologia").value=="Multipitch"){
      formData.append('approach', document.getElementById("avvicinamento").value)
    }
    formData.append('season', document.getElementById("stagione").value)
    formData.append('expose', document.getElementById("esposizione").value)
    formData.append('equipment', equips)
    formData.append('numFoto',parseInt(document.getElementById("foto").value))
    formData.append('stars', parseFloat(document.getElementById("stelle").value))
    formData.append('tipo', document.getElementById("tipologia").value )

        
        try{
        fetch("https://viaggiditony.it/saveGPX2", {
            method: 'POST',
            headers: {
              "Authorization": `${token}`
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