# Compartir el hogar

El hito 4 permite invitar familiares, aceptar invitaciones, reenviarlas, revocarlas y retirar miembros. Solo la persona propietaria puede gestionar el acceso. El inventario guardado ya está disponible en el hito 5; la lista de compras llegará en el hito 6.

## Revisar con dos cuentas

1. Reinicia el servidor (`Ctrl+C`, luego `npm run dev`) para cargar los nuevos campos de los modelos y el nombre del remitente. Abre [localhost:3001](http://localhost:3001).
2. Con la cuenta propietaria, abre **Gestionar mi familia** desde el hogar. Invita un segundo correo al que tengas acceso.
3. Comprueba el correo: debe mostrar **Lista de Compras**, la canasta y los colores crema/verde. El dominio sigue siendo `updates.finalscore.win`. No necesitas nuevas credenciales ni configurar Google, Atlas o Vercel.
4. Abre el enlace en otro perfil/ventana de navegador para conservar la sesión propietaria. Usa el mismo correo que recibió la invitación.
5. Si es una cuenta nueva, pulsa **Crear mi cuenta**, regístrate: entrarás automáticamente a tu cuenta pendiente. Confirma el correo para continuar a la invitación sin volver a iniciar sesión. Si ya existe y está verificada, pulsa **Ya tengo una cuenta**. El mismo navegador conserva la invitación y vuelve a ella después del acceso. Si cambias de navegador/dispositivo al verificar, vuelve a abrir el enlace original de invitación.
6. Pulsa **Aceptar invitación**. Debes ver el mismo hogar y tu acceso de miembro, sin crear otro hogar. Un correo diferente, una cuenta sin verificar y una cuenta que ya pertenezca a un hogar no pueden aceptar.
7. Desde la cuenta miembro, abre `/family`: debe explicar que la gestión es exclusiva de la persona propietaria, sin mostrar listas privadas ni controles.
8. Desde la cuenta propietaria, retira al familiar. En su navegador, actualiza o navega de nuevo: ya no debe acceder al hogar anterior. Su cuenta permanece y puede recibir una nueva invitación.
9. Prueba revocar una invitación y abrir su enlace. Para reenviar, espera un minuto; el nuevo envío reemplaza el enlace anterior y renueva el vencimiento por siete días. Aceptar dos veces no crea membresías duplicadas.

Los enlaces locales apuntan al Mac configurado en `NEXTAUTH_URL`. El `localhost` de un teléfono apunta al propio teléfono; la revisión remota en ambos teléfonos llegará al configurar hosting.

## Seguridad y concurrencia

- Las acciones obtienen identidad y versión de sesión en el servidor. Los identificadores de formulario no conceden acceso. Cada transacción vuelve a comprobar cuenta verificada, versión, propiedad y membresía.
- El documento del hogar serializa los cambios de acceso; el documento de usuario serializa aceptación y creación de hogares. No se puede aceptar en dos hogares simultáneamente.
- Las invitaciones guardan solo el hash del token y comprueban vencimiento al aceptar. Las visitas GET y escáneres de correo no consumen enlaces.
- Aceptación y membresía se guardan juntas. Revocar y aceptar simultáneamente producen un único resultado consistente. Si falla la membresía, la invitación sigue disponible.
- Retirar miembros elimina su membresía y revoca invitaciones pendientes al mismo hogar. Conserva usuario, productos y actividad. No se puede retirar al propietario. Las rutas comprueban membresía actual aunque la sesión siga vigente.
- Hay 20 envíos por persona en 15 minutos y un minuto entre reenvíos. Un fallo del proveedor revoca el token del envío fallido; se puede volver a invitar. Se muestran hasta 50 invitaciones recientes.

## Marca y estilos reutilizables

- `lib/brand.ts` define **Lista de Compras** y el lema. `components/ui/brand.tsx` reúne nombre y canasta en los encabezados.
- `styles/theme.json` es la fuente de colores, tipografías y tamaños. `npm run tokens` genera variables CSS, favicon e imagen de correo. Dev/build lo ejecutan automáticamente. El generador usa `sharp`, ya suministrado por la instalación de Next.js.
- `styles/basket.json` comparte el trazado entre web, favicon y correo. Se editan esas fuentes; `theme.generated.css` y `email-brand.generated.json` se regeneran.
- `app/globals.css` ofrece estilos reutilizables de marca, botones, campos, títulos y avisos, sobre Tailwind y los tokens.
- `lib/email/template.ts` genera HTML, encabezado, botón, enlace alternativo y texto plano para verificación, recuperación e invitaciones. Los estilos se insertan en línea para los clientes de correo. La canasta PNG viaja adjunta como imagen CID, sin depender de localhost. Se escapa el contenido dinámico.

La base, las cookies y el paquete conservan sus nombres técnicos para mantener datos y sesiones. El remitente visible se actualizó en `.env.local`, conservando dirección y credenciales.

## Verificación

`npm run check` ejecuta lint, tipos, pruebas unitarias y compilación. `npm run db:check` ejecuta 31 pruebas contra la réplica local en una base temporal que elimina al terminar. No usa datos reales ni envía correos. Incluye permisos, destinatarios, vencimiento, reutilización, reenvío, revocación, retiro, reinvitación, concurrencia y rollback.

La entrega real de los correos con el nuevo diseño y la revisión con dos cuentas reales quedan para el usuario. No avanzar al hito 5 sin su autorización.
