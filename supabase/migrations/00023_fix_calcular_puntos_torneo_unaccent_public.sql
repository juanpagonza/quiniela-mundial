-- Fix iter 2: unaccent vive en el schema `public` en este proyecto (verificado
-- via pg_proc + pg_namespace), no en `extensions` como asumió el fix anterior.
-- La función `calcular_puntos_torneo` corre con SET search_path = '' así que
-- necesita el nombre fully qualified.
CREATE OR REPLACE FUNCTION public.calcular_puntos_torneo()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_campeon UUID;
  v_subcampeon UUID;
  v_goleador TEXT;
  v_pts_camp INT;
  v_pts_subcamp INT;
  v_pts_gol INT;
BEGIN
  SELECT
    CASE WHEN marcador_local_real > marcador_visitante_real THEN equipo_local_id
         ELSE equipo_visitante_id END,
    CASE WHEN marcador_local_real > marcador_visitante_real THEN equipo_visitante_id
         ELSE equipo_local_id END
    INTO v_campeon, v_subcampeon
    FROM public.partidos
   WHERE fase = 'final'::public.fase_partido
     AND estado = 'finalizado'::public.estado_partido
   LIMIT 1;

  SELECT goleador_oficial, puntos_campeon, puntos_subcampeon, puntos_goleador
    INTO v_goleador, v_pts_camp, v_pts_subcamp, v_pts_gol
    FROM public.configuracion
   WHERE id = 1;

  UPDATE public.predicciones_torneo SET
    puntos_campeon = CASE
      WHEN campeon_equipo_id = v_campeon THEN v_pts_camp
      ELSE 0
    END,
    puntos_subcampeon = CASE
      WHEN subcampeon_equipo_id = v_subcampeon THEN v_pts_subcamp
      ELSE 0
    END,
    puntos_goleador = CASE
      WHEN v_goleador IS NOT NULL
       AND goleador_nombre IS NOT NULL
       AND lower(public.unaccent(goleador_nombre)) = lower(public.unaccent(v_goleador))
      THEN v_pts_gol
      ELSE 0
    END,
    updated_at = now();
END;
$$;
