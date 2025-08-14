const mongoClient = require('mongodb').MongoClient;
var Binary = require('mongodb').Binary;
const ObjectId = require('mongodb').ObjectId;
//const auth = require('./auth').auth
//const { GridFsStorage } = require('multer-gridfs-storage');
var cors = require('cors')
const express = require('express') //modulo utilizzato con nodejs per semplificare la comunicazione server 
const path = require('path');
//const multer = require('multer');
const app = express() //una specie di costruttore che inizializza express e che ci permette di utilizzare tutti i metodi

app.use(express.json())

//const upload = multer({ dest: 'uploads/' });
const xmlBodyParser = require('express-xml-bodyparser');
const fs = require('fs');
const xml2js = require('xml2js');
var bodyParser = require('body-parser');
const multer = require('multer');
app.use(bodyParser.json({limit: "50mb"}));
app.use(bodyParser.urlencoded({limit: "50mb", extended: true, parameterLimit:50000}));
const storage = multer.memoryStorage(); // Salva il file in memoria
const upload = multer({ 
  storage: storage, 
  limits: { fileSize: 100 * 1024 * 1024 } // Limite di 100MB
});


app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(__dirname));
app.set("view engine", "ejs");
app.set('views', path.join(__dirname, 'views'));

const axios = require('axios');
const requestIp = require('request-ip');


// Middleware per ottenere l'IP del visitatore
app.use(requestIp.mw());



async function telegram(req) {
    try{
    const ip = req.clientIp || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];
    const referer = req.headers['referer'] || 'Diretto';
    // Ottieni informazioni sulla posizione basate sull'IP
    let location = 'Sconosciuta';
    try {
        const geoRes = await axios.get("https://api.ipstack.com/"+ip, {
            params: {
              access_key: process.env.apikeyIP,
            }
          })
        //console.log(geoRes)
        if (geoRes.data && geoRes.data.city) {
            location = `${geoRes.data.city}, ${geoRes.data.country_name}`;
        }
    } catch (error) {
        console.error('Errore nella geolocalizzazione:', error.message);
    }

    // Costruisci il messaggio da inviare su Telegram
    const message = `
📡 *Nuovo Visitatore!*  
🌍 *IP:* ${ip}  
📌 *Località:* ${location}  
🖥 *User-Agent:* ${userAgent}  
🔗 *Referer:* ${referer}
    `;

    // Invia la notifica su Telegram
    await axios.post("https://api.telegram.org/bot"+process.env.telegram_token+"/sendMessage", {
        chat_id: process.env.chat_id,
        text: message,
        parse_mode: 'Markdown'
    });

}
catch(e){
    console.log("errore: "+e)
}
};




app.use(xmlBodyParser({
    xmlParseOptions: {
        normalize: true, // Normalizza gli spazi e i ritorni a capo
        normalizeTags: true, // Normalizza i tag a minuscolo
        explicitArray: false // Se impostato a `false`, non metterà gli elementi in un array
    }
}));




app.post("/saveGPX2",upload.single('gpxFile'),async (req, res) => {
    console.log(req.headers['authorization'])
    if(req.headers['authorization']==process.env.token){
    //console.log(req.body.equipment)
        // Converte l'XML in JSON
        const parser = new xml2js.Parser();
        parser.parseString(req.file.buffer.toString(), async (err, result) => {
            if (err) {
                console.error('Errore nella conversione dell\'XML:', err);
                return;
            }

            const client = new mongoClient(process.env.uri);

            try {
                await client.connect();
                ArrayEq= JSON.parse(req.body.equipment)
                //console.log(ArrayEq)
                const db = client.db('trekking'); // Nome del database
                const collection = db.collection('treks'); // Nome della collezione
                //console.log(req.body)
                req.body.gpx = result;
                req.body.equipment = ArrayEq
                //console.log(req.body)
                // Salva il file GPX come dati binari in MongoDB
                await collection.insertOne(
                    req.body);

                console.log('File GPX salvato con successo:');

            } catch (e) {
                console.log(e)
            }
        })
    }
        else{
            res.status(401).json({message: "Accesso non autorizzato"})
        }
          
}
)
var trekkings
app.get("/all", async (req, res) => {
    
    const client = new mongoClient(process.env.uri)
    try {
        client.connect();
        const db = client.db('trekking'); // Nome del database
        const collection = db.collection('treks'); // Nome della collezione
        trekkings = await collection.find().toArray()
        //console.log(allT)
        telegram(req, res)
        res.json(trekkings)
    } finally {
        await client.close()
    }

  
})
var totalPages
app.get("", async (req, res) => {
    
    const client = new mongoClient(process.env.uri)
    try {
        client.connect();
        const db = client.db('trekking'); // Nome del database
        const trekkingCollection = db.collection('treks'); // Nome della collezione
        //console.log(allT)
        telegram(req, res)
         var page = parseInt(req.query.page) || 1;
        const perPage = 12;
         const totalItems = await trekkingCollection.countDocuments();
  var treks = await trekkingCollection
    .find({})
    .skip((page - 1) * perPage)
    .limit(perPage)
    .toArray();
        cronological(treks)
        console.log(treks)
    totalPages = Math.ceil(totalItems / perPage);
    } finally {
        await client.close()
    }
res.render("index", {treks, page, totalPages});
  
})

