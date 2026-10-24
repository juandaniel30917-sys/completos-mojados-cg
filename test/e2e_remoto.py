"""Prueba de punta a punta del MODO SALA (remoto) con un Supabase SIMULADO.
Simula: funciones de la base de datos (mismas reglas de permisos que supabase/migrations), Realtime (protocolo Phoenix),
la función cg-media y Storage. El panel y la salida corren en contextos separados (como dos equipos distintos).
Uso:  python3 -m http.server 8765  y luego  python3 test/e2e_remoto.py"""
import asyncio, hashlib, json, os, re, secrets, sys
from playwright.async_api import async_playwright

B = os.environ.get("CG_BASE", "http://127.0.0.1:8765/")
SH = os.environ.get("CG_SHOTS", "test/capturas/")
os.makedirs(SH, exist_ok=True)
SB = "https://wxfzyyvjtrflfrhwswam.supabase.co"
RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OK = []


def check(nombre, cond, extra=""):
    OK.append((nombre, bool(cond)))
    print(("  OK  " if cond else "  FALLA ") + nombre + (" · " + str(extra) if extra else ""))


def sha(t):
    return hashlib.sha256(t.encode()).hexdigest()


class Supabase:
    """Base de datos + Realtime + Storage simulados."""
    def __init__(self):
        self.salas, self.archivos, self.sockets, self.caido, self.llamadas = {}, {}, [], False, []
        self.ultimo_archivo, self.tam_declarado = None, None

    def rol(self, sala, clave):
        s = self.salas.get((sala or "").lower())
        if not s:
            return None
        if s["ctrl"] == sha(clave):
            return "control"
        if s["out"] == sha(clave):
            return "salida"
        return None

    def rpc(self, fn, a):
        self.llamadas.append(fn)
        if fn == "cg_crear_sala":
            tok = secrets.token_hex(24); sid = secrets.token_hex(3)
            self.salas[sid] = {"nombre": a.get("p_nombre") or "Sala", "ctrl": sha(tok), "out": sha(sha("out:" + tok)), "estado": {}, "rev": 0}
            return 200, {"sala": sid, "token": tok}
        if fn in ("cg_leer", "cg_rev"):
            r = self.rol(a["p_sala"], a["p_clave"])
            if not r:
                return 403, {"code": "28000", "message": "acceso_denegado"}
            s = self.salas[a["p_sala"]]
            return (200, s["rev"]) if fn == "cg_rev" else (200, {"rol": r, "nombre": s["nombre"], "estado": s["estado"], "rev": s["rev"]})
        if fn == "cg_guardar":
            if self.rol(a["p_sala"], a["p_token"]) != "control":
                return 403, {"code": "28000", "message": "acceso_denegado"}
            s = self.salas[a["p_sala"]]; s["estado"] = a["p_estado"]; s["rev"] += 1
            return 200, s["rev"]
        return 404, {"message": "no existe"}

    # ---------- Realtime (Phoenix) ----------
    def ws(self, ws):
        if self.caido:
            asyncio.ensure_future(ws.close(code=1006, reason="sin red")); return
        yo = {"ws": ws, "topic": None, "key": None, "meta": None, "join": None}
        self.sockets.append(yo)

        def env(w, o):
            try:
                w.send(json.dumps(o))
            except Exception:
                pass

        def otros():
            return [x for x in self.sockets if x is not yo and x["topic"] == yo["topic"]]

        def msg(m):
            d = json.loads(m)
            if d["topic"] == "phoenix" and d["event"] == "heartbeat":
                env(ws, {"topic": "phoenix", "event": "phx_reply", "ref": d["ref"], "payload": {"status": "ok", "response": {}}}); return
            if d["event"] == "phx_join":
                yo["topic"], yo["join"] = d["topic"], d["join_ref"]
                yo["key"] = d["payload"]["config"]["presence"]["key"]
                env(ws, {"topic": d["topic"], "event": "phx_reply", "ref": d["ref"], "join_ref": d["join_ref"], "payload": {"status": "ok", "response": {"postgres_changes": []}}})
                estado = {x["key"]: {"metas": [x["meta"]]} for x in otros() if x["meta"]}
                env(ws, {"topic": d["topic"], "event": "presence_state", "payload": estado}); return
            if d["event"] == "presence":
                yo["meta"] = dict(d["payload"]["payload"], phx_ref="x")
                for x in [yo] + otros():
                    env(x["ws"], {"topic": yo["topic"], "event": "presence_diff", "payload": {"joins": {yo["key"]: {"metas": [yo["meta"]]}}, "leaves": {}}})
                return
            if d["event"] == "broadcast":
                for x in otros():
                    env(x["ws"], {"topic": yo["topic"], "event": "broadcast", "payload": d["payload"]})

        def cerrado(*_):
            if yo in self.sockets:
                self.sockets.remove(yo)
                for x in otros():
                    env(x["ws"], {"topic": yo["topic"], "event": "presence_diff", "payload": {"joins": {}, "leaves": {yo["key"]: {"metas": [yo["meta"]]}}}})
        ws.on_message(msg)
        ws.on_close(cerrado)

    async def cortar_red(self):
        self.caido = True
        for x in list(self.sockets):
            try:
                await x["ws"].close(code=1006, reason="corte")
            except Exception:
                pass
        self.sockets.clear()

    # ---------- HTTP ----------
    async def http(self, route):
        req = route.request
        url = req.url
        cors = {"Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*", "Access-Control-Allow-Methods": "*"}
        if req.method == "OPTIONS":
            return await route.fulfill(status=200, headers=cors)
        if self.caido:
            return await route.abort("internetdisconnected")
        m = re.search(r"/rest/v1/rpc/(\w+)", url)
        if m:
            st, body = self.rpc(m.group(1), json.loads(req.post_data or "{}"))
            return await route.fulfill(status=st, headers=cors, content_type="application/json", body=json.dumps(body))
        if "/functions/v1/cg-media" in url:
            b = json.loads(req.post_data or "{}")
            if self.rol(b.get("sala"), b.get("token")) != "control":
                return await route.fulfill(status=403, headers=cors, content_type="application/json", body=json.dumps({"error": "Sin permiso: este link no es de control"}))
            ext = {"video/webm": "webm", "video/mp4": "mp4", "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp"}.get(b.get("tipo"))
            if not ext:
                return await route.fulfill(status=415, headers=cors, content_type="application/json", body=json.dumps({"error": "Formato no permitido"}))
            path = "%s/%s.%s" % (b["sala"], secrets.token_hex(8), ext)
            return await route.fulfill(status=200, headers=cors, content_type="application/json", body=json.dumps({
                "path": path, "token": "t", "signedUrl": SB + "/storage/v1/object/upload/sign/cg-media/" + path + "?token=t",
                "url": SB + "/storage/v1/object/public/cg-media/" + path}))
        m = re.search(r"/storage/v1/object/upload/sign/cg-media/([^?]+)", url)
        if m and req.method == "PUT":
            datos = req.post_data_buffer or b""
            if not datos:
                # Playwright no entrega el contenido de cuerpos de tipo File/Blob al interceptar.
                # Comprobamos el tamaño declarado y usamos el mismo archivo de prueba que eligió el panel.
                h = await req.all_headers()
                datos = open(self.ultimo_archivo, "rb").read()
                self.tam_declarado = int(h.get("content-length") or len(datos))
            self.archivos[m.group(1)] = (datos, req.headers.get("content-type"))
            return await route.fulfill(status=200, headers=cors, content_type="application/json", body='{"Key":"ok"}')
        m = re.search(r"/storage/v1/object/public/cg-media/(.+)$", url)
        if m and m.group(1) in self.archivos:
            data, ct = self.archivos[m.group(1)]
            return await route.fulfill(status=200, headers=dict(cors, **{"Content-Type": ct, "Accept-Ranges": "bytes"}), body=data)
        return await route.fulfill(status=404, headers=cors, body="no")


