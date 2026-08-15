/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      {
        source: '/ctyt',
        destination: 'https://raiserbar.lovable.app',
        permanent: false,
      },
      {
        source: '/house360',
        destination: '/yoova',
        permanent: true,
      },
    ];
  },
};
export default nextConfig;
