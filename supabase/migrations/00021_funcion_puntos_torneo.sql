-- Necesitamos unaccent para comparar nombres de goleador sin importar tildes
-- ni mayúsculas. "Mbappé" == "Mbappe" == "MBAPPE".
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Recalcula puntos_campeon, puntos_subcampeon, puntos_goleador para todas las
-- predicciones_torneo. Se llama una sola vez al cerrar el torneo (Task 7.3) o
-- cuando el admin corrige el goleador oficial.
--
-- Campeón/subcampeón salen del partido en fase='final' con estado='finalizado'.
-- Asume que el ganador en regulación define el campeón; si la final terminó
-- empatada (penales), la fórmula actual da el visitante por default —
-- limitación conocida del schema (no guardamos resultado de penales).
--
-- SECURITY DEFINER + search_path='' + tablas calificadas para bypasar la RLS
-- de predicciones_torneo (mismo patrón que las otras funciones de scoring).
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
  -- Ganador y perdedor de la final. v_campeon/v_subcampeon quedan NULL si la
  -- final aún no está finalizada — todos los puntos del torneo salen 0.
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
       AND lower(unaccent(goleador_nombre)) = lower(unaccent(v_goleador))
      THEN v_pts_gol
      ELSE 0
    END,
    updated_at = now();
END;
$$;
