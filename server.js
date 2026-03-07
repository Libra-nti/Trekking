require("dotenv").config();
const { MongoClient, ObjectId } = require("mongodb");
const express = require("express");
const path = require("path");
const cors = require("cors");
const axios = require("axios");
const requestIp = require("request-ip");
const bodyParser = require("body-parser");
const multer = require("multer");
const xml2js = require("xml2js");
const helmet = require("helmet");                        // 🔒 FIX #8: header di sicurezza HTTP
const rateLimit = require("express-rate-limit");         // 🔒 FIX #6: rate limiting
const xmlBodyParser = require("express-xml-bodyparser");

const app = express();
app.set("trust proxy", true);

// ─────────────────────────────────────────────
// SECURITY MIDDLEWARE
// ─────────────────────────────────────────────

// 🔒 FIX #8: Helmet con CSP configurato per tutti i domini reali usati dal sito:
//   - Cloudinary (foto trekking)
//   - OpenStreetMap (tiles mappa Leaflet)
//   - Overpass API (rifugi/bivacchi sulla mappa)
//   - Leaflet + omnivore GPX + Chart.js (da CDN)
//   - ipstack (geolocalizzazione IP)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],

      // Immagini: Cloudinary (foto trekking) + OpenStreetMap (tiles mappa)
      imgSrc: [
        "'self'",
        "data:",
        "https://res.cloudinary.com",
        "https://*.tile.openstreetmap.org",
      ],

      // Script: Leaflet, omnivore GPX, Chart.js, Bootstrap, Popper
      scriptSrc: [
        "'self'",
        "https://unpkg.com",
        "https://cdnjs.cloudflare.com",
        "https://cdn.jsdelivr.net",      // Bootstrap + Popper
      ],

      // Stili: Bootstrap CSS + Leaflet (unsafe-inline per stili inline)
      styleSrc: [
        "'self'",
        "'unsafe-inline'",
        "https://unpkg.com",
        "https://cdnjs.cloudflare.com",
        "https://cdn.jsdelivr.net",      // Bootstrap CSS
      ],

      // Fetch/XHR: backend + Overpass API (mappa rifugi) + ipstack (geo IP)
      connectSrc: [
        "'self'",
        "https://overpass-api.de",
        "https://api.ipstack.com",
        "https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.min.js.map",
        "https://cdn.jsdelivr.net/npm/@popperjs/core@2.11.6/dist/umd/popper.min.js.map",
        "https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/css/bootstrap.min.css.map",
        "https://unpkg.com",            // source maps Leaflet
        "https://cdn.jsdelivr.net",     // source maps Bootstrap/Chart.js
        "https://cdnjs.cloudflare.com",
      ],

      // Font
      fontSrc: ["'self'", "https://fonts.gstatic.com"],

      // Nessun embed iframe esterno rilevato
      frameSrc: [
        "https://www.youtube.com",
        "https://cdn.embedly.com",

      ],

      // Blocca oggetti Flash e plugin obsoleti
      objectSrc: ["'none'"],
    }
  }
}));

// 🔒 FIX #5: CORS ristretto solo al dominio del sito
app.use(cors({
  origin: "https://viaggiditony.it",
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

// 🔒 FIX #6: Rate limiting globale — max 100 richieste ogni 15 minuti per IP
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Troppe richieste, riprova tra poco." }
});
app.use(globalLimiter);

// 🔒 FIX #6: Rate limiting più stretto per gli endpoint sensibili
const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: "Troppe richieste su questo endpoint." }
});

// ─────────────────────────────────────────────
// STANDARD MIDDLEWARE
// ─────────────────────────────────────────────

app.use(express.json());
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

// 🔒 FIX #9: Multer con validazione tipo file (solo GPX/XML) e limite ridotto a 10MB
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // ridotto da 100MB a 10MB
  fileFilter: (req, file, cb) => {
    const allowed = ["application/gpx+xml", "application/xml", "text/xml"];
    // Accetta anche se il mimetype non è riconosciuto ma l'estensione è .gpx
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(file.mimetype) || ext === ".gpx") {
      cb(null, true);
    } else {
      cb(new Error("Tipo di file non consentito. Solo file GPX/XML."));
    }
  }
});

// Views
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));

// ─────────────────────────────────────────────
// VARIABILI E DB
// ─────────────────────────────────────────────

const BASE_URL = "https://viaggiditony.it";

const mongoClient = new MongoClient(process.env.uri, { maxPoolSize: 20 });
let db;

async function connectDB() {
  if (!db) {
    await mongoClient.connect();
    db = mongoClient.db("trekking");
    console.log("✅ Connesso a MongoDB");
  }
}
connectDB();

// ─────────────────────────────────────────────
// HELPER: VALIDAZIONE INPUT
// ─────────────────────────────────────────────

// 🔒 FIX #3: Sanitizza i parametri stringa in ingresso (blocca caratteri pericolosi)
function sanitizeString(input) {
  if (typeof input !== "string") return null;
  // Rimuove caratteri che non hanno senso in un nome di trekking
  return input.replace(/[<>{}$|]/g, "").trim().slice(0, 200);
}

