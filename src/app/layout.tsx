/* ── src/app/layout.tsx ───────────────────────────────────────────── */
import './globals.css'
import type { Metadata } from 'next'

import { Montserrat } from 'next/font/google'
import ClientLayout from '@/app/ClientLayout'
import { HowItWorksProvider } from '@/contexts/HowItWorksContext'

/* ── fonts ───────────────────────────────────────────────────────── */
const montserrat = Montserrat({
  subsets: ['latin'],
  variable: '--font-mont',          // optional CSS variable
})

/* ── site-wide metadata (static, crawlable) ──────────────────────── */
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

/* ── root layout ─────────────────────────────────────────────────── */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={montserrat.variable}>
      <body className="font-neue">
        <HowItWorksProvider>
          <ClientLayout>{children}</ClientLayout>
        </HowItWorksProvider>
      </body>
    </html>
  )
}
