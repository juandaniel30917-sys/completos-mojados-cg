/* COMPLETOS MOJADOS · CG — catálogo de plantillas.
   Lo usan el panel (campos editables) y la salida (dibujo y animación).
   Cada plantilla: nombre, categoría, campos, valores por defecto y cómo se dibuja. */
(function () {
  "use strict";
  var CG = window.CG = window.CG || {};
  var esc = CG.esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]; }); };

  /* paletas rápidas para los selectores de color */
  CG.PALETA = ["#FFFFFF", "#0A0A0A", "#EEF2F8", "#FFA500", "#FF0000", "#1E9BF0", "#8A7D5E", "#FFE100", "#FF8A00", "#00AEFF", "#E02A12", "#F59A23", "#6AA832", "#D90429", "#0B3C8C", "#5B2A63", "#C79BB0", "#FFF3D6"];

  CG.CATEGORIAS = [
    {id: "cintillos", nombre: "Cintillos", icono: "barra", ayuda: "Barras con mensajes abajo de la pantalla"},
    {id: "nombres", nombre: "Nombres y cargos", icono: "persona", ayuda: "GC para presentar personas o noticias"},
    {id: "concurso", nombre: "Concurso", icono: "trofeo", ayuda: "Participante y temporizador"},
    {id: "titulos", nombre: "Títulos", icono: "titulo", ayuda: "Etiquetas y placas grandes"},
    {id: "logos", nombre: "Logo y en vivo", icono: "logo", ayuda: "Mosca, EN VIVO y hora"},
    {id: "fondos", nombre: "Fondos", icono: "capas", ayuda: "Fondo animado del programa"},
    {id: "videos", nombre: "Videos", icono: "video", ayuda: "Tus videos con fondo verde o transparente"},
    {id: "avisos", nombre: "Avisos", icono: "campana", ayuda: "Notificaciones que aparecen y se van solas"},
    {id: "transiciones", nombre: "Transiciones", icono: "rayo", ayuda: "Cortinas para tapar un cambio de cámara"}
  ];

  var POS = function (x, y) { return [{k: "x", l: "Posición horizontal", t: "range", min: 0, max: 1920, step: 2, u: "px", g: "Posición", d: x}, {k: "y", l: "Posición vertical", t: "range", min: 0, max: 1080, step: 2, u: "px", g: "Posición", d: y}]; };
  var ESCALA = {k: "escala", l: "Tamaño", t: "range", min: 40, max: 200, step: 1, u: "%", g: "Posición"};
  var ANIM = {k: "anim", l: "Animación de entrada", t: "seg", g: "Estilo", o: [["deslizar", "Deslizar"], ["fundido", "Fundido"], ["mascara", "Máscara"], ["rebote", "Rebote"]]};

  /* silueta por defecto de la foto del participante */
  var SILUETA = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 330 330"><rect width="330" height="330" fill="#fff"/><path d="M165 40c38 0 62 26 62 66 0 24-8 40-14 56-4 11 1 18 9 22l70 30c16 8 22 26 24 56v60H22v-60c2-30 8-48 24-56l70-30c8-4 13-11 9-22-6-16-14-32-14-56 0-40 24-66 54-66z" fill="#000"/></svg>');

  function estiloPos(d, origen) { return "left:" + (+d.x || 0) + "px;top:" + (+d.y || 0) + "px;transform-origin:" + (origen || "0 0") + ";--esc:" + ((+d.escala || 100) / 100); }
  function logoSrc(ctx, propio) { return propio || (ctx && ctx.logo) || ((ctx && ctx.base) || "") + "assets/logo.png"; }

  var P = CG.PLANTILLAS = {};

  /* ===================== CINTILLOS ===================== */
  P.barraConcurso = {
    nombre: "Barra concurso", cat: "cintillos", icono: "barra", capa: 40, salidaMs: 900,
    desc: "Barra blanca con logo y mensajes que van cambiando (como tu GC de las mechadas).",
    campos: [
      {k: "mensajes", l: "Mensajes (rotan solos)", t: "lista", g: "Texto", nuevo: {a: "NUEVO MENSAJE", ca: "#FFA500", b: "", cb: "#FF0000"},
        campos: [{k: "a", l: "Texto 1", t: "text"}, {k: "ca", l: "Color 1", t: "color"}, {k: "b", l: "Texto 2", t: "text"}, {k: "cb", l: "Color 2", t: "color"}]},
      {k: "intervalo", l: "Cambiar cada", t: "range", min: 2, max: 20, step: 0.5, u: "s", g: "Texto"},
      {k: "fondo", l: "Color de la barra", t: "color", g: "Estilo"},
      {k: "logo", l: "Mostrar logo", t: "toggle", g: "Estilo"},
      {k: "tamTexto", l: "Tamaño del texto", t: "range", min: 40, max: 110, step: 1, u: "px", g: "Estilo"},
      {k: "y", l: "Altura en pantalla", t: "range", min: 0, max: 1000, step: 2, u: "px", g: "Posición"},
      {k: "alto", l: "Grosor de la barra", t: "range", min: 100, max: 300, step: 2, u: "px", g: "Posición"}
    ],
    defaults: {mensajes: [{a: "CONCURSA POR", ca: "#FFA500", b: "2 MECHADAS!", cb: "#FF0000"}, {a: "LLAMA AQUÍ:", ca: "#1E9BF0", b: "+569 71091849", cb: "#8A7D5E"}], intervalo: 5, fondo: "#EEF2F8", logo: true, tamTexto: 78, y: 798, alto: 194},
    render: function (d, ctx) {
      var ms = (d.mensajes || []).filter(function (m) { return (m.a || m.b); });
      return '<div class="bc" style="top:' + d.y + 'px;height:' + d.alto + 'px;--fondo:' + esc(d.fondo) + ';--tam:' + d.tamTexto + 'px">' +
        '<div class="bc-barra"></div>' +
        (d.logo ? '<img class="bc-logo" alt="" src="' + esc(logoSrc(ctx)) + '" style="height:' + Math.round(d.alto * 1.18) + 'px">' : '') +
        '<div class="bc-txt" style="left:' + (d.logo ? Math.round(d.alto * 1.88) : 90) + 'px">' +
        ms.map(function (m, i) { return '<div class="bc-msg' + (i === 0 ? " on" : "") + '"><span style="color:' + esc(m.ca) + '">' + esc(m.a) + '</span>' + (m.b ? ' <span style="color:' + esc(m.cb) + '">' + esc(m.b) + '</span>' : '') + '</div>'; }).join("") +
        '</div></div>';
    },
    montar: function (el, d) {
      var msgs = el.querySelectorAll(".bc-msg"), i = 0, t = null;
      if (msgs.length > 1) {
        t = setInterval(function () {
          var a = msgs[i]; i = (i + 1) % msgs.length; var b = msgs[i];
          a.classList.remove("on"); a.classList.add("fuera"); b.classList.remove("fuera"); b.classList.add("on");
          setTimeout(function () { a.classList.remove("fuera"); }, 700);
        }, Math.max(1500, (+d.intervalo || 5) * 1000));
      }
      return {destruir: function () { clearInterval(t); }};
    }
  };

  P.zocalo = {
    nombre: "Zócalo (texto en movimiento)", cat: "cintillos", icono: "ticker", capa: 45, salidaMs: 600,
    desc: "Franja inferior con mensajes que pasan de derecha a izquierda.",
    campos: [
      {k: "etiqueta", l: "Etiqueta", t: "text", g: "Texto"},
      {k: "items", l: "Mensajes (uno por línea)", t: "lineas", g: "Texto"},
      {k: "velocidad", l: "Velocidad", t: "range", min: 40, max: 320, step: 10, g: "Texto"},
      {k: "colorEtq", l: "Color etiqueta", t: "color", g: "Estilo"},
      {k: "colorFondo", l: "Color franja", t: "color", g: "Estilo"},
      {k: "colorTexto", l: "Color texto", t: "color", g: "Estilo"}
    ],
    defaults: {etiqueta: "COMPLETOS MOJADOS", items: ["TALCA · MAULE · COMPLETOS MOJADOS", "SÍGUENOS EN REDES @COMPLETOSMOJADOS", "EL PROGRAMA MÁS GRANDE DE CHILE"], velocidad: 140, colorEtq: "#D90429", colorFondo: "#0A0A0A", colorTexto: "#FFFFFF"},
    render: function (d) {
      var uno = (d.items || []).filter(Boolean).map(function (s) { return '<span class="zc-it"><i class="zc-gota"></i>' + esc(s) + '</span>'; }).join("");
      return '<div class="zc" style="--etq:' + esc(d.colorEtq) + ';--fondo:' + esc(d.colorFondo) + ';--tx:' + esc(d.colorTexto) + '">' +
        (d.etiqueta ? '<div class="zc-etq"><span>' + esc(d.etiqueta) + '</span></div>' : '') + '<div class="zc-via"><div class="zc-tira" data-uno="1">' + uno + '</div></div></div>';
    },
    montar: function (el, d) {
      var tira = el.querySelector(".zc-tira"), via = el.querySelector(".zc-via"), x = 0, w = 0, raf, ult = 0, v = +d.velocidad || 140;
      function medir() { var h = tira.innerHTML; tira.innerHTML = h; w = tira.scrollWidth; var veces = Math.max(2, Math.ceil((via.clientWidth || 1500) / Math.max(w, 1)) + 1), s = ""; for (var i = 0; i < veces; i++) { s += h; } tira.innerHTML = s; }
      medir();
      function paso(t) { var dt = ult ? Math.min(0.1, (t - ult) / 1000) : 0; ult = t; if (w > 0) { x -= v * dt * (CG.velocidad || 1); if (-x >= w) { x += w; } tira.style.transform = "translate3d(" + x.toFixed(1) + "px,0,0)"; } raf = requestAnimationFrame(paso); }
      raf = requestAnimationFrame(paso);
      return {destruir: function () { cancelAnimationFrame(raf); }};
    }
  };

  /* ===================== NOMBRES Y CARGOS ===================== */
  P.gcNoticiero = {
    nombre: "GC Noticiero", cat: "nombres", icono: "persona", capa: 50, salidaMs: 700,
    desc: "Pestaña de color, titular grande y bajada (estilo Noticiero Mojado).",
    campos: [
      {k: "tab", l: "Pestaña", t: "text", g: "Texto"}, {k: "titular", l: "Titular / nombre", t: "text", g: "Texto"},
      {k: "bajada", l: "Bajada / cargo", t: "text", g: "Texto"}, {k: "lugar", l: "Lugar (opcional)", t: "text", g: "Texto"},
      {k: "color", l: "Color de la pestaña", t: "color", g: "Estilo"}, {k: "colorTab", l: "Color texto pestaña", t: "color", g: "Estilo"},
      {k: "punto", l: "Punto parpadeante", t: "toggle", g: "Estilo"},
      {k: "subir", l: "Subir (si hay cintillo abajo)", t: "range", min: 0, max: 400, step: 2, u: "px", g: "Posición"}
    ],
    defaults: {tab: "ÚLTIMA HORA", titular: "SE DERRAMÓ LA MAYONESA EN TALCA", bajada: "Vecinos reportan salsas fuera de control en pleno centro", lugar: "", color: "#D90429", colorTab: "#FFFFFF", punto: false, subir: 0},
    render: function (d) {
      return '<div class="gn" style="bottom:' + (+d.subir || 0) + 'px;--c:' + esc(d.color) + ';--ct:' + esc(d.colorTab) + '">' +
        '<div class="gn-tab">' + (d.punto ? '<i class="gn-punto"></i>' : '') + '<span class="tx">' + esc(d.tab) + '</span>' + (d.lugar ? '<i class="gn-sep"></i><span class="tx gn-lugar">' + esc(d.lugar) + '</span>' : '') + '</div>' +
        '<div class="gn-barra"><span class="tx gn-tit" data-fit="1640">' + esc(d.titular) + '</span></div><div class="gn-filete"></div>' +
        (d.bajada ? '<div class="gn-baj"><span class="tx" data-fit="1640">' + esc(d.bajada) + '</span></div>' : '') + '</div>';
    }
  };

  P.gcPrograma = {
    nombre: "GC Programa (cinta)", cat: "nombres", icono: "persona", capa: 50, salidaMs: 600,
    desc: "Cinta grande con letra Impact y goteo de salsa, para invitados.",
    campos: [
      {k: "etiqueta", l: "Etiqueta", t: "text", g: "Texto"}, {k: "nombre", l: "Nombre", t: "text", g: "Texto"}, {k: "cargo", l: "Cargo / descripción", t: "text", g: "Texto"},
      {k: "color", l: "Color de la cinta", t: "color", g: "Estilo"}, {k: "colorEtq", l: "Color etiqueta", t: "color", g: "Estilo"}
    ].concat(POS(60, 640), [ESCALA]),
    defaults: {etiqueta: "INVITADO", nombre: "NOMBRE APELLIDO", cargo: "Cargo o descripción del invitado", color: "#E02A12", colorEtq: "#F59A23", x: 60, y: 640, escala: 100},
    render: function (d) {
      return '<div class="gp" style="' + estiloPos(d, "0 100%") + ';--c:' + esc(d.color) + ';--ce:' + esc(d.colorEtq) + '">' +
        (d.etiqueta ? '<span class="gp-etq">' + esc(d.etiqueta) + '</span><br>' : '') +
        '<div class="gp-cinta"><span class="gp-t" data-fit="1600">' + esc(d.nombre) + '</span><div class="gp-gotas"><i></i><i></i><i></i><i></i></div></div>' +
        (d.cargo ? '<span class="gp-sub" data-fit="1400">' + esc(d.cargo) + '</span>' : '') + '</div>';
    }
  };

  /* ===================== CONCURSO ===================== */
  P.participante = {
    nombre: "Participante", cat: "concurso", icono: "persona", capa: 55, salidaMs: 600,
    desc: "Recuadro amarillo con foto, cinta «JUGANDO» y nombre.",
    campos: [
      {k: "titulo", l: "Cinta superior", t: "text", g: "Texto"}, {k: "nombre", l: "Nombre", t: "text", g: "Texto"},
      {k: "foto", l: "Foto", t: "imagen", g: "Texto"},
      {k: "colorCinta", l: "Color cinta", t: "color", g: "Estilo"}, {k: "colorMarco", l: "Color marco", t: "color", g: "Estilo"}
    ].concat(POS(1160, 158), [ESCALA]),
    defaults: {titulo: "JUGANDO", nombre: "Participante", foto: "", colorCinta: "#FF8A00", colorMarco: "#FFE100", x: 1160, y: 158, escala: 100},
    render: function (d) {
      return '<div class="pt" style="' + estiloPos(d, "50% 0") + ';--cc:' + esc(d.colorCinta) + ';--cm:' + esc(d.colorMarco) + '">' +
        '<div class="pt-cinta"><span data-fit="440">' + esc(d.titulo) + '</span></div>' +
        '<div class="pt-marco"><div class="pt-foto" style="background-image:url(\'' + esc(d.foto || SILUETA) + '\')"></div><span class="pt-nom" data-fit="370">' + esc(d.nombre) + '</span></div></div>';
    }
  };

  P.temporizador = {
    nombre: "Temporizador", cat: "concurso", icono: "reloj", capa: 56, salidaMs: 500, reloj: true,
    desc: "Cuenta regresiva en un círculo. Inicia, pausa y reinicia en vivo.",
    campos: [
      {k: "segundos", l: "Duración", t: "range", min: 3, max: 600, step: 1, u: "s", g: "Texto"},
      {k: "alTerminar", l: "Al llegar a cero", t: "seg", g: "Texto", o: [["parpadear", "Parpadear"], ["ocultar", "Ocultar"], ["nada", "Nada"]]},
      {k: "color", l: "Color", t: "color", g: "Estilo"}, {k: "colorFin", l: "Color al final", t: "color", g: "Estilo"}
    ].concat(POS(80, 84), [ESCALA]),
    defaults: {segundos: 10, alTerminar: "parpadear", color: "#00AEFF", colorFin: "#E02A12", x: 80, y: 84, escala: 100, run: {estado: "detenido", restante: 10, marca: 0}},
    render: function (d) {
      return '<div class="tm" style="' + estiloPos(d, "50% 50%") + ';--c:' + esc(d.color) + ';--cf:' + esc(d.colorFin) + '"><span class="tm-n">00:00</span></div>';
    },
    montar: function (el, d, ctx) {
      var n = el.querySelector(".tm-n"), caja = el.querySelector(".tm"), t;
      function fmt(s) { s = Math.max(0, Math.ceil(s)); return (s < 600 ? "0" : "") + Math.floor(s / 60) + ":" + ((s % 60) < 10 ? "0" : "") + (s % 60); }
      function tick() {
        var r = CG.restante(d), fin = r <= 0 && d.run && d.run.estado === "corriendo";
        n.textContent = fmt(r);
        caja.classList.toggle("fin", fin); caja.classList.toggle("parp", fin && d.alTerminar === "parpadear");
        caja.classList.toggle("ultimos", r > 0 && r <= 3 && d.run && d.run.estado === "corriendo");
        if (fin && d.alTerminar === "ocultar" && ctx && ctx.ocultarme) { ctx.ocultarme(); }
      }
      tick(); t = setInterval(tick, 100);
      return {destruir: function () { clearInterval(t); }, actualizar: function (nd) { d = nd; tick(); }};
    }
  };
  /* tiempo restante usando la hora LOCAL en que se recibió la orden (evita desfases de reloj entre equipos) */
  var recibido = {};
  CG.restante = function (d) {
    var r = d.run || {estado: "detenido", restante: d.segundos};
    if (r.estado !== "corriendo") { return r.estado === "detenido" ? (+d.segundos || 0) : (+r.restante || 0); }
    var k = r.marca + ":" + r.restante; if (!recibido[k]) { recibido[k] = Date.now(); }
    return (+r.restante || 0) - (Date.now() - recibido[k]) / 1000;
  };

  /* ===================== TÍTULOS ===================== */
  P.etiqueta = {
    nombre: "Etiqueta (sticker)", cat: "titulos", icono: "titulo", capa: 60, salidaMs: 500,
    desc: "Rótulo inclinado tipo «NOTICIERO MOJADO» con borde y sombra.",
    campos: [{k: "texto", l: "Texto", t: "text", g: "Texto"}, {k: "color", l: "Color", t: "color", g: "Estilo"}, {k: "colorTexto", l: "Color texto", t: "color", g: "Estilo"},
      {k: "rot", l: "Inclinación", t: "range", min: -15, max: 15, step: 0.5, u: "°", g: "Estilo"}, ANIM].concat(POS(960, 300), [ESCALA]),
    defaults: {texto: "NOTICIERO MOJADO", color: "#D7141A", colorTexto: "#FFFFFF", rot: -2, anim: "rebote", x: 960, y: 300, escala: 100},
    render: function (d) {
      return '<div class="et a-' + esc(d.anim) + '" style="' + estiloPos(d, "50% 50%") + ';--c:' + esc(d.color) + ';--ct:' + esc(d.colorTexto) + ';--rot:' + (+d.rot || 0) + 'deg"><span class="imp">' + esc(d.texto) + '</span></div>';
    }
  };

  P.placa = {
    nombre: "Placa pantalla completa", cat: "titulos", icono: "monitor", capa: 20, salidaMs: 500,
    desc: "Pantalla completa con fondo animado y título grande (VOLVEMOS, VTR, etc.).",
    campos: [{k: "titulo", l: "Título", t: "text", g: "Texto"}, {k: "sub", l: "Subtítulo", t: "text", g: "Texto"},
      {k: "fondo", l: "Fondo", t: "seg", g: "Estilo", o: [["programa", "Programa"], ["noticiero", "Noticiero"], ["bloque2", "Bloque 2"], ["cierre", "Cierre"], ["tropical", "Tropical"], ["verde", "Verde"]]},
      {k: "rec", l: "Mostrar ● REC", t: "toggle", g: "Estilo"}],
    defaults: {titulo: "VOLVEMOS", sub: "A COMPLETOS MOJADOS", fondo: "programa", rec: false},
    render: function (d, ctx) {
      return '<div class="pl">' + CG.fondoHTML(d.fondo, {}, false, ctx) + '<div class="pl-cont"><div class="pl-tit imp ol" data-fit="1700">' + esc(d.titulo) + '</div>' + (d.sub ? '<div class="pl-sub">' + esc(d.sub) + '</div>' : '') + '</div>' + (d.rec ? '<div class="pl-rec imp"><i></i>REC</div>' : '') + '</div>';
    }
  };

  /* ===================== LOGOS ===================== */
  P.mosca = {
    nombre: "Logo en la esquina", cat: "logos", icono: "logo", capa: 80, salidaMs: 500,
    desc: "Tu logo pequeño en una esquina (mosca).",
    campos: [{k: "esquina", l: "Esquina", t: "seg", g: "Posición", o: [["si", "↖"], ["sd", "↗"], ["ii", "↙"], ["id", "↘"]]},
      {k: "tam", l: "Tamaño", t: "range", min: 80, max: 400, step: 2, u: "px", g: "Posición"}, {k: "margen", l: "Margen", t: "range", min: 10, max: 160, step: 2, u: "px", g: "Posición"},
      {k: "imagen", l: "Imagen (vacío = logo del programa)", t: "imagen", g: "Estilo"}],
    defaults: {esquina: "sd", tam: 170, margen: 50, imagen: ""},
    render: function (d, ctx) {
      var m = +d.margen || 50, pos = {si: "left:" + m + "px;top:" + m + "px", sd: "right:" + m + "px;top:" + m + "px", ii: "left:" + m + "px;bottom:" + m + "px", id: "right:" + m + "px;bottom:" + m + "px"}[d.esquina] || "";
      return '<div class="mo" style="' + pos + '"><img alt="" src="' + esc(logoSrc(ctx, d.imagen)) + '" style="width:' + d.tam + 'px"></div>';
    }
  };

  P.enVivo = {
    nombre: "EN VIVO + hora", cat: "logos", icono: "punto", capa: 81, salidaMs: 500,
    desc: "Etiqueta roja EN VIVO con punto que parpadea y la hora.",
    campos: [{k: "texto", l: "Texto", t: "text", g: "Texto"}, {k: "reloj", l: "Mostrar hora", t: "toggle", g: "Texto"}, {k: "ciudad", l: "Ciudad (opcional)", t: "text", g: "Texto"},
      {k: "color", l: "Color", t: "color", g: "Estilo"}, {k: "esquina", l: "Esquina", t: "seg", g: "Posición", o: [["si", "Arriba izq."], ["sd", "Arriba der."]]}],
    defaults: {texto: "EN VIVO", reloj: true, ciudad: "TALCA", color: "#E01E2B", esquina: "si"},
    render: function (d) {
      return '<div class="ev ' + esc(d.esquina) + '" style="--c:' + esc(d.color) + '"><div class="ev-tag"><span>' + esc(d.texto) + '</span></div>' +
        (d.reloj ? '<div class="ev-hora"><span class="ev-h">00:00</span>' + (d.ciudad ? ' <small>' + esc(d.ciudad) + '</small>' : '') + '</div>' : '') + '</div>';
    },
    montar: function (el) {
      var h = el.querySelector(".ev-h"), t;
      function tick() { if (!h) { return; } var d = new Date(); h.textContent = (d.getHours() < 10 ? "0" : "") + d.getHours() + ":" + (d.getMinutes() < 10 ? "0" : "") + d.getMinutes(); }
      tick(); t = setInterval(tick, 1000);
      return {destruir: function () { clearInterval(t); }};
    }
  };

  /* ===================== FONDOS ===================== */
  P.fondo = {
    nombre: "Fondo del programa", cat: "fondos", icono: "capas", capa: 5, salidaMs: 700,
    desc: "Fondo animado con rayos, cordillera, salsa y logo al centro.",
    campos: [{k: "tipo", l: "Estilo", t: "seg", g: "Estilo", o: [["programa", "Programa"], ["noticiero", "Noticiero"], ["bloque2", "Bloque 2"], ["cierre", "Cierre"], ["tropical", "Tropical"], ["verde", "Verde"]]},
      {k: "logo", l: "Logo al centro", t: "toggle", g: "Estilo"}, {k: "maule", l: "Texto MAULE", t: "toggle", g: "Estilo"}, {k: "cordillera", l: "Cordillera", t: "toggle", g: "Estilo"},
      {k: "gotas", l: "Gotas", t: "toggle", g: "Estilo"}, {k: "salsa", l: "Salsa abajo", t: "toggle", g: "Estilo"}, {k: "texto", l: "Texto bajo el logo", t: "text", g: "Texto"}],
    defaults: {tipo: "programa", logo: true, maule: true, cordillera: true, gotas: true, salsa: true, texto: "TALCA · REGIÓN DEL MAULE"},
    render: function (d, ctx) { return '<div class="fo">' + CG.fondoHTML(d.tipo, d, true, ctx) + '</div>'; }
  };

  /* ===================== VIDEOS ===================== */
  P.video = {
    nombre: "Video", cat: "videos", icono: "video", capa: 30, salidaMs: 600, video: true,
    desc: "Un video de tu biblioteca: transparente (WebM con alfa) o con fondo verde (chroma).",
    campos: [
      {k: "media", l: "Video", t: "media", g: "Video"},
      {k: "modo", l: "Transparencia", t: "seg", g: "Video", o: [["chroma", "Quitar verde"], ["alfa", "Ya es transparente"], ["normal", "Sin transparencia"]],
        ayuda: "MP4 nunca trae transparencia: si tiene fondo verde usa «Quitar verde». WebM VP9 con alfa usa «Ya es transparente»."},
      {k: "keyColor", l: "Color a quitar", t: "color", g: "Chroma", si: "modo=chroma"},
      {k: "similitud", l: "Similitud", t: "range", min: 1, max: 100, step: 1, g: "Chroma", si: "modo=chroma", ayuda: "Sube si queda verde; baja si se borra la persona."},
      {k: "suavizado", l: "Suavizar bordes", t: "range", min: 1, max: 100, step: 1, g: "Chroma", si: "modo=chroma"},
      {k: "derrame", l: "Quitar reflejo verde", t: "range", min: 1, max: 100, step: 1, g: "Chroma", si: "modo=chroma"},
      {k: "bucle", l: "Repetir en bucle", t: "toggle", g: "Reproducción"},
      {k: "ocultarAlFinal", l: "Ocultar al terminar", t: "toggle", g: "Reproducción", si: "bucle=false"},
      {k: "audio", l: "Con sonido", t: "toggle", g: "Reproducción", ayuda: "Desactivado por defecto. En OBS activa «Controlar audio vía OBS» si lo usas."},
      {k: "volumen", l: "Volumen", t: "range", min: 0, max: 100, step: 1, u: "%", g: "Reproducción", si: "audio=true"},
      {k: "entrada", l: "Entrada", t: "seg", g: "Animación", o: [["corte", "Corte"], ["fundido", "Fundido"], ["deslizar", "Deslizar"], ["mascara", "Máscara"], ["escala", "Escala"]]},
      {k: "salida", l: "Salida", t: "seg", g: "Animación", o: [["corte", "Corte"], ["fundido", "Fundido"], ["deslizar", "Deslizar"], ["mascara", "Máscara"], ["escala", "Escala"]]},
      {k: "ajuste", l: "Encuadre", t: "seg", g: "Posición", o: [["completo", "Pantalla completa"], ["libre", "Libre"]]},
      {k: "x", l: "Centro horizontal", t: "range", min: 0, max: 1920, step: 2, u: "px", g: "Posición", si: "ajuste=libre"},
      {k: "y", l: "Centro vertical", t: "range", min: 0, max: 1080, step: 2, u: "px", g: "Posición", si: "ajuste=libre"},
      {k: "escala", l: "Tamaño", t: "range", min: 10, max: 200, step: 1, u: "%", g: "Posición", si: "ajuste=libre"}
    ],
    defaults: {media: "", modo: "chroma", keyColor: "#00FF00", similitud: 40, suavizado: 8, derrame: 10, bucle: false, ocultarAlFinal: true, audio: false, volumen: 80,
      entrada: "fundido", salida: "fundido", ajuste: "completo", x: 960, y: 540, escala: 50, cmd: null},
    render: function (d) {
      var libre = d.ajuste === "libre";
      return '<div class="vd e-' + esc(d.entrada) + ' s-' + esc(d.salida) + (libre ? " libre" : "") + '"' + (libre ? ' style="left:' + d.x + 'px;top:' + d.y + 'px;width:' + (1920 * d.escala / 100) + 'px;height:' + (1080 * d.escala / 100) + 'px"' : '') + '><div class="vd-in"></div><div class="vd-err"></div></div>';
    },
    montar: function (el, d, ctx) { return CG.montarVideo ? CG.montarVideo(el, d, ctx) : null; }
  };

  /* ===================== AVISOS (eventos de un disparo) ===================== */
  P.aviso = {
    nombre: "Aviso / notificación", cat: "avisos", icono: "campana", evento: true,
    desc: "Tarjeta que entra por la derecha y se va sola después de unos segundos.",
    campos: [{k: "tipo", l: "Tipo", t: "seg", g: "Texto", o: [["aviso", "Aviso"], ["saludo", "Saludo"], ["red", "Redes"], ["auspicio", "Auspicio"]]},
      {k: "titulo", l: "Título", t: "text", g: "Texto"}, {k: "texto", l: "Texto", t: "text", g: "Texto"},
      {k: "seg", l: "Duración", t: "range", min: 2, max: 30, step: 1, u: "s", g: "Texto"}],
    defaults: {tipo: "aviso", titulo: "¡ATENCIÓN!", texto: "Se viene el Noticiero Mojado", seg: 7}
  };

  /* ===================== TRANSICIONES (eventos) ===================== */
  P.cortina = {
    nombre: "Cortina de salsa", cat: "transiciones", icono: "rayo", evento: true,
    desc: "Bandas o círculos de ketchup, mayo y mostaza que cubren toda la pantalla un instante.",
    campos: [{k: "estilo", l: "Estilo", t: "seg", g: "Estilo", o: [["bandas", "Bandas"], ["iris", "Círculos"]]}],
    defaults: {estilo: "bandas"}
  };

  /* ===================== elementos iniciales de una sala ===================== */
  CG.nuevoId = function () { return "e" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); };
  CG.crearElemento = function (plantilla, extra) {
    var p = P[plantilla], el = {id: CG.nuevoId(), plantilla: plantilla, nombre: (extra && extra.nombre) || p.nombre, fav: false, on: false, datos: JSON.parse(JSON.stringify(p.defaults))};
    if (extra && extra.datos) { Object.assign(el.datos, extra.datos); }
    if (extra && extra.fav) { el.fav = true; }
    return el;
  };
  CG.estadoInicial = function () {
    var e = [
      CG.crearElemento("barraConcurso", {nombre: "Concurso mechadas", fav: true}),
      CG.crearElemento("participante", {nombre: "Participante jugando", fav: true}),
      CG.crearElemento("temporizador", {nombre: "Temporizador 10 s", fav: true}),
      CG.crearElemento("gcNoticiero", {nombre: "Última hora"}),
      CG.crearElemento("gcNoticiero", {nombre: "En el sector", datos: {tab: "EN EL SECTOR", color: "#0B3C8C", titular: "FILA INTERMINABLE POR UN COMPLETO MOJADO", bajada: "Nuestro reportero confirma que nadie se quiere ir", lugar: "CENTRO DE TALCA"}}),
      CG.crearElemento("gcPrograma", {nombre: "Invitado"}),
      CG.crearElemento("zocalo", {nombre: "Zócalo redes"}),
      CG.crearElemento("etiqueta", {nombre: "Etiqueta Noticiero Mojado"}),
      CG.crearElemento("placa", {nombre: "Placa VOLVEMOS"}),
      CG.crearElemento("placa", {nombre: "Placa VTR", datos: {titulo: "VTR", sub: "NOTA EN TERRENO", fondo: "noticiero", rec: true}}),
      CG.crearElemento("mosca", {nombre: "Logo esquina", fav: true}),
      CG.crearElemento("enVivo", {nombre: "EN VIVO"}),
      CG.crearElemento("fondo", {nombre: "Fondo programa"}),
      CG.crearElemento("aviso", {nombre: "Aviso noticiero"}),
      CG.crearElemento("aviso", {nombre: "Saludo a Talca", datos: {tipo: "saludo", titulo: "SALUDOS", texto: "A toda la gente de Talca que nos ve"}}),
      CG.crearElemento("cortina", {nombre: "Cortina bandas", fav: true}),
      CG.crearElemento("cortina", {nombre: "Cortina círculos", datos: {estilo: "iris"}})
    ];
    var media = [
      {id: "m-trans-not", nombre: "Transición Noticiero (8 s)", url: "assets/media/TRANSICION_NOTICIERO_05S.webm", tipo: "video/webm", modo: "alfa", dur: 8, incluido: true},
      {id: "m-trans-not2", nombre: "Transición Noticiero corta (5 s)", url: "assets/media/TRANSICION_NOTICIERO_05S_1.webm", tipo: "video/webm", modo: "alfa", dur: 5, incluido: true},
      {id: "m-vtr2", nombre: "Transición VTR 02", url: "assets/media/TRANSICION_VTR_02.webm", tipo: "video/webm", modo: "alfa", dur: 4, incluido: true},
      {id: "m-vtr3", nombre: "Transición VTR 03", url: "assets/media/TRANSICION_VTR_03.webm", tipo: "video/webm", modo: "alfa", dur: 8, incluido: true}
    ];
    media.forEach(function (m) { e.push(CG.crearElemento("video", {nombre: m.nombre, datos: {media: m.id, modo: "alfa"}})); });
    return {v: 2, elementos: e, biblioteca: media, ev: [], ajustes: {velocidad: 100}, logo: ""};
  };

  /* ===================== FONDO ANIMADO (compartido por Fondo y Placa) ===================== */
  var CORD = {programa: ["#6B4166", "#99668F"], bloque2: ["#C24A12", "#E9801F"], cierre: ["#4C1F4D", "#7E3462"], tropical: ["#1A7F4D", "#4DB34D"]};
  var GOTAS = {ketchup: "#E02A12", mostaza: "#F59A23", mayo: "#FFF3D6", palta: "#6AA832"};
  function onda(col, w) {
    var d = "M0 70", x; for (x = 0; x <= 2400; x += 200) { d += " Q" + (x + 100) + " " + (x / 200 % 2 ? 110 : 30) + " " + (x + 200) + " 70"; }
    return '<svg viewBox="0 0 2400 150" preserveAspectRatio="none"><path d="' + d + '" fill="none" stroke="#2A1204" stroke-width="' + (w + 12) + '" stroke-linecap="round"/><path d="' + d + '" fill="none" stroke="' + col + '" stroke-width="' + w + '" stroke-linecap="round"/></svg>';
  }
  CG.fondoHTML = function (tipo, f, conLogo, ctx) {
    f = f || {};
    var cc = CORD[tipo] || CORD.programa, h = '<div class="bg ' + esc(tipo) + '"><div class="base"></div><div class="brillo"></div><div class="rayos"></div><div class="puntos"></div>';
    if (f.maule !== false) { h += '<div class="maule imp">MAULE</div>'; }
    if (tipo === "noticiero") {
      h += '<div class="anillos">' + [[1900, 40, "#1D3FB3", 60], [1500, 26, "#2E9BFF", 40], [1250, 14, "#E01E2B", 25], [1000, 30, "#3AA0FF", 32], [760, 10, "#E01E2B", 18], [560, 18, "#F59A23", 22]].map(function (r, i) {
        return '<i style="width:' + r[0] + 'px;height:' + r[0] + 'px;left:' + (-r[0] / 2) + 'px;top:' + (-r[0] / 2) + 'px;border-width:' + r[1] + 'px;color:' + r[2] + ';animation-duration:' + r[3] + 's;animation-direction:' + (i % 2 ? "reverse" : "normal") + '"></i>';
      }).join("") + '</div>';
    }
    if (f.cordillera !== false) {
      h += '<div class="cord"><svg class="c1" viewBox="0 0 2000 520" preserveAspectRatio="none"><path fill="' + cc[1] + '" d="M0 520V250L200 130L420 290L640 90L900 270L1180 140L1420 310L1700 100L2000 270V520Z"/></svg>' +
        '<svg class="c2" viewBox="0 0 2000 520" preserveAspectRatio="none"><path fill="' + cc[0] + '" d="M0 520V390L160 310L380 420L620 300L880 430L1120 340L1400 440L1640 330L2000 420V520Z"/></svg></div>';
    }
    if (f.gotas !== false) {
      [[420, 150, 46, "ketchup"], [1560, 130, 52, "mostaza"], [1800, 330, 58, "mayo"], [120, 520, 64, "palta"], [1840, 650, 70, "ketchup"], [300, 860, 52, "mostaza"], [1620, 880, 58, "mayo"]].forEach(function (g, i) {
        h += '<i class="gota" style="left:' + g[0] + 'px;top:' + g[1] + 'px;width:' + g[2] + 'px;height:' + (g[2] * 1.25) + 'px;background:' + GOTAS[g[3]] + ';animation-delay:-' + i * 0.7 + 's"></i>';
      });
    }
    if (f.salsa !== false) { h += '<div class="salsa">' + onda("#E02A12", 46) + onda("#F59A23", 30) + '</div>'; }
    if (conLogo && f.logo !== false) { h += '<div class="logo"><img alt="" src="' + esc(logoSrc(ctx)) + '"></div>'; }
    if (conLogo && f.texto) { h += '<div class="pie">' + esc(f.texto) + '</div>'; }
    return h + '</div>';
  };
})();
