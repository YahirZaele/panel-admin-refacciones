# Panel de administración · Ruta 150 Refacciones (demo)

Panel interno ficticio para operar una tienda de refacciones para moto: inventario, pedidos, usuarios con roles
y bitácora de auditoría. Es el tercer proyecto de una serie:

| Proyecto | Para quién |
|---|---|
| [Tienda en línea](https://yahirzaele.github.io/tienda-refacciones-moto/) | Clientes |
| [Tablero de ventas](https://yahirzaele.github.io/dashboard-ventas-refacciones/) | Dirección / análisis |
| **Panel de administración** (este) | Personal de la tienda |

**Demo en vivo:** https://yahirzaele.github.io/panel-admin-refacciones/

Para entrar se elige un usuario de ejemplo; cada rol ve y puede hacer cosas distintas. Los cambios se guardan
solo en tu navegador y se pueden restaurar con "Restaurar datos de ejemplo".

## Qué hace

- **Roles y permisos** (Administrador, Almacén, Ventas): el menú, los botones y la API se ajustan al rol.
  La sección de usuarios muestra la matriz de permisos completa.
- **Productos**: alta y edición con validación por campo, búsqueda, filtros (categoría, stock bajo, inactivos),
  orden por columna y paginación. Los filtros viven en la URL.
- **Inventario**: el stock solo cambia con ajustes que exigen motivo (entrada de proveedor, conteo físico, merma,
  devolución) y nunca puede quedar negativo. Alertas de stock bajo y agotado.
- **Pedidos**: flujo Pendiente → Preparando → Enviado → Entregado (o Cancelado). Cada rol solo puede hacer
  ciertas transiciones. Al pasar a "Preparando" se aparta el inventario, y si se cancela después se devuelve.
  No deja preparar un pedido sin stock suficiente.
- **Usuarios**: alta, cambio de rol y desactivación. Un administrador no puede quitarse su propio acceso y siempre
  debe quedar al menos un administrador activo.
- **Bitácora de auditoría**: cada cambio queda registrado con usuario, rol, fecha y detalle (por ejemplo
  `FRE-BAL-05 · +10 (50 → 60) · Entrada de proveedor`).
- Diseño responsivo, modo claro y oscuro, modales nativos (`<dialog>`) y avisos accesibles (`aria-live`).

## Arquitectura

```
shared/      reglas.js (roles, permisos, validaciones) y servicio.js (lógica de negocio)
server/      API REST con Node.js + Express que usa shared/
src/api/     cliente HTTP para la API real, o API simulada en el navegador (demo)
src/         interfaz en React
```

La **lógica de negocio está en un solo lugar** (`shared/servicio.js`) y no depende de React ni de HTTP. La usan:

- la **API de Express** (`server/app.js`), que traduce los errores de negocio a códigos HTTP
  (401, 403, 404, 409, 422), y
- la **demo en GitHub Pages** (`src/api/mock.js`), que corre el mismo servicio sobre `localStorage` porque
  GitHub Pages no puede ejecutar un servidor.

El frontend no sabe cuál de las dos está usando: si al compilar se define `VITE_API_URL`, habla con la API real.

### Endpoints

| Método | Ruta | Permiso |
|---|---|---|
| GET | `/api/resumen` | cualquier rol |
| GET / POST | `/api/productos` | ver / `productos:editar` |
| PUT | `/api/productos/:id` | `productos:editar` |
| POST | `/api/productos/:id/ajustes` | `inventario:ajustar` |
| GET | `/api/pedidos`, `/api/pedidos/:folio` | `pedidos:ver` |
| POST | `/api/pedidos/:folio/estatus` | `pedidos:estatus` + regla por rol |
| GET / POST | `/api/usuarios` | `usuarios:ver` / `usuarios:editar` |
| PUT | `/api/usuarios/:id` | `usuarios:editar` |
| GET | `/api/bitacora` | `bitacora:ver` |

La autenticación está simplificada para la demo (encabezado `X-Usuario-Id`). En producción usaría login con
contraseña (hash con bcrypt), un token JWT y una base de datos (MongoDB o MySQL) en lugar de memoria.

## Pruebas

17 pruebas con Vitest:

- `shared/servicio.test.js`: permisos, validaciones, SKU y correos únicos, ajustes de stock, flujo de pedidos con
  apartado y devolución de inventario, y las protecciones de usuarios.
- `server/app.test.js`: la API levantada en un puerto real, con respuestas 201, 400, 401, 403, 404 y 422.

GitHub Actions corre lint, pruebas y build antes de cada despliegue.

## Correr en local

```bash
npm install
npm run dev          # interfaz en modo demo (sin servidor)
npm test

# Con la API real de Express:
npm run dev:api                                    # API en http://localhost:3001
VITE_API_URL=http://localhost:3001 npm run dev     # interfaz conectada a la API
```

## Tecnologías

React 19, React Router, Vite, Node.js, Express 5, Vitest, ESLint y GitHub Actions.

---

Hecho por [Yahir Zaele Medina Rioja](https://github.com/YahirZaele).
