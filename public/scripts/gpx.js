 // -------------------------------------------------------
    // Mappa — inizializzazione dentro DOMContentLoaded
    // -------------------------------------------------------
    let map;
 
    document.addEventListener('DOMContentLoaded', function () {
 
      map = L.map('map').setView([46.0, 11.0], 8);
 
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(map);
 
      // Mostra/nascondi campo avvicinamento per Multipitch
      document.getElementById('tipologia').addEventListener('input', function () {
        const avvGroup = document.getElementById('avvicinamentoGroup');
        avvGroup.style.display = this.value.trim() === 'Multipitch' ? 'block' : 'none';
      });
 
      // Bottone invia
      document.getElementById('sendBtn').addEventListener('click', function () {
        send();
      });
 
    });
 
    // -------------------------------------------------------
    // Validazione + raccolta equipaggiamento
    // -------------------------------------------------------
    function sanitize(str) {
      if (typeof str !== 'string') return '';
      return str.trim().replace(/[<>"'`]/g, '');
    }
 
    function parseEquipment(raw) {
      return raw
        .split(',')
        .map(s => sanitize(s))
        .filter(s => s.length > 0);
    }
 
    function showError(msg) {
      const el = document.getElementById('statusMsg');
      el.textContent = msg;
      el.style.display = 'block';
    }
 
    function hideError() {
      const el = document.getElementById('statusMsg');
      el.style.display = 'none';
    }
 
    // -------------------------------------------------------
    // Invio
    // -------------------------------------------------------
    function send() {
      hideError();
 
      const token = sanitize(document.getElementById('token').value);
      if (!token) {
        showError('Token mancante.');
        return;
      }
 
      const fileInput = document.getElementById('gpxFile');
      if (!fileInput.files || fileInput.files.length === 0) {
        showError('Seleziona un file GPX prima di inviare.');
        return;
      }
 
      const file = fileInput.files[0];
      const equips = parseEquipment(document.getElementById('equipaggiamento').value);
 
      const reader = new FileReader();
      reader.onload = function (e) {
        const formData = new FormData();
 
        formData.append('gpxFile', file);
        formData.append('name',             sanitize(document.getElementById('nome').value));
        formData.append('title',            sanitize(document.getElementById('title').value));
        formData.append('description',      sanitize(document.getElementById('descrizione').value));
        formData.append('description_small',sanitize(document.getElementById('descrizione_breve').value));
        formData.append('elevation',        parseFloat(document.getElementById('dislivello').value) || 0);
        formData.append('duration',         document.getElementById('durata').value);
        formData.append('date',             document.getElementById('data').value);
        formData.append('difficulty',       sanitize(document.getElementById('difficolta').value));
        formData.append('distance',         parseFloat(document.getElementById('distanza').value) || 0);
        formData.append('location',         sanitize(document.getElementById('location').value));
        formData.append('gpx',              '');
        formData.append('imgId',            '');
        formData.append('parking',          sanitize(document.getElementById('parking').value));
        formData.append('relive',           sanitize(document.getElementById('relive').value));
        formData.append('youtube',          sanitize(document.getElementById('youtube').value));
        formData.append('altitude',         sanitize(document.getElementById('quota').value));
        formData.append('season',           sanitize(document.getElementById('stagione').value));
        formData.append('expose',           sanitize(document.getElementById('esposizione').value));
        formData.append('equipment',        JSON.stringify(equips));
        formData.append('numFoto',          parseInt(document.getElementById('foto').value) || 0);
        formData.append('stars',            parseFloat(document.getElementById('stelle').value) || 0);
        formData.append('tipo',             sanitize(document.getElementById('tipologia').value));
 
        if (document.getElementById('tipologia').value.trim() === 'Multipitch') {
          formData.append('approach', sanitize(document.getElementById('avvicinamento').value));
        }
 
        fetch('https://viaggiditony.it/saveGPX2', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`   // ← formato Bearer corretto
          },
          body: formData
        })
        .then(response => {
          if (!response.ok) {
            return response.text().then(t => { throw new Error(`HTTP ${response.status}: ${t}`); });
          }
          return response.json();
        })
        .then(json => {
          console.log('Risposta server:', json);
          showError(''); 
          hideError();
          alert('Trek salvato con successo!');
        })
        .catch(err => {
          console.error('Errore invio:', err);
          showError('Errore: ' + err.message);
        });
 
        // -------------------------------------------------------
        // Visualizza GPX sulla mappa con leaflet-gpx
        // -------------------------------------------------------
        const gpxData = e.target.result;
        const blob = new Blob([gpxData], { type: 'application/gpx+xml' });
        const gpxUrl = URL.createObjectURL(blob);
 
        new L.GPX(gpxUrl, {
          async: true,
          marker_options: {
            startIconUrl: null,
            endIconUrl: null,
            shadowUrl: null
          }
        })
        .on('loaded', function (ev) {
          map.fitBounds(ev.target.getBounds());
        })
        .on('error', function (err) {
          console.error('Errore caricamento GPX sulla mappa:', err);
        })
        .addTo(map);
      };
 
      reader.readAsText(file);
    }