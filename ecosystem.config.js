module.exports = {
  apps: [
    {
        name: "JCC-3000",
        script: "npm",
        automation: false,
        args: "start",
        env: {
            NODE_ENV: "development"
        },
        env_production: {
            NODE_ENV: "production"
        }
    }
]
};
