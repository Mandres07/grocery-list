---
name: "Lista de Compras"
description: "Un hogar. Un equipo."
colors:
  background: "#f5f6f2"
  surface: "#ffffff"
  foreground: "#20382d"
  muted: "#606e64"
  brand: "#2f5b43"
  brand-hover: "#244833"
  sage: "#edf2e9"
  line: "#e1e7dd"
  control-line: "#7e8c80"
  warning: "#885126"
  accent-soft: "#f7e9da"
  accent: "#a14e36"
  warning-soft: "#fff0d4"
  overlay: "#1b3028a6"
  surface-muted: "#f7f9f5"
  inverse-line: "#ffffff26"
typography:
  display:
    fontFamily: "var(--font-manrope), ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif"
    fontSize: "36px"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.025em"
  display-wide:
    fontFamily: "var(--font-manrope), ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif"
    fontSize: "56px"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "var(--font-manrope), ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif"
    fontSize: "30px"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "-0.025em"
  title:
    fontFamily: "var(--font-manrope), ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif"
    fontSize: "16px"
    fontWeight: 700
    lineHeight: 1.5
  body:
    fontFamily: "var(--font-manrope), ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "var(--font-manrope), ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif"
    fontSize: "14px"
    fontWeight: 600
    lineHeight: 1.4285714285714286
  caption:
    fontFamily: "var(--font-manrope), ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.6666666666666667
rounded:
  control: "8px"
  button: "8px"
  panel: "12px"
spacing:
  space-2xs: "4px"
  space-xs: "8px"
  space-sm: "12px"
  space-md: "20px"
  space-lg: "32px"
  panel-padding: "24px"
  control-padding: "12px"
  layout-gutter: "20px"
  section-gap: "24px"
components:
  button-primary:
    backgroundColor: "{colors.brand}"
    textColor: "{colors.surface}"
    typography: "{typography.label}"
    rounded: "{rounded.button}"
    padding: "0px 16px"
    height: "44px"
  button-primary-hover:
    backgroundColor: "{colors.brand-hover}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.foreground}"
    typography: "{typography.label}"
    rounded: "{rounded.button}"
    padding: "0px 16px"
    height: "44px"
  button-quiet:
    textColor: "{colors.foreground}"
    typography: "{typography.label}"
    rounded: "{rounded.button}"
    padding: "0px 16px"
    height: "44px"
  input:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.foreground}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "0px 12px"
    height: "44px"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.panel}"
    padding: "24px"
  status-warning:
    backgroundColor: "{colors.warning-soft}"
    textColor: "{colors.warning}"
    rounded: "{rounded.control}"
    padding: "0px 8px"
  section-navigation:
    backgroundColor: "{colors.sage}"
    rounded: "{rounded.control}"
    padding: "4px"
  select-control:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.foreground}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "0px 44px 0px 12px"
    height: "44px"
  sign-out-menu:
    textColor: "{colors.accent}"
    rounded: "{rounded.control}"
    padding: "0px 12px"
    height: "44px"
---

# Design System: Lista de Compras

## Overview

**Creative North Star: "La despensa compartida"**

Un sistema cálido y familiar que convierte el orden cotidiano en una experiencia sencilla. El verde bosque da continuidad a la marca y a las acciones; la salvia suaviza agrupaciones y estados; la terracota aporta pequeños detalles de cercanía. Manrope mantiene una voz común entre bienvenida, formularios y listas.

Los controles son sencillos y amables. La densidad compacta permite comparar productos y actuar sin perder contexto. Las capas discretas separan contenido y superposiciones mediante fondos, bordes y sombras suaves, reservando mayor profundidad para los diálogos.

Este documento captura el sistema implementado, con lenguaje descriptivo confirmado por el usuario. La fuente editable de valores sigue siendo `styles/theme.json`; regenerar con `npm run tokens` y sincronizar esta captura cuando cambie el tema. `docs/ui-standards.md` conserva las convenciones detalladas de implementación. No se establece una identidad visual nueva.

