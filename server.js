const { MongoClient, ObjectId, Binary } = require("mongodb");
const express = require("express");
const path = require("path");
const cors = require("cors");
const axios = require("axios");
const requestIp = require("request-ip");
const bodyParser = require("body-parser");
const multer = require("multer");
const xml2js = require("xml2js");
const fs = require("fs");
const xmlBodyParser = require("express-xml-bodyparser");

const app = express();

// --- Middleware ---
app.use(express.json());
app.use(cors());
app.use(requestIp.mw());
app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ limit: "50mb", extended: true, parameterLimit: 50000 }));
app.use(xmlBodyParser({
  xmlParseOptions: {
    normalize: true,
    normalizeTags: true,
    explicitArray: false
  }
}));

// Multer
const storage = multer.memoryStorage();
const upload = multer({ storage, limits: { fileSize: 100 * 1024 * 1024 } });

// Views
app.use(express.static(path.join(__dirname, "public")));
app.use(express.static(__dirname));
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// --- Variabili globali ---
const url = "https://viaggiditony.onrender.com";
let trekkings = [];
let totalPages;

// --- MongoDB (un solo client globale con pooling) ---
const client = new MongoClient(process.env.uri, { maxPoolSize: 20 });
let db;

async function connectDB() {
  if (!db) {
    await client.connect();
    db = client.db("trekking");
    console.log("✅ Connesso a MongoDB");
  }
}
connectDB();

// --- Funzione Telegram ---
async function telegram(req) {
  try {
    const ip = req.clientIp || req.headers["x-forwarded-for"] || req.connection.remoteAddress;
    const userAgent = req.headers["user-agent"];
    const referer = req.headers["referer"] || "Diretto";

    let location = "Sconosciuta";
    try {
      const geoRes = await axios.get("https://api.ipstack.com/" + ip, {
        params: { access_key: process.env.apikeyIP }
      });
      if (geoRes.data && geoRes.data.city) {
        location = `${geoRes.data.city}, ${geoRes.data.country_name}`;
      }
    } catch (error) {
      console.error("Errore nella geolocalizzazione:", error.message);
    }

    const message = `
📡 *Nuovo Visitatore!*  
🌍 *IP:* ${ip}  
📌 *Località:* ${location}  
🖥 *User-Agent:* ${userAgent}  
🔗 *Referer:* ${referer}
    `;

    if (ip !== "128.140.8.200") {
      await axios.post("https://api.telegram.org/bot" + process.env.telegram_token + "/sendMessage", {
        chat_id: process.env.chat_id,
        text: message,
        parse_mode: "Markdown"
      });
    }
  } catch (e) {
    console.log("Errore Telegram:", e);
  }
}

// --- ROTTE --- //

