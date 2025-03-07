/// <reference lib="webworker" />
/// <reference lib="dom" />
/// <reference lib="dom.iterable" />

const sw = self as unknown as ServiceWorkerGlobalScope;

sw.addEventListener("install", (event: ExtendableEvent) => {
  event.waitUntil(sw.skipWaiting());
});

sw.addEventListener("activate", (event: ExtendableEvent) => {
  event.waitUntil(sw.clients.claim());
});

sw.addEventListener("fetch", (event: FetchEvent) => {
  event.respondWith(fetch(event.request));
});
