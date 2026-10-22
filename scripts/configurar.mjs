// Genera js/config.js a partir de .env (sin dependencias).  Uso:  node scripts/configurar.mjs
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
const archivo = join(raiz, ".env");
if (!existsSync(archivo)) {
  console.error("No existe .env. Copia .env.example como .env y completa los valores.");
  process.exit(1);
}
const env = Object.fromEntries(
  readFileSync(archivo, "utf8").split(/\r?\n/)
    .filter((l) => l.trim() && !l.trim().startsWith("#") && l.includes("="))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")]; })
);
const url = env.SUPABASE_URL, key = env.SUPABASE_ANON_KEY;
if (!/^https:\/\/.+\.supabase\.co\/?$/.test(url || "")) { console.error("SUPABASE_URL no es válida."); process.exit(1); }
if (!key || key.includes("pega-aqui")) { console.error("Falta SUPABASE_ANON_KEY."); process.exit(1); }
try {
  const rol = JSON.parse(Buffer.from(key.split(".")[1] || "", "base64url").toString()).role;
  if (rol === "service_role") { console.error("¡Esa es la service_role key (secreta)! Usa la clave anon pública."); process.exit(1); }
} catch { /* claves nuevas sb_publishable_ no son JWT */ }
if (/^sb_secret_/.test(key)) { console.error("¡Esa es una clave secreta! Usa la clave pública."); process.exit(1); }

const version = JSON.parse(readFileSync(join(raiz, "package.json"), "utf8")).version;
writeFileSync(join(raiz, "js/config.js"), `/* Configuración pública del proyecto (generado por scripts/configurar.mjs).
   Estos dos valores son PÚBLICOS por diseño. La seguridad depende del token de cada sala y de las funciones del servidor.
   NUNCA pongas aquí la "service_role key". */
window.CG_CONFIG = {
  SUPABASE_URL: ${JSON.stringify(url.replace(/\/$/, ""))},
  SUPABASE_ANON_KEY: ${JSON.stringify(key)},
  VERSION: ${JSON.stringify(version)}
};
`);
console.log("js/config.js actualizado.");
