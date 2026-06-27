# Deployment Guide

## Runtime Model

World Tree is designed for a single self-hosted Node.js runtime managed by PM2.

## Prerequisites

- Node.js 20+
- MongoDB Atlas connection string
- Discord application and bot token
- gateway intents enabled in the Discord Developer Portal

## Install

```bash
npm install
```

## Configure

Use `.env.example` as the source of truth for required variables.

## Register Commands

```bash
npm run register:commands
```

Use `DEV_GUILD_ID` for development. Production command registration is global.

## Start

```bash
npm start
```

For PM2:

```bash
pm2 start ecosystem.config.cjs
```

## API Notes

Set `ENABLE_API=true` only when you want the Fastify API enabled. When enabled, `CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `SESSION_SECRET`, `DASHBOARD_ORIGIN`, and `API_ORIGIN` are required.

## GitHub Pages

Public verification pages live in `docs/` and can be published directly through GitHub Pages using the repository `docs` directory.
