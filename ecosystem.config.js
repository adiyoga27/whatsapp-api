module.exports = {
  apps: [
    {
        name: "JCC-2734",
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
