-- Recalcula puntos_obtenidos para todas las predicciones de una pregunta bonus.
--
-- Igualdad JSONB exacta: respuesta y respuesta_correcta tienen que ser
-- estructuralmente idénticas. Esto es agnóstico al tipo de pregunta:
--   * numero: 3 == 3 (JSON number)
--   * over_under: "over" == "over" (JSON string)
--   * si_no: "si" == "si"
--   * opcion_multiple: "Opción A" == "Opción A"
--
-- IMPORTANTE: el cliente debe serializar consistentemente. Si guarda "3"
-- (string) cuando el admin guardó 3 (number), no matchea. La UI envía
-- siempre el tipo correcto y la action server-side lo enforce.
--
-- SECURITY DEFINER + search_path '' para bypasar RLS de predicciones_bonus
-- (mismo patrón que calcular_puntos_partido).
CREATE OR REPLACE FUNCTION public.calcular_puntos_bonus(p_pregunta_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_respuesta JSONB;
  v_puntos INTEGER;
BEGIN
  SELECT respuesta_correcta, puntos
    INTO v_respuesta, v_puntos
    FROM public.preguntas_bonus
   WHERE id = p_pregunta_id;

  IF v_respuesta IS NULL THEN
    RAISE EXCEPTION 'calcular_puntos_bonus: pregunta % no tiene respuesta_correcta', p_pregunta_id;
  END IF;

  UPDATE public.predicciones_bonus
     SET puntos_obtenidos = CASE
           WHEN respuesta = v_respuesta THEN v_puntos
           ELSE 0
         END,
         updated_at = now()
   WHERE pregunta_bonus_id = p_pregunta_id;
END;
$$;
