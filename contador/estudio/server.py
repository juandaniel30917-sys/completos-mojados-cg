#!/usr/bin/env python3
"""
EMISOR del contador HyperDeck (corre en un computador de la red del estudio).

  python server.py

- Lee el HyperDeck por su API REST (firmware 8.x o superior).
- Si el HyperDeck cambia de IP o no está configurado, lo busca solo en la red.
- Manda el estado por internet (Supabase Realtime) a la página de GitHub.
- Panel local con link y QR: http://localhost:8090

Solo usa la librería estándar de Python 3.
"""
import json, os, socket, sys, threading, time, random, string
import urllib.request, urllib.error
from concurrent.futures import ThreadPoolExecutor
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8090   # 8000 lo usa Companion
HERE = os.path.dirname(os.path.abspath(__file__))
CFG_PATH = os.path.join(HERE, "config.json")

SUPA_REF = "wxfzyyvjtrflfrhwswam"
SUPA_KEY = "sb_publishable_sslALDjrDSbZ-EH-wJbtyw_1DHtFZjC"
BROADCAST_URL = f"https://{SUPA_REF}.supabase.co/realtime/v1/api/broadcast"
WEB_DEFAULT = "https://juandaniel30917-sys.github.io/completos-mojados-cg/contador/"

POLL_S = 0.2      # lectura del HyperDeck
META_S = 3.0      # lista de clips / nombres
PUB_S = 0.5       # envío a internet (los visores interpolan entre mensajes)

# ---------------- Config ----------------
def cargar_cfg():
    try:
        with open(CFG_PATH, encoding="utf-8") as f:
            c = json.load(f)
    except Exception:
        c = {}
    c.setdefault("hd_ip", "")
    c.setdefault("canal", "hd-" + "".join(random.choices(string.ascii_lowercase + string.digits, k=8)))
    c.setdefault("web", WEB_DEFAULT)
    guardar_cfg(c)
    return c

def guardar_cfg(c):
    with open(CFG_PATH, "w", encoding="utf-8") as f:
        json.dump(c, f, indent=2, ensure_ascii=False)

CFG = cargar_cfg()
LOCK = threading.Lock()
ST = {"conectado": False, "buscando": False, "producto": "", "ultimo_envio": 0, "error_envio": "", "payload": {}}

# ---------------- HyperDeck ----------------
def hd_get(path, ip=None, timeout=1.0):
    ip = ip or CFG["hd_ip"]
    with urllib.request.urlopen(f"http://{ip}/control/api/v1{path}", timeout=timeout) as r:
        return json.loads(r.read() or b"null")

def num(v):
    try:
        return float(v)
    except (TypeError, ValueError):
        return None

def tc_a_frames(tc, fps):
    try:
        h, m, s, f = [int(x) for x in tc.replace(";", ":").replace(".", ":").split(":")]
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
    return [i for i in ips if not i.startswith("127.")]

def buscar_hyperdeck():
    """Barre las redes /24 del computador buscando un HyperDeck con API REST."""
    ST["buscando"] = True
    candidatos = []
    for ip in ips_locales():
        pre = ip.rsplit(".", 1)[0]
        candidatos += [f"{pre}.{n}" for n in range(1, 255) if f"{pre}.{n}" != ip]

    def probar(ip):
        try:
            p = hd_get("/system/product", ip=ip, timeout=0.6)
            nombre = (p or {}).get("productName", "") or (p or {}).get("deviceName", "")
            return ip, nombre or "HyperDeck"
        except Exception:
            return None

    encontrado = None
    with ThreadPoolExecutor(max_workers=64) as ex:
        for r in ex.map(probar, candidatos):
            if r and encontrado is None:
                encontrado = r
    ST["buscando"] = False
    if encontrado:
        with LOCK:
            CFG["hd_ip"] = encontrado[0]; guardar_cfg(CFG)
        ST["producto"] = encontrado[1]
        print(f"  HyperDeck encontrado: {encontrado[1]} en {encontrado[0]}")
    return encontrado

# Estado leído
D = {"fps": 59.94, "timeline": [], "nombres": {}, "pb": None, "modo": "", "clipIdx": None}

def leer_meta():
    try:
        vf = hd_get("/system/videoFormat")
        f = num((vf or {}).get("frameRate"))
        if f: D["fps"] = f
    except Exception:
        pass
    try:
        tl = hd_get("/timelines/0")
        acum, out = 0, []
        for c in (tl or {}).get("clips", []):
            frames = num(c.get("frameCount")) or tc_a_frames(c.get("durationTimecode", ""), D["fps"]) or 0
            start = num(c.get("timelineIn"))
            if start is None: start = tc_a_frames(c.get("timelineInTimecode", ""), D["fps"])
            if start is None: start = acum
            acum = start + frames
            out.append({"id": c.get("clipUniqueId"), "start": start, "frames": frames})
        D["timeline"] = out
    except Exception:
        pass
    try:
        cl = hd_get("/clips")
        for c in (cl or {}).get("clips", []):
            nombre = os.path.basename((c.get("filePath") or "").replace("\\", "/"))
            nombre = os.path.splitext(nombre)[0]
            D["nombres"][c.get("clipUniqueId")] = nombre
    except Exception:
        pass

