module.exports = {
  apps: [
    {
      name: 'webapp',
      script: 'npx',
      args: 'wrangler pages dev dist --d1=webapp-db --local --ip 0.0.0.0 --port 3000',
      env: {
        NODE_ENV: 'development',
        PORT: 3000,
        WRANGLER_SEND_METRICS: 'false'
      },
      watch: false,
      instances: 1,
      exec_mode: 'fork',
      min_uptime: '10s',
      max_restarts: 3
    }
  ]
}
