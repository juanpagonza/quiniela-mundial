'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import {
  upsertPrediccionTorneoCore,
  type TorneoActionState,
} from '@/lib/torneo-logic'

export async function upsertPrediccionTorneo(
  _prev: TorneoActionState,
  formData: FormData,
): Promise<TorneoActionState> {
  const campeon_equipo_id = readNullable(formData.get('campeon_equipo_id'))
  const subcampeon_equipo_id = readNullable(formData.get('subcampeon_equipo_id'))
  const goleador_nombre = readNullable(formData.get('goleador_nombre'))

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return {
      result: {
        success: false,
        error: 'Tu sesión expiró. Iniciá sesión otra vez.',
      },
    }
  }

  const result = await upsertPrediccionTorneoCore(supabase, user.id, {
    campeon_equipo_id,
    subcampeon_equipo_id,
    goleador_nombre,
  })

  if (result.success) {
    revalidatePath('/mi-quiniela')
    revalidatePath('/perfil')
    revalidatePath('/')
  }

  return { result }
}

/** Empty-string FormData values become null so the DB stores NULL, not ''. */
function readNullable(v: FormDataEntryValue | null): string | null {
  if (v === null) return null
  const s = String(v).trim()
  return s.length > 0 ? s : null
}
