import { ImageResponse } from 'next/server'

export const runtime = 'edge'
export const revalidate = 60

export async function GET() {
  const nowUTC = new Date().toUTCString()

  return new ImageResponse(
    {
      type: 'div',
      props: {
        style: {
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
        },
        children: [
          {
            type: 'div',
            props: { style: { marginBottom: 20 }, children: 'Fairblock Time Machine' },
          },
          {
            type: 'div',
            props: { style: { fontSize: 32 }, children: `UTC ${nowUTC}` },
          },
        ],
      },
    },
    { width: 1200, height: 630 }
  )
}
