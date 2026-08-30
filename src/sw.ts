/// <reference lib="webworker" />
import { clientsClaim } from 'workbox-core'
import { precacheAndRoute, createHandlerBoundToURL } from 'workbox-precaching'
import { registerRoute, NavigationRoute } from 'workbox-routing'

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: { url: string; revision: string | null }[]
}

precacheAndRoute(self.__WB_MANIFEST)

// SPA-navigasjoner serveres av index.html
registerRoute(new NavigationRoute(createHandlerBoundToURL('index.html')))

self.skipWaiting()
clientsClaim()
