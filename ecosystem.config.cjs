module.exports = {
  apps: [
    {
      name: 'world-tree',
      script: './src/index.js',
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '500M',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      env_production: {
        NODE_ENV: 'production'
      }
    }
  ]
};
