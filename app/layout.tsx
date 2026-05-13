import type { Metadata } from 'next'
import { Fraunces, Manrope, Geist_Mono } from 'next/font/google'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/sonner'
import './globals.css'

// Body sans — geometric, less generic than Inter/Geist.
const manrope = Manrope({
  variable: '--font-sans',
  subsets: ['latin'],
  display: 'swap',
})

// Display serif — Fraunces with the `opsz` axis for scaling at large sizes.
// Used for the wordmark and score readouts (variable weight handles both).
const fraunces = Fraunces({
  variable: '--font-display',
  subsets: ['latin'],
  display: 'swap',
  axes: ['opsz'],
})

// Mono — kept for tabular numerals (scores, standings columns).
const geistMono = Geist_Mono({
  variable: '--font-mono',
  subsets: ['latin'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Quiniela Mundial',
  description: 'Quiniela del Mundial de la FIFA entre amigos',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="es"
      suppressHydrationWarning
      className={`${manrope.variable} ${fraunces.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster richColors position="top-center" />
        </ThemeProvider>
      </body>
    </html>
  )
}
