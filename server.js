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
const uri = ""
//const multer = require('multer');
const app = express() //una specie di costruttore che inizializza express e che ci permette di utilizzare tutti i metodi
app.use(cors())
app.use(express.json())
//const upload = multer({ dest: 'uploads/' });
const xmlBodyParser = require('express-xml-bodyparser'); 
const fs = require('fs');
const xml2js = require('xml2js');

const { SitemapStream, streamToPromise } = require('sitemap');

const sitemap = new SitemapStream({ hostname: 'https://viaggiditony.onrender.com' });

// Aggiungi le pagine del sito
sitemap.write({ url: '/', changefreq: 'daily', priority: 1.0 });
sitemap.write({ url: '/trekking', changefreq: 'weekly', priority: 0.8 });
sitemap.write({ url: '/contatti', changefreq: 'monthly', priority: 0.5 });
sitemap.end();

streamToPromise(sitemap).then((data) => {
  fs.writeFileSync('./public/sitemap.xml', data.toString());
  console.log('Sitemap generata!');
});


app.use('/sitemap.xml', express.static(__dirname + '/public/sitemap.xml'));



// Connessione a MongoDB
let db, bucket;
mongoClient.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(client => {
        db = client.db("trekking");
        bucket = new GridFSBucket(db, { bucketName: 'uploads' });
        console.log("Connesso a MongoDB");
    })
    .catch(err => console.error("Errore di connessione:", err));


    // Configurazione Multer per l'upload dei file
    const storage = multer.diskStorage({
        destination: (req, file, cb) => {
            cb(null, 'uploads/'); // Cartella temporanea per salvare i file
        },
        filename: (req, file, cb) => {
            cb(null, `${file.originalname}`);
        }
    });
    
    const upload = multer({ storage });
    
    // Crea la cartella 'uploads' se non esiste
    if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');


    async function saveImageToMongo(imageName, data) {
        const client = new mongoClient(uri)
      console.log("bin")
        try {
          await client.connect();
          const database = client.db('trekking'); // nome del database
          const treksCollection = database.collection('treks'); // nome della collezione
      
          // Leggi il file immagine
          const imagePath = path.join(__dirname, imageName+'.jpg');
          const imageBuffer = fs.readFileSync(imagePath); // Legge il file immagine in un buffer
      
          // Crea un oggetto BinData per MongoDB
          const binaryImage = new Binary(imageBuffer);
      
          // Salva l'immagine come campo binario nel documento del trek
          await treksCollection.updateOne(
            { date: data }, // Criterio di selezione del documento
            { $set: { image: binaryImage } }
          );
      
          console.log('Immagine salvata con successo nel database!');
        } catch (err) {
          console.error('Errore:', err);
        } finally {
          await client.close();
        }
      }

    app.post('/upload',  (req, res) => {
        const filePath = path.join(__dirname, 'uploads', req.file.filename);
        const uploadStream = bucket.openUploadStream(req.file.filename);
        const fileStream = fs.createReadStream(filePath);
    
        fileStream.pipe(uploadStream)
            .on('error', err => {
                console.error("Errore durante l'upload:", err);
                res.status(500).send('Errore durante l\'upload.');
            })
            .on('finish', () => {
                fs.unlinkSync(filePath);  // Elimina il file temporaneo
                res.send('Immagine caricata con successo!');
            });
    });






    app.put('/imgBin/:filename', (req, res)=>{
        console.log(req.params)
        saveImageToMongo(req.params.filename, "2024-08-21")
    })
    app.get('/imageBin/:date', async (req, res) => {
        const client = new mongoClient(uri)
        var date=req.params.date
        try {
          await client.connect();
          const database = client.db('trekking');
          const treksCollection = database.collection('treks');
          
          // Recupera il documento con l'immagine
          const trek = await treksCollection.findOne({date: date});
      
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
          console.error(err);
        } finally {
          await client.close();
        }
      });











    app.get('/image/:filename', (req, res) => {
        console.log(req.params)
        const { filename } = req.params;
        const downloadStream = bucket.openDownloadStream(filename);
    
        downloadStream.on('error', () => {
            res.status(404).send('Immagine non trovata');
        });
        res.setHeader('Content-Type', 'image/jpeg')
        downloadStream.pipe(res);
    });


