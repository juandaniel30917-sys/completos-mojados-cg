/* COMPLETOS MOJADOS · CG — panel de control.
   Modelo:  BORRADOR (lo que editas, solo en este equipo) → VISTA PREVIA (monitor verde, nunca sale)
            → MOSTRAR/ACTUALIZAR → PROGRAMA (lo que sale al aire en todas las salidas). */
(function () {
  "use strict";
  var P = CG.PLANTILLAS, esc = CG.esc;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var base = location.href.replace(/[^/]*([?#].*)?$/, "");
  var prm = CG.params();
  var LOCAL = prm.local === "1";
  var sala = LOCAL ? "local" : (prm.sala || "").toLowerCase();
  var token = prm.t || prm.token || "";
  var con = null, estado = null, borr = {}, sel = null, filtro = "todo", busqueda = "", outKey = null;
  var abiertas = leerLS("cg_cats_abiertas", {cintillos: true, nombres: true, concurso: true});
  var RUNTIME = ["run", "cmd"];
  var vista = leerLS("cg_vista", "libreto"), ordenEdit = false, salidas = null, latidos = {};

  /* ------------------------------------------------------------------ utilidades */
  function leerLS(k, def) { try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? def : v; } catch (e) { return def; } }
  function guardarLS(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function clon(o) { return JSON.parse(JSON.stringify(o)); }
  function sinRuntime(d) { var c = Object.assign({}, d); RUNTIME.forEach(function (k) { delete c[k]; }); return JSON.stringify(c); }
  function debounce(f, ms) { var t; return function () { var a = arguments, s = this; clearTimeout(t); t = setTimeout(function () { f.apply(s, a); }, ms); }; }
  function el(id) { return estado && estado.elementos.filter(function (e) { return e.id === id; })[0]; }
  function borrador(id) { var e = el(id); if (!e) { return null; } if (!borr[id]) { borr[id] = clon(e.datos); } return borr[id]; }
  function difiere(e) { return !!borr[e.id] && sinRuntime(borr[e.id]) !== sinRuntime(e.datos); }
  function esEvento(e) { return P[e.plantilla] && P[e.plantilla].evento; }
  var guardarBorr = debounce(function () {
    var limpio = {}; Object.keys(borr).forEach(function (id) { var e = el(id); if (e && difiere(e)) { limpio[id] = borr[id]; } });
    guardarLS("cg_borr_" + sala, limpio);
  }, 300);

  function toast(msg, tipo, accion) {
    var t = document.createElement("div"); t.className = "toast " + (tipo || "");
    t.innerHTML = "<span>" + esc(msg) + "</span>";
    if (accion) { var b = document.createElement("button"); b.textContent = accion.txt; b.onclick = function () { accion.fn(); quitar(); }; t.appendChild(b); }
    $("#toasts").appendChild(t);
    function quitar() { t.classList.add("sale"); setTimeout(function () { t.remove(); }, 260); }
    setTimeout(quitar, tipo === "err" ? 7000 : accion ? 6000 : 2600);
  }

  /* ------------------------------------------------------------------ modal */
  var alCerrarModal = null;
  function modal(html, op) {
    op = op || {};
    var m = $("#modal"); m.className = (op.ancho ? "ancho" : "") + (op.clase ? " " + op.clase : ""); m.hidden = false;
    $(".cont", m).innerHTML = html; alCerrarModal = op.alCerrar || null;
    $(".cerrar", m).hidden = !!op.fijo;
    var f = $("input,button.prim", $(".cont", m)); if (f && !op.sinFoco) { setTimeout(function () { f.focus(); }, 50); }
    return $(".cont", m);
  }
  function cerrarModal() { var m = $("#modal"); if (m.hidden) { return; } m.hidden = true; $(".cont", m).innerHTML = ""; if (alCerrarModal) { var f = alCerrarModal; alCerrarModal = null; f(); } }
  $("#modal .cerrar").onclick = cerrarModal;
  $("#modal").addEventListener("mousedown", function (e) { if (e.target.id === "modal" && !$("#modal .cerrar").hidden) { cerrarModal(); } });
  function confirmar(titulo, texto, ok, peligro) {
    return new Promise(function (res) {
      var c = modal("<h2>" + esc(titulo) + "</h2><p class='lead'>" + esc(texto) + "</p><div class='modal-pie'><button class='btn' data-r='0'>Cancelar</button><button class='btn " + (peligro ? "pgm" : "prim") + "' data-r='1'>" + esc(ok) + "</button></div>", {alCerrar: function () { res(false); }});
      $$("[data-r]", c).forEach(function (b) { b.onclick = function () { alCerrarModal = null; cerrarModal(); res(b.dataset.r === "1"); }; });
    });
  }

  /* ------------------------------------------------------------------ monitores (iframes) */
  var ifPVW = $("#ifPVW"), ifPGM = $("#ifPGM");
  function enviar(ifr, msg) { try { ifr.contentWindow.postMessage(Object.assign({cg: 1}, msg), location.origin); } catch (e) {} }
  function estadoPVW() {
    var e = sel && el(sel);
    if (!e || esEvento(e)) { return {elementos: [], biblioteca: estado.biblioteca, logo: estado.logo, ajustes: estado.ajustes, ev: []}; }
    var c = clon(e); c.datos = clon(borrador(sel)); c.on = true;
    if (e.plantilla === "temporizador") { c.datos.run = clon(e.datos.run || c.datos.run); }
    return {elementos: [c], biblioteca: estado.biblioteca, logo: estado.logo, ajustes: estado.ajustes, ev: []};
  }
  var pvw = debounce(function () {
    var e = sel && el(sel);
    $("#pvwNada").hidden = !!(e && !esEvento(e));
    if (e && esEvento(e)) { $("#pvwNada").textContent = "Avisos y cortinas: usa «Vista previa» para probarlos aquí"; $("#pvwNada").hidden = false; }
    else { $("#pvwNada").textContent = "Elige una gráfica para verla aquí"; }
    if (seVe(ifPVW)) { enviar(ifPVW, {t: "estado", estado: estadoPVW()}); sucioPVW = false; } else { sucioPVW = true; }
  }, 70);
  /* cuando un monitor vuelve a verse, se pone al día */
  setInterval(function () { if (!estado) { return; } if (sucioPGM && seVe(ifPGM)) { pgm(); } if (sucioPVW && seVe(ifPVW)) { pvw(); } }, 400);
  function seVe(f) { return !!f && f.getClientRects().length > 0; }
  var sucioPGM = false, sucioPVW = false;
  function pgm() {
    if (seVe(ifPGM)) { enviar(ifPGM, {t: "estado", estado: estado}); sucioPGM = false; } else { sucioPGM = true; }
    var n = estado.elementos.filter(function (e) { return e.on; }).length;
    $("#pgmInfo").textContent = (salidas === 0 ? "SIN SALIDA CONECTADA · " : "") + (n ? n + (n === 1 ? " gráfica programada" : " gráficas programadas") : "nada al aire");
    $(".monitor.pgm").classList.toggle("vivo", n > 0 && salidas !== 0);
    $(".monitor.pgm").classList.toggle("sinsalida", salidas === 0);
    $(".monitor.pgm .tag").textContent = salidas === 0 ? "PROGRAMA" : "AL AIRE";
    pendientes();
  }
  addEventListener("message", function (m) {
    if (m.origin !== location.origin || !m.data || !m.data.cg) { return; }
    var d = m.data;
    if (m.source === ifPVW.contentWindow) {
      if (d.t === "listo" && estado) { pvw(); }
      if (d.t === "error") { toast("Vista previa: " + d.msg, "err"); }
    } else if (m.source === ifPGM.contentWindow) {
      if (d.t === "listo" && estado) { pgm(); }
      if (d.t === "fin") { finDe(d.id); }
    }
  });

  /* ------------------------------------------------------------------ publicar al aire */
  function publicar() {
    con.publicar(estado);
    pgm(); dibujarLista(); estadoFicha(); dibujarBotonera();
  }
  function finDe(id) {
    var e = el(id);
    if (e && e.on && (e.plantilla === "video" || e.plantilla === "temporizador")) { e.on = false; publicar(); }
  }
  function datosParaAire(e, guardado) {
    var d = clon(guardado ? e.datos : borrador(e.id));
    RUNTIME.forEach(function (k) { if (e.datos[k] !== undefined) { d[k] = e.datos[k]; } else { delete d[k]; } });
    return d;
  }
  /* ---------- transición opcional por gráfica (e.tr = {entra, sale}) ---------- */
  function esTransicion(e) { return !!e && (e.plantilla === "cortina" || e.plantilla === "transicion" || (e.plantilla === "video" && (e.tipo === "TRANSICION" || e.datos.esTrans))); }
  function transiciones() { return estado.elementos.filter(esTransicion); }
  function corteDe(t) {
    if (t.corteS != null && t.corteS !== "" && !isNaN(+t.corteS)) { return Math.max(0, +t.corteS); }
    var gl = ((estado.ajustes || {}).velocidad || 100) / 100;
    if (t.plantilla === "cortina") { return 0.75 / gl; }
    if (t.plantilla === "transicion") { var es = (CG.ESCENAS || {})[t.datos.escena] || {}, v = ((+t.datos.vel || 100) / 100) * gl; return (es.corte || (es.dur || 2) * 0.4) / v; }
    var m = (estado.biblioteca || []).filter(function (x) { return x.id === t.datos.media; })[0];
    return m && m.dur ? m.dur / 2 : 1;
  }
  function tipoTrans(t) { return t.plantilla === "cortina" ? "Cortina" : t.plantilla === "transicion" ? "Animada" : "Video"; }
  /* lanza la transición y devuelve los milisegundos hasta el punto donde la pantalla queda tapada */
  function pasarTrans(trId) {
    var t = el(trId); if (!t) { return -1; }
    if (t.plantilla === "video" && !t.datos.media) { toast("La transición «" + t.nombre + "» no tiene video. Se omite.", "err"); return -1; }
    if (esEvento(t)) { lanzar(t.id, true, true); }
    else if (t.on) { t.datos.cmd = {id: CG.nuevoId(), a: "reiniciar"}; publicar(); }
    else { t.on = true; t.datos.cmd = null; publicar(); }
    return Math.round(corteDe(t) * 1000);
  }
  var esperando = {};
  function mostrar(id, silencio, confirmado, guardado, sinTrans) {
    var e = el(id); if (!e || (esperando[id] && !sinTrans)) { return; }
    if (!sinTrans && e.tr && e.tr.entra && e.tr.entra !== id && !e.on && el(e.tr.entra)) {
      var f0 = guardado ? e.datos : borrador(id);
      if (!(e.plantilla === "video" && !f0.media)) {
        var ms = pasarTrans(e.tr.entra);
        if (ms >= 0) { esperando[id] = 1; setTimeout(function () { delete esperando[id]; mostrar(id, true, true, guardado, true); }, ms); if (!silencio) { flash($("#aMostrar")); } return; }
      }
    }
    var fuente = guardado ? e.datos : borrador(id);
    if (guardado && e.plantilla === "video" && !fuente.media) { toast("«" + e.nombre + "» no tiene video todavía. Súbelo desde Control.", "err"); return false; }
    if (guardado && CG.pendientesDe({datos: fuente, pend: e.pend}).length) { toast("«" + e.nombre + "» tiene datos pendientes (salen en blanco).", "err"); confirmado = true; }
    if (e.plantilla === "video" && !borrador(id).media) {
      toast("Falta el archivo de este video (" + ((e.pend && e.pend.media) || "sin video") + "). Súbelo para poder mostrarlo.", "err");
      seleccionar(id); abrirSubida(function (m) { cambio("media", m.id); cambio("modo", m.modo); if (m.chroma) { Object.keys(m.chroma).forEach(function (k) { cambio(k, m.chroma[k]); }); } dibujarCampos(); guardarElemento(id); });
      return;
    }
    var pend = CG.pendientesDe({datos: borrador(id), pend: e.pend});
    if (pend.length && !confirmado) {
      confirmar("Tiene datos pendientes", "Falta: " + pend.join(", ") + ". Lo pendiente NO aparece en pantalla (queda en blanco). ¿Mostrar igual?", "Mostrar igual").then(function (ok) { if (ok) { mostrar(id, silencio, true); } });
      return;
    }
    if (esEvento(e)) { lanzar(id, guardado); return; }
    var nuevo = !e.on, g = CG.grupoDe({plantilla: e.plantilla, datos: fuente});
    /* reglas: el cierre limpia todo; dos gráficas del mismo grupo (ej. dos GC de nombre) no se superponen */
    if (nuevo) {
      estado.elementos.forEach(function (o) {
        if (o === e || !o.on) { return; }
        if (P[e.plantilla].exclusivo || CG.grupoDe(o) === g) { o.on = false; }
      });
    }
    e.datos = datosParaAire(e, guardado); if (!guardado) { borr[id] = clon(e.datos); } e.on = true;
    if (e.plantilla === "video" && nuevo) { e.datos.cmd = null; }
    publicar(); guardarBorr();
    if (!silencio) { flash($("#aMostrar")); }
  }
  function ocultar(id, sinTrans) {
    var e = el(id); if (!e || !e.on || esperando[id]) { return; }
    if (!sinTrans && e.tr && e.tr.sale && e.tr.sale !== id && el(e.tr.sale)) {
      var ms = pasarTrans(e.tr.sale);
      if (ms >= 0) { esperando[id] = 1; setTimeout(function () { delete esperando[id]; var x = el(id); if (x && x.on) { x.on = false; publicar(); } }, ms); return; }
    }
    e.on = false; publicar();
  }
  function guardarElemento(id) {
    var e = el(id); if (!e) { return; }
    e.datos = datosParaAire(e); borr[id] = clon(e.datos); publicar(); guardarBorr();
    toast(e.on ? "Actualizado al aire" : "Guardado (no está al aire)", "ok");
  }
  function lanzar(id, guardado, sinAviso) {
    var e = el(id); if (!e) { return; }
    if (!sinAviso && e.tr && e.tr.entra && e.tr.entra !== id && el(e.tr.entra)) {
      var ms = pasarTrans(e.tr.entra);
      if (ms >= 0) { if (!guardado) { e.datos = clon(borrador(id)); } setTimeout(function () { lanzar(id, true, true); }, ms); return; }
    }
    if (salidas === 0) { toast("Ojo: no hay ninguna salida conectada, nadie verá esta cortina.", "err"); }
    if (!guardado) { e.datos = clon(borrador(id)); }
    var ev = {id: CG.nuevoId(), el: e.id, tipo: e.plantilla, datos: clon(e.datos), t: Date.now()};
    estado.ev = (estado.ev || []).concat(ev).slice(-12);
    publicar(); guardarBorr();
    flash($("#aMostrar"));
    if (!sinAviso) { toast((/cortina|transicion/.test(e.plantilla) ? "Transición" : "Aviso") + " lanzada al aire", "ok"); }
  }
  function flash(b) { if (!b) { return; } b.classList.remove("flash"); void b.offsetWidth; b.classList.add("flash"); }
  function comando(id, a) {
    var e = el(id); if (!e) { return; }
    if (e.plantilla === "video") {
      if (!e.on) { mostrar(id); return; }
      e.datos.cmd = {id: CG.nuevoId(), a: a}; publicar();
    }
    if (e.plantilla === "temporizador") {
      var r = e.datos.run || {estado: "detenido"}, d = e.datos;
      if (a === "iniciar") {
        var resta = r.estado === "pausado" ? r.restante : (+borrador(id).segundos || d.segundos);
        if (r.estado === "corriendo") { return; }
        if (!e.on) { mostrar(id, true); d = e.datos; }
        d.run = {estado: "corriendo", restante: resta, marca: CG.nuevoId()};
      } else if (a === "pausar") {
        if (r.estado !== "corriendo") { return; }
        d.run = {estado: "pausado", restante: Math.max(0, CG.restante(d)), marca: CG.nuevoId()};
      } else if (a === "reiniciar") {
        d.run = {estado: "detenido", restante: +d.segundos, marca: CG.nuevoId()};
      }
      if (borr[id]) { borr[id].run = clon(d.run); }
      publicar(); pvw(); extras();
    }
  }

  /* ------------------------------------------------------------------ estado de conexión */
  function pill(id, clase, txt) { var p = $(id); p.className = "pill " + clase; $("span", p).textContent = txt; }
  function red(s) {
    var m = {conectado: ["ok", "En línea"], reconectando: ["warn", "Reconectando…"], conectando: ["warn", "Conectando…"], "sin-conexion": ["mal", "Sin internet"], local: ["local", "Modo local"]}[s] || ["warn", s];
    pill("#pRed", m[0], m[1]);
    $("#pRed").title = s === "sin-conexion" ? "Sin conexión. Lo que hagas se enviará solo cuando vuelva internet. Las salidas siguen mostrando lo último." : "Conexión con el servidor";
  }
  var directos = 0, msDirecto = null, ultPres = null;
  function presencia(p) {
    if (p) { ultPres = p; } else { p = ultPres; } if (!p) { return; }
    var n = p.salidas, antes = salidas; salidas = n;
    if (estado && (antes === null || !antes !== !n)) { dibujarLista(); pgm(); estadoFicha(); }
    pill("#pSalidas", n ? "ok" : "warn", n ? (directos ? "⚡ " : "") + (n === 1 ? "1 salida" : n + " salidas") + (directos && msDirecto != null ? " · " + msDirecto + " ms" : "") : "Sin salida");
    $("#pSalidas").title = n ? "Salidas de OBS conectadas a esta sala" + (directos ? " · ⚡ " + directos + " con conexión directa (instantánea)" : " · por internet (sin conexión directa todavía)") + (p.controles > 0 ? " · " + p.controles + " panel(es) más controlando" : "") : "Ninguna salida (OBS) conectada todavía. Usa Remoto → Link de salida.";
  }
  function guardado(s, msg) {
    var g = $("#pGuardado"); g.classList.toggle("err", s === "error");
    g.textContent = s === "guardando" ? "Enviando…" : s === "ok" ? "✓ Enviado" : s === "error" ? "Sin enviar" : "";
    g.title = s === "error" ? (msg || "") + " · Se reintentará solo." : "";
    if (s === "error" && msg && !guardado.avisado) { guardado.avisado = true; toast("No se pudo enviar: " + msg + " Se reintenta solo.", "err"); setTimeout(function () { guardado.avisado = false; }, 15000); }
  }

  /* ------------------------------------------------------------------ LISTA */
  function resumen(e) {
    var d = e.datos;
    switch (e.plantilla) {
      case "barraConcurso": return (d.mensajes || []).map(function (m) { return (m.a + " " + (m.b || "")).trim(); }).join(" · ");
      case "zocalo": return (d.items || []).join(" · ");
      case "gcNoticiero": return d.titular;
      case "gcPrograma": return d.nombre;
      case "participante": return d.nombre;
      case "temporizador": return d.segundos + " s";
      case "etiqueta": return d.texto;
      case "placa": return d.titulo;
      case "aviso": return d.titulo + " · " + d.texto;
      case "gcPersona": return [d.etiqueta, d.nombre, d.cargo].filter(Boolean).join(" · ");
      case "gcUltimoMinuto": return [d.etiqueta, d.titular].filter(Boolean).join(" · ");
      case "logoNoticiero": return d.l1 + " " + d.l2;
      case "tickerNoticiero": return (d.items || []).join(" · ");
      case "intro": return d.ciudad + " · " + d.region;
      case "introNoticiero": return d.l1 + " " + d.l2 + " · " + d.titular;
      case "cierre": return [d.superior, d.inferior].filter(Boolean).join(" · ");
      case "transicion": var es = CG.ESCENAS[d.escena]; return es ? es.n : d.escena;
      case "mencion": return d.marca;
      case "telefono": return d.numero || "sin número";
      case "pregunta": return d.pregunta;
      case "marcador": return (d.filas || []).length + " participantes";
      case "video": var m = (estado.biblioteca || []).filter(function (x) { return x.id === d.media; })[0]; return m ? ({chroma: "Quitar verde", alfa: "Transparente", normal: "Normal"}[d.modo] || "") : "Sin video";
      default: return P[e.plantilla].nombre;
    }
  }
  function resumenLimpio(e) { return String(resumen(e) || "").split(" · ").map(function (x) { return CG.esPendiente(x) ? "⚠ " + x.trim() : x; }).join(" · "); }
  function badgeAire(e) { return e.on ? '<span class="badge' + (salidas === 0 ? " sinsal" : "") + '" title="' + (salidas === 0 ? "Programada, pero no hay ninguna salida conectada" : "En pantalla") + '">' + (salidas === 0 ? "PROG." : "AIRE") + '</span>' : ""; }
  function dibujarLista() {
    $("#ahora").hidden = $("#bloques").hidden = vista !== "libreto";
    $$(".vistas button").forEach(function (b) { b.classList.toggle("on", b.dataset.vista === vista); });
    if (vista === "libreto" && estado.escaleta) { dibujarEscaleta(); return; }
    var cont = $("#cats"), q = busqueda.toLowerCase(), html = "", total = 0;
    CG.CATEGORIAS.forEach(function (c) {
      var items = estado.elementos.filter(function (e) {
        var p = P[e.plantilla]; if (!p || p.cat !== c.id) { return false; }
        if (filtro === "fav" && !e.fav) { return false; }
        if (filtro === "aire" && !e.on) { return false; }
        if (q && (e.nombre + " " + resumen(e) + " " + p.nombre).toLowerCase().indexOf(q) < 0) { return false; }
        return true;
      });
      if (!items.length && (filtro !== "todo" || q)) { return; }
      total += items.length;
      var aire = items.filter(function (e) { return e.on; }).length, abierta = abiertas[c.id] || !!q || filtro !== "todo";
      html += '<div class="cat' + (abierta ? " abierta" : "") + '" data-cat="' + c.id + '"><button class="cat-cab" title="' + esc(c.ayuda) + '"><svg class="fl"><use href="#i-flecha"/></svg><svg><use href="#i-' + c.icono + '"/></svg><span class="nc">' + esc(c.nombre) + '</span>' +
        (aire ? '<span class="aire" title="' + aire + ' al aire">● ' + aire + '</span>' : '') + '<span class="n">' + items.length + '</span></button><div class="cat-items"><div>' +
        items.map(function (e) {
          var ev = esEvento(e);
          return '<div class="it' + (e.on ? " on" : "") + (e.id === sel ? " sel" : "") + (ev ? " evento" : "") + '" data-id="' + e.id + '" tabindex="0">' +
            '<button class="fav' + (e.fav ? " on" : "") + '" title="Favorito"><svg><use href="#i-estrella"/></svg></button>' +
            '<div class="nom">' + esc(e.nombre) + '<span class="sub">' + esc(resumenLimpio(e)) + '</span></div>' +
            (difiere(e) ? '<i class="cambios" title="Tiene cambios sin enviar"></i>' : '') +
            badgeAire(e) +
            '<button class="go" title="' + (ev ? "Lanzar ahora" : e.on ? "Ocultar" : "Mostrar ahora") + '"><svg><use href="#i-' + (ev ? "rayo" : e.on ? "stop" : "play") + '"/></svg></button></div>';
        }).join("") +
        (items.length ? '' : '<div class="lista-vacia" style="padding:8px 12px;text-align:left">Vacío. Usa <b>+ Nueva</b>.</div>') + '</div></div></div>';
    });
    if (!total && (filtro !== "todo" || q)) { html = '<div class="lista-vacia">' + (filtro === "fav" ? "Aún no tienes favoritos. Toca la ★ de una gráfica." : filtro === "aire" ? "No hay nada al aire." : "No se encontró nada.") + '</div>'; }
    cont.innerHTML = html;
  }
  /* ======================= ESCALETA (orden del libreto) ======================= */
  function pasos() { return (estado.escaleta && estado.escaleta.pasos) || []; }
  function pasoActual() { var ps = pasos(); return ps.filter(function (p) { return p.id === estado.paso; })[0] || ps[0]; }
  function tipoEtiqueta(e) { var t = CG.tipoDe(e); return '<span class="tipo tp-' + t + '">' + esc((CG.TIPOS[t] || t)).toUpperCase() + '</span>'; }
  function temaDe(e) {
    var d = e.datos || {};
    if (e.plantilla === "gcPersona") { return d.estilo === "noticiero" ? "noticiero" : "programa"; }
    if (e.plantilla === "transicion") { return {pase_noticiero: "noticiero", nota: "noticiero", cierre_noticiero: "noticiero", vtr01: "vtr", vtr02: "vtr", vtr03: "vino", bloque2: "vino", pina_papa: "pina"}[d.escena] || "programa"; }
    if (e.plantilla === "fondo" || e.plantilla === "placa") { return {noticiero: "noticiero", vtr: "vtr", vino: "vino", cierre: "cierre", tropical: "pina"}[d.tipo || d.fondo] || "programa"; }
    if (d.color && /^[a-z]+$/.test(d.color)) { return {azul: "noticiero", ketchup: "concurso", mostaza: "vtr", palta: "palta", vino: "vino", pina: "pina"}[d.color] || "programa"; }
    return ({gcNoticiero: "noticiero", gcUltimoMinuto: "noticiero", logoNoticiero: "noticiero", tickerNoticiero: "noticiero", introNoticiero: "noticiero", zocalo: "noticiero", enVivo: "concurso", video: "video", temporizador: "concurso"}[e.plantilla] || "programa");
  }
  function dibujarEscaleta() {
    var cont = $("#cats"), q = busqueda.toLowerCase(), act = pasoActual(), html = "", hay = 0, ps = pasos();
    ps.forEach(function (p, ip) {
      var filas = p.items.map(function (id, i) { return {e: el(id), i: i}; }).filter(function (x) {
        if (!x.e || !P[x.e.plantilla]) { return false; }
        if (filtro === "fav" && !x.e.fav) { return false; }
        if (filtro === "aire" && !x.e.on) { return false; }
        if (q && (x.e.nombre + " " + resumen(x.e) + " " + p.titulo).toLowerCase().indexOf(q) < 0) { return false; }
        return true;
      });
      if (!filas.length && (q || filtro !== "todo")) { return; }
      hay += filas.length;
      var aire = filas.filter(function (x) { return x.e.on; }).length;
      if (ip === 0 || ps[ip - 1].bloque !== p.bloque) { html += '<div class="bloque-tit" id="blq' + p.bloque + '">BLOQUE ' + p.bloque + '</div>'; }
      html += '<section class="paso' + (act && act.id === p.id ? " actual" : "") + '" data-paso="' + p.id + '"><button class="paso-cab" title="Marcar como paso actual"><b>' + esc(p.n) + '</b><span class="pt">' + esc(p.titulo) + '</span>' +
        (p.dur ? '<small>' + esc(p.dur) + '</small>' : '') + (aire ? '<span class="aire">● ' + aire + '</span>' : '') + '</button>' +
        (p.ref ? '<p class="ref">' + esc(p.ref) + '</p>' : '') +
        filas.map(function (x) {
          var e = x.e, ev = esEvento(e), pend = CG.pendientesDe(e), vid = e.plantilla === "video" && !e.datos.media;
          return '<div class="it esc' + (e.on ? " on" : "") + (e.id === sel ? " sel" : "") + (ev ? " evento" : "") + (pend.length ? " pend" : "") + '" data-id="' + e.id + '" data-paso="' + p.id + '" data-i="' + x.i + '" tabindex="0">' +
            '<span class="num">' + esc(p.n) + '.' + (x.i + 1) + '</span>' +
            '<span class="mini-ic tm-' + esc(temaDe(e)) + '"><svg><use href="#i-' + (P[e.plantilla].icono || "punto") + '"/></svg></span>' +
            '<div class="nom">' + esc(e.nombre) + '<span class="sub">' + tipoEtiqueta(e) + esc(resumenLimpio(e)) + '</span></div>' +
            (difiere(e) ? '<i class="cambios" title="Tiene cambios sin enviar"></i>' : '') +
            (pend.length ? '<span class="bpend" title="Falta: ' + esc(pend.join(", ")) + '"><svg><use href="#i-alerta"/></svg></span>' : '') + badgeAire(e) +
            (ordenEdit ? '<span class="ord"><button class="o-up" title="Subir"><svg><use href="#i-arriba"/></svg></button><button class="o-dn" title="Bajar"><svg><use href="#i-abajo"/></svg></button><button class="o-x" title="Quitar de este paso (la gráfica no se borra)"><svg><use href="#i-x"/></svg></button></span>'
              : '<button class="go" title="' + (vid ? "Falta el video: toca para subirlo" : ev ? "Lanzar ahora" : "Mostrar") + '"><svg><use href="#i-' + (vid ? "subir" : ev ? "rayo" : "play") + '"/></svg></button>' +
                (ev ? '' : '<button class="qt" title="Retirar"' + (e.on ? '' : ' disabled') + '><svg><use href="#i-stop"/></svg></button>')) + '</div>';
        }).join("") +
        (ordenEdit ? '<button class="btn mini agregar" data-paso="' + p.id + '"><svg><use href="#i-mas"/></svg>Agregar gráfica a este paso</button>' : '') + '</section>';
    });
    if (!hay && (q || filtro !== "todo")) { html = '<div class="lista-vacia">' + (filtro === "aire" ? "No hay nada al aire." : filtro === "fav" ? "Sin favoritos en la escaleta." : "No se encontró nada.") + '</div>'; }
    html += '<div class="esc-pie"><button class="btn mini" id="bOrden">' + (ordenEdit ? "Listo" : "Ajustar orden") + '</button>' + (estado.escaleta.modificada ? '<span class="mod" title="El orden ya no es exactamente el del libreto. Puedes restaurarlo en Ajustes.">Orden modificado</span>' : '<span class="ok">Orden del libreto</span>') + '</div>';
    cont.innerHTML = html;
    ahora();
  }
  function ahora() {
    var ps = pasos(), act = pasoActual(); if (!act) { return; }
    var i = ps.indexOf(act), sig = ps[i + 1];
    $("#ahoraTit").textContent = act.n + " · " + act.titulo;
    $("#sigTit").textContent = sig ? "Sigue: " + sig.n + " · " + sig.titulo : "Último paso";
    $("#bloques").innerHTML = [1, 2].map(function (b) { return '<button data-b="' + b + '" class="' + (act.bloque === b ? "on" : "") + '">Bloque ' + b + '</button>'; }).join("");
  }
  function irPaso(id, desplazar) {
    estado.paso = id; publicar();
    if (desplazar !== false) { var s2 = $('.paso[data-paso="' + id + '"]'); if (s2) { s2.scrollIntoView({block: "start", behavior: "smooth"}); } }
  }
  function moverPaso(d) { var ps = pasos(), i = ps.indexOf(pasoActual()) + d; if (ps[i]) { irPaso(ps[i].id); } }
  $("#pAnt").onclick = function () { moverPaso(-1); };
  $("#pSig").onclick = function () { moverPaso(1); };
  $("#bloques").addEventListener("click", function (ev) { var b = ev.target.closest("button"); if (!b) { return; } var t = $("#blq" + b.dataset.b); if (t) { t.scrollIntoView({block: "start", behavior: "smooth"}); } });
  $$(".vistas button").forEach(function (b) { b.onclick = function () { vista = b.dataset.vista; guardarLS("cg_vista", vista); dibujarLista(); }; });
  function editarOrden(pasoId, fn) { var p = pasos().filter(function (x) { return x.id === pasoId; })[0]; if (!p) { return; } fn(p); estado.escaleta.modificada = true; publicar(); }

  $("#cats").addEventListener("click", function (ev) {
    if (ev.target.closest("#bOrden")) { ordenEdit = !ordenEdit; dibujarLista(); return; }
    var pc = ev.target.closest(".paso-cab"); if (pc) { irPaso(pc.parentNode.dataset.paso, false); return; }
    var ag = ev.target.closest(".agregar"); if (ag) { agregarAPaso(ag.dataset.paso); return; }
    var ordB = ev.target.closest(".ord button");
    if (ordB) {
      var row = ordB.closest(".it"), i = +row.dataset.i;
      editarOrden(row.dataset.paso, function (p) {
        if (ordB.classList.contains("o-x")) { p.items.splice(i, 1); }
        else { var j = i + (ordB.classList.contains("o-up") ? -1 : 1); if (j >= 0 && j < p.items.length) { var t = p.items[i]; p.items[i] = p.items[j]; p.items[j] = t; } }
      });
      return;
    }
    var qt = ev.target.closest(".qt"); if (qt) { ocultar(qt.closest(".it").dataset.id); return; }
    var cab = ev.target.closest(".cat-cab");
    if (cab) { var c = cab.parentNode, id = c.dataset.cat; abiertas[id] = !c.classList.contains("abierta"); c.classList.toggle("abierta", abiertas[id]); guardarLS("cg_cats_abiertas", abiertas); return; }
    var it = ev.target.closest(".it"); if (!it) { return; }
    var id2 = it.dataset.id, e = el(id2);
    if (ev.target.closest(".fav")) { e.fav = !e.fav; publicar(); if (sel === id2) { fichaCab(); } return; }
    if (ev.target.closest(".go")) { if (esEvento(e)) { lanzar(id2); } else if (e.on) { ocultar(id2); } else { mostrar(id2); } return; }
    seleccionar(id2);
    if (esMovil()) { vistaMovil("editar"); }
  });
  $("#cats").addEventListener("keydown", function (ev) { var it = ev.target.closest(".it"); if (it && (ev.key === "Enter" || ev.key === " ")) { ev.preventDefault(); seleccionar(it.dataset.id); } });
  $("#qBuscar").addEventListener("input", function () { busqueda = this.value; dibujarLista(); });
  $$(".filtros button").forEach(function (b) { b.onclick = function () { filtro = b.dataset.f; $$(".filtros button").forEach(function (x) { x.classList.toggle("on", x === b); }); dibujarLista(); }; });

  function agregarAPaso(pasoId) {
    var opts = estado.elementos.filter(function (e) { return P[e.plantilla]; }).map(function (e) { return '<option value="' + esc(e.id) + '">' + esc(e.nombre) + ' — ' + esc(P[e.plantilla].nombre) + '</option>'; }).join("");
    var c = modal("<h2>Agregar gráfica al paso</h2><p class='lead'>La gráfica se reutiliza (no se copia): si ya está en otro paso, es la misma.</p><div class='campo'><select id='agSel'>" + opts + "</select></div><div class='modal-pie'><button class='btn' data-r='0'>Cancelar</button><button class='btn prim' data-r='1'>Agregar</button></div>");
    $("[data-r='0']", c).onclick = cerrarModal;
    $("[data-r='1']", c).onclick = function () { var v = $("#agSel").value; cerrarModal(); editarOrden(pasoId, function (p) { p.items.push(v); }); };
  }
  function listaPendientes() {
    var r = [];
    estado.elementos.forEach(function (e) {
      var pe = CG.pendientesDe(e); if (!pe.length) { return; }
      var en = pasos().filter(function (p) { return p.items.indexOf(e.id) >= 0; }).map(function (p) { return p.n; });
      r.push({e: e, pend: pe, pasos: en});
    });
    return r;
  }
  function pendientes() {
    var n = 0; listaPendientes().forEach(function (x) { n += x.pend.length; });
    var b = $("#pPend"); b.hidden = !n; $("span", b).textContent = n + (n === 1 ? " pendiente" : " pendientes");
  }
  $("#pPend").onclick = function () {
    var l = listaPendientes();
    var c = modal("<h2>Recursos pendientes</h2><p class='lead'>Son marcadores de trabajo: <b>no son archivos reales</b> y nunca aparecen en pantalla. Complétalos cuando producción los entregue.</p>" +
      "<div class='pend-lista'>" + l.map(function (x) { return "<button class='pend-it' data-id='" + esc(x.e.id) + "'><span class='pn'>" + (x.pasos.length ? esc(x.pasos.join(", ")) : "—") + "</span><span><b>" + esc(x.e.nombre) + "</b><small>" + esc(x.pend.join(" · ")) + "</small></span></button>"; }).join("") + "</div>" +
      "<p class='nota-m'>Nombre del conductor, conductor del noticiero y número telefónico se completan de una vez en <b>Ajustes → Datos del programa</b>.</p>", {ancho: true});
    $$(".pend-it", c).forEach(function (b) { b.onclick = function () { cerrarModal(); seleccionar(b.dataset.id); if (esMovil()) { vistaMovil("editar"); } }; });
  };

  /* ------------------------------------------------------------------ EDITOR */
  function seleccionar(id) {
    sel = id; guardarLS("cg_sel_" + sala, id);
    $$(".it").forEach(function (i) { i.classList.toggle("sel", i.dataset.id === id); });
    var e = el(id);
    $("#vacio").hidden = !!e; $("#ficha").hidden = !e; $("#accion").hidden = !e;
    if (!e) { pvw(); return; }
    var f = $("#ficha"); f.style.animation = "none"; void f.offsetWidth; f.style.animation = "";
    fichaCab(); dibujarCampos(); estadoFicha(); extras(); pvw();
  }
  function fichaCab() {
    var e = el(sel); if (!e) { return; }
    var p = P[e.plantilla], c = CG.CATEGORIAS.filter(function (x) { return x.id === p.cat; })[0];
    $("#fNombre").value = e.nombre;
    var enPasos = pasos().filter(function (x) { return x.items.indexOf(e.id) >= 0; }).map(function (x) { return x.n; });
    $("#fTipo").innerHTML = '<svg><use href="#i-' + (p.icono || c.icono) + '"/></svg>' + tipoEtiqueta(e) + esc(p.nombre) + (enPasos.length ? " · paso " + esc(enPasos.join(", ")) : " · " + esc(c.nombre));
    $("#fFav").classList.toggle("on", !!e.fav);
  }
  $("#fNombre").addEventListener("change", function () { var e = el(sel); if (e && this.value.trim()) { e.nombre = this.value.trim().slice(0, 60); publicar(); } });
  $("#fFav").onclick = function () { var e = el(sel); e.fav = !e.fav; publicar(); fichaCab(); };
  $("#fDuplicar").onclick = function () {
    var e = el(sel), c = clon(e); c.id = CG.nuevoId(); c.on = false; c.nombre = (e.nombre + " (copia)").slice(0, 60); c.datos = clon(borrador(sel)); delete c.datos.cmd;
    if (c.datos.run) { c.datos.run = {estado: "detenido", restante: c.datos.segundos, marca: 0}; }
    estado.elementos.splice(estado.elementos.indexOf(e) + 1, 0, c); publicar(); seleccionar(c.id); toast("Duplicado. Ahora editas la copia.", "ok");
  };
  $("#fBorrar").onclick = function () {
    var e = el(sel);
    confirmar("¿Eliminar «" + e.nombre + "»?", e.on ? "Está al aire: se ocultará y se eliminará." : "Esta gráfica se borrará de la sala.", "Eliminar", true).then(function (ok) {
      if (!ok) { return; }
      var i = estado.elementos.indexOf(e), copia = clon(e);
      estado.elementos.splice(i, 1); delete borr[e.id]; guardarBorr(); publicar();
      seleccionar(null);
      toast("Eliminada", "", {txt: "Deshacer", fn: function () { copia.on = false; estado.elementos.splice(i, 0, copia); publicar(); seleccionar(copia.id); }});
    });
  };

  function visible(f, d) {
    if (!f.si) { return true; }
    var m = f.si.split("="), v = d[m[0]];
    return String(v === undefined ? "" : v) === m[1];
  }
  function dibujarCampos() {
    var e = el(sel), p = P[e.plantilla], d = borrador(sel), cont = $("#campos"), grupos = [], porG = {};
    p.campos.forEach(function (f) { var g = f.g || "Texto"; if (!porG[g]) { porG[g] = []; grupos.push(g); } porG[g].push(f); });
    cont.innerHTML = '<p class="desc-tpl">' + esc(p.desc || "") + '</p>';
    var abiertosG = Object.assign({Texto: true, Video: true, Chroma: true, "Reproducción": true, Llamadas: true, Respuesta: true, Marca: true}, leerLS("cg_grupos_abiertos", {}));
    grupos.forEach(function (g, gi) {
      var det = document.createElement("details"); det.className = "grupo"; det.open = abiertosG[g] !== undefined ? abiertosG[g] : gi === 0;
      det.innerHTML = "<summary><svg><use href='#i-flecha'/></svg>" + esc(g) + "</summary><div class='gc'></div>";
      det.addEventListener("toggle", function () { abiertosG[g] = det.open; guardarLS("cg_grupos_abiertos", abiertosG); });
      var gc = $(".gc", det);
      porG[g].forEach(function (f) { gc.appendChild(campo(f, d)); });
      cont.appendChild(det);
    });
    condicionales();
  }
  function condicionales() {
    var d = borrador(sel); if (!d) { return; }
    $$("#campos .campo[data-si]").forEach(function (c) { c.hidden = !visible({si: c.dataset.si}, d); });
  }
  function cambio(k, v, sinRedibujar) {
    var d = borrador(sel); d[k] = v;
    guardarBorr(); pvw(); estadoFicha(); condicionales(); marcarItem();
    var e = el(sel);
    if ($("#aVivo").checked && e.on && !esEvento(e)) { vivoDeb(); }
  }
  var vivoDeb = debounce(function () { var e = el(sel); if (e && e.on && difiere(e)) { mostrar(sel, true); } }, 380);
  function marcarItem() { var it = $('.it[data-id="' + sel + '"]'), e = el(sel); if (!it || !e) { return; } var tiene = !!$(".cambios", it); if (tiene !== difiere(e)) { dibujarLista(); } }

  function campo(f, d) {
    var w = document.createElement("div"), id = "c_" + f.k;
    w.className = "campo" + (/lista|lineas|media/.test(f.t) ? " ancho" : ""); if (f.si) { w.dataset.si = f.si; }
    var lab = '<label for="' + id + '">' + esc(f.l) + (f.ayuda ? ' <span class="ay" title="' + esc(f.ayuda) + '">?</span>' : '') + '</label>';
    var v = d[f.k];
    switch (f.t) {
      case "text":
        w.innerHTML = lab + '<input type="text" id="' + id + '" autocomplete="off" spellcheck="true">';
        var inp = $("input", w); inp.value = v == null ? "" : v; inp.oninput = function () { cambio(f.k, inp.value); };
        break;
      case "lineas":
        w.innerHTML = lab + '<textarea id="' + id + '" spellcheck="true"></textarea><span class="nota">Un mensaje por línea.</span>';
        var ta = $("textarea", w); ta.value = (v || []).join("\n"); ta.oninput = function () { cambio(f.k, ta.value.split("\n").map(function (s) { return s.trim(); }).filter(Boolean)); };
        break;
      case "color":
        w.innerHTML = lab + colorHTML(id, v);
        conectarColor(w, function (c) { cambio(f.k, c); });
        break;
      case "range":
        w.innerHTML = lab + '<div class="rango"><input type="range" id="' + id + '" min="' + f.min + '" max="' + f.max + '" step="' + (f.step || 1) + '"><input class="num" type="number" min="' + f.min + '" max="' + f.max + '" step="' + (f.step || 1) + '"><span class="u">' + esc(f.u || "") + '</span></div>';
        var r = $("input[type=range]", w), n = $(".num", w); r.value = n.value = v;
        r.oninput = function () { n.value = r.value; cambio(f.k, +r.value); };
        n.onchange = function () { var x = Math.min(f.max, Math.max(f.min, +n.value || 0)); n.value = r.value = x; cambio(f.k, x); };
        break;
      case "toggle":
        w.innerHTML = '<label class="tog"><input type="checkbox" id="' + id + '"><span class="sw2"></span><span>' + esc(f.l) + '</span>' + (f.ayuda ? ' <span class="ay" title="' + esc(f.ayuda) + '">?</span>' : '') + '</label>';
        var cb = $("input", w); cb.checked = !!v; cb.onchange = function () { cambio(f.k, cb.checked); if (f.k === "revelar") { var e = el(sel); if (e && e.on) { e.datos.revelar = cb.checked; publicar(); toast(cb.checked ? "Respuesta revelada en pantalla" : "Respuesta oculta", "ok"); } } };
        break;
      case "seg":
        w.innerHTML = lab + '<div class="seg" role="radiogroup">' + f.o.map(function (o) { return '<button type="button" data-v="' + esc(o[0]) + '" class="' + (String(v) === o[0] ? "on" : "") + '">' + esc(o[1]) + '</button>'; }).join("") + '</div>';
        $$(".seg button", w).forEach(function (b) { b.onclick = function () { $$(".seg button", w).forEach(function (x) { x.classList.toggle("on", x === b); }); cambio(f.k, b.dataset.v); }; });
        break;
      case "lista":
        var subs = f.campos || [];
        w.innerHTML = lab + '<div class="lista-items"></div><button type="button" class="btn mini" style="align-self:flex-start"><svg><use href="#i-mas"/></svg>Agregar</button>';
        var li = $(".lista-items", w);
        var pintar = function () {
          var arr = borrador(sel)[f.k] || [];
          li.innerHTML = "";
          arr.forEach(function (it, i) {
            var row = document.createElement("div"); row.className = "li";
            row.style.gridTemplateColumns = subs.map(function (sf) { return sf.t === "color" ? "auto" : sf.ancho ? sf.ancho + "px" : "minmax(0,1fr)"; }).join(" ") + " auto";
            row.innerHTML = subs.map(function (sf) { return sf.t === "color" ? '<input type="color" data-k="' + sf.k + '" title="' + esc(sf.l) + '">' : '<input type="text" data-k="' + sf.k + '" placeholder="' + esc(sf.ph || sf.l) + '" aria-label="' + esc(sf.l) + '">'; }).join("") +
              '<button type="button" class="q" title="Quitar"><svg><use href="#i-basura"/></svg></button>';
            $$("[data-k]", row).forEach(function (x) { x.value = it[x.dataset.k] || (x.type === "color" ? "#000000" : ""); x.oninput = function () { arr[i][x.dataset.k] = x.value; cambio(f.k, arr); }; });
            $(".q", row).onclick = function () { if (f.k === "mensajes" && arr.length <= 1) { toast("Debe quedar al menos un mensaje", "err"); return; } arr.splice(i, 1); cambio(f.k, arr); pintar(); };
            li.appendChild(row);
          });
          if (!arr.length) { li.innerHTML = '<span class="nota">Vacío. Usa «Agregar».</span>'; }
        };
        pintar();
        $("button.btn", w).onclick = function () { var arr = (borrador(sel)[f.k] || []).slice(); arr.push(clon(f.nuevo)); cambio(f.k, arr); pintar(); var ins = $$(".li input[type=text]", li); if (ins.length) { ins[ins.length - subs.filter(function (x) { return x.t !== "color"; }).length].focus(); } };
        break;
      case "select":
        w.innerHTML = lab + '<select id="' + id + '">' + f.o.map(function (o) { return '<option value="' + esc(o[0]) + '">' + esc(o[1]) + '</option>'; }).join("") + '</select>';
        var se = $("select", w); se.value = v == null ? "" : v; se.onchange = function () { cambio(f.k, se.value); };
        break;
      case "cupos":
        w.innerHTML = lab + '<div class="cupos-ed"></div><span class="nota">Toca cada llamada para cambiar: libre → llamando → correcto → incorrecto. Si está al aire se actualiza al instante.</span>';
        var ce = $(".cupos-ed", w), N = {libre: "Libre", llamando: "Llamando", correcto: "Correcto", incorrecto: "Incorrecto"};
        var pintarC = function () {
          var arr = borrador(sel)[f.k] || [];
          ce.innerHTML = arr.map(function (c, i) { return '<button type="button" class="ce c-' + esc(c) + '" data-i="' + i + '"><b>' + (i + 1) + '</b><span>' + N[c] + '</span></button>'; }).join("");
          $$("button", ce).forEach(function (b) {
            b.onclick = function () {
              var a2 = (borrador(sel)[f.k] || []).slice(), i = +b.dataset.i; a2[i] = CG.ESTADOS_CUPO[(CG.ESTADOS_CUPO.indexOf(a2[i]) + 1) % CG.ESTADOS_CUPO.length];
              cambio(f.k, a2); pintarC();
              var e = el(sel); if (e && e.on) { e.datos[f.k] = a2.slice(); publicar(); }
            };
          });
        };
        pintarC();
        break;
      case "imagen":
        w.innerHTML = lab + '<div class="img"><div class="miniat"></div><button type="button" class="btn mini" data-a="elegir"><svg><use href="#i-subir"/></svg>Elegir imagen</button><button type="button" class="btn mini" data-a="quitar">Quitar</button></div>';
        var mini = $(".miniat", w);
        var ver = function (u) { mini.classList.toggle("vacia", !u); mini.style.backgroundImage = u ? "url('" + u.replace(/'/g, "%27") + "')" : ""; $("[data-a=quitar]", w).hidden = !u; };
        ver(v);
        $("[data-a=elegir]", w).onclick = function () { elegirImagen(function (u) { ver(u); cambio(f.k, u); }); };
        $("[data-a=quitar]", w).onclick = function () { ver(""); cambio(f.k, ""); };
        break;
      case "media":
        w.innerHTML = lab + '<div class="media"><select id="' + id + '"></select><button type="button" class="btn mini"><svg><use href="#i-subir"/></svg>Subir video</button></div><span class="nota"></span>';
        var s = $("select", w), nota = $(".nota", w);
        var llenar = function (val) {
          s.innerHTML = '<option value="">— Elige un video —</option>' + (estado.biblioteca || []).map(function (m) { return '<option value="' + esc(m.id) + '">' + esc(m.nombre) + (m.local ? " (solo este equipo)" : m.incluido ? " (incluido)" : "") + '</option>'; }).join("");
          s.value = val || "";
          var m = (estado.biblioteca || []).filter(function (x) { return x.id === s.value; })[0];
          nota.textContent = m ? ({alfa: "Archivo con transparencia real.", chroma: "Archivo con fondo verde: se quita con «Quitar verde».", normal: "Video sin transparencia."}[m.modo] || "") + (m.dur ? " Dura " + Math.round(m.dur) + " s." : "") + (m.local ? " Guardado solo en este equipo." : "") : "";
        };
        llenar(v);
        s.onchange = function () { var m = (estado.biblioteca || []).filter(function (x) { return x.id === s.value; })[0]; cambio(f.k, s.value); if (m && m.modo) { cambio("modo", m.modo); dibujarCampos(); } else { llenar(s.value); } };
        $("button", w).onclick = function () { abrirSubida(function (m) { cambio(f.k, m.id); cambio("modo", m.modo); if (m.chroma) { Object.keys(m.chroma).forEach(function (k) { cambio(k, m.chroma[k]); }); } dibujarCampos(); }); };
        break;
    }
    return w;
  }
  function colorHTML(id, v) {
    return '<div class="color"><input type="color" id="' + (id || "") + '" value="' + esc(v || "#ffffff") + '"><input class="hex" value="' + esc((v || "").toUpperCase()) + '" maxlength="7" spellcheck="false"><div class="sw">' +
      CG.PALETA.map(function (c) { return '<button type="button" style="background:' + c + '" data-c="' + c + '" title="' + c + '"></button>'; }).join("") + '</div></div>';
  }
  function conectarColor(w, fn) {
    var ci = $("input[type=color]", w), hx = $(".hex", w);
    function poner(c) { c = c.toUpperCase(); ci.value = c; hx.value = c; fn(c); }
    ci.oninput = function () { hx.value = ci.value.toUpperCase(); fn(ci.value.toUpperCase()); };
    hx.onchange = function () { var c = hx.value.trim(); if (!/^#/.test(c)) { c = "#" + c; } if (/^#[0-9a-f]{6}$/i.test(c)) { poner(c); } else { hx.value = ci.value.toUpperCase(); toast("Color no válido. Usa el formato #RRGGBB", "err"); } };
    $$(".sw button", w).forEach(function (b) { b.onclick = function () { poner(b.dataset.c); }; });
  }

  /* estado de la ficha + botones de acción */
  function estadoFicha() {
    var e = sel && el(sel); if (!e) { return; }
    var ev = esEvento(e), cambios = difiere(e), h = "";
    if (ev) { h += '<span class="chip">Se lanza una vez y se va sola</span>'; }
    else if (e.on) { h += '<span class="chip aire">AL AIRE</span>'; }
    else { h += '<span class="chip">No está al aire</span>'; }
    var pe = CG.pendientesDe({datos: borrador(sel), pend: e.pend});
    if (pe.length) { h += '<span class="chip pendc" title="Estos datos no aparecen en pantalla hasta completarlos">⚠ Falta: ' + esc(pe.join(", ")) + '</span>'; }
    if (cambios) { h += '<span class="chip cambios">● Cambios sin enviar</span><span class="chip desc" id="descartar" title="Volver a lo que está guardado">Descartar cambios</span>'; }
    else if (!ev) { h += '<span class="chip ok">' + (e.on ? "Vista previa = al aire" : "Sin cambios") + '</span>'; }
    $("#fEstado").innerHTML = h;
    var d = $("#descartar"); if (d) { d.onclick = function () { borr[sel] = clon(el(sel).datos); guardarBorr(); dibujarCampos(); estadoFicha(); pvw(); dibujarLista(); }; }
    var bM = $("#aMostrar"), bO = $("#aOcultar"), bG = $("#aGuardar");
    bM.className = "btn pgm"; bO.hidden = ev; bG.disabled = !cambios;
    $("#aPrevia span").textContent = ev ? "Probar" : "Vista previa";
    if (ev) { bM.classList.add("lanzar"); $("span", bM).textContent = e.plantilla === "cortina" ? "LANZAR CORTINA" : "LANZAR AVISO"; $("use", bM).setAttribute("href", "#i-rayo"); }
    else if (e.on && cambios) { bM.classList.add("actualizar"); $("span", bM).textContent = "ACTUALIZAR"; $("use", bM).setAttribute("href", "#i-repetir"); }
    else if (e.on) { bM.classList.add("igual"); $("span", bM).textContent = "AL AIRE"; $("use", bM).setAttribute("href", "#i-punto"); }
    else { $("span", bM).textContent = "MOSTRAR"; $("use", bM).setAttribute("href", "#i-play"); }
    bO.disabled = !e.on; bO.classList.toggle("activo", !!e.on);
    bG.title = e.on ? "Guardar y actualizar al aire" : "Guardar sin mostrar";
  }
  /* controles extra: video y temporizador */
  var relojExtra = 0;
  function extras() {
    var e = sel && el(sel), x = $("#aExtra"); clearInterval(relojExtra); x.innerHTML = "";
    if (!e) { return; }
    if (e.plantilla === "video") {
      x.innerHTML = '<span class="et">Video</span><button class="btn mini" data-a="play"><svg><use href="#i-play"/></svg>Reproducir</button><button class="btn mini" data-a="pausa"><svg><use href="#i-pausa"/></svg>Pausa</button><button class="btn mini" data-a="reiniciar"><svg><use href="#i-repetir"/></svg>Desde el inicio</button>';
      $$("[data-a]", x).forEach(function (b) { b.onclick = function () { comando(sel, b.dataset.a); }; });
    }
    if (e.plantilla === "temporizador") {
      x.innerHTML = '<span class="et">Tiempo</span><b id="tmVer" style="font:700 18px ui-monospace,monospace;min-width:64px">--:--</b><button class="btn mini" data-a="iniciar"><svg><use href="#i-play"/></svg>Iniciar</button><button class="btn mini" data-a="pausar"><svg><use href="#i-pausa"/></svg>Pausar</button><button class="btn mini" data-a="reiniciar"><svg><use href="#i-repetir"/></svg>Reiniciar</button>';
      $$("[data-a]", x).forEach(function (b) { b.onclick = function () { comando(sel, b.dataset.a); }; });
      var tick = function () { var ee = el(sel), v = $("#tmVer"); if (!ee || !v) { return; } var s = Math.max(0, Math.ceil(CG.restante(ee.datos))); v.textContent = (s < 600 ? "0" : "") + Math.floor(s / 60) + ":" + (s % 60 < 10 ? "0" : "") + s % 60; v.style.color = (ee.datos.run || {}).estado === "corriendo" ? "var(--pgm)" : ""; };
      tick(); relojExtra = setInterval(tick, 200);
    }
  }
  $("#aMostrar").onclick = function () { var e = el(sel); if (!e) { return; } if (esEvento(e)) { lanzar(sel); } else { mostrar(sel); } };
  $("#aOcultar").onclick = function () { ocultar(sel); };
  $("#aGuardar").onclick = function () { guardarElemento(sel); };
  $("#aPrevia").onclick = function () {
    var e = el(sel); if (!e) { return; }
    if (document.body.classList.contains("tab-control")) { cambiarTab("visual"); }
    if (esEvento(e)) { enviar(ifPVW, {t: "evento", evento: {id: CG.nuevoId(), tipo: e.plantilla, datos: clon(borrador(sel))}}); }
    else { enviar(ifPVW, {t: "repetir"}); }
  };
  $("#mRepetir").onclick = function () { $("#aPrevia").click(); };
  $("#aVivo").checked = leerLS("cg_envivo", false);
  $("#aVivo").onchange = function () { guardarLS("cg_envivo", this.checked); if (this.checked) { toast("Ojo: lo que escribas en una gráfica al aire saldrá de inmediato."); } };

  /* ------------------------------------------------------------------ pestañas */
  function cambiarTab(t) {
    document.body.classList.toggle("tab-visual", t === "visual");
    document.body.classList.toggle("tab-boton", t === "boton");
    document.body.classList.toggle("tab-control", t === "control");
    if (t === "boton" && estado) { dibujarBotonera(); pgm(); }
    $$(".tabs button").forEach(function (b) { b.setAttribute("aria-selected", b.dataset.tab === t ? "true" : "false"); });
    guardarLS("cg_tab", t);
  }
  $$(".tabs button").forEach(function (b) { b.onclick = function () { cambiarTab(b.dataset.tab); }; });
  cambiarTab(leerLS("cg_tab", "control"));

  /* ------------------------------------------------------------------ celular: tres vistas con barra inferior */
  var mqMovil = window.matchMedia("(max-width: 760px)");
  function esMovil() { return mqMovil.matches; }
  function vistaMovil(v) {
    document.body.dataset.mv = v;
    $$("#movNav button").forEach(function (b) { b.classList.toggle("on", b.dataset.mv === v); });
    if (v === "ver") { pvw(); if (estado) { pgm(); } }
    if (v === "boton" && estado) { dibujarBotonera(); }
    window.scrollTo(0, 0);
  }
  $$("#movNav button").forEach(function (b) { b.onclick = function () { vistaMovil(b.dataset.mv); }; });
  vistaMovil("lista");

  /* ------------------------------------------------------------------ modo por equipo: tablet/celular = botonera, computador = completo */
  function tactil() { return window.matchMedia("(pointer: coarse)").matches && !window.matchMedia("(pointer: fine)").matches; }
  function modoDisp(m) {
    if (m) { guardarLS("cg_disp", m); }
    var v = leerLS("cg_disp", "auto"), bot = v === "botonera" || (v === "auto" && tactil());
    var antes = document.body.classList.contains("modo-botonera");
    document.body.classList.toggle("modo-botonera", bot);
    if (bot) { cambiarTab("boton"); if (esMovil()) { vistaMovil("boton"); } }
    else if (antes) { cambiarTab("visual"); if (esMovil()) { vistaMovil("lista"); } }
    if (m && bot !== antes) { toast(bot ? "Este equipo queda como botonera" : "Este equipo muestra el panel completo", "ok"); }
  }
  modoDisp();

  /* ------------------------------------------------------------------ barra superior */
  $("#bCortina").onclick = function () {
    var c = estado.elementos.filter(function (e) { return e.plantilla === "cortina" && e.fav; })[0] || estado.elementos.filter(function (e) { return e.plantilla === "cortina"; })[0];
    if (c) { lanzar(c.id); return; }
    estado.ev = (estado.ev || []).concat({id: CG.nuevoId(), tipo: "cortina", datos: {estilo: "bandas"}, t: Date.now()}).slice(-12); publicar(); toast("Cortina lanzada al aire", "ok");
  };
  $("#bLimpiar").onclick = function () {
    var on = estado.elementos.filter(function (e) { return e.on; });
    estado.ev = (estado.ev || []).concat({id: CG.nuevoId(), tipo: "limpiar", t: Date.now()}).slice(-12);
    on.forEach(function (e) { e.on = false; }); publicar();
    if (!on.length) { toast("Salida limpia (avisos y cortinas retirados)"); return; }
    toast("Se ocultaron " + on.length + " gráfica(s)", "", {txt: "Deshacer", fn: function () { on.forEach(function (e) { var x = el(e.id); if (x) { x.on = true; } }); publicar(); }});
  };
  $("#bNuevo").onclick = nuevaGrafica;
  $("#bRemoto").onclick = remoto;
  $("#bAjustes").onclick = function () { config(); };
  $("#bAyuda").onclick = ayuda;
  document.addEventListener("keydown", function (e) {
    var escribiendo = /input|textarea|select/i.test((document.activeElement || {}).tagName || "");
    if (!escribiendo && $("#modal").hidden && estado && (e.key === "PageDown" || e.key === "PageUp")) { e.preventDefault(); moverPaso(e.key === "PageDown" ? 1 : -1); return; }
    if (e.key === "Escape" && !$("#modal").hidden) { cerrarModal(); return; }
    if (teclaBotonera(e, escribiendo)) { return; }
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter" && sel && $("#modal").hidden) { e.preventDefault(); if (e.shiftKey) { ocultar(sel); } else { $("#aMostrar").click(); } }
  });

  /* ------------------------------------------------------------------ nueva gráfica */
  function nuevaGrafica() {
    var h = "<h2>Nueva gráfica</h2><p class='lead'>Elige una plantilla. Después cambias los textos y colores.</p>";
    CG.CATEGORIAS.forEach(function (c) {
      var ps = Object.keys(P).filter(function (k) { return P[k].cat === c.id; }); if (!ps.length) { return; }
      h += "<h3 style='font-size:12px;color:var(--txt3);text-transform:uppercase;letter-spacing:.06em;margin:14px 0 6px'>" + esc(c.nombre) + "</h3><div class='tpl-grid'>" +
        ps.map(function (k) { return "<button class='tpl' data-p='" + k + "'><b><svg><use href='#i-" + (P[k].icono || c.icono) + "'/></svg>" + esc(P[k].nombre) + "</b><small>" + esc(P[k].desc || "") + "</small></button>"; }).join("") + "</div>";
    });
    var c2 = modal(h, {ancho: true});
    $$(".tpl", c2).forEach(function (b) {
      b.onclick = function () {
        var k = b.dataset.p; cerrarModal();
        if (k === "video") { abrirSubida(); return; }
        var e = CG.crearElemento(k); e.nombre = P[k].nombre + " " + (estado.elementos.filter(function (x) { return x.plantilla === k; }).length + 1);
        estado.elementos.push(e); abiertas[P[k].cat] = true; publicar(); seleccionar(e.id);
        setTimeout(function () { var i = $("#campos input[type=text]"); if (i) { i.select(); } }, 80);
      };
    });
  }

  /* ------------------------------------------------------------------ imágenes */
  function elegirArchivo(accept, fn) { var i = document.createElement("input"); i.type = "file"; i.accept = accept; i.onchange = function () { if (i.files[0]) { fn(i.files[0]); } }; i.click(); }
  function reducirImagen(file, max) {
    return new Promise(function (ok, mal) {
      var u = URL.createObjectURL(file), im = new Image();
      im.onload = function () {
        var k = Math.min(1, max / Math.max(im.width, im.height)), c = document.createElement("canvas"); c.width = Math.round(im.width * k); c.height = Math.round(im.height * k);
        c.getContext("2d").drawImage(im, 0, 0, c.width, c.height); URL.revokeObjectURL(u);
        var d = c.toDataURL("image/webp", 0.86); if (d.indexOf("image/webp") < 0) { d = c.toDataURL("image/png"); } ok(d);
      };
      im.onerror = function () { mal(new Error("No se pudo leer la imagen.")); }; im.src = u;
    });
  }
  function elegirImagen(fn) {
    elegirArchivo("image/png,image/jpeg,image/webp,image/gif,image/svg+xml", function (f) {
      if (!/^image\//.test(f.type)) { toast("Ese archivo no es una imagen.", "err"); return; }
      if (LOCAL) { reducirImagen(f, 900).then(fn, function (e) { toast(e.message, "err"); }); return; }
      if (f.size > 8 * 1024 * 1024) { toast("La imagen pesa más de 8 MB. Usa una más liviana.", "err"); return; }
      toast("Subiendo imagen…");
      con.subirArchivo(f).then(function (r) { fn(r.url); toast("Imagen lista", "ok"); }, function (e) { toast("No se pudo subir la imagen: " + e.message, "err"); });
    });
  }

  /* ------------------------------------------------------------------ SUBIR VIDEO (biblioteca) */
  function detectar(video) {
    /* mira un cuadro del video: ¿trae transparencia real? ¿el borde es verde? */
    if (!(video.readyState >= 2 && video.videoWidth)) { return {modo: "chroma", msg: "No se pudo analizar el video todavía. Elige el tipo a mano."}; }
    try {
      var w = 160, h = Math.max(1, Math.round(160 * video.videoHeight / video.videoWidth)), c = document.createElement("canvas"); c.width = w; c.height = h;
      var x = c.getContext("2d", {willReadFrequently: true}); x.drawImage(video, 0, 0, w, h); var d = x.getImageData(0, 0, w, h).data;
      var transp = 0, verdes = 0, borde = 0, sr = 0, sg = 0, sb = 0, i, px, py;
      for (i = 0; i < d.length; i += 4) { if (d[i + 3] < 245) { transp++; } }
      for (py = 0; py < h; py++) { for (px = 0; px < w; px++) { if (px > 3 && px < w - 4 && py > 3 && py < h - 4) { continue; } i = (py * w + px) * 4; borde++; if (d[i + 1] > d[i] + 45 && d[i + 1] > d[i + 2] + 45) { verdes++; sr += d[i]; sg += d[i + 1]; sb += d[i + 2]; } } }
      if (transp > w * h * 0.02) { return {modo: "alfa", msg: "Detectamos transparencia real en el archivo."}; }
      if (verdes > borde * 0.5) { var hx = function (n) { n = Math.round(n / verdes); return (n < 16 ? "0" : "") + n.toString(16); }; return {modo: "chroma", color: ("#" + hx(sr) + hx(sg) + hx(sb)).toUpperCase(), msg: "Detectamos fondo verde: lo quitaremos con chroma."}; }
      return {modo: "normal", msg: "No vimos transparencia ni fondo verde. Si tiene fondo verde, elige «Quitar verde»."};
    } catch (e) { return {modo: "chroma", msg: "No se pudo analizar el video. Elige el tipo a mano."}; }
  }
  function abrirSubida(alListo) {
    var dest = LOCAL ? "este equipo (modo local)" : "la sala (lo verán todas las salidas)";
    var c = modal(
      "<div class='subida'><h2>Subir video</h2><p class='lead'>Usa videos con fondo verde (MP4 o WebM) o con transparencia real (WebM VP9 con alfa). Se guardará en <b>" + esc(dest) + "</b>.</p>" +
      "<div class='zona' tabindex='0'><svg><use href='#i-subir'/></svg><div><b>Arrastra el video aquí</b> o haz clic para elegirlo</div><small>MP4 · WebM" + (LOCAL ? "" : " · máx. 50 MB") + "</small></div>" +
      "<div class='paso2' hidden>" +
      "<div class='prev-video'><div class='fondoPrueba' title='Probar sobre otro fondo'><button data-bg='checker' style='background:repeating-conic-gradient(#888 0 25%,#ccc 0 50%) 0 0/8px 8px'></button><button data-bg='#000' style='background:#000'></button><button data-bg='#fff' style='background:#fff'></button><button data-bg='#2a5cd6' style='background:#2a5cd6'></button></div></div>" +
      "<div class='aviso-box info det'></div>" +
      "<div class='form-fila'><div class='campo'><label>Nombre</label><input type='text' class='vNombre' maxlength='60'></div>" +
      "<div class='campo'><label>Transparencia <span class='ay' title='MP4 nunca trae transparencia. Si el video tiene fondo verde, usa «Quitar verde».'>?</span></label><div class='seg vModo'><button data-v='chroma'>Quitar verde</button><button data-v='alfa'>Ya es transparente</button><button data-v='normal'>Sin transparencia</button></div></div></div>" +
      "<div class='form-fila vChroma'><div class='campo'><label>Color a quitar <small style='color:var(--txt3)'>(o haz clic sobre el fondo del video)</small></label>" + colorHTML("", "#00FF00") + "</div>" +
      "<div class='campo'><label>Similitud</label><div class='rango'><input type='range' class='vSim' min='1' max='100' value='40'><span class='u vSimN'>40</span></div></div>" +
      "<div class='campo'><label>Suavizar bordes</label><div class='rango'><input type='range' class='vSuav' min='1' max='100' value='8'><span class='u vSuavN'>8</span></div></div>" +
      "<div class='campo'><label>Quitar reflejo verde</label><div class='rango'><input type='range' class='vDerr' min='1' max='100' value='10'><span class='u vDerrN'>10</span></div></div></div>" +
      "<div class='form-fila'><label class='tog'><input type='checkbox' class='vBucle'><span class='sw2'></span><span>Repetir en bucle</span></label><label class='tog'><input type='checkbox' class='vOcultar' checked><span class='sw2'></span><span>Ocultar al terminar</span></label><label class='tog'><input type='checkbox' class='vAudio'><span class='sw2'></span><span>Con sonido</span></label></div>" +
      "<div class='barra-prog' hidden><i></i></div>" +
      "<div class='modal-pie'><button class='btn otro'>Elegir otro</button><button class='btn prim guardar'><svg><use href='#i-guardar'/></svg>Guardar en la biblioteca</button></div></div></div>",
      {ancho: true, alCerrar: limpiar}
    );
    var archivo = null, url = null, video = null, keyer = null, modo = "chroma", chroma = {keyColor: "#00FF00", similitud: 40, suavizado: 8, derrame: 10}, subiendo = false;
    var zona = $(".zona", c), caja = $(".prev-video", c);
    function limpiar() { if (keyer) { keyer.destruir(); keyer = null; } if (video) { video.pause(); video.removeAttribute("src"); video.load(); } if (url) { URL.revokeObjectURL(url); } }
    zona.onclick = function () { elegirArchivo("video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov", cargar); };
    zona.onkeydown = function (e) { if (e.key === "Enter") { zona.click(); } };
    ["dragenter", "dragover"].forEach(function (t) { zona.addEventListener(t, function (e) { e.preventDefault(); zona.classList.add("sobre"); }); });
    ["dragleave", "drop"].forEach(function (t) { zona.addEventListener(t, function (e) { e.preventDefault(); zona.classList.remove("sobre"); }); });
    zona.addEventListener("drop", function (e) { var f = e.dataTransfer.files[0]; if (f) { cargar(f); } });
    $(".otro", c).onclick = function () { limpiar(); archivo = null; $(".paso2", c).hidden = true; zona.hidden = false; };
    function error(msg) { var d = $(".det", c); d.className = "aviso-box err det"; d.textContent = msg; $(".guardar", c).disabled = true; }
    function cargar(f) {
      if (/\.mov$/i.test(f.name) || f.type === "video/quicktime") {
        zona.hidden = true; $(".paso2", c).hidden = false; error("Los archivos .MOV (ProRes) no se pueden reproducir en navegadores ni en la fuente de navegador de OBS. Expórtalo como WebM VP9 con transparencia (alfa) o como MP4 H.264 con fondo verde."); return;
      }
      if (!/^video\/(mp4|webm)$/.test(f.type) && !/\.(mp4|webm)$/i.test(f.name)) { toast("Formato no permitido. Usa MP4 o WebM.", "err"); return; }
      if (!LOCAL && f.size > 50 * 1024 * 1024) { toast("El video pesa " + Math.round(f.size / 1048576) + " MB. El máximo es 50 MB: recórtalo o bájale la calidad.", "err"); return; }
      limpiar(); archivo = f; url = URL.createObjectURL(f);
      zona.hidden = true; $(".paso2", c).hidden = false; $(".guardar", c).disabled = false;
      $(".vNombre", c).value = f.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").slice(0, 60);
      $$("video,canvas", caja).forEach(function (x) { x.remove(); });
      video = document.createElement("video"); video.muted = true; video.loop = true; video.playsInline = true; video.src = url;
      video.onerror = function () { error("Este navegador no puede reproducir el archivo. Prueba exportarlo como MP4 (H.264) o WebM (VP9)."); };
      var intentos = 0, vActual = video;
      (function analizar() {
        if (vActual !== video) { return; }
        if (!(video.readyState >= 2 && video.videoWidth && video.currentTime > 0.05) && intentos++ < 60) { setTimeout(analizar, 200); return; }
        var r = detectar(video); var d = $(".det", c); d.className = "aviso-box info det"; d.textContent = r.msg;
        if (r.color) { chroma.keyColor = r.color; $(".vChroma input[type=color]", c).value = r.color; $(".vChroma .hex", c).value = r.color; }
        ponerModo(r.modo);
      })();
      video.play().catch(function () {});
      ponerModo("chroma");
    }
    function ponerModo(m) {
      modo = m; $$(".vModo button", c).forEach(function (b) { b.classList.toggle("on", b.dataset.v === m); });
      $(".vChroma", c).hidden = m !== "chroma";
      $$("video,canvas", caja).forEach(function (x) { x.remove(); });
      if (keyer) { keyer.destruir(); keyer = null; }
      if (m === "chroma") {
        var cv = document.createElement("canvas"); caja.appendChild(cv);
        try { keyer = CG.Chroma(cv, video); keyer.config(chroma); } catch (e) { error("Este equipo no soporta WebGL, no se puede quitar el verde aquí."); }
        cv.onclick = function (ev) { elegirColorDe(ev, cv); };
      } else { caja.appendChild(video); }
      video.play().catch(function () {});
    }
    function elegirColorDe(ev, cv) {
      var r = cv.getBoundingClientRect(), k = Math.min(r.width / video.videoWidth, r.height / video.videoHeight), ox = (r.width - video.videoWidth * k) / 2, oy = (r.height - video.videoHeight * k) / 2;
      var x = (ev.clientX - r.left - ox) / k, y = (ev.clientY - r.top - oy) / k; if (x < 0 || y < 0 || x > video.videoWidth || y > video.videoHeight) { return; }
      var t = document.createElement("canvas"); t.width = t.height = 1; var g = t.getContext("2d"); g.drawImage(video, x, y, 1, 1, 0, 0, 1, 1); var p = g.getImageData(0, 0, 1, 1).data;
      var hx = "#" + [p[0], p[1], p[2]].map(function (n) { return (n < 16 ? "0" : "") + n.toString(16); }).join("").toUpperCase();
      chroma.keyColor = hx; $(".vChroma input[type=color]", c).value = hx; $(".vChroma .hex", c).value = hx; if (keyer) { keyer.config(chroma); }
      toast("Color a quitar: " + hx);
    }
    $$(".vModo button", c).forEach(function (b) { b.onclick = function () { if (video) { ponerModo(b.dataset.v); } }; });
    conectarColor($(".vChroma", c), function (col) { chroma.keyColor = col; if (keyer) { keyer.config(chroma); } });
    [["vSim", "similitud"], ["vSuav", "suavizado"], ["vDerr", "derrame"]].forEach(function (p) {
      var r = $("." + p[0], c); r.oninput = function () { chroma[p[1]] = +r.value; $("." + p[0] + "N", c).textContent = r.value; if (keyer) { keyer.config(chroma); } };
    });
    $$(".fondoPrueba button", c).forEach(function (b) { b.onclick = function () { caja.style.background = b.dataset.bg === "checker" ? "" : b.dataset.bg; }; });
    $(".guardar", c).onclick = function () {
      if (!archivo || subiendo) { return; }
      var nombre = $(".vNombre", c).value.trim() || "Video", id = "m" + CG.nuevoId().slice(1), dur = video && isFinite(video.duration) ? Math.round(video.duration * 10) / 10 : 0;
      var opciones = {bucle: $(".vBucle", c).checked, ocultarAlFinal: $(".vOcultar", c).checked, audio: $(".vAudio", c).checked};
      subiendo = true; var b = $(".guardar", c); b.disabled = true; b.lastChild.textContent = "Guardando…";
      var barra = $(".barra-prog", c); barra.hidden = false;
      var tipo = archivo.type || (/\.webm$/i.test(archivo.name) ? "video/webm" : "video/mp4");
      var prom = LOCAL ? CG.mediaLocal.guardar(id, archivo).then(function () { return {local: true}; })
        : con.subirArchivo(archivo, function (p) { $("i", barra).style.width = Math.round(p * 100) + "%"; });
      prom.then(function (r) {
        $("i", barra).style.width = "100%";
        var m = {id: id, nombre: nombre, tipo: tipo, modo: modo, dur: dur, tam: archivo.size};
        if (r.local) { m.local = true; } else { m.url = r.url; m.path = r.path; }
        estado.biblioteca = (estado.biblioteca || []).concat(m);
        var datos = Object.assign({media: id, modo: modo}, opciones, modo === "chroma" ? chroma : {});
        if (alListo) { alListo({id: id, modo: modo, chroma: modo === "chroma" ? chroma : null}); publicar(); }
        else {
          var e = CG.crearElemento("video", {nombre: nombre, datos: datos});
          estado.elementos.push(e); abiertas.videos = true; publicar(); seleccionar(e.id);
        }
        subiendo = false; alCerrarModal = limpiar; cerrarModal();
        toast("Video guardado en la biblioteca" + (LOCAL ? " de este equipo" : " de la sala"), "ok");
      }, function (e) {
        subiendo = false; b.disabled = false; b.lastChild.textContent = "Reintentar"; barra.hidden = true;
        toast("No se pudo guardar el video: " + e.message, "err");
      });
    };
  }

  /* ------------------------------------------------------------------ REMOTO */
  function remoto() {
    if (LOCAL) {
      var lo = base + "salida.html?local=1";
      var c0 = modal("<h2>Salida en modo local</h2><p class='lead'>En modo local el panel y la salida se comunican dentro del mismo programa, sin internet.</p>" +
        "<div class='aviso-box warn'>Funciona solo si el panel y la salida corren en el <b>mismo navegador</b>. En OBS: agrega este panel como <b>dock</b> (Docks → Docks de navegador personalizados) y la salida como fuente Navegador. Para usarlo desde otro computador o celular crea una <b>sala remota</b>.</div>" +
        "<label>Link de salida para OBS</label><div class='linkbox'><input readonly value='" + esc(lo) + "'><button class='btn' data-copiar>Copiar</button></div>" +
        "<div class='modal-pie'><a class='btn' href='index.html'>Crear sala remota</a><button class='btn prim' data-abrir>Abrir salida</button></div>");
      $("[data-copiar]", c0).onclick = function () { copiar(lo); };
      $("[data-abrir]", c0).onclick = function () { open(lo, "_blank"); };
      return;
    }
    var ctrl = base + "panel.html?sala=" + sala + "#t=" + token, out = base + "salida.html?sala=" + sala + "&k=" + outKey;
    var qr = ""; try { var q = qrcode(0, "M"); q.addData(ctrl); q.make(); qr = q.createDataURL(4, 2); } catch (e) {}
    var c = modal("<h2>Control remoto y salida para OBS</h2><p class='lead'>Sala <b>" + esc(sala.toUpperCase()) + "</b>. Todo lo que hagas se ve en cada salida conectada, estén donde estén.</p>" +
      "<label><b>1 · Link de salida</b> (para OBS · solo muestra gráficas, no puede controlar)</label><div class='linkbox'><input readonly value='" + esc(out) + "'><button class='btn' data-c='out'>Copiar</button><button class='btn' data-a='out'>Abrir</button></div>" +
      "<ol class='pasos'><li>En OBS: <b>Fuentes → + → Navegador</b>.</li><li>Pega el link en <b>URL</b>. Ancho <b>1920</b>, alto <b>1080</b>.</li><li>Deja <b>sin marcar</b> «Apagar la fuente cuando no esté visible» y «Actualizar el navegador cuando la escena se active». Pon la fuente arriba de la cámara.</li><li>Para otra resolución agrega <b>&amp;w=1280&amp;h=720</b> al final del link.</li></ol>" +
      "<div class='dos' style='margin-top:16px'><div><label><b>2 · Link de control</b> (abre este panel en otro equipo, tablet o celular)</label><div class='linkbox'><input readonly value='" + esc(ctrl) + "'><button class='btn' data-c='ctrl'>Copiar</button></div>" +
      "<div class='aviso-box warn'>Quien tenga el link de control puede cambiar todo lo que sale al aire. No lo publiques. Si se filtró, genera links nuevos.</div></div>" +
      (qr ? "<div><div class='qr'><img alt='Código QR del link de control' src='" + qr + "'></div><small style='color:var(--txt3)'>Escanéalo con la cámara del celular</small></div>" : "") + "</div>" +
      "<div class='modal-pie'><button class='btn peligro' data-regen>Generar links nuevos…</button><button class='btn prim' data-cerrar>Listo</button></div>", {ancho: true});
    $("[data-c=out]", c).onclick = function () { copiar(out); };
    $("[data-c=ctrl]", c).onclick = function () { copiar(ctrl); };
    $("[data-a=out]", c).onclick = function () { open(out, "_blank"); };
    $("[data-cerrar]", c).onclick = cerrarModal;
    $("[data-regen]", c).onclick = function () {
      confirmar("¿Generar links nuevos?", "Los links actuales de control y de salida dejarán de funcionar. Tendrás que pegar el nuevo link de salida en OBS.", "Generar nuevos", true).then(function (ok) {
        if (!ok) { return; }
        con.regenerar().then(function (r) {
          guardarSala(sala, r.token, $("#salaNombre").textContent);
          location.replace(base + "panel.html?sala=" + sala + "#t=" + r.token); location.reload();
        }, function (e) { toast(e.message, "err"); });
      });
    };
  }
  function copiar(t) {
    (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(function () { toast("Copiado", "ok"); }, function () {
      var i = document.createElement("textarea"); i.value = t; document.body.appendChild(i); i.select(); try { document.execCommand("copy"); toast("Copiado", "ok"); } catch (e) { toast("No se pudo copiar: selecciona el texto y copia a mano", "err"); } i.remove();
    });
  }

  /* ------------------------------------------------------------------ AJUSTES */
  function ajustes() {
    var A = estado.ajustes || {}, bib = (estado.biblioteca || []).filter(function (m) { return !m.incluido; });
    var DP = estado.datosPrograma || {};
    var c = modal("<button class='btn mini' id='ajVolver' style='margin-bottom:10px'>← Configuración</button><h2>Ajustes generales</h2><p class='lead'>Se aplican a todas las salidas de esta sala.</p>" +
      "<h3 style='font-size:13px;margin:4px 0 6px'>Datos del programa</h3><p class='nota-m' style='margin-top:0'>Se copian a todos los GC y gráficas que los usan. Déjalos vacíos hasta que producción los confirme.</p>" +
      "<div class='form-fila'><div class='campo'><label>Nombre del conductor</label><input type='text' class='dp' data-k='conductor' maxlength='60'></div>" +
      "<div class='campo'><label>Conductor del noticiero</label><input type='text' class='dp' data-k='conductorNoticiero' maxlength='60'></div>" +
      "<div class='campo'><label>Número telefónico del concurso</label><input type='text' class='dp' data-k='telefono' maxlength='30' inputmode='tel'></div></div>" +
      "<div class='modal-pie' style='justify-content:flex-start;margin-top:0'><button class='btn prim' data-a='dp'>Aplicar datos</button></div>" +
      "<div class='form-fila'><div class='campo'><label>Logo del programa</label><div class='img'><div class='miniat' style='background-image:url(\"" + esc(estado.logo || "assets/logo.png") + "\")'></div><button class='btn mini' data-a='logo'><svg><use href='#i-subir'/></svg>Cambiar logo</button><button class='btn mini' data-a='logoReset'>Usar el original</button></div><span class='nota'>PNG con fondo transparente, idealmente 800 px o más.</span></div>" +
      "<div class='campo'><label>Velocidad de animaciones</label><div class='rango'><input type='range' min='50' max='160' step='5' value='" + (A.velocidad || 100) + "' class='vel'><span class='u velN' style='width:40px'>" + (A.velocidad || 100) + "%</span></div></div></div>" +
      "<h3 style='font-size:13px;margin:16px 0 6px'>Biblioteca de videos</h3>" +
      (bib.length ? "<div style='display:flex;flex-direction:column;gap:6px'>" + bib.map(function (m) { return "<div class='li' style='grid-template-columns:1fr auto auto'><span><b>" + esc(m.nombre) + "</b> <small style='color:var(--txt3)'>" + ({alfa: "transparente", chroma: "fondo verde", normal: "normal"}[m.modo] || "") + (m.local ? " · solo este equipo" : " · en la sala") + (m.tam ? " · " + (m.tam / 1048576).toFixed(1) + " MB" : "") + "</small></span><span></span><button class='q' data-borrar='" + esc(m.id) + "' title='Quitar de la biblioteca'><svg><use href='#i-basura'/></svg></button></div>"; }).join("") + "</div>" : "<p style='color:var(--txt3)'>Aún no subes videos. Usa <b>+ Nueva → Video</b>.</p>") +
      "<h3 style='font-size:13px;margin:16px 0 6px'>Copia de seguridad</h3><div style='display:flex;gap:8px;flex-wrap:wrap'><button class='btn' data-a='exportar'>Descargar copia (.json)</button><button class='btn' data-a='importar'>Cargar copia…</button><button class='btn' data-a='ejemplos'>Agregar gráficas de ejemplo</button><button class='btn' data-a='libreto'>Restaurar orden del libreto</button></div>" +
      "<div class='modal-pie'><button class='btn prim' data-a='cerrar'>Listo</button></div>");
    $("#ajVolver", c).onclick = function () { config(); };
    $$(".dp", c).forEach(function (i) { i.value = DP[i.dataset.k] || ""; });
    $("[data-a=dp]", c).onclick = function () {
      var nd = {}, n = 0; $$(".dp", c).forEach(function (i) { nd[i.dataset.k] = i.value.trim(); });
      estado.datosPrograma = nd;
      estado.elementos.forEach(function (e) {
        Object.keys(e.vinc || {}).forEach(function (campoK) {
          var clave = e.vinc[campoK], val = nd[clave] || (e.pend && e.pend[campoK]) || "";
          if (e.datos[campoK] !== val) { e.datos[campoK] = val; if (borr[e.id]) { borr[e.id][campoK] = val; } n++; }
        });
      });
      publicar(); guardarBorr(); if (sel) { dibujarCampos(); }
      toast(n ? "Datos aplicados en " + n + " gráfica(s)" : "Sin cambios", "ok");
    };
    var vel = $(".vel", c); vel.oninput = function () { $(".velN", c).textContent = vel.value + "%"; };
    vel.onchange = function () { estado.ajustes = Object.assign({}, estado.ajustes, {velocidad: +vel.value}); publicar(); pvw(); };
    $("[data-a=logo]", c).onclick = function () { elegirImagen(function (u) { estado.logo = u; publicar(); pvw(); ajustes(); toast("Logo actualizado", "ok"); }); };
    $("[data-a=logoReset]", c).onclick = function () { estado.logo = ""; publicar(); pvw(); ajustes(); };
    $("[data-a=cerrar]", c).onclick = cerrarModal;
    $("[data-a=exportar]", c).onclick = function () {
      var b = new Blob([JSON.stringify({app: "cm-cg", v: 2, fecha: new Date().toISOString(), estado: estado}, null, 1)], {type: "application/json"}), a = document.createElement("a");
      a.href = URL.createObjectURL(b); a.download = "completos-mojados-cg-" + sala + ".json"; a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
    };
    $("[data-a=importar]", c).onclick = function () {
      elegirArchivo("application/json,.json", function (f) {
        f.text().then(function (t) {
          var j = JSON.parse(t), e = j.estado || j; if (!e.elementos) { throw new Error("El archivo no es una copia de este panel."); }
          return confirmar("¿Cargar esta copia?", "Reemplaza todas las gráficas de la sala por las del archivo (" + e.elementos.length + " gráficas). Lo que esté al aire se ocultará.", "Cargar copia", true).then(function (ok) {
            if (!ok) { return; }
            e.elementos.forEach(function (x) { x.on = false; }); estado = normalizar(e); borr = {}; publicar(); seleccionar(null); toast("Copia cargada", "ok");
          });
        }).catch(function (e) { toast("No se pudo leer el archivo: " + e.message, "err"); });
      });
    };
    $("[data-a=libreto]", c).onclick = function () {
      confirmar("¿Restaurar el orden del libreto?", "La escaleta vuelve al orden original de «LIBRETO PROGRAMA V.2». No se borra ninguna gráfica ni sus textos.", "Restaurar").then(function (ok) {
        if (!ok) { return; } CG.sembrarLibreto(estado, true); publicar(); toast("Orden del libreto restaurado", "ok");
      });
    };
    $("[data-a=ejemplos]", c).onclick = function () {
      var ini = CG.estadoInicial(), n = 0;
      ini.elementos.forEach(function (x) { if (!estado.elementos.some(function (y) { return y.nombre === x.nombre; })) { estado.elementos.push(x); n++; } });
      publicar(); toast(n ? "Se agregaron " + n + " gráficas de ejemplo" : "Ya tienes todas las de ejemplo", "ok");
    };
    $$("[data-borrar]", c).forEach(function (b) {
      b.onclick = function () {
        var id = b.dataset.borrar, m = estado.biblioteca.filter(function (x) { return x.id === id; })[0], usos = estado.elementos.filter(function (e) { return e.plantilla === "video" && e.datos.media === id; });
        confirmar("¿Quitar «" + m.nombre + "»?", usos.length ? "Lo usan " + usos.length + " gráfica(s) de video; quedarán sin video." : "Se borrará el archivo.", "Quitar", true).then(function (ok) {
          if (!ok) { return; }
          usos.forEach(function (e) { e.on = false; });
          estado.biblioteca = estado.biblioteca.filter(function (x) { return x.id !== id; }); publicar();
          if (m.local) { CG.mediaLocal.borrar(id); } else if (m.path) { con.borrarArchivo(m.path).catch(function (e) { toast("El archivo no se pudo borrar del servidor: " + e.message, "err"); }); }
          ajustes();
        });
      };
    });
  }

  /* ======================= CONFIGURACIÓN COMPLETA ======================= */
  var cfgTab = "botonera", cfgFiltro = "";
  function ordenLibreto() {
    var u = {}; pasos().forEach(function (p) { p.items.forEach(function (id) { u[id] = u[id] || p.n; }); });
    return {num: u, lista: estado.elementos.filter(function (e) { return P[e.plantilla]; }).slice().sort(function (a, c) { return (u[a.id] || "99").localeCompare(u[c.id] || "99"); })};
  }
  function opcionesTrans(actual, idPropio) {
    return '<option value="">Sin transición (directo)</option>' + transiciones().filter(function (t) { return t.id !== idPropio; }).map(function (t) { return '<option value="' + esc(t.id) + '"' + (t.id === actual ? " selected" : "") + '>' + esc(tipoTrans(t) + " · " + t.nombre) + '</option>'; }).join("");
  }
  function botonDe(id) { return botones().filter(function (b) { return b.el === id || (b.esp && ":" + b.esp === id); })[0]; }
  function config(tab) {
    if (tab) { cfgTab = tab; }
    var tabs = [["botonera", "🎛️ Botonera"], ["graficas", "🖼️ Gráficas"], ["trans", "✨ Transiciones"], ["disp", "📱 Dispositivo"], ["general", "⚙️ General"]];
    var c = modal("<div class='cfg'><div class='cfg-cab'><h2>Configuración</h2><p class='lead'>Todo se guarda solo y se aplica a todos los equipos de la sala.</p></div>" +
      "<nav class='cfg-tabs'>" + tabs.map(function (t) { return "<button data-t='" + t[0] + "' class='" + (t[0] === cfgTab ? "on" : "") + "'>" + t[1] + "</button>"; }).join("") + "</nav>" +
      "<div class='cfg-cuerpo' id='cfgCuerpo'></div></div>", {clase: "config"});
    $$(".cfg-tabs button", c).forEach(function (b) { b.onclick = function () { if (b.dataset.t === "general") { ajustes(); return; } cfgTab = b.dataset.t; cfgFiltro = ""; config(); }; });
    var cu = $("#cfgCuerpo", c);
    if (cfgTab === "botonera") { cfgBotonera(cu); } else if (cfgTab === "graficas") { cfgGraficas(cu); } else if (cfgTab === "trans") { cfgTrans(cu); } else { cfgDisp(cu); }
  }
  function buscador(cu, alFiltrar) {
    var i = $(".cfg-bus input", cu); if (!i) { return; }
    i.value = cfgFiltro;
    var f = function () { cfgFiltro = i.value; var q = cfgFiltro.trim().toLowerCase(); $$(".cfg-fila[data-q]", cu).forEach(function (r) { r.hidden = q && r.dataset.q.indexOf(q) < 0; }); if (alFiltrar) { alFiltrar(); } };
    i.oninput = f; f();
  }
  /* ---- pestaña Botonera: qué gráfica va en la botonera y con qué tecla ---- */
  function cfgBotonera(cu) {
    var o = ordenLibreto(), dueno = {}; botones().forEach(function (b) { if (b.tecla) { dueno[b.tecla] = b; } });
    var filas = Object.keys(ESPECIALES).map(function (k) { return {v: ":" + k, nom: ESPECIALES[k], tipo: "ACCIÓN", num: "⚡"}; })
      .concat(o.lista.map(function (e) { return {v: e.id, nom: e.nombre, tipo: (CG.TIPOS[CG.tipoDe(e)] || "").toUpperCase(), num: o.num[e.id] || "·", fav: !!e.fav, graf: true}; }));
    var nB = botones().length;
    var mF = modoFavBot(), nF = o.lista.filter(function (e) { return e.fav; }).length;
    cu.innerHTML = "<div class='cfg-barra'><label class='cfg-bus'><svg><use href='#i-buscar'/></svg><input type='search' placeholder='Buscar gráfica…'></label>" +
      "<div class='seg cfg-filtro' id='cfgFiltro'><button data-f='todas' class='" + (mF === "todas" ? "on" : "") + "'>Todas (" + o.lista.length + ")</button><button data-f='fav' class='" + (mF === "fav" ? "on" : "") + "'>★ Favoritas (" + nF + ")</button></div>" +
      "<span class='cfg-info'><b>" + nB + "</b> en la botonera</span><button class='btn prim' id='cfgVerBot'>Abrir botonera para ordenar →</button></div>" +
      "<p class='nota-m'>Activa el interruptor para que la gráfica tenga su botón. Elige la tecla: F13–F24 o la que mande tu teclado (⌨️). Para cambiar texto o color usa la botonera en modo edición.</p>" +
      "<div class='cfg-lista'>" + filas.map(function (f) {
        var b = botonDe(f.v), teclas = TECLAS_F.slice(); if (b && b.tecla && teclas.indexOf(b.tecla) < 0) { teclas.push(b.tecla); }
        return "<div class='cfg-fila" + (b ? " activa" : "") + "' data-v='" + esc(f.v) + "' data-fav='" + (f.fav ? 1 : 0) + "' data-q='" + esc((f.nom + " " + f.tipo).toLowerCase()) + "'>" +
          "<label class='sw-on'><input type='checkbox' class='cfgOn'" + (b ? " checked" : "") + "><i></i></label>" +
          (f.graf ? "<button class='bi-star" + (f.fav ? " on" : "") + " cfgStar' title='" + (f.fav ? "Quitar de favoritas" : "Agregar a favoritas") + "'>★</button>" : "<span class='bi-star nada'></span>") +
          "<span class='bi-num'>" + esc(f.num) + "</span><span class='cfg-nom'><b>" + esc(f.nom) + "</b><small>" + esc(f.tipo) + "</small></span>" +
          (b ? "<span class='cfg-color' style='background:" + esc(b.color || "#3A3F4E") + "'></span><select class='cfgTec'><option value=''>Sin tecla</option>" + teclas.map(function (k) { var d = dueno[k]; return "<option value='" + esc(k) + "'" + (b.tecla === k ? " selected" : "") + ">" + esc(nombreTecla(k)) + (d && d !== b ? " · ocupa " + esc((d.etiqueta || estadoBoton(d).txt).slice(0, 14)) : "") + "</option>"; }).join("") + "</select><button class='btn mini cfgCap' title='Presionar una tecla del teclado'>⌨️</button>" : "<span class='cfg-vacio'>sin botón</span>") +
          "</div>";
      }).join("") + "</div>";
    buscador(cu, function () {
      if (modoFavBot() !== "fav") { return; }
      $$(".cfg-fila[data-q]", cu).forEach(function (r) { if (r.dataset.fav !== "1") { r.hidden = true; } });
    });
    $$("#cfgFiltro button", cu).forEach(function (x) { x.onclick = function () { guardarLS("cg_bot_filtro", x.dataset.f); config(); }; });
    $$(".cfgStar", cu).forEach(function (x) {
      x.onclick = function (ev) {
        ev.preventDefault(); ev.stopPropagation();
        var fe = el(x.closest(".cfg-fila").dataset.v); if (!fe) { return; }
        fe.fav = !fe.fav; publicar(); config();
      };
    });
    $("#cfgVerBot", cu).onclick = function () { cerrarModal(); if (esMovil()) { vistaMovil("boton"); } else { cambiarTab("boton"); } editarBotonera = true; dibujarBotonera(); pintarInsp(); };
    $$(".cfg-fila", cu).forEach(function (r) {
      var v = r.dataset.v;
      $(".cfgOn", r).onchange = function () {
        if (this.checked) {
          var e = v.charAt(0) === ":" ? null : el(v), nb = nuevoBoton({el: e ? v : "", esp: e ? "" : v.slice(1), color: COLORES_B[botones().length % COLORES_B.length]});
          nb.tecla = TECLAS_F.filter(function (k) { return !botones().some(function (x) { return x.tecla === k; }); })[0] || "";
          botones().push(nb); toast("Botón agregado" + (nb.tecla ? " con la tecla " + nb.tecla : ""), "ok");
        } else {
          estado.botonera.botones = botones().filter(function (b) { return !(b.el === v || (b.esp && ":" + b.esp === v)); });
        }
        cambioBot(false); config();
      };
      var st = $(".cfgTec", r);
      if (st) {
        st.onchange = function () { asignarTecla(botonDe(v), st.value); config(); };
        $(".cfgCap", r).onclick = function () {
          var bt = this; bt.textContent = "…"; bt.classList.add("esperando"); capturando = true; toast("Presiona la tecla ahora (Esc cancela)");
          var f = function (ev) {
            ev.preventDefault(); ev.stopPropagation(); document.removeEventListener("keydown", f, true); capturando = null;
            if (ev.key === "Escape" || /^(Tab|Enter|Shift|Control|Alt|Meta|CapsLock)$/.test(ev.key)) { config(); return; }
            asignarTecla(botonDe(v), ev.key); config();
          };
          document.addEventListener("keydown", f, true);
        };
      }
    });
  }
  /* ---- pestaña Gráficas: todas, con nombre, transición de entrada/salida, editar, duplicar, eliminar ---- */
  function cfgGraficas(cu) {
    var o = ordenLibreto();
    cu.innerHTML = "<div class='cfg-barra'><label class='cfg-bus'><svg><use href='#i-buscar'/></svg><input type='search' placeholder='Buscar gráfica…'></label>" +
      "<span class='cfg-info'><b>" + o.lista.length + "</b> gráficas</span><button class='btn prim' id='cfgNueva'><svg><use href='#i-mas'/></svg>Nueva gráfica</button></div>" +
      "<p class='nota-m'>En <b>Entra con</b> y <b>Sale con</b> eliges si la gráfica aparece directo o detrás de una transición (cortina, transición animada o un video tuyo). La gráfica cambia justo cuando la transición tapa la pantalla.</p>" +
      "<div class='cfg-lista'>" + o.lista.map(function (e) {
        var tr = e.tr || {}, esT = esTransicion(e);
        return "<div class='cfg-fila cfg-g" + (e.on ? " aire" : "") + "' data-id='" + esc(e.id) + "' data-q='" + esc((e.nombre + " " + CG.tipoDe(e)).toLowerCase()) + "'>" +
          "<span class='bi-num'>" + esc(o.num[e.id] || "·") + "</span>" +
          "<span class='cfg-nom'><input type='text' class='cfgNom' value='" + esc(e.nombre) + "' maxlength='60'><small>" + esc((CG.TIPOS[CG.tipoDe(e)] || "").toUpperCase()) + (e.on ? " · <b class='c-pgm'>AL AIRE</b>" : "") + "</small></span>" +
          "<label class='cfg-tr'><small>Entra con</small><select class='cfgEntra'>" + opcionesTrans(tr.entra, e.id) + "</select></label>" +
          (esEvento(e) ? "<span class='cfg-tr cfg-tr-na'><small>Sale con</small><i>se va sola</i></span>" : "<label class='cfg-tr'><small>Sale con</small><select class='cfgSale'>" + opcionesTrans(tr.sale, e.id) + "</select></label>") +
          "<span class='cfg-acc'><button class='btn mini cfgEd' title='Editar textos y colores'>Editar</button><button class='btn mini ico cfgDup' title='Duplicar'><svg><use href='#i-copiar'/></svg></button><button class='btn mini ico peligro cfgDel' title='Eliminar'><svg><use href='#i-basura'/></svg></button></span>" +
          (esT ? "" : "") + "</div>";
      }).join("") + "</div>";
    buscador(cu);
    $("#cfgNueva", cu).onclick = nuevaGrafica;
    $$(".cfg-g", cu).forEach(function (r) {
      var id = r.dataset.id, e = el(id);
      $(".cfgNom", r).onchange = function () { var v = this.value.trim(); if (v) { e.nombre = v; publicar(); } };
      $(".cfgEntra", r).onchange = function () { e.tr = Object.assign({}, e.tr, {entra: this.value}); publicar(); toast(this.value ? "Entrará con «" + el(this.value).nombre + "»" : "Entrará directo", "ok"); };
      if ($(".cfgSale", r)) { $(".cfgSale", r).onchange = function () { e.tr = Object.assign({}, e.tr, {sale: this.value}); publicar(); toast(this.value ? "Saldrá con «" + el(this.value).nombre + "»" : "Saldrá directo", "ok"); }; }
      $(".cfgEd", r).onclick = function () { cerrarModal(); if (document.body.classList.contains("modo-botonera")) { modoDisp("completo"); } if (esMovil()) { seleccionar(id); vistaMovil("editar"); } else { if (document.body.classList.contains("tab-boton")) { cambiarTab("visual"); } seleccionar(id); } };
      $(".cfgDup", r).onclick = function () { var c2 = clon(e); c2.id = CG.nuevoId(); c2.on = false; c2.nombre = e.nombre + " (copia)"; estado.elementos.splice(estado.elementos.indexOf(e) + 1, 0, c2); publicar(); config(); toast("Gráfica duplicada", "ok"); };
      $(".cfgDel", r).onclick = function () {
        confirmar("¿Eliminar «" + e.nombre + "»?", "Se quita de la sala, de la escaleta y de la botonera.", "Eliminar", true).then(function (ok) {
          if (!ok) { config(); return; }
          estado.elementos = estado.elementos.filter(function (x) { return x !== e; });
          pasos().forEach(function (p) { p.items = p.items.filter(function (x) { return x !== id; }); });
          if (estado.botonera) { estado.botonera.botones = botones().filter(function (b) { return b.el !== id; }); }
          estado.elementos.forEach(function (x) { if (x.tr) { if (x.tr.entra === id) { x.tr.entra = ""; } if (x.tr.sale === id) { x.tr.sale = ""; } } });
          if (sel === id) { seleccionar(null); }
          publicar(); config(); toast("Gráfica eliminada", "ok");
        });
      };
    });
  }
  /* ---- pestaña Transiciones: cortinas, transiciones animadas y videos (MP4/WebM) propios ---- */
  function cfgTrans(cu) {
    var ts = transiciones();
    var usos = function (t) { return estado.elementos.filter(function (e) { return e.tr && (e.tr.entra === t.id || e.tr.sale === t.id); }).length; };
    cu.innerHTML = "<div class='cfg-crear'>" +
      "<button class='cfg-card' id='cfgSubirT'><span>🎬</span><b>Subir video o .webm</b><small>Tu transición hecha en After Effects u otro programa. WebM con transparencia o MP4 con fondo verde.</small></button>" +
      "<button class='cfg-card' id='cfgNuevaCort'><span>🌭</span><b>Nueva cortina de salsa</b><small>Bandas o círculos de ketchup, mayo y mostaza. Se crea aquí mismo.</small></button>" +
      "<button class='cfg-card' id='cfgNuevaAnim'><span>✨</span><b>Nueva transición animada</b><small>Las del script (pase noticiero, VTR, bloque 2, Piña Papá…) con tus textos.</small></button></div>" +
      "<p class='nota-m'><b>Corte</b>: segundo en que la transición tapa la pantalla; ahí entra o sale la gráfica. Déjalo vacío para usar el automático.</p>" +
      "<div class='cfg-lista'>" + ts.map(function (t) {
        var auto = Math.round(corteDe(Object.assign({}, t, {corteS: null})) * 10) / 10, sinVideo = t.plantilla === "video" && !t.datos.media;
        return "<div class='cfg-fila cfg-t' data-id='" + esc(t.id) + "'><span class='cfg-tipo t-" + t.plantilla + "'>" + esc(tipoTrans(t)) + "</span>" +
          "<span class='cfg-nom'><input type='text' class='cfgNom' value='" + esc(t.nombre) + "' maxlength='60'><small>" + (sinVideo ? "<b style='color:var(--amar)'>⚠ falta el video</b> · " : "") + "usada por " + usos(t) + " gráfica(s)</small></span>" +
          "<label class='cfg-tr cfg-corte'><small>Corte (s)</small><input type='number' min='0' max='30' step='0.1' class='cfgCorte' placeholder='" + auto + "' value='" + (t.corteS != null && t.corteS !== "" ? esc(t.corteS) : "") + "'></label>" +
          "<span class='cfg-acc'>" + (t.plantilla === "video" ? "<button class='btn mini cfgVid'>" + (sinVideo ? "Subir video" : "Cambiar video") + "</button>" : "") + "<button class='btn mini cfgProbar' title='Ver en la vista previa'>▶ Probar</button><button class='btn mini cfgEd'>Editar</button><button class='btn mini ico peligro cfgDel' title='Eliminar'><svg><use href='#i-basura'/></svg></button></span></div>";
      }).join("") + "</div>";
    function crear(pl, nombre, datos) {
      var e = CG.crearElemento(pl, {nombre: nombre, datos: datos || {}}); estado.elementos.push(e); publicar(); config(); toast("Creada «" + nombre + "». Ya puedes elegirla en Gráficas → Entra con / Sale con.", "ok"); return e;
    }
    $("#cfgNuevaCort", cu).onclick = function () { crear("cortina", "Cortina " + (estado.elementos.filter(function (x) { return x.plantilla === "cortina"; }).length + 1)); };
    $("#cfgNuevaAnim", cu).onclick = function () { crear("transicion", "Transición animada " + (estado.elementos.filter(function (x) { return x.plantilla === "transicion"; }).length + 1)); };
    $("#cfgSubirT", cu).onclick = function () {
      abrirSubida(function (m) {
        var b2 = (estado.biblioteca || []).filter(function (x) { return x.id === m.id; })[0];
        var e = CG.crearElemento("video", {nombre: (b2 && b2.nombre) || "Transición", datos: Object.assign({media: m.id, modo: m.modo, audio: false, bucle: false, ocultarAlFinal: true, entrada: "corte", salida: "corte", esTrans: true}, m.chroma || {})});
        e.tipo = "TRANSICION"; estado.elementos.push(e); cfgTab = "trans"; setTimeout(function () { config(); }, 50);
      });
    };
    $$(".cfg-t", cu).forEach(function (r) {
      var id = r.dataset.id, t = el(id);
      $(".cfgNom", r).onchange = function () { var v = this.value.trim(); if (v) { t.nombre = v; publicar(); } };
      $(".cfgCorte", r).onchange = function () { t.corteS = this.value === "" ? null : +this.value; publicar(); };
      if ($(".cfgVid", r)) { $(".cfgVid", r).onclick = function () { abrirSubida(function (m) { t.datos.media = m.id; t.datos.modo = m.modo; if (m.chroma) { Object.assign(t.datos, m.chroma); } t.datos.esTrans = true; if (borr[id]) { delete borr[id]; } cfgTab = "trans"; setTimeout(function () { config(); }, 50); }); }; }
      $(".cfgProbar", r).onclick = function () { cerrarModal(); if (document.body.classList.contains("modo-botonera")) { modoDisp("completo"); } if (esMovil()) { vistaMovil("ver"); } else { cambiarTab("visual"); } seleccionar(id); setTimeout(function () { $("#aPrevia").click(); }, 300); };
      $(".cfgEd", r).onclick = function () { cerrarModal(); if (document.body.classList.contains("modo-botonera")) { modoDisp("completo"); } if (document.body.classList.contains("tab-boton")) { cambiarTab("visual"); } seleccionar(id); if (esMovil()) { vistaMovil("editar"); } };
      $(".cfgDel", r).onclick = function () {
        confirmar("¿Eliminar «" + t.nombre + "»?", "Las gráficas que entraban o salían con ella pasarán a hacerlo directo.", "Eliminar", true).then(function (ok) {
          if (!ok) { config(); return; }
          estado.elementos = estado.elementos.filter(function (x) { return x !== t; });
          estado.elementos.forEach(function (x) { if (x.tr) { if (x.tr.entra === id) { x.tr.entra = ""; } if (x.tr.sale === id) { x.tr.sale = ""; } } });
          pasos().forEach(function (p) { p.items = p.items.filter(function (x) { return x !== id; }); });
          if (estado.botonera) { estado.botonera.botones = botones().filter(function (b) { return b.el !== id; }); }
          if (sel === id) { seleccionar(null); }
          publicar(); config();
        });
      };
    });
  }
  /* ---- pestaña Dispositivo ---- */
  function cfgDisp(cu) {
    var m = leerLS("cg_disp", "auto"), auto = tactil() ? "solo la botonera" : "el panel completo";
    cu.innerHTML = "<p class='nota-m'>Esto se elige <b>en cada equipo</b>: así la tablet o el celular quedan como botonera y el computador con el panel visual completo.</p>" +
      "<div class='cfg-modos'>" +
      "<button class='cfg-card" + (m === "auto" ? " on" : "") + "' data-m='auto'><span>🪄</span><b>Automático</b><small>Celular y tablet: solo botonera. Computador: panel completo. En este equipo: <b>" + auto + "</b>.</small></button>" +
      "<button class='cfg-card" + (m === "botonera" ? " on" : "") + "' data-m='botonera'><span>🎛️</span><b>Solo botonera</b><small>Pantalla completa con los botones grandes. Ideal para tablet al lado del switcher.</small></button>" +
      "<button class='cfg-card" + (m === "completo" ? " on" : "") + "' data-m='completo'><span>🖥️</span><b>Panel completo</b><small>Control, vista previa, al aire y botonera. Ideal para el computador.</small></button></div>" +
      "<h3 class='cfg-h3'>Usar la tablet o el celular como botonera</h3><ol class='pasos'><li>En este computador toca <b>Remoto</b> y escanea el código del <b>panel de control</b> con la tablet o el celular.</li><li>Se abre directo como botonera. Los cambios de cualquier equipo se ven en todos.</li><li>El teclado externo con F13–F24 funciona en el equipo donde está conectado.</li></ol>";
    $$(".cfg-modos .cfg-card", cu).forEach(function (b) { b.onclick = function () { modoDisp(b.dataset.m); config(); }; });
  }
  /* ------------------------------------------------------------------ AYUDA */
  function ayuda() {
    modal("<h2>Cómo se usa</h2><p class='lead'>Tres pasos: elegir, revisar, mostrar.</p>" +
      "<ol class='pasos'><li><b>Elige</b> una gráfica de la lista de la izquierda (por categoría, o busca por nombre).</li>" +
      "<li><b>Edita</b> textos y colores. Los cambios quedan como <b>borrador</b> (punto amarillo) y <b>no salen al aire</b> todavía.</li>" +
      "<li>En la pestaña <b>Control + Visual</b> ves dos pantallas: <b class='c-pvw'>VISTA PREVIA</b> (solo tú) y <b class='c-pgm'>AL AIRE</b> (lo que sale en OBS).</li>" +
      "<li>Presiona <b class='c-pgm'>MOSTRAR</b>. Si ya está al aire y cambias algo, el botón dice <b>ACTUALIZAR</b>: el texto cambia sin repetir la animación.</li>" +
      "<li><b>OCULTAR</b> la saca con su animación de salida. <b>Limpiar</b> saca todo de una vez.</li></ol>" +
      "<h3 style='font-size:13px;margin:16px 0 6px'>Bueno saber</h3><ul class='pasos'>" +
      "<li>El botón ▶ de cada fila muestra u oculta al instante. Dos gráficas del mismo tipo no se encienden juntas: la nueva reemplaza a la anterior.</li>" +
      "<li><b>★</b> marca favoritas; el filtro «Favoritos» deja solo esas.</li>" +
      "<li>Avisos y cortinas se <b>lanzan</b>: aparecen y se van solos.</li>" +
      "<li>Cambiar de pestaña no corta nada: la salida de OBS es independiente del panel.</li>" +
      "<li>Si se corta internet, la salida sigue mostrando lo último y el panel reintenta solo.</li>" +
      "<li>Atajos: <kbd>Ctrl</kbd>+<kbd>Enter</kbd> mostrar/actualizar · <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>Enter</kbd> ocultar.</li></ul>" +
      "<div class='modal-pie'><button class='btn prim' onclick=\"document.querySelector('#modal .cerrar').click()\">Entendido</button></div>");
  }

  /* ------------------------------------------------------------------ arranque */
  function normalizar(e) {
    e = e || {}; var ini = CG.estadoInicial();
    if (!Array.isArray(e.elementos) || !e.elementos.length) { CG.sembrarLibreto(ini); sembrarBotonera(ini); return ini; }
    e.elementos = e.elementos.filter(function (x) { return x && P[x.plantilla]; }).map(function (x) {
      x.datos = Object.assign(clon(P[x.plantilla].defaults), x.datos || {}); x.on = !!x.on; return x;
    });
    e.biblioteca = Array.isArray(e.biblioteca) ? e.biblioteca : [];
    ini.biblioteca.forEach(function (m) { if (!e.biblioteca.some(function (x) { return x.id === m.id; })) { e.biblioteca.unshift(m); } });
    e.ev = Array.isArray(e.ev) ? e.ev : []; e.ajustes = e.ajustes || {velocidad: 100}; e.logo = e.logo || "";
    if (CG.sembrarLibreto(e)) { e._sembrado = true; }
    if (sembrarBotonera(e)) { e._sembrado = true; }
    return e;
  }
  function guardarSala(s, t, nombre) {
    var l = leerLS("cg_salas_v2", []).filter(function (x) { return x.sala !== s; });
    l.unshift({sala: s, token: t, nombre: nombre || s, ultima: Date.now()}); guardarLS("cg_salas_v2", l.slice(0, 20));
  }
  function iniciar() {
    if (!LOCAL) {
      if (!sala) { location.replace("index.html"); return; }
      if (!token) { var g = leerLS("cg_salas_v2", []).filter(function (x) { return x.sala === sala; })[0]; if (g) { token = g.token; history.replaceState(null, "", location.pathname + location.search + "#t=" + token); } }
      if (!token) { modal("<h2>Falta el link de control</h2><p class='lead'>Para controlar la sala <b>" + esc(sala.toUpperCase()) + "</b> necesitas el link completo (termina en <b>#t=…</b>). Pídeselo a quien creó la sala.</p><div class='modal-pie'><a class='btn prim' href='index.html'>Ir al inicio</a></div>", {fijo: true}); return; }
    }
    con = LOCAL ? CG.Local() : CG.SalaControl(sala, token);
    red(LOCAL ? "local" : "conectando");
    if (LOCAL) { pill("#pSalidas", "local", "Mismo equipo"); $("#pSalidas").title = "En modo local la salida debe estar en este mismo navegador u OBS"; }
    con.on("red", red);
    con.on("guardado", guardado);
    con.on("presencia", presencia);
    con.on("directo", function (n, ms) { directos = n; msDirecto = ms; presencia(); });
    con.on("fin", finDe);
    con.on("mensaje", function (t, d) {
      if (t === "fin") { finDe(d.id); }
      if (t === "latido" && d.id) { latidos[d.id] = Date.now(); }
      if (t === "adios" && d.id) { delete latidos[d.id]; }
    });
    if (LOCAL) {
      setTimeout(function () { if (con.avisar) { con.avisar("hola", {}); } }, 50);
      setInterval(function () { var ahoraT = Date.now(), n = 0; Object.keys(latidos).forEach(function (k) { if (ahoraT - latidos[k] < 5500) { n++; } else { delete latidos[k]; } }); presencia({salidas: n, local: true}); }, 1000);
    }
    con.on("errorSalida", function (m) { toast("La salida informa: " + m, "err"); });
    con.on("acceso", function (m) { modal("<h2>Sin permiso</h2><p class='lead'>" + esc(m) + "</p><div class='modal-pie'><a class='btn prim' href='index.html'>Ir al inicio</a></div>", {fijo: true}); });
    con.on("remoto", function (e) {
      estado = normalizar(e);
      Object.keys(borr).forEach(function (id) { if (!el(id)) { delete borr[id]; } });
      dibujarLista(); pgm(); dibujarBotonera(); if (editarBotonera && !(document.activeElement && document.activeElement.closest("#botInsp"))) { pintarInsp(); } if (sel && !el(sel)) { seleccionar(null); } else if (sel) { fichaCab(); estadoFicha(); extras(); }
      toast("Otro panel hizo cambios", "");
    });
    con.conectar().then(function (r) {
      var nuevo = !r.estado || !r.estado.elementos;
      estado = normalizar(r.estado);
      $("#salaNombre").textContent = r.nombre || (LOCAL ? "Modo local" : sala); document.title = (r.nombre || "Panel") + " · CM CG";
      if (!LOCAL) { outKey = r.outKey; guardarSala(sala, token, r.nombre); }
      borr = leerLS("cg_borr_" + sala, {}); Object.keys(borr).forEach(function (id) { if (!el(id)) { delete borr[id]; } });
      if (nuevo || estado._sembrado) { delete estado._sembrado; publicar(); if (!nuevo) { toast("Se agregó la escaleta del libreto a esta sala (tus gráficas anteriores siguen en Categorías)", "ok"); } } else { pgm(); }
      dibujarLista();
      var s = leerLS("cg_sel_" + sala, null); if (s && el(s)) { seleccionar(s); }
      if (!LOCAL && !nuevo) { /* nada */ }
      if (nuevo) { setTimeout(ayuda, 400); }
    }, function (e) {
      modal("<h2>No se pudo abrir la sala</h2><p class='lead'>" + esc(e.message) + "</p><div class='modal-pie'><a class='btn' href='index.html'>Inicio</a><button class='btn prim' onclick='location.reload()'>Reintentar</button></div>", {fijo: true});
    });
  }
  /* avisa antes de cerrar si quedó algo sin enviar */
  addEventListener("beforeunload", function (e) { if (con && con.hayPendiente && con.hayPendiente()) { e.preventDefault(); e.returnValue = ""; } });
  /* ======================= BOTONERA (teclera con botones y teclas F13–F24) ======================= */
  var TECLAS_F = ["F13", "F14", "F15", "F16", "F17", "F18", "F19", "F20", "F21", "F22", "F23", "F24"];
  var ESPECIALES = {limpiar: "Limpiar salida", siguiente: "Paso siguiente", anterior: "Paso anterior", cortina: "Cortina rápida"};
  var COLORES_B = ["#E02A12", "#F59A23", "#6AA832", "#0B3A8C", "#5B2A63", "#B8527A", "#F7B500", "#3A3F4E"];
  var editarBotonera = false, capturando = null;
  function nuevoBoton(o) { return Object.assign({id: "b" + Math.random().toString(36).slice(2, 8), el: "", esp: "", accion: "alternar", etiqueta: "", color: "", tecla: ""}, o); }
  /* botones iniciales: lo más usado del libreto (se cambian en «Editar botonera») */
  function sembrarBotonera(e) {
    if (e.botonera && Array.isArray(e.botonera.botones)) { return false; }
    var base = [
      ["lb-gc-conductor", "GC CONDUCTOR", "#E02A12"], ["lb-gc-felipe", "FELIPE JIMÉNEZ", "#F59A23"], ["lb-gc-pina", "CARLOS PIÑA", "#F59A23"],
      ["lb-gc-invitado1", "INVITADO 1", "#F59A23"], ["lb-gc-presentador2", "PRESENTADOR 2", "#0B3A8C"], ["lb-cortina-cm", "CORTINA CM", "#B8527A"],
      ["lb-cortina-programa", "CORTINA PROGRAMA", "#B8527A"], ["lb-trans-pase", "PASE NOTICIERO", "#0B3A8C"], ["lb-urgente", "ÚLTIMO MINUTO", "#0B3A8C"],
      ["lb-logo", "LOGO ESQUINA", "#6AA832"], ["lb-telefono", "CONCURSO TEL.", "#6AA832"], [":limpiar", "LIMPIAR SALIDA", "#3A3F4E"],
      ["lb-titulares", "TICKER", "#0B3A8C"], ["lb-logo-noticiero", "LOGO NOTICIERO", "#0B3A8C"], ["lb-mencion-mary", "MARY MECHADAS", "#F7B500"], ["lb-mencion-rayo", "RAYO MAULINO", "#F7B500"],
      ["lb-trans-bloque2", "BLOQUE 2", "#5B2A63"], ["lb-trans-pina", "TRANSICIÓN PIÑA", "#F7B500"], ["lb-cierre", "CIERRE", "#B8527A"], [":siguiente", "PASO SIGUIENTE", "#3A3F4E"]
    ];

    var ids = {}; e.elementos.forEach(function (x) { ids[x.id] = 1; });
    var bs = [];
    base.forEach(function (b) {
      if (b[0].charAt(0) !== ":" && !ids[b[0]]) { return; }
      bs.push(nuevoBoton({el: b[0].charAt(0) === ":" ? "" : b[0], esp: b[0].charAt(0) === ":" ? b[0].slice(1) : "", etiqueta: b[1], color: b[2], tecla: bs.length < 12 ? TECLAS_F[bs.length] : ""}));
    });
    e.botonera = {v: 1, columnas: 4, botones: bs};
    return true;
  }
  function botones() { return (estado && estado.botonera && estado.botonera.botones) || []; }
  function nombreTecla(k) { return k === " " ? "Espacio" : k || ""; }
  function estadoBoton(b) {
    if (b.esp) { return {on: false, txt: ESPECIALES[b.esp] || b.esp, tipo: "ACCIÓN"}; }
    var e = el(b.el); if (!e) { return {falta: true, txt: "Gráfica eliminada", tipo: "—"}; }
    var p = P[e.plantilla], pend = CG.pendientesDe(e);
    return {on: e.on, ev: !!p.evento, pend: pend.length > 0, falta: e.plantilla === "video" && !e.datos.media, txt: e.nombre, tipo: (CG.TIPOS[CG.tipoDe(e)] || "").toUpperCase(), e: e};
  }
  var selB = -1, filtroBot = "";
  /* filtro del selector de gráficas: "todas" o "fav" (se recuerda en este equipo) */
  function modoFavBot() {
    var m = leerLS("cg_bot_filtro", null);
    if (m === "fav" || m === "todas") { return m; }
    return estado && estado.elementos.some(function (e) { return e.fav; }) ? "fav" : "todas";
  }
  function dibujarBotonera() {
    var cont = $("#botGrid"); if (!cont || !estado) { return; }
    var bo = estado.botonera || {columnas: 4};
    cont.style.setProperty("--cols", bo.columnas || 4);
    ajusteBotonera();
    document.body.classList.toggle("bot-editando", editarBotonera);
    $("#bEditBot").innerHTML = editarBotonera ? "✓ Listo" : "✏️ Editar botones";
    $("#bEditBot").classList.toggle("listo", editarBotonera);
    $("#botTam").textContent = bo.columnas || 4;
    $("#botNota").innerHTML = editarBotonera ? "<b>Modo edición:</b> toca un botón para cambiarlo · arrástralo para moverlo · todo se guarda solo" : "Toca un botón para sacar su gráfica al aire · o usa su tecla";
    if (selB >= botones().length) { selB = -1; }
    cont.innerHTML = botones().map(function (b, i) {
      var s2 = estadoBoton(b), col = b.color || "#3A3F4E";
      return '<button class="bt' + (s2.on ? " on" : "") + (s2.ev ? " ev" : "") + (s2.falta ? " falta" : "") + (b.esp ? " esp" : "") + (editarBotonera && i === selB ? " sel" : "") + '" data-i="' + i + '" style="--c:' + esc(col) + '" title="' + esc(s2.txt) + '">' +
        '<span class="bt-tec">' + esc(nombreTecla(b.tecla)) + '</span>' + (s2.pend || s2.falta ? '<span class="bt-pend" title="Tiene datos o archivos pendientes">⚠</span>' : '') +
        '<span class="bt-et">' + esc(b.etiqueta || s2.txt) + '</span><span class="bt-sub">' + (s2.e && s2.e.tr && (s2.e.tr.entra || s2.e.tr.sale) ? '<span title="Entra o sale con transición">✨ </span>' : '') + esc(s2.tipo) + (s2.ev ? " · se lanza" : s2.on ? (salidas === 0 ? " · PROG." : " · AL AIRE") : "") + '</span>' +
        (editarBotonera ? '<span class="bt-asa" title="Arrastrar para mover">⠿</span>' : '') + '</button>';
    }).join("") + (editarBotonera ? '<button class="bt bt-mas" id="btMas"><span class="bt-mas-ico">+</span><span class="bt-sub">AGREGAR BOTÓN</span></button>' : '');
    if (!botones().length && !editarBotonera) { cont.innerHTML = '<div class="lista-vacia">No hay botones. Toca «Editar botones» para agregarlos.</div>'; }
  }
  /* guarda y redibuja sin perder lo que se está escribiendo en el panel lateral */
  var tGuardarBot = null;
  function cambioBot(insp, lento) {
    dibujarBotonera(); if (insp) { pintarInsp(); }
    clearTimeout(tGuardarBot);
    if (lento) { tGuardarBot = setTimeout(function () { con.publicar(estado); }, 350); } else { con.publicar(estado); }
  }
  function opcionesBot() {
    var usados = {}; pasos().forEach(function (p) { p.items.forEach(function (id) { usados[id] = usados[id] || p.n; }); });
    var acc = Object.keys(ESPECIALES).map(function (k) { return {v: ":" + k, nom: ESPECIALES[k], tipo: "ACCIÓN", num: "⚡"}; });
    var gr = estado.elementos.filter(function (e) { return P[e.plantilla]; }).slice().sort(function (a, c) { return (usados[a.id] || "99").localeCompare(usados[c.id] || "99"); })
      .map(function (e) { return {v: e.id, nom: e.nombre, tipo: (CG.TIPOS[CG.tipoDe(e)] || "").toUpperCase(), num: usados[e.id] || "·", fav: !!e.fav, graf: true}; });
    return acc.concat(gr);
  }
  function pintarInsp() {
    var a = $("#botInsp"); if (!a) { return; }
    a.hidden = !editarBotonera; if (!editarBotonera) { return; }
    var b = botones()[selB];
    if (!b) {
      a.innerHTML = '<div class="bi-vacio"><div class="bi-ilus">👆</div><b>Toca un botón para editarlo</b><p>Puedes cambiar qué gráfica saca, su texto, su color y su tecla. Los cambios se ven al instante.</p><p>Para ordenarlos, <b>arrástralos</b> en la grilla.</p><button class="btn prim grande" id="biNuevo">+ Agregar botón</button></div>';
      $("#biNuevo").onclick = agregarBoton; return;
    }
    var v = b.esp ? ":" + b.esp : b.el, s2 = estadoBoton(b), ops = opcionesBot();
    var dueno = {}; botones().forEach(function (x, j) { if (x.tecla) { dueno[x.tecla] = j; } });
    var teclas = TECLAS_F.slice(); if (b.tecla && teclas.indexOf(b.tecla) < 0) { teclas.push(b.tecla); }
    var mostrarAcc = !b.esp && !s2.ev;
    a.innerHTML =
      '<div class="bi-cab"><span class="bi-prev" style="--c:' + esc(b.color || "#3A3F4E") + '">' + esc(nombreTecla(b.tecla) || "—") + '</span><div><small>BOTÓN ' + (selB + 1) + ' DE ' + botones().length + '</small><b>' + esc(b.etiqueta || s2.txt) + '</b></div><button class="btn ico" id="biCerrar" title="Cerrar">✕</button></div>' +
      '<div class="bi-sec"><label class="bi-tit"><span>1</span>¿Qué gráfica saca?</label>' +
        (function () {
          var nFav = ops.filter(function (o) { return o.fav; }).length, nGr = ops.filter(function (o) { return o.graf; }).length, m = modoFavBot();
          return '<div class="seg bi-filtro" id="biFiltro"><button data-f="todas" class="' + (m === "todas" ? "on" : "") + '">Todas (' + nGr + ')</button>' +
                 '<button data-f="fav" class="' + (m === "fav" ? "on" : "") + '">★ Favoritas (' + nFav + ')</button></div>';
        })() +
        '<input type="search" id="biBus" placeholder="Buscar gráfica…" value="' + esc(filtroBot) + '"><div class="bi-ops" id="biOps">' +
        ops.map(function (o) {
          return '<div role="button" tabindex="0" class="bi-op' + (o.v === v ? " on" : "") + (o.graf ? "" : " accion") + '" data-v="' + esc(o.v) + '" data-fav="' + (o.fav ? 1 : 0) + '">' +
            (o.graf ? '<span class="bi-star' + (o.fav ? " on" : "") + '" title="' + (o.fav ? "Quitar de favoritas" : "Agregar a favoritas") + '">★</span>' : '<span class="bi-star nada"></span>') +
            '<span class="bi-num">' + esc(o.num) + '</span><span class="bi-nom">' + esc(o.nom) + '</span><span class="bi-tipo">' + esc(o.tipo) + '</span></div>';
        }).join("") + '<div class="bi-sinfav" id="biSinFav" hidden>Aún no tienes favoritas.<br>Toca la <b>★</b> de cualquier gráfica para agregarla.<button class="btn mini" id="biVerTodas">Ver todas</button></div></div></div>' +
      '<div class="bi-sec"><label class="bi-tit" for="biEt"><span>2</span>Texto del botón</label><input type="text" id="biEt" maxlength="28" value="' + esc(b.etiqueta || "") + '" placeholder="' + esc(s2.txt.toUpperCase()) + '"><span class="nota">Si lo dejas vacío usa el nombre de la gráfica.</span></div>' +
      '<div class="bi-sec"><label class="bi-tit"><span>3</span>Color</label><div class="bi-cols">' + COLORES_B.map(function (x) { return '<button class="bi-col' + (x === b.color ? " on" : "") + '" data-c="' + x + '" style="background:' + x + '"></button>'; }).join("") +
        '<label class="bi-col bi-col-mas" title="Otro color"><input type="color" id="biColor" value="' + esc(b.color || "#3A3F4E") + '">+</label></div></div>' +
      '<div class="bi-sec"><label class="bi-tit"><span>4</span>Tecla</label><div class="bi-teclas">' +
        teclas.map(function (k) { var j = dueno[k], otro = j != null && j !== selB ? botones()[j] : null; return '<button class="bi-tecla' + (b.tecla === k ? " on" : "") + (otro ? " usada" : "") + '" data-k="' + esc(k) + '" title="' + (otro ? "La usa «" + esc(otro.etiqueta || estadoBoton(otro).txt) + "»: se le quitará" : "Libre") + '"><b>' + esc(nombreTecla(k)) + '</b><small>' + (b.tecla === k ? "este botón" : otro ? esc(otro.etiqueta || estadoBoton(otro).txt) : "libre") + '</small></button>'; }).join("") +
        '<button class="bi-tecla' + (!b.tecla ? " on" : "") + '" data-k=""><b>—</b><small>sin tecla</small></button></div>' +
        '<button class="btn bi-cap" id="biCap">⌨️ Presionar una tecla del teclado</button></div>' +
      (mostrarAcc ? '<div class="bi-sec"><label class="bi-tit"><span>5</span>Al presionar</label><div class="seg bi-acc" id="biAcc">' + [["alternar", "Muestra / oculta"], ["mostrar", "Solo muestra"], ["ocultar", "Solo oculta"]].map(function (x) { return '<button data-v="' + x[0] + '" class="' + ((b.accion || "alternar") === x[0] ? "on" : "") + '">' + x[1] + '</button>'; }).join("") + '</div></div>' : '') +
      (s2.e ? '<div class="bi-sec"><label class="bi-tit"><span>' + (mostrarAcc ? 6 : 5) + '</span>Transición</label><div class="bi-trs"><label><small>Entra con</small><select id="biTrE">' + opcionesTrans((s2.e.tr || {}).entra, s2.e.id) + '</select></label>' +
        (s2.ev ? '' : '<label><small>Sale con</small><select id="biTrS">' + opcionesTrans((s2.e.tr || {}).sale, s2.e.id) + '</select></label>') + '</div><span class="nota">Crea o sube transiciones en Configuración → Transiciones.</span></div>' : '') +
      '<div class="bi-pie"><button class="btn" id="biIzq" title="Mover a la izquierda">◀</button><button class="btn" id="biDer" title="Mover a la derecha">▶</button><button class="btn" id="biDup">Duplicar</button><button class="btn peligro" id="biDel">Eliminar</button></div>';
    var on = $(".bi-op.on", a); if (on && !filtroBot) { on.scrollIntoView({block: "nearest"}); }
    filtrarOps();
    $("#biCerrar").onclick = function () { selB = -1; cambioBot(true); };
    $("#biBus").oninput = function () { filtroBot = this.value; filtrarOps(); };
    $$("#biFiltro button", a).forEach(function (x) { x.onclick = function () { guardarLS("cg_bot_filtro", x.dataset.f); pintarInsp(); }; });
    $("#biVerTodas").onclick = function () { guardarLS("cg_bot_filtro", "todas"); pintarInsp(); };
    $("#biOps").onclick = function (ev) {
      var st = ev.target.closest(".bi-star");
      if (st && !st.classList.contains("nada")) {
        var fe = el(st.closest(".bi-op").dataset.v); if (!fe) { return; }
        fe.fav = !fe.fav; cambioBot(true);
        toast(fe.fav ? "«" + fe.nombre + "» agregada a favoritas" : "«" + fe.nombre + "» quitada de favoritas", "ok");
        return;
      }
      var o = ev.target.closest(".bi-op"); if (!o) { return; }
      var nv = o.dataset.v; b.el = nv.charAt(0) === ":" ? "" : nv; b.esp = nv.charAt(0) === ":" ? nv.slice(1) : ""; b.etiqueta = ""; filtroBot = "";
      cambioBot(true);
    };
    $("#biEt").oninput = function () { b.etiqueta = this.value.toUpperCase(); $(".bi-cab b", a).textContent = b.etiqueta || estadoBoton(b).txt; cambioBot(false, true); };
    $$(".bi-col[data-c]", a).forEach(function (x) { x.onclick = function () { b.color = x.dataset.c; cambioBot(true); }; });
    $("#biColor").oninput = function () { b.color = this.value; cambioBot(false, true); $(".bi-prev", a).style.setProperty("--c", b.color); };
    $$(".bi-tecla", a).forEach(function (x) { x.onclick = function () { asignarTecla(b, x.dataset.k); }; });
    $("#biCap").onclick = function () {
      var bt = this; bt.textContent = "Presiona la tecla ahora… (Esc cancela)"; bt.classList.add("esperando"); capturando = true;
      var f = function (ev) {
        ev.preventDefault(); ev.stopPropagation(); document.removeEventListener("keydown", f, true); capturando = null;
        if (ev.key === "Escape") { pintarInsp(); return; }
        if (/^(Tab|Enter|Shift|Control|Alt|Meta|CapsLock)$/.test(ev.key)) { toast("Esa tecla no se puede usar. Prueba otra.", "err"); pintarInsp(); return; }
        asignarTecla(b, ev.key);
      };
      document.addEventListener("keydown", f, true);
    };
    if ($("#biAcc")) { $$("#biAcc button", a).forEach(function (x) { x.onclick = function () { b.accion = x.dataset.v; cambioBot(true); }; }); }
    if ($("#biTrE")) { $("#biTrE").onchange = function () { s2.e.tr = Object.assign({}, s2.e.tr, {entra: this.value}); cambioBot(true); }; }
    if ($("#biTrS")) { $("#biTrS").onchange = function () { s2.e.tr = Object.assign({}, s2.e.tr, {sale: this.value}); cambioBot(true); }; }
    $("#biIzq").onclick = function () { moverBoton(selB, selB - 1); };
    $("#biDer").onclick = function () { moverBoton(selB, selB + 1); };
    $("#biDup").onclick = function () { var c = nuevoBoton(clon(b)); c.id = nuevoBoton({}).id; c.tecla = ""; botones().splice(selB + 1, 0, c); selB++; cambioBot(true); toast("Botón duplicado (sin tecla)", "ok"); };
    $("#biDel").onclick = function () {
      var quit = botones().splice(selB, 1)[0], pos = selB; selB = -1; cambioBot(true);
      toast("Botón eliminado", "", {txt: "Deshacer", fn: function () { botones().splice(pos, 0, quit); selB = pos; cambioBot(true); }});
    };
  }
  function filtrarOps() {
    var q = filtroBot.trim().toLowerCase(), soloFav = modoFavBot() === "fav", vis = 0;
    $$("#biOps .bi-op").forEach(function (o) {
      var ok = !(q && o.textContent.toLowerCase().indexOf(q) < 0);
      /* en Favoritas: solo las marcadas con ★ (y la que ya usa este botón, para no perderla de vista) */
      if (soloFav && o.dataset.fav !== "1" && !o.classList.contains("on")) { ok = false; }
      o.hidden = !ok; if (ok) { vis++; }
    });
    var sf = $("#biSinFav");
    if (sf) { sf.hidden = !(soloFav && !$$("#biOps .bi-op").some(function (o) { return o.dataset.fav === "1"; })); }
  }
  function asignarTecla(b, k) {
    var quitado = null;
    if (k) { botones().forEach(function (x) { if (x !== b && x.tecla === k) { x.tecla = ""; quitado = x; } }); }
    b.tecla = k || "";
    cambioBot(true);
    if (quitado) { toast("Tecla " + nombreTecla(k) + " movida desde «" + (quitado.etiqueta || estadoBoton(quitado).txt) + "»", "ok"); }
  }
  function moverBoton(i, j) {
    var bs = botones(); if (j < 0 || j >= bs.length || i === j) { return; }
    var x = bs.splice(i, 1)[0]; bs.splice(j, 0, x); selB = j; cambioBot(true);
  }
  function agregarBoton() {
    var b = nuevoBoton({color: COLORES_B[botones().length % COLORES_B.length]});
    var libre = TECLAS_F.filter(function (k) { return !botones().some(function (x) { return x.tecla === k; }); })[0];
    b.tecla = libre || "";
    var libres = estado.elementos.filter(function (e) { return P[e.plantilla] && !botones().some(function (x) { return x.el === e.id; }); });
    var g = (modoFavBot() === "fav" ? libres.filter(function (e) { return e.fav; })[0] : null) || libres[0];
    b.el = g ? g.id : ""; if (!g) { b.esp = "limpiar"; }
    botones().push(b); selB = botones().length - 1; filtroBot = ""; cambioBot(true);
    setTimeout(function () { var s = $("#biBus"); if (s && !esMovil()) { s.focus(); } var n = $('#botGrid .bt[data-i="' + selB + '"]'); if (n) { n.scrollIntoView({block: "nearest"}); } }, 30);
  }
  function disparar(b, nodo) {
    if (!b) { return; }
    if (nodo) { nodo.classList.remove("pulso"); void nodo.offsetWidth; nodo.classList.add("pulso"); }
    if (b.esp === "limpiar") { $("#bLimpiar").click(); return; }
    if (b.esp === "siguiente") { moverPaso(1); return; }
    if (b.esp === "anterior") { moverPaso(-1); return; }
    if (b.esp === "cortina") { $("#bCortina").click(); return; }
    var e = el(b.el); if (!e) { toast("Ese botón apunta a una gráfica que ya no existe. Edítalo.", "err"); return; }
    if (esEvento(e)) { lanzar(e.id, true); return; }
    var acc = b.accion || "alternar";
    if (acc === "ocultar" || (acc === "alternar" && e.on)) { ocultar(e.id); return; }
    mostrar(e.id, true, false, true);
  }
  function teclaBotonera(ev, escribiendo) {
    if (capturando) { return false; }
    if (escribiendo || !$("#modal").hidden || !estado || ev.repeat || ev.ctrlKey || ev.altKey || ev.metaKey) { return false; }
    var i = -1; botones().forEach(function (b, j) { if (i < 0 && b.tecla && b.tecla === ev.key) { i = j; } });
    if (i < 0) { return false; }
    ev.preventDefault();
    if (editarBotonera) { selB = i; dibujarBotonera(); pintarInsp(); return true; }
    disparar(botones()[i], $('#botGrid .bt[data-i="' + i + '"]'));
    return true;
  }
  /* clic normal = disparar; en edición: tocar = editar, arrastrar = mover (mouse en todo el botón, dedo desde ⠿) */
  var arr = null, tocado = 0;
  /* «⚡ Al tocar» por equipo (por defecto encendido en celulares y tablets) */
  var alTocar = leerLS("cg_bot_al_tocar", null); if (alTocar === null) { alTocar = tactil(); }
  /* el acomodo se calcula en píxeles con el tamaño REAL de la botonera (no depende de cómo cada navegador
     resuelve las filas "1fr"). Si la botonera todavía no tiene tamaño (oculta, cargando) o los botones quedarían
     demasiado chicos, se muestra la botonera normal con scroll: nunca quedan botones invisibles. */
  function ajusteBotonera() {
    var g = $("#botGrid"); if (!g) { return; }
    document.body.classList.toggle("bot-ajustar", !!alTocar);
    var b = $("#bToque"); if (b) { b.classList.toggle("on", !!alTocar); b.setAttribute("aria-pressed", alTocar ? "true" : "false"); }
    var encaja = false;
    if (alTocar && !editarBotonera) {
      var n = botones().length || 1, cols = esMovil() ? 2 : (+((estado && estado.botonera) || {}).columnas || 4);
      if (esMovil() && n > 16) { cols = 3; }
      var filas = Math.ceil(n / cols), gap = 8, w = g.clientWidth, h = g.clientHeight;
      var cs = getComputedStyle(g), padV = (parseFloat(cs.paddingTop) || 0) + (parseFloat(cs.paddingBottom) || 0), padH = (parseFloat(cs.paddingLeft) || 0) + (parseFloat(cs.paddingRight) || 0);
      var alto = Math.floor((h - padV - gap * (filas - 1)) / filas), anchoC = (w - padH - gap * (cols - 1)) / cols;
      if (w > 0 && h > 0 && alto >= 44) {
        encaja = true;
        g.style.setProperty("--cols", cols);
        g.style.gridTemplateColumns = "repeat(" + cols + ",minmax(0,1fr))";
        g.style.setProperty("--alto-bt", alto + "px");
        g.style.setProperty("--fs-bt", Math.max(9, Math.min(17, (alto - (esMovil() ? 22 : 34)) / 2.3, anchoC / 8.4)).toFixed(1) + "px");
      }
    }
    if (!encaja) { g.style.gridTemplateColumns = ""; g.style.removeProperty("--alto-bt"); g.style.removeProperty("--fs-bt"); g.style.setProperty("--cols", +((estado && estado.botonera) || {}).columnas || 4); }
    document.body.classList.toggle("bot-encaja", encaja);
    /* red de seguridad: si en este navegador los botones igual quedaran sin alto, vuelve a la botonera normal */
    if (encaja) { requestAnimationFrame(function () { var b1 = $("#botGrid .bt[data-i]"); if (b1 && b1.getBoundingClientRect().height < 30 && g.clientHeight > 0) { document.body.classList.remove("bot-encaja"); g.style.gridTemplateColumns = ""; } }); }
  }
  /* se vuelve a acomodar cuando la botonera cambia de tamaño o aparece (cambio de pestaña, girar el celular, cargar la sala) */
  if (window.ResizeObserver) { new ResizeObserver(function () { if (alTocar && estado) { ajusteBotonera(); } }).observe($("#botGrid")); }
  $("#bToque").onclick = function () {
    alTocar = !alTocar; guardarLS("cg_bot_al_tocar", alTocar);
    dibujarBotonera();
    toast(alTocar ? "⚡ Al tocar: los botones salen apenas los tocas" : "Los botones salen al soltar el dedo (con scroll)");
  };
  addEventListener("resize", function () { if (alTocar) { ajusteBotonera(); } });
  /* el botón se dispara al TOCAR (no al soltar): con mouse siempre; con el dedo, si la botonera cabe en pantalla.
     Si la botonera tiene scroll, con el dedo se dispara al soltar para no lanzar gráficas al deslizar. */
  function conScroll(n) {
    for (var x = n; x && x !== document.documentElement; x = x.parentElement) { var cs = getComputedStyle(x); if (/(auto|scroll)/.test(cs.overflowY) && x.scrollHeight > x.clientHeight + 2) { return true; } }
    var se = document.scrollingElement; return !!se && se.scrollHeight > se.clientHeight + 2;
  }
  $("#botGrid").addEventListener("pointerdown", function (ev) {
    if (editarBotonera || ev.button > 0 || ev.isPrimary === false) { return; }
    var t = ev.target.closest(".bt[data-i]"); if (!t) { return; }
    if (ev.pointerType === "touch" && conScroll($("#botGrid"))) { return; }
    tocado = Date.now(); disparar(botones()[+t.dataset.i], t);
  });
  $("#botGrid").addEventListener("click", function (ev) {
    if (!editarBotonera && Date.now() - tocado < 900) { return; } /* ya se disparó al tocar */
    var t = ev.target.closest(".bt"); if (!t) { return; }
    if (t.id === "btMas") { agregarBoton(); return; }
    if (editarBotonera) { if (arr && arr.movido) { return; } selB = +t.dataset.i; filtroBot = ""; dibujarBotonera(); pintarInsp(); if (esMovil()) { $("#botInsp").scrollTop = 0; } return; }
    disparar(botones()[+t.dataset.i], t);
  });
  $("#botGrid").addEventListener("pointerdown", function (ev) {
    if (!editarBotonera || ev.button > 0) { return; }
    var t = ev.target.closest(".bt[data-i]"); if (!t) { return; }
    if (ev.pointerType !== "mouse" && !ev.target.closest(".bt-asa")) { return; }
    arr = {i: +t.dataset.i, x: ev.clientX, y: ev.clientY, movido: false, fant: null};
    if (ev.pointerType !== "mouse") { ev.preventDefault(); }
  });
  addEventListener("pointermove", function (ev) {
    if (!arr) { return; }
    if (!arr.movido) {
      if (Math.abs(ev.clientX - arr.x) + Math.abs(ev.clientY - arr.y) < 8) { return; }
      arr.movido = true; document.body.classList.add("bot-arrastrando");
      var src = $('#botGrid .bt[data-i="' + arr.i + '"]'), r = src.getBoundingClientRect();
      arr.fant = src.cloneNode(true); arr.fant.classList.add("bt-fantasma"); arr.fant.style.width = r.width + "px"; arr.fant.style.height = r.height + "px";
      arr.dx = arr.x - r.left; arr.dy = arr.y - r.top; document.body.appendChild(arr.fant);
    }
    arr.fant.style.transform = "translate(" + (ev.clientX - arr.dx) + "px," + (ev.clientY - arr.dy) + "px) rotate(-2deg) scale(1.04)";
    var bajo = document.elementFromPoint(ev.clientX, ev.clientY), t = bajo && bajo.closest("#botGrid .bt[data-i]");
    if (t && +t.dataset.i !== arr.i) { var bs = botones(), x = bs.splice(arr.i, 1)[0], j = +t.dataset.i; bs.splice(j, 0, x); arr.i = j; selB = j; dibujarBotonera(); }
    var n = $('#botGrid .bt[data-i="' + arr.i + '"]'); if (n) { n.classList.add("hueco"); }
  });
  function soltar() {
    if (!arr) { return; }
    var a2 = arr;
    if (a2.fant) { a2.fant.remove(); }
    document.body.classList.remove("bot-arrastrando");
    if (a2.movido) { cambioBot(true); setTimeout(function () { arr = null; }, 0); } else { arr = null; }
  }
  addEventListener("pointerup", soltar); addEventListener("pointercancel", soltar);
  $("#bModoComp").onclick = function () { modoDisp("completo"); };
  $("#bBotCfg").onclick = function () { config("botonera"); };
  $("#bEditBot").onclick = function () { editarBotonera = !editarBotonera; if (!editarBotonera) { selB = -1; } dibujarBotonera(); pintarInsp(); };
  $("#botMenos").onclick = function () { estado.botonera.columnas = Math.max(2, (estado.botonera.columnas || 4) - 1); cambioBot(false); };
  $("#botMas").onclick = function () { estado.botonera.columnas = Math.min(8, (estado.botonera.columnas || 4) + 1); cambioBot(false); };
  $("#bBotAyuda").onclick = function () {
    modal("<h2>Botonera y teclado</h2><p class='lead'>Cada botón muestra u oculta una gráfica con un toque (o lanza una transición).</p><ul class='pasos'>" +
      "<li><b>Para editar</b>: toca «✏️ Editar botones» y luego toca cualquier botón. A la derecha eliges la gráfica, el texto, el color y la tecla. Todo se guarda solo.</li>" +
      "<li><b>Para ordenar</b>: en modo edición arrastra los botones (en el celular, desde el ícono ⠿).</li>" +
      "<li>Las teclas <b>F13 a F24</b> (o cualquier otra que elijas) disparan su botón <b>en cualquier pestaña</b> del panel. Teclados externos, macro pads y Stream Deck pueden enviar F13–F24 desde su programa.</li>" +
      "<li>Las teclas funcionan con la ventana del panel <b>al frente</b>. Si usas el panel como dock de OBS, haz clic en el dock antes de usar el teclado.</li>" +
      "<li>Los botones usan lo <b>guardado</b> de cada gráfica, no lo que estés escribiendo en el editor.</li></ul>" +
      "<div class='modal-pie'><button class='btn prim' onclick=\"document.querySelector('#modal .cerrar').click()\">Entendido</button></div>");
  };
  $("#bBotRest").onclick = function () {
    confirmar("¿Restaurar botonera?", "Vuelve a los botones iniciales con las teclas F13–F24. Tus gráficas no se tocan.", "Restaurar").then(function (ok) { if (!ok) { return; } delete estado.botonera; sembrarBotonera(estado); selB = -1; publicar(); pintarInsp(); });
  };

  window.CG_PANEL = {estado: function () { return estado; }, seleccionar: seleccionar, mostrar: mostrar, ocultar: ocultar, borrador: borrador, lanzar: lanzar, botones: botones}; /* para pruebas */
  iniciar();
})();
