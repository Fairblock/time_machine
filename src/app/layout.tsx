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

/* Static metadata */
export const metadata: Metadata = {
  title: 'Fairblock | Time Machine',
  description:
    'Replay encrypted transactions and witness deterministic on-chain decryption.',
  openGraph: {
    title: 'Fairblock | Time Machine',
    description:
      'Replay encrypted transactions and witness deterministic on-chain decryption.',
    url: 'https://timemachine.fairblock.network/',
    siteName: 'Fairblock',
    images: [
      {
        url: 'https://timemachine.fairblock.network/og.png',
        width: 1200,
        height: 630,
        alt: 'Fairblock Time Machine preview',
        type: 'image/png',          // ← **critical**: makes it static
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Fairblock | Time Machine',
    description:
      'Replay encrypted transactions and witness deterministic on-chain decryption.',
    images: ['https://timemachine.fairblock.network/og.png'],
  },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={montserrat.variable}>
      <body className="font-neue">
        <RootShell>{children}</RootShell>
      </body>
    </html>
  )
}
