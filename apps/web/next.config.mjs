/** @type {import('next').NextConfig} */
const nextConfig = {
    transpilePackages: ["@ultron/shared"],
    // API_URL must be set on the hosting platform (Vercel/Railway).
    // In dev it proxies to the local NestJS API on :4000.
    async rewrites() {
        return [
            {
                source: "/api/:path*",
                destination: `${process.env.API_URL ?? "http://localhost:4000"}/api/:path*`,
            },
        ];
    },
};

export default nextConfig;