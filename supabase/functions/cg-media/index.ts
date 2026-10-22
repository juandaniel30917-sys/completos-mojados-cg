// cg-media · autoriza subidas y borrados de videos/imágenes de una sala.
// El navegador nunca recibe la clave de servicio: pide aquí un "permiso de subida" firmado
// y luego sube el archivo directo a Storage con ese permiso.
import { createClient } from "jsr:@supabase/supabase-js@2";

const BUCKET = "cg-media";
const TIPOS: Record<string, string> = {
  "video/mp4": "mp4", "video/webm": "webm", "video/quicktime": "mov",
  "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/gif": "gif", "image/svg+xml": "svg",
};
const MAX = 50 * 1024 * 1024;
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (o: unknown, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);
  let b: Record<string, unknown>;
  try { b = await req.json(); } catch { return json({ error: "Solicitud inválida" }, 400); }
  const sala = String(b.sala || "").toLowerCase(), token = String(b.token || "");
  if (!/^[a-z0-9]{4,12}$/.test(sala) || token.length < 20) return json({ error: "Sala o token inválidos" }, 400);

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const { data: rol, error: e1 } = await sb.rpc("cg__rol", { p_sala: sala, p_clave: token });
  if (e1) return json({ error: "No se pudo validar la sala" }, 500);
  if (rol !== "control") return json({ error: "Sin permiso: este link no es de control" }, 403);

  if (b.accion === "subir") {
    const tipo = String(b.tipo || ""), tam = Number(b.tam || 0);
    if (!TIPOS[tipo]) return json({ error: "Formato no permitido. Usa MP4, WebM, MOV, PNG, JPG, WebP o GIF." }, 415);
    if (tam > MAX) return json({ error: "El archivo pesa más de 50 MB." }, 413);
    const path = `${sala}/${crypto.randomUUID()}.${TIPOS[tipo]}`;
    const { data, error } = await sb.storage.from(BUCKET).createSignedUploadUrl(path);
    if (error) return json({ error: "No se pudo preparar la subida: " + error.message }, 500);
    const pub = sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
    return json({ path, token: data.token, signedUrl: data.signedUrl, url: pub });
  }
  if (b.accion === "borrar") {
    const path = String(b.path || "");
    if (!path.startsWith(sala + "/") || path.includes("..")) return json({ error: "Ruta inválida" }, 400);
    const { error } = await sb.storage.from(BUCKET).remove([path]);
    if (error) return json({ error: "No se pudo borrar: " + error.message }, 500);
    return json({ ok: true });
  }
  return json({ error: "Acción desconocida" }, 400);
});
