import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { setWorkerUrl } from 'maplibre-gl'
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import './index.css'
import App from './App.tsx'
import { LanguageProvider } from './i18n/LanguageContext'

// maplibre-gl's worker is loaded via a runtime-constructed URL that Vite's
// production bundler can't statically resolve (works in dev only because
// maplibre-gl is excluded from dep pre-bundling there) — without this, the
// worker 404s to index.html in prod, crashes silently, and every GeoJSON
// vector layer (boundaries, etc.) never renders while raster/DOM layers
// still work fine, which is why the breakage isn't obvious at a glance.
setWorkerUrl(maplibreWorkerUrl)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LanguageProvider>
      <App />
    </LanguageProvider>
  </StrictMode>,
)
