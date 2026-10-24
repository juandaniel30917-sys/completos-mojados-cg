# Completos Mojados · Gráficas en vivo (CG)

Panel web para manejar los GC del programa **Completos Mojados** y una **salida limpia para OBS** (fuente Navegador, fondo transparente). Funciona en el mismo computador o **a distancia**: controlas desde un PC, tablet o celular y la salida de OBS cambia al instante, esté donde esté.

- **Sin instalación ni compilación**: son páginas HTML + JavaScript. Se publican gratis con GitHub Pages.
- **Remoto en tiempo real** con Supabase (base de datos + Realtime). También tiene **modo local** sin internet.
- **Plantillas reales** sacadas de tus referencias: barra del concurso, participante, temporizador, GC noticiero, cinta de invitado, zócalo, etiqueta, placas, fondo, logo, EN VIVO, avisos y cortinas.
- **Tus propios videos** con fondo verde (chroma key en tiempo real) o con transparencia real (WebM VP9 alfa).

> Este proyecto no incluye NDI. La salida es una página web para la fuente «Navegador» de OBS.

---

## 1. Cómo funciona

| Página | Para qué | Quién la abre |
|---|---|---|
| `index.html` | Crear una sala, ver tus salas o entrar al modo local | Tú |
| `panel.html` | El panel de control (pestañas **Control** y **Control + Visual**) | Tú y tu equipo (link de control) |
| `salida.html` | **Solo gráficas**, sin botones, fondo transparente | OBS (link de salida) |

### Borrador → Vista previa → Al aire

1. Eliges una gráfica en la lista y editas textos/colores. Eso es un **borrador**: queda guardado en tu equipo (punto amarillo) y **no sale al aire**.
2. En la pestaña **Control + Visual** ves dos monitores:
   - **VISTA PREVIA** (verde): lo que estás editando. *Nunca* se envía a OBS.
   - **AL AIRE** (rojo): exactamente lo que está saliendo en todas las salidas.
3. **MOSTRAR** la manda al aire con su animación de entrada. Si ya está al aire y cambias algo, el botón dice **ACTUALIZAR**: el texto cambia con un fundido, sin repetir la entrada y sin recargar la salida.
4. **OCULTAR** la saca con su animación de salida. **Limpiar** saca todo (con «Deshacer»).

Cambiar de pestaña no corta nada: la salida de OBS es independiente del panel, y los borradores se conservan.

Otras ayudas: ▶ en cada fila muestra/oculta al instante · ★ favoritos · buscador · dos gráficas del mismo tipo no se encienden juntas (la nueva reemplaza a la anterior) · atajos <kbd>Ctrl</kbd>+<kbd>Enter</kbd> (mostrar/actualizar) y <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>Enter</kbd> (ocultar) · botón **?** con ayuda rápida.

### Plantillas

| Categoría | Plantillas |
|---|---|
| Cintillos | **Barra concurso** (logo + mensajes de dos colores que rotan), **Zócalo** (texto que corre) |
| Nombres y cargos | **GC Noticiero** (pestaña, titular, bajada; sube solo si hay zócalo), **GC Programa** (cinta Impact con goteo) |
| Concurso | **Participante** (cinta «JUGANDO», marco amarillo, foto y nombre), **Temporizador** (iniciar/pausar/reiniciar; al llegar a cero parpadea, se oculta o nada) |
| Títulos | **Etiqueta** tipo sticker («NOTICIERO MOJADO»), **Placa** a pantalla completa (VOLVEMOS, VTR…) |
| Logo y en vivo | **Logo en la esquina**, **EN VIVO + hora** |
| Fondos | **Fondo del programa** animado (programa, noticiero, bloque 2, cierre, tropical, verde) |
| Videos | Tus videos + 4 transiciones del programa ya incluidas (WebM con transparencia) |
| Avisos | Tarjetas que entran y se van solas (aviso, saludo, redes, auspicio) |
| Transiciones | Cortina de salsa (bandas o círculos) |

