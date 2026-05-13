-- RLS para tablas de "lectura pública": cualquier autenticado lee, solo admin escribe.
-- Las escrituras de mantenimiento desde código server-side (sync de la API, cron) usan
-- service_role y bypasan RLS, así que no necesitan política propia.

-- equipos: solo SELECT para autenticados. INSERT/UPDATE viene de la sync (service_role)
-- o del admin via UI (no implementado todavía pero cae bajo otra policy si la sumamos).
ALTER TABLE equipos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "equipos_select" ON equipos FOR SELECT TO authenticated USING (true);

-- partidos: SELECT abierto + ALL para admin (habilitar partidos, editar marcadores).
ALTER TABLE partidos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "partidos_select" ON partidos FOR SELECT TO authenticated USING (true);
CREATE POLICY "partidos_admin_write" ON partidos
  FOR ALL TO authenticated
  USING ( (SELECT es_admin FROM usuarios WHERE id = auth.uid()) )
  WITH CHECK ( (SELECT es_admin FROM usuarios WHERE id = auth.uid()) );

-- configuracion: SELECT abierto + ALL para admin. El singleton id=1 está pre-creado.
ALTER TABLE configuracion ENABLE ROW LEVEL SECURITY;
CREATE POLICY "config_select" ON configuracion FOR SELECT TO authenticated USING (true);
CREATE POLICY "config_admin_write" ON configuracion
  FOR ALL TO authenticated
  USING ( (SELECT es_admin FROM usuarios WHERE id = auth.uid()) )
  WITH CHECK ( (SELECT es_admin FROM usuarios WHERE id = auth.uid()) );