app.use(xmlBodyParser({
    xmlParseOptions: {
      normalize: true,  // Normalizza gli spazi e i ritorni a capo
      normalizeTags: true,  // Normalizza i tag a minuscolo
      explicitArray: false  // Se impostato a `false`, non metterà gli elementi in un array
    }
  }));





app.post("/saveGPX", async (req, res) => {
    const client = new mongoClient(uri);
  
    try {
      await client.connect();
  
      const db = client.db('trekking'); // Nome del database
      const collection = db.collection('treks'); // Nome della collezione
      console.log("qui")
      console.log(req.body)
        const gpxData = req.body
  
      // Salva il file GPX come dati binari in MongoDB
      await collection.insertOne({
        gpx: JSON.stringify(gpxData)
      });
  
      console.log('File GPX salvato con successo:');

    } finally {
      await client.close();
    }
}
)



app.post("/saveGPX2", async (req, res) => {
    console.log(req.body.name)
    fs.readFile(req.body.filegpx, 'utf8', (err, xmlData) => {
  if (err) {
    console.error('Errore nella lettura del file XML:', err);
    return;
  }

  // Converte l'XML in JSON
  const parser = new xml2js.Parser();
  parser.parseString(xmlData, async (err, result) => {
    if (err) {
      console.error('Errore nella conversione dell\'XML:', err);
      return;
    }

    const client = new mongoClient(uri);
  
    try {
      await client.connect();
  
      const db = client.db('trekking'); // Nome del database
      const collection = db.collection('treks'); // Nome della collezione
      console.log(req.body)
      req.body.gpx = result;
      console.log(req.body)
      // Salva il file GPX come dati binari in MongoDB
      await collection.insertOne(
        req.body);
  
      console.log('File GPX salvato con successo:');

    } catch(e) {
        console.log(e)
    }
})
}
)
})

app.get("/all", async (req,res) =>{
    const client = new mongoClient(uri)
    try{
        client.connect();
        const db = client.db('trekking'); // Nome del database
        const collection = db.collection('treks'); // Nome della collezione
        var allT = await collection.find().toArray()
       console.log(allT)
         res.json(allT)
    }
    finally{
        await client.close()
    }
})


app.get("/trek/:id", async (req, res) => {
    var id = req.params.id
    const client = new mongoClient(uri)
    try{
        client.connect();
        var trek = await client.db("trekking").collection("treks").findOne({_id: new  ObjectId(id)})
        const builder = new xml2js.Builder();
    const xmlOutput = builder.buildObject(trek.gpx);
    //console.log("output")
    //console.log(xmlOutput)
    trek.gpx = xmlOutput
        res.json(trek)
    }
    catch(e){
        console.log(e)
    }
})

app.get("/trekGPX/:id", async (req, res) => {
    var id = req.params.id
    const client = new mongoClient(uri)
    try{
        client.connect();
        var trek = await client.db("trekking").collection("treks").findOne({_id: new  ObjectId(id)})
        const builder = new xml2js.Builder();
    const xmlOutput = builder.buildObject(trek.gpx);
       console.log(xmlOutput)
        res.json(xmlOutput)
        // Invia i dati binari
        //res.send(trek.gpx);
    }
    catch(e){
        console.log(e)
    }
})





app.post("/login", async (req, res) => {
    var login = req.body

    if (login.email == undefined) {
        res.status(400).send("Missing Email")
        return
    }
    if (login.password == undefined) {
        res.status(400).send("Missing Password")
        return
    }

    //login.password = hash(login.password)

    var snmClient = await new mongoClient(uri).connect()
    var filter = {
        $and: [
            { "email": login.email },
            { "password": crypto.createHash('md5')
                .update(login.password)
                .digest('hex') }
        ]
    }
    var loggedUser = await snmClient.db("SNM")
        .collection('users')
        .findOne(filter);
    console.log(loggedUser)

    //loggedUser._id = new ObjectId("645e9ff8410d608347371b72")


    if (loggedUser == null) {
        res.status(401).json({success: false})
    } else {
        res.json(loggedUser)
    }

}
)



