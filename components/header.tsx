'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { UserMenu } from './user-menu'
import type { Usuario } from '@/lib/supabase/types'

interface HeaderProps {
  usuario: Pick<Usuario, 'nombre' | 'foto_url' | 'es_admin'>
  email: string
}

const baseLinks = [
  { href: '/', label: 'Inicio' },
  { href: '/partidos', label: 'Partidos' },
  { href: '/tabla', label: 'Tabla' },
  { href: '/mi-quiniela', label: 'Mi Quiniela' },
]

function isActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function Header({ usuario, email }: HeaderProps) {
  const pathname = usePathname()
  const links = usuario.es_admin
    ? [...baseLinks, { href: '/admin', label: 'Admin' }]
    : baseLinks

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-4 py-3 md:py-4">
        <Link
          href="/"
          className="group flex items-center gap-2 transition-opacity hover:opacity-80"
        >
          <span aria-hidden="true" className="text-xl leading-none">
            ⚽
          </span>
          <span className="font-display text-lg font-semibold tracking-tight text-foreground sm:text-xl">
            Quiniela Mundial
          </span>
        </Link>

        <nav
          aria-label="Navegación principal"
          className="hidden items-center gap-1 md:flex"
        >
          {links.map((link) => {
            const active = isActive(pathname, link.href)
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
                  active
                    ? 'bg-foreground text-background'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                )}
              >
                {link.label}
              </Link>
            )
          })}
        </nav>

        <UserMenu usuario={usuario} email={email} />
      </div>
    </header>
  )
}
