// next.config.js
/** @type {import('next').NextConfig} */
const config = {
  htmlLimitedBots: /Discordbot|Twitterbot|facebookexternalhit/i, // add any others you need
}
module.exports = {
  transpilePackages: ['fairblock-fairyring-client-ts'],
  images: {
    // keep the defaults and add a 3840‑px breakpoint for 2×/3× monitors
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2560, 3840],
  },
  typescript: {
    // ⚠️ allow builds even with type errors
    ignoreBuildErrors: true,
  },

  eslint: {
    // ⚠️ skip ESLint checks during `next build`
    ignoreDuringBuilds: true,
  },
}
