/* app/page.tsx */
import ClientHome from './ClientHome';
import type { Metadata } from "next";

export const dynamic = 'force-static';

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
        type: 'image/png', // ← makes the image static
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

export default function Page() {
  return <ClientHome />;
}