**Key Characteristics:**

- Verde bosque para marca, navegación y acciones principales.
- Tipografía Manrope y jerarquía por tamaño y peso.
- Colecciones compactas con separadores y cantidades alineadas.
- Capas discretas y esquinas suavemente cuadradas.

## Colors

Verde bosque, salvia y terracota construyen una paleta doméstica serena sobre superficies claras. Los valores exactos están en el frontmatter, con los nombres originales del tema. Las rampas OKLCH del archivo complementario son exploraciones generadas para el panel de Impeccable; no son tokens de la aplicación ni autorizan colores nuevos.

### Primary

- **Verde bosque** (`brand`): marca, encabezado, acciones principales, navegación y confirmaciones positivas.
- **Verde bosque profundo** (`brand-hover`): respuesta de las acciones principales al puntero.
- **Salvia** (`sage`): fondos discretos de navegación, etiquetas neutras y estados disponibles.

### Secondary

- **Terracota** (`accent`): pequeños iconos, detalles decorativos y señales de agotado con texto.
- **Melocotón suave** (`accent-soft`): base clara para esos detalles y la cesta sobre el encabezado verde.
- **Ámbar tostado** (`warning`) y **crema ámbar** (`warning-soft`): poco stock, verificación pendiente y avisos explícitos.

### Neutral

- **Fondo vegetal claro** (`background`): lienzo general y texto del encabezado inverso.
- **Blanco de superficie** (`surface`): formularios, colecciones y paneles.
- **Blanco vegetal** (`surface-muted`): campos en reposo, encabezados de tabla y respuesta discreta de filas.
- **Tinta bosque** (`foreground`): texto principal.
- **Gris salvia** (`muted`): metadatos, descripciones y texto secundario.
- **Línea vegetal** (`line`): límites y separadores de baja intensidad.
- **Línea de control** (`control-line`): límites perceptibles de campos, grupos de contraseña y controles de cantidad; conservar al menos 3:1 contra los fondos claros compatibles. El texto secundario conserva al menos 4.5:1 sobre esos fondos, incluida salvia.
- **Velo bosque** (`overlay`): fondo translúcido de diálogos.
- **Línea inversa** (`inverse-line`): separadores y selección sobre verde.

**The Green Action Rule.** Las acciones principales y los grandes énfasis usan verde. La terracota se reserva para detalles pequeños, etiquetas y marcadores de estado.

**The Text Status Rule.** Los estados incluyen texto explícito; el color y los marcadores solo lo refuerzan.

## Typography

**Display Font:** Manrope, variable local, con la misma pila de reserva del texto.
**Body Font:** Manrope, seguida de fuentes sans-serif del sistema.

La familia única mantiene continuidad entre una bienvenida expresiva y el trabajo cotidiano. Los titulares y nombres de producto usan peso 700; controles y navegación activa, 600; el texto general, 400–500. No hay una familia monoespaciada independiente: las cantidades usan cifras tabulares.

### Hierarchy

- **Display / Display-wide:** bienvenida; pasa de la escala móvil a la amplia en el umbral de escritorio.
- **Headline:** títulos de página y paneles de autenticación; interletraje ajustado.
- **Title:** títulos de secciones compactas.
- **Body:** lectura y entrada de datos.
- **Label:** controles y navegación; los nombres de producto comparten su tamaño con peso 700.
- **Caption:** ayudas y metadatos; las etiquetas de estado usan su tamaño con peso 600.

Los valores de cada rol están en el frontmatter. Manrope se carga localmente mediante `next/font/local`, sin dependencia de un proveedor externo de fuentes. Los correos usan su propia pila de reserva definida en el tema.

## Layout

El contenedor exterior comparte ancho máximo (72rem) y canal lateral (20px) entre encabezado, contenido y pie. Las páginas cortas usan una columna de altura mínima de viewport; el pie queda al final del flujo. El espacio de scrollbar permanece estable.

