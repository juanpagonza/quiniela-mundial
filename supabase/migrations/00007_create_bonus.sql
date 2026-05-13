-- preguntas_bonus: una pregunta por partido (puede haber varias por partido).
-- opciones es JSONB para que pueda ser null (tipo 'numero') o un array (resto).
-- respuesta_correcta queda null hasta que el admin la fija al terminar el partido,
-- momento en que el trigger de Fase 6 dispara el cálculo de puntos.
CREATE TABLE preguntas_bonus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partido_id UUID NOT NULL REFERENCES partidos(id) ON DELETE CASCADE,
  tipo tipo_pregunta_bonus NOT NULL,
  enunciado TEXT NOT NULL,
  opciones JSONB,
  respuesta_correcta JSONB,
  puntos INTEGER NOT NULL DEFAULT 2,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_preguntas_bonus_partido ON preguntas_bonus(partido_id);

-- predicciones_bonus: una respuesta por (usuario, pregunta). UNIQUE garantiza
-- el upsert idempotente. respuesta es JSONB para soportar todos los tipos
-- (número, "over"/"under", "si"/"no", o índice de opción múltiple).
CREATE TABLE predicciones_bonus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  pregunta_bonus_id UUID NOT NULL REFERENCES preguntas_bonus(id) ON DELETE CASCADE,
  respuesta JSONB NOT NULL,
  puntos_obtenidos INTEGER NOT NULL DEFAULT 0,
  editado_por_admin BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(usuario_id, pregunta_bonus_id)
);

CREATE INDEX idx_predicciones_bonus_usuario ON predicciones_bonus(usuario_id);
CREATE INDEX idx_predicciones_bonus_pregunta ON predicciones_bonus(pregunta_bonus_id);
