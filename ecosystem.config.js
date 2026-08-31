module.exports = {
  apps: [{
    name: 'aiflow-backend',
    script: 'backend/app.py',
    interpreter: 'venv/bin/python',
    cwd: '.',
    env: {
      PYTHONUNBUFFERED: '1',
    },
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    error_file: 'logs/backend-error.log',
    out_file: 'logs/backend-out.log',
    exec_mode: 'fork',
    autorestart: true,
    max_restarts: 5,
    min_uptime: '10s',
    wait_ready: true,
    listen_timeout: 10000,
  }],
};