Cada plantilla tiene posición, tamaño, colores y animaciones editables. Los textos largos se achican solos para no salirse.

### Escaleta del libreto (vista principal)

El panel abre en la pestaña **Libreto**: las gráficas aparecen en el orden de «LIBRETO PROGRAMA V.2», en **32 pasos** repartidos en **Bloque 1** y **Bloque 2**. Cada fila muestra:

- el número (`05.3` = paso 5, recurso 3) y el nombre;
- el **tipo** (GC, CORTINA, FONDO, IDENT., VTR, MENCIÓN, CONCURSO, PREGUNTA, PLACA, PAUSA, CIERRE…) y un icono con el color de la sección;
- el estado (**AIRE**, o **PROG.** si está programada pero no hay ninguna salida conectada);
- ▶ **Mostrar** y ■ **Retirar**;
- ⚠ si le falta un dato o archivo.

Debajo del título de cada paso va la referencia del libreto (música, cámaras, frase clave). Las duraciones son solo informativas: **nada se dispara solo**.

- **AHORA / Sigue**: arriba de la lista. ◀ ▶ (o las teclas <kbd>Av Pág</kbd> / <kbd>Re Pág</kbd>) cambian el paso actual. Tocar el título de un paso también lo marca. El paso actual se comparte con todos los paneles conectados.
- **Ajustar orden** (al final de la lista): subir/bajar, quitar o agregar gráficas a un paso. La lista indica «Orden modificado»; **Ajustes → Restaurar orden del libreto** vuelve al original sin borrar textos.
- La pestaña **Categorías** sigue mostrando todas las gráficas por tipo (incluidas las de la versión anterior).

### Reglas al aire

- Dos gráficas de la **misma zona** no se superponen: un GC de nombre reemplaza al anterior; una placa a pantalla completa reemplaza a otra; un fondo reemplaza a otro; un identificador reemplaza al de la misma esquina.
- **Cierre del programa** retira todo lo demás.
- **Limpiar salida** retira todas las gráficas, avisos y cortinas sin recargar la salida ni cortar la conexión (con «Deshacer»).
- Si no hay ninguna salida conectada, el panel lo dice («Sin salida», monitor «PROGRAMA», filas «PROG.»): no finge que algo está en pantalla.

### Gráficas agregadas para el libreto (estética de los scripts)

Las gráficas que ya existían (GC Noticiero, cinta de invitado, barra del concurso, participante, temporizador, zócalo, etiqueta, placas, fondos, logo, EN VIVO, avisos y cortinas de salsa) **no se modificaron**. Se agregaron solo las que faltaban, copiando la paleta, tipografías (Impact/Arial) y animaciones de los scripts de After Effects (`COMPLETOS_MOJADOS_MASTER.jsx`, `GRAFICAS_PARTE_DOS.jsx`) y de los GC de referencia en video:

