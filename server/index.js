import { crearApp } from './app.js'

const PUERTO = Number(process.env.PORT) || 3001
crearApp({ origenPermitido: process.env.ORIGEN ?? 'http://localhost:5173' }).listen(PUERTO, () => {
  console.log(`API del panel en http://localhost:${PUERTO}/api`)
})
