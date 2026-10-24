/* COMPLETOS MOJADOS · CG — motor de la salida.
   Recibe el estado (qué elementos están al aire y con qué datos) y lo dibuja con animaciones.
   - Un elemento que entra: animación de entrada.
   - Un elemento al aire al que le cambias el texto: fundido cruzado, sin repetir la entrada.
   - Un elemento que sale: animación de salida.
   Lo usan salida.html (la que va a OBS) y los monitores del panel (vista previa y programa). */
(function () {
  "use strict";
  var CG = window.CG, P = CG.PLANTILLAS, esc = CG.esc;
  var COL = {ketchup: "#E02A12", mostaza: "#F59A23", mayo: "#FFF3D6", palta: "#6AA832"};

  /* qué cambios obligan a volver a dibujar (el resto se actualiza en caliente) */
  P.temporizador.firma = function (d) { var c = Object.assign({}, d); delete c.run; return c; };
  P.video.firma = function (d) { return [d.media, d.modo, d.ajuste, d.x, d.y, d.escala]; };

  /* achica el texto que no cabe (como el "fit" de los scripts de After Effects) */
  CG.ajustarTextos = function (raiz) {
    raiz.querySelectorAll("[data-fit]").forEach(function (t) {
      t.style.fontSize = "";
      var max = +t.getAttribute("data-fit"), w = t.scrollWidth;
      if (w > max) { var fs = parseFloat(getComputedStyle(t).fontSize); t.style.fontSize = Math.floor(fs * max / w) + "px"; }
    });
  };

  CG.crearSalida = function (op) {
    var stage = op.stage, capas = {}, vistos = {}, primera = true, estado = null;
    var ctx = {base: op.base || "", monitor: !!op.monitor, logo: "", media: {}, resolver: op.resolverMedia, onFin: op.onFin || function () {}, onError: op.onError || function () {}};
    var cajaAvisos = document.createElement("div"); cajaAvisos.id = "avisos"; stage.appendChild(cajaAvisos);
    var cajaCortina = document.createElement("div"); cajaCortina.className = "capa"; cajaCortina.id = "cortina"; stage.appendChild(cajaCortina);
    var cajaSalp = document.createElement("div"); cajaSalp.className = "capa"; cajaSalp.id = "salp"; stage.appendChild(cajaSalp);

    function firma(el) { var p = P[el.plantilla]; return JSON.stringify([p.firma ? p.firma(el.datos) : el.datos, ctx.logo]); }

    function cuerpo(el, entrando) {
      var p = P[el.plantilla], c = document.createElement("div");
      c.className = "cuerpo t-" + el.plantilla + (entrando ? " entra" : "");
      c.innerHTML = p.render(el.datos, ctx);
      return c;
    }
    function montar(capa, c, el) {
      var p = P[el.plantilla];
      CG.ajustarTextos(c);
      if (document.fonts && document.fonts.ready) { document.fonts.ready.then(function () { CG.ajustarTextos(c); }); }
      var lctx = Object.create(ctx);
      lctx.ocultarme = function () { if (capa.vivo) { salir(el.id); ctx.onFin(el.id); } };
      lctx.fin = lctx.ocultarme;
      c._m = p.montar ? p.montar(c, el.datos, lctx) : null;
      if (c.classList.contains("entra")) { setTimeout(function () { c.classList.remove("entra"); }, 2600); }
    }
    /* velocidad de animación: la del elemento × la general (afecta entradas, salidas y animaciones continuas) */
    function ritmo(el) { return Math.max(0.25, ((+(el.datos && el.datos.vel) || 100) / 100) * (CG.velocidad || 1)); }
    function aplicarRitmo(nodo, r) {
      if (Math.abs(r - 1) < 0.01 || !nodo.getAnimations) { return; }
      var f = function () { try { nodo.getAnimations({subtree: true}).forEach(function (a) { a.playbackRate = r; }); } catch (e) {} };
      f(); requestAnimationFrame(f);
    }
    function desmontar(c) { try { if (c._m && c._m.destruir) { c._m.destruir(); } } catch (e) {} c.remove(); }

    function entrar(el) {
      var p = P[el.plantilla], capa = document.createElement("div");
      capa.className = "el"; capa.style.zIndex = p.capa || 50; capa.dataset.id = el.id; capa.vivo = true;
      var c = cuerpo(el, true); capa.appendChild(c); stage.appendChild(capa);
      capas[el.id] = {capa: capa, c: c, firma: firma(el), plantilla: el.plantilla, ritmo: ritmo(el)};
      montar(capa, c, el); aplicarRitmo(c, capas[el.id].ritmo);
      salpicaduraDe(el);
    }
    function cambiar(el) {
      var r = capas[el.id], f = firma(el);
      if (r.firma === f) { if (r.c._m && r.c._m.actualizar) { r.c._m.actualizar(el.datos); } return; }
      /* cambió el contenido estando al aire: fundido cruzado sin repetir la entrada */
      var vieja = r.c, nueva = cuerpo(el, false);
      nueva.classList.add("swap-in"); vieja.classList.add("swap-out");
      r.capa.appendChild(nueva); r.c = nueva; r.firma = f; r.ritmo = ritmo(el);
      montar(r.capa, nueva, el); aplicarRitmo(nueva, r.ritmo);
      setTimeout(function () { desmontar(vieja); nueva.classList.remove("swap-in"); }, 420);
    }
    function salir(id) {
      var r = capas[id]; if (!r) { return; }
      delete capas[id]; r.capa.vivo = false;
      var p = P[r.plantilla]; r.c.classList.remove("entra"); r.c.classList.add("sale");
      if (r.c._m && r.c._m.saliendo) { r.c._m.saliendo(); }
      aplicarRitmo(r.c, r.ritmo || 1);
      setTimeout(function () { desmontar(r.c); r.capa.remove(); }, (p.salidaMs || 600) / (r.ritmo || 1) + 60);
    }

    function aplicar(st) {
      if (!st || !st.elementos) { return; }
      estado = st;
      ctx.logo = st.logo || "";
      ctx.media = {}; (st.biblioteca || []).forEach(function (m) { ctx.media[m.id] = m; });
      var vel = ((st.ajustes && st.ajustes.velocidad) || 100) / 100; CG.velocidad = vel;
      document.documentElement.style.setProperty("--vel", vel);
      var quiero = {};
      st.elementos.forEach(function (el) { if (el.on && P[el.plantilla] && !P[el.plantilla].evento) { quiero[el.id] = el; } });
      /* si hay un zócalo al aire, los GC de abajo suben solos para no taparse */
      stage.classList.toggle("con-zocalo", Object.keys(quiero).some(function (id) { return quiero[id].plantilla === "zocalo"; }));
      Object.keys(capas).forEach(function (id) { if (!quiero[id]) { salir(id); } });
      Object.keys(quiero).forEach(function (id) { if (capas[id]) { cambiar(quiero[id]); } else { entrar(quiero[id]); } });
      /* eventos de un disparo (avisos, cortinas, órdenes): solo los nuevos */
      (st.ev || []).forEach(function (e) { if (!vistos[e.id]) { vistos[e.id] = 1; if (!primera) { evento(e); } } });
      primera = false;
    }

    function evento(e) {
      if (e.tipo === "aviso") { aviso(e.datos || {}); }
      else if (e.tipo === "cortina") { cortina((e.datos && e.datos.estilo) || "bandas"); }
      else if (P[e.tipo] && P[e.tipo].lanzar) { P[e.tipo].lanzar(cajaCortina, e.datos || {}, ctx); }
      else if (e.tipo === "limpiar") { if (P.transicion && P.transicion.cancelar) { P.transicion.cancelar(); } cajaAvisos.innerHTML = ""; cajaCortina.className = "capa"; cajaCortina.innerHTML = ""; cajaSalp.innerHTML = ""; }
    }
    function limpiarTodo() { Object.keys(capas).forEach(salir); }

    /* ---------- salpicaduras ---------- */
    function salpicar(x, y, cols, n, dist) {
      for (var i = 0; i < (n || 10); i++) {
        var a = i / (n || 10) * Math.PI * 2 + Math.random() * 0.5, d = (dist || 200) * (0.6 + Math.random() * 0.7), s = document.createElement("i"), z = 18 + Math.random() * 26;
        s.className = "salp"; s.style.cssText = "left:" + x + "px;top:" + y + "px;background:" + cols[i % cols.length] + ";width:" + z + "px;height:" + z + "px;margin:" + (-z / 2) + "px";
        s.style.setProperty("--dx", Math.cos(a) * d + "px"); s.style.setProperty("--dy", Math.sin(a) * d * 0.7 + "px");
        cajaSalp.appendChild(s); setTimeout(function (el) { el.remove(); }.bind(null, s), 800);
      }
    }
    function salpicaduraDe(el) {
      var d = el.datos, t = el.plantilla;
      var pos = {gcNoticiero: [900, 1080 - 290 - (+d.subir || 0)], gcPrograma: [(+d.x || 60) + 320, (+d.y || 640) + 60], placa: [960, 470], etiqueta: [+d.x || 960, +d.y || 300]}[t];
      if (pos) { setTimeout(function () { salpicar(pos[0], pos[1], [COL.ketchup, COL.mostaza, COL.mayo], t === "placa" ? 14 : 10, t === "placa" ? 520 : 240); }, 380); }
    }

    /* ---------- avisos ---------- */
    var ICO = {
      aviso: '<svg viewBox="0 0 24 24"><path fill="#2A1204" d="M3 10v4h3l6 4V6L6 10H3zm13.5 2a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4zM14 3.2v2.1a7 7 0 0 1 0 13.4v2.1a9 9 0 0 0 0-17.6z"/></svg>',
      saludo: '<svg viewBox="0 0 24 24"><path fill="#2A1204" d="M12 21.4 10.6 20C5.4 15.4 2 12.3 2 8.5 2 5.4 4.4 3 7.5 3c1.7 0 3.4.8 4.5 2.1C13.1 3.8 14.8 3 16.5 3 19.6 3 22 5.4 22 8.5c0 3.8-3.4 6.9-8.6 11.5L12 21.4z"/></svg>',
      red: '<svg viewBox="0 0 24 24"><path fill="#2A1204" d="M12 2a10 10 0 1 0 5 18.7l-1-1.7A8 8 0 1 1 20 12v1.5a1.5 1.5 0 0 1-3 0V12a5 5 0 1 0-1.5 3.5A3.5 3.5 0 0 0 22 13.5V12A10 10 0 0 0 12 2zm0 13a3 3 0 1 1 0-6 3 3 0 0 1 0 6z"/></svg>',
      auspicio: '<svg viewBox="0 0 24 24"><path fill="#2A1204" d="m12 2 3 6.6 7.2.7-5.4 4.8 1.6 7.1L12 17.5 5.6 21.2l1.6-7.1L1.8 9.3 9 8.6z"/></svg>'
    };
    function aviso(a) {
      var seg = Math.max(2, +a.seg || 7), d = document.createElement("div"), tipo = ICO[a.tipo] ? a.tipo : "aviso";
      d.className = "aviso aviso-" + tipo;
      d.innerHTML = '<div class="cab"><div class="ico">' + ICO[tipo] + '</div><div class="tit imp ol-s">' + esc(a.titulo) + '</div></div>' +
        (a.texto ? '<div class="cuerpoAv">' + esc(a.texto) + '</div>' : '') + '<div class="barraT"><i></i></div><div class="chorro"><i></i><i></i><i></i></div>';
      cajaAvisos.appendChild(d);
      while (cajaAvisos.children.length > 3) { cajaAvisos.firstChild.remove(); }
      d.querySelector(".barraT i").animate([{transform: "scaleX(1)"}, {transform: "scaleX(0)"}], {duration: seg * 1000, easing: "linear", fill: "forwards"});
      setTimeout(function () { salpicar(1250, 380, [COL.ketchup, COL.mostaza, COL.palta], 9, 180); }, 350);
      setTimeout(function () { d.classList.add("sale"); setTimeout(function () { d.remove(); }, 500); }, seg * 1000);
    }

    /* ---------- cortina de salsa ---------- */
    function cortina(estilo) {
      var el = cajaCortina, cols = ["#E02A12", "#FFF3D6", "#F59A23", "#6AA832"];
      el.className = "capa"; el.innerHTML = "";
      if (estilo === "iris") {
        ["#F59A23", "#FFF3D6", "#E02A12"].forEach(function (c, i) { el.insertAdjacentHTML("beforeend", '<i class="circ" style="background:' + c + ';--s:' + (5.6 - i * 0.7) + ';animation-delay:' + i * 0.1 + 's"></i>'); });
        el.classList.add("iris");
      } else {
        [-520, -160, 200, 560, 900, 1260].forEach(function (y, i) { el.insertAdjacentHTML("beforeend", '<i class="banda" style="top:' + y + 'px;background:' + cols[i % 4] + ';animation-delay:' + i * 0.07 + 's"></i>'); });
      }
      void el.offsetWidth; el.classList.add("anda");
      setTimeout(function () { salpicar(960, 540, ["#E02A12", "#F59A23", "#FFF3D6"], 16, 620); }, 700);
      setTimeout(function () { el.className = "capa"; el.innerHTML = ""; }, 2100);
    }

    return {
      aplicar: aplicar, evento: evento, limpiar: limpiarTodo,
      alAire: function () { return Object.keys(capas); },
      /* vuelve a dibujar todo desde cero (botón "repetir animación" de la vista previa) */
      repetir: function () { Object.keys(capas).forEach(function (id) { var r = capas[id]; desmontar(r.c); r.capa.remove(); delete capas[id]; }); if (estado) { var e = estado; estado = null; aplicar(e); } }
    };
  };

  /* ===================== VIDEO ===================== */
  CG.montarVideo = function (el, d, ctx) {
    var caja = el.querySelector(".vd-in"), err = el.querySelector(".vd-err"), m = ctx.media[d.media], v = document.createElement("video"), keyer = null, vivo = true, ultCmd = d.cmd && d.cmd.id;
    function error(msg) { if (err) { err.textContent = msg; err.style.display = ctx.monitor ? "flex" : "none"; } ctx.onError(msg); }
    if (!m) { error("No se encontró el video en la biblioteca."); return null; }
    if (/quicktime|\.mov($|\?)/i.test((m.tipo || "") + " " + (m.url || "")) && !m.convertido) {
      error("Los archivos .MOV (ProRes) no se pueden reproducir en navegadores ni en OBS-navegador. Expórtalo como MP4 (H.264) con fondo verde o WebM VP9 con transparencia.");
    }
    v.muted = !d.audio; v.volume = Math.min(1, Math.max(0, (+d.volumen || 0) / 100)); v.loop = !!d.bucle; v.playsInline = true; v.preload = "auto";
    v.crossOrigin = "anonymous"; v.setAttribute("playsinline", "");
    v.addEventListener("error", function () { if (vivo) { error("No se pudo cargar el video. Revisa el archivo o tu conexión."); } });
    v.addEventListener("ended", function () { if (vivo && !d.bucle && d.ocultarAlFinal) { ctx.fin(); } });
    caja._video = v; /* acceso para pruebas y para el panel */
    var modo = d.modo || m.modo || "normal";
    if (modo === "chroma") {
      var cv = document.createElement("canvas"); caja.appendChild(cv);
      try { keyer = CG.Chroma(cv, v); keyer.config(d); caja._keyer = keyer; } catch (e) { error("Este equipo no soporta WebGL: no se puede quitar el verde. " + e.message); caja.appendChild(v); }
    } else { caja.appendChild(v); }
    function reproducir() {
      var p = v.play();
      if (p && p.catch) { p.catch(function () { if (!v.muted) { v.muted = true; ctx.onError("El navegador bloqueó el sonido: el video sigue sin audio. En OBS funciona con sonido."); v.play().catch(function () {}); } }); }
    }
    Promise.resolve(ctx.resolver ? ctx.resolver(m) : m.url).then(function (url) {
      if (!vivo) { return; }
      if (!url) { error("Este video está guardado solo en otro equipo (modo local). Súbelo a la sala para usarlo aquí."); return; }
      v.src = url; reproducir();
    }, function (e) { error((e && e.message) || "No se pudo abrir el video."); });
    return {
      actualizar: function (nd) {
        d = nd; v.loop = !!d.bucle; v.muted = !d.audio; v.volume = Math.min(1, Math.max(0, (+d.volumen || 0) / 100));
        if (keyer) { keyer.config(d); }
        var c = d.cmd;
        if (c && c.id && c.id !== ultCmd) {
          ultCmd = c.id;
          if (c.a === "pausa") { v.pause(); } else if (c.a === "play") { reproducir(); } else if (c.a === "reiniciar") { v.currentTime = 0; reproducir(); }
        }
      },
      destruir: function () { vivo = false; if (keyer) { keyer.destruir(); } v.pause(); v.removeAttribute("src"); v.load(); },
      video: v
    };
  };
})();
