/// <reference lib="webworker" />
/// <reference lib="dom" />
/// <reference lib="dom.iterable" />

const sw = self as unknown as ServiceWorkerGlobalScope;

console.log("[ServiceWorker] Service worker initialized");

sw.addEventListener("install", (event: ExtendableEvent) => {
  console.log("[ServiceWorker] Install event");
  event.waitUntil(sw.skipWaiting());
});

sw.addEventListener("activate", (event: ExtendableEvent) => {
  console.log("[ServiceWorker] Activate event");
  event.waitUntil(sw.clients.claim());
});

sw.addEventListener("fetch", (event: FetchEvent) => {
  // フェッチイベントのログは量が多くなるため、必要な場合のみコメントを外してください
  // console.log("[ServiceWorker] Fetch event:", event.request.url);
  event.respondWith(fetch(event.request));
});
