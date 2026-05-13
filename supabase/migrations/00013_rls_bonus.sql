-- RLS para preguntas y predicciones bonus. Las preguntas son lectura pública para
-- todos los autenticados (cada uno necesita verlas para predecir); solo admin las
-- crea/edita. Las predicciones siguen el mismo patrón de privacidad y time-lock que
-- predicciones_partido, pero el join va por preguntas_bonus → partidos para resolver
-- el kickoff.

ALTER TABLE preguntas_bonus ENABLE ROW LEVEL SECURITY;
CREATE POLICY "preguntas_bonus_select" ON preguntas_bonus
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "preguntas_bonus_admin_write" ON preguntas_bonus
  FOR ALL TO authenticated
  USING ( (SELECT es_admin FROM usuarios WHERE id = auth.uid()) )
  WITH CHECK ( (SELECT es_admin FROM usuarios WHERE id = auth.uid()) );

ALTER TABLE predicciones_bonus ENABLE ROW LEVEL SECURITY;

-- SELECT: tuya siempre, ajena solo post-kickoff del partido asociado.
CREATE POLICY "predicciones_bonus_select" ON predicciones_bonus
  FOR SELECT TO authenticated
  USING (
    usuario_id = auth.uid()
    OR (
      SELECT p.fecha_hora_kickoff <= now()
      FROM preguntas_bonus pb
      JOIN partidos p ON p.id = pb.partido_id
      WHERE pb.id = predicciones_bonus.pregunta_bonus_id
    )
    OR (SELECT es_admin FROM usuarios WHERE id = auth.uid())
  );

-- INSERT/UPDATE: solo tuya, solo con >1 min al kickoff del partido asociado.
CREATE POLICY "predicciones_bonus_upsert" ON predicciones_bonus
  FOR ALL TO authenticated
  USING (
    usuario_id = auth.uid()
    AND (
      SELECT p.fecha_hora_kickoff > now() + interval '1 minute'
      FROM preguntas_bonus pb
      JOIN partidos p ON p.id = pb.partido_id
      WHERE pb.id = predicciones_bonus.pregunta_bonus_id
    )
  )
  WITH CHECK (
    usuario_id = auth.uid()
    AND (
      SELECT p.fecha_hora_kickoff > now() + interval '1 minute'
      FROM preguntas_bonus pb
      JOIN partidos p ON p.id = pb.partido_id
      WHERE pb.id = predicciones_bonus.pregunta_bonus_id
    )
  );

CREATE POLICY "predicciones_bonus_admin_all" ON predicciones_bonus
  FOR ALL TO authenticated
  USING ( (SELECT es_admin FROM usuarios WHERE id = auth.uid()) )
  WITH CHECK ( (SELECT es_admin FROM usuarios WHERE id = auth.uid()) );
