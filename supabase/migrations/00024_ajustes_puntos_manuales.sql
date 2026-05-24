-- Tabla append-only para que el admin sume o reste puntos sueltos a un usuario
-- (errores administrativos, premios sorpresa, penalizaciones, etc).
-- puntos puede ser positivo o negativo. motivo es obligatorio (auditoría
-- humana — el log_auditoria también captura el cambio, pero el motivo aquí
-- queda asociado al ajuste mismo).
CREATE TABLE ajustes_puntos_manuales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  admin_id UUID NOT NULL REFERENCES usuarios(id),
  puntos INTEGER NOT NULL,
  motivo TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ajustes_usuario ON ajustes_puntos_manuales(usuario_id);
CREATE INDEX idx_ajustes_fecha ON ajustes_puntos_manuales(created_at DESC);

ALTER TABLE ajustes_puntos_manuales ENABLE ROW LEVEL SECURITY;

-- Cualquier autenticado puede leer (los ajustes son transparentes — el
-- usuario debería poder ver por qué su tabla refleja un valor distinto a
-- la suma de sus predicciones).
CREATE POLICY "ajustes_select" ON ajustes_puntos_manuales
  FOR SELECT TO authenticated USING (true);

-- Solo admin escribe.
CREATE POLICY "ajustes_admin_write" ON ajustes_puntos_manuales
  FOR ALL TO authenticated
  USING ( (SELECT es_admin FROM usuarios WHERE id = auth.uid()) )
  WITH CHECK ( (SELECT es_admin FROM usuarios WHERE id = auth.uid()) );

-- Reescribimos la vista leaderboard para que sume los ajustes manuales al
-- total. Mismo patrón de subqueries correlacionadas (sin cardinalidad);
-- una nueva subquery por ajustes_puntos_manuales suma todos los ajustes
-- de cada usuario (positivos y negativos).
CREATE OR REPLACE VIEW public.leaderboard AS
SELECT
  u.id AS usuario_id,
  u.nombre,
  u.foto_url,
  (
    SELECT COALESCE(SUM(puntos_obtenidos), 0)::INTEGER
    FROM public.predicciones_partido
    WHERE usuario_id = u.id
  ) +
  (
    SELECT COALESCE(SUM(puntos_obtenidos), 0)::INTEGER
    FROM public.predicciones_bonus
    WHERE usuario_id = u.id
  ) +
  COALESCE(
    (
      SELECT puntos_campeon + puntos_subcampeon + puntos_goleador
      FROM public.predicciones_torneo
      WHERE usuario_id = u.id
    ),
    0
  ) +
  (
    SELECT COALESCE(SUM(puntos), 0)::INTEGER
    FROM public.ajustes_puntos_manuales
    WHERE usuario_id = u.id
  ) AS puntos_totales,
  (
    SELECT COUNT(*)::INTEGER
    FROM public.predicciones_partido pp
    JOIN public.partidos p ON p.id = pp.partido_id
    WHERE pp.usuario_id = u.id
      AND pp.marcador_local = p.marcador_local_real
      AND pp.marcador_visitante = p.marcador_visitante_real
  ) AS marcadores_exactos
FROM public.usuarios u
ORDER BY puntos_totales DESC, marcadores_exactos DESC, u.nombre ASC;

GRANT SELECT ON public.leaderboard TO authenticated;