async def preparar(ctx, sb):
    await ctx.route(SB + "/**", sb.http)
    await ctx.route_web_socket(re.compile(r"wss://wxfzyyvjtrflfrhwswam\.supabase\.co/realtime/.*"), sb.ws)


async def main():
    sb = Supabase()
    async with async_playwright() as p:
        b = await p.chromium.launch(args=["--autoplay-policy=no-user-gesture-required", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"])
        errs = []
        # equipo 1: tablet con el panel
        tablet = await b.new_context(viewport={"width": 1180, "height": 820}); await preparar(tablet, sb)
        # equipo 2: el computador de OBS con la salida
        obs = await b.new_context(viewport={"width": 1920, "height": 1080}); await preparar(obs, sb)

        pg = await tablet.new_page(); pg.on("pageerror", lambda e: errs.append("PANEL " + str(e)))
        await pg.goto(B + "index.html")
        await pg.fill("#nombre", "Prueba remota"); await pg.click("#bCrear")
        await pg.wait_for_url(re.compile(r"panel\.html\?sala=")); await pg.wait_for_timeout(1200)
        check("Crear sala abre el panel con link de control", "#t=" in pg.url, pg.url.split("#")[0])
        if await pg.is_visible("#modal"):
            await pg.click("#modal .cerrar")
        sala = pg.url.split("sala=")[1].split("#")[0]
        await pg.click('.vistas [data-vista=categorias]'); await pg.wait_for_timeout(200)
        check("La sala nueva se guardó en el servidor con las gráficas de ejemplo y la escaleta del libreto", len(sb.salas[sala]["estado"].get("elementos", [])) > 10 and len(sb.salas[sala]["estado"].get("escaleta", {}).get("pasos", [])) == 32)

        # links
        await pg.click("#bRemoto"); await pg.wait_for_timeout(300)
        links = await pg.eval_on_selector_all("#modal .linkbox input", "els=>els.map(e=>e.value)")
        salida_url, control_url = links[0], links[1]
        check("El link de salida no contiene el token de control", pg.url.split("#t=")[1] not in salida_url)
        check("Se genera un QR para abrir el control en el celular", await pg.is_visible("#modal .qr img"))
        await pg.screenshot(path=SH + "remoto_links.png")
        await pg.click("#modal .cerrar")

        out = await obs.new_page(); out.on("pageerror", lambda e: errs.append("SALIDA " + str(e)))
        await out.goto(salida_url.replace("https://", "http://") if salida_url.startswith("https://127") else salida_url)
        await out.wait_for_timeout(1500)
        check("El panel ve la salida de OBS conectada (presencia)", "1 salida" in await pg.inner_text("#pSalidas"), await pg.inner_text("#pSalidas"))

        # mostrar desde la tablet → llega al otro equipo
        await pg.click('.it:has-text("Concurso mechadas") .nom'); await pg.wait_for_timeout(300)
        await pg.fill('.li input[data-k=a] >> nth=0', "GANA UN"); await pg.wait_for_timeout(100)
        await pg.click("#aMostrar"); await pg.wait_for_timeout(1500)
        txt = await out.evaluate("()=>{const m=document.querySelector('.bc-msg.on');return m?m.textContent:null}")
        check("MOSTRAR desde otro equipo llega a la salida", txt and txt.startswith("GANA UN"), txt)

        # salida con clave falsa
        intruso = await obs.new_page()
        await intruso.goto(B + "salida.html?sala=" + sala + "&k=" + "0" * 64 + "&debug=1"); await intruso.wait_for_timeout(1200)
        check("Una clave de salida falsa es rechazada", "válido" in await intruso.inner_text("#estadoRed"), await intruso.inner_text("#estadoRed"))
        await intruso.close()
        k = salida_url.split("k=")[1]
        st, _ = sb.rpc("cg_guardar", {"p_sala": sala, "p_token": k, "p_estado": {}})
        check("La clave de salida NO puede modificar la sala", st == 403)

        # corte de internet y recuperación
        await sb.cortar_red(); await pg.wait_for_timeout(1500)
        red = await pg.inner_text("#pRed")
        check("El panel avisa que se cortó la conexión", any(s in red for s in ("Reconectando", "Sin internet")), red)
        await pg.click('.it:has-text("Concurso mechadas") .go'); await pg.wait_for_timeout(500)   # ocultar sin red
        check("La salida mantiene lo último mientras no hay red", await out.evaluate("()=>!!document.querySelector('.bc')"))
        sb.caido = False
        await pg.wait_for_timeout(9000)
        check("El panel se reconecta solo", "En línea" in await pg.inner_text("#pRed"), await pg.inner_text("#pRed"))
        check("Lo hecho sin red llega a la salida al volver la conexión", not await out.evaluate("()=>!!document.querySelector('.bc')"))
        check("La salida se reconecta (presencia)", "1 salida" in await pg.inner_text("#pSalidas"), await pg.inner_text("#pSalidas"))

        # subir video con fondo verde y usar chroma en la salida
        await pg.click("#bNuevo"); await pg.click('.tpl[data-p=video]'); await pg.wait_for_timeout(300)
        async with pg.expect_file_chooser() as fc:
            await pg.click("#modal .zona")
        sb.ultimo_archivo = os.path.join(RAIZ, "test/muestras/prueba-verde.webm")
        await (await fc.value).set_files(sb.ultimo_archivo)
        await pg.wait_for_function("()=>/Detectamos|No vimos/.test(document.querySelector('#modal .det').textContent)", timeout=25000)
        det = await pg.inner_text("#modal .det")
        check("Detecta que el video tiene fondo verde", "verde" in det, det)
        await pg.screenshot(path=SH + "remoto_subir_video.png")
        await pg.click("#modal .vBucle + .sw2")
        await pg.click("#modal .guardar"); await pg.wait_for_timeout(1500)
        check("El video se subió al almacenamiento de la sala", any(k.endswith(".webm") for k in sb.archivos) and sb.tam_declarado in (None, os.path.getsize(sb.ultimo_archivo)), "bytes declarados: %s" % sb.tam_declarado)
        await pg.click("#aMostrar")
        try:
            await out.wait_for_function("()=>{const c=document.querySelector('.vd-in');return c&&c._video&&c._video.currentTime>0.3}", timeout=25000)
        except Exception:
            pass
        r = await out.evaluate("""()=>{const c=document.querySelector('.vd-in');if(!c||!c._keyer)return null;const v=c._video;c._keyer.dibujar();
            const gl=c.querySelector('canvas').getContext('webgl');const px=(x,y)=>{const p=new Uint8Array(4);gl.readPixels(x,y,1,1,gl.RGBA,gl.UNSIGNED_BYTE,p);return Array.from(p)};
            return {t:v.currentTime,fondo:px(20,20),persona:px(450,270)}}""")
        check("El video reproduce en la salida", r and r["t"] > 0, r and r["t"])
        check("Chroma: el fondo verde queda transparente", r and r["fondo"][3] == 0, r and r["fondo"])
        check("Chroma: la persona/objeto queda visible", r and r["persona"][3] == 255, r and r["persona"])
        await out.screenshot(path=SH + "remoto_salida_chroma.png")
        await pg.screenshot(path=SH + "remoto_panel_video.png")

        # otro panel (celular) controlando la misma sala
        cel = await b.new_context(viewport={"width": 390, "height": 844}, is_mobile=True, has_touch=True); await preparar(cel, sb)
        pc = await cel.new_page(); pc.on("pageerror", lambda e: errs.append("CELULAR " + str(e)))
        await pc.goto(control_url); await pc.wait_for_timeout(1500)
        if await pc.is_visible("#modal"):
            await pc.click("#modal .cerrar")
        check("El celular abre la sala como botonera", await pc.is_visible("#botGrid"))
        await pc.click("#bModoComp"); await pc.wait_for_timeout(300)
        await pc.click('.vistas [data-vista=categorias]'); await pc.wait_for_timeout(200)
        if not await pc.is_visible('.it:has-text("Logo esquina")'):
            await pc.click(".cat[data-cat=logos] .cat-cab"); await pc.wait_for_timeout(400)
        await pc.click('.it:has-text("Logo esquina") .go'); await pc.wait_for_timeout(1500)
        check("Un segundo panel (celular) controla la misma salida", await out.evaluate("()=>!!document.querySelector('.mo')"))
        await pg.wait_for_timeout(500)
        check("El primer panel ve el cambio del celular", await pg.eval_on_selector('.it:has-text("Logo esquina")', "e=>e.classList.contains('on')"))
        await pc.screenshot(path=SH + "remoto_celular.png")

        check("Sin errores de JavaScript", not errs, errs)
        await b.close()
    fallas = [n for n, ok in OK if not ok]
    print("\n%d/%d pruebas OK" % (len(OK) - len(fallas), len(OK)))
    sys.exit(1 if fallas else 0)

asyncio.run(main())
