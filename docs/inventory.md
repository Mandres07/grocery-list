# Inventario compartido y acceso simplificado

El inventario guarda productos y categorías del hogar, ajustes de existencias, correcciones, archivo y actividad. Todos los miembros verificados tienen los mismos permisos sobre el inventario. La gestión de familiares sigue siendo exclusiva del propietario. La lista de Compras ya está implementada en `/shopping`; consulta [Compras](shopping.md).

## Acceso más directo

- `/` conserva la presentación original a la izquierda y muestra el registro a la derecha. En móvil se apilan. Ya no hay productos de ejemplo. `/register` redirige a `/`.
- Crear una cuenta inicia sesión automáticamente mediante NextAuth. También se permite iniciar sesión antes de verificar el correo. Un fallo del proveedor de correo no impide entrar a la cuenta.
- El usuario pendiente puede ver su cuenta, cambiar su nombre, cerrar sesión, recuperar contraseña y pedir otra verificación. Crear/unirse a un hogar, gestionar familiares y leer/cambiar inventario requieren verificación en el servidor.
- Una invitación se conserva durante el registro y la sesión pendiente. Confirmar el correo en el mismo navegador vuelve a la invitación sin pedir de nuevo la contraseña. Se acepta explícitamente la invitación para entrar al hogar; no se crea otro hogar automáticamente.
- Un usuario con sesión vigente que abre `/` o `/sign-in` vuelve a `/inventory`; si necesita verificar el correo, aceptar una invitación o crear un hogar, los controles del servidor lo llevan a `/household` o al flujo de invitación. El encabezado compartido ofrece Inventario y Compras para cuentas verificadas, Mi hogar, Mi cuenta y Cerrar sesión: enlaces en escritorio y menú accesible en móvil.
- Las comprobaciones de usuario se comparten dentro de la petición con React `cache`; la verificación y la versión de sesión se leen de MongoDB en cada petición nueva. No se confía en un indicador de verificación enviado desde el navegador.

## Organización del inventario

- **Productos** (`/inventory`): búsqueda, filtros, filas de existencias y el botón **Agregar producto**. No se expande un formulario largo dentro de la lista.
- **Categorías** (`/inventory/categories`): el mismo encabezado con **Agregar categoría**, búsqueda, filtro por ubicación y filas compactas. Crear, editar y eliminar usan ventanas de formulario compartidas.
- **Actividad** (`/inventory/activity`): historial y acciones para deshacer, separados de la lista principal.

Productos y Categorías comparten `InventoryShell`, `ListFilters` y `FormDialog`, con los mismos estilos y tokens. Las categorías se buscan por nombre o ruta y se filtran como principales o por su padre directo. Las secciones son enlaces con URL propia, indicador activo y soporte nativo de historial. La ventana de producto usa `dialog`, bloquea el fondo y restaura el foco al cerrar. Si el guardado está pendiente o su resultado es incierto, conserva los datos y la misma solicitud para reintentar antes de cerrar. Tras un guardado confirmado, el formulario recarga la vista de servidor manteniendo la URL y los filtros; los controles +/− conservan su actualización directa sin recargar la página.

Cada hogar nuevo recibe Despensa, Frutas y verduras, Lácteos y huevos, Carnes y pescados, Congelados, Bebidas, Limpieza y Cuidado personal dentro de su transacción de creación. Los hogares anteriores completan estas categorías una sola vez al abrir el inventario, con autorización y transacción. Se preservan categorías existentes equivalentes, sus identificadores y todos los productos. Un marcador persistente evita recrear categorías básicas que después se renombren o eliminen.

Crear una categoría desde el formulario de producto guarda ambos registros en la misma transacción. Una categoría equivalente bajo el mismo padre se reutiliza, incluso con creaciones concurrentes. Los errores de producto o de revisión revierten la categoría nueva; no quedan categorías huérfanas.

## Revisar el inventario