def armar_payload():
    pb, modo, tl = D["pb"], D["modo"], D["timeline"]
    if not ST["conectado"] or pb is None:
        return {"estado": "sinhd", "frames": 0, "total": len(tl)}
    pos = num(pb.get("position")) or 0
    speed = num(pb.get("speed"))
    speed = 1.0 if speed is None else speed
    if modo == "InputRecord": estado = "rec"
    elif modo == "InputPreview": estado = "vivo"
    elif pb.get("type") in ("Play", "Shuttle", "Var") and speed != 0: estado = "play"
    else: estado = "stop"

    idx = D["clipIdx"]
    if idx is None or not (0 <= idx < len(tl)):
        idx = next((i for i, c in enumerate(tl) if c["start"] <= pos < c["start"] + c["frames"]), None)
    if idx is None:
        return {"estado": estado, "frames": 0, "total": len(tl), "fps": D["fps"]}
    c = tl[idx]
    return {
        "estado": estado, "speed": speed, "fps": D["fps"],
        "idx": idx, "total": len(tl),
        "nombre": D["nombres"].get(c["id"]) or f"Clip {idx + 1}",
        "frames": c["frames"],
        "restante": max(0, c["start"] + c["frames"] - pos),
        "ts": int(time.time() * 1000),
    }

def bucle_hyperdeck():
    fallos, ult_meta = 0, 0
    while True:
        if not CFG["hd_ip"]:
            ST["conectado"] = False
            if not buscar_hyperdeck(): time.sleep(5)
            continue
        try:
            D["pb"] = hd_get("/transports/0/playback")
            try: D["modo"] = (hd_get("/transports/0") or {}).get("mode", "")
            except Exception: pass
            try: D["clipIdx"] = (hd_get("/transports/0/clipIndex") or {}).get("clipIndex")
            except Exception: pass
            if not ST["conectado"]:
                ST["conectado"] = True; ult_meta = 0
                try: ST["producto"] = (hd_get("/system/product") or {}).get("productName", "HyperDeck")
                except Exception: pass
            fallos = 0
            if time.time() - ult_meta > META_S:
                leer_meta(); ult_meta = time.time()
        except Exception:
            fallos += 1
            if fallos >= 15:          # ~3 s sin respuesta: puede haber cambiado de IP
                ST["conectado"] = False
                print("  HyperDeck no responde, buscando en la red…")
                if not buscar_hyperdeck(): time.sleep(3)
                fallos = 0
        time.sleep(POLL_S)

def bucle_envio():
    while True:
        p = armar_payload()
        ST["payload"] = p
        body = json.dumps({"messages": [{"topic": CFG["canal"], "event": "estado", "payload": p}]}).encode()
        req = urllib.request.Request(BROADCAST_URL, data=body, headers={
            "apikey": SUPA_KEY, "Authorization": f"Bearer {SUPA_KEY}", "Content-Type": "application/json"})
        try:
            urllib.request.urlopen(req, timeout=3).read()
            ST["ultimo_envio"] = time.time(); ST["error_envio"] = ""
        except Exception as e:
            ST["error_envio"] = str(e)[:120]
        time.sleep(PUB_S)

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
            link = CFG["web"].rstrip("/") + "/?c=" + CFG["canal"]
            return self._send(200, json.dumps({
                "hd_ip": CFG["hd_ip"], "producto": ST["producto"], "conectado": ST["conectado"],
                "buscando": ST["buscando"], "canal": CFG["canal"], "web": CFG["web"], "link": link,
                "internet_ok": time.time() - ST["ultimo_envio"] < 3, "error_envio": ST["error_envio"],
                "payload": ST["payload"], "ips_pc": ips_locales()}, ensure_ascii=False))
        with open(os.path.join(HERE, "panel.html"), "rb") as f:
            return self._send(200, f.read(), "text/html")

    def do_POST(self):
        n = int(self.headers.get("Content-Length") or 0)
        try: data = json.loads(self.rfile.read(n) or b"{}")
        except Exception: data = {}
        with LOCK:
            if self.path == "/config":
                if "hd_ip" in data: CFG["hd_ip"] = str(data["hd_ip"]).strip(); ST["conectado"] = False
                if data.get("web"): CFG["web"] = str(data["web"]).strip()
                canal = "".join(ch for ch in str(data.get("canal", "")).strip().lower() if ch.isalnum() or ch in "-_")
                if canal: CFG["canal"] = canal
                guardar_cfg(CFG)
            elif self.path == "/buscar":
                CFG["hd_ip"] = ""; ST["conectado"] = False; guardar_cfg(CFG)
        return self._send(200, '{"ok":true}')

if __name__ == "__main__":
    threading.Thread(target=bucle_hyperdeck, daemon=True).start()
    threading.Thread(target=bucle_envio, daemon=True).start()
    srv = ThreadingHTTPServer(("0.0.0.0", PORT), Panel)
    link = CFG["web"].rstrip("/") + "/?c=" + CFG["canal"]
    print("\n  CONTADOR HYPERDECK — EMISOR")
    print(f"  Panel (link y QR):  http://localhost:{PORT}")
    print(f"  Link para celular/TV: {link}")
    print("  Deja esta ventana abierta. Ctrl+C para detener.\n")
    try: srv.serve_forever()
    except KeyboardInterrupt: pass
