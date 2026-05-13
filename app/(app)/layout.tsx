import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/header'
import { MobileNav } from '@/components/mobile-nav'

/**
 * Authenticated shell. Middleware also gates this route group, but we
 * re-check here because the layout needs the user data anyway (name,
 * avatar, es_admin for the admin link) and a defensive redirect keeps
 * us safe if the middleware misses a path.
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('nombre, foto_url, es_admin')
    .eq('id', user.id)
    .single()

  // Fallback if the trigger / backfill missed: render with auth-side data
  // so the UI doesn't crash. This shouldn't happen for normal users but
  // helps during early dev.
  const usuarioShellSafe = usuario ?? {
    nombre: user.email ?? 'Usuario',
    foto_url: null,
    es_admin: false,
  }

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <Header usuario={usuarioShellSafe} email={user.email ?? ''} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-24 pt-6 md:pb-10 md:pt-10">
        {children}
      </main>
      <MobileNav esAdmin={usuarioShellSafe.es_admin} />
    </div>
  )
}
