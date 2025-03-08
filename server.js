const mongoClient = require('mongodb').MongoClient;
const GridFSBucket = require('mongodb').GridFSBucket;
var Binary = require('mongodb').Binary;
const ObjectId = require('mongodb').ObjectId;
//const auth = require('./auth').auth
const crypto = require('crypto')
const multer = require('multer');
//const { GridFsStorage } = require('multer-gridfs-storage');
const Grid = require('gridfs-stream');
var cors = require('cors')
const express = require('express') //modulo utilizzato con nodejs per semplificare la comunicazione server 
const path = require('path');
const uri = "mongodb+srv://Libra:Antonio21@spotify.ejpf1th.mongodb.net/?retryWrites=true&w=majority"
//const multer = require('multer');
const app = express() //una specie di costruttore che inizializza express e che ci permette di utilizzare tutti i metodi
app.use(cors())
app.use(express.json())
//const upload = multer({ dest: 'uploads/' });
const xmlBodyParser = require('express-xml-bodyparser');
const fs = require('fs');
const xml2js = require('xml2js');

const {
    SitemapStream,
    streamToPromise
} = require('sitemap');

const sitemap = new SitemapStream({
    hostname: 'https://viaggiditony.onrender.com'
});

// Aggiungi le pagine del sito
sitemap.write({
    url: '/',
    changefreq: 'daily',
    priority: 1.0
});
sitemap.write({
    url: '/trekking',
    changefreq: 'weekly',
    priority: 0.8
});
sitemap.write({
    url: '/contatti',
    changefreq: 'monthly',
    priority: 0.5
});
sitemap.end();

streamToPromise(sitemap).then((data) => {
    fs.writeFileSync('./public/sitemap.xml', data.toString());
    //console.log('Sitemap generata!');
});


app.use('/sitemap.xml', express.static(__dirname + '/public/sitemap.xml'));



// Connessione a MongoDB
let db, bucket;


app.post('/upload', (req, res) => {
    const filePath = path.join(__dirname, 'uploads', req.file.filename);
    const uploadStream = bucket.openUploadStream(req.file.filename);
    const fileStream = fs.createReadStream(filePath);

    fileStream.pipe(uploadStream)
        .on('error', err => {
            //console.error("Errore durante l'upload:", err);
            res.status(500).send('Errore durante l\'upload.');
        })
        .on('finish', () => {
            fs.unlinkSync(filePath); // Elimina il file temporaneo
            res.send('Immagine caricata con successo!');
        });
});




app.put('/imgBin/:filename', (req, res) => {
    //console.log(req.params)
    saveImageToMongo(req.params.filename, "2024-08-21")
})
app.get('/imageBin/:date', async (req, res) => {
    const client = new mongoClient(uri)
    var date = req.params.date
    try {
        await client.connect();
        const database = client.db('trekking');
        const treksCollection = database.collection('treks');

        // Recupera il documento con l'immagine
        const trek = await treksCollection.findOne({
            date: date
        });

        if (trek && trek.image) {
            // Recupera il buffer dell'immagine
            const imageBuffer = trek.image.buffer;

            // Imposta l'intestazione della risposta per il tipo di contenuto immagine
            res.setHeader('Content-Type', 'image/jpeg'); // Modifica se il formato dell'immagine è diverso (ad esempio, 'image/png')

            // Invia il buffer dell'immagine come risposta
            res.send(imageBuffer);
        } else {
            res.status(404).send('Immagine non trovata!');
        }
    } catch (err) {
        res.status(500).send('Errore del server');
        //console.error(err);
    } finally {
        await client.close();
    }
});




app.get('/image/:filename', (req, res) => {
    //console.log(req.params)
    const {
        filename
    } = req.params;
    const downloadStream = bucket.openDownloadStream(filename);

    downloadStream.on('error', () => {
        res.status(404).send('Immagine non trovata');
    });
    res.setHeader('Content-Type', 'image/jpeg')
    downloadStream.pipe(res);
});


app.use(xmlBodyParser({
    xmlParseOptions: {
        normalize: true, // Normalizza gli spazi e i ritorni a capo
        normalizeTags: true, // Normalizza i tag a minuscolo
        explicitArray: false // Se impostato a `false`, non metterà gli elementi in un array
    }
}));




app.post("/saveGPX", async (req, res) => {
    const client = new mongoClient(uri);

    try {
        await client.connect();

        const db = client.db('trekking'); // Nome del database
        const collection = db.collection('treks'); // Nome della collezione
        //console.log("qui")
        //console.log(req.body)
        const gpxData = req.body

        // Salva il file GPX come dati binari in MongoDB
        await collection.insertOne({
            gpx: JSON.stringify(gpxData)
        });

        //console.log('File GPX salvato con successo:');

    } finally {
        await client.close();
    }
})



app.post("/saveGPX2", async (req, res) => {
    //console.log(req.body.name)
    fs.readFile(req.body.filegpx, 'utf8', (err, xmlData) => {
        if (err) {
            //console.error('Errore nella lettura del file XML:', err);
            return;
        }

        // Converte l'XML in JSON
        const parser = new xml2js.Parser();
        parser.parseString(xmlData, async (err, result) => {
            if (err) {
                //console.error('Errore nella conversione dell\'XML:', err);
                return;
            }

            const client = new mongoClient(uri);

            try {
                await client.connect();

                const db = client.db('trekking'); // Nome del database
                const collection = db.collection('treks'); // Nome della collezione
                //console.log(req.body)
                req.body.gpx = result;
                //console.log(req.body)
                // Salva il file GPX come dati binari in MongoDB
                await collection.insertOne(
                    req.body);

                //console.log('File GPX salvato con successo:');

            } catch (e) {
                //console.log(e)
            }
        })
    })
})

app.get("/all", async (req, res) => {
    const client = new mongoClient(uri)
    try {
        client.connect();
        const db = client.db('trekking'); // Nome del database
        const collection = db.collection('treks'); // Nome della collezione
        var allT = await collection.find().toArray()
        //console.log(allT)
        res.json(allT)
    } finally {
        await client.close()
    }
})


app.get("/trek/:id", async (req, res) => {
    var id = req.params.id
    const client = new mongoClient(uri)
    try {
        client.connect();
        var trek = await client.db("trekking").collection("treks").findOne({
            _id: new ObjectId(id)
        })
        const builder = new xml2js.Builder();
        const xmlOutput = builder.buildObject(trek.gpx);
        //console.log("output")
        //console.log(xmlOutput)
        trek.gpx = xmlOutput
        res.json(trek)
    } catch (e) {
        console.log(e)
    }
})

app.get("/trekGPX/:id", async (req, res) => {
    var id = req.params.id
    const client = new mongoClient(uri)
    try {
        client.connect();
        var trek = await client.db("trekking").collection("treks").findOne({
            _id: new ObjectId(id)
        })
        const builder = new xml2js.Builder();
        const xmlOutput = builder.buildObject(trek.gpx);
        console.log(xmlOutput)
        res.json(xmlOutput)
        // Invia i dati binari
        //res.send(trek.gpx);
    } catch (e) {
        console.log(e)
    }
})