import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/tokens.css'
import './styles/global.css'
import { FoundationPreview } from './pages/FoundationPreview'
import { initProductionSecurityNotice } from './utils/security'

initProductionSecurityNotice()

createRoot(document.getElementById('root')!).render(<StrictMode><FoundationPreview /></StrictMode>)