| Gráfica | Referencia |
|---|---|
| **GC persona** (conductor, invitado, periodista…) | Videos `CONDUCTOR`, `Invitado1`, `CM_GC_GUEST_03`, `Felipe_Jimenez`: botella de mostaza, etiqueta roja/naranja, nombre en caja crema y cargo en caja dorada. Estilo «Noticiero» como `Presentador2` (barra roja, caja azul, bajada amarilla). |
| **GC Último minuto** | Video `GC_ULTIMO_MINUTO_10S`: banda roja con punto, titular en barra blanca, filete mostaza, cita y salpicadura. |
| **Logo Noticiero Mojado** (esquina) | «NOTICIERO» blanco / «MOJADO» rojo con contorno, como en el mismo video. |
| **Ticker Noticiero** | Video `TICKER_NOTICIERO_20S`. |
| **Intro Completos Mojados** | `INTRO_COMPLETOS_MOJADOS_20S`: TALCA + mapa del Maule, arcos de salsa, el completo se arma con los conductores, título y banner. |
| **Intro Noticiero Mojado** | `NOTICIERO_MOJADO_INTRO`: fondo azul con globo y anillos, barras, EN VIVO, NOTICIERO / MOJADO, DESDE TALCA y titular. |
| **Transiciones** (se lanzan y se van solas) | `PASE_NOTICIERO`, `TRANSICION_NOTA`, `CIERRE_NOTICIERO`, `REGRESO_COMPLETOS`, `TRANSICION_VTR_01/02/03`, `INTRO_BLOQUE_2`, `TRANSICION_PINA_PAPA`, con sus barridos de salsa, mancha de salsa y salpicaduras. |
| **Cierre del programa** | `CORTINA_CIERRE_10S`. Al mostrarlo se retira todo lo demás. |
| **Mención comercial, concurso telefónico, pregunta/trivia, marcador** | No tienen script: usan el estilo de los avisos del programa (tarjeta blanca, borde café, cabecera de color con Impact y goteo de salsa). |
| **Fondos «VTR» y «Bloque 2 (vino)»** | `BG_VTR` y `BG_BLOQUE_2` del script, agregados como opciones de Fondo y Placa. |

Todo se dibuja con HTML, CSS y SVG (no son videos). Cada gráfica tiene **velocidad de animación** ajustable. Si el equipo no tiene Impact (Mac, celulares) se usa **Anton** (licencia SIL OFL, incluida en `assets/fuentes`).

### Recursos pendientes

Lo que el libreto no entrega queda como marcador **PENDIENTE_…**. Estos marcadores no son archivos reales y **nunca se dibujan en pantalla**: si se muestra la gráfica igual, ese texto queda en blanco. El botón amarillo **«N pendientes»** de la barra superior los lista.

| Marcador | Dónde se completa |
|---|---|
| `PENDIENTE_NOMBRE_CONDUCTOR`, `PENDIENTE_NOMBRE_CONDUCTOR_NOTICIERO`, `PENDIENTE_NUMERO_TELEFONICO` | **Ajustes → Datos del programa** (se copian a todas sus gráficas) |
| `PENDIENTE_LOGO_MARY_MECHADAS`, `PENDIENTE_LOGO_RAYO_MAULINO` | Campo «Logo de la marca» de cada mención (mientras tanto se muestra el nombre de la marca en tipografía, no un logo inventado) |
| `PENDIENTE_VIDEO_INTRO`, `PENDIENTE_VTR_JUEGOS`, `PENDIENTE_VTR_PERSONAJE_1`, `PENDIENTE_VTR_PERSONAJE_2`, `PENDIENTE_VTR_CONCURSO`, `PENDIENTE_VTR_PINAPAPA`, `PENDIENTE_VIDEOCLIP_PINAPAPA`, `PENDIENTE_APOYO_NOTA_1/2` | Al tocar ▶ en la fila se abre la subida del video |
| `PENDIENTE_NOMBRE_PEATON`, `PENDIENTE_PERSONAJE_2`, `PENDIENTE_NOMBRE_PARTICIPANTE`, `PENDIENTE_PARTICIPANTES_Y_PUNTAJES`, `PENDIENTE_PREGUNTA_TRIVIA` | En el editor de esa gráfica |

El logo del programa (`assets/logo.png`) se recortó de un cuadro de video y es de baja resolución: conviene reemplazarlo por el original en **Ajustes → Logo del programa**.

### En el celular

Con una pantalla angosta, el panel cambia a una barra inferior con tres vistas:

- **Escaleta**: los pasos, con botones grandes ▶ y ■.
- **Editar**: el editor de la gráfica elegida.
- **Ver**: vista previa y programa.

Las ventanas emergentes se abren desde abajo y los campos usan letra de 16 px para que el teléfono no haga zoom.

---

## 2. Videos propios (pantalla verde o transparencia)

En el panel: **+ Nueva → Video** (o «Subir video» dentro de una gráfica de video).

