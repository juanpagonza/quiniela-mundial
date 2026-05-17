-- Dispara calcular_puntos_bonus cuando el admin setea (o corrige) la
-- respuesta_correcta de una pregunta. IS DISTINCT FROM cubre el caso
-- NULL → valor y valor → otro valor en una sola expresión.
CREATE OR REPLACE FUNCTION public.trigger_calcular_bonus()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.respuesta_correcta IS NOT NULL
     AND OLD.respuesta_correcta IS DISTINCT FROM NEW.respuesta_correcta THEN
    PERFORM public.calcular_puntos_bonus(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_bonus_respondida
  AFTER UPDATE ON public.preguntas_bonus
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_calcular_bonus();
