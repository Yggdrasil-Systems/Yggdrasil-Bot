# Initial Deployment

This document covers the one-time setup and initial deployment of World Tree on Oracle Cloud.

## Prerequisites
1. **Operating System:** Ubuntu or Oracle Linux.
2. **Node.js:** v20.0.0 or higher.
3. **NPM:** Installed alongside Node.js.
4. **Git:** Installed.

## Step-by-Step

1. **Clone the Repository:**
   ```bash
   git clone https://github.com/Yggdrasil-Systems/Yggdrasil-Bot.git world-tree
   cd world-tree
   ```

2. **Configure Environment:**
   Create a `.env` file in the repository root containing your secrets. At a minimum:
   ```env
   DISCORD_TOKEN=your_token
   CLIENT_ID=your_client_id
   MONGO_URI=your_mongo_connection_string
   NODE_ENV=production
   ```

3. **Select your Provider:**
   By default, the SDK uses `systemd`. If you prefer `pm2`:
   ```bash
   npm run ops:switch pm2
   ```

4. **Deploy:**
   Run the initial deployment script. This will verify dependencies, install NPM modules, install the service via the chosen provider, and start the daemon.
   ```bash
   npm run ops:deploy
   ```

5. **Verify Health:**
   Check the holistic dashboard to ensure the application booted correctly.
   ```bash
   npm run ops:info
   ```
