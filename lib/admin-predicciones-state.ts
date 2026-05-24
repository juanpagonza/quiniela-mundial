// Server Action state shapes for the admin-predicciones forms. Kept here
// (not in the 'use server' action file) — see note in ajustes-logic.ts for
// why a 'use server' module can't export non-async values.

export type AdminPrediccionResult =
  | { success: true; message?: string }
  | { success: false; error: string }

export interface AdminPrediccionActionState {
  result: AdminPrediccionResult | null
}

export const INITIAL_ADMIN_PREDICCION_STATE: AdminPrediccionActionState = {
  result: null,
}
