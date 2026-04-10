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
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const xmlBodyParser = require("express-xml-bodyparser");
const crypto = require("crypto");                        // 🔒 per generazione nonce AdSense

const app = express();
app.set("trust proxy", true);

// ─────────────────────────────────────────────
// MIDDLEWARE: NONCE per AdSense
// ─────────────────────────────────────────────

// 🔒 Genera un nonce casuale per ogni request e lo rende disponibile
// a Helmet (CSP) e ai template EJS tramite res.locals.nonce
app.use((req, res, next) => {
  res.locals.nonce = crypto.randomBytes(16).toString("base64");
  next();
});

// ─────────────────────────────────────────────
// SECURITY MIDDLEWARE
// ─────────────────────────────────────────────

app.use((req, res, next) => {
  helmet({
    referrerPolicy: {
      policy: "strict-origin-when-cross-origin"
    },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],

        // Immagini: Cloudinary + OpenStreetMap + AdSense/DoubleClick
        imgSrc: [
          "'self'",
          "data:",
          "https://res.cloudinary.com",
          "https://*.tile.openstreetmap.org",
          "https://unpkg.com",
          "https://pagead2.googlesyndication.com",
          "https://googleads.g.doubleclick.net",
          "https://*.googlesyndication.com",
          "https://*.google.com",
        ],

        // Script: CDN + AdSense (con nonce per script inline iniettati da AdSense)
        scriptSrc: [
          "'self'",
          "https://unpkg.com",
          "https://cdnjs.cloudflare.com",
          "https://cdn.jsdelivr.net",
          "https://pagead2.googlesyndication.com",
          "https://adservice.google.com",
          "https://adservice.google.it",
          "https://www.googletagservices.com",
          "https://partner.googleadservices.com",
          "https://*.googlesyndication.com",
          "https://*.google.com",
          "https://fundingchoicesmessages.google.com",  // ← GDPR consent AdSense
          (req, res) => `'nonce-${res.locals.nonce}'`,   // nonce per lo script AdSense
        ],

        // Stili
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          "https://unpkg.com",
          "https://cdnjs.cloudflare.com",
          "https://cdn.jsdelivr.net",
        ],

        // Fetch/XHR: backend + API esterne + AdSense
        connectSrc: [
          "'self'",
          "https://overpass-api.de",
          "https://api.ipstack.com",
          "https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.min.js.map",
          "https://cdn.jsdelivr.net/npm/@popperjs/core@2.11.6/dist/umd/popper.min.js.map",
          "https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/css/bootstrap.min.css.map",
          "https://unpkg.com",
          "https://cdn.jsdelivr.net",
          "https://cdnjs.cloudflare.com",
          "https://pagead2.googlesyndication.com",
          "https://adservice.google.com",
          "https://adservice.google.it",
          "https://*.googlesyndication.com",
          "https://fundingchoicesmessages.google.com",  // ← GDPR consent AdSense
  "https://*.google.com", 
        ],

        // Font
        fontSrc: ["'self'", "https://fonts.gstatic.com"],

        // Frame: YouTube + Relive/Embedly + AdSense/DoubleClick
        frameSrc: [
          "https://www.youtube.com",
          "https://cdn.embedly.com",
          "https://www.relive.com",                      // fix: era "relieve.com"
          "https://googleads.g.doubleclick.net",
          "https://tpc.googlesyndication.com",
          "https://*.googlesyndication.com",
          "https://*.fls.doubleclick.net",
          "https://fundingchoicesmessages.google.com",  
        ],

        // Blocca oggetti Flash e plugin obsoleti
        objectSrc: ["'none'"],
      }
    }
  })(req, res, next);
});

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
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ["application/gpx+xml", "application/xml", "text/xml"];
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

function sanitizeString(input) {
  if (typeof input !== "string") return null;
  return input.replace(/[<>{}$|]/g, "").replace(/\.\./g, "").trim().slice(0, 200);
}

