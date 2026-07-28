// 吉尼工作台 Service Worker
// 版本号变更时会自动清除旧缓存
const CACHE_NAME = 'jini-workbench-v2';

// 安装：跳过预缓存，不自动缓存任何文件
self.addEventListener('install', function(event) {
  self.skipWaiting();
});

// 激活：清除所有旧版本缓存
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(keys.map(function(key) { return caches.delete(key); }));
    }).then(function() {
      return self.clients.claim();
    })
  );
});

// 请求拦截：网络优先，失败时回退缓存
// HTML 文件绝不缓存，确保每次打开都是最新版
self.addEventListener('fetch', function(event) {
  // 跳过 API 请求
  if (event.request.url.includes('api.deepseek.com')) {
    return;
  }

  // HTML 请求：网络优先，不缓存
  if (event.request.destination === 'document' || event.request.url.endsWith('.html') || event.request.url.endsWith('/')) {
    event.respondWith(
      fetch(event.request).catch(function() {
        return caches.match(event.request);
      })
    );
    return;
  }

  // 静态资源：缓存优先
  event.respondWith(
    caches.match(event.request).then(function(cached) {
      if (cached) return cached;
      return fetch(event.request).then(function(response) {
        if (!response || response.status !== 200 || response.type !== 'basic') return response;
        var clone = response.clone();
        caches.open(CACHE_NAME).then(function(cache) { cache.put(event.request, clone); });
        return response;
      });
    })
  );
});
