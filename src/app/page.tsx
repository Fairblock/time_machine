/* src/app/page.tsx  (NO 'use client') */
import ClientHome from './ClientHome'
import type { Metadata } from 'next'



export async function generateMetadata(): Promise<Metadata> {
  const title = 'Time Machine';
  const imageUrl = `/api/og?title=${encodeURIComponent(title)}`;

  return {
    title,
    description: 'Time Machine',
    metadataBase: new URL('https://example.com'),   // absolute URLs mandatory
    openGraph: {
      title,
      description: 'Time Machine',
      images: [imageUrl],
    },
    twitter: { card: 'summary_large_image', images: [imageUrl] },
  };
}

export default function Page() {
  return <ClientHome />
}
