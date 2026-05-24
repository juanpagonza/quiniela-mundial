'use client'

import Image from 'next/image'
import Link from 'next/link'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { LogOutIcon, UserIcon } from 'lucide-react'
import type { Usuario } from '@/lib/supabase/types'

interface UserMenuProps {
  usuario: Pick<Usuario, 'nombre' | 'foto_url'>
  email: string
}

function initialsOf(nombre: string): string {
  const parts = nombre.trim().split(/\s+/).slice(0, 2)
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('') || '?'
}

export function UserMenu({ usuario, email }: UserMenuProps) {
  const initials = initialsOf(usuario.nombre)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="group flex items-center gap-2 rounded-full p-1 pr-3 transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
        aria-label={`Menú de usuario para ${usuario.nombre}`}
      >
        {usuario.foto_url ? (
          <Image
            src={usuario.foto_url}
            alt=""
            width={32}
            height={32}
            className="size-8 rounded-full object-cover"
            unoptimized
          />
        ) : (
          <span
            aria-hidden="true"
            className="grid size-8 place-items-center rounded-full bg-muted text-xs font-medium text-muted-foreground"
          >
            {initials}
          </span>
        )}
        <span className="hidden text-sm font-medium md:inline">
          {usuario.nombre.split(' ')[0]}
        </span>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" sideOffset={8} className="min-w-56">
        {/* DropdownMenuLabel renders Base UI's GroupLabel which requires a
            Group ancestor — without it, Base UI throws error #31 at runtime
            ("MenuGroupRootContext is missing"). The Group wrapper here is
            semantically harmless and silences the error. */}
        <DropdownMenuGroup>
          <DropdownMenuLabel className="px-2 py-2">
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-medium leading-tight text-foreground">
                {usuario.nombre}
              </span>
              <span className="text-xs leading-tight text-muted-foreground">
                {email}
              </span>
            </div>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          render={(props) => (
            <Link href="/perfil" {...props}>
              <UserIcon className="size-4" />
              Mi perfil
            </Link>
          )}
          className="cursor-pointer"
        />
        <DropdownMenuSeparator />
        <form action="/auth/signout" method="POST">
          <DropdownMenuItem
            render={(props) => (
              <button type="submit" {...props}>
                <LogOutIcon className="size-4" />
                Cerrar sesión
              </button>
            )}
            className="w-full cursor-pointer"
          />
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
