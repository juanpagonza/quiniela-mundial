-- Recalcula puntos_obtenidos para todas las predicciones de un partido.
--
-- Reglas (configurables en `configuracion`):
--   * Marcador exacto: puntos_marcador_exacto (5 por defecto).
--   * Ganador correcto (sign del diff coincide): puntos_solo_ganador (2 por defecto).
--   * Resto: 0.
--
-- Para empates: sign(0) == sign(0) → match. Predicción 1-1 con resultado 0-0
-- gana puntos_solo_ganador (no exacto pero el resultado fue empate).
--
-- SECURITY DEFINER para que el trigger (que corre desde el contexto del rol que
-- actualice partidos) pueda bypasar la RLS de predicciones_partido. SET search_path
-- vacío + nombres calificados (public.*) sigue el patrón seguro de Supabase.
CREATE OR REPLACE FUNCTION public.calcular_puntos_partido(p_partido_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_local INT;
  v_visitante INT;
  v_pts_exacto INT;
  v_pts_ganador INT;
BEGIN
  SELECT marcador_local_real, marcador_visitante_real
    INTO v_local, v_visitante
    FROM public.partidos
   WHERE id = p_partido_id;

  IF v_local IS NULL OR v_visitante IS NULL THEN
    RAISE EXCEPTION 'calcular_puntos_partido: partido % no tiene resultado real', p_partido_id;
  END IF;

  SELECT puntos_marcador_exacto, puntos_solo_ganador
    INTO v_pts_exacto, v_pts_ganador
    FROM public.configuracion
   WHERE id = 1;

  UPDATE public.predicciones_partido
     SET puntos_obtenidos = CASE
           WHEN marcador_local = v_local
            AND marcador_visitante = v_visitante
             THEN v_pts_exacto
           WHEN sign(marcador_local - marcador_visitante) = sign(v_local - v_visitante)
             THEN v_pts_ganador
           ELSE 0
         END,
         updated_at = now()
   WHERE partido_id = p_partido_id;
END;
$$;
