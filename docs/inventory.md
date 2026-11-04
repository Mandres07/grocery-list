# Inventario compartido y acceso simplificado

El hito 5 guarda productos y categorías del hogar, ajustes de existencias, correcciones, archivo y actividad. Todos los miembros verificados tienen los mismos permisos sobre el inventario. La gestión de familiares sigue siendo exclusiva del propietario. La lista de compras corresponde al hito 6.

## Acceso más directo

- `/` conserva la presentación original a la izquierda y muestra el registro a la derecha. En móvil se apilan. Ya no hay productos de ejemplo. `/register` redirige a `/`.
- Crear una cuenta inicia sesión automáticamente mediante NextAuth. También se permite iniciar sesión antes de verificar el correo. Un fallo del proveedor de correo no impide entrar a la cuenta.
- El usuario pendiente puede ver su cuenta, cambiar su nombre, cerrar sesión, recuperar contraseña y pedir otra verificación. Crear/unirse a un hogar, gestionar familiares y leer/cambiar inventario requieren verificación en el servidor.
- Una invitación se conserva durante el registro y la sesión pendiente. Confirmar el correo en el mismo navegador vuelve a la invitación sin pedir de nuevo la contraseña. Se acepta explícitamente la invitación para entrar al hogar; no se crea otro hogar automáticamente.
- Un usuario con sesión vigente que abre `/` o `/sign-in` vuelve a `/household`. El encabezado compartido ofrece un menú nativo accesible con Mi hogar, Inventario (cuando esté verificado), Mi cuenta y Cerrar sesión.
- Las comprobaciones de usuario se comparten dentro de la petición con React `cache`; la verificación y la versión de sesión se leen de MongoDB en cada petición nueva. No se confía en un indicador de verificación enviado desde el navegador.

## Organización del inventario

- **Productos** (`/inventory`): búsqueda, filtros, filas de existencias y el botón **Agregar producto**. No se expande un formulario largo dentro de la lista.
- **Categorías** (`/inventory/categories`): el mismo encabezado con **Agregar categoría**, búsqueda, filtro por ubicación y filas compactas. Crear, editar y eliminar usan ventanas de formulario compartidas.
- **Actividad** (`/inventory/activity`): historial y acciones para deshacer, separados de la lista principal.

Productos y Categorías comparten `InventoryShell`, `ListFilters` y `FormDialog`, con los mismos estilos y tokens. Las categorías se buscan por nombre o ruta y se filtran como principales o por su padre directo. Las secciones son enlaces con URL propia, indicador activo y soporte nativo de historial. La ventana de producto usa `dialog`, bloquea el fondo y restaura el foco al cerrar. Si el guardado está pendiente o su resultado es incierto, conserva los datos y la misma solicitud para reintentar antes de cerrar. Tras un guardado confirmado, el formulario recarga la vista de servidor manteniendo la URL y los filtros; los controles +/− conservan su actualización directa sin recargar la página.

Cada hogar nuevo recibe Despensa, Frutas y verduras, Lácteos y huevos, Carnes y pescados, Congelados, Bebidas, Limpieza y Cuidado personal dentro de su transacción de creación. Los hogares anteriores completan estas categorías una sola vez al abrir el inventario, con autorización y transacción. Se preservan categorías existentes equivalentes, sus identificadores y todos los productos. Un marcador persistente evita recrear categorías básicas que después se renombren o eliminen.

Crear una categoría desde el formulario de producto guarda ambos registros en la misma transacción. Una categoría equivalente bajo el mismo padre se reutiliza, incluso con creaciones concurrentes. Los errores de producto o de revisión revierten la categoría nueva; no quedan categorías huérfanas.

## Revisar el hito

