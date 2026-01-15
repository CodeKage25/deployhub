# Deploying DeployHub to Fly.io

## Prerequisites

1. Install Fly CLI:
```bash
brew install flyctl
```

2. Login to Fly:
```bash
fly auth login
```

## Deployment Steps

### 1. Create Fly App

```bash
cd /Users/mac/Downloads/deployhub
fly launch --no-deploy
```

When prompted:
- Choose a unique app name (e.g., `deployhub-yourname`)
- Select your region (e.g., `lhr` for London)
- Skip PostgreSQL and Redis

### 2. Create Persistent Volume (for SQLite)

```bash
fly volumes create deployhub_data --size 1 --region lhr
```

### 3. Set Environment Variables

```bash
fly secrets set JWT_SECRET="your-super-secret-jwt-key-change-this"
```

### 4. Deploy

```bash
fly deploy
```

### 5. Open Your App

```bash
fly open
```

## Important Notes

⚠️ **Docker-in-Docker Limitation**: The deployment feature that builds and runs user projects **will not work on Fly.io** because it requires Docker socket access. However:

✅ **What works on Fly.io:**
- User authentication (login/register)
- Dashboard UI
- Project management (CRUD)
- **IaC Visualizer** (Terraform/CloudFormation parsing)
- Waitlist signup
- All UI and API endpoints

❌ **What won't work:**
- Actual project builds/deployments (requires Docker)

This is perfect for a **portfolio demo** - you can showcase the full UI, IaC Visualizer, and explain that actual deployments require a Docker-enabled environment.

## Custom Domain (Optional)

```bash
fly certs add your-domain.com
```

Then add a CNAME record pointing to `deployhub-yourname.fly.dev`

## Monitoring

```bash
# View logs
fly logs

# SSH into container
fly ssh console

# Check status
fly status
```

## Troubleshooting

If build fails, check:
1. `fly logs` for errors
2. Ensure volume is created in the same region
3. Verify JWT_SECRET is set

## Updating

To redeploy after changes:
```bash
fly deploy
```
