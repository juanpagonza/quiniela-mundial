import type { Database, Tables, Enums } from '@/lib/database.types'

export type { Database, Json } from '@/lib/database.types'

// Row types — el tipo `Row` de cada tabla, listo para useState / props / queries.
// Para Insert/Update usá TablesInsert/TablesUpdate desde database.types directamente.
export type Usuario = Tables<'usuarios'>
export type Equipo = Tables<'equipos'>
export type Partido = Tables<'partidos'>
export type PrediccionPartido = Tables<'predicciones_partido'>
export type PrediccionTorneo = Tables<'predicciones_torneo'>
export type PreguntaBonus = Tables<'preguntas_bonus'>
export type PrediccionBonus = Tables<'predicciones_bonus'>
export type Configuracion = Tables<'configuracion'>
export type LogAuditoria = Tables<'log_auditoria'>

// Views — generadas como cualquier tabla, pero todas las columnas son nullable
// porque PostgREST no infiere NOT NULL en expresiones agregadas. En las queries
// hacemos los castings/coalesce que correspondan.
export type Leaderboard = Database['public']['Views']['leaderboard']['Row']

// Enums — uniones de string literals.
export type FasePartido = Enums<'fase_partido'>
export type EstadoPartido = Enums<'estado_partido'>
export type TipoPreguntaBonus = Enums<'tipo_pregunta_bonus'>
export type AccionAuditoria = Enums<'accion_auditoria'>
