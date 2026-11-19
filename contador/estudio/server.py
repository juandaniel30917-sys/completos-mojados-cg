#!/usr/bin/env python3
"""
EMISOR del contador HyperDeck (corre en un PC de la red del estudio).

  python server.py          (o doble clic en Contador_HyperDeck.bat)

Lee DOS HyperDeck a la vez por su API REST (firmware 8.x o superior):
  - VTR  -> cuenta regresiva del clip que se reproduce + nombre del clip
  - REC  -> duración de la grabación en curso
y manda ambos por internet (Supabase Realtime) a la página de GitHub.
Panel local con IPs, links y QR: http://localhost:8090
Solo usa la librería estándar de Python 3.
"""
import json, os, socket, sys, threading, time
import urllib.request, urllib.error
from concurrent.futures import ThreadPoolExecutor
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler

NUMS = [a for a in sys.argv[1:] if a.isdigit()]
PORT = int(NUMS[0]) if NUMS else 8090   # 8000 lo usa Companion
ABRIR = "--abrir" in sys.argv          # abre el panel en el navegador al partir
HERE = os.path.dirname(os.path.abspath(__file__))
CFG_PATH = os.path.join(HERE, "config.json")

SUPA_REF = "wxfzyyvjtrflfrhwswam"
SUPA_KEY = "sb_publishable_sslALDjrDSbZ-EH-wJbtyw_1DHtFZjC"
BROADCAST_URL = f"https://{SUPA_REF}.supabase.co/realtime/v1/api/broadcast"
CANAL_DEFAULT = "hd-completos-mojados"   # el panel de Completos Mojados se conecta solo a este canal
WEB_DEFAULT = "https://juandaniel30917-sys.github.io/completos-mojados-cg/contador/"
IPS_DEFAULT = {"vtr": "192.168.10.20", "rec": "192.168.10.10"}

POLL_S = 0.2      # lectura de cada HyperDeck
META_S = 3.0      # lista de clips / nombres (VTR)
PUB_S = 0.5       # envío a internet (los visores interpolan entre mensajes)
ROLES = ("vtr", "rec")

# ---------------- Config ----------------
def cargar_cfg():
    try:
        with open(CFG_PATH, encoding="utf-8") as f:
            c = json.load(f)
    except Exception:
        c = {}
    ips = c.get("ips") or {}
    for r in ROLES:
        ips.setdefault(r, IPS_DEFAULT[r])
    c = {"ips": ips, "canal": c.get("canal") or CANAL_DEFAULT, "web": c.get("web") or WEB_DEFAULT}
    guardar_cfg(c)
    return c

def guardar_cfg(c):
    with open(CFG_PATH, "w", encoding="utf-8") as f:
        json.dump(c, f, indent=2, ensure_ascii=False)

CFG = cargar_cfg()
LOCK = threading.Lock()
ST = {"decks": [], "buscando": False, "ultimo_envio": 0, "error_envio": ""}

# ---------------- utilidades ----------------
def hd_get(ip, path, timeout=1.0):
    with urllib.request.urlopen(f"http://{ip}/control/api/v1{path}", timeout=timeout) as r:
        return json.loads(r.read() or b"null")

def num(v):
    try:
        return float(v)
    except (TypeError, ValueError):
        return None

def tc_a_frames(tc, fps):
    try:
        h, m, s, f = [int(x) for x in str(tc).replace(";", ":").replace(".", ":").split(":")]
        return ((h * 60 + m) * 60 + s) * round(fps) + f
    except Exception:
        return None

def ips_locales():
    ips = set()
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("10.255.255.255", 1)); ips.add(s.getsockname()[0]); s.close()
    except Exception:
        pass
    try:
        for i in socket.getaddrinfo(socket.gethostname(), None, socket.AF_INET):
            ips.add(i[4][0])
    except Exception:
        pass
    return sorted(i for i in ips if not i.startswith("127."))

def buscar_hyperdecks():
    """Lista todos los HyperDeck de las redes /24 del PC (solo para mostrarlos en el panel)."""
    ST["buscando"] = True
    cand = []
    for ip in ips_locales():
        pre = ip.rsplit(".", 1)[0]
        cand += [f"{pre}.{n}" for n in range(1, 255) if f"{pre}.{n}" != ip]

    def probar(ip):
        try:
            p = hd_get(ip, "/system/product", timeout=0.6) or {}
        except Exception:
            return None
        try: modo = (hd_get(ip, "/transports/0", timeout=0.8) or {}).get("mode", "")
        except Exception: modo = ""
        return {"ip": ip, "nombre": p.get("deviceName") or p.get("productName") or "HyperDeck",
                "producto": p.get("productName") or "HyperDeck", "modo": modo}

    with ThreadPoolExecutor(max_workers=64) as ex:
        ST["decks"] = [r for r in ex.map(probar, cand) if r]
    ST["buscando"] = False

