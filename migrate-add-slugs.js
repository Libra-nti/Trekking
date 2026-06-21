// migrate-add-slugs.js
// Esegui una volta con: node migrate-add-slugs.js
// Aggiunge il campo "slug" a tutti i trek esistenti nel DB, generandolo dal titolo
// Versione per driver nativo MongoDB (MongoClient)

require('dotenv').config();
const { MongoClient } = require('mongodb');

const uri = process.env.uri;
const dbName = "trekking"; // adatta al nome del tuo DB
const collectionName = 'treks'; // adatta al nome della tua collection

function slugify(text) {
  return text
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // rimuove accenti (à, è, ò...)
    .replace(/[│┃|]/g, ' ')                            // sostituisce separatori speciali con spazio
    .replace(/[^a-z0-9\s-]/g, '')                       // rimuove tutto il resto (punteggiatura, ecc.)
    .trim()
    .replace(/\s+/g, '-')                               // spazi -> trattini
    .replace(/-+/g, '-');                               // trattini multipli -> singolo
}

// Garantisce che lo slug sia unico nella collection, aggiungendo un suffisso numerico in caso di duplicati
async function ensureUniqueSlug(collection, baseSlug, currentId) {
  let slug = baseSlug;
  let counter = 2;
  while (true) {
    const existing = await collection.findOne({ slug, _id: { $ne: currentId } });
    if (!existing) return slug;
    slug = `${baseSlug}-${counter}`;
    counter++;
  }
}

async function migrate() {
  const client = new MongoClient(uri);
  await client.connect();
  console.log('Connesso al DB');

  const db = client.db(dbName);
  const collection = db.collection(collectionName);

  const treks = await collection.find({}).toArray();
  console.log(`Trovati ${treks.length} trek da processare`);

  let updated = 0;
  for (const trek of treks) {
    if (trek.slug) {
      console.log(`Skip (slug già presente): ${trek.name}`);
      continue;
    }

    const baseSlug = slugify(trek.name);
    const uniqueSlug = await ensureUniqueSlug(collection, baseSlug, trek._id);

    await collection.updateOne(
      { _id: trek._id },
      { $set: { slug: uniqueSlug } }
    );

    console.log(`✓ "${trek.name}" -> "${uniqueSlug}"`);
    updated++;
  }

  // Crea l'indice unico sullo slug, ora che tutti i documenti ce l'hanno
  await collection.createIndex({ slug: 1 }, { unique: true, sparse: true });
  console.log('Indice unico su "slug" creato');

  console.log(`\nCompletato: ${updated} trek aggiornati su ${treks.length} totali`);
  await client.close();
}

migrate().catch(err => {
  console.error('Errore durante la migration:', err);
  process.exit(1);
});