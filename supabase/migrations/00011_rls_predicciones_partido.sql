-- RLS para predicciones_partido. El diseño impone:
--   * Privacidad: nadie ve las predicciones de otros hasta que arrancó el partido.
--   * Cierre de ventana: nadie predice/edita dentro del último minuto antes del kickoff.
--   * Admin override: el admin puede leer/escribir lo que quiera sin restricciones.
-- Todo se evalúa contra `partidos.fecha_hora_kickoff` y `habilitado_para_predecir`.
ALTER TABLE predicciones_partido ENABLE ROW LEVEL SECURITY;

-- SELECT: tuya siempre, ajena solo post-kickoff. Admin ve todo.
CREATE POLICY "predicciones_select" ON predicciones_partido
  FOR SELECT TO authenticated
  USING (
    usuario_id = auth.uid()
    OR (
      SELECT fecha_hora_kickoff <= now()
      FROM partidos
      WHERE partidos.id = predicciones_partido.partido_id
    )
    OR (SELECT es_admin FROM usuarios WHERE id = auth.uid())
  );

-- INSERT: solo la tuya, solo si el partido está habilitado y faltan >1 min para kickoff.
CREATE POLICY "predicciones_insert" ON predicciones_partido
  FOR INSERT TO authenticated
  WITH CHECK (
    usuario_id = auth.uid()
    AND (
      SELECT habilitado_para_predecir = true
        AND fecha_hora_kickoff > now() + interval '1 minute'
      FROM partidos
      WHERE partidos.id = predicciones_partido.partido_id
    )
  );

-- UPDATE: misma ventana de tiempo; además no podés modificar una predicción que ya
-- tocó el admin (editado_por_admin = true). El admin sí puede modificarla via la
-- policy admin_all de abajo.
CREATE POLICY "predicciones_update_own" ON predicciones_partido
  FOR UPDATE TO authenticated
  USING (
    usuario_id = auth.uid()
    AND NOT editado_por_admin
  )
  WITH CHECK (
    usuario_id = auth.uid()
    AND (
      SELECT habilitado_para_predecir = true
        AND fecha_hora_kickoff > now() + interval '1 minute'
      FROM partidos
      WHERE partidos.id = predicciones_partido.partido_id
    )
  );

-- Admin override: lectura/escritura sin restricción de tiempo (corregir post-partido,
-- ajustes manuales, etc.).
CREATE POLICY "predicciones_admin_all" ON predicciones_partido
  FOR ALL TO authenticated
  USING ( (SELECT es_admin FROM usuarios WHERE id = auth.uid()) )
  WITH CHECK ( (SELECT es_admin FROM usuarios WHERE id = auth.uid()) );
