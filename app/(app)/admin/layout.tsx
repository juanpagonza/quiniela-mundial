import { requireAdmin } from '@/lib/auth/admin'

/**
 * Layout-level admin gate. Every /admin/* route inherits this, so the
 * underlying pages can assume the caller is an admin and skip their own
 * requireAdmin() call.
 *
 * Defense-in-depth: pages may still call requireAdmin() if they need the
 * supabase client returned from it. The redirect is a no-op when admin.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requireAdmin()
  return <>{children}</>
}
