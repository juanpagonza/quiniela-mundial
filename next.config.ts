import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Allowlist external image hosts for next/image. Even with `unoptimized`
    // set on the <Image> instance, Next.js still validates the src URL host
    // against this list before rendering — without the entry the component
    // throws and our error boundary catches it.
    //
    // - lh3.googleusercontent.com / lh4-lh6: Google account avatars (returned
    //   in the OAuth user metadata `avatar_url`, copied to usuarios.foto_url
    //   by handle_new_user).
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'lh4.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'lh5.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'lh6.googleusercontent.com',
      },
    ],
  },

  // Defensive security headers applied to every response. Vercel already
  // adds HSTS, but explicit is better than implicit — and the others
  // (X-Frame-Options, X-Content-Type-Options, etc.) aren't default.
  // CSP is intentionally omitted: Next.js with hydration + Tailwind needs
  // 'unsafe-inline' / 'unsafe-eval' which weakens CSP enough that it's
  // misleading. Add a strict CSP via nonces when this grows past hobby.
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            // 1 year, include subdomains. Vercel already does this but
            // having it in our config is documentation.
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains',
          },
          {
            // Block being framed by ANY site — anti-clickjacking. We don't
            // need to be embedded anywhere; if we ever do, switch to
            // 'SAMEORIGIN' or a frame-ancestors CSP directive.
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            // Forbid the browser from MIME-sniffing a response away from
            // the declared content-type. Standard.
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            // Only send the path+query as referrer on same-origin nav,
            // and only the origin on cross-origin. Protects us from
            // leaking searchParams (which include usuario IDs) to
            // external sites the user might click out to.
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            // Disable sensors we don't use. Future-proofs against a
            // dependency suddenly trying to ask for them.
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), payment=()',
          },
        ],
      },
    ]
  },
};

export default nextConfig;
