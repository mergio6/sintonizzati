/* Service worker di Sintonizzati: permette di giocare anche senza connessione.
   La pagina e le carte (carte.txt) vengono sempre chieste prima alla rete, così ogni
   aggiornamento caricato su GitHub arriva subito; se manca la connessione si usa la copia salvata.
   Se cambi le icone o il manifest, aumenta il numero di VERSIONE. */
const VERSIONE = 'sintonizzati-v3';
const FILE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './carte.txt',
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

  // La pagina del gioco: prima la rete, ma se la connessione è lenta (oltre 4 secondi)
  // si apre subito la copia salvata, così l'app non resta bloccata sulla schermata del logo
  if (richiesta.mode === 'navigate') {
    const dallaRete = fetch(richiesta).then(risposta => {
      if (risposta.ok) {                           // si salva solo una pagina valida
        const copia = risposta.clone();
        caches.open(VERSIONE).then(cache => cache.put('./index.html', copia));
      }
      return risposta;
    });
    const salvata = () => caches.match('./index.html');
    const attesa = new Promise(fine => setTimeout(fine, 4000)).then(salvata);
    evento.respondWith(
      Promise.race([dallaRete.catch(salvata), attesa.then(r => r || dallaRete)])
        .then(r => r || dallaRete)
        .catch(salvata)
    );
    return;
  }

  // Le carte: prima la rete (così le nuove carte arrivano subito), poi la copia salvata
  if (new URL(richiesta.url).pathname.endsWith('/carte.txt')) {
    evento.respondWith(
      fetch(richiesta)
        .then(risposta => {
          if (risposta.ok) { const copia = risposta.clone(); caches.open(VERSIONE).then(cache => cache.put('./carte.txt', copia)); }
          return risposta;
        })
        .catch(() => caches.match('./carte.txt'))
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
