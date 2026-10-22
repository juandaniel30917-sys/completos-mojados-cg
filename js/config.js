/* Configuración pública del proyecto.
   Estos dos valores son PÚBLICOS por diseño (cualquier web que usa Supabase los expone en el navegador).
   La seguridad no depende de ellos: las salas se protegen con el token de cada sala y con funciones del servidor.
   NUNCA pongas aquí la "service_role key". */
window.CG_CONFIG = {
  SUPABASE_URL: "https://wxfzyyvjtrflfrhwswam.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4Znp5eXZqdHJmbGZyaHdzd2FtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIzMTI5MzksImV4cCI6MjEwNzg4ODkzOX0.ybRhztYFhWM5owIUL-0yaJkqQvaQaVC2zT5AWSWkf8k",
  VERSION: "2.0.0"
};