1. Elige o arrastra el archivo (**MP4** o **WebM**). Se ve una vista previa.
2. El panel **analiza un cuadro** del video y te dice qué encontró:
   - **Transparencia real** → modo «Ya es transparente» (WebM VP9 con canal alfa).
   - **Fondo verde** → modo «Quitar verde» con el color detectado.
   - Ninguno → «Sin transparencia».
   Siempre puedes cambiarlo a mano. **Un MP4 nunca trae transparencia**: si es verde, usa «Quitar verde».
3. Ajusta el chroma mirando el resultado sobre cuadros, negro, blanco o azul: **Similitud** (súbela si queda verde), **Suavizar bordes**, **Quitar reflejo verde**. También puedes **hacer clic en el fondo del video** para elegir el color exacto.
4. Opciones: repetir en bucle, ocultar al terminar, sonido (**apagado por defecto**), animación de entrada y salida, pantalla completa o posición libre.
5. **Guardar en la biblioteca.** Queda una gráfica de video lista; en el panel tienes Reproducir / Pausa / Desde el inicio.

El chroma se calcula en la tarjeta de video (WebGL) con el mismo método del filtro «Chroma Key» de OBS, así que lo que ves en la vista previa es lo que sale.

**Formatos:** los `.mov` ProRes no se pueden reproducir en navegadores ni en la fuente Navegador de OBS; el panel lo avisa. Exporta como **WebM VP9 con alfa** (si tiene transparencia) o **MP4 H.264** con fondo verde.

### ¿Dónde se guardan los videos?

| Modo | Dónde | Quién lo ve |
|---|---|---|
| **Sala (remoto)** | Supabase Storage, bucket `cg-media`, ruta aleatoria por sala. Máx. 50 MB por archivo. | Todas las salidas de la sala, en cualquier equipo. La dirección es permanente (no caduca). |
| **Local** | IndexedDB del navegador (en este equipo). | Solo el mismo navegador/OBS de este equipo. |

En modo sala nunca se usan enlaces temporales: el archivo queda con una dirección pública fija pero imposible de adivinar. Puedes borrarlo en **Ajustes → Biblioteca de videos**.

---

## 3. Usarlo en OBS

1. En el panel: **Remoto → Link de salida → Copiar**.
2. En OBS: **Fuentes → + → Navegador**. Pega el link en **URL**. **Ancho 1920, Alto 1080**.
3. Deja **sin marcar** «Apagar la fuente cuando no esté visible» y «Actualizar el navegador cuando la escena se active».
4. Pon la fuente **encima** de la cámara.

Opciones del link de salida:

| Agregar al final | Efecto |
|---|---|
| `&w=1280&h=720` | Otra resolución (el diseño de 1920×1080 se escala). Pon el mismo tamaño en la fuente de OBS. |
| `&verde=1` | Fondo verde en vez de transparente (para un mezclador externo con chroma). |
| `&debug=1` | Muestra un indicador de conexión en la esquina (no lo uses al aire). |

**Sonido de los videos:** en las propiedades de la fuente marca «Controlar audio mediante OBS» si quieres manejar el volumen desde el mezclador de OBS.

**Modo local en OBS:** agrega `panel.html?local=1` como **dock** (Docks → Docks de navegador personalizados) y `salida.html?local=1` como fuente Navegador. Ambos comparten el mismo navegador interno de OBS, por eso se comunican sin internet.

---

## 4. Control remoto

- **Link de control** (`panel.html?sala=XXXX#t=TOKEN`): da control total de la sala. Ábrelo en otro PC, tablet o celular (hay un **QR** en *Remoto*). Pueden controlar varias personas a la vez; todas ven los cambios.
- **Link de salida** (`salida.html?sala=XXXX&k=CLAVE`): solo muestra. Con este link **no se puede cambiar nada**.
- **Generar links nuevos** (en *Remoto*): invalida los dos links anteriores. Úsalo si un link se filtró.
- Los indicadores de arriba muestran: conexión (**En línea / Reconectando / Sin internet**), cuántas **salidas** de OBS están conectadas y si lo último se **envió**.

