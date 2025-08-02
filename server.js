const express = require('express');
const axios = require('axios');
const path = require('path');
const app = express();

// Servire file statici (HTML, CSS, JS, ecc.)
app.use(express.static(path.join(__dirname)));

// Proxy della sitemap dal backend
app.get('/sitemap.xml', async (req, res) => {
  try {
    // Chiamata al backend per ottenere tutti i trekking
    const { data } = await axios.get('https://trekkingbackend.onrender.com/all');
    const trekkingList = data; // supponendo che contenga array oggetti con slug/name
    console.log(trekkingList)
    const urls = trekkingList.map(item => {
      // Scegli lo slug: se c'è un campo `slug`, altrimenti crea da `nome`
      const slug = item.slug || item.name.toLowerCase()
        .replace(/\s+/g, '-')
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const url = `<url><loc>https://viaggiditony.com/trekking/${slug}</loc></url>`;
      return url;
    }).join('\n');

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://viaggiditony.com/</loc></url>
  ${urls}
</urlset>`;

    res.header('Content-Type', 'application/xml');
    res.send(sitemap);
  } catch (err) {
    console.error('Errore sitemap:', err);
    res.status(500).send('Errore generazione sitemap');
  }
});

app.get('/trekking/:slug', (req, res) => {
    res.sendFile(path.join(__dirname, 'trekking-details.html/id='+req.params.slug));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Frontend server listening on port ${PORT}`);
});
