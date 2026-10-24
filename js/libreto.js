/* COMPLETOS MOJADOS · CG — escaleta del programa según «LIBRETO PROGRAMA V.2».
   Cada paso sigue el orden del PDF y lista las gráficas que el operador dispara en ese momento.
   Reglas: no se inventan nombres, números, logos ni videos. Lo que falta queda como PENDIENTE_… (nunca sale al aire). */
(function () {
  "use strict";
  var CG = window.CG, P = CG.PLANTILLAS;
  var V = 3; /* versión de la escaleta sembrada */

  /* ---------------- gráficas del libreto (id fijo con prefijo lb-) ---------------- */
  var EL = [];
  function E(id, plantilla, nombre, datos, extra) {
    var e = CG.crearElemento(plantilla, {nombre: nombre, datos: datos || {}});
    e.id = "lb-" + id; e.libreto = true;
    if (extra) { Object.keys(extra).forEach(function (k) { e[k] = extra[k]; }); }
    EL.push(e); return e;
  }
  function VID(id, nombre, pend, extra) { return E(id, "video", nombre, Object.assign({media: "", modo: "normal", audio: true, volumen: 100, ocultarAlFinal: true, entrada: "fundido", salida: "fundido"}, extra || {}), {pend: {media: pend}, tipo: "VTR"}); }
  function TRANS(id, nombre, media) { return E(id, "video", nombre, {media: media, modo: "alfa", audio: false, ocultarAlFinal: true, entrada: "corte", salida: "corte"}, {tipo: "TRANSICION"}); }

  /* identidad y recursos que se repiten */
  E("logo", "mosca", "Logo en la esquina");
  E("fondo-programa", "fondo", "Fondo programa", {tipo: "programa"});
  E("cortina-cm", "cortina", "Cortina Completos Mojados (bandas de salsa)", {estilo: "bandas"}, {fav: true});
  E("cortina-programa", "cortina", "Cortina programa (círculos de salsa)", {estilo: "iris"}, {fav: true});
  E("gc-conductor", "gcPersona", "GC conductor", {etiqueta: "CONDUCTOR", nombre: "PENDIENTE_NOMBRE_CONDUCTOR", cargo: "CONDUCTOR DEL PROGRAMA", colorEtq: "rojo"}, {pend: {nombre: "PENDIENTE_NOMBRE_CONDUCTOR"}, vinc: {nombre: "conductor"}, fav: true});
  TRANS("trans-vtr2", "TRANSICION_VTR_02 (video incluido)", "m-vtr2");
  TRANS("trans-vtr3", "TRANSICION_VTR_03 (video incluido)", "m-vtr3");

  /* bloque 1 */
  VID("video-intro", "Video de apertura", "PENDIENTE_VIDEO_INTRO");
  E("intro", "intro", "INTRO_COMPLETOS_MOJADOS (escena)");
  E("bienvenida", "etiqueta", "¡Muy buenos días, Región del Maule!", {texto: "¡BUENOS DÍAS, REGIÓN DEL MAULE!", anim: "rebote", y: 300, escala: 85});
  E("trans-pase", "transicion", "PASE_NOTICIERO «¡Adelante, el noticiero!»", {escena: "pase_noticiero"}, {fav: true});
  TRANS("trans-noticiero", "TRANSICION_NOTICIERO (video incluido)", "m-trans-not");
  E("intro-noticiero", "introNoticiero", "NOTICIERO_MOJADO_INTRO (escena)");
  E("fondo-noticiero", "fondo", "Fondo noticiero", {tipo: "noticiero", logo: false});
  E("logo-noticiero", "logoNoticiero", "Logo Noticiero Mojado (esquina)");
  E("gc-cond-noticiero", "gcPersona", "GC conductor del noticiero", {etiqueta: "CONDUCTOR", nombre: "PENDIENTE_NOMBRE_CONDUCTOR_NOTICIERO", cargo: "NOTICIERO MOJADO", estilo: "noticiero", colorEtq: "rojo"}, {pend: {nombre: "PENDIENTE_NOMBRE_CONDUCTOR_NOTICIERO"}, vinc: {nombre: "conductorNoticiero"}});
  E("urgente", "gcUltimoMinuto", "Último minuto: Vara Gruesa", {etiqueta: "ÚLTIMO MINUTO", titular: "SITUACIÓN URGENTE EN VARA GRUESA", cita: ""});
  E("titulares", "tickerNoticiero", "Ticker de titulares", {items: ["SITUACIÓN URGENTE EN VARA GRUESA", "NOTA PREPARADA POR LINDOLFO ITURRIANO GONZÁLEZ", "EL NOTICIERO MÁS LARGO DEL MUNDO"]});
  E("gc-lindolfo", "gcPersona", "GC nota de Lindolfo", {etiqueta: "NOTA", nombre: "Lindolfo Iturriano González", cargo: "", estilo: "noticiero", colorEtq: "rojo"});
  E("trans-nota", "transicion", "TRANSICION_NOTA «En terreno»", {escena: "nota"});
  E("envivo-nota", "enVivo", "EN VIVO (nota)", {ciudad: "VARA GRUESA"});
  E("gc-sector", "gcNoticiero", "En el sector: parada militar", {tab: "EN EL SECTOR", titular: "PARADA MILITAR EN VARA GRUESA", bajada: "", lugar: "VARA GRUESA", color: "#0B3C8C", punto: true});
  E("gc-peaton", "gcPersona", "GC peatón", {etiqueta: "VARA GRUESA", nombre: "PENDIENTE_NOMBRE_PEATON", cargo: "", estilo: "noticiero", colorEtq: "rojo"}, {pend: {nombre: "PENDIENTE_NOMBRE_PEATON"}});
  VID("apoyo-1", "Imagen de apoyo 1 (nota)", "PENDIENTE_APOYO_NOTA_1", {audio: false});
  VID("apoyo-2", "Imagen de apoyo 2 (nota)", "PENDIENTE_APOYO_NOTA_2", {audio: false});
  E("trans-cierre-noticiero", "transicion", "CIERRE_NOTICIERO «Volvemos a Completos Mojados»", {escena: "cierre_noticiero"});
  TRANS("trans-noticiero-corta", "TRANSICION_NOTICIERO corta (video incluido)", "m-trans-not2");
  E("trans-regreso", "transicion", "REGRESO_COMPLETOS (el completo se arma)", {escena: "regreso"});
  E("placa-juegos", "placa", "Placa Juegos Mojados", {titulo: "JUEGOS MOJADOS", sub: "¡QUE COMIENCEN LOS JUEGOS!", fondo: "vtr"});
  E("juego-emboque", "etiqueta", "Juego: emboque", {texto: "EMBOQUE", color: "#F59A23", anim: "rebote", y: 280});
  E("juego-tarros", "etiqueta", "Juego: botar los tarros", {texto: "BOTAR LOS TARROS", color: "#6AA832", anim: "rebote", y: 280});
  E("juego-mayonesa", "etiqueta", "Juego: envase de mayonesa", {texto: "ACHUNTARLE A LA MAYONESA", color: "#D7141A", anim: "rebote", y: 280, escala: 75});
  E("trans-vtr01", "transicion", "TRANSICION_VTR_01", {escena: "vtr01"});
  VID("vtr-juegos", "VTR Juegos Mojados (3 min)", "PENDIENTE_VTR_JUEGOS");
  E("gc-participante", "gcPersona", "GC participante (juegos)", {etiqueta: "PARTICIPANTE", nombre: "PENDIENTE_NOMBRE_PARTICIPANTE", cargo: "JUEGOS MOJADOS", colorEtq: "naranjo"}, {pend: {nombre: "PENDIENTE_NOMBRE_PARTICIPANTE"}});
  E("marcador-juegos", "marcador", "Marcador Juegos Mojados", {titulo: "JUEGOS MOJADOS", filas: [], color: "palta"}, {pend: {filas: "PENDIENTE_PARTICIPANTES_Y_PUNTAJES"}});
  E("placa-personajes", "placa", "Placa Personajes del Maule", {titulo: "PERSONAJES DEL MAULE", sub: "HAY HISTORIAS QUE VALEN LA PENA CONOCER", fondo: "programa"});
  E("placa-talquinos", "placa", "Placa Talquinos: Guido Goossens", {titulo: "TALQUINOS", sub: "GUIDO GOOSSENS", fondo: "cierre"});
  E("gc-guido", "gcPersona", "GC Guido Goossens", {etiqueta: "TALQUINOS", nombre: "Guido Goossens", cargo: "", colorEtq: "naranjo"});
  E("trans-vtr02", "transicion", "TRANSICION_VTR_02 «¡Atentos!»", {escena: "vtr02"});
  VID("vtr-p1", "VTR personaje 1 (2:15)", "PENDIENTE_VTR_PERSONAJE_1");
  E("mencion-mary", "mencion", "Mención Mary Mechadas", {marca: "MARY MECHADAS", logo: "", texto: "¡UNA MECHADA DE VERDAD!", color: "mostaza",
    puntos: ["Carne mechada cocinada por horas a fuego lento", "Pan de masa padre crujiente", "Salsas de la casa", "Jugos de jamaica, limón y tamarindo"], delivery: true, textoDelivery: "PÍDELO POR DELIVERY"}, {pend: {logo: "PENDIENTE_LOGO_MARY_MECHADAS"}});
  E("gc-mary", "gcPersona", "GC marca Mary Mechadas", {etiqueta: "MENCIÓN", nombre: "Mary Mechadas", cargo: "La reina indiscutible de los sabores auténticos", colorEtq: "naranjo"});
  E("placa-p2", "placa", "Placa Talquinos: personaje 2", {titulo: "TALQUINOS", sub: "PENDIENTE_PERSONAJE_2", fondo: "cierre"}, {pend: {sub: "PENDIENTE_PERSONAJE_2"}});
  E("gc-p2", "gcPersona", "GC personaje 2", {etiqueta: "TALQUINOS", nombre: "PENDIENTE_PERSONAJE_2", cargo: "", colorEtq: "naranjo"}, {pend: {nombre: "PENDIENTE_PERSONAJE_2"}});
  E("trans-vtr03", "transicion", "TRANSICION_VTR_03 «Algo se viene»", {escena: "vtr03"});
  VID("vtr-p2", "VTR personaje 2 (2:15)", "PENDIENTE_VTR_PERSONAJE_2");
  E("sorpresa", "etiqueta", "¡Una gran sorpresa!", {texto: "¡UNA GRAN SORPRESA!", color: "#D7141A", anim: "rebote", y: 300});
  VID("videoclip", "Videoclip Piña Papá", "PENDIENTE_VIDEOCLIP_PINAPAPA");
  E("gc-gran-artista", "gcPersona", "GC «UN GRAN ARTISTA»", {etiqueta: "VIDEOCLIP", nombre: "UN GRAN ARTISTA", cargo: "", colorEtq: "rojo"});
  E("pausa", "placa", "Pausa comercial", {titulo: "YA VOLVEMOS", sub: "COMPLETOS MOJADOS", fondo: "programa"});

  /* bloque 2 */
  E("trans-bloque2", "transicion", "INTRO_BLOQUE_2 «Seguimos completamente mojados»", {escena: "bloque2"}, {fav: true});
  E("fondo-bloque2", "fondo", "Fondo bloque 2 (vino)", {tipo: "vino"});
  E("reto", "pregunta", "El desafío: ¿cuánto saben los talquinos?", {etiqueta: "EL DESAFÍO", pregunta: "¿CUÁNTO SABEN LOS TALQUINOS DE LA REGIÓN DEL MAULE?", opciones: [], color: "ketchup"});
  E("telefono", "telefono", "Concurso telefónico", {titulo: "CONCURSO EN VIVO", numero: "PENDIENTE_NUMERO_TELEFONICO", instruccion: "Llama al número en pantalla y concursa", premio: "2 mechadas de Mary Mechadas", mostrarCupos: false}, {pend: {numero: "PENDIENTE_NUMERO_TELEFONICO"}, vinc: {numero: "telefono"}, fav: true});
  E("discusion", "pregunta", "Desde el mesón: ¿y tú, cuánto sabes?", {etiqueta: "DESDE EL MESÓN", pregunta: "¿Y TÚ, CUÁNTO SABES DE TALCA?", opciones: [], color: "azul"});
  VID("vtr-concurso", "VTR concurso (50 s)", "PENDIENTE_VTR_CONCURSO");
  E("pregunta-comunas", "pregunta", "Pregunta: ¿cuántas comunas?", {etiqueta: "PREGUNTA", pregunta: "¿CUÁNTAS COMUNAS HAY EN LA REGIÓN?", opciones: [], color: "ketchup"});
  E("anuncio-concurso", "etiqueta", "¡Concurso en vivo!", {texto: "¡CONCURSO EN VIVO!", color: "#D7141A", anim: "rebote", y: 280});
  E("mencion-rayo", "mencion", "Mención Rayo Maulino Energy", {marca: "RAYO MAULINO ENERGY", logo: "", texto: "SIENTE LA FUERZA DE NUESTRA TIERRA", color: "ketchup",
    puntos: ["Cafeína natural", "Extracto de frutos silvestres", "Cero bajón"], delivery: false}, {pend: {logo: "PENDIENTE_LOGO_RAYO_MAULINO"}});
  E("gc-rayo", "gcPersona", "GC marca Rayo Maulino Energy", {etiqueta: "MENCIÓN", nombre: "Rayo Maulino Energy", cargo: "Abre una lata bien helada", colorEtq: "rojo"});
  E("gc-conductor-catador", "gcPersona", "GC conductor (catador)", {etiqueta: "CONDUCTOR", nombre: "PENDIENTE_NOMBRE_CONDUCTOR", cargo: "Catador de completos, nivel senior", colorEtq: "rojo"}, {pend: {nombre: "PENDIENTE_NOMBRE_CONDUCTOR"}, vinc: {nombre: "conductor"}});
  E("completo-pina", "pregunta", "¿Completo con piña? Sí o no", {etiqueta: "¿QUÉ TAL SERÁ?", pregunta: "¿COMPLETO CON PIÑA?", opciones: ["SÍ", "NO"], color: "pina"});
  E("fondo-gala", "fondo", "Fondo de gala (cierre)", {tipo: "cierre", logo: true});
  E("gala-expectativa", "etiqueta", "¿Quieren saber quién es?", {texto: "¿QUIEREN SABER QUIÉN ES?", color: "#5B2A63", anim: "rebote", y: 280, escala: 80});
  E("trans-pina", "transicion", "TRANSICION_PIÑA_PAPÁ «¿Completo con piña?»", {escena: "pina_papa"}, {fav: true});
  VID("vtr-pina", "VTR Piña Papá (1:30)", "PENDIENTE_VTR_PINAPAPA");
  E("placa-pina", "placa", "Placa Piña Papá", {titulo: "PIÑA PAPÁ", sub: "DIRECTAMENTE DESDE CURICÓ", fondo: "tropical"});
  E("gc-pina", "gcPersona", "GC Carlos Piña (Piña Papá)", {etiqueta: "INVITADO", nombre: "Carlos Piña", cargo: "Vocalista de la banda El Piña Papa", colorEtq: "naranjo"}, {fav: true});
  E("pregunta-gente", "pregunta", "¿Cómo te gusta más el completo?", {etiqueta: "PIÑA PAPÁ", pregunta: "¿CÓMO TE GUSTA MÁS EL COMPLETO?", opciones: [], color: "pina"});
  E("trivia", "pregunta", "Trivia del completo", {etiqueta: "TRIVIA DEL COMPLETO", pregunta: "PENDIENTE_PREGUNTA_TRIVIA", opciones: [], modo: "completo", fondo: "programa", color: "ketchup"}, {pend: {pregunta: "PENDIENTE_PREGUNTA_TRIVIA"}});
  E("cronometro-trivia", "temporizador", "Contador opcional trivia (manual)", {segundos: 60, alTerminar: "nada"});
  E("cierre", "cierre", "CORTINA_CIERRE (pantalla final)");
  /* otros GC de referencia (no están en el libreto, quedan listos en la lista) */
  E("gc-felipe", "gcPersona", "GC Felipe Jiménez", {etiqueta: "INVITADO", nombre: "Felipe Jiménez", cargo: "Presentador", colorEtq: "naranjo"}, {fueraLibreto: true});

  /* ---------------- pasos (orden del libreto) ---------------- */
  var PASOS = [
    [1, "01", "Intro del programa", "15 s", "Música Mucha Lucha · cámara pluma, plano general picado 3/4 · juego de cámaras con el presentador", ["video-intro", "intro", "fondo-programa", "logo"]],
    [1, "02", "Bienvenida del conductor", "30 s", "«¡Muy buenos días a toda la Región del Maule!» · cortina Completos Mojados · cámara 1 fundido cámara 2", ["gc-conductor", "bienvenida", "logo", "cortina-cm"]],
    [1, "03", "Pase al noticiero cómico", "10 s", "«¡Adelante, el noticiero más largo del mundo!» · cortina entrada · música noticiero (serio) · cámara 3", ["trans-pase", "trans-noticiero", "intro-noticiero", "fondo-noticiero"]],
    [1, "04", "Presentación del noticiero", "10 s", "Situación urgente en Vara Gruesa · nota de Lindolfo Iturriano González · «¿qué, no hay nota?»", ["logo-noticiero", "gc-cond-noticiero", "urgente", "titulares", "gc-lindolfo", "fondo-noticiero"]],
    [1, "05", "Nota de Vara Gruesa", "45 s", "Nota en vivo, cámara en mano · el camarógrafo le pasa el micrófono al peatón · parada militar · imágenes de apoyo incoherentes o videos graciosos", ["trans-nota", "envivo-nota", "gc-sector", "gc-peaton", "apoyo-1", "apoyo-2"]],
    [1, "06", "Cierre del noticiero", "5 s", "(Nervioso) «Gracias por informarse con nosotros, nos vemos mañana» · cortina salida · música Día del Completo", ["trans-cierre-noticiero", "trans-noticiero-corta"]],
    [1, "07", "Regreso al estudio", "1 min", "«Hoy aprendimos que para leer bien deben estudiar y comerse toda la comida» · transición programa · cámara 1 plano medio largo", ["trans-regreso", "fondo-programa", "gc-conductor"]],
    [1, "08", "Presentación de Juegos Mojados", "", "Conductor juega (¿emboque?) · desafíos en las calles · emboque, tarros y envase de mayonesa · «¡que comiencen los juegos mojados!»", ["placa-juegos", "juego-emboque", "juego-tarros", "juego-mayonesa", "cortina-programa"]],
    [1, "09", "VTR Juegos Mojados", "3 min", "Cortina programa · música «Oh Ma Ma Mia»", ["trans-vtr01", "vtr-juegos", "gc-participante", "marcador-juegos"]],
    [1, "10", "Presentación de personajes del Maule", "15 s", "Cortina Completos Mojados · «Hay historias que valen la pena conocer»", ["cortina-cm", "placa-personajes"]],
    [1, "11", "Talquinos: Guido Goossens", "2 min", "Personaje de la ciudad de Talca", ["placa-talquinos", "gc-guido"]],
    [1, "12", "VTR personaje 1", "2:15", "Luego cortina Completos Mojados", ["trans-vtr02", "vtr-p1", "cortina-cm"]],
    [1, "13", "Mención 1: Mary Mechadas", "30 s", "Música menciones · «gráficas en pantalla del logo» · abre el pan · pídalo por delivery · el conductor come el sándwich · luego cortina programa", ["mencion-mary", "gc-mary", "cortina-programa"]],
    [1, "14", "Segunda presentación de personajes", "15 s", "«Vamos con una historia más» · cámara 3 sigue al conductor", ["placa-personajes", "gc-conductor"]],
    [1, "15", "Segundo personaje de Talca", "2 min + VTR 2:15", "Talquinos: personaje por confirmar", ["placa-p2", "gc-p2", "trans-vtr03", "vtr-p2"]],
    [1, "16", "Regreso al estudio", "15 s", "«Tremendas historias y tremendos personajes» · «en breves momentos volvemos con una gran sorpresa» · cámara pluma", ["gc-conductor", "sorpresa", "cortina-cm"]],
    [1, "17", "Videoclip de Piña Papá", "", "Videoclip · GC «UN GRAN ARTISTA»", ["videoclip", "gc-gran-artista"]],
    [1, "18", "Comerciales", "3 min", "Pausa comercial", ["pausa"]],
    [2, "19", "Apertura del bloque 2", "1 min", "«Estamos de vuelta» · «¿Cuánto saben los talquinos de la Región del Maule?» · llamar al número en pantalla por 2 mechadas de Mary Mechadas", ["trans-bloque2", "fondo-bloque2", "gc-conductor", "reto", "telefono"]],
    [2, "20", "Interacción con el noticiero", "", "Desde el mesón: «¿Y tú, cuánto sabes de Talca?» · falsa discusión · el conductor da el pie a la nota", ["logo-noticiero", "discusion", "cortina-programa"]],
    [2, "21", "VTR del concurso", "50 s", "«¿Cuántas comunas hay en la región?» · luego cortina programa", ["trans-vtr2", "vtr-concurso", "pregunta-comunas", "cortina-programa"]],
    [2, "22", "Vuelta al estudio", "10 s", "«Qué bien que la ciudadanía sepa mucho más que solo comer completos. ¿Tenemos llamado ya?»", ["gc-conductor", "anuncio-concurso"]],
    [2, "23", "Concurso telefónico en estudio", "1 min", "Se eligen 5 personas para el llamado · premio: 2 mechadas de Mary Mechadas", ["telefono", "pregunta-comunas"]],
    [2, "24", "Mención 2: Rayo Maulino Energy", "30 s", "Cortina programa · música mención · abre y toma · «cafeína natural, extracto de frutos silvestres y cero bajón»", ["cortina-programa", "mencion-rayo", "gc-rayo"]],
    [2, "25", "Previa a la llegada de Piña Papá", "1 min", "«Me considero un catador de completos, nivel senior» · completo con piña: «¿exótico, sí o no?»", ["gc-conductor-catador", "completo-pina"]],
    [2, "26", "Presentación de gala del invitado", "", "Música de gala · «se viste de gala para recibir a nuestro invitado» · música de tensión · «¿Quieren saber quién es?»", ["fondo-gala", "gala-expectativa", "trans-pina"]],
    [2, "27", "VTR Piña Papá", "1:30", "Nota del invitado", ["vtr-pina", "trans-vtr3"]],
    [2, "28", "Entrada de Piña Papá al estudio", "1 min", "«Máximo exponente de la cumbia y el sabor tropical, directamente desde Curicó» · «¿Cómo te gusta más el completo?»", ["placa-pina", "gc-pina", "pregunta-gente"]],
    [2, "29", "Trivia del completo", "1 min", "Cortina programa · trivia del completo", ["cortina-programa", "trivia", "cronometro-trivia"]],
    [2, "30", "Entrevista a Piña Papá", "5 min", "«Completito para los invitados y vámonos a la entrevista»", ["gc-conductor", "gc-pina"]],
    [2, "31", "Intervención de Piña Papá", "2 min", "Presentación musical en el estudio", ["gc-pina"]],
    [2, "32", "Cortina de cierre", "10 s", "Fin del programa · la salida queda limpia", ["cortina-programa", "cierre"]]
  ];

  CG.LIBRETO = {
    version: V, titulo: "LIBRETO PROGRAMA V.2",
    pasos: function () { return PASOS.map(function (p) { return {id: "p" + p[1], bloque: p[0], n: p[1], titulo: p[2], dur: p[3], ref: p[4], items: p[5].map(function (x) { return "lb-" + x; })}; }); },
    elementos: function () { return JSON.parse(JSON.stringify(EL)); }
  };

  /* Agrega la escaleta a un estado (sala nueva o existente) sin borrar nada de lo que ya había. */
  CG.sembrarLibreto = function (e, forzarOrden) {
    var nuevos = 0;
    CG.LIBRETO.elementos().forEach(function (x) { if (!e.elementos.some(function (y) { return y.id === x.id; })) { e.elementos.push(x); nuevos++; } });
    if (!e.escaleta || forzarOrden || (e.escaleta.v || 0) < V) {
      nuevos++;
      e.escaleta = {v: V, origen: CG.LIBRETO.titulo, modificada: false, pasos: CG.LIBRETO.pasos()};
      if (!e.paso) { e.paso = "p01"; }
    }
    e.datosPrograma = e.datosPrograma || {conductor: "", conductorNoticiero: "", telefono: ""};
    return nuevos;
  };

  /* recursos pendientes de un elemento: campos con PENDIENTE_ o vacíos que el libreto requiere */
  CG.pendientesDe = function (e) {
    var r = [], d = e.datos || {};
    Object.keys(e.pend || {}).forEach(function (k) {
      var v = d[k]; if (v == null || v === "" || CG.esPendiente(v) || (Array.isArray(v) && !v.length)) { r.push(e.pend[k]); }
    });
    Object.keys(d).forEach(function (k) { if (CG.esPendiente(d[k]) && r.indexOf(d[k]) < 0 && !(e.pend && e.pend[k])) { r.push(String(d[k]).trim()); } });
    return r;
  };
})();
