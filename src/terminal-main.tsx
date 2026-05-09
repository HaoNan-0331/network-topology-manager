import React from 'react'
import { createRoot } from 'react-dom/client'
import TerminalWindow from './components/TerminalWindow'
import 'xterm/css/xterm.css'

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <TerminalWindow />
  </React.StrictMode>
)
