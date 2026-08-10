module.exports = {
  apps: [
    {
      name: 'durga-library-server',
      // Use src/index.js directly with --experimental-vm-modules for ESM
      // OR point to dist/index.js after build — see deploy.sh
      script: 'src/index.js',
      interpreter: 'node',
      interpreter_args: '--experimental-specifier-resolution=node',
      instances: 1,           // Single instance — safer for WhatsApp session + cron
      exec_mode: 'fork',      // Fork mode required for ES Modules + WhatsApp
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      min_uptime: '15s',
      max_restarts: 5,
      restart_delay: 5000,

      env_file: '.env',

      env_production: {
        NODE_ENV:    'production',
        PORT:        3000,
        HOST:        '0.0.0.0',  // Bind to all interfaces so Nginx can reach it
        WHATSAPP_ENABLED: 'false',

        // ── These MUST be overridden in /etc/environment or passed via --env-file ──
        // Do NOT hardcode secrets here. Set them with:
        //   sudo nano /var/www/durga-library-system/server/.env
        // Then run: pm2 start ecosystem.config.js --env production
      },

      error_file:  './logs/pm2-error.log',
      out_file:    './logs/pm2-out.log',
      log_file:    './logs/pm2-combined.log',
      time:        true,
      merge_logs:  true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      kill_timeout:    5000,
      listen_timeout:  30000,   // 30 s — allow time for MongoDB Atlas connection
      shutdown_with_message: true,
    },
  ],
};
