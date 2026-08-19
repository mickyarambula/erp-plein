/* Service worker MÍNIMO (Fase 3 PWA, D-195) — solo existe para que el navegador considere el
   sitio "instalable" (Chrome/Android exige un service worker con manejador fetch para eso). NO
   hace caché ni ofrece nada offline a propósito: cada fetch va directo a la red, igual que si no
   hubiera service worker. En iOS Safari "Agregar a pantalla de inicio" ni siquiera requiere esto
   (funciona solo con las meta tags de Apple en index.html) — se agrega por si acaso Miguel u otro
   socio instala desde Android/Chrome desktop más adelante. */
self.addEventListener('install', () => { self.skipWaiting(); });
self.addEventListener('activate', event => { event.waitUntil(self.clients.claim()); });
self.addEventListener('fetch', event => { event.respondWith(fetch(event.request)); });
