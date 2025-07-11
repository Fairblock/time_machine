// src/app/api/og-image/route.tsx
import { ImageResponse } from 'next/og'

export const runtime    = 'edge'   // run at Vercel Edge
export const revalidate = 60       // cache for 60 s

export async function GET() {
  const nowUTC = new Date().toUTCString()

  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          background: '#0A0A0A',
          color: '#fff',
          fontSize: 64,
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ marginBottom: 20 }}>Fairblock Time Machine</div>
        <div style={{ fontSize: 32 }}>UTC {nowUTC}</div>
      </div>
    ),
    { width: 1200, height: 630 }
  )
}
