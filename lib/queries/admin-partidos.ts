import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, EstadoPartido, FasePartido } from '@/lib/supabase/types'
import type { EquipoMini } from './partidos'

type Client = SupabaseClient<Database>

export interface PartidoAdminItem {
  id: string
  api_id: number
  fase: FasePartido
  estado: EstadoPartido
  fecha_hora_kickoff: string
  marcador_local_real: number | null
  marcador_visitante_real: number | null
  habilitado_para_predecir: boolean
  equipo_local: EquipoMini
  equipo_visitante: EquipoMini
}

export async function obtenerPartidosAdmin(
  supabase: Client,
): Promise<PartidoAdminItem[]> {
  const { data, error } = await supabase
    .from('partidos')
    .select(
      `id, api_id, fase, estado, fecha_hora_kickoff,
       marcador_local_real, marcador_visitante_real, habilitado_para_predecir,
       equipo_local:equipos!equipo_local_id (id, nombre, codigo_pais),
       equipo_visitante:equipos!equipo_visitante_id (id, nombre, codigo_pais)`,
    )
    .order('fecha_hora_kickoff', { ascending: true })

  if (error) throw error

  return (data ?? []).map((p) => ({
    id: p.id,
    api_id: p.api_id,
    fase: p.fase,
    estado: p.estado,
    fecha_hora_kickoff: p.fecha_hora_kickoff,
    marcador_local_real: p.marcador_local_real,
    marcador_visitante_real: p.marcador_visitante_real,
    habilitado_para_predecir: p.habilitado_para_predecir,
    equipo_local: p.equipo_local as unknown as EquipoMini,
    equipo_visitante: p.equipo_visitante as unknown as EquipoMini,
  }))
}
