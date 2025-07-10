/* ── src/app/layout.tsx ─────────────────────────────────────────── */
import './globals.css'
import type { Metadata } from 'next'

import { Montserrat } from 'next/font/google'
import ClientLayout from '@/app/ClientLayout'
import { HowItWorksProvider } from '@/contexts/HowItWorksContext'

/* Google font — server-side, no manual <link> needed */
const montserrat = Montserrat({
  subsets: ['latin'],
  variable: '--font-mont',            // gives you a CSS var if you want it
})


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