// 🔒 FIX #2: Schema di validazione per un nuovo trekking
function validateTrekBody(body) {
  const errors = [];

  if (!body.name || typeof body.name !== "string") errors.push("name mancante o non valido");
  if (!body.date || isNaN(Date.parse(body.date))) errors.push("date mancante o non valida");
  if (!body.description || typeof body.description !== "string") errors.push("description mancante");
  if (body.distance !== undefined && isNaN(parseFloat(body.distance))) errors.push("distance non valida");
  if (body.elevation !== undefined && isNaN(parseFloat(body.elevation))) errors.push("elevation non valida");
  if (body.numFoto !== undefined && isNaN(parseInt(body.numFoto))) errors.push("numFoto non valido");

  const allowedDifficulty = ["Escursionismo", "Ferrata", "Alpinismo", "Multipitch"];
  if (body.difficulty && !allowedDifficulty.includes(body.difficulty)) errors.push("difficulty non valida");

  const allowedSeason = ["Estate", "Autunno", "Inverno", "Primavera"];
  if (body.season && !allowedSeason.includes(body.season)) errors.push("season non valida");

  return errors;
}

// 🔒 FIX #2: Costruisce un oggetto "pulito" da inserire nel DB (nessun campo extra da req.body)
function buildTrekDocument(body, gpxParsed) {
  return {
    name: sanitizeString(body.name),
    date: body.date,
    description: sanitizeString(body.description),
    distance: parseFloat(body.distance) || null,
    elevation: parseFloat(body.elevation) || null,
    numFoto: parseInt(body.numFoto) || 0,
    difficulty: body.difficulty || null,
    season: body.season || null,
    location: sanitizeString(body.location) || null,
    tipo: sanitizeString(body.tipo) || null,
    equipment: Array.isArray(body.equipment) ? body.equipment : [],
    gpx: gpxParsed,
    createdAt: new Date()
  };
}

// ─────────────────────────────────────────────
// HELPER: NOTIFICA TELEGRAM
// ─────────────────────────────────────────────

// 🔒 FIX #10 (GDPR): Il tracking IP è mantenuto ma limitato solo all'uso interno.
// Assicurati di avere una Privacy Policy sul sito che lo menzioni.
async function telegram(req) {
  try {
    const ip = req.clientIp || req.headers["x-forwarded-for"] || req.connection.remoteAddress;
    const userAgent = req.headers["user-agent"];
    const referer = req.headers["referer"] || "Diretto";

    let location = "Sconosciuta";
    try {
      const geoRes = await axios.get(`https://api.ipstack.com/${ip}`, {
        params: { access_key: process.env.apikeyIP }
      });
      if (geoRes.data && geoRes.data.city) {
        location = `${geoRes.data.city}, ${geoRes.data.country_name}`;
      }
    } catch (error) {
      console.error("Errore geolocalizzazione:", error.message);
    }

    const message = `
📡 *Nuovo Visitatore!*
🌍 *IP:* ${ip}
📌 *Località:* ${location}
🖥 *User-Agent:* ${userAgent}
🔗 *Referer:* ${referer}
    `;

    // Escludi l'IP del server stesso
    if (ip !== "128.140.8.200") {
      await axios.post(`https://api.telegram.org/bot${process.env.telegram_token}/sendMessage`, {
        chat_id: process.env.chat_id,
        text: message,
        parse_mode: "Markdown"
      });
    }
  } catch (e) {
    console.error("Errore Telegram:", e.message);
  }
}

// ─────────────────────────────────────────────
// MIDDLEWARE: AUTENTICAZIONE TOKEN
// ─────────────────────────────────────────────

// 🔒 FIX #1: Middleware riutilizzabile per autenticazione — evita duplicazione
function requireAuth(req, res, next) {
  const authHeader = req.headers["authorization"];
  if (!authHeader || authHeader !== process.env.token) {
    return res.status(401).json({ message: "Accesso non autorizzato" });
  }
  next();
}

// ─────────────────────────────────────────────
// ROTTE
// ─────────────────────────────────────────────

// 🔒 FIX #1 + #2 + #9: Upload GPX con auth, validazione schema e tipo file
app.post("/saveGPX2", strictLimiter, requireAuth, upload.single("gpxFile"), async (req, res) => {
  try {
    // 🔒 FIX #2: Valida i campi prima di toccare il DB
    const errors = validateTrekBody(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ error: "Dati non validi", details: errors });
    }

    const parser = new xml2js.Parser();
    parser.parseString(req.file.buffer.toString(), async (err, result) => {
      if (err) return res.status(400).json({ error: "Errore parsing XML" });

      try {
        const collection = db.collection("treks");

        let equipment = [];
        try {
          equipment = JSON.parse(req.body.equipment);
          if (!Array.isArray(equipment)) throw new Error();
        } catch {
          return res.status(400).json({ error: "equipment deve essere un array JSON valido" });
        }

        // 🔒 FIX #2: Inserisci solo campi esplicitamente consentiti (non req.body diretto!)
        const doc = buildTrekDocument({ ...req.body, equipment }, result);
        await collection.insertOne(doc);
        res.json({ message: "File GPX salvato con successo" });
      } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Errore interno" });
      }
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Errore interno" });
  }
});