app.get("/lista", (req, res) => {
  const tutti = Array.from({ length: 50 }, (_, i) => `Elemento ${i+1}`);
  const page = parseInt(req.query.page) || 1;
  const perPage = 12;
  const start = (page - 1) * perPage;
  const end = start + perPage;

  const items = tutti.slice(start, end);
  const totalPages = Math.ceil(tutti.length / perPage);

  res.render("lista", { items, page, totalPages });
});



app.get("/trekGPX/:id", async (req, res) => {
    var id = req.params.id
    const client = new mongoClient(process.env.uri)
    try {
        client.connect();
        var trek = await client.db("trekking").collection("treks").findOne({
            _id: new ObjectId(id)
        })
        const builder = new xml2js.Builder();
        const xmlOutput = builder.buildObject(trek.gpx);
        //console.log(xmlOutput)
        res.json(xmlOutput)
        // Invia i dati binari
        //res.send(trek.gpx);
    } catch (e) {
        console.log(e)
    }
})

app.get("/trekID/:nome", async (req, res) => {
  // recuperi i dati dal DB o da un JSON
 var nome = req.params.nome
  const client = new mongoClient(process.env.uri)
    try {
        client.connect();
        var trek = await client.db("trekking").collection("treks").findOne(
            { name: nome }
        )
        console.log(trek)
        const builder = new xml2js.Builder();
        const xmlOutput = builder.buildObject(trek.gpx);
        //console.log("output")
        //console.log(xmlOutput)
        trek.gpx = xmlOutput
    } catch (e) {
        console.log(e)
    }
    res.json(trek)
});
  
app.get('/ping', (req, res) => {
  res.send('ok');
});
app.get("/trekking/:nome", async (req, res) => {
  // recuperi i dati dal DB o da un JSON
  var nome = req.params.nome
  const client = new mongoClient(process.env.uri)
    try {
        client.connect();
        var trek = await client.db("trekking").collection("treks").findOne(
            { name: nome }
        )
        console.log(trek)
        const builder = new xml2js.Builder();
        const xmlOutput = builder.buildObject(trek.gpx);
        //console.log("output")
        //console.log(xmlOutput)
        trek.gpx = xmlOutput
    } catch (e) {
        console.log(e)
    }
  

  res.render("trekking/trekking-details", trek);
});


app.get('/sitemap.xml', async (req, res) => {
    const baseUrl = 'https://viaggiditony.onrender.com'; // Cambia con il tuo dominio
    var urls = [ "/"]
    const response = await axios.get("https://viaggiditony.onrender.com/all")
    console.log(response)
    for(var i=0;i<trekkings.length;i++){
        urls.push("/trekking/"+trekkings[i].name)
    }
    for(var i=0;i<totalPages;i++){
        urls.push("/?page="+i+1)
    }

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
    <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
        ${urls.map(url => `
            <url>
                <loc>${baseUrl}${url}</loc>
                <priority>0.8</priority>
            </url>`).join('')}
    </urlset>`;

    res.header('Content-Type', 'application/xml');
    res.send(sitemap);
});

function cronological(trekkingList){
    var temp
    var c =-1
    for(var i = 0;i<trekkingList.length-1;i++){
        
        if(trekkingList[i].date<trekkingList[i+1].date){
            temp = trekkingList[i]
            trekkingList[i]=trekkingList[i+1]
            trekkingList[i+1]=temp
            i=-1

        }
    }
    trekkingList[0].newest = "true"
    
}



const PORT = process.env.PORT || 3000; // Usa la porta di Render, altrimenti 3000


app.listen(PORT, () => {
    console.log(`Server in ascolto su porta ${PORT}`);
  });