# ---------------- un HyperDeck ----------------
class Deck:
    def __init__(self, rol):
        self.rol = rol
        self.conectado = False
        self.producto = ""
        self.fps = 59.94
        self.timeline, self.nombres = [], {}
        self.pb, self.modo, self.clipIdx, self.tc = None, "", None, ""
        self.rec_inicio = None      # time.time() en que empezó la grabación
        self.rec_ultima = 0.0       # duración de la última grabación (s)
        self._ip_leida = None

    @property
    def ip(self):
        return CFG["ips"].get(self.rol, "")

    def leer_meta(self):
        ip = self.ip
        try:
            f = num((hd_get(ip, "/system/videoFormat") or {}).get("frameRate"))
            if f: self.fps = f
        except Exception:
            pass
        if self.rol != "vtr":
            return
        try:
            tl = hd_get(ip, "/timelines/0")
            acum, out = 0, []
            for c in (tl or {}).get("clips", []):
                frames = num(c.get("frameCount")) or tc_a_frames(c.get("durationTimecode", ""), self.fps) or 0
                start = num(c.get("timelineIn"))
                if start is None: start = tc_a_frames(c.get("timelineInTimecode", ""), self.fps)
                if start is None: start = acum
                acum = start + frames
                out.append({"id": c.get("clipUniqueId"), "start": start, "frames": frames})
            self.timeline = out
        except Exception:
            pass
        try:
            nombres = {}
            for c in (hd_get(ip, "/clips") or {}).get("clips", []):
                n = os.path.basename((c.get("filePath") or "").replace("\\", "/"))
                nombres[c.get("clipUniqueId")] = os.path.splitext(n)[0]
            self.nombres = nombres
        except Exception:
            pass

    def bucle(self):
        fallos, ult_meta = 0, 0
        while True:
            ip = self.ip
            if not ip:
                self.conectado = False; time.sleep(1); continue
            if ip != self._ip_leida:          # cambiaron la IP desde el panel
                self._ip_leida = ip; self.conectado = False
                self.timeline, self.nombres, self.pb = [], {}, None
            try:
                self.modo = (hd_get(ip, "/transports/0") or {}).get("mode", "")
                if self.rol == "vtr":
                    self.pb = hd_get(ip, "/transports/0/playback")
                    try: self.clipIdx = (hd_get(ip, "/transports/0/clipIndex") or {}).get("clipIndex")
                    except Exception: pass
                else:
                    try: self.tc = (hd_get(ip, "/transports/0/timecode") or {}).get("display", "")
                    except Exception: self.tc = ""
                    grabando = self.modo == "InputRecord"
                    if grabando and self.rec_inicio is None:
                        self.rec_inicio = time.time()
                    elif not grabando and self.rec_inicio is not None:
                        self.rec_ultima = time.time() - self.rec_inicio; self.rec_inicio = None
                if not self.conectado:
                    self.conectado = True; ult_meta = 0
                    try:
                        pr = hd_get(ip, "/system/product") or {}
                        self.producto = pr.get("deviceName") or pr.get("productName") or "HyperDeck"
                    except Exception: pass
                fallos = 0
                if time.time() - ult_meta > META_S:
                    self.leer_meta(); ult_meta = time.time()
            except Exception:
                fallos += 1
                if fallos >= 10:
                    self.conectado = False; fallos = 0
            time.sleep(POLL_S)

    def payload(self):
        if not self.conectado:
            return {"estado": "sinhd", "frames": 0}
        if self.rol == "rec":
            grabando = self.rec_inicio is not None
            return {"estado": "rec" if grabando else "stop", "fps": self.fps, "tc": self.tc,
                    "transcurrido": (time.time() - self.rec_inicio) if grabando else self.rec_ultima,
                    "nombre": self.producto}
        pb, tl = self.pb or {}, self.timeline
        pos = num(pb.get("position")) or 0
        speed = num(pb.get("speed"))
        speed = 1.0 if speed is None else speed
        if self.modo == "InputRecord": estado = "rec"
        elif self.modo == "InputPreview": estado = "vivo"
        elif pb.get("type") in ("Play", "Shuttle", "Var") and speed != 0: estado = "play"
        else: estado = "stop"
        idx = self.clipIdx
        if idx is None or not (0 <= idx < len(tl)):
            idx = next((i for i, c in enumerate(tl) if c["start"] <= pos < c["start"] + c["frames"]), None)
        if idx is None:
            return {"estado": estado, "frames": 0, "total": len(tl), "fps": self.fps}
        c = tl[idx]
        return {"estado": estado, "speed": speed, "fps": self.fps, "idx": idx, "total": len(tl),
                "nombre": self.nombres.get(c["id"]) or f"Clip {idx + 1}",
                "frames": c["frames"], "restante": max(0, c["start"] + c["frames"] - pos)}