app.delete("/user/:id", async (req, res) => {
    var id = req.params.id
    var snmClient = await new mongoClient(uri).connect()
    try{
    await snmClient.db("SNM")
        .collection('users')
        .deleteOne({ "_id": new ObjectId(id) })
        await snmClient.db("SNM").collection('playlist').deleteMany({"id_user": id})
        res.status(200).json({success: true})
        
    }
    catch(err) {
        req.send(err).json({success: false})
    }
})



/* app.get('/users/:id', async function (req, res) {
    // Ricerca nel database
    var id = req.params.id
    var snmClient = await new mongoClient(uri).connect()
    var user = await snmClient.db("SNM")
        .collection('users')
        .find({ "_id": new ObjectId(id) })
        .toArray();
    res.json(user)
}) */

app.put('/unfollow/:idP', async function (req, res) {
    try{
        var data = req.body
        idP = req.params.idP
        var snmClient = await new mongoClient(uri).connect()
        var replace = { "_id": new ObjectId(idP), "songs": data.songs, "description": data.description, "url": data.url, "name": data.name, "id_user": data.id_user, "tags": data.tags, "public": data.public, "follower": data.follower}
        var filter =  {  "_id": new ObjectId(idP)};
        await snmClient.db("SNM").collection("playlist").replaceOne(filter, replace)
        res.json({success: true})
        
    }
    catch(e){
        console.log(e)
    }
})

app.get('/user/:id', async function (req, res) {
    // Ricerca nel database
    var id = req.params.id
    console.log(id)
    var snmClient = await new mongoClient(uri).connect()
    var user = await snmClient.db("SNM")
        .collection('users')
        .find({ "_id": new ObjectId(id) })
        .toArray();
        console.log(user)
    res.json(user)
}) 

/app.get('/userChangePassword/:id&:OldPassword', async function (req, res) {
    // Ricerca nel database
    var id = req.params.id
    //console.log(id)
    var OldPassword = req.params.OldPassword
    //console.log(OldPassword)
     OldPassword = crypto.createHash("md5").update(OldPassword).digest("hex")
     //console.log(OldPassword)
    var snmClient = await new mongoClient(uri).connect()
    var user = await snmClient.db("SNM")
        .collection('users')
        .find({ "_id": new ObjectId(id) })
        .toArray();
    //console.log(user[0].password)
    if(OldPassword == user[0].password){
        res.json({success: true})
    }
    else{
        res.json({success: false})
    }
    
}) 

/* app.get('/users', async function (req, res) {
    var snmClient = await new mongoClient(uri).connect()
    var users = await snmClient.db("SNM").collection('users').find().project({ "password": 0 }).toArray();
    res.json(users)

}) */

app.get('/user/:id', async function (req, res) {
    var snmClient = await new mongoClient(uri).connect()
    console.log(req.params.id)
    var user = await snmClient.db("SNM").collection('users').find().project({ "_id": new ObjectId(req.params.id) });
    res.json(user)
})

app.post('/users', async function (req, res) {
    addUser(req.body, res)
})

async function addUser(user, res) {
    var url = user.url
    
    if (user.nome == "") {
        res.status(400).send("Missing Name")
        return
    }
    if (user.cognome == "") {
        res.status(400).send("Missing Surname")
        return
    }
    if (user.email == "") {
        res.status(400).send("Missing Email")
        return
    }
    if (user.password == "" || user.password.length < 8) {
        res.status(400).send("Password is missing or too short")
        return
    }
    if (user.password != user.password2) {
        res.status(400).send("The passwords do not match")
        return
    }
    if (user.date == "") {
        res.status(400).send("Date is missing")
        return
    }
    if (user.url == "") {
        user.url = "https://png.pngitem.com/pimgs/s/146-1468281_profile-icon-png-transparent-profile-picture-icon-png.png"
    }
    console.log("user url: "+user.url)
    var snmClient = await new mongoClient(uri).connect()
    try{
    var email = await snmClient.db("SNM").collection('users').findOne({"email": user.email})
    if(email!=null) {
        res.status(400).send("Email already exists")
        return
    }
}
catch(err) {
    console.error(err)
}
    user.password = crypto.createHash('md5')
    .update(user.password)
    .digest('hex')
    user.password2 = null
    try {
        var items = await snmClient.db("SNM").collection('users').insertOne(user)
        res.json(items)

    }
    catch (e) {
        console.log('catch in test');
        if (e.code == 11000) {
            res.status(400).send("Utente già presente")
            return
        }
        res.status(500).send(`Errore generico: ${e}`)

    };
}