**Si se corta internet:** la salida sigue mostrando lo último que tenía. El panel guarda lo que hagas y lo envía al volver la conexión. Ambos se reconectan solos (y si Realtime falla, usan una consulta de respaldo cada 2 segundos).

---

## 5. Instalar y ejecutar

No hay que compilar nada. Para probar en tu computador necesitas un servidor web local (abrir el archivo con doble clic no basta para el modo sala):

```bash
git clone https://github.com/<tu-usuario>/completos-mojados-cg.git
cd completos-mojados-cg
python -m http.server 8080        # o:  npx serve .
```

Abre `http://localhost:8080`.

### Configuración (variables)

La app usa dos valores **públicos** de Supabase, que van en `js/config.js`:

| Variable | Qué es | ¿Secreta? |
|---|---|---|
| `SUPABASE_URL` | Dirección del proyecto Supabase | No |
| `SUPABASE_ANON_KEY` | Clave pública «anon» del proyecto | **No** — está hecha para ir en el navegador. No da acceso a nada por sí sola (ver Seguridad). |

Para usar **tu propio** proyecto de Supabase: copia `.env.example` a `.env`, completa los valores y ejecuta `node scripts/configurar.mjs` (reescribe `js/config.js`). O edita `js/config.js` a mano.

**Nunca** pongas la `service_role key` en este repositorio ni en `js/config.js`. La función del servidor la recibe automáticamente desde Supabase.

---

## 6. Publicar (GitHub ≠ app funcionando)

GitHub guarda el **código**. Para que la app se pueda **usar** desde un link hacen falta dos cosas:

1. **Las páginas publicadas** → GitHub Pages (gratis).
2. **El servidor de tiempo real** → Supabase (ya configurado en el proyecto «Mi propia pista», con tablas y funciones `cg_*` separadas del resto).

### GitHub Pages

1. En el repositorio: **Settings → Pages**.
2. **Source: Deploy from a branch** · **Branch: `main`** · carpeta **`/ (root)`** · Save.
3. En 1–2 minutos queda en `https://<tu-usuario>.github.io/completos-mojados-cg/`.

Cada `git push` a `main` actualiza la página. Las salas y gráficas no se pierden al actualizar (viven en Supabase).

### Supabase (solo si montas un proyecto nuevo)

```bash
supabase link --project-ref <ref-de-tu-proyecto>
supabase db push                                   # aplica supabase/migrations/001_cg_salas.sql
supabase functions deploy cg-media --no-verify-jwt # función que autoriza subidas
```

O pega `supabase/migrations/001_cg_salas.sql` en el **SQL Editor** del panel de Supabase y crea la función `cg-media` con el código de `supabase/functions/cg-media/index.ts` (desactiva «Verify JWT»). Después actualiza `js/config.js`.

Requisitos de Supabase: **Realtime** activo con canales públicos permitidos (viene así por defecto). Si tu proyecto solo permite canales privados, la app igual funciona usando la consulta de respaldo (cambios en ~2 s en vez de instantáneos).

---

## 7. Seguridad

- **Sin acceso directo a la tabla.** `cg_salas` tiene RLS activo y sin políticas: el navegador solo puede llamar funciones (`cg_leer`, `cg_guardar`, …) que validan la clave de cada sala.
- **Dos niveles de permiso.** Token de control (24 bytes aleatorios) → puede leer y cambiar. Clave de salida = `sha256("out:" + token)` → solo puede leer. En la base de datos se guardan **solo hashes** de ambos.
- **Realtime no transporta gráficas.** Por el canal solo viaja «hay versión nueva N»; la salida siempre lee el estado desde la base de datos con su clave. Aunque alguien adivinara el canal, no puede poner gráficas falsas al aire.
- **El token va después del `#`** en el link de control, así no se envía a servidores ni queda en registros. Las páginas usan `referrer: no-referrer`.
- **Subidas autorizadas por el servidor.** La función `cg-media` verifica el token de control antes de entregar un permiso de subida firmado; tipos permitidos y máximo 50 MB.
- **Vista previa aislada.** Los monitores del panel no se conectan a la sala: reciben datos solo del panel que los contiene. La vista previa nunca puede salir al aire.
- **Secretos fuera del repositorio.** `.gitignore` excluye `.env`. La `service_role key` solo existe dentro de Supabase.
- Si un link se filtra: **Remoto → Generar links nuevos**.

