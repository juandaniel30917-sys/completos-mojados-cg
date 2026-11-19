// Reloj común para el contador HyperDeck: devuelve la hora del servidor en milisegundos.
// El emisor del estudio y cada pantalla (celular/TV) se sincronizan contra este mismo reloj,
// así todas muestran exactamente el mismo tiempo aunque sus relojes internos estén corridos.
// Solo devuelve la hora (sin datos). Se llama con la clave pública (anon) del proyecto.
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Max-Age": "86400",
  "Cache-Control": "no-store",
};

Deno.serve((req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  return new Response(JSON.stringify({ t: Date.now() }), {
    headers: { ...CORS, "Content-Type": "application/json", "Connection": "keep-alive" },
  });
});
