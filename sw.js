/**
 * Service Worker - Painel Operacional 3º BC
 * Estratégias:
 *   - HTML (navegação): network-first com fallback em cache + página offline
 *   - Assets estáticos: cache-first com atualização em background
 *   - Fontes (Google Fonts): stale-while-revalidate
 */
const CACHE_VERSION = 'v1.2.0';
const CACHE_NAME = 'pmesp3bc-' + CACHE_VERSION;
const RUNTIME_CACHE = 'pmesp3bc-runtime-' + CACHE_VERSION;

const PRECACHE_URLS = [
    './',
    './index.html',
    './styles.css',
    './app.js',
    './manifest.json',
    './P3.png',
    './DEJEM.png',
];

const OFFLINE_HTML = `<!DOCTYPE html>
<html lang="pt-br">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Offline | Painel Operacional</title>
<style>
body{font-family:system-ui,sans-serif;background:#0a0c10;color:#F8F9FA;
min-height:100vh;display:flex;align-items:center;justify-content:center;
padding:24px;text-align:center;margin:0}
.box{max-width:400px}
h1{color:#C5B358;font-size:2rem;margin-bottom:12px;
text-shadow:0 0 24px rgba(197,179,88,.4)}
p{color:#8B92A1;line-height:1.6}
button{margin-top:20px;padding:12px 28px;
background:linear-gradient(180deg,#E8D98B,#C5B358 45%,#8B7420);
color:#0a0c10;border:none;border-radius:8px;font-weight:800;
cursor:pointer;font-size:1rem;
box-shadow:0 1px 0 rgba(255,255,255,.4) inset,0 4px 12px rgba(0,0,0,.5),
0 0 24px rgba(197,179,88,.3)}
button:active{transform:scale(.97)}
</style>
</head>
<body>
<div class="box">
<h1>Sem conexão</h1>
<p>Você está offline. Verifique sua conexão e tente novamente.</p>
<button onclick="location.reload()">Tentar novamente</button>
</div>
</body>
</html>`;

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache =>
                Promise.all(
                    PRECACHE_URLS.map(url =>
                        cache.add(url).catch(() => { /* ignora falhas */ })
                    )
                )
            )
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then(keys => Promise.all(
                keys
                    .filter(k => k !== CACHE_NAME && k !== RUNTIME_CACHE)
                    .map(k => caches.delete(k))
            ))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    const { request } = event;
    if (request.method !== 'GET') return;

    const url = new URL(request.url);

    // Google Fonts
    if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
        event.respondWith(
            caches.open(RUNTIME_CACHE).then(cache =>
                cache.match(request).then(cached => {
                    const network = fetch(request).then(res => {
                        if (res && res.status === 200) cache.put(request, res.clone());
                        return res;
                    }).catch(() => cached);
                    return cached || network;
                })
            )
        );
        return;
    }

    if (url.origin !== self.location.origin) return;

    // HTML
    if (request.mode === 'navigate' ||
        (request.headers.get('Accept') || '').includes('text/html')) {
        event.respondWith(
            fetch(request)
                .then(res => {
                    if (res && res.status === 200) {
                        const clone = res.clone();
                        caches.open(CACHE_NAME).then(c => c.put(request, clone));
                    }
                    return res;
                })
                .catch(() =>
                    caches.match(request)
                        .then(cached => cached || new Response(OFFLINE_HTML, {
                            headers: { 'Content-Type': 'text/html; charset=utf-8' },
                        }))
                )
        );
        return;
    }

    // Assets
    event.respondWith(
        caches.match(request).then(cached => {
            if (cached) {
                fetch(request).then(res => {
                    if (res && res.status === 200) {
                        caches.open(CACHE_NAME).then(c => c.put(request, res));
                    }
                }).catch(() => {});
                return cached;
            }
            return fetch(request).then(res => {
                if (res && res.status === 200) {
                    const clone = res.clone();
                    caches.open(CACHE_NAME).then(c => c.put(request, clone));
                }
                return res;
            });
        })
    );
});