import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { DialogsProvider } from './components/DialogsProvider.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <DialogsProvider>
      <App />
    </DialogsProvider>
  </StrictMode>,
)
