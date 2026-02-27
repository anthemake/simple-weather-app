/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.weatherapi.com',
        pathname: '/weather/**', // Adjust this path according to the actual path of the images
      },
    ],
  },
};

export default nextConfig;
