import { ImageResponse } from 'next/og'

export const runtime    = 'edge'
export const revalidate = 60          // new image each minute

export async function GET() {
  const now = new Date().toUTCString()
  return new ImageResponse(
    (
      <div style={{
        width: 1200, height: 630, background: '#0A0A0A',
        color: '#fff', display: 'flex', flexDirection: 'column',
        justifyContent: 'center', alignItems: 'center',
        fontFamily: 'sans-serif', fontSize: 64,
      }}>
        <div style={{ marginBottom: 20 }}>Fairblock Time Machine</div>
        <div style={{ fontSize: 32 }}>UTC {now}</div>
      </div>
    ),
    { width: 1200, height: 630 }
  )
}
