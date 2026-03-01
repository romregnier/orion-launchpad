import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

// StrictMode retiré : causait double-mount des useEffects en dev + conflits canaux Supabase Realtime
createRoot(document.getElementById('root')!).render(
  <App />
)
