/* ============================================================
 * 疯狂料理屋 v2.9.0 — Service Worker
 * 作用：首次访问后缓存全部游戏资源（含像素字体），之后断网也能玩。
 *       localStorage（历史最高分）由浏览器独立保存，不受 SW 影响。
 * ============================================================ */
const CACHE = 'cooking-frenzy-v2.9.0';
const CORE = [
  './', './cooking-master.html', './manifest.json',
  'https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap' // 可选像素字体（失败不影响）
];

/* 安装：预缓存核心资源 */
self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    for (const url of CORE) {
      try { await cache.add(url); } catch (err) { /* 缺文件不阻断安装 */ }
    }
    await self.skipWaiting();
  })());
});

/* 激活：清理旧版本缓存 */
self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

/* 请求：缓存优先，网络成功后回写缓存；离线时回退到主页面 */
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  e.respondWith((async () => {
    const cached = await caches.match(req);
    if (cached) return cached;
    try {
      const resp = await fetch(req);
      if (resp && (resp.ok || resp.type === 'opaque')) {
        const cache = await caches.open(CACHE);
        cache.put(req, resp.clone()).catch(() => {});
      }
      return resp;
    } catch (err) {
      const fallback = (await caches.match('./cooking-master.html')) || (await caches.match('./'));
      if (fallback) return fallback;
      throw err;
    }
  })());
});
