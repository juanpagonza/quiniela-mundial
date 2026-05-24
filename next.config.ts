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
};

export default nextConfig;
