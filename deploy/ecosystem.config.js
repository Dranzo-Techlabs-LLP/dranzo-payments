// PM2 ecosystem for Dranzo Payments.
// cwd is the cPanel app root: /home/deskhubdranzo/dranzo-payments
//
// Usage on server:
//   pm2 start deploy/ecosystem.config.js
//   pm2 save
//   pm2 startup   (one-time, follow the printed command as root)

module.exports = {
  apps: [
    {
      name: 'dranzo-api',
      cwd: '/home/deskhubdranzo/dranzo-payments',
      script: 'apps/api/dist/main.js',
      node_args: '--enable-source-maps',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_restarts: 10,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        // The API binds to this port locally; Apache proxies /api/* to it.
        // Do NOT expose this port publicly. cPanel sites should keep it firewalled.
        API_PORT: '4010',
      },
      env_file: '/home/deskhubdranzo/dranzo-payments/.env',
      error_file: '/home/deskhubdranzo/logs/dranzo-api.err.log',
      out_file: '/home/deskhubdranzo/logs/dranzo-api.out.log',
      merge_logs: true,
      time: true,
    },
  ],
};
