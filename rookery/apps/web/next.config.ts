import type { NextConfig } from 'next';

// Fully prerendered: `next build` writes static HTML/JS to ./out, which the Rookery Worker
// serves as static assets (free, unmetered). Live data comes from Supabase in the browser and
// from /api + /ws on the realtime Worker. See docs/ARCHITECTURE.md.
const config: NextConfig = {
  output: 'export',
  images: { unoptimized: true },
  transpilePackages: ['@rookery/chess-core', '@rookery/protocol', '@rookery/ai'],
  reactStrictMode: true,
};

export default config;
