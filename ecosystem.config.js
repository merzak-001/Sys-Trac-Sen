module.exports = {
  apps: [
    {
      name: "system-tracabilie",
      cwd: "./backend",
      script: "src/server.ts",
      interpreter: "tsx",
      instances: 1,
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: "production",
        PORT: 1000,
        DB_SERVER: "192.168.1.253",
        DB_NAME: "SystemTracabilie",
        DB_USER: "sa",
        DB_PASSWORD: "0000"
      }
    }
  ]
};

