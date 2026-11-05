# Lista de Compras

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Miembros de un hogar que comparten inventario y compras, principalmente desde el móvil. Cada persona tiene su propia cuenta; el propietario del hogar administra las invitaciones y los miembros.

## Product Purpose

Saber qué hay en casa, identificar qué falta y coordinar las compras en familia. El ciclo se completa al registrar lo recibido en casa y actualizar el inventario compartido. El público y este propósito fueron confirmados por el usuario durante la inicialización.

## Operating Context

- La entrada habitual de un miembro con acceso es el inventario. Los productos agotados y con pocas existencias ayudan a reconocer prioridades de compra.
- Los miembros mantienen productos, categorías y subcategorías; ajustan existencias y consultan actividad trazable.
- La lista de compras separa Pendientes, Comprados y Recibidos. Marcar una compra no cambia existencias; confirmar su recepción actualiza los productos vinculados.
- El registro inicia sesión inmediatamente. La verificación del correo y la pertenencia al hogar habilitan las funciones compartidas; las invitaciones permiten entrar al hogar existente.
- La aplicación actualiza datos al recuperar el foco y periódicamente mientras está visible, respetando formularios con cambios o solicitudes pendientes. No encola escrituras sin conexión.

## Capabilities and Constraints

- Aplicación existente en Next.js App Router, React y TypeScript, con Tailwind y tokens compartidos. El código y la documentación del repositorio son la autoridad de implementación.
- Datos reales persistidos y separados por hogar. Nunca mezclar productos de ejemplo con los datos de una cuenta ni restaurar el panel de inventario de muestra retirado.
- Autenticación, pertenencia al hogar y permisos se validan en el servidor. Solo el propietario gestiona miembros e invitaciones.
- Las existencias usan unidades enteras, cambios atómicos y valores no negativos; las operaciones conservan deduplicación, control de concurrencia y actividad trazable.
- El inventario permite correcciones por conteo, archivo/restauración y deshacer movimientos cuando es seguro. Las compras admiten artículos vinculados al inventario y artículos personalizados.
- Mantener el checkout existente y los servicios previstos: GitHub, Vercel, MongoDB Atlas y Resend. No crear alojamiento Sites separado ni copiar secretos o datos de Scorecast.
- Preservar la base local y su directorio de datos; las verificaciones usan datos desechables separados de los datos reales.
- Trabajar por hitos y detenerse para revisión del usuario al terminar cada uno; el estado vigente se consulta en `docs/implementation-plan.md`.
- La persona propietaria puede cambiar el nombre compartido desde Mi hogar; el servidor valida cuenta verificada, sesión vigente, propiedad y membresía.
- Siguen fuera del alcance implementado: navegación entre varios hogares, eliminar el hogar, salida voluntaria de miembros, transferencia de propiedad, escaneo de códigos, fotos, caducidades, cantidades fraccionarias y escrituras sin conexión. No presentarlos como funciones disponibles.

## Brand Commitments

- Nombre visible: «Lista de Compras». Lema: «Un hogar. Un equipo.». Su fuente compartida es `lib/brand.ts`.
- Usar español en la interfaz y nombres internos en inglés.
- Preservar la marca compartida con su cesta en el encabezado y la plantilla de correo transaccional de la aplicación.
- Los estándares existentes de interfaz están en `docs/ui-standards.md`; los valores de tema se mantienen en `styles/theme.json` y sus salidas se generan con `npm run tokens`.

## Evidence on Hand

- `README.md` y `docs/implementation-plan.md`: alcance, estado de entrega y verificaciones registradas.
- `docs/inventory.md`, `docs/shopping.md`, `docs/family-sharing.md` y `docs/accounts.md`: reglas y flujos implementados.
- `docs/architecture.md`, `docs/local-database.md`, `docs/hosted-database.md` y `docs/deployment.md`: límites técnicos, persistencia y operaciones.
- `app/`, `components/`, `lib/` y `models/`: implementación existente; no inventar afirmaciones comerciales, testimonios o métricas a partir de datos de prueba.

## Product Principles

1. Ayudar al hogar a pasar de saber qué tiene a recibir lo que necesita con pasos claros.
2. Proteger la confianza en el inventario: distinguir una compra de su recepción y conservar cambios trazables.
3. Compartir información del hogar con cuentas individuales y permisos explícitos.
4. Priorizar tareas cotidianas desde el móvil y mantener términos y comportamientos consistentes.
5. Preservar datos reales y comunicar estados vacíos, cargas, errores y resultados de las acciones.

## Accessibility & Inclusion

Usar elementos nativos y semánticos, foco visible y controles táctiles con el tamaño mínimo compartido del proyecto. Mantener los flujos utilizables en móvil y escritorio y respetar la preferencia de movimiento reducido.
