'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  HomeIcon,
  CalendarIcon,
  ListOrderedIcon,
  TrophyIcon,
  ShieldIcon,
  HelpCircleIcon,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface MobileNavProps {
  esAdmin: boolean
}

interface NavItem {
  href: string
  label: string
  Icon: LucideIcon
}

const baseItems: NavItem[] = [
  { href: '/', label: 'Inicio', Icon: HomeIcon },
  { href: '/partidos', label: 'Partidos', Icon: CalendarIcon },
  { href: '/tabla', label: 'Tabla', Icon: ListOrderedIcon },
  { href: '/mi-quiniela', label: 'Mi quiniela', Icon: TrophyIcon },
  { href: '/reglas', label: 'Reglas', Icon: HelpCircleIcon },
]

function isActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function MobileNav({ esAdmin }: MobileNavProps) {
  const pathname = usePathname()
  const items = esAdmin
    ? [...baseItems, { href: '/admin', label: 'Admin', Icon: ShieldIcon }]
    : baseItems

  return (
    <nav
      aria-label="Navegación principal"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur-md md:hidden"
    >
      <ul className="mx-auto flex w-full max-w-5xl items-stretch">
        {items.map((item) => {
          const active = isActive(pathname, item.href)
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-medium transition-colors',
                  active
                    ? 'text-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <item.Icon
                  className={cn(
                    'size-5 transition-transform',
                    active && 'scale-110',
                  )}
                  aria-hidden="true"
                  strokeWidth={active ? 2.4 : 1.8}
                />
                <span>{item.label}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