1. Reinicia el servidor (`Ctrl+C`, `npm run dev`). Sigue usando el MongoDB local y la configuración de Resend existente; no se requieren nuevos servicios.
2. Crea una cuenta desde `/`. Debes entrar inmediatamente a la pantalla de cuenta pendiente, con menú y acceso a Mi cuenta. Abrir `/inventory` directamente debe devolver a esa pantalla.
3. Confirma el correo. Si llegaste por invitación, acepta el hogar existente. Si no tienes hogar, crea uno. Abre **Mi hogar → Abrir mi inventario**.
4. En **Productos**, abre **Agregar producto**. El formulario aparece en una ventana compacta; agrega nombre, unidad, cantidad inicial y umbral opcional. En **Categoría**, elige **+ Crear categoría…** para crear una categoría o subcategoría sin abandonar el producto. Un umbral de cero también es válido.
5. Prueba + y −. No se puede bajar de cero. Recarga y comprueba que la cantidad persista. Desde otra cuenta del mismo hogar debes ver el mismo producto y la actividad con su autor.
6. Abre el producto para editar datos o corregir la cantidad total contada. Si otra persona actualizó el producto, una corrección o edición basada en datos viejos debe pedir actualizar, sin sobrescribir el cambio ajeno.
7. Abre la sección **Actividad** y deshaz un movimiento. El ajuste contrario usa las existencias actuales y conserva movimientos posteriores. No se puede deshacer dos veces ni deshacer un movimiento de deshacer. Si produciría una cantidad negativa, se rechaza.
8. Archiva y busca en **Estado → Archivados**. Se conservan existencias y actividad; restaura antes de volver a ajustar.
9. Busca por nombre, filtra por categoría (incluye descendientes) y por **Por reponer**. Se muestran hasta 100 productos coincidentes; la búsqueda permite encontrar los demás. La actividad muestra los últimos 50 movimientos.
10. Simula una desconexión. No se aceptan escrituras sin conexión ni se encolan automáticamente. Al recuperar internet, reintenta la operación pendiente: conserva su identificador y datos para no aplicarse dos veces.
11. Retira un miembro desde la cuenta propietaria y comprueba que sus siguientes lecturas y escrituras fallen, aunque conserve una sesión. El historial anterior permanece.

La actualización automática ocurre al volver a la pestaña y cada 30 segundos mientras está visible y conectada. Se pausa mientras un formulario de edición tiene cambios pendientes o está enviándose. No se promete sincronización instantánea ni escrituras offline. Prueba el recorrido con dos cuentas reales antes de avanzar al hito 6.

## Integridad

- Cada mutación vuelve a comprobar la cuenta verificada, versión de sesión y membresía dentro de una transacción. Un bloqueo del documento de hogar serializa los cambios del inventario, los cambios de categorías y la retirada de miembros. Esta estrategia favorece consistencia en hogares pequeños.
- Los ajustes usan incrementos condicionales y límites de enteros seguros. Cantidad y actividad se confirman o revierten juntas. La cantidad inicial también genera actividad cuando es distinta de cero.
- Las correcciones y ediciones usan una revisión de producto. Los cambios de existencias, metadatos y archivo incrementan esa revisión. Los productos históricos sin revisión se interpretan como revisión cero.
- `InventoryRequest` conserva el resultado de cada petición, incluso crear con cantidad cero o corregir sin cambio. La huella incluye actor, operación y datos normalizados. Repetir la misma petición devuelve el resultado anterior; reutilizarla para otros datos o persona se rechaza. La membresía se vuelve a comprobar antes de devolver incluso una repetición.
- Las interfaces conservan la petición cuando el resultado no se puede confirmar. El formulario congela sus datos durante ese reintento; no aplica incrementos optimistas. Un fallo conocido de validación permite corregir los datos.
- Deshacer crea otro `StockMovement`, con referencia única al original, sobre el stock actual. Se registra autor, antes/después, motivo y fecha. El archivo no elimina el producto ni su historial.
- Categorías y productos siempre se consultan por hogar. Las categorías no admiten ciclos ni referencias a otros hogares. No se puede eliminar una categoría con subcategorías o productos, incluidos los archivados.

## Código compartido

`lib/households/mutation-access.ts` comparte la autorización transaccional con las invitaciones. `lib/inventory/` contiene validación, mutaciones y consultas. Las rutas son Server Components; solo formularios, ajustes y refresco requieren clientes pequeños. `FormField`, `ActionForm`, `AppHeader`, paneles y avisos reutilizan Tailwind y los tokens existentes. Las contraseñas usan formularios POST también antes de que cargue JavaScript.

## Verificación