function validateTrekBody(body) {
  const errors = [];

  if (!body.name || typeof body.name !== "string") errors.push("name mancante o non valido");
  if (!body.date || (isNaN(Date.parse(body.date)) || typeof body.date !== "string")) errors.push("date mancante o non valida");
  if (!body.description || typeof body.description !== "string") errors.push("description mancante");
  if (body.distance !== undefined && isNaN(parseFloat(body.distance))) errors.push("distance non valida");
  if (body.elevation !== undefined && isNaN(parseFloat(body.elevation))) errors.push("elevation non valida");
  if (body.numFoto !== undefined && isNaN(parseInt(body.numFoto))) errors.push("numFoto non valido");

  const allowedType = ["Escursionismo", "Ferrata", "Alpinismo", "Multipitch"];
  if (body.type && !allowedType.includes(body.type)) errors.push("type non valido");

  const allowedDifficulty = ["T", "E", "EE", "EEA", "EAI", "EEA - F", "EEA - PD", "EEA - AD", "EEA - D", "EEA - TD", "EEA - ED", "F", "PD", "AD", "D", "TD", "ED", "ABO", "4a", "4b", "4c", "5a", "5b", "5c", "6a", "6b", "6c", "7a", "7b", "7c", "8a", "8b", "8c", "4a+", "5a+", "6a+", "7a+", "8a+", "4b+", "5b+", "6b+", "7b+", "8b+", "4c+", "5c+", "6c+", "7c+", "8c+"];
  if (body.difficulty && !allowedDifficulty.includes(body.difficulty)) errors.push("difficulty non valida");

  const allowedSeason = ["Estate", "Autunno", "Inverno", "Primavera"];
  if (body.season && !allowedSeason.includes(body.season)) errors.push("season non valida");

  return errors;
}

function buildTrekDocument(body, gpxParsed) {
  return {
    name: sanitizeString(body.name),
    date: sanitizeString(body.date),
    description: sanitizeString(body.description),
    description_small: sanitizeString(body.description_small) || null,
    title: sanitizeString(body.title) || null,
    duration: sanitizeString(body.duration) || null,
    relive: sanitizeString(body.relive) || null,      // salva solo l'ID Relive, non l'embed HTML
    youtube: sanitizeString(body.youtube) || null,
    altitude: sanitizeString(body.altitude) || null,
    expose: sanitizeString(body.expose) || null,
    parking: sanitizeString(body.parking) || null,
    distance: parseFloat(body.distance) || null,
    elevation: parseFloat(body.elevation) || null,
    numFoto: parseInt(body.numFoto) || 0,
    stars: sanitizeString(body.stars) || 0,
    difficulty: sanitizeString(body.difficulty) || null,
    season: sanitizeString(body.season) || null,
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

function requireAuth(req, res, next) {
  const authHeader = req.headers["authorization"];
  if (!authHeader) {
    return res.status(401).json({ message: "Accesso non autorizzato" });
  }

  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : authHeader;

  if (token !== process.env.token) {
    return res.status(401).json({ message: "Accesso non autorizzato" });
  }
  next();
}

// ─────────────────────────────────────────────
// ROTTE
// ─────────────────────────────────────────────

app.post("/saveGPX2", strictLimiter, requireAuth, upload.single("gpxFile"), async (req, res) => {
  try {
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

app.get("/all", requireAuth, async (req, res) => {
  try {
    const trekkings = await db.collection("treks").find(
      {},
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

    const treks = await db.collection("treks")
      .find({}, { projection: { gpx: 0 } })
      .sort({ date: -1 })
      .toArray();

    const totalPages = Math.ceil(totalItems / perPage);
    // nonce è già in res.locals, EJS lo eredita automaticamente
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
    const nome = sanitizeString(req.params.nome);
    if (!nome) return res.status(400).json({ error: "Nome non valido" });

    const trek = await db.collection("treks").findOne({ name: nome });
    if (!trek) return res.status(404).json({ error: "Non trovato" });

    const builder = new xml2js.Builder();
    trek.gpx = builder.buildObject(trek.gpx);
    // nonce è già in res.locals, non serve passarlo esplicitamente
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

app.post("/filter", async (req, res) => {
  try {
    const data = req.body;

    const difficulty = sanitizeString(data.difficulty) || "";
    const location   = sanitizeString(data.location) || "";
    const season     = sanitizeString(data.season) || "";
    const tipo       = sanitizeString(data.tipo) || "";
    const distance   = parseFloat(data.distance) || null;
    const elevation  = parseFloat(data.elevation) || null;

    const query = {};
    if (difficulty) query.difficulty = difficulty;
    if (location)   query.location = location;
    if (season)     query.season = season;
    if (tipo)       query.tipo = tipo;

    const trekkingList = await db.collection("treks")
      .find(query, { projection: { gpx: 0 } })
      .toArray();

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