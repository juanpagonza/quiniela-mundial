-- Smoke test descubrió que cuando el admin revierte un partido (estado
-- finalizado → programado, o vacía los marcadores), los puntos_obtenidos
-- de las predicciones quedan persistidos del cálculo anterior. Mismo
-- bug en bonus: borrar respuesta_correcta no resetea puntos.
--
-- Fix:
--   1. calcular_puntos_partido ahora maneja el caso "sin resultado real"
--      seteando todos los puntos_obtenidos a 0 en vez de lanzar exception.
--   2. trigger_calcular_puntos ahora también dispara cuando OLD estaba
--      finalizado pero NEW no lo está (o cuando los scores cambiaron a NULL).
--   3. Mismo fix para calcular_puntos_bonus y su trigger.
--
-- Idempotente: re-aplicable sin efectos secundarios (CREATE OR REPLACE).

-- =====================================================================
-- 1. calcular_puntos_partido: handle the "no result" case gracefully
-- =====================================================================

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

  -- No result yet (e.g. admin "unfinalized" the match) → zero out every
  -- prediction's puntos. This is the new behavior; before, we'd throw.
  IF v_local IS NULL OR v_visitante IS NULL THEN
    UPDATE public.predicciones_partido
       SET puntos_obtenidos = 0,
           updated_at = now()
     WHERE partido_id = p_partido_id
       AND puntos_obtenidos != 0;
    RETURN;
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

-- =====================================================================
-- 2. trigger_calcular_puntos: also fire when "unfinalizing"
-- =====================================================================

CREATE OR REPLACE FUNCTION public.trigger_calcular_puntos()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  -- Forward path: partido is currently finalizado AND has scores AND
  -- something changed (estado, score) since OLD. Compute fresh points.
  IF NEW.estado = 'finalizado'::public.estado_partido
     AND NEW.marcador_local_real IS NOT NULL
     AND NEW.marcador_visitante_real IS NOT NULL
     AND (
       OLD.estado IS DISTINCT FROM 'finalizado'::public.estado_partido
       OR OLD.marcador_local_real IS DISTINCT FROM NEW.marcador_local_real
       OR OLD.marcador_visitante_real IS DISTINCT FROM NEW.marcador_visitante_real
     ) THEN
    PERFORM public.calcular_puntos_partido(NEW.id);
    RETURN NEW;
  END IF;

  -- Reverse path: partido WAS finalizado with scores, now isn't (either
  -- estado moved away from finalizado, OR scores became NULL). Zero out
  -- everyone's points for this partido so the leaderboard reflects reality.
  IF (
       OLD.estado = 'finalizado'::public.estado_partido
       OR (OLD.marcador_local_real IS NOT NULL AND OLD.marcador_visitante_real IS NOT NULL)
     )
     AND (
       NEW.estado IS DISTINCT FROM 'finalizado'::public.estado_partido
       OR NEW.marcador_local_real IS NULL
       OR NEW.marcador_visitante_real IS NULL
     ) THEN
    PERFORM public.calcular_puntos_partido(NEW.id);
  END IF;

  RETURN NEW;
END;
$$;

-- =====================================================================
-- 3. calcular_puntos_bonus: handle the "no respuesta_correcta" case
-- =====================================================================

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

  -- Admin cleared the respuesta_correcta → zero out every answer's puntos.
  -- New behavior; before we'd throw.
  IF v_respuesta IS NULL THEN
    UPDATE public.predicciones_bonus
       SET puntos_obtenidos = 0,
           updated_at = now()
     WHERE pregunta_bonus_id = p_pregunta_id
       AND puntos_obtenidos != 0;
    RETURN;
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

-- =====================================================================
-- 4. trigger_calcular_bonus: also fire when respuesta_correcta is cleared
-- =====================================================================

CREATE OR REPLACE FUNCTION public.trigger_calcular_bonus()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  -- Fires whenever respuesta_correcta changed at all (set, updated, or
  -- cleared). The function itself decides whether to score-or-zero based
  -- on whether NEW.respuesta_correcta is NULL.
  IF OLD.respuesta_correcta IS DISTINCT FROM NEW.respuesta_correcta THEN
    PERFORM public.calcular_puntos_bonus(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

-- =====================================================================
-- 5. One-off cleanup: zero out any stuck puntos from before the fix
-- =====================================================================
-- The smoke test in prod left a predicción with puntos_obtenidos=5 on a
-- partido that was later unfinalized. This same condition can exist in
-- the wild if the bug was hit during dev too. Sweep both tables.
-- Idempotent — the WHERE only matches dirty rows.

UPDATE public.predicciones_partido pp
   SET puntos_obtenidos = 0,
       updated_at = now()
  FROM public.partidos pa
 WHERE pp.partido_id = pa.id
   AND pp.puntos_obtenidos != 0
   AND (
     pa.estado != 'finalizado'::public.estado_partido
     OR pa.marcador_local_real IS NULL
     OR pa.marcador_visitante_real IS NULL
   );

UPDATE public.predicciones_bonus pb
   SET puntos_obtenidos = 0,
       updated_at = now()
  FROM public.preguntas_bonus pq
 WHERE pb.pregunta_bonus_id = pq.id
   AND pb.puntos_obtenidos != 0
   AND pq.respuesta_correcta IS NULL;
