-- Selecciones del Mundial. Una fila por equipo.
-- codigo_pais es ISO-2 minúsculas (ej: 'ar', 'br', 'us') para construir URLs de flagcdn.
-- api_id es el ID de football-data.org, usado para upsert idempotente al sincronizar.
CREATE TABLE equipos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  codigo_pais TEXT NOT NULL,
  api_id INTEGER UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