// 🔒 FIX #4: /all ora richiede autenticazione — non è più pubblico
app.get("/all", requireAuth, async (req, res) => {
  try {
    const trekkings = await db.collection("treks").find(
      {},
      // Proiezione: escludi il campo GPX grezzo (pesante e non serve esternamente)
      { projection: { gpx: 0 } }
    ).toArray();
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

    // 🔒 FIX #11 (performance): Ordina direttamente in MongoDB invece di bubble sort in JS
    const treks = await db.collection("treks")
      .find({}, { projection: { gpx: 0 } })
      .sort({ date: -1 })
      .toArray();

    const totalPages = Math.ceil(totalItems / perPage);
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
    // 🔒 FIX #3: Valida che l'id sia un ObjectId MongoDB valido
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: "ID non valido" });
    }

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
    // 🔒 FIX #3: Sanitizza il parametro nome prima di usarlo in query
    const nome = sanitizeString(req.params.nome);
    if (!nome) return res.status(400).json({ error: "Nome non valido" });

    const trek = await db.collection("treks").findOne({ name: nome });
    if (!trek) return res.status(404).json({ error: "Non trovato" });

    const builder = new xml2js.Builder();
    trek.gpx = builder.buildObject(trek.gpx);
    res.json(trek);
  } catch (e) {
    res.status(500).json({ error: "Errore interno" });
  }
});

app.get("/trekking/:nome", async (req, res) => {
  try {
    // 🔒 FIX #3: Sanitizza il parametro nome
    const nome = sanitizeString(req.params.nome);
    if (!nome) return res.status(400).json({ error: "Nome non valido" });

    const trek = await db.collection("treks").findOne({ name: nome });
    if (!trek) return res.status(404).json({ error: "Non trovato" });

    const builder = new xml2js.Builder();
    trek.gpx = builder.buildObject(trek.gpx);
    res.render("trekking/trekking-details", trek);
  } catch (e) {
    res.status(500).json({ error: "Errore interno" });
  }
});

app.get("/sitemap.xml", async (req, res) => {
  try {
    const trekkings = await db.collection("treks")
      .find({}, { projection: { name: 1 } })
      .toArray();

    const urls = ["/", ...trekkings.map(t => `/trekking/${encodeURIComponent(t.name)}`)];

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${urls.map(u => `
  <url>
    <loc>${BASE_URL}${u}</loc>
    <priority>0.8</priority>
  </url>`).join("")}
</urlset>`;

    res.header("Content-Type", "application/xml");
    res.send(sitemap);
  } catch (e) {
    res.status(500).send("Errore generazione sitemap");
  }
});

// 🔒 FIX #7: /filter ora interroga il DB direttamente — niente chiamata HTTP interna a se stesso
app.post("/filter", async (req, res) => {
  try {
    const data = req.body;

    // 🔒 FIX #3: Sanitizza tutti i parametri del filtro
    const difficulty = sanitizeString(data.difficulty) || "";
    const location   = sanitizeString(data.location) || "";
    const season     = sanitizeString(data.season) || "";
    const tipo       = sanitizeString(data.tipo) || "";
    const distance   = parseFloat(data.distance) || null;
    const elevation  = parseFloat(data.elevation) || null;

    // Costruisci la query MongoDB direttamente
    const query = {};
    if (difficulty) query.difficulty = difficulty;
    if (location)   query.location = location;
    if (season)     query.season = season;
    if (tipo)       query.tipo = tipo;

    const trekkingList = await db.collection("treks")
      .find(query, { projection: { gpx: 0 } })
      .toArray();

    // Filtra distanza ed elevazione in JS (range approssimativo)
    const filtrati = trekkingList.filter(t => {
      const distOk = distance !== null ? Math.abs(t.distance - distance) <= 0.5 : true;
      const elevOk = elevation !== null ? Math.abs(t.elevation - elevation) <= 100 : true;
      return distOk && elevOk;
    });

    res.json(filtrati);
  } catch (e) {
    res.status(500).json({ error: "Errore interno" });
  }
});

app.get("/ping", (req, res) => {
  res.send("ok");
});

// ─────────────────────────────────────────────
// ERROR HANDLER GLOBALE
// ─────────────────────────────────────────────

app.use((err, req, res, next) => {
  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({ error: "File troppo grande (max 10MB)" });
  }
  if (err.message && err.message.includes("Tipo di file")) {
    return res.status(415).json({ error: err.message });
  }
  console.error("Errore non gestito:", err);
  res.status(500).json({ error: "Errore interno del server" });
});

// ─────────────────────────────────────────────
// START SERVER
// ─────────────────────────────────────────────

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`🚀 Server in ascolto su porta ${PORT}`));