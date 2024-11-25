/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    disableStaticImages: true,
  },
  webpack: (config, { dev }) => {
    // Add buffer polyfill
    config.resolve.fallback = {
      ...config.resolve.fallback,
      "buffer": require.resolve("buffer/"),
    };
    
    // Optimize webpack configuration for memory usage
    config.cache = false; // Disable webpack caching
    
    if (dev) {
      // Development optimizations
      config.optimization = {
        ...config.optimization,
        minimize: false,
        splitChunks: false,
        runtimeChunk: false,
      };
    }
    
    // Reduce memory usage
    config.watchOptions = {
      ignored: ['**/node_modules', '**/.next'],
    };
    
    return config;
  },
  // Reduce experimental features
  experimental: {
    optimizeCss: false, // Disable CSS optimization
    esmExternals: false, // Disable ESM externals
  },
  // Add production-specific options
  productionBrowserSourceMaps: false,
  swcMinify: true,
}

module.exports = nextConfig
