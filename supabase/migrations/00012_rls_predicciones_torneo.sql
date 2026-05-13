-- Helper: ¿ya empezó el mundial? Devuelve TRUE si existe al menos un partido cuyo
-- kickoff cae dentro del próximo minuto (o ya pasó). Usado para bloquear cambios
-- en predicciones_torneo (campeón/subcampeón/goleador) una vez arrancado el evento.
-- STABLE permite que Postgres cachee el resultado dentro de una query/transaction.
CREATE OR REPLACE FUNCTION mundial_iniciado() RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM partidos
    WHERE fecha_hora_kickoff <= now() + interval '1 minute'
  );
$$ LANGUAGE SQL STABLE;

ALTER TABLE predicciones_torneo ENABLE ROW LEVEL SECURITY;

-- SELECT: tuya siempre. Ajena solo después del cierre (cuando arranca el mundial,
-- todos descubren las predicciones del resto). Admin ve todo.
CREATE POLICY "torneo_select" ON predicciones_torneo
  FOR SELECT TO authenticated
  USING (
    usuario_id = auth.uid()
    OR mundial_iniciado()
    OR (SELECT es_admin FROM usuarios WHERE id = auth.uid())
  );

-- INSERT/UPDATE/DELETE: solo la tuya, solo antes del cierre.
CREATE POLICY "torneo_upsert" ON predicciones_torneo
  FOR ALL TO authenticated
  USING (usuario_id = auth.uid() AND NOT mundial_iniciado())
  WITH CHECK (usuario_id = auth.uid() AND NOT mundial_iniciado());

-- Admin override: post-cierre puede corregir.
CREATE POLICY "torneo_admin_all" ON predicciones_torneo
  FOR ALL TO authenticated
  USING ( (SELECT es_admin FROM usuarios WHERE id = auth.uid()) )
  WITH CHECK ( (SELECT es_admin FROM usuarios WHERE id = auth.uid()) );
