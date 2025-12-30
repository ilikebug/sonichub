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
    serverExternalPackages: [
        'NeteaseCloudMusicApi',
        'xml2js',
        'axios',
        'crypto-js',
        'md5',
        'music-metadata',
        'node-forge',
        'pac-proxy-agent',
        'qrcode',
        'safe-decode-uri-component',
        'tunnel',
        'yargs'
    ],
};

export default nextConfig;
