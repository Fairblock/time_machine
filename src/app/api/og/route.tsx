import { ImageResponse } from 'next/og';            // App Router auto-installs @vercel/og

export const runtime = 'edge';                      // Fast global execution :contentReference[oaicite:2]{index=2}
export const revalidate = 3600;                     // Cache at the edge for 1 h (optional)

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const title = (searchParams.get('title') ?? 'Acme Auctions').slice(0, 80);

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          width: '100%',
          height: '100%',
          background: '#09090b',
          color: '#e2e8f0',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 60,
          letterSpacing: '-0.03em',
          fontWeight: 700,
        }}
      >
        {title}
      </div>
    ),
    { width: 1200, height: 630 }                    // Social-card spec :contentReference[oaicite:3]{index=3}
  );
}
