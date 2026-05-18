/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      {
        source: '/ctyt',
        destination: 'https://raiserbar.lovable.app',
        permanent: false,
      },
    ];
  },
};
export default nextConfig;
