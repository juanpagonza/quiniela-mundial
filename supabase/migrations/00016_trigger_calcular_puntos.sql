-- Trigger sobre partidos: recalcula puntos cuando un partido pasa a 'finalizado'
-- o cuando su marcador real cambia DESPUÉS de haberse finalizado (corrección
-- manual del admin). IS DISTINCT FROM maneja correctamente los NULLs.
--
-- AFTER UPDATE para que el cálculo vea el row ya escrito en la tabla, no la
-- versión NEW del trigger. El PERFORM llama a calcular_puntos_partido
-- (SECURITY DEFINER) que es quien hace el UPDATE bypaseando RLS.
CREATE OR REPLACE FUNCTION public.trigger_calcular_puntos()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.estado = 'finalizado'::public.estado_partido
     AND NEW.marcador_local_real IS NOT NULL
     AND NEW.marcador_visitante_real IS NOT NULL
     AND (
       OLD.estado IS DISTINCT FROM 'finalizado'::public.estado_partido
       OR OLD.marcador_local_real IS DISTINCT FROM NEW.marcador_local_real
       OR OLD.marcador_visitante_real IS DISTINCT FROM NEW.marcador_visitante_real
     ) THEN
    PERFORM public.calcular_puntos_partido(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_partido_finalizado
  AFTER UPDATE ON public.partidos
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_calcular_puntos();
