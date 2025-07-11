/* src/app/page.tsx  (NO 'use client') */
import ClientHome from './ClientHome'
import type { Metadata } from 'next'

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
    locale: 'en_US',
    type: 'website',
    images: [
      {
        url: 'https://timemachine.fairblock.network/api/og-image',
        width: 1200,
        height: 630,
        type: 'image/png',            // keep build static
        alt: 'Fairblock Time Machine preview',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Fairblock | Time Machine',
    description:
      'Replay encrypted transactions and witness deterministic on-chain decryption.',
    images: ['https://timemachine.fairblock.network/api/og-image'],
  },
}

export default function Page() {
  return <ClientHome />
}
