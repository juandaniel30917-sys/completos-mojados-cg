/* COMPLETOS MOJADOS · CG — conexión HyperDeck (solo lectura).
   El emisor (contador/estudio/server.py) corre en un PC de la red del estudio, lee el HyperDeck
   y publica cada 0,5 s el clip y el tiempo restante en un canal de Supabase Realtime.
   Aquí solo escuchamos ese canal: no depende de la IP del HyperDeck ni del PC. */
(function () {
  "use strict";
  var CG = window.CG = window.CG || {};
  var CFG = window.CG_CONFIG || {};
  var REF = ((CFG.SUPABASE_URL || "").match(/\/\/([^.]+)\./) || [])[1] || "wxfzyyvjtrflfrhwswam";
  var KEY = CFG.SUPABASE_ANON_KEY || "";

  function z(x) { return (x < 10 ? "0" : "") + x; }
  function fmt(frames, fps) {
    fps = fps || 59.94; frames = Math.max(0, Math.floor(frames));
    var n = Math.round(fps), s = Math.floor(frames / fps), ff = Math.min(n - 1, Math.floor(frames - s * fps));
    var h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60); s = s % 60;
    return (h ? z(h) + ":" : "") + z(m) + ":" + z(s) + ":" + z(ff);
  }

  /* Escucha un canal. cb(datos) en cada mensaje. Devuelve {cerrar, ultimo, restante}. */
  function escuchar(canal, cb) {
    var ws = null, hb = null, ref = 1, espera = 1000, vivo = true, ult = null, rec = 0;
    function enviar(o) { o.ref = String(ref++); if (ws && ws.readyState === 1) { ws.send(JSON.stringify(o)); } }
    function abrir() {
      if (!vivo) { return; }
      try { ws = new WebSocket("wss://" + REF + ".supabase.co/realtime/v1/websocket?apikey=" + KEY + "&vsn=1.0.0"); }
      catch (e) { setTimeout(abrir, espera); return; }
      ws.onopen = function () {
        espera = 1000;
        enviar({topic: "realtime:" + canal, event: "phx_join", payload: {config: {broadcast: {self: false}, presence: {key: ""}, postgres_changes: [], "private": false}, access_token: KEY}});
        clearInterval(hb); hb = setInterval(function () { enviar({topic: "phoenix", event: "heartbeat", payload: {}}); }, 25000);
      };
      ws.onmessage = function (ev) {
        var m; try { m = JSON.parse(ev.data); } catch (e) { return; }
        if (m.event === "broadcast" && m.payload && m.payload.event === "estado") { ult = m.payload.payload; rec = Date.now(); if (cb) { cb(ult); } }
      };
      ws.onclose = function () { clearInterval(hb); if (vivo) { setTimeout(abrir, espera); espera = Math.min(espera * 2, 10000); } };
      ws.onerror = function () { try { ws.close(); } catch (e) {} };
    }
    abrir();
    return {
      cerrar: function () { vivo = false; clearInterval(hb); try { ws.close(); } catch (e) {} },
      edad: function () { return ult ? Date.now() - rec : Infinity; },
      ultimo: function () { return ult; },
      /* frames restantes ahora mismo (interpola entre mensajes si está reproduciendo) */
      restante: function () {
        if (!ult || !ult.frames) { return null; }
        var r = ult.restante, e = Date.now() - rec;
        if (ult.estado === "play" && e < 4000) { r -= e / 1000 * (ult.fps || 59.94) * (ult.speed || 1); }
        return Math.max(0, r);
      }
    };
  }

  CG.HD = {
    escuchar: escuchar,
    fmt: fmt,
    linkVisor: function (base, canal) { return base + "contador/?c=" + encodeURIComponent(canal); },
    canalGuardado: function () { try { return localStorage.getItem("cg_hd_canal") || ""; } catch (e) { return ""; } },
    guardarCanal: function (c) { try { localStorage.setItem("cg_hd_canal", c || ""); } catch (e) {} }
  };
})();
