-- Partidos del Mundial. api_id permite upsert idempotente desde football-data.org.
-- marcador_*_real arranca NULL y se completa al finalizar. habilitado_para_predecir
-- permite al admin abrir/cerrar la ventana de predicciones por partido (sumado al lock
-- automático por tiempo que aplicará la RLS en Fase 2).
CREATE TABLE partidos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_id INTEGER UNIQUE NOT NULL,
  equipo_local_id UUID NOT NULL REFERENCES equipos(id),
  equipo_visitante_id UUID NOT NULL REFERENCES equipos(id),
  fecha_hora_kickoff TIMESTAMPTZ NOT NULL,
  fase fase_partido NOT NULL,
  estado estado_partido NOT NULL DEFAULT 'programado',
  marcador_local_real INTEGER,
  marcador_visitante_real INTEGER,
  habilitado_para_predecir BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_partidos_kickoff ON partidos(fecha_hora_kickoff);
CREATE INDEX idx_partidos_fase ON partidos(fase);
CREATE INDEX idx_partidos_estado ON partidos(estado);
