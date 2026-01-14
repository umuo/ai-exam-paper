/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { isServer }) => {
    if (isServer) {
      // 解决 office-text-extractor 中 pdfjs-dist 的兼容性问题
      config.resolve.alias = {
        ...config.resolve.alias,
        canvas: false,
      };

      // 将 pdfjs-dist 相关包标记为外部依赖
      config.externals = config.externals || [];
      config.externals.push({
        canvas: 'commonjs canvas',
      });
    }
    return config;
  },
};

module.exports = nextConfig;

