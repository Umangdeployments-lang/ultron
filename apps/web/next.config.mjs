/** @type {import('next').NextConfig} */
const nextConfig = {
    transpilePackages: ["@ultron/shared"],
    async rewrites() {
        return [
            {
                source: "/api/:path*",
                destination: `${process.env.API_URL ?? "http://localhost:4000"}/:path*`,
            },
        ];
    },
};

export default nextConfig;
