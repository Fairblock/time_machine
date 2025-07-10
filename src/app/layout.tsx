/* ── src/app/layout.tsx ─────────────────────────────── */
import './globals.css'
import type { Metadata } from 'next'
import { Montserrat } from 'next/font/google'

import RootShell from './RootShell'            // ← just created

/* Google font (server-safe) */
const montserrat = Montserrat({
  subsets: ['latin'],
  variable: '--font-mont',
})



export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={montserrat.variable}>
      <body className="font-neue">
        <RootShell>{children}</RootShell>
      </body>
    </html>
  )
}
