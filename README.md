# DeployHub

A custom deployment platform (PaaS-lite) that lets you deploy apps via Git push and visualize Infrastructure as Code.

## Features

- 🚀 **Git Push to Deploy** - Connect GitHub/GitLab repos and auto-deploy on push
- 🐳 **Auto Buildpack Detection** - Node.js, Python, Go, static sites
- 📊 **IaC Visualizer** - Parse Terraform/CloudFormation and generate interactive diagrams
- 📋 **Deployment Logs** - Real-time build logs and status tracking

## Prerequisites

- Node.js 20+
- Docker Desktop running
- npm 9+

## Quick Start

```bash
# Install dependencies
npm install

# Start development servers (API + Web)
npm run dev
```

- **API Server**: http://localhost:3001
- **Web Dashboard**: http://localhost:5173

## Project Structure

```
deployhub/
├── apps/
│   ├── api/          # Fastify backend
│   └── web/          # React frontend
└── packages/
    └── shared/       # Shared types
```

## Environment Variables

Create `apps/api/.env`:

```env
PORT=3001
JWT_SECRET=your-secret-key
GITHUB_WEBHOOK_SECRET=optional-github-secret
```

## Usage

### Deploy a Project

1. Register/Login at http://localhost:5173
2. Create a new project with your GitHub repo URL
3. Click "Deploy" or set up a webhook for auto-deploy

### Visualize IaC

1. Go to IaC Visualizer
2. Upload a `.tf` or CloudFormation `.json` file
3. View and interact with the generated diagram

## Tech Stack

- **Backend**: Node.js, Fastify, SQLite, Dockerode
- **Frontend**: React, Vite, React Flow, Zustand
- **Styling**: CSS with custom design system

## License

MIT