`npm run check`: lint, TypeScript, pruebas unitarias y compilación. `npm run db:check`: pruebas de integración en una base temporal de la réplica local, con correos simulados. Las pruebas incluyen concurrencia, deduplicación, stock no negativo, límites, rollback, correcciones obsoletas, deshacer, archivo, jerarquías, aislamiento, verificación y miembros retirados.

La revisión de navegador usa otra base temporal con correo deshabilitado. Los tokens de confirmación de esa prueba son sintéticos; la entrega real del correo nuevo y el uso con cuentas reales quedan para la revisión del usuario.

### Inventory as the starting page

Sign-in, automatic sign-in after registration, and visits to `/` or `/sign-in` with an active session lead to `/inventory`. Verification and household membership checks still send accounts that need setup to `/household`, which also preserves pending invitations. Creating a household or accepting an invitation leads straight to inventory. Mi hogar remains available for household management.

On compact screens, the shared product dialog uses one floating green plus button with an accessible “Agregar producto” label. On wider screens the same trigger appears in the header with its label. Safe-area spacing and reserved space below the list keep the action reachable without covering the final record. Search and filters remain available through the header icon.

### Compact responsive product table

Products use the shared ProductTable component: a native table with Producto, Categoría, Unidad, and Existencias columns on desktop. Mobile uses compact divided rows with a linked name and combined category/unit metadata next to one set of quantity controls. Visible status badges identify urgent stock without relying on color. Archived rows show saved quantities without stock adjustment buttons.

Search and filters live in the shared ListFilters modal triggered by an icon beside the page heading, also used for Categories. The icon marks active searches/filters. GET form submission preserves bookmarkable URLs, direct links, and browser history. Clearing returns to the unfiltered URL; cancelling discards draft filter changes.

Routine stock feedback is announced in a screen-reader live region, without taking visible layout space. Disabled controls indicate saving. Errors and retry actions remain visible when needed. Compact rows reuse shared spacing tokens and retain full-size touch targets.

### Product sections

The product route keeps its name and current quantity above shared SectionNavigation tabs: Detalles, Existencias, Actividad, and Opciones. Tabs use normal links (`?tab=stock`, `?tab=activity`, `?tab=manage`; default is details) so direct links and browser history work naturally. Only the selected panel is rendered; categories/activity are fetched only where needed. Invalid tab values fall back to details.

Details and correction forms reuse SectionPanel and embedded ActionForm surfaces, retaining household/product/revision fields and existing server actions. Options archives/restores without leaving the selected tab after save. Archived products expose read-only details/stock guidance and restoration links. Product activity is expanded directly and remains product-scoped. The shared navigation component keeps the active tab visible when the strip overflows or resizes without changing page scroll/focus.

### Activity filtering

The global Activity page shares the header ListFilters modal with Products and Categories. Optional URL filters are `q` (partial product name), `person` (partial responsible person's name), `from`, and `to` (YYYY-MM-DD). Names match case-insensitively as literal text; multiple filters combine. Date boundaries use Panama time, include the full final day, and accept one-sided ranges. Invalid calendar dates or reversed ranges show validation feedback instead of unfiltered data.

Filters apply in the database before the 50-movement limit. Product matches stay household-scoped and include archived products; person matches are restricted to actors found in that household's history, including former members. Undo eligibility still checks the full household history so an undo outside the visible date range is respected. Clear, direct links, and browser Back preserve the shared filtering behavior. Empty filtered results have a specific message.

### Buy-first inventory ordering

Active products appear automatically in buying order: zero stock first, then positive quantities at or below their warning threshold, then adequately stocked products. Each group keeps name/ID order. Zero stock needs no configured threshold. Labels “Sin existencias” and “Por reponer”, plus narrow accent markers, make urgency visible in both desktop tables and compact mobile rows. Archived products retain alphabetical order and do not receive buying labels.

Ranking and filtering apply before the 100-product database limit. The “Por reponer” filter includes zero stock without a threshold; missing legacy thresholds normalize to null. Search/category filters and household access checks remain in place.

ProductTable has a small client boundary to reconcile confirmed stock responses by revision, immediately updating labels, row order, filtered membership, and result counts after adjustments. Delayed refreshes cannot overwrite a newer confirmed quantity. Failed or uncertain writes retain the existing retry/deduplication workflow and do not report a new stock status.
