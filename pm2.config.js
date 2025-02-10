module.exports = {
  apps: [
    {
      name: "local-mark-server",
      script: "bun",
      args: "start",
      cwd: "./",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
        PORT: 3050,
      },
      env_production: {
        NODE_ENV: "production",
        PORT: 3050,
      },
    },
  ],
};
