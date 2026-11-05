# Compartir el hogar

La app permite invitar familiares, aceptar invitaciones, reenviarlas, revocarlas y retirar miembros. Solo la persona propietaria puede gestionar el acceso. Inventario y Compras están implementados y comparten los datos del hogar. El usuario confirmó el flujo compartido en [producción](https://lista-de-compras-beta-eight.vercel.app); las cuentas y los datos locales siguen separados.

## Revisar con dos cuentas

1. Abre la [app de producción](https://lista-de-compras-beta-eight.vercel.app) en ambos dispositivos. Para revisar cambios locales, usa [localhost:3001](http://localhost:3001) con su réplica y configuración de correo; reinicia el servidor cuando cambies variables o modelos. No mezcles cuentas locales y de producción.
2. Con la cuenta propietaria, abre **Gestionar mi familia** desde el hogar. Invita un segundo correo al que tengas acceso.
3. Comprueba el correo: debe mostrar **Lista de Compras**, la canasta y los colores crema/verde. El dominio sigue siendo `updates.finalscore.win`. Producción usa la configuración ya verificada de Atlas, Vercel y Resend; Google no está habilitado.
4. Abre el enlace en otro perfil/ventana de navegador para conservar la sesión propietaria. Usa el mismo correo que recibió la invitación.
5. Si es una cuenta nueva, pulsa **Crear mi cuenta**, regístrate: entrarás automáticamente a tu cuenta pendiente. Confirma el correo para continuar a la invitación sin volver a iniciar sesión. Si ya existe y está verificada, pulsa **Ya tengo una cuenta**. El mismo navegador conserva la invitación y vuelve a ella después del acceso. Si cambias de navegador/dispositivo al verificar, vuelve a abrir el enlace original de invitación.
6. Pulsa **Aceptar invitación**. Debes entrar al inventario del mismo hogar, con acceso de miembro y sin crear otro hogar. Un correo diferente, una cuenta sin verificar y una cuenta que ya pertenezca a un hogar no pueden aceptar.
7. Desde la cuenta miembro, abre `/family`: debe explicar que la gestión es exclusiva de la persona propietaria, sin mostrar listas privadas ni controles.
8. Desde la cuenta propietaria, retira al familiar. En su navegador, actualiza o navega de nuevo: ya no debe acceder al hogar anterior. Su cuenta permanece y puede recibir una nueva invitación.
9. Prueba revocar una invitación y abrir su enlace. Para reenviar, espera un minuto; el nuevo envío reemplaza el enlace anterior y renueva el vencimiento por siete días. Aceptar dos veces no crea membresías duplicadas.

Los enlaces locales apuntan al Mac configurado en `NEXTAUTH_URL`. El `localhost` de un teléfono apunta al propio teléfono; para revisar desde teléfonos utiliza la URL HTTPS de producción.

## Seguridad y concurrencia

Desde **Mi hogar**, la persona propietaria puede editar **Nombre del hogar** y pulsar **Guardar nombre del hogar**. Se conserva el mismo hogar con sus productos, miembros e invitaciones. Se eliminan espacios al principio y al final y se admiten de 1 a 100 caracteres. Los miembros ven el nombre compartido al actualizar o navegar, pero no pueden editarlo. Las invitaciones abiertas consultan el nombre actual; los correos ya enviados conservan el texto original.

Para revisar el cambio, guarda un nombre nuevo y recarga la página; comprueba también el nombre en **Gestionar mi familia** y desde una cuenta miembro. Un nombre vacío o de más de 100 caracteres debe rechazarse. El formulario permite guardar más de una vez y muestra confirmación o error sin abandonar la página.

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

`npm run check` ejecuta lint, tipos, pruebas unitarias y compilación. `npm run db:check` ejecuta la suite de integración actual contra la réplica local en bases temporales que elimina al terminar. No usa datos reales ni envía correos. Incluye permisos, destinatarios, vencimiento, reutilización, reenvío, revocación, retiro, reinvitación, concurrencia y rollback.

En el despliegue del 2026-11-04, el usuario confirmó verificación por correo, creación del hogar, uso compartido y recuperación de contraseña. La suite de aplicación registrada pasó 203 pruebas unitarias y 86 de integración; esos resultados no sustituyen volver a probar cambios futuros. La entrega de integración está simulada y nunca envía correos reales. Consulta el [plan actual](implementation-plan.md) para el siguiente hito.
