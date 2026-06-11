'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'

function LoginContent() {
  const searchParams = useSearchParams()
  const queryError = searchParams.get('error')
  const rawNext = searchParams.get('next') ?? '/'
  const next = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/'

  const [loading, setLoading] = useState(false)
  const [clientError, setClientError] = useState<string | null>(null)

  const handleGoogleSignIn = async () => {
    setLoading(true)
    setClientError(null)
    // Create the Supabase client lazily so prerendering (which runs in a
    // Node environment without NEXT_PUBLIC_* available) never instantiates it.
    const supabase = createClient()
    const callbackUrl = new URL('/auth/callback', window.location.origin)
    if (next !== '/') callbackUrl.searchParams.set('next', next)

    const { error: signInError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: callbackUrl.toString() },
    })
    if (signInError) {
      setClientError('No pudimos contactar a Google. Intentá de nuevo en un momento.')
      setLoading(false)
    }
  }

  const displayError = clientError ?? (queryError ? 'No pudimos iniciar tu sesión. Intentá de nuevo.' : null)

  return (
    <div className="w-full max-w-md bg-card text-card-foreground rounded-2xl shadow-sm border p-8">
      <h1 className="text-3xl font-semibold tracking-tight mb-2">
        <span aria-hidden="true">⚽ </span>Quiniela Mundial
      </h1>
      <p className="text-muted-foreground mb-6">Iniciá sesión para participar</p>

      {displayError && (
        <div
          role="alert"
          className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
        >
          {displayError}
        </div>
      )}

      <Button
        onClick={handleGoogleSignIn}
        disabled={loading}
        aria-busy={loading}
        className="w-full"
        size="lg"
      >
        {loading ? 'Conectando...' : 'Entrar con Google'}
      </Button>

      <p className="text-xs text-muted-foreground text-center mt-6">
        Solo personas invitadas
      </p>
    </div>
  )
}

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-background">
      <Suspense fallback={<div className="text-muted-foreground">Cargando...</div>}>
        <LoginContent />
      </Suspense>
    </main>
  )
}