app.put("/removeSong/:idPlay", async function (req, res) {
    try{
        var data = req.body
        var idPlay = req.params.idPlay
        var snmClient = await new mongoClient(uri).connect()
        var replace = { "_id": new ObjectId(idPlay), "songs": data.songs, "description": data.description, "url": data.url, "name": data.name, "id_user": data.id_user, "tags": data.tags, "public": data.public}
        var filter =  {  "_id": new ObjectId(idPlay)};
        await snmClient.db("SNM").collection("playlist").replaceOne(filter, replace)
        res.json({success: true,})
    }
    catch (e) {
        //res.status(400).sendJSON({"error": e});
        console.log(e);
    }
})

app.put("/modifyPlaylist/:idPlaylist", async function(req, res){
    try{
        var data = req.body
        idPlaylist = req.params.idPlaylist
        var filter =  {  "_id": new ObjectId(idPlaylist)};
        var snmClient = await new mongoClient(uri).connect()
        await snmClient.db("SNM").collection("playlist").updateOne(filter, {$set: {"name": data.name, "description": data.description, "url": data.url, "tags": data.tags, "public": data.public}})
        res.json({success: true})
    }
    catch(e){
        console.log(e)
    }
})

app.put("/ChangePassword/:idUser", async function(req, res){
    try{
        var data = req.body
        id_user = req.params.idUser
        data.NewPassword = crypto.createHash('md5').update(data.NewPassword).digest('hex')
        var filter =  {  "_id": new ObjectId(id_user)};
        var snmClient = await new mongoClient(uri).connect()
        await snmClient.db("SNM").collection("users").updateOne(filter, {$set: {"password": data.NewPassword}})
        res.json({success: true,})
        

    }
    catch (e) {
        console.log(e)
    }
})

app.post("/addPlaylist/:idUser", async function (req, res) {
    try{
        var data = req.body
        id_user = req.params.idUser
        console.log(data)
        var snmClient = await new mongoClient(uri).connect()
        var SamePlaylist = {"songs": data.songs, "description": data.description, "url": data.url, "name": data.name, "id_user": id_user, "tags": data.tags, "public": data.public}
        await snmClient.db("SNM").collection("playlist").insertOne(SamePlaylist)
        res.json({success: true,})
    }
    catch(e){
        console.log(e);
    }
})

app.post("/clone/:idUser", async function (req, res) {
    try{
        var data = req.body
        id_user = req.params.idUser
        console.log(data)
        var snmClient = await new mongoClient(uri).connect()
        var SamePlaylist = {"songs": data.songs, "description": data.description, "url": data.url, "name": data.name, "id_user": id_user, "tags": data.tags, "public": data.public}
        await snmClient.db("SNM").collection("playlist").insertOne(SamePlaylist)
        res.json({success: true,})
    }
    catch(e){
        console.log(e);
    }
})

app.put("/importa/:idUser", async function (req, res) {
    try{
        var data = req.body
        var pwmClient = await new mongoClient(uri).connect()
        var filter = { "_id": new ObjectId(data._id) }
        console.log(filter)
        var updatedToInsert = {
            $push: {follower: req.params.idUser},
        }

        var item = await pwmClient.db("SNM")
            .collection('playlist')
            .updateOne(filter, updatedToInsert)
            
        console.log(item)
        res.json({success: true,})
    }
    catch(e){
        console.log(e);
    }
})

