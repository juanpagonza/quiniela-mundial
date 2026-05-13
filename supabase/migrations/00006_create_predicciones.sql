-- predicciones_partido: una fila por (usuario, partido). El UNIQUE evita duplicados;
-- los upserts del cliente deben usar ON CONFLICT (usuario_id, partido_id). El lock
-- por tiempo se hace en Fase 2 vía RLS. editado_por_admin marca filas tocadas desde
-- el panel admin para mostrarlo en la UI.
CREATE TABLE predicciones_partido (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  partido_id UUID NOT NULL REFERENCES partidos(id) ON DELETE CASCADE,
  marcador_local INTEGER NOT NULL CHECK (marcador_local >= 0),
  marcador_visitante INTEGER NOT NULL CHECK (marcador_visitante >= 0),
  puntos_obtenidos INTEGER NOT NULL DEFAULT 0,
  editado_por_admin BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(usuario_id, partido_id)
);

CREATE INDEX idx_predicciones_usuario ON predicciones_partido(usuario_id);
CREATE INDEX idx_predicciones_partido ON predicciones_partido(partido_id);

-- predicciones_torneo: una fila por usuario (UNIQUE). campeon/subcampeon nullable
-- para permitir guardado parcial. goleador es texto libre porque no modelamos
-- jugadores como entidad (la lista oficial sale en Fase 7).
CREATE TABLE predicciones_torneo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL UNIQUE REFERENCES usuarios(id) ON DELETE CASCADE,
  campeon_equipo_id UUID REFERENCES equipos(id),
  subcampeon_equipo_id UUID REFERENCES equipos(id),
  goleador_nombre TEXT,
  puntos_campeon INTEGER NOT NULL DEFAULT 0,
  puntos_subcampeon INTEGER NOT NULL DEFAULT 0,
  puntos_goleador INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
