-- Fix: la versión original de handle_new_user no fijaba search_path. Cuando el trigger
-- se dispara desde el contexto del rol supabase_auth_admin (que es quien inserta en
-- auth.users), la función SECURITY DEFINER hereda un search_path que no incluye public,
-- así que el INSERT INTO usuarios falla con "relation does not exist" y aborta la
-- creación del usuario en auth.users → el login OAuth devuelve "Database error saving
-- new user".
--
-- Patrón recomendado por Supabase: SET search_path = '' (vacío) y tablas calificadas.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.usuarios (id, email, nombre, foto_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$;
