/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'standalone',
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'i.scdn.co',
            },
            {
                protocol: 'https',
                hostname: 'picsum.photos',
            },
            {
                protocol: 'https',
                hostname: 'mosaic.scdn.co',
            },
        ],
    },
    serverExternalPackages: ['NeteaseCloudMusicApi'],
};

export default nextConfig;
