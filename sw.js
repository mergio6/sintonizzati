/* Service worker di Sintonizzati: permette di giocare anche senza connessione.
   La pagina viene sempre chiesta prima alla rete, così ogni aggiornamento caricato
   su GitHub arriva subito; se manca la connessione si usa la copia salvata.
   Se cambi le icone o il manifest, aumenta il numero di VERSIONE. */
const VERSIONE = 'sintonizzati-v1';
const FILE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icone/icon-192.png',
  './icone/icon-512.png',
  './icone/icon-maskable-192.png',
  './icone/icon-maskable-512.png',
  './icone/apple-touch-icon.png',
  './icone/favicon-32.png'
];

self.addEventListener('install', evento => {
  evento.waitUntil(caches.open(VERSIONE).then(cache => cache.addAll(FILE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', evento => {
  evento.waitUntil(
    caches.keys()
      .then(nomi => Promise.all(nomi.filter(n => n !== VERSIONE).map(n => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', evento => {
  const richiesta = evento.request;
  if (richiesta.method !== 'GET') return;

  // La pagina del gioco: prima la rete, poi la copia salvata
  if (richiesta.mode === 'navigate') {
    evento.respondWith(
      fetch(richiesta)
        .then(risposta => {
          const copia = risposta.clone();
          caches.open(VERSIONE).then(cache => cache.put('./index.html', copia));
          return risposta;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Icone, manifest e caratteri di Google: prima la copia salvata, poi la rete
  evento.respondWith(
    caches.match(richiesta).then(salvata => salvata || fetch(richiesta).then(risposta => {
      if (risposta.ok || risposta.type === 'opaque') {
        const copia = risposta.clone();
        caches.open(VERSIONE).then(cache => cache.put(richiesta, copia));
      }
      return risposta;
    }))
  );
});
