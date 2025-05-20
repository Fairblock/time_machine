// next.config.js
/** @type {import('next').NextConfig} */
module.exports = {
  transpilePackages: ['fairyring-client-ts'],

  typescript: {
    // ⚠️ allow builds even with type errors
    ignoreBuildErrors: true,
  },

  eslint: {
    // ⚠️ skip ESLint checks during `next build`
    ignoreDuringBuilds: true,
  },
}
