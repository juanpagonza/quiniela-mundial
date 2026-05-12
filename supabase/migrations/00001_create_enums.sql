CREATE TYPE fase_partido AS ENUM ('grupos', 'octavos', 'cuartos', 'semis', 'tercer_puesto', 'final');
CREATE TYPE estado_partido AS ENUM ('programado', 'en_curso', 'finalizado', 'suspendido');
CREATE TYPE tipo_pregunta_bonus AS ENUM ('numero', 'over_under', 'si_no', 'opcion_multiple');
CREATE TYPE accion_auditoria AS ENUM (
  'editar_prediccion_partido',
  'editar_prediccion_bonus',
  'ajuste_puntos_manual',
  'editar_resultado_partido',
  'editar_config',
  'habilitar_partido',
  'crear_pregunta_bonus',
  'editar_pregunta_bonus',
  'eliminar_pregunta_bonus'
);
