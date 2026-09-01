import React from 'react'
import ReactDOM from 'react-dom/client'
import posthog from 'posthog-js'
import '@fontsource/instrument-serif/400.css'
import '@fontsource/instrument-serif/400-italic.css'
import '@fontsource/schibsted-grotesk/400.css'
import '@fontsource/schibsted-grotesk/500.css'
import '@fontsource/schibsted-grotesk/600.css'
import '@fontsource/ibm-plex-mono/400.css'
import '@fontsource/ibm-plex-mono/500.css'
import './styles/global.css'
import App from './App.jsx'

const phKey = import.meta.env.VITE_POSTHOG_KEY
const phHost = import.meta.env.VITE_POSTHOG_HOST

if (phKey && phHost) {
  posthog.init(phKey, {
    api_host: phHost,
    defaults: '2026-05-30',
  })
} else if (import.meta.env.DEV) {
  const missing = [!phKey && 'VITE_POSTHOG_KEY', !phHost && 'VITE_POSTHOG_HOST'].filter(Boolean).join(', ')
  console.error(
    `${missing} variable(s) required by PostHog are missing or un-configured, this causes events to be silently missed. This error stops appearing once ${missing} is configured`
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
