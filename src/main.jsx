import React from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/archivo-black/latin-400.css'
import '@fontsource/ibm-plex-mono/latin-400.css'
import '@fontsource/ibm-plex-mono/latin-500.css'
import '@fontsource-variable/manrope/index.css'
import App from './App.jsx'
import './styles.css'

createRoot(document.getElementById('root')).render(<App />)
