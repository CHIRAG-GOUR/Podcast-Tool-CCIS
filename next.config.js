/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: [
    '@ffmpeg-installer/ffmpeg',
  ],
};

module.exports = nextConfig;
