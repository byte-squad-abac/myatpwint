/**
 * PM2 Ecosystem Configuration
 * 
 * Usage: pm2 start ecosystem.config.js
 * 
 * IMPORTANT: Set environment variables before starting:
 * 1. Create a .env file in the backend directory with all required variables
 * 2. OR set them as system environment variables
 * 3. PM2 will automatically load variables from .env if dotenv is configured
 */

module.exports = {
  apps: [
    {
      name: 'kbzpay-backend',
      script: './dist/server.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        // Add other environment variables here if not using .env file
        // Or set them as system environment variables before starting PM2
      },
      // PM2 will use system environment variables if set
      // For .env file, ensure dotenv.config() is called in server.ts
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_file: './logs/combined.log',
      time: true,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
    },
  ],
};

