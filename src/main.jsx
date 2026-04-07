import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css' /* <-- ESTA ES LA LÍNEA CLAVE QUE ENCIENDE LOS ESTILOS */

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)