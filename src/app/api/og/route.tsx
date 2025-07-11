import { ImageResponse } from 'next/og';

export const runtime    = 'edge';   // still ⚡ fast
export const revalidate = 3600;     // cache 1 h

const SHOT_URL = 'https://timemachine.fairblock.network/static/homepage-shot.jpg'; // ← your screenshot

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const title = (searchParams.get('title') ?? 'Time Machine').slice(0, 80);

  /* ── try to pull the screenshot ─────────────────────────────── */
  let shotBuffer: ArrayBuffer | null = null;
  try {
    const res = await fetch(SHOT_URL, { cache: 'force-cache' });
    if (res.ok) shotBuffer = await res.arrayBuffer();             // external img allowed :contentReference[oaicite:2]{index=2}
  } catch {/* ignore – we’ll fall back to title card */}

  /* ── build the card ─────────────────────────────────────────── */
  return new ImageResponse(
    shotBuffer ? (
      <img
        src={shotBuffer as any}
        width="1200"
        height="630"
        style={{ objectFit: 'cover' }}   // fill the canvas
      />
    ) : (
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
    { width: 1200, height: 630 },
  );
}
