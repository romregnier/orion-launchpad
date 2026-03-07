import * as Sentry from '@sentry/react'
Sentry.init({
  dsn: 'https://bef343a772418a7e6b09fd163fa91ad6@o4511004596633600.ingest.de.sentry.io/4511004637593680',
  environment: import.meta.env.MODE,
  integrations: [Sentry.browserTracingIntegration()],
  tracesSampleRate: 0.1,
  replaysOnErrorSampleRate: 0,
})

import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

// StrictMode retiré : causait double-mount des useEffects en dev + conflits canaux Supabase Realtime
createRoot(document.getElementById('root')!).render(
  <App />
)
