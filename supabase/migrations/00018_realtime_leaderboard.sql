-- Habilitar Realtime en las tablas que alimentan la leaderboard. Cualquier
-- cambio en estas tablas dispara un evento postgres_changes al que el cliente
-- de /tabla se suscribe para re-fetchear la vista.
--
-- La publicación `supabase_realtime` ya existe en proyectos Supabase recién
-- creados; solo agregamos las tablas. RLS sigue filtrando qué eventos ve cada
-- usuario suscripto: pre-kickoff cada uno solo escucha sus propias predicciones,
-- post-kickoff escucha todo. Como el view bypasa RLS via owner, refetch siempre
-- devuelve los totales correctos.
ALTER PUBLICATION supabase_realtime ADD TABLE
  public.predicciones_partido,
  public.predicciones_bonus,
  public.predicciones_torneo,
  public.partidos;
