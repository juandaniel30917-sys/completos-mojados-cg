/* COMPLETOS MOJADOS · CG — conexión HyperDeck (solo lectura). Lo usan el panel y contador/index.html.
   El emisor (contador/estudio/server.py) corre en un PC de la red del estudio, lee el VTR y el REC
   y publica por Supabase Realtime cada cambio al instante (+ un latido por segundo).

   Sin retraso:
   - cada lectura trae "t" = hora UTC exacta (NTP) en que se leyó el HyperDeck. La pantalla resta esa
     hora a la suya, así el viaje por internet (0,1–0,3 s) ya está descontado en el número.
   - PREDICCIÓN: el fin de cada clip se conoce al cuadro, así que al llegar a 0 la pantalla pasa sola al
     clip siguiente (o se detiene / repite según loop) sin esperar la señal del estudio.
   - SUAVIZADO: entre mensajes corre con el reloj local; las pequeñas correcciones se absorben de a poco
     (sin saltos). Play / stop / salto real => corrige de inmediato. */
(function () {
  "use strict";
  var CG = window.CG = window.CG || {};
  var CFG = window.CG_CONFIG || {};
  var REF = ((CFG.SUPABASE_URL || "").match(/\/\/([^.]+)\./) || [])[1] || "wxfzyyvjtrflfrhwswam";
  var KEY = CFG.SUPABASE_ANON_KEY || "sb_publishable_sslALDjrDSbZ-EH-wJbtyw_1DHtFZjC";
  var CANAL_DEF = "hd-completos-mojados";

  function z(x) { return (x < 10 ? "0" : "") + x; }
  function fmt(frames, fps) {
    fps = fps || 59.94; frames = Math.max(0, Math.floor(frames + 1e-6));
    var n = Math.round(fps), s = Math.floor(frames / fps), ff = Math.min(n - 1, Math.floor(frames - s * fps));
    var h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60); s = s % 60;
    return (h ? z(h) + ":" : "") + z(m) + ":" + z(s) + ":" + z(ff);
  }
  function hms(sec) { sec = Math.max(0, Math.floor(sec)); return z(Math.floor(sec / 3600)) + ":" + z(Math.floor(sec % 3600 / 60)) + ":" + z(sec % 60); }

  /* ms transcurridos desde la lectura: hora exacta del emisor si el reloj de esta pantalla cuadra;
     si no (reloj desajustado), desde que llegó el mensaje. */
  function desde(d, recibido) {
    var l = Date.now() - (d.t || 0);
    return (d.t && l > -1500 && l < 8000) ? Math.max(0, l) : Date.now() - recibido;
  }

  /* Estado VTR "ideal" ahora mismo, con predicción del paso al clip siguiente. */
  function calcVtr(d, recibido) {
    if (!d || !d.frames) { return null; }
    var fps = d.fps || 59.94, idx = d.idx, rest = d.restante, fr = d.frames, nom = d.nombre, total = d.total;
    var corre = d.estado === "play", sp = d.speed || 1, lista = d.lista || [], fin = false, g = 0;
    if (corre) { rest -= desde(d, recibido) / 1000 * fps * sp; }
    while (corre && rest < 0 && g++ < 500) {
      if (d.single) { if (d.loop) { rest += fr; continue; } rest = 0; fin = true; break; }
      if (lista[idx + 1]) { idx++; }
      else if (d.loop && lista.length) { idx = 0; }
      else { rest = 0; fin = true; break; }
      fr = lista[idx].f; nom = lista[idx].n; rest += fr;
    }
    return {restante: Math.max(0, rest), frames: fr, nombre: nom || ("Clip " + (idx + 1)), idx: idx, total: total,
      fps: fps, corre: corre && !fin, estado: fin ? "stop" : d.estado, fin: fin};
  }

  function escuchar(canal, cb) {
    var ws = null, hb = null, ref = 1, espera = 500, vivo = true;
    var D = {vtr: null, rec: null}, R = {vtr: 0, rec: 0};
    var vis = null, visIdx = -1, visT = 0;          // suavizado del VTR

    function enviar(o) { o.ref = String(ref++); if (ws && ws.readyState === 1) { ws.send(JSON.stringify(o)); } }
    function abrir() {
      if (!vivo) { return; }
      try { ws = new WebSocket("wss://" + REF + ".supabase.co/realtime/v1/websocket?apikey=" + KEY + "&vsn=1.0.0"); }
      catch (e) { setTimeout(abrir, espera); return; }
      ws.onopen = function () {
        espera = 500;
        enviar({topic: "realtime:" + canal, event: "phx_join", payload: {config: {broadcast: {self: false}, presence: {key: ""}, postgres_changes: [], "private": false}, access_token: KEY}});
        clearInterval(hb); hb = setInterval(function () { enviar({topic: "phoenix", event: "heartbeat", payload: {}}); }, 25000);
      };
      ws.onmessage = function (ev) {
        var m; try { m = JSON.parse(ev.data); } catch (e) { return; }
        if (m.event !== "broadcast" || !m.payload) { return; }
        var e = m.payload.event, p = m.payload.payload, ahora = Date.now();
        if (e === "hd" && p) { if (p.vtr) { D.vtr = p.vtr; R.vtr = ahora; } if (p.rec) { D.rec = p.rec; R.rec = ahora; } }
        else if (e === "estado") { D.vtr = p; R.vtr = ahora; }          // emisor antiguo
        else if (e === "rec") { D.rec = p; R.rec = ahora; }
        else { return; }
        if (cb) { cb(D); }
      };
      ws.onclose = function () { clearInterval(hb); if (vivo) { setTimeout(abrir, espera); espera = Math.min(espera * 2, 5000); } };
      ws.onerror = function () { try { ws.close(); } catch (e) {} };
    }
    abrir();
    /* si la pestaña vuelve del fondo (celular bloqueado), reconectar al tiro */
    document.addEventListener("visibilitychange", function () { if (!document.hidden && ws && ws.readyState > 1) { espera = 0; abrir(); } });

    function vtr() {
      var c = calcVtr(D.vtr, R.vtr), now = (window.performance && performance.now) ? performance.now() : Date.now();
      if (!c) { vis = null; return null; }
      if (vis === null || c.idx !== visIdx || !c.corre) { vis = c.restante; }
      else {
        var pred = vis - (now - visT) / 1000 * c.fps * ((D.vtr && D.vtr.speed) || 1), dif = c.restante - pred;
        vis = Math.abs(dif) > c.fps * 0.1 ? c.restante : pred + dif * 0.12;   // >6 cuadros = cambio real
      }
      visIdx = c.idx; visT = now; c.restante = Math.max(0, vis);
      return c;
    }
    function rec() {
      var d = D.rec; if (!d) { return null; }
      var grab = d.estado === "rec", seg = d.transcurrido || 0;
      if (grab) {
        var l = Date.now() - (d.t || 0);
        seg = (d.inicio && d.t && l > -1500 && l < 8000) ? (Date.now() - d.inicio) / 1000 : seg + (Date.now() - R.rec) / 1000;
      }
      return {grabando: grab, seg: Math.max(0, seg), tc: d.tc || "", sinhd: d.estado === "sinhd"};
    }
    return {
      cerrar: function () { vivo = false; clearInterval(hb); try { ws.close(); } catch (e) {} },
      edad: function (k) { var t = R[k || "vtr"]; return t ? Date.now() - t : Infinity; },
      ultimo: function (k) { return D[k || "vtr"]; },
      vtr: vtr, rec: rec,
      restante: function () { var c = vtr(); return c ? c.restante : null; }
    };
  }

  /* bucle de dibujo fluido (60 fps) con respaldo para navegadores viejos de TV */
  function cuadro(fn) {
    var raf = window.requestAnimationFrame || function (f) { return setTimeout(f, 16); };
    (function paso() { try { fn(); } catch (e) {} raf(paso); })();
  }

  CG.HD = {
    escuchar: escuchar, calcVtr: calcVtr, fmt: fmt, hms: hms, cuadro: cuadro,
    linkVisor: function (base, canal) { return base + "contador/?c=" + encodeURIComponent(canal); },
    /* por defecto escucha el canal fijo del emisor del estudio (sin pegar códigos) */
    canalGuardado: function () { try { var v = localStorage.getItem("cg_hd_canal"); return v === null ? CANAL_DEF : v; } catch (e) { return CANAL_DEF; } },
    guardarCanal: function (c) { try { localStorage.setItem("cg_hd_canal", c || ""); } catch (e) {} }
  };
})();
