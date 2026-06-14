module.exports = {
  apps: [
    {
      // Production mode: runs compiled JS from dist/
      // Build first with: npm run build
      name: 'vanguard-erp',
      script: 'node',
      args: 'dist/server.cjs',
      cwd: './',
      watch: false,
      instances: 1,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 3000,
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      error_file: 'logs/err.log',
      out_file: 'logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
    {
      // Development mode: uses tsx for hot TypeScript execution
      // Use with: pm2 start ecosystem.config.cjs --only vanguard-erp-dev
      name: 'vanguard-erp-dev',
      script: 'npx',
      args: 'tsx server.ts',
      cwd: './',
      watch: false,
      instances: 1,
      autorestart: true,
      max_restarts: 5,
      restart_delay: 2000,
      env: {
        NODE_ENV: 'development',
        PORT: 3000,
      },
      error_file: 'logs/err-dev.log',
      out_file: 'logs/out-dev.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
  ],
};
