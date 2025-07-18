// src/types/walletconnect-redirect.d.ts
import '@web3modal/standalone'

declare module '@web3modal/standalone' {
  interface Web3ModalConfig {
    metadata?: {
      name: string
      description: string
      url: string
      icons: string[]
      redirect?: {
        native?: string
        universal?: string
      }
    }
  }
}