app.put('/user/:id', async function (req, res) {
    
    var id = req.params.id
    var data = req.body
    if(data.nome ==""){
        res.json({success: false,message:"Il nome non può essere vuoto"})
        return
    }
    if(data.cognome ==""){
        res.json({success: false, message: "Il cognome non può essere vuoto"})
        return
    }
    if(data.date ==""){
        res.json({success: false, message: "La data di nascita deve essere selezionata"})
        return
    }
    if(data.url ==""){
        data.url = "https://png.pngitem.com/pimgs/s/146-1468281_profile-icon-png-transparent-profile-picture-icon-png.png"
    }
    try{
    var snmClient = await new mongoClient(uri).connect()
    
    var filter = { "_id": new ObjectId(id) };
    

    var item = await snmClient.db("SNM").collection("users").updateOne(filter, {$set: {"nome": data.nome, "cognome": data.cognome, "email": data.email, "date": data.date, "genres": data.genres, "favorite": data.favorite, "url": data.url}})

    res.json(item)
}
catch (err) {
    console.log(err);
        //res.status(500).send(`Errore generico: ${err}`)

    };
})

/* app.get('/user/playlist/:id', async function(req, res){
    var idPlay = req.params.id
    console.log(idPlay)
    var snmClient = await new mongoClient(uri).connect()
    var play = await snmClient.db("SNM").collection('playlist').findOne({"_id": new ObjectId(idPlay)})
    res.json(play)

}) */

app.get('/playlists-user-all/:idUser', async function(req, res){  //anche quelle che segue
    var id = req.params.idUser
    console.log(id)
    var snmClient = await new mongoClient(uri).connect()
    var play = await snmClient.db("SNM").collection('playlist').find({$or: [{"id_user": id}, {"follower": id}]}).toArray()
    console.log(play)
    res.json(play)

})

app.get('/playlists-user/:idUser', async function(req, res){
    var id = req.params.idUser
    console.log(id)
    var snmClient = await new mongoClient(uri).connect()
    var play = await snmClient.db("SNM").collection('playlist').find({"id_user": id}).toArray()
    console.log(play)
    res.json(play)

})

app.get('/playlists/:id', async function(req, res){
    var idPLay = req.params.id
    console.log(idPLay)
    var snmClient = await new mongoClient(uri).connect()
    var play = await snmClient.db("SNM").collection('playlist').findOne({"_id": new ObjectId(idPLay)})
    res.json(play)

})

app.put('/playlists/:id&:id_song&:name&:url_img&:duration', async function(req, res){
    try {
        console.log(req.params.id_song)
        var pwmClient = await new mongoClient(uri).connect()
        console.log(req.params.id)
        var filter = { "_id": new ObjectId(req.params.id) }
        var play= await pwmClient.db("SNM")
        .collection('playlist')
        .find(filter).toArray()
        //console.log(play[0].songs[0].id)
        for(i=0; i<play[0].songs.length; i++){
            if(play[0].songs[i].id == req.params.id_song){
                res.status(404).json({message : "Impossibile aggiungere la canzone poichè già presente"})
                return
            }
        }
        var updatedToInsert = {
            $push: {"songs": {"id": req.params.id_song, "name": req.params.name, "url": req.params.url_img, "duration_ms": req.params.duration}}
        }

        var item = await pwmClient.db("SNM")
            .collection('playlist')
            .updateOne(filter, updatedToInsert)

        res.json({message : "Canzone aggiunta correttamente", item: item})
        //66ddbab46693534d1b2b2858
    } catch (e) {
        console.log('catch in test add song');
        if (e.code == 11000) {
            res.status(400).send("Utente già presente")
            return
        }
        res.status(500).send(`Errore generico: ${e}`)

    };
})

app.get("/searchPlaylists/:name", async function(req, res){
    console.log(req.params.name)
    var snmClient = await new mongoClient(uri).connect()
    var items = await snmClient.db("SNM").collection('playlist').find({name: req.params.name}).toArray()
    //console.log(items)
    res.json(items)
})

