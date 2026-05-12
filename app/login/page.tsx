'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'

function LoginContent() {
  const supabase = createClient()
  const searchParams = useSearchParams()
  const error = searchParams.get('error')
  const [loading, setLoading] = useState(false)

  const handleGoogleSignIn = async () => {
    setLoading(true)
    const { error: signInError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (signInError) {
      console.error('OAuth error:', signInError)
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md bg-card text-card-foreground rounded-2xl shadow-sm border p-8">
      <h1 className="text-3xl font-semibold tracking-tight mb-2">⚽ Quiniela Mundial</h1>
      <p className="text-muted-foreground mb-6">Iniciá sesión para participar</p>

      {error && (
        <div className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          No pudimos iniciar tu sesión. Intentá de nuevo.
        </div>
      )}

      <Button
        onClick={handleGoogleSignIn}
        disabled={loading}
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
