import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
  ],
  // Esto es vital para que GitHub Pages encuentre los archivos .js y .css
  base: '/optimizador-cortes/', 
})