app.get('/filtra/:tags&:songs&:title', async function(req, res) {
    var tags = req.params.tags
    tags = tags.split(",")
    var title = req.params.title
    console.log("title all")
    var songs = req.params.songs
    songs = songs.split(",")
    var snmClient = await new mongoClient(uri).connect()
    //console.log(data)
    var items = await snmClient.db("SNM").collection('playlist').find({tags: {$all: tags}, "songs.name": {$all: songs}, name: title}).toArray()
    res.json(items)
})

app.get('/filtra/&:songs&:title', async function(req, res) {
    
    var title = req.params.title
    console.log("title song")
    var songs = req.params.songs
    songs = songs.split(",")
    var snmClient = await new mongoClient(uri).connect()
    //console.log(data)
    var items = await snmClient.db("SNM").collection('playlist').find({ "songs.name": {$all: songs}, name: title}).toArray()
    res.json(items)
})

app.get('/filtra/:tags&&:title', async function(req, res) {
    var tags = req.params.tags
    tags = tags.split(",")
    var title = req.params.title
    console.log("title tags")
    var snmClient = await new mongoClient(uri).connect()
    //console.log(data)
    var items = await snmClient.db("SNM").collection('playlist').find({tags: {$all: tags},  name: title}).toArray()
    res.json(items)
})

app.get('/filtra/:tags&:songs&', async function(req, res) {
    var tags = req.params.tags
    tags = tags.split(",")
    
    console.log("no title")
    var songs = req.params.songs
    songs = songs.split(",")
    var snmClient = await new mongoClient(uri).connect()
    //console.log(data)
    var items = await snmClient.db("SNM").collection('playlist').find({tags: {$all: tags}, "songs.name": {$all: songs}}).toArray()
    res.json(items)
})

app.get('/filtra/:tags&&', async function(req, res) {
    var tags = req.params.tags
    tags = tags.split(",")
    console.log("qua")
   // var songs = req.params.songs
    var snmClient = await new mongoClient(uri).connect()
    //console.log(data)
    var items = await snmClient.db("SNM").collection('playlist').find({tags: {$all: tags}}).toArray()
    res.json(items)
})
app.get('/filtra/&:songs&', async function(req, res) {
    //var tags = req.params.tags
    
    var song = req.params.songs
    song = song.split(",")
    console.log("songs")
    var snmClient = await new mongoClient(uri).connect()
    //console.log(data)
    var items = await snmClient.db("SNM").collection('playlist').find({"songs.name": {$all: song}}).toArray()
    res.json(items)
    
})

app.get('/filtra/&&:title', async function(req, res) {
    //var tags = req.params.tags
    
    var title = req.params.title
    var snmClient = await new mongoClient(uri).connect()
    //console.log(data)
    var items = await snmClient.db("SNM").collection('playlist').find({ name: title}).toArray()
    res.json(items)
    
})

app.post('/createPlaylist/:userId',async function(req, res){
    try {
        console.log(req.params.userId)
        var user= req.params.userId
        var snmClient = await new mongoClient(uri).connect()
        
        try{
            var playlist = {
                _id: req.body._id,
                id_user: user,
                name: req.body.title,
                description: req.body.description,
                url: req.body.url,
                songs: req.body.songs,
                public: req.body.public,
                tags: req.body.tags,
                follower: []

            }
            var items = await snmClient.db("SNM").collection('playlist').insertOne(playlist)
            console.log(items)
        }
        catch(err) {
            console.log('catch in test');
        }
        res.json(items)


    } catch (e) {
        console.log('catch in test');
        if (e.code == 11000) {
            res.status(400).send("Utente già presente")
            return
        }
        res.status(500).send(`Errore generico: ${e}`)

    };
})

app.delete('/deletePlaylist/:id', async function (req, res) {
    try {
        var snmClient = await new mongoClient(uri).connect()
        await snmClient.db("SNM").collection('playlist').deleteOne( { "_id" : new ObjectId(req.params.id) } );
        res.status(200).send({ "success": true})
     } catch (e) {
        console.log(e);
     }
})

app.listen(3100, "0.0.0.0", () => {       //
    console.log("Server partito porta 3100")
})