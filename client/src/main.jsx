import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
////import './index.css'
import App from './app/App.jsx'
import { BrowserRouter } from 'react-router-dom'
import { setupHttpClient } from './api/http.js'

setupHttpClient()

createRoot(document.getElementById('root')).render(
  <StrictMode>
  <BrowserRouter>
    <App />
  </BrowserRouter>
  </StrictMode>,
)