app.post("/saveGPX2", upload.single("gpxFile"), async (req, res) => {
  if (req.headers["authorization"] !== process.env.token) {
    return res.status(401).json({ message: "Accesso non autorizzato" });
  }

  try {
    const parser = new xml2js.Parser();
    parser.parseString(req.file.buffer.toString(), async (err, result) => {
      if (err) return res.status(400).json({ error: "Errore parsing XML" });

      const collection = db.collection("treks");
      const ArrayEq = JSON.parse(req.body.equipment);

      req.body.gpx = result;
      req.body.equipment = ArrayEq;
      req.body.numFoto = new Int32(req.body.numFoto)

      await collection.insertOne(req.body);
      res.json({ message: "File GPX salvato con successo" });
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Errore interno" });
  }
});

app.get("/all", async (req, res) => {
  try {
    trekkings = await db.collection("treks").find().toArray();
    await telegram(req);
    res.json(trekkings);
  } catch (e) {
    res.status(500).json({ error: "Errore interno" });
  }
});

app.get("", async (req, res) => {
  try {
    await telegram(req);
    const page = parseInt(req.query.page) || 1;
    const perPage = 12;
    const totalItems = await db.collection("treks").countDocuments();
    let treks = await db.collection("treks").find({}).toArray();

    cronological(treks);
    totalPages = Math.ceil(totalItems / perPage);

    res.render("index", { treks, page, totalPages });
  } catch (e) {
    res.status(500).json({ error: "Errore interno" });
  }
});

app.get("/lista", (req, res) => {
  const tutti = Array.from({ length: 50 }, (_, i) => `Elemento ${i + 1}`);
  const page = parseInt(req.query.page) || 1;
  const perPage = 12;
  const start = (page - 1) * perPage;
  const end = start + perPage;

  const items = tutti.slice(start, end);
  const totalPages = Math.ceil(tutti.length / perPage);

  res.render("lista", { items, page, totalPages });
});

app.get("/trekGPX/:id", async (req, res) => {
  try {
    const trek = await db.collection("treks").findOne({ _id: new ObjectId(req.params.id) });
    if (!trek) return res.status(404).json({ error: "Non trovato" });

    const builder = new xml2js.Builder();
    const xmlOutput = builder.buildObject(trek.gpx);
    res.json(xmlOutput);
  } catch (e) {
    res.status(500).json({ error: "Errore interno" });
  }
});

app.get("/trekID/:nome", async (req, res) => {
  try {
    const trek = await db.collection("treks").findOne({ name: req.params.nome });
    if (!trek) return res.status(404).json({ error: "Non trovato" });

    const builder = new xml2js.Builder();
    const xmlOutput = builder.buildObject(trek.gpx);
    trek.gpx = xmlOutput;

    res.json(trek);
  } catch (e) {
    res.status(500).json({ error: "Errore interno" });
  }
});

app.get("/trekking/:nome", async (req, res) => {
  try {
    const trek = await db.collection("treks").findOne({ name: req.params.nome });
    if (!trek) return res.status(404).json({ error: "Non trovato" });

    const builder = new xml2js.Builder();
    const xmlOutput = builder.buildObject(trek.gpx);
    trek.gpx = xmlOutput;

    res.render("trekking/trekking-details", trek);
  } catch (e) {
    res.status(500).json({ error: "Errore interno" });
  }
});

app.get("/sitemap.xml", async (req, res) => {
  const baseUrl = url;
  const response = await axios.get(url + "/all");
  const urls = ["/"];

  for (let i = 0; i < trekkings.length; i++) {
    urls.push("/trekking/" + trekkings[i].name);
  }

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
  <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    ${urls.map(u => `
      <url>
        <loc>${baseUrl}${u}</loc>
        <priority>0.8</priority>
      </url>`).join("")}
  </urlset>`;

  res.header("Content-Type", "application/xml");
  res.send(sitemap);
});

app.post("/filter", async (req, res) => {
  try {
    const data = req.body;
    const response = await axios.get(url + "/all");
    const trekkingList = response.data;

    const filtrati = trekkingList.filter(trekking => {
      return (
        (data.difficulty !== "" ? trekking.difficulty === data.difficulty : true) &&
        (data.distance !== "" ? Math.abs(trekking.distance - data.distance) <= 0.5 : true) &&
        (data.elevation !== "" ? Math.abs(trekking.elevation - data.elevation) <= 100 : true) &&
        (data.date !== "" ? trekking.date == data.date : true) &&
        (data.season !== "" ? trekking.season === data.season : true) &&
        (data.tipo !== "" ? trekking.tipo === data.tipo : true)
      );
    });

    res.json(filtrati);
  } catch (e) {
    res.status(500).json({ error: "Errore interno" });
  }
});

function cronological(trekkingList) {
  for (let i = 0; i < trekkingList.length - 1; i++) {
    if (trekkingList[i].date < trekkingList[i + 1].date) {
      const temp = trekkingList[i];
      trekkingList[i] = trekkingList[i + 1];
      trekkingList[i + 1] = temp;
      i = -1;
    }
  }
}

app.get("/ping", (req, res) => {
  res.send("ok");
});

// --- Start server ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server in ascolto su porta ${PORT}`));
