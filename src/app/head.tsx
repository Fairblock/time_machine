/* ── src/app/head.tsx ─────────────────────────────────────────── */
export default function Head() {
    return (
      <>
        {/* Basic */}
        <title>Fairblock&nbsp;| Time Machine</title>
        <meta
          name="description"
          content="Replay encrypted transactions and witness deterministic on-chain decryption."
        />
  
        {/* Open Graph */}
        <meta property="og:title"       content="Fairblock | Time Machine" />
        <meta property="og:description" content="Replay encrypted transactions and witness deterministic on-chain decryption." />
        <meta property="og:type"        content="website" />
        <meta property="og:url"         content="https://timemachine.fairblock.network/" />
        <meta property="og:site_name"   content="Fairblock" />
        <meta property="og:locale"      content="en_US" />
        <meta property="og:image"       content="https://timemachine.fairblock.network/og.png" />
        <meta property="og:image:width"  content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt"    content="Fairblock Time Machine preview" />
  
        {/* Twitter / Discord */}
        <meta name="twitter:card"        content="summary_large_image" />
        <meta name="twitter:title"       content="Fairblock | Time Machine" />
        <meta name="twitter:description" content="Replay encrypted transactions and witness deterministic on-chain decryption." />
        <meta name="twitter:image"       content="https://timemachine.fairblock.network/og.png" />
      </>
    );
  }
  