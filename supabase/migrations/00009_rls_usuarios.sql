-- RLS para usuarios: lectura abierta a todos los autenticados (la tabla de posiciones
-- necesita ver nombre/foto del resto), y escritura solo para admins. INSERT no tiene
-- política porque la fila la crea el trigger handle_new_user con SECURITY DEFINER, que
-- corre con privilegios de owner y bypasa RLS — los usuarios autenticados no insertan
-- directo. DELETE tampoco tiene política — borrar usuarios pasa por service_role
-- (admin cleanup) o cascade desde auth.users.
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "usuarios_select_all" ON usuarios
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "usuarios_update_admin" ON usuarios
  FOR UPDATE TO authenticated
  USING ( (SELECT es_admin FROM usuarios WHERE id = auth.uid()) )
  WITH CHECK ( (SELECT es_admin FROM usuarios WHERE id = auth.uid()) );
