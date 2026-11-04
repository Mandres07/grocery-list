# Inventario compartido y acceso simplificado

El hito 5 guarda productos y categorías del hogar, ajustes de existencias, correcciones, archivo y actividad. Todos los miembros verificados tienen los mismos permisos sobre el inventario. La gestión de familiares sigue siendo exclusiva del propietario. La lista de compras corresponde al hito 6.

## Acceso más directo

- `/` conserva la presentación original a la izquierda y muestra el registro a la derecha. En móvil se apilan. Ya no hay productos de ejemplo. `/register` redirige a `/`.
- Crear una cuenta inicia sesión automáticamente mediante NextAuth. También se permite iniciar sesión antes de verificar el correo. Un fallo del proveedor de correo no impide entrar a la cuenta.
- El usuario pendiente puede ver su cuenta, cambiar su nombre, cerrar sesión, recuperar contraseña y pedir otra verificación. Crear/unirse a un hogar, gestionar familiares y leer/cambiar inventario requieren verificación en el servidor.
- Una invitación se conserva durante el registro y la sesión pendiente. Confirmar el correo en el mismo navegador vuelve a la invitación sin pedir de nuevo la contraseña. Se acepta explícitamente la invitación para entrar al hogar; no se crea otro hogar automáticamente.
- Un usuario con sesión vigente que abre `/` o `/sign-in` vuelve a `/household`. El encabezado compartido ofrece un menú nativo accesible con Mi hogar, Inventario (cuando esté verificado), Mi cuenta y Cerrar sesión.
- Las comprobaciones de usuario se comparten dentro de la petición con React `cache`; la verificación y la versión de sesión se leen de MongoDB en cada petición nueva. No se confía en un indicador de verificación enviado desde el navegador.

## Revisar el hito

1. Reinicia el servidor (`Ctrl+C`, `npm run dev`). Sigue usando el MongoDB local y la configuración de Resend existente; no se requieren nuevos servicios.
2. Crea una cuenta desde `/`. Debes entrar inmediatamente a la pantalla de cuenta pendiente, con menú y acceso a Mi cuenta. Abrir `/inventory` directamente debe devolver a esa pantalla.
3. Confirma el correo. Si llegaste por invitación, acepta el hogar existente. Si no tienes hogar, crea uno. Abre **Mi hogar → Abrir mi inventario**.
4. Crea categorías y, opcionalmente, subcategorías. Agrega un producto con nombre, unidad, cantidad entera inicial y umbral de reposición opcional. Un umbral de cero también es válido.
5. Prueba + y −. No se puede bajar de cero. Recarga y comprueba que la cantidad persista. Desde otra cuenta del mismo hogar debes ver el mismo producto y la actividad con su autor.
6. Abre el producto para editar datos o corregir la cantidad total contada. Si otra persona actualizó el producto, una corrección o edición basada en datos viejos debe pedir actualizar, sin sobrescribir el cambio ajeno.
7. Deshaz un movimiento desde la actividad. El ajuste contrario usa las existencias actuales y conserva movimientos posteriores. No se puede deshacer dos veces ni deshacer un movimiento de deshacer. Si produciría una cantidad negativa, se rechaza.
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
