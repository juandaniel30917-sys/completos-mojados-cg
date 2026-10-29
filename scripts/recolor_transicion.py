"""Cambia el verde palta de una transición con fondo verde chroma por un verde que el chroma NO toma.
Entrega: MP4 (H.264, fondo verde intacto, para el ATEM) y WebM VP9 con transparencia (para la salida web).
Uso: python3 recolor_transicion.py entrada.mp4 salida_sin_ext"""
import subprocess, sys, numpy as np, json
ent, base = sys.argv[1], sys.argv[2]
K = np.array([19, 255, 8], float)          # fondo chroma (no se toca)
P = np.array([99, 177, 46], float)         # verde palta original
N = np.array([int(sys.argv[3][i:i+2], 16) for i in (1, 3, 5)], float) if len(sys.argv) > 3 else np.array([166, 178, 58], float)
info = json.loads(subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height,r_frame_rate", "-of", "json", ent], capture_output=True, text=True).stdout)["streams"][0]
W, H, fps = info["width"], info["height"], info["r_frame_rate"]
lee = subprocess.Popen(["ffmpeg", "-v", "error", "-i", ent, "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], stdout=subprocess.PIPE)
mp4 = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", fps, "-i", "-",
                        "-c:v", "libx264", "-preset", "veryfast", "-crf", "14", "-pix_fmt", "yuv420p", "-movflags", "+faststart", base + ".mp4"], stdin=subprocess.PIPE)
web = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgba", "-s", f"{W}x{H}", "-r", fps, "-i", "-",
                        "-c:v", "libvpx-vp9", "-pix_fmt", "yuva420p", "-b:v", "0", "-crf", "28", "-row-mt", "1", "-deadline", "good", "-cpu-used", "4",
                        "-auto-alt-ref", "0", "-metadata:s:v:0", "alpha_mode=1", base + ".webm"], stdin=subprocess.PIPE)
v = P - K; vv = v @ v; n = 0
while True:
    b = lee.stdout.read(W * H * 3)
    if len(b) < W * H * 3: break
    x = np.frombuffer(b, np.uint8).reshape(H, W, 3).astype(np.float32)
    d = x - K; t = (d @ v) / vv
    resid = np.linalg.norm(d - t[..., None] * v, axis=-1)
    linea = (resid < 22) & (t > 0.02)                                   # mezcla fondo ⇄ palta (bordes)
    out = x.copy()
    tt = np.clip(t, 0, 1.2)[..., None]
    out[linea] = (K + tt * (N - K))[linea]
    w = np.clip(1 - np.linalg.norm(x - P, axis=-1) / 95, 0, 1)[..., None]  # palta mezclada con otros colores
    out[~linea] = (x + w * (N - P))[~linea]
    out = np.clip(out, 0, 255)
    mp4.stdin.write(out.astype(np.uint8).tobytes())
    # transparencia: cuánto se parece al fondo (en color, sin brillo), con quitado de reflejo verde
    r, g, bb = out[..., 0] / 255, out[..., 1] / 255, out[..., 2] / 255
    u = r * -.169 + g * -.331 + bb * .5; vv2 = r * .5 + g * -.419 + bb * -.081
    ku, kv = (K / 255) @ np.array([-.169, -.331, .5]), (K / 255) @ np.array([.5, -.419, -.081])
    dist = np.hypot(u - ku, vv2 - kv)
    a = np.clip((dist - 0.09) / 0.14, 0, 1)
    col = np.where(a[..., None] > 0.01, (out - (1 - a[..., None]) * K) / np.maximum(a[..., None], 0.01), 0)
    col = np.clip(col, 0, 255)
    gmax = np.maximum(col[..., 0], col[..., 2]); col[..., 1] = np.where(a < 0.999, np.minimum(col[..., 1], gmax + 8), col[..., 1])
    web.stdin.write(np.dstack([col, a * 255]).astype(np.uint8).tobytes()); n += 1
for p in (mp4, web): p.stdin.close(); p.wait()
print(base, "cuadros:", n, "palta nueva: #%02X%02X%02X" % tuple(int(c) for c in N))
