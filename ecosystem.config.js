module.exports = {
  apps: [{
    name: 'seo-manager',
    script: 'server.js',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    watch: false,
    max_memory_restart: '256M'
  }]
};