La escala de espaciado, el padding de paneles y las separaciones están en el frontmatter. Las colecciones compactas aplican 8px verticales y 12px horizontales por registro; agrupan nombre y estado, muestran metadatos debajo y dejan cantidades al extremo final. Los nombres móviles pueden ocupar dos líneas sin perder su nombre accesible completo.

- **Base móvil:** contenido en una columna; bienvenida, formulario y beneficios, en ese orden. Las tablas se presentan como registros compactos con encabezados conservados para tecnología de asistencia.
- **640px / 40rem:** las acciones flotantes de creación vuelven al flujo; los detalles pueden distribuirse en tres columnas.
- **768px / 48rem:** tablas con encabezado y columnas descriptivas visibles; paneles de ajustes pueden formar dos columnas.
- **1024px / 64rem:** navegación de cuenta en línea, bienvenida y formulario en columnas (0.9fr / 1.1fr), y titular de bienvenida amplio.

Los formularios tienen medidas compartidas: habitual (640px), estrecha (480px), ajustes (960px). Los diálogos tienen un máximo de 560px y preservan los canales del viewport. Las tiras de secciones permiten desplazamiento horizontal y revelan el enlace activo sin desplazar toda la página.

## Elevation & Depth

**Capas discretas:** predominan los límites suaves y el cambio entre lienzo y superficie. La sombra de panel es leve; el encabezado obtiene una separación corta y el diálogo una elevación claramente mayor con velo de fondo. Los popovers y las acciones flotantes también usan la utilidad de sombra amplia existente; no sustituirla por una sombra nueva sin revisar el sistema.

### Shadow Vocabulary

- **panel** (`0 2px 8px #20382d05, 0 1px 2px #20382d04`): paneles, colecciones y selección de sección.
- **navigation** (`0 2px 12px #20382d0d`): encabezado sticky.
- **dialog** (`0 24px 80px #102c2433`): superposiciones modales.
- **action** (`0 2px 4px #163d2626`): acciones principales.

**The Single Surface Rule.** Cada grupo editable tiene una sola superficie. Un formulario dentro de una tarjeta o diálogo no añade otra tarjeta.

## Shapes

Controles y botones suavemente cuadrados, con un radio común; paneles, colecciones y diálogos usan el radio de panel, algo mayor. Las medidas exactas están en el frontmatter. Los límites son generalmente líneas de 1px. Las acciones flotantes móviles son circulares (56px); la marca usa una base cuadrada suavizada (36px) con cesta (20px). Los iconos de controles reutilizan ese tamaño de 20px.

## Components

### Buttons

Acciones claras y amables. La primaria usa verde bosque, texto blanco y sombra corta; su hover profundiza el verde. La secundaria usa fondo blanco, borde suave y hover salvia. La discreta evita el borde y usa hover salvia; los enlaces de texto conservan subrayado. Las tres variantes generales tienen altura mínima táctil (44px), texto de control y esquinas compartidas.

El foco visible tiene contorno de 3px y separación de 3px, verde en superficies claras y claro en el encabezado inverso. Los controles deshabilitados reducen opacidad y muestran cursor de indisponibilidad. Las variantes compactas de registros y steppers usan la excepción existente de 32px; no extenderla a formularios generales.

### Chips / Status

Etiquetas pequeñas con texto explícito, peso 600 y esquinas de control. Poco stock usa ámbar; agotado, terracota sobre melocotón; disponible, verde sobre salvia; archivado, texto secundario sobre salvia. Las etiquetas de categoría son más tranquilas, con peso 500. Las filas refuerzan agotado o poco stock con una línea estrecha al inicio.

### Cards / Containers

Superficie blanca, borde vegetal, radio de panel y sombra leve. Los formularios y paneles independientes usan el padding de panel. Las colecciones comparten la envolvente, con filas divididas y padding compacto. Los formularios embebidos dejan la superficie a su contenedor.

### Inputs / Fields

