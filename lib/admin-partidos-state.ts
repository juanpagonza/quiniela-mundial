// Shared shapes for the admin-partidos Server Actions and their consumers.
// Lives outside `lib/actions/admin-partidos.ts` because a 'use server' file
// can only export async functions — exporting a const object from there fails
// at module evaluation with:
//   A "use server" file can only export async functions, found object.

export type AdminPartidoResult =
  | { success: true; message?: string }
  | { success: false; error: string }

export interface AdminPartidoActionState {
  result: AdminPartidoResult | null
}

export const INITIAL_ADMIN_PARTIDO_STATE: AdminPartidoActionState = {
  result: null,
}
