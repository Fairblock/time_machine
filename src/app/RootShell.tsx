'use client'

import ClientLayout from './ClientLayout'
import { HowItWorksProvider } from '@/contexts/HowItWorksContext'

export default function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <HowItWorksProvider>
      <ClientLayout>{children}</ClientLayout>
    </HowItWorksProvider>
  )
}