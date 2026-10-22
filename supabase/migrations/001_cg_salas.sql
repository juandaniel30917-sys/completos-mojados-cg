-- COMPLETOS MOJADOS · CG (gráficas en vivo)
-- Todo usa el prefijo cg_ para convivir con otros proyectos en la misma base de datos.
-- Nadie lee ni escribe la tabla directamente: solo a través de funciones que validan el token de la sala.

create table if not exists public.cg_salas (
  id          text primary key,                 -- código de sala (6 caracteres)
  nombre      text not null default 'Completos Mojados',
  ctrl_hash   text not null,                    -- sha256(token de control)
  out_hash    text not null,                    -- sha256(clave de salida)  · clave de salida = sha256('out:' || token)
  estado      jsonb not null default '{}'::jsonb,
  rev         bigint not null default 0,
  creada      timestamptz not null default now(),
  actualizada timestamptz not null default now()
);
alter table public.cg_salas enable row level security;
-- sin políticas: anon/authenticated no tienen acceso directo a la tabla
revoke all on public.cg_salas from anon, authenticated;

create or replace function public.cg__hash(t text) returns text
language sql immutable set search_path = '' as $$
  select encode(extensions.digest(t, 'sha256'), 'hex')
$$;

-- rol de una clave: 'control' (token), 'salida' (clave de salida) o null
create or replace function public.cg__rol(p_sala text, p_clave text) returns text
language sql stable security definer set search_path = '' as $$
  select case
    when s.ctrl_hash = public.cg__hash(p_clave) then 'control'
    when s.out_hash  = public.cg__hash(p_clave) then 'salida'
  end
  from public.cg_salas s where s.id = lower(p_sala)
$$;

-- crea una sala nueva y devuelve el token de control (solo se muestra una vez)
create or replace function public.cg_crear_sala(p_nombre text default null) returns json
language plpgsql volatile security definer set search_path = '' as $$
declare v_id text; v_tok text; v_out text; i int := 0;
begin
  v_tok := encode(extensions.gen_random_bytes(24), 'hex');
  v_out := public.cg__hash('out:' || v_tok);
  loop
    v_id := lower(substr(translate(encode(extensions.gen_random_bytes(8), 'base64'), '+/=0O1lI', 'abcdefgh'), 1, 6));
    exit when not exists (select 1 from public.cg_salas where id = v_id);
    i := i + 1; if i > 20 then raise exception 'no_se_pudo_crear'; end if;
  end loop;
  insert into public.cg_salas (id, nombre, ctrl_hash, out_hash)
  values (v_id, coalesce(nullif(trim(p_nombre), ''), 'Completos Mojados'), public.cg__hash(v_tok), public.cg__hash(v_out));
  return json_build_object('sala', v_id, 'token', v_tok);
end $$;

-- lee el estado (sirve para el panel y para la salida)
create or replace function public.cg_leer(p_sala text, p_clave text) returns json
language plpgsql stable security definer set search_path = '' as $$
declare v_rol text; s public.cg_salas;
begin
  v_rol := public.cg__rol(p_sala, p_clave);
  if v_rol is null then raise exception 'acceso_denegado' using errcode = '28000'; end if;
  select * into s from public.cg_salas where id = lower(p_sala);
  return json_build_object('rol', v_rol, 'nombre', s.nombre, 'estado', s.estado, 'rev', s.rev, 'actualizada', s.actualizada);
end $$;

-- guarda el estado (solo con token de control)
create or replace function public.cg_guardar(p_sala text, p_token text, p_estado jsonb) returns bigint
language plpgsql volatile security definer set search_path = '' as $$
declare v_rev bigint;
begin
  if public.cg__rol(p_sala, p_token) is distinct from 'control' then raise exception 'acceso_denegado' using errcode = '28000'; end if;
  if octet_length(p_estado::text) > 600000 then raise exception 'estado_muy_grande'; end if;
  update public.cg_salas set estado = p_estado, rev = rev + 1, actualizada = now()
   where id = lower(p_sala) returning rev into v_rev;
  return v_rev;
end $$;

-- cambia el nombre de la sala
create or replace function public.cg_renombrar(p_sala text, p_token text, p_nombre text) returns void
language plpgsql volatile security definer set search_path = '' as $$
begin
  if public.cg__rol(p_sala, p_token) is distinct from 'control' then raise exception 'acceso_denegado' using errcode = '28000'; end if;
  update public.cg_salas set nombre = left(coalesce(nullif(trim(p_nombre), ''), nombre), 60) where id = lower(p_sala);
end $$;

-- genera un token nuevo: los links anteriores (control y salida) dejan de funcionar
create or replace function public.cg_regenerar(p_sala text, p_token text) returns json
language plpgsql volatile security definer set search_path = '' as $$
declare v_tok text; v_out text;
begin
  if public.cg__rol(p_sala, p_token) is distinct from 'control' then raise exception 'acceso_denegado' using errcode = '28000'; end if;
  v_tok := encode(extensions.gen_random_bytes(24), 'hex');
  v_out := public.cg__hash('out:' || v_tok);
  update public.cg_salas set ctrl_hash = public.cg__hash(v_tok), out_hash = public.cg__hash(v_out) where id = lower(p_sala);
  return json_build_object('sala', lower(p_sala), 'token', v_tok);
end $$;

revoke all on function public.cg__hash(text) from public, anon, authenticated;
revoke all on function public.cg__rol(text, text) from public, anon, authenticated;
revoke all on function public.cg_crear_sala(text) from public;
revoke all on function public.cg_leer(text, text) from public;
revoke all on function public.cg_guardar(text, text, jsonb) from public;
revoke all on function public.cg_renombrar(text, text, text) from public;
revoke all on function public.cg_regenerar(text, text) from public;
grant execute on function public.cg_crear_sala(text) to anon, authenticated;
grant execute on function public.cg_leer(text, text) to anon, authenticated;
grant execute on function public.cg_guardar(text, text, jsonb) to anon, authenticated;
grant execute on function public.cg_renombrar(text, text, text) to anon, authenticated;
grant execute on function public.cg_regenerar(text, text) to anon, authenticated;
grant execute on function public.cg__rol(text, text) to service_role;

-- Bucket para videos e imágenes de las salas (lectura pública por ruta aleatoria; la subida pasa por la función cg-media)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('cg-media', 'cg-media', true, 52428800,
        array['video/mp4','video/webm','video/quicktime','image/png','image/jpeg','image/webp','image/gif','image/svg+xml'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- consulta liviana: solo el número de versión (para recuperar la conexión sin descargar todo)
create or replace function public.cg_rev(p_sala text, p_clave text) returns bigint
language plpgsql stable security definer set search_path = '' as $$
declare v bigint;
begin
  if public.cg__rol(p_sala, p_clave) is null then raise exception 'acceso_denegado' using errcode = '28000'; end if;
  select rev into v from public.cg_salas where id = lower(p_sala);
  return v;
end $$;
revoke all on function public.cg_rev(text, text) from public;
grant execute on function public.cg_rev(text, text) to anon, authenticated;
