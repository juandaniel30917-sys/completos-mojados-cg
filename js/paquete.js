/* COMPLETOS MOJADOS · CG — gráficas que faltaban para el libreto, hechas con la MISMA estética de los scripts de After Effects
   (COMPLETOS_MOJADOS_MASTER.jsx, GRAFICAS_PARTE_DOS.jsx) y de los GC de referencia (CONDUCTOR, INVITADO, ÚLTIMO MINUTO, TICKER).
   No modifica las plantillas existentes: solo agrega nuevas. Todo en HTML/CSS/SVG, sin imágenes externas. */
(function () {
  "use strict";
  var CG = window.CG, P = CG.PLANTILLAS, esc = CG.esc;

  /* paleta exacta de los scripts (var P en COMPLETOS_MOJADOS_MASTER.jsx) */
  var K = CG.PAL = {
    mauve: "#C79BB0", mauveL: "#DDB5C8", panL: "#F2A04C", panM: "#EE8A3C", panD: "#E2673A", vien: "#9C3B22", vienL: "#B8512E",
    palta: "#6AA832", paltaL: "#8CC24A", tomate: "#D9301F", tomL: "#F05A3C", mayo: "#FFF3D6", ketchup: "#E02A12", mostaza: "#F59A23",
    amarillo: "#F2E21A", lima: "#B9D47A", negro: "#0A0A0A", blanco: "#FFFFFF", azulO: "#050E2B", azul: "#0B3A8C", azulC: "#2E9BFF",
    rojoN: "#E01E2B", vino: "#5B2A63", vinoL: "#8A3E7A", pina: "#F7B500", pinaD: "#D98A00", rosa: "#B8527A", mosBG: "#F2B632", linea: "#2A1204"
  };

  /* ---------- un texto "PENDIENTE_…" es un marcador interno: NUNCA se dibuja al aire ---------- */
  var tx = CG.tx = function (s) { s = String(s == null ? "" : s); return /^\s*PENDIENTE/i.test(s) ? "" : esc(s); };
  CG.esPendiente = function (s) { return typeof s === "string" && /^\s*PENDIENTE/i.test(s); };
  var VEL = {k: "vel", l: "Velocidad de animación", t: "range", min: 50, max: 200, step: 5, u: "%", g: "Animación", ayuda: "100% = como en After Effects. Más alto = más rápido."};

  /* ======================= DIBUJOS DE LOS SCRIPTS (SVG) ======================= */
  function onda(x0, x1, y, amp, n, ph, vert) {
    var pts = [], pasos = n * 10, i, t, a, b;
    for (i = 0; i <= pasos; i++) { t = i / pasos; a = x0 + (x1 - x0) * t; b = y + amp * Math.sin(t * n * Math.PI * 2 + (ph ? Math.PI : 0)); pts.push(vert ? [b, a] : [a, b]); }
    return "M" + pts.map(function (p) { return p[0].toFixed(1) + " " + p[1].toFixed(1); }).join(" L");
  }
  CG.onda = onda;
  /* curva cerrada suave (Catmull-Rom) para el mapa del Maule */
  function curva(pts, cerrada) {
    var d = "M" + pts[0][0] + " " + pts[0][1], n = pts.length, i;
    for (i = 0; i < (cerrada ? n : n - 1); i++) {
      var p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
      d += " C" + (p1[0] + (p2[0] - p0[0]) / 6).toFixed(1) + " " + (p1[1] + (p2[1] - p0[1]) / 6).toFixed(1) + " " + (p2[0] - (p3[0] - p1[0]) / 6).toFixed(1) + " " + (p2[1] - (p3[1] - p1[1]) / 6).toFixed(1) + " " + p2[0] + " " + p2[1];
    }
    return d + (cerrada ? "Z" : "");
  }
  /* entrada como enter() del script: desde un desplazamiento, con rebote */
  function E(d, dx, dy, r) { return ' class="en" style="--d:' + d.toFixed(2) + 's;--dx:' + (dx || 0) + 'px;--dy:' + (dy || 0) + 'px;--r:' + (r || 0) + 'deg"'; }

  /* el COMPLETO con vienesa, palta, tomate y salsas (completo() del script). t = tiempos de cada parte */
  function TT(b, g) { return {hostA: b + g * 2.5, hostB: b + g * 2.9, pan: b, vien: b + g, tom: b + g * 2, palta: b + g * 2.4, mayo: b + g * 3, ket: b + g * 3.4, mos: b + g * 3.8, drop: b + g * 4.5}; }
  CG.completoSVG = function (o) {
    var T = o.T || TT(0.1, 0.12), h = "", i;
    if (o.hosts) {
      [-230, 230].forEach(function (X, k) {
        h += '<g' + E(k ? T.hostB : T.hostA, 0, 260, 0) + '><rect x="' + (X - 125) + '" y="-300" width="250" height="260" rx="100" fill="' + K.negro + '"/><circle cx="' + (X + (k ? 10 : -10)) + '" cy="-330" r="70" fill="' + K.negro + '"/>' +
          '<path d="M' + (X - 12) + ' -255L' + (X + 12) + ' -255L' + (X + 26) + ' -175L' + X + ' -135L' + (X - 26) + ' -175Z" fill="#fff"/></g>';
      });
    }
    h += '<g' + E(T.pan, -900, 0, -4) + '><rect x="-480" y="-165" width="960" height="170" rx="85" fill="' + K.panL + '"/></g>';
    h += '<g' + E(T.vien, 0, -800, 8) + '><rect x="-540" y="-115" width="1080" height="140" rx="70" fill="' + K.vien + '"/><rect x="-490" y="-93" width="980" height="26" rx="13" fill="' + K.vienL + '"/></g>';
    var pa = "", pl = ""; for (i = 0; i < 11; i++) { pa += '<ellipse cx="' + (-440 + i * 88) + '" cy="' + (-112 + ((i % 3) - 1) * 8) + '" rx="60" ry="38"/>'; }
    for (i = 0; i < 6; i++) { pl += '<ellipse cx="' + (-400 + i * 160) + '" cy="-124" rx="25" ry="13"/>'; }
    h += '<g' + E(T.palta, 0, -320, 0) + '><g fill="' + K.palta + '">' + pa + '</g><g fill="' + K.paltaL + '">' + pl + '</g></g>';
    var to = "", tl = ""; for (i = 0; i < 4; i++) { to += '<ellipse cx="' + (-330 + i * 220) + '" cy="-95" rx="55" ry="31"/>'; tl += '<ellipse cx="' + (-345 + i * 220) + '" cy="-105" rx="28" ry="12"/>'; }
    h += '<g' + E(T.tom, 0, -420, 6) + '><g fill="' + K.tomate + '">' + to + '</g><g fill="' + K.tomL + '">' + tl + '</g></g>';
    [[K.mayo, -36, T.mayo, 0], [K.ketchup, -56, T.ket, 1], [K.mostaza, -76, T.mos, 0]].forEach(function (s) {
      h += '<path class="traza" pathLength="1" style="--d:' + s[2].toFixed(2) + 's" d="' + onda(-430, 430, s[1], 13, 12, s[3]) + '" fill="none" stroke="' + s[0] + '" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"/>';
    });
    h += '<g' + E(T.pan, 900, 0, 3) + '><rect x="-500" y="-20" width="1000" height="230" rx="115" fill="' + K.panM + '"/><rect x="-430" y="135" width="860" height="70" rx="35" fill="' + K.panD + '" opacity=".7"/><ellipse cx="-60" cy="35" rx="320" ry="18" fill="' + K.panL + '" opacity=".6"/></g>';
    var gc = [K.mayo, K.ketchup, K.mostaza, K.ketchup, K.mayo, K.mostaza], gx = [-360, -210, -60, 80, 230, 380], go = "";
    for (i = 0; i < 6; i++) { go += '<ellipse class="gota" style="animation-delay:' + (i * 0.23).toFixed(2) + 's" cx="' + gx[i] + '" cy="-60" rx="13" ry="19" fill="' + gc[i] + '"/>'; }
    h += '<g class="gotas aparece" style="--d:' + T.drop.toFixed(2) + 's">' + go + '</g>';
    if (o.titulo) { h += CG.tituloSVG(o.titulo, o.tag); }
    return '<svg class="cp" viewBox="-640 -470 1280 760" style="left:' + (o.x - 640 * o.s) + 'px;top:' + (o.y - 470 * o.s) + 'px;width:' + (1280 * o.s) + 'px;height:' + (760 * o.s) + 'px"><g class="cp-mece">' + h + '</g></svg>';
  };
  /* COMPLETOS (ketchup) + MOJADOS (amarillo) + píldora negra con el lema (title() del script) */
  CG.tituloSVG = function (t, tag) {
    var h = '<g' + E(t, 0, -90, -6) + '><text x="-210" y="158" class="tsv" fill="' + K.ketchup + '">COMPLETOS</text></g><g' + E(t + 0.35, 0, -90, 6) + '><text x="250" y="158" class="tsv" fill="' + K.amarillo + '">MOJADOS</text></g>';
    if (tag != null) { h += '<g' + E(tag, 0, 60, 0) + '><rect x="-330" y="152" width="660" height="52" rx="26" fill="' + K.negro + '"/><text x="0" y="189" class="tsv-tag" fill="' + K.ketchup + '">EL PROGRAMA MÁS GRANDE DE CHILE</text></g>'; }
    return h;
  };
  /* banner rectangular con texto (banner() del script) */
  function banner(txt, x, y, w, h, col, tcol, sz, t, fuente) {
    return '<div class="bn" style="left:' + (x - w / 2) + 'px;top:' + (y - h / 2) + 'px;width:' + w + 'px;height:' + h + 'px;border-radius:' + (h * 0.2) + 'px;background:' + col + ';--d:' + t + 's"></div>' +
      '<div class="bn-t ' + (fuente || "") + '" style="left:' + (x - w / 2) + 'px;width:' + w + 'px;top:' + (y - h / 2) + 'px;height:' + h + 'px;color:' + tcol + ';font-size:' + sz + 'px;--d:' + (t + 0.15) + 's"><span>' + tx(txt) + '</span></div>';
  }
  /* texto grande del script: Impact con contorno (sw) */
  function TXT(txt, x, y, sz, col, t, o) {
    o = o || {};
    return '<div class="tx-s ' + (o.f || "imp") + '" style="left:' + (x - 960) + 'px;top:' + (y - sz * 0.98) + 'px;font-size:' + sz + 'px;color:' + col + ';--sw:' + ((o.sw || 0) * 2) + 'px;--sc:' + (o.sc || K.negro) + ';--d:' + t + 's;--dx:' + (o.dx || 0) + 'px;--dy:' + (o.dy == null ? 80 : o.dy) + 'px;--r:' + (o.r || 0) + 'deg"><span data-txt="' + tx(txt) + '">' + tx(txt) + '</span></div>';
  }
  /* mapa de la Región del Maule con Talca marcada (mapa() del script) */
  function mapaSVG(x, y, s, t, op) {
    var pts = [[0, -300], [40, -262], [72, -180], [58, -60], [92, 40], [72, 140], [34, 240], [-30, 292], [-62, 200], [-50, 80], [-84, -20], [-62, -140], [-30, -240]];
    var d = curva(pts.map(function (p) { return [x + p[0] * s, y + p[1] * s]; }), true), tx0 = x + 12 * s, ty0 = y + 40 * s;
    return '<svg class="mapa" viewBox="0 0 1920 1080"><path class="mapa-r" style="--d:' + (t + 1) + 's;--op:' + (op || 22) / 100 + '" d="' + d + '" fill="#fff"/><path class="traza" pathLength="1" style="--d:' + t + 's;--dur:1.5s" d="' + d + '" fill="none" stroke="#fff" stroke-width="7"/>' +
      '<circle cx="' + tx0 + '" cy="' + ty0 + '" r="12" fill="' + K.ketchup + '"/><circle class="pulso" cx="' + tx0 + '" cy="' + ty0 + '" r="12" fill="none" stroke="' + K.ketchup + '" stroke-width="6"/></svg>';
  }
  /* íconos (icoVienesa, icoTomate, icoPalta, icoPina, icoChunk) */
  var ICO = {
    vienesa: function (s) { return '<svg viewBox="-160 -50 320 100" width="' + 320 * s + '"><rect x="-150" y="-40" width="300" height="80" rx="40" fill="' + K.vien + '"/><rect x="-130" y="-26" width="260" height="16" rx="8" fill="' + K.vienL + '"/></svg>'; },
    tomate: function (s) { return '<svg viewBox="-60 -60 120 120" width="' + 120 * s + '"><circle r="55" fill="' + K.tomate + '"/><ellipse cx="-14" cy="-24" rx="28" ry="14" fill="' + K.tomL + '"/></svg>'; },
    palta: function (s) { return '<svg viewBox="-52 -72 104 144" width="' + 104 * s + '"><ellipse rx="48" ry="68" fill="' + K.palta + '"/><ellipse cy="6" rx="38" ry="56" fill="' + K.paltaL + '"/><circle cy="22" r="22" fill="' + K.vien + '"/></svg>'; },
    pina: function (s) {
      var g = ""; for (var k = -1; k <= 1; k++) { g += '<path d="M' + (k * 30 - 30) + ' -55L' + (k * 30 + 30) + ' 55M' + (k * 30 + 30) + ' -55L' + (k * 30 - 30) + ' 55"/>'; }
      return '<svg viewBox="-75 -175 150 265" width="' + 150 * s + '"><path d="M-30 -70L-10 -150L0 -100L14 -170L22 -100L46 -140L34 -70Z" fill="' + K.palta + '"/><ellipse rx="65" ry="85" fill="' + K.pina + '"/><g stroke="' + K.pinaD + '" stroke-width="5" fill="none" clip-path="ellipse(65px 85px at 0 0)">' + g + '</g></svg>';
    },
    trozo: function (s) { return '<svg viewBox="-40 -40 80 80" width="' + 80 * s + '"><rect x="-38" y="-38" width="76" height="76" rx="16" fill="' + K.pina + '"/><circle r="13" fill="' + K.pinaD + '"/></svg>'; },
    completo: function (s) { return '<svg viewBox="-560 -130 1120 360" width="' + 1120 * s + '"><rect x="-480" y="-125" width="960" height="170" rx="85" fill="' + K.panL + '"/><rect x="-540" y="-75" width="1080" height="140" rx="70" fill="' + K.vien + '"/><path d="' + onda(-430, 430, -36, 13, 12, 0) + '" fill="none" stroke="' + K.mostaza + '" stroke-width="14" stroke-linecap="round"/><rect x="-500" y="0" width="1000" height="220" rx="110" fill="' + K.panM + '"/></svg>'; }
  };
  CG.ICO_SCRIPT = ICO;
  function icono(nombre, x, y, s, t, dx, dy, r) { return '<div class="ico-s" style="left:' + x + 'px;top:' + y + 'px;--d:' + t + 's;--dx:' + (dx || 0) + 'px;--dy:' + (dy || 0) + 'px;--r:' + (r || 0) + 'deg"><div class="bob">' + ICO[nombre](s) + '</div></div>'; }
  /* arcos de salsa (arcos() del script) y ondas */
  function arcosSVG(t) {
    var a1 = curva([[-60, 900], [160, 700], [140, 450], [300, 330], [620, 270]], false), a2 = curva([[1980, 900], [1760, 700], [1780, 450], [1620, 330], [1300, 270]], false);
    return '<svg class="capa-svg" viewBox="0 0 1920 1080"><path class="traza" pathLength="1" style="--d:' + t + 's;--dur:1.4s" d="' + a1 + '" fill="none" stroke="' + K.ketchup + '" stroke-width="30" stroke-linecap="round"/>' +
      '<path class="traza" pathLength="1" style="--d:' + (t + 0.4) + 's;--dur:1.4s" d="' + a2 + '" fill="none" stroke="' + K.mostaza + '" stroke-width="30" stroke-linecap="round"/>' +
      '<path class="traza" pathLength="1" style="--d:' + (t + 0.8) + 's;--dur:1.4s" d="' + onda(-100, 2020, 965, 24, 14, 0) + '" fill="none" stroke="' + K.mayo + '" stroke-width="26" stroke-linecap="round"/></svg>';
  }
  function ondasSVG(t, lista) {
    return '<svg class="capa-svg" viewBox="0 0 1920 1080">' + lista.map(function (o, i) { return '<path class="traza" pathLength="1" style="--d:' + (t + i * 0.2) + 's;--dur:.9s" d="' + onda(-100, 2020, o[0], o[1], 14, o[3] || 0) + '" fill="none" stroke="' + o[2] + '" stroke-width="' + o[4] + '" stroke-linecap="round"/>'; }).join("") + '</svg>';
  }
  CG.salsaSVG = {arcos: arcosSVG, ondas: ondasSVG};

  /* fondos que faltaban, tal como en el script: VTR (mostaza con rayas ketchup) y BLOQUE 2 (vino). Los existentes no cambian. */
  var fondoOrig = CG.fondoHTML;
  CG.fondoHTML = function (tipo, f, conLogo, ctx) {
    if (tipo !== "vtr" && tipo !== "vino") { return fondoOrig(tipo, f, conLogo, ctx); }
    var h = '<div class="bg2 ' + tipo + '"><div class="b2-rayas"></div>';
    if (tipo === "vtr") { h += '<div class="b2-aro"></div>'; }
    else { h += '<i class="b2-circ c1"></i><i class="b2-circ c2"></i>'; }
    var cols = tipo === "vtr" ? [K.blanco, K.tomate, K.palta] : [K.mostaza, K.ketchup, K.lima];
    for (var i = 0; i < 18; i++) { var z = 12 + ((i * 37) % 14); h += '<i class="b2-conf" style="left:' + ((i * 211) % 1860 + 30) + 'px;top:' + ((i * 137) % 1000 + 30) + 'px;width:' + z + 'px;height:' + Math.round(z * 1.1) + 'px;background:' + cols[i % 3] + ';animation-delay:-' + (i * 0.37).toFixed(2) + 's"></i>'; }
    h += '<svg class="capa-svg" viewBox="0 0 1920 1080"><path d="' + onda(-80, 2000, 30, tipo === "vtr" ? 16 : 14, 16, 0) + '" fill="none" stroke="' + (tipo === "vtr" ? K.mayo : K.ketchup) + '" stroke-width="' + (tipo === "vtr" ? 34 : 28) + '" stroke-linecap="round"/>' +
      '<path d="' + onda(-80, 2000, 1050, 18, 16, 1) + '" fill="none" stroke="' + (tipo === "vtr" ? K.ketchup : K.mostaza) + '" stroke-width="40" stroke-linecap="round"/></svg>';
    if (conLogo && f && f.logo !== false) { h += '<div class="logo"><img alt="" src="' + esc((ctx && ctx.logo) || ((ctx && ctx.base) || "") + "assets/logo.png") + '"></div>'; }
    return h + '</div>';
  };
  ["fondo", "placa"].forEach(function (k) {
    P[k].campos.forEach(function (c) { if ((c.k === "tipo" || c.k === "fondo") && c.o && !c.o.some(function (o) { return o[0] === "vtr"; })) { c.o.splice(c.o.length - 1, 0, ["vtr", "VTR"], ["vino", "Bloque 2 (vino)"]); } });
  });

  /* ======================= CATEGORÍAS, TIPOS Y GRUPOS ======================= */
  CG.CATEGORIAS.splice(3, 0, {id: "escenas", nombre: "Escenas y transiciones", icono: "rayo", ayuda: "Intro, pase al noticiero, VTR, bloque 2, Piña Papá, cierre (de los scripts)"});
  CG.CATEGORIAS.splice(4, 0, {id: "menciones", nombre: "Menciones comerciales", icono: "estrella", ayuda: "Marco para marcas auspiciadoras"});
  CG.CATEGORIAS.forEach(function (c) { if (c.id === "concurso") { c.ayuda = "Teléfono, preguntas, marcador, participante y temporizador"; } });
  CG.TIPOS = {GC: "GC", CORTINA: "Cortina", TRANSICION: "Transición", ESCENA: "Escena", FONDO: "Fondo", IDENT: "Identificador", VTR: "VTR", VIDEO: "Video", MENCION: "Mención",
    CONCURSO: "Concurso", PREGUNTA: "Pregunta", MARCADOR: "Marcador", PLACA: "Placa", TITULO: "Título", CIERRE: "Cierre", CINTILLO: "Cintillo", AVISO: "Aviso", LOGO: "Logo", RELOJ: "Reloj"};
  var tipoDe = {gcNoticiero: "GC", gcPrograma: "GC", participante: "GC", barraConcurso: "CINTILLO", zocalo: "CINTILLO", temporizador: "RELOJ", etiqueta: "TITULO",
    placa: "PLACA", mosca: "LOGO", enVivo: "IDENT", fondo: "FONDO", video: "VIDEO", aviso: "AVISO", cortina: "CORTINA"};
  Object.keys(tipoDe).forEach(function (k) { P[k].tipo = tipoDe[k]; });
  /* dos gráficas del mismo grupo no salen juntas: la nueva reemplaza a la anterior (así nunca se tapan dos GC de nombre) */
  ["gcNoticiero", "gcPrograma", "barraConcurso", "participante"].forEach(function (k) { P[k].grupo = "tercio"; });
  P.placa.grupo = "pantalla"; P.fondo.grupo = "fondo"; P.etiqueta.grupo = "etiqueta";
  CG.grupoDe = function (e) { var p = P[e.plantilla]; if (!p) { return e.plantilla; } var g = typeof p.grupo === "function" ? p.grupo(e.datos || {}) : p.grupo; return g || e.plantilla; };
  CG.tipoDe = function (e) { return e.tipo || (P[e.plantilla] && P[e.plantilla].tipo) || "GC"; };

  /* =================================================================================
     GC DE PERSONA — igual a los videos CONDUCTOR / INVITADO / CM_GC_GUEST (botella de mostaza)
     y estilo noticiero (Presentador: barra roja, caja azul, bajada amarilla)
     ================================================================================= */
  P.gcPersona = {
    nombre: "GC persona (conductor / invitado)", cat: "nombres", icono: "persona", capa: 52, salidaMs: 520, tipo: "GC", grupo: "tercio",
    desc: "El GC de los videos: botella de mostaza, etiqueta, nombre en caja crema y cargo en caja dorada.",
    campos: [
      {k: "etiqueta", l: "Etiqueta", t: "text", g: "Texto", ayuda: "CONDUCTOR, INVITADO, PERIODISTA…"},
      {k: "nombre", l: "Nombre", t: "text", g: "Texto"}, {k: "cargo", l: "Cargo / descripción", t: "text", g: "Texto"},
      {k: "estilo", l: "Estilo", t: "seg", g: "Estilo", o: [["programa", "Completos Mojados"], ["noticiero", "Noticiero"]]},
      {k: "colorEtq", l: "Color etiqueta", t: "seg", g: "Estilo", o: [["rojo", "Rojo"], ["naranjo", "Naranjo"]]},
      {k: "subir", l: "Subir (si hay cintillo abajo)", t: "range", min: 0, max: 400, step: 2, u: "px", g: "Posición"}, VEL
    ],
    defaults: {etiqueta: "INVITADO", nombre: "Nombre Apellido", cargo: "Cargo", estilo: "programa", colorEtq: "naranjo", subir: 0, vel: 100},
    render: function (d) {
      return '<div class="gp2 e-' + esc(d.estilo) + ' ce-' + esc(d.colorEtq) + '" style="bottom:' + (80 + (+d.subir || 0)) + 'px">' +
        (d.estilo === "noticiero" ? '<i class="gp2-barra"></i>' : '<div class="gp2-bot"><i class="tapa"></i><i class="cuerpo"></i><i class="banda"></i></div>') +
        '<div class="gp2-col">' + (tx(d.etiqueta) ? '<div class="gp2-etq">' + tx(d.etiqueta) + '</div>' : '') +
        '<div class="gp2-nom"><span data-fit="1300">' + tx(d.nombre) + '</span></div>' + (tx(d.cargo) ? '<div class="gp2-car"><span data-fit="1300">' + tx(d.cargo) + '</span></div>' : '') + '</div></div>';
    }
  };

  /* GC ÚLTIMO MINUTO — igual al video GC_ULTIMO_MINUTO_10S (banda roja, barra blanca, filete mostaza, cita y salpicadura) */
  P.gcUltimoMinuto = {
    nombre: "GC Último minuto", cat: "nombres", icono: "persona", capa: 51, salidaMs: 600, tipo: "GC", grupo: "tercio",
    desc: "Banda roja con punto, titular en barra blanca, filete mostaza y cita abajo (video GC_ULTIMO_MINUTO).",
    campos: [{k: "etiqueta", l: "Etiqueta", t: "text", g: "Texto"}, {k: "titular", l: "Titular", t: "text", g: "Texto"}, {k: "cita", l: "Cita (opcional)", t: "text", g: "Texto"},
      {k: "subir", l: "Subir", t: "range", min: 0, max: 400, step: 2, u: "px", g: "Posición"}, VEL],
    defaults: {etiqueta: "ÚLTIMO MINUTO", titular: "TITULAR", cita: "", subir: 0, vel: 100},
    render: function (d) {
      return '<div class="um" style="--subir:' + (+d.subir || 0) + 'px"><div class="um-banda"><i class="um-punto"></i><span>' + tx(d.etiqueta) + '</span></div>' +
        '<div class="um-barra"><span data-fit="1640">' + tx(d.titular) + '</span></div><div class="um-filete"></div>' + (tx(d.cita) ? '<div class="um-cita">' + tx(d.cita) + '</div>' : '') +
        '<div class="um-salp">' + [0, 1, 2, 3, 4, 5, 6, 7].map(function (i) { return '<i style="--a:' + (i * 45 + 10) + 'deg;--l:' + (60 + (i * 23) % 70) + 'px"></i>'; }).join("") + '</div></div>';
    }
  };

  /* LOGO NOTICIERO MOJADO (esquina superior, como en el video GC_ULTIMO_MINUTO) */
  P.logoNoticiero = {
    nombre: "Logo Noticiero Mojado (esquina)", cat: "logos", icono: "logo", capa: 83, salidaMs: 450, tipo: "IDENT", grupo: "logo-noticiero",
    desc: "«NOTICIERO» blanco y «MOJADO» rojo, con contorno negro, arriba a la izquierda.",
    campos: [{k: "l1", l: "Línea 1", t: "text", g: "Texto"}, {k: "l2", l: "Línea 2", t: "text", g: "Texto"},
      {k: "x", l: "Posición horizontal", t: "range", min: 0, max: 1600, step: 2, u: "px", g: "Posición"}, {k: "y", l: "Posición vertical", t: "range", min: 0, max: 900, step: 2, u: "px", g: "Posición"}, VEL],
    defaults: {l1: "NOTICIERO", l2: "MOJADO", x: 84, y: 82, vel: 100},
    render: function (d) { return '<div class="ln" style="left:' + d.x + 'px;top:' + d.y + 'px"><div class="ln-1 imp">' + tx(d.l1) + '</div><div class="ln-2 imp">' + tx(d.l2) + '</div></div>'; }
  };

  /* TICKER NOTICIERO — igual al video TICKER_NOTICIERO_20S */
  P.tickerNoticiero = {
    nombre: "Ticker Noticiero", cat: "cintillos", icono: "ticker", capa: 46, salidaMs: 500, tipo: "CINTILLO", grupo: "ticker",
    desc: "Pestaña roja «NOTICIERO MOJADO», barra blanca y titulares que corren abajo (video TICKER_NOTICIERO).",
    campos: [{k: "etiqueta", l: "Etiqueta", t: "text", g: "Texto"}, {k: "barra", l: "Texto en la barra blanca (opcional)", t: "text", g: "Texto"},
      {k: "items", l: "Titulares que corren (uno por línea)", t: "lineas", g: "Texto"}, {k: "velocidad", l: "Velocidad", t: "range", min: 40, max: 320, step: 10, g: "Texto"}, VEL],
    defaults: {etiqueta: "NOTICIERO MOJADO", barra: "", items: ["ÚLTIMA HORA", "SE DERRAMÓ LA MAYONESA EN TALCA"], velocidad: 150, vel: 100},
    render: function (d) {
      var uno = (d.items || []).filter(function (s) { return tx(s); }).map(function (s) { return '<span class="tn-it">' + tx(s) + '</span><span class="tn-sep">•</span>'; }).join("");
      return '<div class="tn"><div class="tn-fila"><div class="tn-etq imp"><span>' + tx(d.etiqueta) + '</span></div><div class="tn-barra">' + (tx(d.barra) ? '<span>' + tx(d.barra) + '</span>' : '') + '</div></div>' +
        '<div class="tn-via"><div class="tn-tira">' + uno + '</div></div></div>';
    },
    montar: function (el, d) {
      var tira = el.querySelector(".tn-tira"), via = el.querySelector(".tn-via"), x = 1920, w = 0, raf, ult = 0, v = +d.velocidad || 150;
      var uno = tira.innerHTML; tira.innerHTML = uno; w = tira.scrollWidth; var veces = Math.max(2, Math.ceil(1920 / Math.max(w, 1)) + 1), s = ""; for (var i = 0; i < veces; i++) { s += uno; } tira.innerHTML = s;
      function paso(t) { var dt = ult ? Math.min(0.1, (t - ult) / 1000) : 0; ult = t; if (w > 0) { x -= v * dt * (CG.velocidad || 1); if (x <= -w) { x += w; } tira.style.transform = "translate3d(" + x.toFixed(1) + "px,0,0)"; } raf = requestAnimationFrame(paso); }
      raf = requestAnimationFrame(paso); void via;
      return {destruir: function () { cancelAnimationFrame(raf); }};
    }
  };

  /* =================================================================================
     ESCENAS A PANTALLA COMPLETA (se quedan hasta que las ocultes)
     ================================================================================= */
  /* INTRO_COMPLETOS_MOJADOS_20S */
  P.intro = {
    nombre: "Intro Completos Mojados", cat: "escenas", icono: "monitor", capa: 25, salidaMs: 600, tipo: "ESCENA", grupo: "pantalla",
    desc: "La intro del script: TALCA y el mapa del Maule, arcos de salsa, el completo se arma con los conductores, título y banner del noticiero.",
    campos: [{k: "ciudad", l: "Ciudad", t: "text", g: "Texto"}, {k: "region", l: "Región", t: "text", g: "Texto"}, {k: "banner", l: "Banner final (opcional)", t: "text", g: "Texto"},
      {k: "lema", l: "Mostrar lema «El programa más grande de Chile»", t: "toggle", g: "Texto"}, VEL],
    defaults: {ciudad: "TALCA", region: "REGIÓN DEL MAULE", banner: "NOTICIERO MOJADO", lema: true, vel: 100},
    render: function (d, ctx) {
      return '<div class="esc">' + CG.fondoHTML("programa", {logo: false, maule: false}, false, ctx) +
        '<div class="esc-fuera" style="--fuera:10.4s">' + mapaSVG(1560, 520, 1.35, 0.2, 28) + TXT(d.ciudad, 420, 330, 170, "#fff", 0.9, {sw: 4, dx: -300, dy: 0, r: -4}) +
        TXT(d.region, 420, 395, 52, K.negro, 1.4, {f: "arial", dx: -300, dy: 0}) + '<div class="barra-s" style="left:160px;top:419px;width:520px;height:12px;border-radius:6px;background:' + K.ketchup + ';--d:1.2s;--dx:-500px"></div></div>' +
        arcosSVG(11.0) + '<div class="esc-zoom" style="--z0:.85;--zt:15s">' + CG.completoSVG({x: 960, y: 680, s: 0.85, hosts: true, T: {pan: 3.0, vien: 4.8, hostA: 6.2, hostB: 6.6, tom: 7.4, palta: 8.1, mayo: 9.1, ket: 9.8, mos: 10.5, drop: 11.3}, titulo: 15.4, tag: d.lema ? 18.0 : null}) + '</div>' +
        (tx(d.banner) ? banner(d.banner, 960, 140, 1000, 130, K.rojoN, "#fff", 100, 18.0, "imp") : '') + '</div>';
    }
  };
  /* NOTICIERO_MOJADO_INTRO (9 s) */
  P.introNoticiero = {
    nombre: "Intro Noticiero Mojado", cat: "escenas", icono: "monitor", capa: 25, salidaMs: 600, tipo: "ESCENA", grupo: "pantalla",
    desc: "Intro del noticiero del script: fondo azul con globo y anillos, barras, EN VIVO, NOTICIERO / MOJADO, DESDE TALCA y titular.",
    campos: [{k: "l1", l: "Línea 1", t: "text", g: "Texto"}, {k: "l2", l: "Línea 2", t: "text", g: "Texto"}, {k: "desde", l: "Banner superior", t: "text", g: "Texto"},
      {k: "etq", l: "Etiqueta inferior", t: "text", g: "Texto"}, {k: "titular", l: "Titular", t: "text", g: "Texto"}, VEL],
    defaults: {l1: "NOTICIERO", l2: "MOJADO", desde: "DESDE TALCA", etq: "ÚLTIMA HORA", titular: "EL NOTICIERO MÁS LARGO DEL MUNDO", vel: 100},
    render: function (d, ctx) {
      var barras = [90, 150, 120, 200].map(function (h, i) { return '<i class="ind" style="left:' + (115 + i * 46) + 'px;top:' + (330 - h) + 'px;height:' + h + 'px;background:' + (i % 2 ? K.azulC : K.rojoN) + ';--d:' + (0.6 + i * 0.15) + 's"></i>'; }).join("");
      return '<div class="esc">' + CG.fondoHTML("noticiero", {maule: false}, false, ctx) + mapaSVG(300, 660, 0.7, 1.0, 25) + barras +
        '<div class="envivo-s" style="--d:.9s"><i></i><span>EN VIVO</span></div>' + ondasSVG(1.5, [[60, 20, K.mostaza, 0, 18]]) +
        CG.completoSVG({x: 1450, y: 650, s: 0.46, hosts: true, T: TT(0.8, 0.18)}) +
        TXT(d.l1, 720, 420, 150, "#fff", 2.0, {f: "ai", sw: 4, dx: -400, dy: 0, r: -3}) + TXT(d.l2, 720, 570, 150, "#fff", 2.4, {f: "ai", sw: 4, dx: -400, dy: 0, r: 3}) +
        '<div class="barra-s" style="left:340px;top:631px;width:760px;height:18px;background:' + K.rojoN + ';--d:2.8s;--dx:-1200px"></div>' +
        (tx(d.desde) ? banner(d.desde, 720, 280, 420, 66, K.rojoN, "#fff", 40, 3.2, "ai") : '') + (tx(d.etq) ? banner(d.etq, 260, 882, 330, 56, K.rojoN, "#fff", 32, 4.5, "arial") : '') +
        '<div class="barra-s" style="left:95px;top:910px;width:1560px;height:90px;background:#fff;--d:4.6s;--dx:-1800px"></div>' +
        (tx(d.titular) ? '<div class="tx-s arial" style="left:-85px;top:934px;font-size:46px;color:' + K.negro + ';--d:5s;--dy:40px"><span>' + tx(d.titular) + '</span></div>' : '') + '</div>';
    }
  };
  /* CORTINA_CIERRE_10S — se queda como pantalla final y retira todo lo demás */
  P.cierre = {
    nombre: "Cierre del programa", cat: "escenas", icono: "monitor", capa: 26, salidaMs: 700, tipo: "CIERRE", grupo: "pantalla", exclusivo: true,
    desc: "CORTINA_CIERRE del script: fondo de cierre, arcos de salsa, el completo con los conductores, título y banners. Al mostrarla se retira todo lo demás.",
    campos: [{k: "superior", l: "Banner superior", t: "text", g: "Texto"}, {k: "inferior", l: "Banner inferior", t: "text", g: "Texto"},
      {k: "creditos", l: "Créditos / agradecimientos (uno por línea, opcional)", t: "lineas", g: "Texto"}, VEL],
    defaults: {superior: "NOS VEMOS EN EL PRÓXIMO PROGRAMA", inferior: "NOTICIERO MOJADO", creditos: [], vel: 100},
    render: function (d, ctx) {
      var c = (d.creditos || []).filter(function (s) { return tx(s); });
      return '<div class="esc">' + CG.fondoHTML("cierre", {logo: false, maule: false}, false, ctx) + arcosSVG(0.5) +
        CG.completoSVG({x: 960, y: c.length ? 640 : 690, s: c.length ? 0.78 : 0.9, hosts: true, T: TT(0.3, 0.2), titulo: 2.0}) +
        (tx(d.superior) ? banner(d.superior, 960, 130, 1300, 100, K.negro, K.mayo, 64, 3.6, "imp") : '') +
        (c.length ? '<div class="cred" style="--d:5s"><div class="cred-rollo">' + c.map(function (s) { return '<p>' + tx(s) + '</p>'; }).join("") + '</div></div>' : (tx(d.inferior) ? banner(d.inferior, 960, 975, 900, 100, K.rojoN, "#fff", 64, 6.5, "ai") : '')) + '</div>';
    }
  };

  /* =================================================================================
     TRANSICIONES DE LOS SCRIPTS (se lanzan, se ven completas y dejan la pantalla limpia)
     ================================================================================= */
  var ESCENAS = {
    pase_noticiero: {n: "PASE_NOTICIERO · «¡Adelante, el noticiero!»", dur: 7, corte: 1.7, tipoCorte: "salsa", a: "¡ADELANTE, EL NOTICIERO!", b: "NOTICIERO MOJADO", c: "DESDE TALCA",
      A: function (d, ctx) { return CG.fondoHTML("programa", {maule: false}, false, ctx) + CG.completoSVG({x: 960, y: 690, s: 0.85, hosts: true, T: TT(0.1, 0.12), titulo: 0.9, tag: 1.3}) + TXT(d.a, 960, 150, 84, "#fff", 0.6, {sw: 4, dy: -80}); },
      B: function (d, ctx) { return CG.fondoHTML("noticiero", {maule: false}, false, ctx) + TXT(d.b, 960, 520, 140, "#fff", 0.5, {f: "ai", sw: 4}) + '<div class="barra-s" style="left:460px;top:550px;width:1000px;height:20px;background:' + K.rojoN + ';--d:.7s;--dx:-1500px"></div>' + (tx(d.c) ? banner(d.c, 960, 370, 420, 70, K.rojoN, "#fff", 42, 0.9, "ai") : ""); }},
    nota: {n: "TRANSICION_NOTA · «En terreno»", dur: 4, corte: 0.9, tipoCorte: "mancha", a: "NOTICIERO MOJADO", b: "EN TERRENO",
      A: function (d, ctx) { return CG.fondoHTML("noticiero", {maule: false}, false, ctx) + TXT(d.a, 960, 540, 100, "#fff", 0.1, {f: "ai", sw: 3, dy: 60}); },
      B: function (d, ctx) { return CG.fondoHTML("vtr", {}, false, ctx) + icono("vienesa", 960, 400, 1.2, 0.3, 0, -300, 10) + TXT(d.b, 960, 640, 170, K.ketchup, 0.45, {sw: 4.5, sc: K.mayo, r: -4}); }},
    cierre_noticiero: {n: "CIERRE_NOTICIERO · «Volvemos a Completos Mojados»", dur: 5, corte: 2.9, tipoCorte: "salsa", a: "NOTICIERO MOJADO", b: "VOLVEMOS A COMPLETOS MOJADOS",
      A: function (d, ctx) { return CG.fondoHTML("noticiero", {maule: false}, false, ctx) + TXT(d.a, 960, 420, 140, "#fff", 0.2, {f: "ai", sw: 4}) + '<div class="barra-s" style="left:460px;top:450px;width:1000px;height:20px;background:' + K.rojoN + ';--d:.4s;--dx:-1500px"></div>' + TXT(d.b, 960, 660, 74, K.amarillo, 1.5, {sw: 3, r: 3}); },
      B: function (d, ctx) { return CG.fondoHTML("programa", {maule: false}, false, ctx); }},
    regreso: {n: "REGRESO_COMPLETOS · el completo se arma", dur: 5, corte: 0, tipoCorte: "",
      A: function (d, ctx) { return CG.fondoHTML("programa", {maule: false}, false, ctx) + ondasSVG(0.6, [[975, 22, K.mostaza, 0, 26], [930, 22, K.ketchup, 1, 20]]) + CG.completoSVG({x: 960, y: 640, s: 0.95, hosts: true, T: TT(0.15, 0.1), titulo: 1.1, tag: 1.6}); }},
    vtr01: {n: "TRANSICION_VTR_01", dur: 4, corte: 1.0, tipoCorte: "salsa", b: "VTR 01",
      A: function (d, ctx) { return CG.fondoHTML("programa", {maule: false}, false, ctx) + CG.completoSVG({x: 960, y: 700, s: 0.6, hosts: true, T: TT(0.05, 0.08)}); },
      B: function (d, ctx) { return CG.fondoHTML("vtr", {}, false, ctx) + icono("vienesa", 960, 400, 1.3, 0.3, 0, -400, 8) + icono("tomate", 640, 420, 1.4, 0.45, -400, 0, 20) + icono("palta", 1280, 420, 1.3, 0.55, 400, 0, -20) + TXT(d.b, 960, 700, 170, "#fff", 0.6, {sw: 4.5}); }},
    vtr02: {n: "TRANSICION_VTR_02 · «¡Atentos!»", dur: 4, corte: 0.9, tipoCorte: "mancha", a: "¡ATENTOS!", b: "VTR 02",
      A: function (d, ctx) { return CG.fondoHTML("vtr", {}, false, ctx) + icono("palta", 520, 560, 1.6, 0.1, -400, 0, -15) + icono("tomate", 1400, 560, 1.7, 0.25, 400, 0, 15) + TXT(d.a, 960, 580, 150, K.ketchup, 0.3, {sw: 4.5, sc: K.mayo, r: 4}); },
      B: function (d, ctx) { return CG.fondoHTML("vino", {}, false, ctx) + CG.completoSVG({x: 960, y: 640, s: 0.6, hosts: false, T: TT(0.1, 0.1)}) + TXT(d.b, 960, 330, 170, K.mayo, 0.8, {sw: 4.5, dy: -80}); }},
    vtr03: {n: "TRANSICION_VTR_03 · «Algo se viene»", dur: 4, corte: 1.0, tipoCorte: "salsaV", a: "ALGO SE VIENE", b: "VTR 03",
      A: function (d, ctx) { return CG.fondoHTML("vino", {}, false, ctx) + icono("vienesa", 960, 480, 1.8, 0.1, 0, -600, 10) + TXT(d.a, 960, 700, 130, K.mayo, 0.35, {sw: 4}); },
      B: function (d, ctx) { return CG.fondoHTML("programa", {maule: false}, false, ctx) + CG.completoSVG({x: 960, y: 700, s: 0.62, hosts: true, T: TT(0.05, 0.08)}) + TXT(d.b, 960, 250, 170, "#fff", 0.7, {sw: 4.5, dy: -80}); }},
    bloque2: {n: "INTRO_BLOQUE_2 · «Seguimos completamente mojados»", dur: 6, corte: 0, tipoCorte: "", a: "SEGUIMOS COMPLETAMENTE MOJADOS",
      A: function (d, ctx) { return CG.fondoHTML("vino", {}, false, ctx) + arcosSVG(0.6) + CG.completoSVG({x: 960, y: 700, s: 0.8, hosts: true, T: TT(0.2, 0.14), titulo: 1.0}) + (tx(d.a) ? banner(d.a, 960, 130, 1500, 110, K.rojoN, "#fff", 70, 1.6, "imp") : ""); }},
    pina_papa: {n: "TRANSICION_PIÑA_PAPÁ · «¿Completo con piña?»", dur: 6, corte: 2.9, tipoCorte: "salsa", cols: [K.pina, K.ketchup, K.mayo, K.mostaza, K.pina], a: "¿COMPLETO CON PIÑA?", b: "VTR PIÑA PAPÁ", c: "COMPLETOS MOJADOS",
      A: function (d, ctx) { return CG.fondoHTML("programa", {maule: false}, false, ctx) + CG.completoSVG({x: 960, y: 700, s: 0.8, hosts: true, T: TT(0.1, 0.1)}) + TXT(d.a, 960, 150, 100, "#fff", 0.9, {sw: 4, dy: -80}) + [800, 960, 1120].map(function (x, i) { return icono("trozo", x, 585, 0.8, 1.6 + i * 0.2, 0, -500, 15); }).join(""); },
      B: function (d, ctx) { return CG.fondoHTML("vtr", {}, false, ctx) + icono("pina", 960, 430, 1.7, 0.3, 0, -500, 10) + TXT(d.b, 960, 740, 120, K.ketchup, 0.6, {sw: 4, sc: K.mayo}) + (tx(d.c) ? TXT(d.c, 960, 830, 52, K.negro, 0.85, {f: "arial", dy: 40}) : ""); }}
  };
  CG.ESCENAS = ESCENAS;
  P.transicion = {
    nombre: "Transición del programa", cat: "escenas", icono: "rayo", evento: true, tipo: "TRANSICION",
    desc: "Las transiciones de los scripts (PASE_NOTICIERO, NOTA, VTR 01/02/03, BLOQUE 2, PIÑA PAPÁ…). Tapan la pantalla, hacen su animación y la dejan limpia.",
    campos: [{k: "escena", l: "Transición", t: "select", g: "Escena", o: Object.keys(ESCENAS).map(function (k) { return [k, ESCENAS[k].n]; })},
      {k: "a", l: "Texto 1 (vacío = el del script)", t: "text", g: "Textos"}, {k: "b", l: "Texto 2 (vacío = el del script)", t: "text", g: "Textos"}, {k: "c", l: "Texto 3 (vacío = el del script)", t: "text", g: "Textos"},
      {k: "salidaSalsa", l: "Salir con barrido de salsa (si no, fundido)", t: "toggle", g: "Animación"}, VEL],
    defaults: {escena: "pase_noticiero", a: "", b: "", c: "", salidaSalsa: true, vel: 100}
  };

  /* barrido de salsa del script (wipe): bandas onduladas que se dibujan y se retiran */
  function barrido(caja, o, alCubrir, alTerminar) {
    var n = o.nb || 5, vert = !!o.vert, len = vert ? 1080 : 1920, span = vert ? 1920 : 1080, th = span / n * 1.7, tv = (o.tv || 0.7) * 1000 / o.v, st = (o.st || 0.1) * 1000 / o.v, ho = (o.ho || 0.3) * 1000 / o.v;
    var cols = o.cols || [K.ketchup, K.mostaza, K.mayo, K.ketchup, K.mostaza, K.mayo], s = '<svg class="barrido" viewBox="0 0 1920 1080" preserveAspectRatio="none">';
    for (var i = 0; i < n; i++) { s += '<path pathLength="1" d="' + onda(-500, len + 500, span * i / (n - 1), 40, 16, i % 2, vert) + '" fill="none" stroke="' + cols[i % cols.length] + '" stroke-width="' + th.toFixed(0) + '" stroke-linecap="round" stroke-dasharray="1 2" stroke-dashoffset="1"/>'; }
    var w = document.createElement("div"); w.className = "capa barrido-capa"; w.innerHTML = s + '</svg>'; caja.appendChild(w);
    var tc = tv + st * (n - 1);
    w.querySelectorAll("path").forEach(function (p, i) {
      p.animate([{strokeDashoffset: 1}, {strokeDashoffset: 0}], {duration: tv, delay: i * st, easing: "cubic-bezier(.6,0,.35,1)", fill: "forwards"});
      p.animate([{strokeDashoffset: 0}, {strokeDashoffset: -1}], {duration: tv, delay: tc + ho + i * st, easing: "cubic-bezier(.6,0,.35,1)", fill: "forwards"});
    });
    setTimeout(alCubrir, tc + ho / 2);
    setTimeout(function () { w.remove(); if (alTerminar) { alTerminar(); } }, tc + ho + st * (n - 1) + tv + 40);
  }
  /* mancha de salsa que crece (blob del script) */
  function mancha(caja, v, alCubrir) {
    var w = document.createElement("div"), cols = [K.mostaza, K.mayo, K.ketchup], tc = 1020 / v;
    w.className = "capa barrido-capa"; w.innerHTML = cols.map(function (c) { return '<i class="mancha" style="background:' + c + '"></i>'; }).join(""); caja.appendChild(w);
    w.querySelectorAll(".mancha").forEach(function (m, i) {
      var a = i * 120 / v, e = tc + 250 / v + (2 - i) * 100 / v, T = e + 600 / v;
      m.animate([{transform: "scale(0) rotate(-30deg)"}, {transform: "scale(3.45) rotate(0deg)", offset: (a + 600 / v) / T}, {transform: "scale(3.3)", offset: (a + 780 / v) / T}, {transform: "scale(3.3)", offset: e / T}, {transform: "scale(0)"}], {duration: T, fill: "forwards", easing: "cubic-bezier(.5,0,.3,1)"});
    });
    setTimeout(alCubrir, tc + 120 / v);
    setTimeout(function () { w.remove(); }, tc + 250 / v + 300 / v + 700 / v);
  }
  function salpicar(caja, cols) {
    var w = document.createElement("div"); w.className = "capa"; caja.appendChild(w);
    for (var i = 0; i < 12; i++) {
      var a = Math.random() * 6.283, d = 120 + Math.random() * 260, z = 24 + Math.random() * 50, s = document.createElement("i");
      s.className = "salp-s"; s.style.cssText = "left:" + (960 + Math.cos(a) * d) + "px;top:" + (540 + Math.sin(a) * d * 0.7) + "px;width:" + z + "px;height:" + z + "px;margin:" + (-z / 2) + "px;background:" + cols[i % cols.length];
      w.appendChild(s);
    }
    setTimeout(function () { w.remove(); }, 900);
  }
  var tTrans = [];
  P.transicion.lanzar = function (caja, d, ctx) {
    var e = ESCENAS[d.escena] || ESCENAS.pase_noticiero, v = Math.max(0.25, ((+d.vel || 100) / 100) * (CG.velocidad || 1));
    var t = {a: tx(d.a) ? d.a : (e.a || ""), b: tx(d.b) ? d.b : (e.b || ""), c: tx(d.c) ? d.c : (e.c || "")};
    tTrans.forEach(clearTimeout); tTrans = [];
    caja.className = "capa"; caja.innerHTML = "";
    var esc = document.createElement("div"); esc.className = "capa trans-esc"; esc.style.setProperty("--v", v); caja.appendChild(esc);
    function fase(html) { esc.innerHTML = '<div class="esc viva">' + html + '</div>'; ritmo(esc, v); }
    fase(e.A(t, ctx));
    var cols = e.cols || [K.ketchup, K.mostaza, K.mayo];
    function salir() {
      if (d.salidaSalsa === false) { esc.animate([{opacity: 1}, {opacity: 0}], {duration: 450 / v, fill: "forwards"}); tTrans.push(setTimeout(function () { caja.innerHTML = ""; }, 470 / v)); return; }
      barrido(caja, {v: v * 1.2, cols: cols}, function () { esc.remove(); }, function () { caja.innerHTML = ""; });
    }
    if (e.B && e.tipoCorte) {
      tTrans.push(setTimeout(function () {
        var cubrir = function () { fase(e.B(t, ctx)); salpicar(caja, cols); };
        if (e.tipoCorte === "mancha") { mancha(caja, v, cubrir); } else { barrido(caja, {v: v, vert: e.tipoCorte === "salsaV", nb: e.tipoCorte === "salsaV" ? 6 : 5, st: e.tipoCorte === "salsaV" ? 0.07 : 0.1, tv: 0.55, ho: 0.2, cols: e.tipoCorte === "salsaV" ? [K.mayo, K.ketchup, K.mostaza] : cols}, cubrir); }
      }, e.corte * 1000 / v));
    }
    tTrans.push(setTimeout(salir, (e.dur - 0.6) * 1000 / v));
  };
  P.transicion.cancelar = function () { tTrans.forEach(clearTimeout); tTrans = []; };
  /* velocidad de las animaciones CSS de una escena */
  function ritmo(nodo, r) {
    if (Math.abs(r - 1) < 0.01 || !nodo.getAnimations) { return; }
    var f = function () { try { nodo.getAnimations({subtree: true}).forEach(function (a) { a.playbackRate = r; }); } catch (x) {} };
    f(); requestAnimationFrame(f);
  }

  /* =================================================================================
     TARJETAS (mención, teléfono, pregunta, marcador) con el estilo de los avisos del programa:
     tarjeta blanca, borde café grueso, cabecera de color con Impact y goteo de salsa
     ================================================================================= */
  var COLORES = [["ketchup", "Ketchup"], ["mostaza", "Mostaza"], ["palta", "Palta"], ["azul", "Noticiero"], ["vino", "Vino"], ["pina", "Piña"]];
  var COLOR = {k: "color", l: "Color de la cabecera", t: "seg", g: "Estilo", o: COLORES};
  function tarjeta(clase, color, cab, cuerpo, extra) {
    return '<div class="tj ' + clase + ' tj-' + esc(color) + '"' + (extra || "") + '><div class="tj-cab"><span class="imp ol-s">' + cab + '</span></div><div class="tj-cuerpo">' + cuerpo + '</div><div class="tj-chorro"><i></i><i></i><i></i></div></div>';
  }

  P.mencion = {
    nombre: "Mención comercial", cat: "menciones", icono: "estrella", capa: 58, salidaMs: 520, tipo: "MENCION", grupo: "mencion",
    desc: "Tarjeta a la derecha (no tapa al conductor) con logo o nombre de la marca, puntos destacados, precio, contacto y delivery.",
    campos: [{k: "marca", l: "Nombre de la marca", t: "text", g: "Marca"}, {k: "logo", l: "Logo de la marca", t: "imagen", g: "Marca", ayuda: "Si no hay logo oficial se muestra el nombre de la marca en letras (no se inventa un logo)."},
      {k: "texto", l: "Frase principal", t: "text", g: "Texto"}, {k: "puntos", l: "Puntos destacados (uno por línea)", t: "lineas", g: "Texto"},
      {k: "precio", l: "Precio o promoción (opcional)", t: "text", g: "Texto"}, {k: "contacto", l: "Contacto (opcional)", t: "text", g: "Texto"},
      {k: "delivery", l: "Mostrar delivery", t: "toggle", g: "Texto"}, {k: "textoDelivery", l: "Texto de delivery", t: "text", g: "Texto", si: "delivery=true"},
      COLOR, {k: "lado", l: "Lado", t: "seg", g: "Posición", o: [["der", "Derecha"], ["izq", "Izquierda"]]}, VEL],
    defaults: {marca: "MARCA", logo: "", texto: "", puntos: [], precio: "", contacto: "", delivery: false, textoDelivery: "PÍDELO POR DELIVERY", color: "mostaza", lado: "der", vel: 100},
    render: function (d) {
      var pts = (d.puntos || []).filter(function (s) { return tx(s); });
      var cuerpo = (d.logo && !CG.esPendiente(d.logo) ? '<img class="mn-logo" alt="" src="' + esc(d.logo) + '">' : '') +
        (tx(d.texto) ? '<div class="mn-frase">' + tx(d.texto) + '</div>' : '') +
        (pts.length ? '<ul class="mn-pts">' + pts.map(function (s, i) { return '<li style="--i:' + i + '"><i class="mn-gota"></i><span>' + tx(s) + '</span></li>'; }).join("") + '</ul>' : '') +
        (tx(d.precio) ? '<div class="mn-precio imp ol-s">' + tx(d.precio) + '</div>' : '') + (tx(d.contacto) ? '<div class="mn-contacto">' + tx(d.contacto) + '</div>' : '') +
        (d.delivery && tx(d.textoDelivery) ? '<div class="mn-deliv imp">' + tx(d.textoDelivery) + '</div>' : '');
      return tarjeta("mn lado-" + esc(d.lado), d.color, '<span data-fit="470">' + tx(d.marca) + '</span>', cuerpo);
    }
  };

  P.telefono = {
    nombre: "Concurso telefónico", cat: "concurso", icono: "trofeo", capa: 57, salidaMs: 520, tipo: "CONCURSO", grupo: "telefono",
    desc: "Número, instrucciones, premio y las llamadas en vivo. El número se escribe cuando producción lo confirme.",
    campos: [{k: "titulo", l: "Título", t: "text", g: "Texto"}, {k: "numero", l: "Número telefónico", t: "text", g: "Texto", ayuda: "Vacío o PENDIENTE = no se muestra la línea del número."},
      {k: "instruccion", l: "Instrucciones", t: "text", g: "Texto"}, {k: "premio", l: "Premio", t: "text", g: "Texto"},
      {k: "mostrarCupos", l: "Mostrar llamadas en pantalla", t: "toggle", g: "Llamadas"},
      {k: "cupos", l: "Llamadas (toca para cambiar)", t: "cupos", g: "Llamadas", ayuda: "Libre → Llamando → Correcta → Incorrecta. Cambia en vivo."}, COLOR, VEL],
    defaults: {titulo: "CONCURSO EN VIVO", numero: "", instruccion: "", premio: "", mostrarCupos: false, cupos: ["libre", "libre", "libre", "libre", "libre"], color: "ketchup", vel: 100},
    firma: function (d) { var c = Object.assign({}, d); delete c.cupos; return c; },
    render: function (d) {
      var cuerpo = (tx(d.numero) ? '<div class="tl-num imp ol-s"><span data-fit="520">' + tx(d.numero) + '</span></div>' : '') + (tx(d.instruccion) ? '<div class="tl-ins">' + tx(d.instruccion) + '</div>' : '') +
        (tx(d.premio) ? '<div class="tl-premio"><b class="imp">PREMIO</b><span>' + tx(d.premio) + '</span></div>' : '') +
        (d.mostrarCupos ? '<div class="tl-cupos">' + (d.cupos || []).map(function (c, i) { return '<i class="cupo c-' + esc(c) + '">' + (i + 1) + '</i>'; }).join("") + '</div>' : '');
      return tarjeta("tl", d.color, '<i class="tl-fono"></i>' + tx(d.titulo), cuerpo);
    },
    montar: function (el) { return {actualizar: function (nd) { var cs = el.querySelectorAll(".cupo"); (nd.cupos || []).forEach(function (c, i) { if (cs[i]) { cs[i].className = "cupo c-" + c; } }); }}; }
  };
  CG.ESTADOS_CUPO = ["libre", "llamando", "correcto", "incorrecto"];

  P.pregunta = {
    nombre: "Pregunta / trivia", cat: "concurso", icono: "trofeo", capa: 55, salidaMs: 520, tipo: "PREGUNTA", grupo: function (d) { return d.modo === "completo" ? "pantalla" : "tercio"; },
    desc: "Pregunta con opciones. La correcta se revela solo cuando tú lo decides.",
    campos: [{k: "etiqueta", l: "Etiqueta", t: "text", g: "Texto"}, {k: "pregunta", l: "Pregunta", t: "text", g: "Texto"}, {k: "opciones", l: "Opciones (una por línea, máx. 4)", t: "lineas", g: "Texto"},
      {k: "correcta", l: "Opción correcta (número)", t: "range", min: 0, max: 4, step: 1, g: "Respuesta", ayuda: "0 = ninguna."}, {k: "revelar", l: "Revelar la correcta en pantalla", t: "toggle", g: "Respuesta"},
      {k: "modo", l: "Formato", t: "seg", g: "Estilo", o: [["inferior", "Abajo"], ["completo", "Pantalla completa"]]}, {k: "fondo", l: "Fondo (pantalla completa)", t: "seg", g: "Estilo", o: [["programa", "Programa"], ["vtr", "VTR"], ["vino", "Bloque 2"], ["noticiero", "Noticiero"]], si: "modo=completo"}, COLOR, VEL],
    defaults: {etiqueta: "PREGUNTA", pregunta: "¿PREGUNTA?", opciones: [], correcta: 0, revelar: false, modo: "inferior", fondo: "programa", color: "ketchup", vel: 100},
    firma: function (d) { var c = Object.assign({}, d); delete c.revelar; return c; },
    render: function (d, ctx) {
      var op = (d.opciones || []).filter(function (s) { return tx(s); }).slice(0, 4), L = "ABCD";
      var cuerpo = '<div class="pq-preg imp"><span data-fit="' + (d.modo === "completo" ? 1360 : 1500) + '">' + tx(d.pregunta) + '</span></div>' +
        (op.length ? '<div class="pq-ops n' + op.length + '">' + op.map(function (s, i) { return '<div class="pq-op' + (+d.correcta === i + 1 ? " ok" : "") + '" style="--i:' + i + '"><b class="imp">' + L[i] + '</b><span>' + tx(s) + '</span></div>'; }).join("") + '</div>' : '');
      return '<div class="pq m-' + esc(d.modo) + (d.revelar ? " revelada" : "") + '">' + (d.modo === "completo" ? CG.fondoHTML(d.fondo || "programa", {logo: false, maule: false}, false, ctx) : '') + tarjeta("pq-tj", d.color, tx(d.etiqueta), cuerpo) + '</div>';
    },
    montar: function (el) { return {actualizar: function (nd) { var q = el.querySelector(".pq"); if (q) { q.classList.toggle("revelada", !!nd.revelar); } }}; }
  };

  P.marcador = {
    nombre: "Marcador / puntajes", cat: "concurso", icono: "trofeo", capa: 56, salidaMs: 500, tipo: "MARCADOR", grupo: "marcador",
    desc: "Tabla de participantes y puntajes. Se actualiza en vivo.",
    campos: [{k: "titulo", l: "Título", t: "text", g: "Texto"},
      {k: "filas", l: "Participantes", t: "lista", g: "Texto", nuevo: {nombre: "", puntos: "0"}, campos: [{k: "nombre", t: "text", ph: "Nombre"}, {k: "puntos", t: "text", ph: "Pts", ancho: 80}]},
      {k: "destacar", l: "Destacar al primero", t: "toggle", g: "Estilo"}, COLOR, VEL],
    defaults: {titulo: "MARCADOR", filas: [], destacar: true, color: "palta", vel: 100},
    render: function (d) {
      var f = (d.filas || []).filter(function (r) { return tx(r.nombre); }), max = -1e9;
      f.forEach(function (r) { max = Math.max(max, parseFloat(r.puntos) || 0); });
      return tarjeta("mc", d.color, tx(d.titulo), f.map(function (r, i) { return '<div class="mc-fila' + (d.destacar && f.length > 1 && (parseFloat(r.puntos) || 0) === max ? " lider" : "") + '" style="--i:' + i + '"><span>' + tx(r.nombre) + '</span><b class="imp">' + tx(r.puntos) + '</b></div>'; }).join(""));
    }
  };

  /* velocidad de animación también en las plantillas que ya existían (solo agrega el control, no cambia su diseño) */
  ["gcNoticiero", "gcPrograma", "barraConcurso", "zocalo", "participante", "etiqueta", "placa", "mosca", "enVivo", "fondo", "temporizador", "video"].forEach(function (k) {
    if (!P[k].campos.some(function (f) { return f.k === "vel"; })) { P[k].campos.push(VEL); P[k].defaults.vel = 100; }
  });
})();
