-- log_auditoria: lectura solo para admins (vía UI), escritura solo desde código
-- server-side con service_role (que bypasa RLS). No definimos política de INSERT
-- a propósito — sin policy, ningún usuario authenticated puede insertar, lo que
-- garantiza que el log no se manipule desde el cliente.
ALTER TABLE log_auditoria ENABLE ROW LEVEL SECURITY;

CREATE POLICY "log_admin_select" ON log_auditoria
  FOR SELECT TO authenticated
  USING ( (SELECT es_admin FROM usuarios WHERE id = auth.uid()) );