DECKS = {r: Deck(r) for r in ROLES}

def bucle_envio():
    while True:
        msgs = [{"topic": CFG["canal"], "event": "estado", "payload": DECKS["vtr"].payload()},   # VTR (compatibilidad)
                {"topic": CFG["canal"], "event": "rec", "payload": DECKS["rec"].payload()}]
        req = urllib.request.Request(BROADCAST_URL, data=json.dumps({"messages": msgs}).encode(), headers={
            "apikey": SUPA_KEY, "Authorization": f"Bearer {SUPA_KEY}", "Content-Type": "application/json"})
        try:
            urllib.request.urlopen(req, timeout=3).read()
            ST["ultimo_envio"] = time.time(); ST["error_envio"] = ""
        except Exception as e:
            ST["error_envio"] = str(e)[:120]
        time.sleep(PUB_S)

def link():
    return CFG["web"].rstrip("/") + "/?c=" + CFG["canal"]

# ---------------- Panel local ----------------
class Panel(BaseHTTPRequestHandler):
    def log_message(self, *a): pass

    def _send(self, code, body, ctype="application/json"):
        if isinstance(body, str): body = body.encode()
        self.send_response(code)
        self.send_header("Content-Type", ctype + "; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers(); self.wfile.write(body)

    def do_GET(self):
        if self.path.startswith("/estado"):
            return self._send(200, json.dumps({
                "decks_red": ST["decks"], "buscando": ST["buscando"],
                "roles": {r: {"ip": d.ip, "conectado": d.conectado, "producto": d.producto, "payload": d.payload()} for r, d in DECKS.items()},
                "canal": CFG["canal"], "web": CFG["web"], "link": link(),
                "internet_ok": time.time() - ST["ultimo_envio"] < 3, "error_envio": ST["error_envio"],
                "ips_pc": ips_locales()}, ensure_ascii=False))
        with open(os.path.join(HERE, "panel.html"), "rb") as f:
            return self._send(200, f.read(), "text/html")

    def do_POST(self):
        n = int(self.headers.get("Content-Length") or 0)
        try: data = json.loads(self.rfile.read(n) or b"{}")
        except Exception: data = {}
        if self.path == "/buscar":
            if not ST["buscando"]:
                threading.Thread(target=buscar_hyperdecks, daemon=True).start()
            return self._send(200, '{"ok":true}')
        with LOCK:
            if self.path == "/config":
                for r in ROLES:
                    if r in data: CFG["ips"][r] = str(data[r]).strip()
                if data.get("web"): CFG["web"] = str(data["web"]).strip()
                canal = "".join(ch for ch in str(data.get("canal", "")).strip().lower() if ch.isalnum() or ch in "-_")
                if canal: CFG["canal"] = canal
                guardar_cfg(CFG)
        return self._send(200, '{"ok":true}')

if __name__ == "__main__":
    try:
        srv = ThreadingHTTPServer(("0.0.0.0", PORT), Panel)
    except OSError:
        print(f"  El emisor ya está corriendo. Abriendo http://localhost:{PORT}")
        if ABRIR:
            import webbrowser; webbrowser.open(f"http://localhost:{PORT}")
        sys.exit(0)
    for d in DECKS.values():
        threading.Thread(target=d.bucle, daemon=True).start()
    threading.Thread(target=bucle_envio, daemon=True).start()
    if ABRIR:
        import webbrowser; threading.Timer(1.0, lambda: webbrowser.open(f"http://localhost:{PORT}")).start()
    print("\n  CONTADOR HYPERDECK — EMISOR")
    print(f"  VTR: {CFG['ips']['vtr']}   REC: {CFG['ips']['rec']}")
    print(f"  Panel (IPs, links y QR):  http://localhost:{PORT}")
    print(f"  Link del contador (VTR/REC con un botón): {link()}")
    print("  Deja esta ventana abierta. Ctrl+C para detener.\n")
    try: srv.serve_forever()
    except KeyboardInterrupt: pass
