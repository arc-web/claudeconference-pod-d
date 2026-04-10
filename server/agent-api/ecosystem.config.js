module.exports = {
  apps: [{
    name: 'giftmaster-agent',
    script: 'server.js',
    cwd: '/opt/giftmaster-agent',
    instances: 1,
    exec_mode: 'fork',
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production'
    },
    error_file: '/var/log/giftmaster-agent-error.log',
    out_file: '/var/log/giftmaster-agent-out.log',
    merge_logs: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    restart_delay: 5000,
    max_restarts: 10,
    min_uptime: '10s'
  }]
};
