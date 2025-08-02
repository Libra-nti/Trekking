const express = require('express');
const axios = require('axios');
const path = require('path');
const app = express();

// Servire file statici (HTML, CSS, JS, ecc.)
app.use(express.static(path.join(__dirname)));

// Proxy della sitemap dal backend
app.get('/sitemap.xml', async (req, res) => {
    try {
        const response = await axios.get('https://trekkingbackend.onreder.com/sitemap.xml');
        res.header('Content-Type', 'application/xml');
        res.send(response.data);
    } catch (err) {
        console.error('Errore caricando la sitemap:', err);
        res.status(500).send('Errore caricando la sitemap');
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Frontend server listening on port ${PORT}`);
});