1. Usa la [app de producción](https://lista-de-compras-beta-eight.vercel.app) para el uso real, o reinicia `npm run dev` para revisar cambios locales con su MongoDB/Resend. Las cuentas y el inventario de ambos entornos son independientes; producción empezó sin migrar datos locales.
2. Crea una cuenta desde `/`. Debes entrar inmediatamente a la pantalla de cuenta pendiente, con menú y acceso a Mi cuenta. Abrir `/inventory` directamente debe devolver a esa pantalla.
3. Confirma el correo. Si llegaste por invitación, acepta el hogar existente. Si no tienes hogar, crea uno. Al terminar, debes entrar a Inventario; Mi hogar queda disponible para gestión.
4. En **Productos**, abre **Agregar producto**. El formulario aparece en una ventana compacta; agrega nombre, unidad, cantidad inicial y umbral opcional. En **Categoría**, elige **+ Crear categoría…** para crear una categoría o subcategoría sin abandonar el producto. Un umbral de cero también es válido.
5. Prueba + y −. No se puede bajar de cero. Recarga y comprueba que la cantidad persista. Desde otra cuenta del mismo hogar debes ver el mismo producto y la actividad con su autor.
6. Abre el producto para editar datos o corregir la cantidad total contada. Si otra persona actualizó el producto, una corrección o edición basada en datos viejos debe pedir actualizar, sin sobrescribir el cambio ajeno.
7. Abre la sección **Actividad** y deshaz un movimiento. El ajuste contrario usa las existencias actuales y conserva movimientos posteriores. No se puede deshacer dos veces ni deshacer un movimiento de deshacer. Si produciría una cantidad negativa, se rechaza.
8. Archiva y busca en **Estado → Archivados**. Se conservan existencias y actividad; restaura antes de volver a ajustar.
9. Busca por nombre, filtra por categoría (incluye descendientes) y por **Por reponer**. Se muestran hasta 100 productos coincidentes; la búsqueda permite encontrar los demás. La actividad muestra los últimos 50 movimientos.
10. Simula una desconexión. No se aceptan escrituras sin conexión ni se encolan automáticamente. Al recuperar internet, reintenta la operación pendiente: conserva su identificador y datos para no aplicarse dos veces.
11. Retira un miembro desde la cuenta propietaria y comprueba que sus siguientes lecturas y escrituras fallen, aunque conserve una sesión. El historial anterior permanece.

La actualización automática ocurre al volver a la pestaña y cada 30 segundos mientras está visible y conectada. Se pausa mientras un formulario tiene cambios pendientes, está enviándose o conserva una operación de resultado incierto. No se promete sincronización instantánea ni escrituras offline. Prueba el recorrido con dos cuentas del mismo entorno; el usuario ya confirmó uso compartido en producción.

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

La revisión de navegador usa otra base temporal con correo deshabilitado. Los tokens de confirmación de esa prueba son sintéticos; la entrega de integración sigue simulada. El usuario confirmó los flujos reales de correo y uso compartido durante el despliegue; los cambios posteriores requieren su propia revisión.

### Inventory as the starting page

Sign-in, automatic sign-in after registration, and visits to `/` or `/sign-in` with an active session lead to `/inventory`. Verification and household membership checks still send accounts that need setup to `/household`, which also preserves pending invitations. Creating a household or accepting an invitation leads straight to inventory. Mi hogar remains available for household management.

On compact screens, the shared product dialog uses one floating green plus button with an accessible “Agregar productos” label. On wider screens the same trigger appears in the header with its label. Safe-area spacing and reserved space below the list keep the action reachable without covering the final record. Search and filters remain available through the header icon.

### Add multiple products

The shared green plus action **Agregar productos** opens one dialog on desktop and mobile, with compact **Un producto** and **Varios productos** choices below the title, without the navigation strip’s extra vertical margins. Switching choices preserves draft values; only the selected form is submitted. **Varios productos** shows the bulk form with one shared category (or Sin categoría). Each row accepts a name, initial whole quantity, and optional warning threshold; quantities use `unidades`. Use **Agregar otro** or the trash action to edit rows, then choose **Guardar productos** to save them, with up to 50 products per submission. Names and quantities are required on every remaining row. Each product stays on one line at every screen size. Mobile uses a wider dialog, a flexible name column, and compact numeric columns with the headings Cant. and Aviso. The plus-labelled add button appears as the next row in the grid; the primary save action stays below the list. Labels appear once in a sticky header above the scrollable rows. Each input retains its own accessible name. Adding a row focuses its new name input; removing a row returns focus to a remaining name input.

The server validates the complete batch, checks current household access and category ownership, and commits all products and initial receipt movements in one transaction. A failure saves none of the batch. Retries reuse the request and payload so an uncertain result cannot duplicate products. Zero quantities create no stock movement. Single-product creation remains available with its custom unit and inline category creation.

### Compact responsive product table

Products use the shared ProductTable component: a native table with Producto, Categoría, Unidad, and Existencias columns on desktop. Mobile uses compact divided rows with a linked name and combined category/unit metadata next to one set of quantity controls. Visible status badges identify urgent stock without relying on color. Archived rows show saved quantities without stock adjustment buttons.

Search and filters live in the shared ListFilters modal triggered by an icon beside the page heading, also used for Categories. The icon marks active searches/filters. GET form submission preserves bookmarkable URLs, direct links, and browser history. Clearing returns to the unfiltered URL; cancelling discards draft filter changes.

Routine stock feedback is announced in a screen-reader live region, without taking visible layout space. Disabled controls indicate saving. Errors and retry actions remain visible when needed. Compact rows reuse shared spacing tokens. Per the explicit compact-row preference, stock buttons use the 32px compact token; general controls retain the 44px touch token.

### Product sections

The product route keeps its name and current quantity above shared SectionNavigation tabs: Detalles, Existencias, Actividad, and Opciones. Tabs use normal links (`?tab=stock`, `?tab=activity`, `?tab=manage`; default is details) so direct links and browser history work naturally. Only the selected panel is rendered; categories/activity are fetched only where needed. Invalid tab values fall back to details.

Details and correction forms reuse SectionPanel and embedded ActionForm surfaces, retaining household/product/revision fields and existing server actions. Options archives/restores without leaving the selected tab after save. Archived products expose read-only details/stock guidance and restoration links. Product activity is expanded directly and remains product-scoped. The shared navigation component keeps the active tab visible when the strip overflows or resizes without changing page scroll/focus.

### Activity filtering

The global Activity page shares the header ListFilters modal with Products and Categories. Optional URL filters are `q` (partial product name), `person` (partial responsible person's name), `from`, and `to` (YYYY-MM-DD). Names match case-insensitively as literal text; multiple filters combine. Date boundaries use Panama time, include the full final day, and accept one-sided ranges. Invalid calendar dates or reversed ranges show validation feedback instead of unfiltered data.

Filters apply in the database before the 50-movement limit. Product matches stay household-scoped and include archived products; person matches are restricted to actors found in that household's history, including former members. Undo eligibility still checks the full household history so an undo outside the visible date range is respected. Clear, direct links, and browser Back preserve the shared filtering behavior. Empty filtered results have a specific message.

### Buy-first inventory ordering

Active products appear automatically in buying order: zero stock first, then positive quantities at or below their warning threshold, then adequately stocked products. Each group uses Spanish alphabetical order, ignoring capitalization and accents while keeping ñ after n; alphabetically equivalent names use stable IDs as a tie-breaker. Database pagination and client reordering use matching collation rules. Zero stock needs no configured threshold. Labels “Sin existencias” and “Por reponer”, plus narrow accent markers, make urgency visible in both desktop tables and compact mobile rows. Archived products retain alphabetical order and do not receive buying labels.

Ranking and filtering apply before the 100-product database limit. The “Por reponer” filter includes zero stock without a threshold; missing legacy thresholds normalize to null. Search/category filters and household access checks remain in place.

ProductTable has a small client boundary to reconcile confirmed stock responses by revision. Quantity labels, badges, and row status update immediately; row order and low-stock filter removal wait 1.5 seconds after all adjustments settle, resetting on another adjustment. Delayed refreshes cannot overwrite a newer confirmed quantity. Failed or uncertain writes retain the existing retry/deduplication workflow and do not report a new stock status.

### Shared shopping receipts

The Compras navigation item opens the shared `/shopping` list. Its confirmed “Agregar faltantes” action copies active zero/threshold stock into pending purchases without duplicating active linked entries. Marking purchased does not change stock. Only explicit batch receipt of the reviewed purchased quantities adds linked stock atomically and creates ordinary receipt movements, so the inventory priority and activity use their existing behavior. Shopping receipt history remains received if its inventory movement is later undone. See `docs/shopping.md` for the full workflow.

Inventory now shares the shopping compact stepper: 32px adjustment buttons, a quantity column using the same compact-width token, and table-compact links/row alignment. Names wrap to at most two lines on both screen sizes, with status badges preserved. Compact size changes do not alter immediate stock persistence, revision reconciliation, or uncertain retry behavior.

Stock adjustments save immediately and update quantity/status without moving the row. After all in-flight adjustments finish, the list waits 1.5 seconds without another adjustment before reapplying priority order and low-stock filtering. Each new adjustment restarts the delay; changing filters starts a fresh list. Timers are cleared on unmount.
