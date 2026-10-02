import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

if (['/home', '/home/'].includes(window.location.pathname)) {
  window.history.replaceState(null, '', `/${window.location.search}${window.location.hash}`)
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