---

## 8. Pruebas

Las pruebas automáticas usan Playwright (Chromium):

```bash
pip install playwright && python -m playwright install chromium
python -m http.server 8765 &
python test/e2e_local.py     # modo local: panel → salida independiente
python test/e2e_remoto.py    # modo sala con un Supabase simulado (3 equipos: tablet, OBS y celular)
```

Qué comprueban: editar sin salir al aire · la vista previa muestra el borrador · MOSTRAR llega a una salida independiente · ACTUALIZAR cambia el texto sin recargar ni repetir la entrada · fondo transparente · cambiar de pestaña no corta la emisión ni pierde el borrador · OCULTAR · avisos · temporizador · persistencia al recargar · crear sala · links y QR · presencia de la salida · control desde otro equipo y desde un celular · clave de salida falsa rechazada · la clave de salida no puede modificar · corte de internet y reconexión automática (con los cambios hechos sin red) · subida de video, detección de fondo verde, reproducción y chroma (fondo transparente, objeto visible).

El Supabase simulado reproduce las mismas reglas de permisos de `supabase/migrations/001_cg_salas.sql`; esas funciones también se probaron directamente en la base de datos real.

---

## 9. Problemas comunes

| Problema | Solución |
|---|---|
| La salida en OBS queda vacía | Revisa que el link sea el de **salida** y esté completo. Agrega `&debug=1` para ver el estado. Clic derecho en la fuente → *Actualizar*. |
| «El link no es válido o fue cambiado» | Alguien generó links nuevos. Copia el nuevo link de salida desde *Remoto*. |
| El panel dice «Sin salida» | OBS no tiene la fuente abierta, o la escena con la fuente no está cargada. |
| Un video no se ve | `.mov` ProRes no funciona: exporta WebM VP9 alfa o MP4 H.264. En modo local, el video solo existe en el equipo donde lo subiste. |
| Queda borde verde | Sube **Similitud** de a poco y **Quitar reflejo verde**; o haz clic en el fondo del video para tomar el color exacto. |
| El video no tiene sonido en el navegador | Los navegadores bloquean el sonido automático; en OBS sí suena. |
| La letra no se ve como Impact | Impact viene con Windows. En otros sistemas se usa una tipografía parecida. |

---

## 10. Estructura

```
index.html            Inicio: crear sala, mis salas, modo local
panel.html            Panel de control
salida.html           Salida para OBS (sin controles)
css/panel.css         Estilos del panel (oscuro, compacto, responsive)
css/salida.css        Estilos y animaciones de las gráficas (1920×1080)
js/config.js          URL y clave pública de Supabase
js/plantillas.js      Catálogo de plantillas: campos, valores por defecto y dibujo
js/render.js          Motor de la salida: entradas, actualizaciones con fundido, salidas, avisos, cortinas, video
js/chroma.js          Chroma key en WebGL
js/conexion.js        Sala remota (Supabase + Realtime con reconexión), modo local, subida de archivos
js/panel.js           Lógica del panel
js/vendor/qrcode.js   Generador de QR (MIT, Kazuhiko Arase)
assets/               Logo y transiciones del programa (WebM con transparencia)
supabase/             Migración SQL y función cg-media
scripts/configurar.mjs  Genera js/config.js desde .env
test/                 Pruebas automáticas y video de prueba
```
