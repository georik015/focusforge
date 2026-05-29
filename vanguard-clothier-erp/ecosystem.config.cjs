module.exports = {
  apps: [
    {
      name: 'vanguard-erp',
      script: 'tsx',
      args: 'server.ts',
      cwd: './',
      watch: false,
      instances: 1,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 3000,
      env: {
        NODE_ENV: 'development',
        PORT: 3000,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      error_file: 'logs/err.log',
      out_file: 'logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
  ],
};
