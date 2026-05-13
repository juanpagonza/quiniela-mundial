-- configuracion: tabla de una sola fila (CHECK id = 1). Mantiene el sistema de
-- puntos y el goleador oficial. La fila inicial se inserta acá; las modificaciones
-- las hace el admin desde la UI en Fase 8.
CREATE TABLE configuracion (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  puntos_marcador_exacto INTEGER NOT NULL DEFAULT 5,
  puntos_solo_ganador INTEGER NOT NULL DEFAULT 2,
  puntos_campeon INTEGER NOT NULL DEFAULT 10,
  puntos_subcampeon INTEGER NOT NULL DEFAULT 5,
  puntos_goleador INTEGER NOT NULL DEFAULT 10,
  goleador_oficial TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO configuracion (id) VALUES (1);

-- log_auditoria: append-only. valor_anterior/nuevo son JSONB para guardar
-- snapshots de cualquier entidad sin acoplarse a su forma. No hay ON DELETE
-- en admin_id a propósito: si se borra un admin, las filas auditadas siguen
-- (FK default es NO ACTION, así que borrar el admin falla si tiene auditoría
-- — preserva la trazabilidad).
CREATE TABLE log_auditoria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES usuarios(id),
  fecha TIMESTAMPTZ NOT NULL DEFAULT now(),
  accion accion_auditoria NOT NULL,
  entidad_tipo TEXT NOT NULL,
  entidad_id UUID,
  valor_anterior JSONB,
  valor_nuevo JSONB,
  motivo TEXT
);

CREATE INDEX idx_log_fecha ON log_auditoria(fecha DESC);
CREATE INDEX idx_log_admin ON log_auditoria(admin_id);
