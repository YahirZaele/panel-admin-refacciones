import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base './' hace que los assets usen rutas relativas, así el build funciona
// tal cual en GitHub Pages (https://usuario.github.io/panel-admin-refacciones/).
export default defineConfig({
  plugins: [react()],
  base: './',
})