Etiqueta visible encima, fondo vegetal muy claro, borde de control contrastado y esquinas de control. Altura mínima de 44px, padding horizontal de 12px y texto de cuerpo. Al enfocar, el fondo pasa a blanco y se aplica el foco compartido. Ayudas y mensajes mantienen relación accesible con el campo; los mensajes de error y reintento permanecen visibles. Un grupo de contraseña integra la acción de mostrar sin convertirla en envío.

Los desplegables conservan el elemento select nativo y su selector de opciones. La flecha usa el icono compartido, centrado verticalmente, con 12px de margen al extremo final y 44px de reserva de texto en ese extremo. No intercepta clics. En colores forzados se recupera la flecha nativa del navegador.

### Navigation

Encabezado verde sticky con texto claro y cesta en base melocotón. La cuenta usa enlaces en línea desde el umbral de escritorio; antes, menú desplegable con superficie blanca desplazable. El estado activo inverso usa fondo translúcido y contorno interior; la navegación sobre claro usa salvia y texto verde. Las secciones usan una tira salvia con la selección en blanco y sombra leve, siempre con `aria-current`.

En el menú móvil, Cerrar sesión comparte alineación, ancho completo y altura táctil con los enlaces, con icono de salida, texto terracota y hover melocotón suave. La variante de escritorio conserva el tratamiento inverso del encabezado.

### Quantity Controls / Record Rows

Un único grupo delimitado por el borde de control reúne restar, cantidad y sumar. Los botones son independientes y tienen nombres accesibles específicos. Cantidades alineadas, peso 600 y cifras tabulares; la entrada editable compacta mide 44px de ancho. Compras e inventario comparten densidad compacta. Los estados rutinarios de guardado no añaden altura a la fila; los errores y reintentos sí deben verse. En compras, una cantidad modificada muestra una indicación visible de que falta guardarla al marcar el artículo como comprado; el cambio confirmado de lista muestra un aviso con enlace a su destino. Se reutilizan las superficies y tipografía existentes.

### Dialogs / Disclosures

Diálogos nativos blancos con borde, radio de panel, padding compartido y velo bosque. Entrada y salida con desvanecimiento y desplazamiento (220ms / 12px); menús desplegables (160ms / 6px), con la curva de easing del tema. Las funciones nativas conservan comportamiento inmediato cuando el navegador no admite transiciones discretas. Movimiento reducido desactiva traslación y transiciones. El cierre flotante móvil comparte posición con el disparador de creación; los estados pendientes o inciertos mantienen sus guardas de cierre.

## Do's and Don'ts

### Do:

- Do reutilizar componentes, tokens y estilos compartidos para mantener la misma densidad entre colecciones.
- Do mantener foco visible, etiquetas explícitas y nombres accesibles completos aunque el texto se limite visualmente.
- Do mantener cantidades y acciones junto a la identidad del registro, centradas verticalmente.
- Do respetar movimiento reducido y el comportamiento nativo de diálogos, detalles y enlaces.

### Don't:

- Don't usar terracota para botones principales, titulares grandes o grandes superficies.
- Don't reducir todos los controles a la variante compacta: su excepción pertenece a registros y steppers existentes.
- Don't anidar tarjetas de formulario dentro de otra superficie que ya delimita el contenido.
- Don't comunicar estados únicamente con color ni reservar espacio visible para mensajes vacíos.

Captura basada en `styles/theme.json`, `styles/tokens.css`, `app/globals.css` y componentes compartidos. Pantallas públicas contrastadas visualmente en escritorio y móvil. El flujo de compras se verificó con cuenta y base de datos desechables; la navegación y el select se revisaron además en una vista aislada de los componentes reales. Estas verificaciones no sustituyen pruebas completas con lectores de pantalla, colores forzados o dispositivos táctiles físicos. Última sincronización documental: 2026-11-05.

Estructura de tokens y secciones basada en la [especificación DESIGN.md](https://raw.githubusercontent.com/google-labs-code/design.md/main/docs/spec.md).
