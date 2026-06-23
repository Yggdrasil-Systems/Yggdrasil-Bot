module.exports = {
  apps: [
    {
      name: 'world-tree',
      script: './src/index.js',
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '500M',
      max_restarts: 10,
      restart_delay: 5000,
      exp_backoff_restart_delay: 1000,
      kill_timeout: 10000,
      wait_ready: false,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      out_file: './logs/world-tree.out.log',
      error_file: './logs/world-tree.err.log',
      merge_logs: true,
      env_production: {
        NODE_ENV: 'production'
      }
    }
  ]
};
