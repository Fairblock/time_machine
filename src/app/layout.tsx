import ClientLayout from "@/app/ClientLayout";
import type { Metadata } from "next";
import "./globals.css";
import { HowItWorksProvider } from "@/contexts/HowItWorksContext";
// import Header from '@/components/header/Header';
// import { useActiveToken } from '@/hooks/useActiveToken';

export const metadata: Metadata = {
  title:        'Time Machine',
  description:  'Step into the time machine.',
  openGraph: {
    title:       'Time Machine',
    description: 'Step into the time machine.',
    url:         'https://timemachine.fairblock.network/',
    siteName:    'Fairblock',
    images: [
      {
        url:   'https://timemachine.fairblock.network/og.png',
        width: 1200,
        height: 630,
        alt:  'Time Machine',
      },
    ],
    locale: 'en_US',
    type:   'website',
  },
  twitter: {
    card:        'summary_large_image',
    title:       'Time Machine',
    description: 'Step into the time machine.',
    images:      ['https://timemachine.fairblock.network/og.png'],
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // const { data: active } = useActiveToken();
  return (
    <html lang="en">
      <head>
        {/* load Inter from Google */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,100..900;1,100..900&display=swap"
        />
      </head>
      <body className="font-neue">
        {/* <Header /> */}
        <HowItWorksProvider>
          <ClientLayout>{children}</ClientLayout>
        </HowItWorksProvider>
      </body>
    </html>
  );
}