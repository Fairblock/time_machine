// src/app/layout.tsx  (patched)
import './globals.css'
import type { Metadata } from 'next'
import ClientLayout from '@/app/ClientLayout'
import { HowItWorksProvider } from '@/contexts/HowItWorksContext'
// If you really want Google Fonts, use next/font/google (better perf)
// import { Montserrat } from 'next/font/google'
// const montserrat = Montserrat({ subsets: ['latin'], variable: '--font-mont' })

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
  // If you didn’t switch to next/font/google and still need the link tag,
  // you can inject it via “other”:
  other: {
    'link-font-montserrat':
      '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,100..900;1,100..900&display=swap" />',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      {/* className={montserrat.variable}  ← if you use next/font/google */}
      <body className="font-neue">
        <HowItWorksProvider>
          <ClientLayout>{children}</ClientLayout>
        </HowItWorksProvider>
      </body>
    </html>
  )
}
